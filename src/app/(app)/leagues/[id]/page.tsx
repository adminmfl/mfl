'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Users,
  Calendar,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Crown,
  Shield,
  Target,
  Flame,
  Globe,
  Lock,
  ArrowRight,
  Zap,
  Timer,
  TrendingUp,
  RefreshCw,
  Moon,
  Gift,
  Eye,
  MessageSquareHeart,
  ExternalLink,
} from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/contexts/role-context';
import { type MySubmission } from '@/hooks/use-my-submissions';
import { saveLastLeagueId } from '@/lib/last-league-storage';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InviteDialog } from '@/components/league/invite-dialog';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { getClientCache, setClientCache, invalidateClientCache } from '@/lib/client-cache';
import { DownloadReportButton, DownloadCertificateButton } from '@/components/leagues/download-report-button';
import { DynamicReportDialog } from '@/components/leagues/dynamic-report-dialog';
import { SubmissionDetailDialog } from '@/components/submissions';
import { WhatsAppReminderButton } from '@/components/league/whatsapp-reminder-button';
import { useRouter } from 'next/navigation';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalYmd(ymd: string): Date | null {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(String(ymd));
  if (!match) return null;
  const [y, m, d] = ymd.split('-').map((p) => Number(p));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function startOfWeekSunday(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

// Start of week anchored to a specific weekday (0=Sun ... 6=Sat)
function startOfWeekAnchored(d: Date, anchorDay: number) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = (day - anchorDay + 7) % 7; // days since last anchor day
  out.setDate(out.getDate() - diff);
  return out;
}

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function formatWeekRange(startLocal: Date) {
  const endLocal = addDays(startLocal, 6);
  const startText = startLocal.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endText = endLocal.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startText} – ${endText}`;
}

// ============================================================================
// Types
// ============================================================================

interface LeagueDetails {
  league_id: string;
  league_name: string;
  logo_url?: string | null;
  description: string | null;
  start_date: string;
  end_date: string;
  status: 'draft' | 'launched' | 'active' | 'completed';
  is_public: boolean;
  is_exclusive: boolean;
  num_teams: number;
  league_capacity: number;
  rest_days: number;
  invite_code: string | null;
  created_by?: string;
  creator_name?: string;
  member_count?: number;
}

interface LeagueStats {
  totalPoints: number;
  memberCount: number;
  teamCount: number;
  submissionCount: number;
  pendingCount: number;
  activeMembers: number;
  dailyAverage: number;
  maxCapacity: number;
}

type RecentDayRow = {
  date: string; // YYYY-MM-DD (local)
  label: string;
  subtitle: string;
  status?: string;
  pointsLabel: string;
  submission?: MySubmission | null;
};

// ============================================================================
// League Dashboard Page
// ============================================================================

export default function LeagueDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { activeLeague, setActiveLeague, userLeagues } = useLeague();
  const { isHost, isCaptain, activeRole } = useRole();
  const router = useRouter();

  const [league, setLeague] = React.useState<LeagueDetails | null>(null);
  const [stats, setStats] = React.useState<LeagueStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rejectedCount, setRejectedCount] = React.useState<number>(0);
  const [hostName, setHostName] = React.useState<string | null>(null);
  const [recentDays, setRecentDays] = React.useState<RecentDayRow[] | null>(null);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [selectedSubmission, setSelectedSubmission] = React.useState<MySubmission | null>(null);
  const [mySummaryLoading, setMySummaryLoading] = React.useState(true);

  const isTrialPeriod = React.useMemo(() => {
    if (!league?.start_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(String(league.start_date).slice(0, 10));
    start.setHours(0, 0, 0, 0);
    return today < start;
  }, [league?.start_date]);


  const { user } = useAuth();

  const [mySummary, setMySummary] = React.useState<{
    points: number; // approved workout points
    totalPoints: number; // includes challenge bonuses
    challengePoints: number; // difference (total - points)
    avgRR: number | null;
    restUsed: number;
    restUnused: number | null;
    missedDays: number;
    teamAvgRR: number | null;
    teamPoints: number | null;
    teamMissedDays: number | null;
    teamRestUsed: number | null;
    teamActivityPoints?: number;
    teamChallengePoints?: number;
    teamRank?: number | null;
  } | null>(null);

  // Sync active league if navigated directly
  React.useEffect(() => {
    if (userLeagues.length > 0 && (!activeLeague || activeLeague.league_id !== id)) {
      const matchingLeague = userLeagues.find((l) => l.league_id === id);
      if (matchingLeague) {
        setActiveLeague(matchingLeague);
      }
    }
    // Save this league as the last visited
    saveLastLeagueId(id);
  }, [id, userLeagues, activeLeague, setActiveLeague]);

  const fetchLeagueData = React.useCallback(
    async (force = false) => {
      const cacheKey = `league-dashboard:${id}`;

      if (!force) {
        const cached = getClientCache<{
          league: LeagueDetails;
          stats: LeagueStats | null;
          rejectedCount: number;
        }>(cacheKey);
        if (cached?.league) {
          setLeague(cached.league);
          setStats(cached.stats);
          setRejectedCount(cached.rejectedCount);
          setLoading(false);
          return;
        }
      } else {
        // Invalidate cache before forced refresh to ensure fresh data
        invalidateClientCache(cacheKey);
      }

      try {
        setLoading(true);

        // Fetch league details and stats in parallel
        const [leagueRes, statsRes, rejectedRes] = await Promise.all([
          fetch(`/api/leagues/${id}`),
          fetch(`/api/leagues/${id}/stats`),
          // Only need a count; endpoint returns stats alongside the list.
          fetch(`/api/leagues/${id}/my-submissions`),
        ]);

        if (!leagueRes.ok) throw new Error('Failed to fetch league');

        const leagueData = await leagueRes.json();
        if (leagueData.success && leagueData.data) {
          const leagueInfo = leagueData.data;
          setLeague(leagueInfo);

          if (leagueInfo.creator_name) {
            setHostName(leagueInfo.creator_name);
          }
        } else {
          throw new Error('League not found');
        }

        let nextStats: LeagueStats | null = null;
        let nextRejected = 0;

        // Stats are optional, don't fail if they can't be fetched
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success && statsData.stats) {
            nextStats = statsData.stats;
            setStats(statsData.stats);
          } else {
            setStats(null);
          }

          // Rejected reminder is best-effort: ignore auth/membership failures.
          if (rejectedRes.ok) {
            const rejectedData = await rejectedRes.json();
            if (rejectedData?.success && rejectedData?.data?.submissions) {
              const submissions: Array<{ date?: string; status?: string; created_date?: string; modified_date?: string }> = rejectedData.data.submissions;

              // For each date, pick the latest submission and count it only if it is still rejected.
              const latestByDate = new Map<string, { status: string; ts: string }>();
              submissions.forEach((s) => {
                if (!s?.date) return;
                const ts = (s.modified_date || s.created_date || '').toString();
                const existing = latestByDate.get(s.date);
                if (!existing || ts > existing.ts) {
                  latestByDate.set(s.date, { status: s.status || 'pending', ts });
                }
              });

              const rejectedDays = Array.from(latestByDate.values()).filter((v) => v.status === 'rejected').length;
              nextRejected = rejectedDays;
              setRejectedCount(rejectedDays);
            } else {
              nextRejected = 0;
              setRejectedCount(0);
            }
          } else {
            nextRejected = 0;
            setRejectedCount(0);
          }
        } else {
          setStats(null);
        }

        setClientCache(cacheKey, {
          league: leagueData.data as LeagueDetails,
          stats: nextStats,
          rejectedCount: nextRejected,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load league');
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  // Fetch league details and stats
  React.useEffect(() => {
    fetchLeagueData();
  }, [fetchLeagueData]);

  // Week view anchored to league start weekday (e.g., Thu→Wed)
  React.useEffect(() => {
    if (!league) return;

    let cancelled = false;
    setRecentDays(null);

    const run = async () => {
      try {
        const todayLocal = new Date();
        const todayStr = localYmd(todayLocal);

        // Anchor the week to the league's start weekday
        const leagueStartLocal = parseLocalYmd(league.start_date);
        const anchorDay = leagueStartLocal ? leagueStartLocal.getDay() : 0; // default Sunday
        const currentWeekStart = startOfWeekAnchored(todayLocal, anchorDay);
        const weekStartLocal = addDays(currentWeekStart, -weekOffset * 7);
        const startDate = localYmd(weekStartLocal);
        const endDate = localYmd(addDays(weekStartLocal, 6));

        const recentUrl = `/api/leagues/${id}/my-submissions?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        const recentRes = await fetch(recentUrl);
        if (!recentRes.ok) {
          if (!cancelled) setRecentDays([]);
          return;
        }

        const recentData = await recentRes.json();
        const submissions: MySubmission[] =
          recentData?.success && recentData?.data?.submissions ? (recentData.data.submissions as MySubmission[]) : [];

        const byDate = new Map<string, MySubmission>();
        for (const s of submissions) {
          if (!s?.date) continue;
          const existing = byDate.get(s.date);
          if (!existing) {
            byDate.set(s.date, s);
            continue;
          }
          const a = String(existing.created_date || existing.modified_date || '');
          const b = String(s.created_date || s.modified_date || '');
          if (b > a) byDate.set(s.date, s);
        }

        const rows: RecentDayRow[] = [];
        const leagueStart = typeof league.start_date === 'string' ? league.start_date : null;
        const leagueEnd = typeof league.end_date === 'string' ? league.end_date : null;

        for (let offset = 0; offset <= 6; offset += 1) {
          const d = addDays(weekStartLocal, offset);
          const ymd = localYmd(d);
          const label = d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          });

          const entry = byDate.get(ymd) || null;

          // Strict range check:
          // - If AFTER league end, definitely out of range.
          // - If BEFORE league start, consider it "Trial Mode". Only show if there's an actual submission.
          const isAfterEnd = leagueEnd && ymd > leagueEnd;
          const isBeforeStart = leagueStart && ymd < leagueStart;

          if (isAfterEnd) {
            rows.push({ date: ymd, label, subtitle: '—', pointsLabel: '—', submission: null });
            continue;
          }

          if (isBeforeStart && !entry) {
            // If before start and NO submission, show '—' instead of 'Missed day'
            rows.push({ date: ymd, label, subtitle: '—', pointsLabel: '—', submission: null });
            continue;
          }

          // If before start AND has entry, we proceed to render it (Trial Submission)
          // If in normal range, we proceed to render (Entry or Missed Day)

          if (!entry) {
            if (ymd > todayStr) {
              rows.push({ date: ymd, label, subtitle: 'Upcoming', pointsLabel: '—', submission: null });
              continue;
            }

            if (ymd === todayStr) {
              rows.push({ date: ymd, label, subtitle: 'No submission yet', pointsLabel: '—', submission: null });
              continue;
            }

            rows.push({ date: ymd, label, subtitle: 'Missed day', pointsLabel: '0 pt', submission: null });
            continue;
          }

          const isWorkout = entry.type === 'workout';
          const workoutType = isWorkout
            ? (entry.custom_activity_name || (entry.workout_type ? String(entry.workout_type).replace(/_/g, ' ') : ''))
            : '';
          const typeLabel = isWorkout ? (workoutType ? workoutType : 'Workout') : 'Rest Day';
          const statusLabel = entry.status ? String(entry.status) : '';

          let subtitle = statusLabel ? `${typeLabel} • ${statusLabel}` : typeLabel;

          // Add Trial indication
          if (isBeforeStart) {
            subtitle = `(Trial) ${subtitle}`;
          }

          const rr = typeof entry.rr_value === 'number' ? entry.rr_value : null;
          const pointsLabel = rr === null ? '0 pt' : `${rr.toFixed(1)} RR`;

          rows.push({ date: ymd, label, subtitle, status: statusLabel, pointsLabel, submission: entry });
        }

        if (!cancelled) setRecentDays(rows.reverse());
      } catch {
        if (!cancelled) setRecentDays([]);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [id, league, weekOffset]);

  // Player summary (mirrors the metrics shown on /league-dashboard)
  React.useEffect(() => {
    if (!league) return;

    setMySummaryLoading(true);

    const localYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const parseLocalYYYYMMDD = (ymd: string): Date | null => {
      const match = /^\d{4}-\d{2}-\d{2}$/.exec(String(ymd));
      if (!match) return null;
      const [y, m, d] = ymd.split('-').map((p) => Number(p));
      if (!y || !m || !d) return null;
      const dt = new Date(y, m - 1, d);
      if (Number.isNaN(dt.getTime())) return null;
      return dt;
    };

    const run = async () => {
      try {
        // Check cache first for instant display (stale-while-revalidate pattern)
        const cacheKey = `mySummary_${id}_${user?.id}`;
        const cached = getClientCache<typeof mySummary>(cacheKey);
        if (cached) {
          setMySummary(cached);
          setMySummaryLoading(false);
          // Continue to refresh in background
        }

        const todayLocal = new Date();
        const todayStr = localYmd(todayLocal);

        const leagueEndLocal = parseLocalYYYYMMDD(league.end_date);
        const effectiveEndStr = leagueEndLocal && localYmd(leagueEndLocal) < todayStr ? localYmd(leagueEndLocal) : todayStr;

        const qs = new URLSearchParams();
        qs.set('startDate', league.start_date);
        qs.set('endDate', effectiveEndStr);

        const [myRes, restRes, teamSummaryRes] = await Promise.all([
          fetch(`/api/leagues/${id}/my-submissions?${qs.toString()}`, { credentials: 'include' }),
          fetch(`/api/leagues/${id}/rest-days`, { credentials: 'include' }),
          fetch(`/api/leagues/${id}/my-team/summary`, { credentials: 'include' }),
        ]);

        let points = 0;
        let avgRR: number | null = null;
        let restUsed = 0;
        let missedDays = 0;
        let restUnused: number | null = null;
        let teamAvgRR: number | null = null;
        let teamPoints: number | null = null;
        let teamMissedDays: number | null = null;
        let teamRestUsed: number | null = null;

        let teamId: string | null = null;

        if (myRes.ok) {
          const json = await myRes.json();
          const subs: Array<{ date: string; type: string; rr_value: number | string | null; status?: string | null }> =
            json?.success && json?.data?.submissions ? json.data.submissions : [];

          // DEBUG: log what we're receiving from the API
          console.log('[MySummary] Raw submissions:', subs);
          console.log('[MySummary] Query range:', league.start_date, 'to', effectiveEndStr);

          teamId = (json?.data?.teamId as string | null) ?? null;

          const isApproved = (s: { status?: string | null }) => {
            const v = String(s.status || '').toLowerCase();
            return v === 'approved' || v === 'accepted';
          };

          const approvedSubs = subs.filter((s) => isApproved(s));
          console.log('[MySummary] Approved submissions:', approvedSubs);

          // Deduplicate: only one approved entry per date counts (matches leaderboard logic).
          // If multiple approved entries exist on the same date (e.g. reupload), keep the one with RR.
          const uniqueByDate = new Map<string, (typeof approvedSubs)[number]>();
          approvedSubs.forEach((s) => {
            const dateKey = String(s.date).slice(0, 10);
            const existing = uniqueByDate.get(dateKey);
            if (!existing || (!existing.rr_value && s.rr_value)) {
              uniqueByDate.set(dateKey, s);
            }
          });
          const dedupedApproved = Array.from(uniqueByDate.values());

          points = dedupedApproved.length;
          restUsed = dedupedApproved.filter((s) => String(s.type).toLowerCase() === 'rest').length;

          const totalRR = dedupedApproved
            .map((s) => {
              // User Rule: Rest days give 1 RR
              if (String(s.type).toLowerCase() === 'rest') return 1;

              const v = s.rr_value;
              if (typeof v === 'number') return v;
              if (typeof v === 'string') {
                const parsed = parseFloat(v);
                return Number.isFinite(parsed) ? parsed : 0;
              }
              return 0;
            })
            .filter((v) => Number.isFinite(v) && v > 0)
            .reduce((a, b) => a + b, 0);

          avgRR = points > 0 ? Math.round((totalRR / points) * 100) / 100 : null;

          // Missed days: from league start through yesterday (local), or league end if earlier.
          const startDt = parseLocalYYYYMMDD(league.start_date);
          const endDt = parseLocalYYYYMMDD(effectiveEndStr);
          if (startDt && endDt) {
            const yesterday = new Date(todayLocal);
            yesterday.setHours(0, 0, 0, 0);
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = localYmd(yesterday);
            const missedEndStr = localYmd(endDt) < yStr ? localYmd(endDt) : yStr;
            const missedEndDt = parseLocalYYYYMMDD(missedEndStr);

            if (missedEndDt && startDt.getTime() <= missedEndDt.getTime()) {
              // Missed days are days with no submission at all (any status).
              const byDate = new Set(subs.map((s) => String(s.date)));
              const cur = new Date(startDt);
              while (cur.getTime() <= missedEndDt.getTime()) {
                const ds = localYmd(cur);
                if (!byDate.has(ds)) missedDays += 1;
                cur.setDate(cur.getDate() + 1);
              }
            }
          }
        }

        if (restRes.ok) {
          const json = await restRes.json();
          const data = json?.data;
          const used = typeof data?.used === 'number' ? data.used : null;
          const remaining = typeof data?.remaining === 'number' ? data.remaining : null;
          const totalAllowed = typeof data?.totalAllowed === 'number' ? data.totalAllowed : null;

          // Prefer the dedicated rest-days endpoint for consistency.
          if (typeof used === 'number' && Number.isFinite(used)) {
            restUsed = Math.max(0, used);
          }
          if (typeof remaining === 'number' && Number.isFinite(remaining)) {
            restUnused = Math.max(0, remaining);
          } else if (typeof totalAllowed === 'number' && Number.isFinite(totalAllowed)) {
            restUnused = Math.max(0, totalAllowed - restUsed);
          }
        }

        if (teamSummaryRes.ok) {
          const json = await teamSummaryRes.json();
          const data = json?.data;
          if (typeof data?.missedDays === 'number') {
            teamMissedDays = Math.max(0, data.missedDays);
          }
          if (typeof data?.restUsed === 'number') {
            teamRestUsed = Math.max(0, data.restUsed);
          }
        }

        // Fetch leaderboard data (for both team and individual stats) - single call with full=true
        let leaderboardData: any = null;
        let totalPoints = points;
        let challengePoints = 0;
        let teamActivityPoints = 0;
        let teamChallengePoints = 0;
        let teamRank: number | null = null;

        try {
          const tzOffsetMinutes = new Date().getTimezoneOffset();
          const ianaTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
          const query = `full=true&tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}&ianaTimezone=${encodeURIComponent(ianaTimezone)}`;
          const lbRes = await fetch(
            `/api/leagues/${id}/leaderboard?${query}`,
            { credentials: 'include' }
          );

          if (lbRes.ok) {
            leaderboardData = await lbRes.json();

            // Extract team stats if teamId exists
            if (teamId) {
              const teams: Array<{ team_id: string; avg_rr: number; points?: number; total_points?: number; challenge_bonus?: number }> =
                leaderboardData?.data?.teams || leaderboardData?.data?.teamRankings || [];
              const mine = teams.find((t) => String(t.team_id) === String(teamId));
              const v = mine && typeof mine.avg_rr === 'number' ? mine.avg_rr : null;
              teamAvgRR = typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null;

              const p =
                mine && typeof mine.total_points === 'number'
                  ? mine.total_points
                  : mine && typeof mine.points === 'number'
                    ? mine.points
                    : null;
              teamPoints = typeof p === 'number' && Number.isFinite(p) ? Math.max(0, p) : null;

              // Use team's base points (before challenge bonus) for activity points
              teamActivityPoints = mine && typeof mine.points === 'number' ? Math.max(0, mine.points) : 0;
              teamChallengePoints = mine && typeof mine.challenge_bonus === 'number' ? Math.max(0, mine.challenge_bonus) : 0;

              // Extract team rank
              if (mine && typeof (mine as any).rank === 'number') {
                teamRank = (mine as any).rank;
              } else {
                // Derive rank from position in sorted array
                const sortedTeams = [...teams].sort((a, b) => (b.total_points ?? b.points ?? 0) - (a.total_points ?? a.points ?? 0));
                const idx = sortedTeams.findIndex((t) => String(t.team_id) === String(teamId));
                teamRank = idx >= 0 ? idx + 1 : null;
              }
            }

            // Extract individual points from leaderboard (respects points_per_session config)
            const individuals: Array<{ user_id: string; points?: number }> =
              leaderboardData?.data?.individuals || [];
            const myIndividual = individuals.find((i) => String(i.user_id) === String(user?.id));
            if (myIndividual && typeof myIndividual.points === 'number') {
              points = myIndividual.points;
            }

            // Individual stats: challenge points are no longer added to individual totals.
            // Individual players only see activity points - all challenge points go to team.
            // totalPoints for individual = activity points only
            totalPoints = points;
          }
        } catch (err) {
          // Fallback: no leaderboard available, use workout-only points
          console.warn('[MySummary] Leaderboard fetch failed, using workout-only points:', err);
        }

        // Set summary with all calculated values
        const summaryData = {
          points,
          totalPoints,
          challengePoints,
          avgRR,
          restUsed,
          restUnused,
          missedDays,
          teamAvgRR,
          teamPoints,
          teamMissedDays,
          teamRestUsed,
          teamActivityPoints,
          teamChallengePoints,
          teamRank,
        };
        setMySummary(summaryData);

        // Cache the summary data for faster subsequent loads
        setClientCache(cacheKey, summaryData);

        console.log('[MySummary] Final values:', summaryData);
      } catch {
        setMySummary(null);
      } finally {
        setMySummaryLoading(false);
      }
    };

    run();
  }, [id, league, user]);

  const openSubmissionDetails = (submission: MySubmission | null) => {
    if (!submission) return;
    setSelectedSubmission(submission);
    setDetailDialogOpen(true);
  };

  const handleReupload = (submission: MySubmission) => {
    const params = new URLSearchParams({
      resubmit: submission.id,
      date: submission.date,
      type: submission.type,
    });

    if (submission.workout_type) params.set('workout_type', submission.workout_type);
    if (submission.duration) params.set('duration', submission.duration.toString());
    if (submission.distance) params.set('distance', submission.distance.toString());
    if (submission.steps) params.set('steps', submission.steps.toString());
    if (submission.holes) params.set('holes', submission.holes.toString());
    if (submission.notes) params.set('notes', submission.notes);
    if (submission.proof_url) params.set('proof_url', submission.proof_url);

    router.push(`/leagues/${id}/submit?${params.toString()}`);
  };

  if (loading) {
    return <LeagueDashboardSkeleton />;
  }

  if (error || !league) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Trophy className="size-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">League Not Found</h2>
              <p className="text-muted-foreground mb-4">
                {error || 'Unable to load league details'}
              </p>
              <Button asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate progress
  const today = new Date();
  const startDate = new Date(league.start_date);
  const endDate = new Date(league.end_date);
  const totalDays =
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysElapsed = Math.max(
    0,
    Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const progressPercent = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    draft: { variant: 'secondary', label: 'Draft' },
    scheduled: { variant: 'outline', label: 'Scheduled' },
    payment_pending: { variant: 'outline', label: 'Payment Pending' },
    active: { variant: 'default', label: 'Active' },
    completed: { variant: 'secondary', label: 'Completed' },
  };

  const mySummaryStats = mySummary
    ? [
      {
        title: 'Points',
        value: mySummary.totalPoints.toLocaleString(),
        changeLabel: 'Your score',
        description: `${mySummary.points.toLocaleString()} + ${mySummary.challengePoints.toLocaleString()} (workouts + challenges)`,
        icon: Zap,
      },
      {
        title: 'RR',
        value: mySummary.avgRR !== null ? mySummary.avgRR.toFixed(2) : '—',
        changeLabel: 'Your Performance',
        description: 'Run Rate (approved)',
        icon: TrendingUp,
      },
      {
        title: 'Rest Days',
        value: `${mySummary.restUsed.toLocaleString()} / ${(mySummary.restUsed + (mySummary.restUnused ?? 0)).toLocaleString()}`,
        changeLabel: 'Used / Total',
        description: `${mySummary.restUnused !== null ? mySummary.restUnused.toLocaleString() : '—'} remaining`,
        icon: Timer,
        isCombined: true,
        restUsed: mySummary.restUsed,
        restUnused: mySummary.restUnused,
      },
      {
        title: 'Days Missed',
        value: mySummary.missedDays.toLocaleString(),
        changeLabel: 'Since start',
        description: 'No submission',
        icon: Flame,
      },
    ]
    : null;

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 px-4 lg:px-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full">
          <div className="flex items-center gap-3 mb-1 w-full">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-sm font-normal text-muted-foreground">Welcome back, </span>
              {(user?.name || 'User').split(' ')[0]}!
            </h1>
            {(user as any)?.profile_picture_url && (
              <div className="ml-auto">
                <Link href="/profile">
                  <Avatar className="size-12 ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer">
                    <AvatarImage src={(user as any).profile_picture_url} alt={user?.name || 'Profile'} />
                  </Avatar>
                </Link>
              </div>
            )}
          </div>
          <p className="text-muted-foreground">Add today's effort. Push your team forward.</p>
          {isTrialPeriod && (
            <Badge className="mt-2 bg-amber-50 text-amber-700 border-amber-200">
              Trial Period
            </Badge>
          )}
          {/* {hostName && (
            <Badge className="mt-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-3 py-1.5 hover:from-blue-600 hover:to-cyan-600 transition-all shadow-sm">
              <Crown className="size-3.5 mr-1.5" />
              Hosted by {hostName}
            </Badge>
          )} */}
        </div>

        <div className="flex gap-2 flex-wrap sm:ml-auto sm:justify-end">
          {user && (
            <>
              <DownloadReportButton
                leagueId={id}
                userId={user.id}
                leagueStatus={league.status}
                variant="outline"
                size="sm"
              />
              <DownloadCertificateButton
                leagueId={id}
                userId={user.id}
                leagueStatus={league.status}
                variant="outline"
                size="sm"
              />
            </>
          )}





        </div>
      </div>

      {/* League Ended — Feedback Banner */}
      {league.status === 'completed' && (
        <div className="mx-4 lg:mx-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
          <MessageSquareHeart className="size-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">This league has ended — we&apos;d love your feedback!</p>
            <p className="text-xs text-muted-foreground mt-0.5">Help us improve future leagues by sharing your experience.</p>
          </div>
          <Button size="sm" asChild>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdooeQxEuY95nK0Ft4mnhZvT6TdxL9_Gbb6L_3T-NEmbLxQJQ/viewform?usp=publish-editor"
              target="_blank"
              rel="noopener noreferrer"
            >
              Give Feedback
              <ExternalLink className="ml-1.5 size-3.5" />
            </a>
          </Button>
        </div>
      )}

      {mySummaryLoading || !mySummaryStats ? (
        <>
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6 py-2 border-b">
            <div className="grid grid-cols-2 gap-2">
              <Button
                asChild
                size="sm"
              >
                <Link href={`/leagues/${id}/submit?type=workout`}>
                  <Dumbbell className="mr-2 size-4" />
                  Log Today's Activity
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="bg-muted/50"
              >
                <Link href={`/leagues/${id}/submit?type=rest`}>
                  <Moon className="mr-2 size-4" />
                  Mark Rest Day
                </Link>
              </Button>
            </div>
          </div>
          <div className="px-4 lg:px-6 mt-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fetchLeagueData(true)}
                    aria-label="Refresh summary"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                  {[1, 2, 3, 4, 5].map((index) => (
                    <div
                      key={index}
                      className="rounded-lg bg-muted/40 px-4 py-3 text-center"
                    >
                      <Skeleton className="h-3 w-20 mx-auto" />
                      <Skeleton className="h-5 w-12 mx-auto mt-2" />
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full mt-4" />
                  <div className="flex flex-wrap items-center gap-6 mt-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="px-4 lg:px-6 mt-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((index) => (
                    <div
                      key={index}
                      className="rounded-md bg-muted/40 px-3 py-2 text-center"
                    >
                      <Skeleton className="h-3 w-20 mx-auto" />
                      <Skeleton className="h-5 w-12 mx-auto mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6 py-2 border-b">
            <div className="grid grid-cols-2 gap-2">
              <Button
                asChild
                size="sm"
              >
                <Link href={`/leagues/${id}/submit?type=workout`}>
                  <Dumbbell className="mr-2 size-4" />
                  Log Today's Activity
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="bg-muted/50"
              >
                <Link href={`/leagues/${id}/submit?type=rest`}>
                  <Moon className="mr-2 size-4" />
                  Mark Rest Day
                </Link>
              </Button>
            </div>
          </div>
          <div className="px-4 lg:px-6 mt-2">
            <Card className="py-4 gap-2">
              <CardHeader className="pb-0">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base pt-1">My Summary</CardTitle>
                  <div className="flex items-center gap-1">
                    {/* WhatsApp Reminders */}
                    {(isHost || (activeRole === 'governor')) && league && (
                      <WhatsAppReminderButton
                        type="league"
                        leagueName={league.league_name}
                        variant="ghost"
                        size="sm"
                      />
                    )}

                    {isCaptain && league && (
                      <WhatsAppReminderButton
                        type="team"
                        leagueName={league.league_name}
                        variant="ghost"
                        size="sm"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fetchLeagueData(true)}
                      aria-label="Refresh summary"
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">Total Points</div>
                    <div className="text-base font-semibold text-foreground tabular-nums">
                      {mySummary?.points.toLocaleString() ?? '—'}
                    </div>
                  </div>
                  <div className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">Avg RR</div>
                    <div className="text-base font-semibold text-foreground tabular-nums">
                      {mySummary?.avgRR !== null && typeof mySummary?.avgRR === 'number'
                        ? mySummary.avgRR.toFixed(2)
                        : '—'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3 py-2.5 text-center">
                    <div className="text-[11px] text-muted-foreground">Rest Days Used</div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {mySummary?.restUsed.toLocaleString() ?? '—'}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-center">
                    <div className="text-[11px] text-muted-foreground">Rest Days Remaining</div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {mySummary?.restUnused !== null && typeof mySummary?.restUnused === 'number'
                        ? `${mySummary.restUnused} (of ${league.rest_days})`
                        : '—'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-2.5 text-center">
                    <div className="text-[11px] text-muted-foreground">Days Missed</div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {mySummary?.missedDays.toLocaleString() ?? '—'}
                    </div>
                  </div>
                  <div
                    className={`rounded-md border border-border/60 px-3 py-2.5 text-center ${rejectedCount > 0 ? 'bg-destructive/10 dark:bg-destructive/20' : 'bg-muted/40'
                      }`}
                  >
                    <div className="text-[11px] text-muted-foreground">Rejected Workouts</div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {rejectedCount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex flex-row items-center justify-between gap-4">
                    <span className="text-sm font-medium text-foreground">Avg RR — You vs Team</span>
                    <span className="text-xs text-muted-foreground">Scale: 1.00 → 2.00</span>
                  </div>
                  <div className="mt-2.5">
                    {(() => {
                      const youPoints = typeof mySummary?.points === 'number' ? mySummary.points : null;
                      const you = typeof mySummary?.avgRR === 'number' ? mySummary.avgRR : null;
                      const team = typeof mySummary?.teamAvgRR === 'number' ? mySummary.teamAvgRR : null;
                      const teamPoints = typeof mySummary?.teamPoints === 'number' ? mySummary.teamPoints : null;
                      const min = 1.0;
                      const max = 2.0;
                      const span = max - min;
                      const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));

                      const youPct = typeof you === 'number' ? pct(you) : null;
                      const teamPct = typeof team === 'number' ? pct(team) : null;

                      const markerStyle = (p: number): React.CSSProperties => {
                        const clamped = Math.max(0, Math.min(100, p));
                        const transform =
                          clamped <= 0
                            ? 'translate(0, -50%)'
                            : clamped >= 100
                              ? 'translate(-100%, -50%)'
                              : 'translate(-50%, -50%)';
                        return { left: `${clamped}%`, transform };
                      };

                      const youMarkerPct = typeof youPct === 'number' ? youPct : 0;
                      const teamMarkerPct = typeof teamPct === 'number' ? teamPct : 0;

                      return (
                        <div>
                          <div className="relative h-2 rounded-full bg-muted">
                            <span
                              className="absolute top-1/2"
                              style={markerStyle(youMarkerPct)}
                              aria-label="Your RR"
                            >
                              <span
                                className={
                                  typeof you === 'number'
                                    ? 'block w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background'
                                    : 'block w-2.5 h-2.5 rounded-full bg-muted-foreground/40 border-2 border-background'
                                }
                              />
                            </span>

                            <span
                              className="absolute top-1/2"
                              style={markerStyle(teamMarkerPct)}
                              aria-label="Team RR"
                            >
                              <span
                                className={
                                  typeof team === 'number'
                                    ? 'block w-2.5 h-2.5 rounded-full bg-primary border-2 border-background'
                                    : 'block w-2.5 h-2.5 rounded-full bg-muted-foreground/40 border-2 border-background'
                                }
                              />
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                              You:
                              <span className="text-foreground tabular-nums">
                                {typeof you === 'number' ? you.toFixed(2) : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                              Team:
                              <span className="text-foreground tabular-nums">
                                {typeof team === 'number' ? team.toFixed(2) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="px-4 lg:px-6 mt-2">
            <Card className="py-4 gap-2">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Team Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">Total Points</div>
                    <div className="text-base font-semibold text-foreground tabular-nums">
                      {typeof mySummary?.teamPoints === 'number'
                        ? mySummary.teamPoints.toLocaleString()
                        : '—'}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">Run Rate</div>
                    <div className="text-base font-semibold text-foreground tabular-nums">
                      {typeof mySummary?.teamAvgRR === 'number'
                        ? mySummary.teamAvgRR.toFixed(2)
                        : '—'}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">Team Rank</div>
                    <div className="text-base font-semibold text-foreground tabular-nums">
                      {typeof mySummary?.teamRank === 'number'
                        ? `#${mySummary.teamRank}`
                        : '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Date-wise Progress (This Week: Sun–Sat) */}
      <div className="px-4 lg:px-6">
        <Card>
          {(() => {
            const leagueStartLocal = league?.start_date ? parseLocalYmd(league.start_date) : null;
            const anchorDay = leagueStartLocal ? leagueStartLocal.getDay() : 0; // default Sunday if not available
            const currentWeekStart = startOfWeekAnchored(new Date(), anchorDay);
            const weekStartLocal = addDays(currentWeekStart, -weekOffset * 7);

            const leagueStartWeek = leagueStartLocal ? startOfWeekAnchored(leagueStartLocal, anchorDay) : null;
            const maxWeekOffset = leagueStartWeek
              ? Math.max(0, Math.floor((currentWeekStart.getTime() - leagueStartWeek.getTime()) / (7 * MS_PER_DAY)))
              : Infinity;

            const canGoPrev = Number.isFinite(maxWeekOffset) ? weekOffset < maxWeekOffset : true;
            const canGoNext = weekOffset > 0;

            return (
              <CardHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1 font-semibold">
                    {formatWeekRange(weekStartLocal)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekOffset((w) => (canGoPrev ? w + 1 : w))}
                    disabled={!canGoPrev}
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekOffset((w) => (canGoNext ? Math.max(0, w - 1) : w))}
                    disabled={!canGoNext}
                    aria-label="Next week"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardHeader>
            );
          })()}

          <CardContent className="p-0">
            <div className="divide-y">
              {recentDays === null ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
              ) : recentDays.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No recent activity.</div>
              ) : (
                recentDays.map((row) => (
                  <div key={row.date} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{row.label}</span>
                      {(() => {
                        const rawStatus = typeof row.status === 'string' ? row.status.trim() : '';
                        const normalized = rawStatus.toLowerCase();
                        const statusColor =
                          normalized === 'approved' || normalized === 'accepted'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : normalized === 'pending'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : normalized === 'rejected_resubmit'
                                ? 'text-orange-600 dark:text-orange-400'
                                : normalized.startsWith('rejected')
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-muted-foreground';

                        if (!rawStatus || !row.subtitle.includes('•')) {
                          return <span className="text-sm text-muted-foreground">{row.subtitle}</span>;
                        }

                        const [left] = row.subtitle.split('•');
                        const leftText = left ? left.trim() : '';

                        let statusText = rawStatus;
                        if (normalized === 'rejected_resubmit') statusText = 'Rejected (Retry)';
                        else if (normalized === 'rejected_permanent') statusText = 'Rejected (Final)';
                        else if (normalized === 'rejected') statusText = 'Rejected';

                        return (
                          <span className="text-sm text-muted-foreground">
                            {leftText}
                            <span className="text-muted-foreground"> {'•'} </span>
                            <span className={statusColor}>{statusText}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium tabular-nums min-w-[56px] text-right">{row.pointsLabel}</div>
                      {row.submission ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openSubmissionDetails(row.submission || null)}
                          aria-label="View submission details"
                        >
                          <Eye className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <SubmissionDetailDialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
        isOwner
        onReupload={(id) => {
          const submission = selectedSubmission && selectedSubmission.id === id ? selectedSubmission : null;
          if (submission) handleReupload(submission);
        }}
      />

      {/* Progress Report Card */}
      {league?.start_date && league?.end_date && league?.status !== 'completed' && (
        <div className="px-4 lg:px-6">
          <DynamicReportDialog
            leagueId={id}
            leagueStartDate={league.start_date}
            leagueEndDate={league.end_date}
            trigger={(
              <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shrink-0">
                    <ClipboardCheck className="size-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">Progress Report</h3>
                    <p className="text-sm text-muted-foreground">Download your latest report</p>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </CardContent>
              </Card>
            )}
          />
        </div>
      )}

      {/* Donate Rest Days Button */}
      <div className="px-4 lg:px-6">
        <Link href={`/leagues/${id}/rest-day-donations`} className="block">
          <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
                <Gift className="size-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold group-hover:text-primary transition-colors">Donate Rest Days</h3>
                <p className="text-sm text-muted-foreground">Help a teammate in need</p>
              </div>
              <ArrowRight className="size-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* League Information */}
      <div className="px-4 lg:px-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">League Information</h2>
          <p className="text-sm text-muted-foreground">Configuration and settings overview</p>
        </div>

        <div className="rounded-lg border">
          {/* Progress Bar (for launched/active leagues) */}
          {(league.status === 'active' || league.status === 'launched') && (
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="size-5 text-primary" />
                  <span className="font-medium">League Progress</span>
                </div>
                <Badge variant="outline" className="font-mono">
                  {progressPercent}% Complete
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <div className="flex justify-between mt-3 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{daysElapsed}</span> days elapsed
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{daysRemaining}</span> days remaining
                </span>
              </div>
            </div>
          )}

          {/* Key stats — mobile: 3 rows × 2 cols, tablet/desktop: 2 rows × 3 cols */}
          <div className="grid grid-cols-2 md:grid-cols-3 divide-x border-b">
            <div className="p-4 flex flex-col items-center text-center">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Calendar className="size-5 text-primary" />
              </div>
              <p className="text-sm font-bold text-primary tabular-nums">{formatDate(league.start_date)}</p>
              <p className="text-xs text-muted-foreground">Start Date</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center border-b md:border-b-0">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Calendar className="size-5 text-primary" />
              </div>
              <p className="text-sm font-bold text-primary tabular-nums">{formatDate(league.end_date)}</p>
              <p className="text-xs text-muted-foreground">End Date</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center border-b md:border-b-0">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Timer className="size-5 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{totalDays}</p>
              <p className="text-xs text-muted-foreground">Days Total</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center md:border-t">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Moon className="size-5 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{league.rest_days}</p>
              <p className="text-xs text-muted-foreground">Rest Days</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center border-t">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Users className="size-5 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{league.member_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center border-t">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="size-5 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{league.num_teams || 0}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
          </div>

          {/* Bottom row: Visibility, Join Type */}
          <div className="border-t p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 md:flex-col md:items-start min-w-0">
                <span className="text-sm text-muted-foreground">Visibility</span>
                <Badge variant={league.is_public ? 'default' : 'secondary'}>
                  {league.is_public ? (
                    <><Globe className="size-3 mr-1" />Public</>
                  ) : (
                    <><Lock className="size-3 mr-1" />Private</>
                  )}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 md:flex-col md:items-start min-w-0">
                <span className="text-sm text-muted-foreground">Join Type</span>
                <Badge variant="outline">
                  {league.is_exclusive ? 'Invite Only' : 'Open'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Quick Action Card Component
// ============================================================================

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`size-12 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
            <Icon className="size-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================================
// Skeleton Component
// ============================================================================

function LeagueDashboardSkeleton() {
  return <DumbbellLoading label="Loading My Activity..." />;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
