/**
 * GET /api/leagues/[id]/ai-coach/chat-history - Fetch Q&A chat history
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

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

    const { data, error } = await supabase
      .from('ai_coach_chats')
      .select('id, role, content, created_at')
      .eq('league_id', leagueId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messages: data || [] });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
