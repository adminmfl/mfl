/**
 * POST /api/ai-coach/league-creator
 *
 * Conversational AI endpoint for league creation.
 * The LLM converses with the user to collect league configuration fields,
 * extracts structured data from natural language, and tracks progress.
 *
 * Enhanced with league profiling: league_type, intent, age_range, participant_mix.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { aiChat } from '@/lib/ai-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeagueFields {
  league_name?: string;
  description?: string;
  num_teams?: number;
  max_participants?: number;
  start_date?: string;
  duration?: number;
  rest_days?: number;
  is_public?: boolean;
  is_exclusive?: boolean;
  // Profiling fields
  league_type?: 'corporate' | 'residential' | 'school' | 'organization' | 'other';
  intent?: 'fitness' | 'health' | 'wellness' | 'bonding' | 'fun';
  age_range?: 'youth' | 'adult' | 'mixed' | 'senior' | 'all';
  participant_mix?: 'male' | 'female' | 'mixed';
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the MFL League Creation Assistant. You help users create fitness leagues through natural conversation.

YOUR JOB:
1. Greet the user warmly and explain you'll help them set up their fitness league
2. Collect the required information through natural conversation
3. After EVERY user message, extract any league configuration data they mentioned
4. Ask follow-up questions for missing required fields
5. When all required fields are collected, present a summary for confirmation

REQUIRED FIELDS:
- league_name: Name of the league (min 3 characters, must be unique)
- num_teams: Number of teams (e.g., 2-20)
- max_participants: Total number of players across all teams
- start_date: When the league starts (YYYY-MM-DD format)
- duration: How many days the league runs (e.g., 30, 60, 90)

PROFILING FIELDS (ask early to personalize recommendations):
- league_type: "corporate", "residential", "school", "organization", or "other" — ask "What type of group is this for?"
- intent: "fitness", "health", "wellness", "bonding", or "fun" — ask "What's the main goal?"
- age_range: "youth" (13-18), "adult" (18-40), "mixed" (18-60), "senior" (60+), "all" — ask "What's the age range of participants?"
- participant_mix: "male", "female", or "mixed"

OPTIONAL FIELDS (have defaults):
- description: A short description of the league
- rest_days: Number of rest days (0-7, default: auto-calculated as 20% of duration)
- is_public: Whether the league is publicly visible (default: false)
- is_exclusive: Whether joining requires an invite (default: true)

CONVERSATION FLOW:
1. First ask about the organization type (league_type) and goals (intent)
2. Then collect league name, teams, participants
3. Ask about participant demographics (age_range, participant_mix)
4. Collect dates and duration
5. Present summary with recommendations

RULES:
- Be conversational, friendly, and concise (2-3 sentences per response)
- If a user says something like "5 teams with 50 players for 30 days", extract ALL fields mentioned
- Help users understand fields: e.g., "max_participants is the total number of players across ALL teams"
- For dates, accept natural language like "next Monday", "March 25", "in 2 weeks" — convert to YYYY-MM-DD
- If user gives team size (e.g., "10 per team"), calculate max_participants = num_teams × team_size
- Give examples when the user seems confused
- When showing the summary, format it clearly and ask "Shall I proceed with creating this league?"
- Based on league_type + intent + age_range, suggest appropriate RR formula:
  - Corporate fitness → "standard"
  - School/fun/bonding → "simple" (binary, less pressure)
  - Senior groups → "standard" with age adjustments
  - Step challenges → "points_only"

IMPORTANT RESPONSE FORMAT:
You MUST end every response with a JSON block on its own line, wrapped in triple backticks, containing the extracted fields so far. Include ONLY fields that have been explicitly mentioned or confirmed by the user. Example:

\`\`\`json
{"league_name": "RFL Corporate League", "num_teams": 5, "max_participants": 50, "duration": 30, "league_type": "corporate", "intent": "fitness"}
\`\`\`

If no fields have been extracted yet, return:
\`\`\`json
{}
\`\`\`

The JSON block is parsed by the system — always include it, even if empty.`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, history, currentFields } = body as {
      message: string;
      history: ConversationMessage[];
      currentFields: LeagueFields;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Build conversation with context about what's been collected
    const filledFields = Object.entries(currentFields || {})
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const requiredFields = ['league_name', 'num_teams', 'max_participants', 'start_date', 'duration'];
    const profilingFields = ['league_type', 'intent', 'age_range'];
    const missingRequired = requiredFields.filter((f) => !(currentFields as any)?.[f]);
    const missingProfiling = profilingFields.filter((f) => !(currentFields as any)?.[f]);

    const contextNote = `
[SYSTEM CONTEXT — not visible to user]
Fields collected so far: ${filledFields || 'None'}
Missing required fields: ${missingRequired.length > 0 ? missingRequired.join(', ') : 'ALL REQUIRED FIELDS COLLECTED — present summary and ask for confirmation'}
Missing profiling fields: ${missingProfiling.length > 0 ? missingProfiling.join(', ') : 'All profiling complete'}
Today's date: ${new Date().toISOString().split('T')[0]}
`;

    // Filter out any messages with empty content (Mistral rejects them)
    const validHistory = (history || [])
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-10);

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT + contextNote },
      ...validHistory,
      { role: 'user', content: message },
    ];

    const aiResult = await aiChat({
      messages,
      feature: 'league-creator',
      userId: session.user.id,
      temperature: 0.7,
      maxTokens: 800,
    });

    let assistantMessage = aiResult.content;

    // Extract JSON block from response
    let extractedFields: LeagueFields = {};
    const jsonMatch = assistantMessage.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        extractedFields = JSON.parse(jsonMatch[1]);
      } catch {
        // If JSON parsing fails, keep empty
      }
    }

    // Remove the JSON block from the visible message
    const visibleMessage = assistantMessage
      .replace(/```json\s*\n?[\s\S]*?\n?```/g, '')
      .trim();

    // Merge extracted fields with current fields (new extractions override)
    const mergedFields: LeagueFields = { ...(currentFields || {}), ...extractedFields };

    // Check if all required fields are present
    const allRequiredPresent = requiredFields
      .every((f) => (mergedFields as any)[f] !== undefined && (mergedFields as any)[f] !== null && (mergedFields as any)[f] !== '');

    // Determine recommended RR formula based on profiling
    let recommendedFormula: string | undefined;
    if (mergedFields.league_type || mergedFields.intent || mergedFields.age_range) {
      if (mergedFields.intent === 'fun' || mergedFields.intent === 'bonding' || mergedFields.league_type === 'school') {
        recommendedFormula = 'simple';
      } else if (mergedFields.age_range === 'senior') {
        recommendedFormula = 'standard';
      } else {
        recommendedFormula = 'standard';
      }
    }

    return NextResponse.json({
      success: true,
      message: visibleMessage,
      extractedFields: mergedFields,
      isComplete: allRequiredPresent,
      recommendedFormula,
    });
  } catch (error) {
    console.error('Error in league creator AI:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
