/**
 * Leaderboard Service
 * Handles leaderboard calculations including point normalization
 */

import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { normalizePoints, getTeamSizeStats } from '@/lib/utils/normalization';

export interface LeaderboardEntry {
  team_id: string;
  team_name: string;
  total_points: number;
  normalized_points?: number;
  member_count: number;
  captain_name?: string;
}

/**
 * Get leaderboard for a league with optional point normalization
 * @param leagueId - League ID
 * @param normalizeByTeamSize - Whether to normalize points by team size
 * @returns Array of leaderboard entries sorted by points
 */
export async function getLeagueLeaderboard(
  leagueId: string,
  normalizeByTeamSize: boolean = false
): Promise<LeaderboardEntry[]> {
  try {
    const supabase = getSupabaseServiceRole();

    // Get all teams in the league with their total points
    const { data: teams, error: teamsError } = await supabase
      .from('teamleagues')
      .select(`
        team_id,
        teams (
          team_id,
          team_name,
          created_by
        ),
        league_id
      `)
      .eq('league_id', leagueId);

    if (teamsError || !teams) {
      console.error('Error fetching teams:', teamsError);
      return [];
    }

    // Get member counts for each team in this league
    const memberCountsRaw = await Promise.all(
      teamIds.map(async (tid) => {
        const { count, error } = await supabase
          .from('leaguemembers')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', tid)
          .eq('league_id', leagueId);
        
        if (error) {
          console.error(`Error fetching member count for team ${tid}:`, error);
        }
        
        return { team_id: tid, count: count || 0 };
      })
    );

    const memberCounts = memberCountsRaw;

    // Get total points for each team from submissions/entries
    const { data: teamPoints, error: pointsError } = await supabase
      .from('entries')
      .select('team_id, points')
      .eq('league_id', leagueId)
      .eq('status', 'approved');

    if (pointsError) {
      console.error('Error fetching team points:', pointsError);
    }

    // Aggregate points by team
    const pointsByTeam: { [key: string]: number } = {};
    if (teamPoints) {
      teamPoints.forEach(entry => {
        if (!pointsByTeam[entry.team_id]) {
          pointsByTeam[entry.team_id] = 0;
        }
        pointsByTeam[entry.team_id] += entry.points || 0;
      });
    }

    // Get member counts by team
    const countsByTeam: { [key: string]: number } = {};
    if (memberCounts) {
      memberCounts.forEach(mc => {
        countsByTeam[mc.team_id] = mc.count || 0;
      });
    }

    // Build leaderboard entries
    const leaderboard: LeaderboardEntry[] = teams.map(team => {
      const teamData = team.teams as any;
      const totalPoints = pointsByTeam[team.team_id] || 0;
      const memberCount = countsByTeam[team.team_id] || 0;

      return {
        team_id: team.team_id,
        team_name: teamData?.team_name || 'Unknown Team',
        total_points: totalPoints,
        member_count: memberCount,
      };
    });

    // Apply normalization if enabled
    if (normalizeByTeamSize && leaderboard.length > 0) {
      // Calculate team size stats to get max team size as baseline
      const teamSizeStats = getTeamSizeStats(
        leaderboard.map(t => ({
          teamId: t.team_id,
          teamName: t.team_name,
          memberCount: t.member_count,
        }))
      );

      if (teamSizeStats.hasVariance && teamSizeStats.maxSize > 0) {
        // Apply normalization to each team using the max team size as baseline
        leaderboard.forEach(entry => {
          entry.normalized_points = normalizePoints(
            entry.total_points,
            entry.member_count,
            teamSizeStats.maxSize
          );
        });
      }
    }

    // Sort by points (normalized if available, otherwise total)
    leaderboard.sort((a, b) => {
      const aPoints = normalizeByTeamSize && a.normalized_points !== undefined ? a.normalized_points : a.total_points;
      const bPoints = normalizeByTeamSize && b.normalized_points !== undefined ? b.normalized_points : b.total_points;
      return bPoints - aPoints;
    });

    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

/**
 * Get leaderboard with team variance information
 * @param leagueId - League ID
 * @returns Leaderboard data with variance stats
 */
export async function getLeaderboardWithVariance(leagueId: string) {
  try {
    // Get league info to check normalization setting
    const supabase = getSupabaseServiceRole();
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('normalize_points_by_team_size')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      console.error('Error fetching league:', leagueError);
      return { leaderboard: [], teamSizeStats: null };
    }

    const leaderboard = await getLeagueLeaderboard(
      leagueId,
      league.normalize_points_by_team_size
    );

    // Calculate team size stats from leaderboard
    const teamSizeStats = getTeamSizeStats(
      leaderboard.map(t => ({
        teamId: t.team_id,
        teamName: t.team_name,
        memberCount: t.member_count,
      }))
    );

    return { leaderboard, teamSizeStats };
  } catch (error) {
    console.error('Error getting leaderboard with variance:', error);
    return { leaderboard: [], teamSizeStats: null };
  }
}
