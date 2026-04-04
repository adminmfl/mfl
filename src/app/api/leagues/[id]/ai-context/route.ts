/**
 * GET /api/leagues/[id]/ai-context - Compute PlayerInsightContext for the current user
 *
 * Returns a summarized context object used by the client-side trigger evaluator
 * to select inline AI insights. No LLM calls — pure data aggregation.
 *
 * Cached for 5 minutes via Cache-Control headers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import type { PlayerInsightContext } from '@/lib/ai/types';

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();
    const today = todayYMD();

    // Parallel queries for efficiency
    const [
      leagueRes,
      memberRes,
      leaderboardRes,
      todayEntriesRes,
      myTodayRes,
      activitiesRes,
    ] = await Promise.all([
      // 1. League details (dates, status)
      supabase
        .from('leagues')
        .select('league_id, league_name, start_date, end_date, status, rest_days')
        .eq('league_id', leagueId)
        .single(),

      // 2. Current user's membership
      supabase
        .from('leaguemembers')
        .select('league_member_id, team_id, teams(team_name)')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle(),

      // 3. Leaderboard (team rankings + individual)
      fetch(
        `${request.nextUrl.origin}/api/leagues/${leagueId}/leaderboard`,
        {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        }
      ).then((r) => r.json()),

      // 4. Today's entries for the user's team (to compute participation)
      // Will be filtered by team after we know teamId
      supabase
        .from('effortentry')
        .select('league_member_id, leaguemembers!inner(user_id, team_id)')
        .eq('leaguemembers.league_id', leagueId)
        .eq('date', today)
        .in('status', ['approved', 'pending']),

      // 5. Current user's today entry
      supabase
        .from('effortentry')
        .select('id')
        .eq('date', today)
        .in('status', ['approved', 'pending'])
        .limit(1),

      // 6. League activities (to check measurement types)
      supabase
        .from('leagueactivities')
        .select('activity_id, custom_activity_id, activities(measurement_type), custom_activities(measurement_type)')
        .eq('league_id', leagueId),
    ]);

    const league = leagueRes.data;
    const member = memberRes.data;

    if (!league || !member) {
      return NextResponse.json(
        { error: 'League or membership not found' },
        { status: 404 }
      );
    }

    const teamId = member.team_id;
    const teamName = (member as any).teams?.team_name || null;

    // -----------------------------------------------------------------------
    // Compute team participation for today
    // -----------------------------------------------------------------------
    const todayEntries = todayEntriesRes.data || [];
    let teamMembersLogged = 0;
    let teamTotalMembers = 0;

    if (teamId) {
      // Get team member count
      const { count } = await supabase
        .from('leaguemembers')
        .select('league_member_id', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('team_id', teamId);

      teamTotalMembers = count || 0;

      // Count unique users on the team who logged today
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
    // Extract from leaderboard response
    // -----------------------------------------------------------------------
    const teams: Array<{
      rank: number;
      team_id: string;
      team_name: string;
      points: number;
      total_points: number;
      avg_rr: number;
    }> = leaderboardRes?.data?.teams || [];

    const individuals: Array<{
      rank: number;
      user_id: string;
      points: number;
      avg_rr: number;
    }> = leaderboardRes?.data?.individuals || [];

    // My team's ranking
    const myTeam = teams.find((t) => t.team_id === teamId);
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

    // My individual ranking
    const myIndividual = individuals.find((i) => i.user_id === userId);
    const playerPoints = myIndividual?.points ?? 0;
    const playerAvgRR = myIndividual?.avg_rr ?? null;
    const playerRank = myIndividual?.rank ?? null;

    // -----------------------------------------------------------------------
    // Check if user logged today
    // -----------------------------------------------------------------------
    // Filter myTodayRes by the user's league_member_id
    const hasLoggedToday = (() => {
      // Check from todayEntries if user has an entry
      for (const entry of todayEntries) {
        const lm = entry.leaguemembers as any;
        if (lm?.user_id === userId) return true;
      }
      return false;
    })();

    // -----------------------------------------------------------------------
    // Compute missed days and rest days from my-submissions
    // -----------------------------------------------------------------------
    let missedDays = 0;
    let restDaysUsed = 0;
    let consecutiveDaysActive = 0;

    // Fetch user's summary stats
    const { data: myEntries } = await supabase
      .from('effortentry')
      .select('date, type, status')
      .eq('league_member_id', member.league_member_id)
      .in('status', ['approved', 'pending'])
      .order('date', { ascending: false })
      .limit(500);

    if (myEntries && myEntries.length > 0) {
      restDaysUsed = myEntries.filter((e: any) => e.type === 'rest').length;

      // Count consecutive active days from today backwards
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

      // Missed days = league days so far - entries - rest days
      const startDate = (league.start_date || '').slice(0, 10);
      const leagueDaysSoFar = Math.max(0, daysBetween(startDate, today) + 1);
      const totalEntryDays = new Set(myEntries.map((e: any) => e.date)).size;
      missedDays = Math.max(0, leagueDaysSoFar - totalEntryDays);
    }

    // -----------------------------------------------------------------------
    // League timeline
    // -----------------------------------------------------------------------
    const startDate = (league.start_date || '').slice(0, 10);
    const endDate = (league.end_date || '').slice(0, 10);
    const leagueDay = Math.max(1, daysBetween(startDate, today) + 1);
    const totalLeagueDays = Math.max(1, daysBetween(startDate, endDate) + 1);
    const daysRemaining = Math.max(0, daysBetween(today, endDate));
    const isFinalWeek = daysRemaining <= 7 && daysRemaining > 0;
    const isLastDay = daysRemaining === 0 && today <= endDate;

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

    // -----------------------------------------------------------------------
    // Build context
    // -----------------------------------------------------------------------
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
      }
    );
  } catch (error) {
    console.error('Error computing AI context:', error);
    return NextResponse.json(
      { error: 'Failed to compute AI context' },
      { status: 500 }
    );
  }
}
