/**
 * Hook for fetching league leaderboard data.
 * Provides team rankings, individual rankings, and statistics with date range filtering.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getClientCache,
  setClientCache,
  invalidateClientCache,
} from '@/lib/client-cache';

// ============================================================================
// Types
// ============================================================================

export interface TeamRanking {
  rank: number;
  team_id: string;
  team_name: string;
  points: number;
  challenge_bonus: number;
  total_points: number;
  avg_rr: number;
  member_count: number;
  submission_count: number;
  // Optional team logo
  logo_url?: string | null;
  // Optional normalized points (computed client-side when normalization is active)
  normalized_points?: number;
}

export interface IndividualRanking {
  rank: number;
  user_id: string;
  username: string;
  team_id: string | null;
  team_name: string | null;
  points: number;
  challenge_points?: number;
  avg_rr: number;
  submission_count: number;
}

export interface SubTeamRanking {
  rank: number;
  subteam_id: string;
  subteam_name: string;
  team_id: string | null;
  team_name: string | null;
  points: number;
  submission_count: number;
}

export interface LeaderboardStats {
  total_submissions: number;
  approved: number;
  pending: number;
  rejected: number;
  total_rr: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface PendingTeamWindowRanking {
  rank: number;
  team_id: string;
  team_name: string;
  total_points: number;
  avg_rr: number;
  pointsByDate: Record<string, number>;
  logo_url?: string | null;
}

export interface PendingWindow {
  dates: string[];
  teams: PendingTeamWindowRanking[];
}

export interface LeagueInfo {
  league_id: string;
  league_name: string;
  start_date: string;
  end_date: string;
  rr_config?: { formula: string };
  rest_days?: number;
}

export interface LeaderboardData {
  teams: TeamRanking[];
  pendingWindow?: PendingWindow;
  subTeams: SubTeamRanking[];
  individuals: IndividualRanking[];
  challengeTeams: TeamRanking[];
  challengeIndividuals: IndividualRanking[];
  stats: LeaderboardStats;
  dateRange: DateRange;
  league: LeagueInfo;
  normalization?: {
    active: boolean;
    hasVariance: boolean;
    avgSize: number;
    minSize: number;
    maxSize: number;
  };
}

export interface UseLeagueLeaderboardOptions {
  startDate?: string;
  endDate?: string;
  initialData?: LeaderboardData | null;
}

export interface UseLeagueLeaderboardReturn {
  data: LeaderboardData | null;
  rawTeams?: TeamRanking[];
  rawPendingWindow?: PendingWindow;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useLeagueLeaderboard(
  leagueId: string | null,
  options?: UseLeagueLeaderboardOptions,
): UseLeagueLeaderboardReturn {
  const [data, setData] = useState<LeaderboardData | null>(
    options?.initialData || null,
  );
  const [isLoading, setIsLoading] = useState(!options?.initialData);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRangeState] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: options?.startDate || null,
    endDate: options?.endDate || null,
  });
  const [rawTeams, setRawTeams] = useState<TeamRanking[] | undefined>(
    options?.initialData?.teams,
  );
  const [rawPendingWindow, setRawPendingWindow] = useState<
    PendingWindow | undefined
  >(options?.initialData?.pendingWindow);

  const fetchLeaderboard = useCallback(
    async (force = false) => {
      if (!leagueId) {
        setData(null);
        setIsLoading(false);
        return;
      }

      try {
        // Only show full loading state if we don't have data yet or if it's a forced refetch
        if (!data || force) {
          setIsLoading(true);
        }
        setError(null);

        // Build URL with query params
        const params = new URLSearchParams();

        params.set('tzOffsetMinutes', String(new Date().getTimezoneOffset()));
        // Also send IANA timezone for more accurate date calculation
        try {
          const ianaTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (ianaTimezone) {
            params.set('ianaTimezone', ianaTimezone);
          }
        } catch {}
        if (dateRange.startDate) {
          params.set('startDate', dateRange.startDate);
        }
        if (dateRange.endDate) {
          params.set('endDate', dateRange.endDate);
        }

        const url = `/api/leagues/${leagueId}/leaderboard${params.toString() ? `?${params.toString()}` : ''}`;

        // Try in-memory cache first for snappy back/forward navigation.
        const cacheKey = `leaderboard:${leagueId}:${dateRange.startDate || ''}:${dateRange.endDate || ''}`;

        if (!force) {
          const cached = getClientCache<{
            data: LeaderboardData | null;
            rawTeams?: TeamRanking[];
            rawPendingWindow?: PendingWindow;
          }>(cacheKey);

          if (cached && cached.data) {
            setData(cached.data);
            setRawTeams(cached.rawTeams);
            setRawPendingWindow(cached.rawPendingWindow);
            setIsLoading(false);
            return;
          }
        } else {
          // Invalidate cache before forced refresh to ensure fresh data
          invalidateClientCache(cacheKey);
        }

        // Fetch leaderboard data and team metadata in parallel
        const [response, teamsResp] = await Promise.all([
          fetch(url),
          fetch(`/api/leagues/${leagueId}/teams`),
        ]);

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || `Failed to fetch leaderboard (${response.status})`,
          );
        }

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch leaderboard');
        }

        let fetchedData: LeaderboardData = result.data;
        // Snapshot raw data before normalization
        const initialTeams = Array.isArray(fetchedData?.teams)
          ? fetchedData.teams
          : undefined;
        setRawTeams(initialTeams);
        setRawPendingWindow(fetchedData?.pendingWindow);

        if (teamsResp.ok) {
          const teamsJson = await teamsResp.json();
          const normalizeActive = Boolean(
            teamsJson?.data?.league?.normalize_points_by_team_size,
          );
          const variance = teamsJson?.data?.teamSizeVariance as
            | {
                hasVariance: boolean;
                avgSize: number;
                minSize: number;
                maxSize: number;
              }
            | undefined;
          const teamMemberMap: Record<string, number> = {};
          const apiTeams: Array<{
            team_id: string;
            member_count?: number;
            logo_url?: string | null;
          }> = teamsJson?.data?.teams || [];
          apiTeams.forEach((t) => {
            teamMemberMap[t.team_id] = Number(t.member_count ?? 0);
          });

          // Merge logo_url into leaderboard team objects so UI can render team logos
          const logoByTeamId: Record<string, string | null> = {};
          apiTeams.forEach((t) => {
            logoByTeamId[t.team_id] = (t as any).logo_url || null;
          });
          if (Array.isArray(fetchedData?.teams)) {
            fetchedData.teams = fetchedData.teams.map((t) => ({
              ...t,
              logo_url: logoByTeamId[t.team_id] || null,
            }));
          }
          if (Array.isArray(fetchedData?.pendingWindow?.teams)) {
            fetchedData.pendingWindow = {
              ...fetchedData.pendingWindow,
              teams: fetchedData.pendingWindow.teams.map((t) => ({
                ...t,
                logo_url: logoByTeamId[t.team_id] || null,
              })),
            };
          }

          // Compute normalized points when active and variance exists
          if (
            normalizeActive &&
            variance?.hasVariance &&
            variance.maxSize > 0 &&
            Array.isArray(fetchedData?.teams)
          ) {
            // Apply normalized points using: (raw_points / member_count) × max_team_size
            const normalizedTeams = fetchedData.teams.map((t) => {
              const memberCount = Math.max(1, t.member_count);
              const normalizedBase = Math.round(
                t.points * (variance.maxSize / memberCount),
              );
              const normalizedChallenge = Math.round(
                (t.challenge_bonus || 0) * (variance.maxSize / memberCount),
              );
              const displayTotal = normalizedBase + normalizedChallenge;
              return {
                ...t,
                normalized_points: normalizedBase,
                total_points: displayTotal, // overwrite displayed total to normalized base + challenge bonus
              };
            });
            // Sort by normalized display total, then avg_rr DESC as tiebreaker
            normalizedTeams.sort((a, b) => {
              if (b.total_points !== a.total_points)
                return b.total_points - a.total_points;
              return b.avg_rr - a.avg_rr;
            });
            const reRanked = normalizedTeams.map((t, idx) => ({
              ...t,
              rank: idx + 1,
            }));

            // Normalize pending window (today/yesterday) pointsByDate using team member counts
            let normalizedPending = fetchedData.pendingWindow;
            if (
              fetchedData.pendingWindow &&
              fetchedData.pendingWindow.dates?.length
            ) {
              const dates = fetchedData.pendingWindow.dates;
              const todayKey = dates[0]; // pendingWindowEnd first in list
              const teamsPW = fetchedData.pendingWindow.teams.map((pw) => {
                const memberCount = Math.max(1, teamMemberMap[pw.team_id] ?? 0);
                const normalizedPointsByDate: Record<string, number> = {};
                Object.entries(pw.pointsByDate || {}).forEach(([k, v]) => {
                  normalizedPointsByDate[k] = Math.round(
                    (v || 0) * (variance.maxSize / memberCount),
                  );
                });
                return {
                  ...pw,
                  pointsByDate: normalizedPointsByDate,
                };
              });
              // Rank by today's normalized points
              teamsPW.sort(
                (a, b) =>
                  (b.pointsByDate?.[todayKey] ?? 0) -
                  (a.pointsByDate?.[todayKey] ?? 0),
              );
              normalizedPending = {
                dates,
                teams: teamsPW.map((t, idx) => ({ ...t, rank: idx + 1 })),
              };
            }

            fetchedData = {
              ...fetchedData,
              normalization: {
                active: true,
                hasVariance: true,
                avgSize: variance.avgSize,
                minSize: variance.minSize,
                maxSize: variance.maxSize,
              },
              teams: reRanked,
              pendingWindow: normalizedPending,
            };
          } else {
            fetchedData = {
              ...fetchedData,
              normalization: {
                active: false,
                hasVariance: Boolean(variance?.hasVariance),
                avgSize: Number(variance?.avgSize ?? 0),
                minSize: Number(variance?.minSize ?? 0),
                maxSize: Number(variance?.maxSize ?? 0),
              },
            };
          }
        }

        setData(fetchedData);

        // Store in client cache for fast subsequent navigations.
        setClientCache(cacheKey, {
          data: fetchedData,
          rawTeams: initialTeams,
          rawPendingWindow: fetchedData?.pendingWindow,
        });
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load leaderboard',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [leagueId, dateRange.startDate, dateRange.endDate],
  );

  // Set date range and trigger refetch
  const setDateRange = useCallback(
    (startDate: string | null, endDate: string | null) => {
      setDateRangeState({ startDate, endDate });
    },
    [],
  );

  // Seed initial cache if data is provided from server
  useEffect(() => {
    if (options?.initialData && leagueId) {
      const cacheKey = `leaderboard:${leagueId}:${dateRange.startDate || ''}:${dateRange.endDate || ''}`;
      setClientCache(cacheKey, {
        data: options.initialData,
        rawTeams: options.initialData.teams,
        rawPendingWindow: options.initialData.pendingWindow,
      });
    }
  }, [leagueId, options?.initialData]); // only runs when leagueId or initialData changes

  // Initial fetch and refetch on date range change
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    data,
    rawTeams,
    rawPendingWindow,
    isLoading,
    error,
    refetch: () => fetchLeaderboard(true),
    setDateRange,
  };
}

export default useLeagueLeaderboard;
