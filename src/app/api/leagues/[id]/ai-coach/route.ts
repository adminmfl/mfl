/**
 * GET /api/leagues/[id]/ai-coach - Fetch AI coach messages for current user
 * POST /api/leagues/[id]/ai-coach - Q&A chat with AI coach
 * PATCH /api/leagues/[id]/ai-coach - Mark messages as read/dismissed
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { answerLeagueQuestion, storeCoachMessage } from '@/lib/services/ai-coach';

// ============================================================================
// GET - Fetch coach messages
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leagueId } = await params;
    const supabase = getSupabaseServiceRole();
    const userId = session.user.id;

    // Get user's team in this league
    const { data: membership } = await supabase
      .from('leaguemembers')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
    }

    // Get user's role from assignedrolesforleague
    const { data: roleData } = await supabase
      .from('assignedrolesforleague')
      .select('roles(role_name)')
      .eq('league_id', leagueId)
      .eq('user_id', userId);

    const roleNames = (roleData || []).map((r: any) => r.roles?.role_name || '').filter(Boolean);
    const isLeader = roleNames.includes('host') || roleNames.includes('governor') || roleNames.includes('captain');

    const url = new URL(req.url);
    const type = url.searchParams.get('type'); // filter by message_type
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    const showDismissed = url.searchParams.get('dismissed') === 'true';

    // Build query: messages for this user OR their team (where user_id is null)
    let query = supabase
      .from('ai_coach_messages')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter: user's individual messages + team messages + league-wide messages
    if (membership.team_id) {
      query = query.or(
        `user_id.eq.${userId},and(user_id.is.null,team_id.eq.${membership.team_id}),and(user_id.is.null,team_id.is.null)`
      );
    } else {
      query = query.or(
        `user_id.eq.${userId},and(user_id.is.null,team_id.is.null)`
      );
    }

    // Captain messages only visible to captains/host/governor
    if (!isLeader) {
      query = query.neq('message_type', 'captain');
    }

    if (type) {
      query = query.eq('message_type', type);
    }

    if (!showDismissed) {
      query = query.eq('is_dismissed', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching AI coach messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messages: data || [] });
  } catch (error) {
    console.error('Error in AI coach GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST - Q&A Chat
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: 'AI Coach not configured' }, { status: 500 });
    }

    const { id: leagueId } = await params;
    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    // Verify membership
    const { data: membership } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
    }

    const body = await req.json();
    const question = body.question?.trim();

    if (!question || question.length > 500) {
      return NextResponse.json({ error: 'Question is required (max 500 chars)' }, { status: 400 });
    }

    // Rate limit: max 20 questions per user per day
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('ai_coach_chats')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .eq('role', 'user')
      .gte('created_at', todayStart.toISOString());

    if ((count || 0) >= 20) {
      return NextResponse.json({ error: 'Daily question limit reached (20/day)' }, { status: 429 });
    }

    // Get recent chat history
    const { data: history } = await supabase
      .from('ai_coach_chats')
      .select('role, content')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: true })
      .limit(6);

    // Store user question
    await supabase.from('ai_coach_chats').insert({
      league_id: leagueId,
      user_id: userId,
      role: 'user',
      content: question,
    });

    // Generate answer
    const answer = await answerLeagueQuestion(
      question,
      leagueId,
      userId,
      (history || []) as { role: 'user' | 'assistant'; content: string }[]
    );

    // Store answer
    await supabase.from('ai_coach_chats').insert({
      league_id: leagueId,
      user_id: userId,
      role: 'assistant',
      content: answer,
    });

    return NextResponse.json({ success: true, answer });
  } catch (error) {
    console.error('Error in AI coach POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Mark messages as read/dismissed
// ============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leagueId } = await params;
    const body = await req.json();
    const { messageIds, action } = body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'messageIds required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRole();

    const update: Record<string, boolean> = {};
    if (action === 'read') update.is_read = true;
    if (action === 'dismiss') update.is_dismissed = true;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'action must be "read" or "dismiss"' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ai_coach_messages')
      .update(update)
      .in('id', messageIds)
      .eq('league_id', leagueId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in AI coach PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
