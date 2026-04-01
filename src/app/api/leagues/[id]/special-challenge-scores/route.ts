/**
 * GET /api/leagues/[id]/special-challenge-scores
 * Returns distinct special challenges that have team scores for this league.
 * Used by the challenge leaderboard dropdown to show challenges that exist
 * only in specialchallengeteamscore (not in leagueschallenges).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leagueId } = await params;
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

    // Fetch all special challenge scores for this league with challenge names
    const { data: scores, error } = await supabase
      .from('specialchallengeteamscore')
      .select('challenge_id, specialchallenges(challenge_id, name)')
      .eq('league_id', leagueId);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
    }

    // Deduplicate by challenge_id
    const seen = new Set<string>();
    const challenges: Array<{ challenge_id: string; name: string }> = [];
    for (const s of scores || []) {
      const sc = s.specialchallenges as any;
      if (sc && !seen.has(sc.challenge_id)) {
        seen.add(sc.challenge_id);
        challenges.push({ challenge_id: sc.challenge_id, name: sc.name });
      }
    }

    return NextResponse.json({ success: true, data: challenges });
  } catch (err) {
    console.error('Error in special-challenge-scores:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
