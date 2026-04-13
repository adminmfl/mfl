import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { getLeagueById } from "@/lib/services/leagues";
import { calculateLeaderboard } from "@/lib/services/leaderboard-logic";


<<<<<<< HEAD
// Modular Components
=======
import { useLeague } from '@/contexts/league-context';
import { isLeagueEnded as isLeagueEndedByDate } from '@/lib/utils';
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
>>>>>>> c0b61a2 (fix: add league ended status badge and disable submissions)

import { DashboardHeader } from "@/components/league/dashboard/dashboard-header";
import { HeaderActions } from "@/components/league/dashboard/header-actions";
import { ActivityTimeline } from "@/components/league/dashboard/activity-timeline";
import { LeagueInfoSection } from "@/components/league/dashboard/league-info-section";
import { ActionCards } from "@/components/league/dashboard/action-cards";
import { SummarySection } from "@/components/league/dashboard/summary-section";
import { MessageSquareHeart, ExternalLink, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    StatsSectionSkeleton, 
    TimelineSkeleton 
} from "@/components/league/dashboard/dashboard-skeletons";

export default async function LeagueDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Parallel Fetch: session, league, dashboard summary, and leaderboard pre-warm
  const sessionPromise = getServerSession(authOptions as any) as Promise<import('next-auth').Session | null>;
  const leaguePromise = getLeagueById(id);
  const leaderboardPromise = calculateLeaderboard(id); // Direct service call for pre-fetch

  const [session, league] = await Promise.all([
    sessionPromise,
    leaguePromise,
    leaderboardPromise,
  ]);


<<<<<<< HEAD
  const user = session?.user;
