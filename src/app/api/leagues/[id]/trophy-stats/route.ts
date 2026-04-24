/**
 * GET /api/leagues/[id]/trophy-stats - Get season summary statistics for trophy display
 * Returns comprehensive end-of-league statistics including rankings, stats, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

interface TrophyStats {
  player: {
    userId: string;
    username: string;
    totalPoints: number;
    teamRank: number | null;
    leagueRank: number | null;
    avgRR: number | null;
    totalActivities: number;
    totalActiveDays: number;
    restDaysUsed: number;
    missedDays: number;
    bestStreak: number;
    challengePoints: number;
  };
  team: {
    teamId: string;
    teamName: string;
    totalPoints: number;
    teamRank: number | null;
    memberCount: number;
    avgPointsPerMember: number;
  } | null;
  league: {
    leagueId: string;
    leagueName: string;
    totalTeams: number;
    totalMembers: number;
    startDate: string;
    endDate: string;
    winnerTeam: {
      teamName: string;
      teamPoints: number;
    } | null;
  };
}

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

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    // 1. Get league info
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, league_name, start_date, end_date, status')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // 2. Get user membership info
    const { data: membership, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, team_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a league member' },
        { status: 403 },
      );
    }

    const leagueMemberId = membership.league_member_id;
    const teamId = membership.team_id;

    // 3. Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, username')
      .eq('user_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 4. Get player stats
    const { data: activities } = await supabase
      .from('effortentry')
      .select('id, date')
      .eq('league_member_id', leagueMemberId)
      .in('status', ['approved', 'pending']);

    const { data: restDays } = await supabase
      .from('resdays')
      .select('id')
      .eq('league_member_id', leagueMemberId);

    // Count unique days
    const uniqueDays = new Set((activities || []).map((a) => a.date));
    const totalActivities = (activities || []).length;
    const totalActiveDays = uniqueDays.size;
    const restDaysUsed = (restDays || []).length;

    // Calculate missed days (days between start and end where no activity)
    const startDate = new Date(league.start_date);
    const endDate = new Date(league.end_date);
    const totalLeagueDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const missedDays = Math.max(
      0,
      totalLeagueDays - totalActiveDays - restDaysUsed,
    );

    // Get points from leaderboard service
    const { data: leaderboardData } = await supabase
      .from('leaguemembers')
      .select('total_points, avg_rr')
      .eq('league_member_id', leagueMemberId)
      .single();

    const totalPoints = leaderboardData?.total_points || 0;
    const avgRR = leaderboardData?.avg_rr || null;

    // Get challenge points
    const { data: challengeSubmissions } = await supabase
      .from('challenge_submissions')
      .select('points_earned')
      .eq('league_member_id', leagueMemberId)
      .eq('status', 'approved');

    const challengePoints = (challengeSubmissions || []).reduce(
      (sum, c) => sum + (c.points_earned || 0),
      0,
    );

    // Calculate best streak
    const sortedDays = Array.from(uniqueDays).sort();
    let bestStreak = 0;
    let currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const dayDiff = Math.ceil(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dayDiff === 1) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    bestStreak = Math.max(
      bestStreak,
      currentStreak,
      sortedDays.length > 0 ? 1 : 0,
    );

    // 5. Get team info and rank
    let teamInfo = null;
    let teamRank = null;
    if (teamId) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('team_id, team_name')
        .eq('team_id', teamId)
        .single();

      if (!teamError && team) {
        teamInfo = team;

        // Get team total points
        const { data: teamMembers } = await supabase
          .from('leaguemembers')
          .select('total_points')
          .eq('team_id', teamId)
          .eq('league_id', leagueId);

        const teamTotalPoints = (teamMembers || []).reduce(
          (sum, m) => sum + (m.total_points || 0),
          0,
        );
        const memberCount = (teamMembers || []).length;

        // Get team rank (count teams with more points)
        const { data: allTeamStats } = await supabase
          .from('leaguemembers')
          .select('team_id, total_points')
          .eq('league_id', leagueId);

        const teamTotals: Record<string, number> = {};
        (allTeamStats || []).forEach((member: any) => {
          if (member.team_id) {
            teamTotals[member.team_id] =
              (teamTotals[member.team_id] || 0) + (member.total_points || 0);
          }
        });

        const teamsWithMorePoints = Object.values(teamTotals).filter(
          (points) => points > teamTotalPoints,
        ).length;
        teamRank = teamsWithMorePoints + 1;

        teamInfo = {
          ...teamInfo,
          totalPoints: teamTotalPoints,
          teamRank,
          memberCount,
          avgPointsPerMember:
            memberCount > 0 ? teamTotalPoints / memberCount : 0,
        };
      }
    }

    // 6. Get player rank in league
    const { data: allMembers } = await supabase
      .from('leaguemembers')
      .select('total_points')
      .eq('league_id', leagueId);

    const playerRank =
      (allMembers || []).filter((m) => (m.total_points || 0) > totalPoints)
        .length + 1;

    // 7. Get winner team
    const { data: winnerMembers } = await supabase
      .from('leaguemembers')
      .select('team_id, total_points')
      .eq('league_id', leagueId);

    const winnerTotals: Record<string, number> = {};
    (winnerMembers || []).forEach((member: any) => {
      if (member.team_id) {
        winnerTotals[member.team_id] =
          (winnerTotals[member.team_id] || 0) + (member.total_points || 0);
      }
    });

    let winnerTeam: { teamName: string; teamPoints: number } | null = null;
    const winnerTeamId = Object.entries(winnerTotals).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    if (winnerTeamId) {
      const { data: winnerTeamData } = await supabase
        .from('teams')
        .select('team_name')
        .eq('team_id', winnerTeamId)
        .maybeSingle();

      winnerTeam = winnerTeamData
        ? {
            teamName: winnerTeamData.team_name,
            teamPoints: winnerTotals[winnerTeamId] || 0,
          }
        : null;
    }

    // 8. Get league stats
    const { data: leagueMembers } = await supabase
      .from('leaguemembers')
      .select('team_id')
      .eq('league_id', leagueId);

    const { data: leagueTeams } = await supabase
      .from('teamleagues')
      .select('team_id')
      .eq('league_id', leagueId);

    const response: TrophyStats = {
      player: {
        userId,
        username: user.username,
        totalPoints,
        teamRank: teamInfo?.teamRank || null,
        leagueRank: playerRank,
        avgRR: avgRR as number | null,
        totalActivities,
        totalActiveDays,
        restDaysUsed,
        missedDays,
        bestStreak,
        challengePoints,
      },
      team: teamInfo
        ? {
            teamId: teamInfo.team_id,
            teamName: teamInfo.team_name,
            totalPoints: teamInfo.totalPoints,
            teamRank: teamInfo.teamRank,
            memberCount: teamInfo.memberCount,
            avgPointsPerMember: teamInfo.avgPointsPerMember,
          }
        : null,
      league: {
        leagueId,
        leagueName: league.league_name,
        totalTeams: (leagueTeams || []).length,
        totalMembers: (leagueMembers || []).length,
        startDate: league.start_date,
        endDate: league.end_date,
        winnerTeam,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error getting trophy stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
