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
  Sparkles,
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
import { useAiInsights } from '@/hooks/use-ai-insights';
import { preload } from 'react-dom';

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
  entryCount?: number; // Number of entries for this day (for daily multi-frequency)
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
  const { isHost, isGovernor, isCaptain, activeRole } = useRole();
  const router = useRouter();

  // Preload logo for performance
  const logoUrl = activeLeague?.logo_url;
  if (logoUrl) {
    preload(logoUrl, { as: 'image' });
  }

  const [dashboardData, setDashboardData] = React.useState<{
    league: LeagueDetails;
    stats: LeagueStats | null;
    mySummary: {
      points: number;
      totalPoints: number;
      challengePoints: number;
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
    };
    recentDays: RecentDayRow[];
    rejectedCount: number;
    isMonthlyFrequency: boolean;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const league = dashboardData?.league;
  const stats = dashboardData?.stats;
  const rejectedCount = dashboardData?.rejectedCount || 0;
  const recentDays = dashboardData?.recentDays;
  const mySummary = dashboardData?.mySummary;
  const isMonthlyFrequency = dashboardData?.isMonthlyFrequency || false;

  const [weekOffset, setWeekOffset] = React.useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [selectedSubmission, setSelectedSubmission] = React.useState<MySubmission | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const isTrialPeriod = React.useMemo(() => {
    if (!league?.start_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(String(league.start_date).slice(0, 10));
    start.setHours(0, 0, 0, 0);
    return today < start;
  }, [league?.start_date]);


  const { user } = useAuth();

  // AI inline insights
  const { insights: aiInsights } = useAiInsights(id, 'my_activity', [
    'welcome_text',
    'coach_insight',
    'stat_label_rr',
    'stat_label_missed',
  ]);

  // Sync active league
  React.useEffect(() => {
    if (userLeagues.length > 0 && (!activeLeague || activeLeague.league_id !== id)) {
      const matchingLeague = userLeagues.find((l) => l.league_id === id);
      if (matchingLeague) setActiveLeague(matchingLeague);
    }
    saveLastLeagueId(id);
  }, [id, userLeagues, activeLeague, setActiveLeague]);

  // Consolidate Data Fetching
  React.useEffect(() => {
    let mounted = true;
    const cacheKey = `league-dashboard-summary:${id}:${weekOffset}`;

    async function fetchData() {
      // Try cache first
      const cached = getClientCache<any>(cacheKey);
      if (cached && mounted) {
        setDashboardData(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      setError(null);
      try {
        const tzOffsetMinutes = new Date().getTimezoneOffset();
        const ianaTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        
        let url = `/api/leagues/${id}/dashboard-summary?tzOffsetMinutes=${tzOffsetMinutes}&ianaTimezone=${encodeURIComponent(ianaTimezone)}`;
        
        // Handle week navigation range if needed
        if (weekOffset !== 0) {
          const today = new Date();
          const leagueStartLocal = parseLocalYmd(league?.start_date || "");
          const anchorDay = leagueStartLocal ? leagueStartLocal.getDay() : 0;
          const currentWeekStart = startOfWeekAnchored(today, anchorDay);
          const rangeStart = addDays(currentWeekStart, -weekOffset * 7);
          const rangeEnd = addDays(rangeStart, 6);
          
          url += `&startDate=${localYmd(rangeStart)}&endDate=${localYmd(rangeEnd)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch dashboard summary");
        
        const json = await res.json();
        if (mounted && json.success) {
          setDashboardData(json.data);
          setClientCache(cacheKey, json.data);
        }
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        if (mounted) setError(err.message || "Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, [id, weekOffset, league?.start_date, refreshKey]);










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
        title: (league as any)?.rr_config?.formula === 'standard' || !(league as any)?.rr_config?.formula ? 'RR' : 'Score',
        value: mySummary.avgRR !== null ? mySummary.avgRR.toFixed(2) : '—',
        changeLabel: 'Your Performance',
        description: (league as any)?.rr_config?.formula === 'standard' || !(league as any)?.rr_config?.formula ? 'Run Rate (approved)' : 'Average score',
        icon: TrendingUp,
      },
      ...(league.rest_days > 0 ? [{
        title: 'Rest Days',
        value: `${mySummary.restUsed.toLocaleString()} / ${(mySummary.restUsed + (mySummary.restUnused ?? 0)).toLocaleString()}`,
        changeLabel: 'Used / Total',
        description: `${mySummary.restUnused !== null ? mySummary.restUnused.toLocaleString() : '—'} remaining`,
        icon: Timer,
        isCombined: true,
        restUsed: mySummary.restUsed,
        restUnused: mySummary.restUnused,
      }] : []),
      ...(league.rest_days > 0 ? [{
        title: 'Days Missed',
        value: mySummary.missedDays.toLocaleString(),
        changeLabel: 'Since start',
        description: 'No submission',
        icon: Flame,
      }] : []),
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
          <p className="text-muted-foreground">
            {aiInsights.welcome_text || "Add today's effort. Push your team forward."}
          </p>
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

      {loading || !mySummary ? (
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
              {league.rest_days > 0 && (
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
              )}
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
                    onClick={() => {
                      invalidateClientCache(`league-dashboard-summary:${id}:${weekOffset}`);
                      setRefreshKey(prev => prev + 1);
                    }}
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
              {league.rest_days > 0 && (
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
              )}
            </div>
            {aiInsights.coach_insight && (
              <p className="text-xs text-muted-foreground mt-1.5 px-1 flex items-center gap-1">
                <Sparkles className="size-3 text-primary/60 shrink-0" />
                {aiInsights.coach_insight}
              </p>
            )}
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
                      onClick={() => {
                        invalidateClientCache(`league-dashboard-summary:${id}:${weekOffset}`);
                        setRefreshKey(prev => prev + 1);
                      }}
                      aria-label="Refresh summary"
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const formula = (league as any)?.rr_config?.formula || 'standard';
                  const showRR = formula === 'standard';
                  const showRest = league.rest_days > 0;

                  // Build flat list of stat cells
                  const cells: React.ReactNode[] = [];

                  cells.push(
                    <div key="pts" className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3 py-2.5 text-center">
                      <div className="text-xs text-muted-foreground">Total Points</div>
                      <div className="text-base font-semibold text-foreground tabular-nums">
                        {mySummary?.points.toLocaleString() ?? '—'}
                      </div>
                    </div>
                  );

                  if (showRR) {
                    cells.push(
                      <div key="rr" className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3 py-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Avg RR</div>
                        <div className="text-base font-semibold text-foreground tabular-nums">
                          {mySummary?.avgRR !== null && typeof mySummary?.avgRR === 'number'
                            ? mySummary.avgRR.toFixed(2)
                            : '—'}
                        </div>
                        {aiInsights.stat_label_rr && (
                          <div className="text-[10px] text-amber-600 mt-0.5">{aiInsights.stat_label_rr}</div>
                        )}
                      </div>
                    );
                  }

                  if (showRest) {
                    cells.push(
                      <div key="rest-used" className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3 py-2.5 text-center">
                        <div className="text-[11px] text-muted-foreground">Rest Days Used</div>
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {mySummary?.restUsed.toLocaleString() ?? '—'}
                        </div>
                      </div>
                    );
                    cells.push(
                      <div key="rest-rem" className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-center">
                        <div className="text-[11px] text-muted-foreground">Rest Days Remaining</div>
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {mySummary?.restUnused !== null && typeof mySummary?.restUnused === 'number'
                            ? `${mySummary.restUnused} (of ${league.rest_days})`
                            : '—'}
                        </div>
                      </div>
                    );
                    cells.push(
                      <div key="missed" className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-2.5 text-center">
                        <div className="text-[11px] text-muted-foreground">Days Missed</div>
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {mySummary?.missedDays.toLocaleString() ?? '—'}
                        </div>
                        {aiInsights.stat_label_missed && (
                          <div className="text-[10px] text-red-500 mt-0.5">{aiInsights.stat_label_missed}</div>
                        )}
                      </div>
                    );
                  }

                  cells.push(
                    <div
                      key="rejected"
                      className={`rounded-md border border-border/60 px-3 py-2.5 text-center ${rejectedCount > 0 ? 'bg-destructive/10 dark:bg-destructive/20' : 'bg-muted/40'}`}
                    >
                      <div className="text-[11px] text-muted-foreground">Rejected Workouts</div>
                      <div className="text-sm font-semibold text-foreground tabular-nums">
                        {rejectedCount.toLocaleString()}
                      </div>
                    </div>
                  );

                  return <div className="grid grid-cols-2 gap-3">{cells}</div>;
                })()}

                {((league as any)?.rr_config?.formula || 'standard') === 'standard' && (
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

                      // If neither value is available, show an empty state instead of a broken chart
                      if (you === null && team === null) {
                        return (
                          <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                            <span className="text-sm">No run-rate data available yet.</span>
                            <span className="text-xs mt-1">Submit workouts to see your Avg RR compared to the team.</span>
                          </div>
                        );
                      }

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

                      return (
                        <div>
                          <div className="relative h-2 rounded-full bg-muted">
                            {typeof youPct === 'number' && (
                              <span
                                className="absolute top-1/2"
                                style={markerStyle(youPct)}
                                aria-label="Your RR"
                              >
                                <span className="block w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background" />
                              </span>
                            )}

                            {typeof teamPct === 'number' && (
                              <span
                                className="absolute top-1/2"
                                style={markerStyle(teamPct)}
                                aria-label="Team RR"
                              >
                                <span className="block w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                              </span>
                            )}
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
                )}
              </CardContent>
            </Card>
          </div>
          <div className="px-4 lg:px-6 mt-2">
            <Card className="py-4 gap-2">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Team Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const showTeamRR = ((league as any)?.rr_config?.formula || 'standard') === 'standard';
                  return (
                    <div className={`grid ${showTeamRR ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                      <div className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3 py-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Total Points</div>
                        <div className="text-base font-semibold text-foreground tabular-nums">
                          {typeof mySummary?.teamPoints === 'number'
                            ? mySummary.teamPoints.toLocaleString()
                            : '—'}
                        </div>
                      </div>
                      {showTeamRR && (
                      <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Run Rate</div>
                        <div className="text-base font-semibold text-foreground tabular-nums">
                          {typeof mySummary?.teamAvgRR === 'number'
                            ? mySummary.teamAvgRR.toFixed(2)
                            : '—'}
                        </div>
                      </div>
                      )}
                      <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Team Rank</div>
                        <div className="text-base font-semibold text-foreground tabular-nums">
                          {typeof mySummary?.teamRank === 'number'
                            ? `#${mySummary.teamRank}`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Date-wise Progress */}
      <div className="px-4 lg:px-6">
        <Card>
          {(() => {
            const leagueStartLocal = league?.start_date ? parseLocalYmd(league.start_date) : null;
            const anchorDay = leagueStartLocal ? leagueStartLocal.getDay() : 0;
            const currentWeekStart = startOfWeekAnchored(new Date(), anchorDay);
            const weekStartLocal = addDays(currentWeekStart, -weekOffset * 7);

            let headerLabel: string;
            let canGoPrev: boolean;
            let canGoNext: boolean;

            if (isMonthlyFrequency) {
              const monthDate = new Date(weekStartLocal.getFullYear(), weekStartLocal.getMonth(), 1);
              headerLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
              const leagueStartMonth = leagueStartLocal
                ? new Date(leagueStartLocal.getFullYear(), leagueStartLocal.getMonth(), 1)
                : null;
              const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
              canGoNext = weekOffset > 0;
              canGoPrev = leagueStartMonth
                ? monthDate.getTime() > leagueStartMonth.getTime()
                : true;
            } else {
              headerLabel = formatWeekRange(weekStartLocal);
              const leagueStartWeek = leagueStartLocal ? startOfWeekAnchored(leagueStartLocal, anchorDay) : null;
              const maxWeekOffset = leagueStartWeek
                ? Math.max(0, Math.floor((currentWeekStart.getTime() - leagueStartWeek.getTime()) / (7 * MS_PER_DAY)))
                : Infinity;
              canGoPrev = Number.isFinite(maxWeekOffset) ? weekOffset < maxWeekOffset : true;
              canGoNext = weekOffset > 0;
            }

            const stepSize = isMonthlyFrequency ? 4 : 1; // ~4 weeks per month

            return (
              <CardHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1 font-semibold">
                    {headerLabel}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekOffset((w) => (canGoPrev ? w + stepSize : w))}
                    disabled={!canGoPrev}
                    aria-label={isMonthlyFrequency ? "Previous month" : "Previous week"}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekOffset((w) => (canGoNext ? Math.max(0, w - stepSize) : w))}
                    disabled={!canGoNext}
                    aria-label={isMonthlyFrequency ? "Next month" : "Next week"}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardHeader>
            );
          })()}

          <CardContent className="p-0">
            <div className="divide-y">
              {!recentDays ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
              ) : recentDays.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">{isMonthlyFrequency ? 'No submissions this month.' : 'No recent activity.'}</div>
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
                      {(row.entryCount || 0) > 1 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {row.entryCount}x
                        </Badge>
                      )}
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
                    <h3 className="font-semibold group-hover:text-primary transition-colors">My League Summary</h3>
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
      {league.rest_days > 0 && (
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
      )}

      {/* League Information */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">League Information</h2>
            <p className="text-sm text-muted-foreground">Configuration and settings overview</p>
          </div>
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

          {/* Key stats row 1: Start Date, End Date, Days Total */}
          <div className="grid grid-cols-3 divide-x border-b">
            <div className="p-4 flex flex-col items-center text-center">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Calendar className="size-5 text-primary" />
              </div>
              <p className="text-sm font-bold text-primary tabular-nums whitespace-nowrap">{formatDate(league.start_date)}</p>
              <p className="text-xs text-muted-foreground">Start Date</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Calendar className="size-5 text-primary" />
              </div>
              <p className="text-sm font-bold text-primary tabular-nums whitespace-nowrap">{formatDate(league.end_date)}</p>
              <p className="text-xs text-muted-foreground">End Date</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Timer className="size-5 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{totalDays}</p>
              <p className="text-xs text-muted-foreground">Days Total</p>
            </div>
          </div>
          {/* Key stats row 2: Rest Days (if >0), Players, Teams — centered */}
          <div className={`grid ${league.rest_days > 0 ? 'grid-cols-3' : 'grid-cols-2'} divide-x border-b`}>
            {league.rest_days > 0 && (
            <div className="p-4 flex flex-col items-center text-center">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Moon className="size-5 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{league.rest_days}</p>
              <p className="text-xs text-muted-foreground">Rest Days</p>
            </div>
            )}
            <div className="p-4 flex flex-col items-center text-center">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Users className="size-5 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{league.member_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center">
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