=======
  const isLeagueEnded = React.useMemo(() => {
    if (!league) return false;
    return league.status === 'completed' || isLeagueEndedByDate(league.end_date);
  }, [league]);

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
>>>>>>> c0b61a2 (fix: add league ended status badge and disable submissions)

  if (!league) {

    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <Trophy className="size-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">League Not Found</h2>
              <p className="text-muted-foreground mb-4">
                Unable to load league details. It might have been deleted or the
                ID is incorrect.
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

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
<<<<<<< HEAD
      <div className="flex flex-col gap-4">
        {/* Header Actions (Top row on mobile, Right side on desktop) */}
        {user && (
          <HeaderActions
            leagueId={id}
            userId={user.id}
            leagueStatus={league.status}
            leagueName={league.league_name}
            inviteCode={league.invite_code}
            memberCount={league.member_count}
            maxCapacity={league.league_capacity}
          />
        )}
=======
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
          {isLeagueEnded && (
            <Badge className="mt-2 bg-slate-100 text-slate-900 border-slate-200">
              League Ended
            </Badge>
          )}
          {/* {hostName && (
            <Badge className="mt-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-3 py-1.5 hover:from-blue-600 hover:to-cyan-600 transition-all shadow-sm">
              <Crown className="size-3.5 mr-1.5" />
              Hosted by {hostName}
            </Badge>
          )} */}
        </div>
>>>>>>> c0b61a2 (fix: add league ended status badge and disable submissions)

        {/* Main Header RSC */}
        <DashboardHeader
          user={{
            name: user?.name,
            profile_picture_url: (user as any)?.profile_picture_url,
          }}
          leagueId={id}
          startDate={league.start_date}
        />
      </div>

<<<<<<< HEAD
      {/* League Ended Banner */}
      {league.status === "completed" && (
        <div className="mx-4 lg:mx-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3" role="status">
          <MessageSquareHeart className="size-5 text-primary shrink-0" aria-hidden="true" />
=======
      {/* League Ended — Feedback Banner */}
      {isLeagueEnded && (
        <div className="mx-4 lg:mx-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
          <MessageSquareHeart className="size-5 text-primary shrink-0" />
>>>>>>> c0b61a2 (fix: add league ended status badge and disable submissions)
          <div className="flex-1">
            <p className="text-sm font-medium">
              This league has ended — we&apos;d love your feedback!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Help us improve future leagues by sharing your experience.
            </p>
          </div>
          <Button size="sm" asChild>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdooeQxEuY95nK0Ft4mnhZvT6TdxL9_Gbb6L_3T-NEmbLxQJQ/viewform?usp=publish-editor"
              target="_blank"
              rel="noopener noreferrer"
            >
              Give Feedback
              <ExternalLink className="ml-1.5 size-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      )}

<<<<<<< HEAD
      {/* Summary Section (Progressive streaming) */}
      {user && (
        <Suspense fallback={<StatsSectionSkeleton showRest={(league.rest_days ?? 0) > 0} />}>
          <SummarySection 
            id={id} 
            userId={user.id} 
            showRest={(league.rest_days ?? 0) > 0} 
=======
      {mySummaryLoading || !mySummaryStats ? (
        <>
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6 py-2 border-b">
            <div className="grid grid-cols-2 gap-2">
              {isLeagueEnded ? (
                <>
                  <Button size="sm" disabled>
                    <Dumbbell className="mr-2 size-4" />
                    Log Today's Activity
                  </Button>
                  {league.rest_days > 0 && (
                    <Button size="sm" variant="outline" className="bg-muted/50" disabled>
                      <Moon className="mr-2 size-4" />
                      Mark Rest Day
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button asChild size="sm">
                    <Link href={`/leagues/${id}/submit?type=workout`}>
                      <Dumbbell className="mr-2 size-4" />
                      Log Today's Activity
                    </Link>
                  </Button>
                  {league.rest_days > 0 && (
                  <Button asChild size="sm" variant="outline" className="bg-muted/50">
                    <Link href={`/leagues/${id}/submit?type=rest`}>
                      <Moon className="mr-2 size-4" />
                      Mark Rest Day
                    </Link>
                  </Button>
                  )}
                </>
              )}
            </div>
            {isLeagueEnded && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                This league ended on {league.end_date ? formatDate(league.end_date) : 'the end date'}. Submissions are closed, but standings and stats remain visible.
              </div>
            )}
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
              {isLeagueEnded ? (
                <>
                  <Button size="sm" disabled>
                    <Dumbbell className="mr-2 size-4" />
                    Log Today's Activity
                  </Button>
                  {league.rest_days > 0 && (
                    <Button size="sm" variant="outline" className="bg-muted/50" disabled>
                      <Moon className="mr-2 size-4" />
                      Mark Rest Day
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button asChild size="sm">
                    <Link href={`/leagues/${id}/submit?type=workout`}>
                      <Dumbbell className="mr-2 size-4" />
                      Log Today's Activity
                    </Link>
                  </Button>
                  {league.rest_days > 0 && (
                  <Button asChild size="sm" variant="outline" className="bg-muted/50">
                    <Link href={`/leagues/${id}/submit?type=rest`}>
                      <Moon className="mr-2 size-4" />
                      Mark Rest Day
                    </Link>
                  </Button>
                  )}
                </>
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
                      onClick={() => fetchLeagueData(true)}
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
              {recentDays === null ? (
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
>>>>>>> c0b61a2 (fix: add league ended status badge and disable submissions)
          />
        </Suspense>
      )}

      {/* Recent Activity Timeline with Suspense */}
      <Suspense fallback={<TimelineSkeleton />}>
        <ActivityTimeline id={id} leagueStartDate={league.start_date} />
      </Suspense>

<<<<<<< HEAD
      {/* Action Cards (Report, Donate) */}
      <ActionCards id={id} league={league} />
=======
      {/* League Information */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">League Information</h2>
            <p className="text-sm text-muted-foreground">Configuration and settings overview</p>
          </div>
          {/* Progress Bar (for launched/active leagues) */}
          {!isLeagueEnded && (league.status === 'active' || league.status === 'launched') && (
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
>>>>>>> c0b61a2 (fix: add league ended status badge and disable submissions)

      {/* League Information RSC */}
      <LeagueInfoSection league={league} />
    </div>
  );
}

// Skeletons have been moved to shared /components/league/dashboard/dashboard-skeletons.tsx
