/**
 * Point Normalization Utilities
 * Handles calculation and application of point normalization based on team size variance
 */

export interface TeamSizeInfo {
  teamId: string;
  teamName: string;
  memberCount: number;
}

/**
 * Check if teams have different member counts
 * @param teams - Array of team size information
 * @returns true if teams have different member counts, false otherwise
 */
export function hasTeamSizeVariance(teams: TeamSizeInfo[]): boolean {
  if (teams.length <= 1) return false;
  
  const sizes = teams.map(t => t.memberCount);
  const firstSize = sizes[0];
  return sizes.some(size => size !== firstSize);
}

/**
 * Get team size statistics
 * @param teams - Array of team size information
 * @returns Object with min, max, average, and variance info
 */
export function getTeamSizeStats(teams: TeamSizeInfo[]) {
  if (teams.length === 0) {
    return { minSize: 0, maxSize: 0, avgSize: 0, hasVariance: false };
  }

  const sizes = teams.map(t => t.memberCount);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;

  return {
    minSize,
    maxSize,
    avgSize,
    hasVariance: minSize !== maxSize,
  };
}

/**
 * Calculate normalization factor for a team
 * Normalizes points to the maximum team size (baseline)
 * 
 * Formula: normalized_points = (raw_points / team_member_count) × max_team_size
 * 
 * IMPORTANT: Only use for base activity/workout points.
 * Do NOT use for challenge bonus points — those are already
 * per-capita-adjusted in leaderboard-logic.ts.
 * 
 * @param teamMemberCount - Number of members in the team
 * @param maxTeamSize - Maximum team size across all teams (baseline)
 * @returns Normalization factor to multiply points by
 */
export function calculateNormalizationFactor(
  teamMemberCount: number,
  maxTeamSize: number
): number {
  if (teamMemberCount === 0 || maxTeamSize === 0) return 1;
  if (teamMemberCount === maxTeamSize) return 1;
  return maxTeamSize / teamMemberCount;
}

/**
 * Apply normalization to points
 * @param points - Raw points to normalize
 * @param teamMemberCount - Number of members in the team
 * @param maxTeamSize - Maximum team size across all teams (baseline)
 * @returns Normalized points (rounded to whole number)
 */
export function normalizePoints(
  points: number,
  teamMemberCount: number,
  maxTeamSize: number
): number {
  const factor = calculateNormalizationFactor(teamMemberCount, maxTeamSize);
  return Math.round(points * factor); // Round to whole number
}

/**
 * Format normalization message for UI
 * @param stats - Team size statistics
 * @returns Formatted message explaining the variance
 */
export function formatNormalizationMessage(stats: ReturnType<typeof getTeamSizeStats>): string {
  if (!stats.hasVariance) {
    return `All teams have ${stats.minSize} members`;
  }

  return `Teams vary from ${stats.minSize} to ${stats.maxSize} members (avg: ${stats.avgSize.toFixed(1)})`;
}
