import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import type { PlayerInsightContext } from '@/lib/ai/types';
import { calculateLeaderboard } from '@/lib/services/leaderboard-logic';

export const dynamic = 'force-dynamic';

function todayYMD(): string {
  // IST (UTC+5:30)
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.floor((db.getTime() - da.getTime()) / (86400 * 1000));
}

export async function GET(
  request: NextRequest,
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

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();
    const today = todayYMD();

    // Extract query params for leaderboard calculation
    const { searchParams } = new URL(request.url);
    const tzOffsetMinutes = searchParams.get('tzOffsetMinutes')
      ? Number(searchParams.get('tzOffsetMinutes'))
      : 330;
    const ianaTimezone = searchParams.get('ianaTimezone');

    // 1. Initial parallel queries
    // We use calculateLeaderboard directly to avoid the overhead of an internal HTTP fetch
    const [
      leagueRes,
      memberRes,
      leaderboardData,
      todayEntriesRes,
      activitiesRes,
    ] = await Promise.all([
      // League details (dates, status)
      supabase
        .from('leagues')
        .select(
          'league_id, league_name, start_date, end_date, status, rest_days',
        )
        .eq('league_id', leagueId)
        .single(),

      // Current user's membership
      supabase
        .from('leaguemembers')
        .select('league_member_id, team_id, teams(team_name)')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle(),

      // Leaderboard (team rankings + individual)
      calculateLeaderboard(leagueId, {
        tzOffsetMinutes,
        ianaTimezone,
        full: true,
      }),

      // Today's entries for the league (to compute participation)
      supabase
        .from('effortentry')
        .select('league_member_id, leaguemembers!inner(user_id, team_id)')
        .eq('leaguemembers.league_id', leagueId)
        .eq('date', today)
        .in('status', ['approved', 'pending']),

      // League activities (to check measurement types)
      supabase
        .from('leagueactivities')
        .select(
          'activity_id, custom_activity_id, activities(measurement_type), custom_activities(measurement_type)',
        )
        .eq('league_id', leagueId),
    ]);

    const league = leagueRes.data;
    const member = memberRes.data;

    if (!league || !member) {
      return NextResponse.json(
        { error: 'League or membership not found' },
        { status: 404 },
      );
    }

    const teamId = member.team_id;
    const teamName = (member as any).teams?.team_name || null;

    // 2. Second level parallel queries (dependent on teamId/memberId)
    const [teamCountRes, myEntriesRes] = await Promise.all([
      teamId
        ? supabase
            .from('leaguemembers')
            .select('league_member_id', { count: 'exact', head: true })
            .eq('league_id', leagueId)
            .eq('team_id', teamId)
        : Promise.resolve({ count: 0 }),
      supabase
        .from('effortentry')
        .select('date, type, status')
        .eq('league_member_id', member.league_member_id)
        .in('status', ['approved', 'pending'])
        .order('date', { ascending: false })
        .limit(365),
    ]);

    // -----------------------------------------------------------------------
    // Compute team participation for today
    // -----------------------------------------------------------------------
    const todayEntries = todayEntriesRes.data || [];
    let teamMembersLogged = 0;
    let teamTotalMembers = teamCountRes.count || 0;

    if (teamId) {
      const teamLoggedUsers = new Set<string>();
      for (const entry of todayEntries) {
        const lm = entry.leaguemembers as any;
        if (lm?.team_id === teamId && lm?.user_id) {
          teamLoggedUsers.add(lm.user_id);
        }
      }
      teamMembersLogged = teamLoggedUsers.size;
    }

    const teamParticipationPct =
      teamTotalMembers > 0
        ? Math.round((teamMembersLogged / teamTotalMembers) * 100)
        : 0;

    // -----------------------------------------------------------------------
    // Extract from leaderboard data
    // -----------------------------------------------------------------------
    const teams = leaderboardData?.teams || [];
    const individuals = leaderboardData?.individuals || [];

    const myTeam = teams.find((t: any) => t.team_id === teamId);
    const leaderTeam = teams.length > 0 ? teams[0] : null;
    const teamRank = myTeam?.rank ?? null;
    const teamPoints = myTeam?.total_points ?? 0;
    const teamAvgRR = myTeam?.avg_rr ?? null;
    const isLeading = teamRank === 1;
    const pointsBehindLeader =
      leaderTeam && myTeam && !isLeading
        ? leaderTeam.total_points - myTeam.total_points
        : 0;
    const rankDelta = teamRank !== null ? teamRank - 1 : 0;

    const myIndividual = individuals.find((i: any) => i.user_id === userId);
    const playerPoints = myIndividual?.points ?? 0;
    const playerAvgRR = myIndividual?.avg_rr ?? null;
    const playerRank = myIndividual?.rank ?? null;

    // -----------------------------------------------------------------------
    // Check if user logged today
    // -----------------------------------------------------------------------
    const hasLoggedToday = todayEntries.some(
      (entry) => (entry.leaguemembers as any)?.user_id === userId,
    );

    // -----------------------------------------------------------------------
    // Compute missed days and rest days
    // -----------------------------------------------------------------------
    let missedDays = 0;
    let restDaysUsed = 0;
    let consecutiveDaysActive = 0;

    const myEntries = myEntriesRes.data || [];
    if (myEntries.length > 0) {
      restDaysUsed = myEntries.filter((e: any) => e.type === 'rest').length;

      const entryDates = new Set(myEntries.map((e: any) => e.date));
      const todayDate = new Date(today);
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(todayDate);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().slice(0, 10);
        if (dateStr < (league.start_date || '').slice(0, 10)) break;
        if (entryDates.has(dateStr)) {
          consecutiveDaysActive++;
        } else {
          break;
        }
      }

      const startDateStr = (league.start_date || '').slice(0, 10);
      const leagueDaysSoFar = Math.max(0, daysBetween(startDateStr, today) + 1);
      const totalEntryDays = new Set(myEntries.map((e: any) => e.date)).size;
      missedDays = Math.max(0, leagueDaysSoFar - totalEntryDays);
    }

    // -----------------------------------------------------------------------
    // League timeline
    // -----------------------------------------------------------------------
    const startDateStr = (league.start_date || '').slice(0, 10);
    const endDateStr = (league.end_date || '').slice(0, 10);
    const leagueDay = Math.max(1, daysBetween(startDateStr, today) + 1);
    const totalLeagueDays = Math.max(
      1,
      daysBetween(startDateStr, endDateStr) + 1,
    );
    const daysRemaining = Math.max(0, daysBetween(today, endDateStr));
    const isFinalWeek = daysRemaining <= 7 && daysRemaining > 0;
    const isLastDay = daysRemaining === 0 && today <= endDateStr;

    // -----------------------------------------------------------------------
    // Check measurement activities
    // -----------------------------------------------------------------------
    const activities = activitiesRes.data || [];
    const hasAnyMeasurementActivity = activities.some((a: any) => {
      const mt =
        a.activities?.measurement_type ||
        a.custom_activities?.measurement_type ||
        'duration';
      return mt !== 'none';
    });

    const context: PlayerInsightContext = {
      playerId: userId,
      playerName: session.user.name || 'Player',
      teamId,
      teamName,
      leagueId,
      playerPoints,
      playerAvgRR,
      playerRank,
      missedDays,
      restDaysUsed,
      restDaysAllowed: league.rest_days || 0,
      consecutiveDaysActive,
      hasLoggedToday,
      teamPoints,
      teamAvgRR,
      teamRank,
      teamParticipationPct,
      teamMembersLogged,
      teamTotalMembers,
      teamMembersRemaining: Math.max(0, teamTotalMembers - teamMembersLogged),
      rankDelta,
      pointsBehindLeader,
      isLeading,
      leagueDay,
      totalLeagueDays,
      isFinalWeek,
      isLastDay,
      leagueStatus: league.status,
      hasAnyMeasurementActivity,
    };

    return NextResponse.json(
      { success: true, data: context },
      {
        headers: {
          'Cache-Control': 'private, max-age=300', // 5 min cache
        },
      },
    );
  } catch (error) {
    console.error('Error computing AI context:', error);
    return NextResponse.json(
      { error: 'Failed to compute AI context' },
      { status: 500 },
    );
  }
}
