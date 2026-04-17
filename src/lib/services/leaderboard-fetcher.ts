/**
 * Leaderboard Fetcher Service
 * Shared service for fetching leaderboard data with server-side caching.
 */

export async function getLeaderboardData(leagueId: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/leagues/${leagueId}/leaderboard`;
  
  try {
    const res = await fetch(url, {
      next: { 
        revalidate: 60, // Cache for 1 minute
        tags: [`leaderboard-${leagueId}`], // Support for on-demand revalidation
      },
    });
    
    if (!res.ok) {
      console.warn(`[getLeaderboardData] Fetch failed for ${leagueId}: ${res.status}`);
      return null;
    }
    
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (error) {
    console.error(`[getLeaderboardData] Error fetching leaderboard data for ${leagueId}:`, error);
    return null;
  }
}
