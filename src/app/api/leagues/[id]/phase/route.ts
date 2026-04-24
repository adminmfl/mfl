/**
 * GET /api/leagues/[id]/phase - Get league phase information
 * Returns current phase (active/trophy/archive/deleted) with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getLeaguePhase } from '@/lib/utils/league-phases';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as
      | import('next-auth').Session
      | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // Ensure requester is a member of the league.
    const { data: membership, error: membershipError } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('league_id', leagueId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get league basic info
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, status, end_date, league_name, start_date')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    const phaseInfo = getLeaguePhase(league.status, league.end_date);

    return NextResponse.json({
      success: true,
      data: {
        leagueId,
        leagueName: league.league_name,
        startDate: league.start_date,
        endDate: league.end_date,
        ...phaseInfo,
      },
    });
  } catch (error) {
    console.error('Error getting league phase:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
