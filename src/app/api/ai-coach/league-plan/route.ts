/**
 * POST /api/ai-coach/league-plan
 *
 * Generates a structured league plan (calendar phases, activity recommendations,
 * challenge suggestions) based on profiling data collected during league creation.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { aiChat } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

interface PlanRequest {
  league_type: string;
  intent: string;
  age_range: string;
  participant_mix?: string;
  duration: number;
  num_teams: number;
  max_participants: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PlanRequest = await req.json();
    const { league_type, intent, age_range, participant_mix, duration, num_teams, max_participants } = body;

    if (!duration || !league_type || !intent) {
      return NextResponse.json({ error: 'Missing required profiling fields' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRole();

    // Fetch available activities
    const { data: activities } = await supabase
      .from('activities')
      .select('activity_id, activity_name, description, category_id, measurement_type')
      .eq('is_active', true)
      .order('activity_name');

    // Fetch available challenge templates
    const { data: templates } = await supabase
      .from('challenge_templates')
      .select('id, title, description, challenge_type, duration_days, difficulty')
      .eq('is_active', true);

    const activityList = (activities || [])
      .map((a: any) => `- ${a.activity_name} (${a.measurement_type || 'duration'})`)
      .join('\n');

    const templateList = (templates || [])
      .map((t: any) => `- "${t.title}" (${t.challenge_type}, ${t.duration_days} days, ${t.difficulty})`)
      .join('\n');

    const systemPrompt = `You are a fitness league planning assistant. Generate a structured league plan based on the given profile.

AVAILABLE ACTIVITIES:
${activityList || 'No activities available'}

AVAILABLE CHALLENGE TEMPLATES:
${templateList || 'No templates available'}

LEAGUE PROFILE:
- Type: ${league_type}
- Intent: ${intent}
- Age Range: ${age_range || 'all'}
- Participant Mix: ${participant_mix || 'mixed'}
- Duration: ${duration} days
- Teams: ${num_teams}
- Participants: ${max_participants}

Generate a JSON response with this exact structure:
{
  "calendar": [
    {"phase": "Onboarding", "startDay": 1, "endDay": 3, "description": "Welcome & warm-up period"},
    {"phase": "Gameplay", "startDay": 4, "endDay": <most of duration>, "description": "Main competition phase"},
    {"phase": "Challenge Week", "startDay": <near end>, "endDay": <near end>, "description": "Special challenge event"},
    {"phase": "Awards", "startDay": <last few days>, "endDay": ${duration}, "description": "Final standings & celebrations"}
  ],
  "recommendedActivities": [
    {"activity_name": "<exact name from list>", "frequency": 5, "frequency_type": "weekly", "reason": "<why this fits>"}
  ],
  "challengeSuggestions": [
    {"title": "<exact title from list>", "scheduledDay": <day number>, "reason": "<why this fits>"}
  ],
  "restDayRecommendation": <number>,
  "rrProfile": "standard" | "simple" | "points_only",
  "summary": "<2-3 sentence plan overview>"
}

RULES:
- Pick 3-6 activities that match the intent and age range
- For school/fun leagues, suggest simpler activities (walking, yoga)
- For corporate fitness, suggest varied activities (running, cycling, gym)
- For senior groups, lower frequency and pick low-impact activities
- Schedule 1-2 challenges during the league
- Rest days: ~20% of duration for fitness, ~25% for wellness/senior
- Only use activity names and template titles from the lists above
- Return ONLY valid JSON, no markdown or explanation`;

    const aiResult = await aiChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the league plan.' },
      ],
      feature: 'league-plan',
      userId: session.user.id,
      temperature: 0.5,
      maxTokens: 1500,
    });

    let planText = aiResult.content;

    // Parse JSON — handle potential markdown wrapping
    let plan: any = null;
    try {
      const jsonMatch = planText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      plan = JSON.parse(jsonMatch ? jsonMatch[1] : planText);
    } catch {
      // If parsing fails, return error with raw text for debugging
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI plan',
        raw: planText,
      }, { status: 500 });
    }

    // Validate and enrich with activity IDs
    if (plan.recommendedActivities && activities) {
      for (const rec of plan.recommendedActivities) {
        const match = activities.find((a: any) =>
          a.activity_name.toLowerCase() === rec.activity_name?.toLowerCase()
        );
        if (match) {
          rec.activity_id = match.activity_id;
          rec.measurement_type = match.measurement_type;
        }
      }
    }

    if (plan.challengeSuggestions && templates) {
      for (const sug of plan.challengeSuggestions) {
        const match = templates.find((t: any) =>
          t.title.toLowerCase() === sug.title?.toLowerCase()
        );
        if (match) {
          sug.template_id = match.id;
        }
      }
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('Error generating league plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
