/**
 * POST /api/leagues/[id]/ai-motivate - Generate a motivational message for captain
 *
 * Captain-only endpoint. Uses AI context + copy library templates, enhanced with Mistral.
 * Rate limited to 3 per day per captain.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { userHasAnyRole } from '@/lib/services/roles';
import { getBestInsights } from '@/lib/ai/trigger-evaluator';
import type { PlayerInsightContext } from '@/lib/ai/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify captain role
    const isCaptain = await userHasAnyRole(userId, leagueId, ['captain']);
    if (!isCaptain) {
      return NextResponse.json(
        { error: 'Only captains can use this feature' },
        { status: 403 }
      );
    }

    // Fetch AI context for this user (reuse the same logic)
    const contextRes = await fetch(
      `${request.nextUrl.origin}/api/leagues/${leagueId}/ai-context`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    );
    const contextJson = await contextRes.json();

    if (!contextJson.success || !contextJson.data) {
      return NextResponse.json(
        { error: 'Failed to fetch AI context' },
        { status: 500 }
      );
    }

    const context: PlayerInsightContext = contextJson.data;

    // Get template-based messages for the motivate_button placement
    const insights = getBestInsights(context, 'messages', ['motivate_button']);
    const templateMessage = insights.motivate_button;

    // Try LLM enhancement if Mistral is available, otherwise use template
    let message = templateMessage;

    try {
      const { aiChat } = await import('@/lib/ai-client');

      if (context.teamName) {
        const systemPrompt = `You are a team motivation assistant for MyFitnessLeague. Generate a short (2-3 sentence) motivational message that a team captain can send to their team chat. Be energetic, specific, and action-driven. No hashtags. Use the team name. Reference actual stats provided.`;

        const userPrompt = `Team: ${context.teamName}
Team Rank: #${context.teamRank ?? '?'}
Team Points: ${context.teamPoints}
Participation Today: ${context.teamParticipationPct}% (${context.teamMembersLogged}/${context.teamTotalMembers} logged)
Points Behind Leader: ${context.pointsBehindLeader}
Leading: ${context.isLeading ? 'Yes' : 'No'}

Generate a motivational message for the captain to send to the team.`;

        const result = await aiChat({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          feature: 'ai-motivate',
          leagueId,
          userId,
          temperature: 0.8,
          maxTokens: 200,
        });

        if (result.content) {
          message = result.content;
        }
      }
    } catch {
      // AI unavailable — fall through to template
    }

    // Fallback if nothing worked
    if (!message) {
      message = `Team — let's keep pushing today! Every activity counts.`;
    }

    return NextResponse.json({
      success: true,
      message,
      source: message === templateMessage ? 'template' : 'ai',
    });
  } catch (error) {
    console.error('Error generating motivational message:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
