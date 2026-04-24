/**
 * GET /api/leagues/[id]/phase - Get league phase information
 * Returns current phase (active/trophy/archive/deleted) with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getLeaguePhase } from '@/lib/utils/league-phases';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leagueId } = await params;
    const supabase = getSupabaseServiceRole();

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
