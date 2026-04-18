/**
 * League Normalization API Helpers
 * Client-side helpers for fetching and applying point normalization
 */

import { normalizePoints, getTeamSizeStats } from './normalization';

export interface LeagueWithNormalization {
  league_id: string;
  league_name: string;
  normalize_points_by_team_size: boolean;
}

export interface TeamWithNormalization {
  team_id: string;
  team_name: string;
  member_count: number;
  total_points: number;
  normalized_points?: number;
}

/**
 * Fetch league normalization settings and team data
 */
export async function fetchLeagueNormalizationData(leagueId: string) {
  try {
    const response = await fetch(`/api/leagues/${leagueId}/teams`);
    if (!response.ok) throw new Error('Failed to fetch league data');

    const result = await response.json();
    return {
      league: result.data?.league,
      teamSizeVariance: result.data?.teamSizeVariance,
      teams: result.data?.teams,
    };
  } catch (error) {
    console.error('Error fetching league normalization data:', error);
    return {
      league: null,
      teamSizeVariance: null,
      teams: null,
    };
  }
}

/**
 * Apply normalization to leaderboard teams if enabled
 */
export function applyNormalizationToLeaderboard(
  teams: TeamWithNormalization[],
  shouldNormalize: boolean,
  maxTeamSize?: number, // Maximum team size from variance stats (baseline)
  excludeChallengeBonus: boolean = true // Whether to exclude challenge bonus from normalization
): TeamWithNormalization[] {
  if (!shouldNormalize || teams.length === 0) {
    return teams;
  }

  const teamSizeStats = getTeamSizeStats(
    teams.map(t => ({
      teamId: t.team_id,
      teamName: t.team_name,
      memberCount: t.member_count,
    }))
  );

  if (!teamSizeStats.hasVariance) {
    return teams;
  }

  const baseline = maxTeamSize ?? teamSizeStats.maxSize;
  if (baseline === 0) {
    return teams;
  }

  return teams.map(team => {
    // If excludeChallengeBonus is true, we only normalize the base points
    // (total_points - challenge_bonus)
    const pointsToNormalize = excludeChallengeBonus 
      ? (team as any).points || team.total_points 
      : team.total_points;
    
    const normalizedBase = normalizePoints(
      pointsToNormalize,
      team.member_count,
      baseline
    );

    const bonus = excludeChallengeBonus ? ((team as any).challenge_bonus || 0) : 0;

    return {
      ...team,
      normalized_points: normalizedBase,
      total_points: excludeChallengeBonus ? (normalizedBase + bonus) : normalizedBase,
    };
  });
}

/**
 * Sort teams by appropriate points field (normalized or total)
 */
export function sortTeamsByPoints(
  teams: TeamWithNormalization[],
  useNormalized: boolean = false
): TeamWithNormalization[] {
  return [...teams].sort((a, b) => {
    const aPoints = useNormalized && a.normalized_points !== undefined ? a.normalized_points : a.total_points;
    const bPoints = useNormalized && b.normalized_points !== undefined ? b.normalized_points : b.total_points;
    return bPoints - aPoints;
  });
}
