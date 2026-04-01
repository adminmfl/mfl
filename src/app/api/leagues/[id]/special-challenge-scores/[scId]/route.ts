/**
 * GET /api/leagues/[id]/special-challenge-scores/[scId]
 * Returns team rankings for a specific special challenge by its challenge_id.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; scId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leagueId, scId: challengeId } = await params;
    const supabase = getSupabaseServiceRole();

    // Verify membership
    const { data: membership } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', session.user.id)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });
    }

    // Fetch team scores for this special challenge
    const { data: scores, error } = await supabase
      .from('specialchallengeteamscore')
      .select('team_id, score')
      .eq('challenge_id', challengeId)
      .eq('league_id', leagueId);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch scores' }, { status: 500 });
    }

    if (!scores || scores.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch team names
    const teamIds = scores.map(s => s.team_id);
    const { data: teams } = await supabase
      .from('teams')
      .select('team_id, team_name')
      .in('team_id', teamIds);

    const teamNameMap = new Map((teams || []).map(t => [t.team_id, t.team_name]));

    const rankings = scores
      .map(s => ({
        id: s.team_id,
        name: teamNameMap.get(s.team_id) || 'Unknown Team',
        score: Number(s.score || 0),
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return NextResponse.json({ success: true, data: rankings });
  } catch (err) {
    console.error('Error in special-challenge-scores/[scId]:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
