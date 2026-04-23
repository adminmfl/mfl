'use client';

import { useState, useEffect, useMemo, CSSProperties } from 'react';
import { RefreshCw, Dumbbell, Moon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  invalidateClientCache,
  getClientCache,
  setClientCache,
} from '@/lib/client-cache';
import { AiCoachInsight } from './ai-welcome-text';
import { WhatsAppReminderButton } from '@/components/league/whatsapp-reminder-button';
import { useRole } from '@/contexts/role-context';
import Link from 'next/link';
import { DashboardSummaryData, MySummary } from '@/lib/types/dashboard';

interface StatsGridProps {
  id: string;
  showRest?: boolean;
  isLeagueEnded?: boolean;
  initialData?: DashboardSummaryData;
}

export function StatsGrid({
  id,
  showRest: initialShowRest,
  isLeagueEnded = false,
  initialData,
}: StatsGridProps) {
  const { activeRole, isHost, isGovernor, isCaptain } = useRole();
  const [data, setData] = useState<DashboardSummaryData | null>(
    initialData || null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    const cacheKey = `league-dashboard-summary:${id}:0`;

    async function fetchData() {
      // If we already have data (from server or previous fetch), don't show a full-page loading state
      if (data) {
        setIsRefreshing(true);
      }

      try {
        const tzOffsetMinutes = new Date().getTimezoneOffset();
        const ianaTimezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const url = `/api/leagues/${id}/dashboard-summary?tzOffsetMinutes=${tzOffsetMinutes}&ianaTimezone=${encodeURIComponent(ianaTimezone)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch dashboard summary');

        const json = await res.json();
        if (mounted && json.success) {
          setData(json.data);
          setClientCache(cacheKey, json.data);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        if (mounted) setIsRefreshing(false);
      }
    }

    // Only fetch if we don't have data, or if refreshKey changed
    if (!data || refreshKey > 0) {
      fetchData();
    }

    return () => {
      mounted = false;
    };
  }, [id, refreshKey]);

  // Zero-flash immediate return if we have data
  if (!data) {
    return (
      <StatsSkeleton
        id={id}
        showRest={initialShowRest}
        isLeagueEnded={isLeagueEnded}
      />
    );
  }

  const { mySummary, league, rejectedCount } = data;
  const formula = league?.rr_config?.formula || 'standard';
  const showRR = formula === 'standard';
  const showRest = (league?.rest_days ?? 0) > 0;
  const isChallengesOnly = (league as any)?.league_mode === 'challenges_only';

  return (
    <>
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6 py-2 border-b md:backdrop-blur-lg">
        {isChallengesOnly ? (
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link
                href={`/leagues/${id}/challenges`}
                aria-label="View Challenges"
              >
                <Dumbbell className="mr-2 size-4" aria-hidden="true" />
                View Challenges
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              This league is challenges only.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {isLeagueEnded ? (
                <Button size="sm" disabled>
                  <Dumbbell className="mr-2 size-4" aria-hidden="true" />
                  Log Today's Activity
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link
                    href={`/leagues/${id}/submit?type=workout`}
                    aria-label="Log Today's Activity"
                  >
                    <Dumbbell className="mr-2 size-4" aria-hidden="true" />
                    Log Today's Activity
                  </Link>
                </Button>
              )}
              {showRest &&
                (isLeagueEnded ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-muted/50"
                    disabled
                  >
                    <Moon className="mr-2 size-4" aria-hidden="true" />
                    Mark Rest Day
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="bg-muted/50"
                  >
                    <Link
                      href={`/leagues/${id}/submit?type=rest`}
                      aria-label="Mark Rest Day"
                    >
                      <Moon className="mr-2 size-4" aria-hidden="true" />
                      Mark Rest Day
                    </Link>
                  </Button>
                ))}
            </div>
            {isLeagueEnded && (
              <p className="mt-1 text-xs text-muted-foreground">
                Submissions are closed for this league.
              </p>
            )}
          </>
        )}
        <AiCoachInsight leagueId={id} />
      </div>

      <div className="px-4 lg:px-6 mt-2">
        <Card className="pt-4 pb-2 gap-2 border-primary/20 bg-primary/5 shadow-sm min-h-[280px]">
          <CardHeader className="pb-0 pt-0">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base pt-1">My Summary</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                disabled={isRefreshing}
                onClick={() => {
                  invalidateClientCache(`league-dashboard-summary:${id}:0`);
                  setRefreshKey((prev) => prev + 1);
                }}
                aria-label="Refresh summary"
              >
                <RefreshCw
                  className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <dl className="grid grid-cols-2 gap-3">
              {isChallengesOnly ? (
                <>
                  <StatCell
                    label="Challenge Points"
                    value={mySummary.challengePoints.toLocaleString()}
                    highlight
                  />
                  <StatCell
                    label="Team Rank"
                    value={mySummary.teamRank ? `#${mySummary.teamRank}` : '—'}
                    highlight
                  />
                </>
              ) : (
                <>
                  <StatCell
                    label="Total Points"
                    value={mySummary.points.toLocaleString()}
                    highlight
                  />
                  {showRR && (
                    <StatCell
                      label="Avg RR"
                      value={mySummary.avgRR?.toFixed(2) ?? '—'}
                      highlight
                    />
                  )}
                  {showRest && (
                    <>
                      <StatCell
                        label="Rest Used"
                        value={mySummary.restUsed.toLocaleString()}
                        highlight
                      />
                      <StatCell
                        label="Remaining"
                        value={`${mySummary.restUnused ?? '—'} / ${league.rest_days}`}
                      />
                      <StatCell
                        label="Missed Days"
                        value={mySummary.missedDays.toLocaleString()}
                      />
                    </>
                  )}
                  <div
                    className={`rounded-md border border-border/60 px-3 py-2.5 text-center ${rejectedCount > 0 ? 'bg-destructive/10' : 'bg-muted/40'}`}
                    role="group"
                    aria-label={`Rejected submissions: ${rejectedCount}`}
                  >
                    <div
                      className="text-[11px] text-muted-foreground uppercase tracking-tight font-medium"
                      aria-hidden="true"
                    >
                      Rejected
                    </div>
                    <div
                      className="text-sm font-semibold tabular-nums"
                      aria-hidden="true"
                    >
                      {rejectedCount.toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </dl>

            {showRR && !isChallengesOnly && (
              <RrComparisonChart mySummary={mySummary} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6 mt-2">
        <Card className="pt-4 pb-2 gap-2 shadow-sm min-h-[160px]">
          <CardHeader className="pb-0 pt-0">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Team Summary</CardTitle>
              <div className="flex gap-1">
                {(isHost || isGovernor) && (
                  <WhatsAppReminderButton
                    type="league"
                    leagueName={league.league_name}
                    variant="ghost"
                    size="icon"
                  />
                )}
                {isCaptain && (
                  <WhatsAppReminderButton
                    type="team"
                    leagueName={league.league_name}
                    variant="ghost"
                    size="icon"
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <dl
              className={`grid ${showRR ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}
            >
              <StatCell
                label="Total Points"
                value={mySummary.teamPoints?.toLocaleString() ?? '—'}
                highlight
              />
              {showRR && (
                <StatCell
                  label="Run Rate"
                  value={mySummary.teamAvgRR?.toFixed(2) ?? '—'}
                />
              )}
              <StatCell
                label="Team Rank"
                value={mySummary.teamRank ? `#${mySummary.teamRank}` : '—'}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border ${highlight ? 'border-primary/20 bg-primary/10 dark:bg-primary/20' : 'border-border/60 bg-muted/40'} px-3 py-2.5 text-center transition-colors duration-200`}
    >
      <dt className="text-[11px] text-muted-foreground uppercase tracking-tight font-medium">
        {label}
      </dt>
      <dd
        className={`${highlight ? 'text-base' : 'text-sm'} font-semibold text-foreground tabular-nums`}
      >
        {value}
      </dd>
    </div>
  );
}

function RrComparisonChart({ mySummary }: { mySummary: MySummary }) {
  const you = mySummary.avgRR;
  const team = mySummary.teamAvgRR;
  if (you === null && team === null) return null;

  const min = 1.0,
    max = 2.0;
  const pct = (v: number) =>
    Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));

  const markerStyle = (p: number): CSSProperties => ({
    left: `${p}%`,
    transform:
      p <= 0
        ? 'translateY(-50%)'
        : p >= 100
          ? 'translate(-100%, -50%)'
          : 'translate(-50%, -50%)',
  });

  return (
    <div
      className="rounded-lg border border-border/60 bg-muted/30 p-3"
      role="img"
      aria-label={`Run Rate comparison chart: Your average is ${you?.toFixed(2) ?? 'not computed'} and the team average is ${team?.toFixed(2) ?? 'not computed'}. Scale ranges from 1.0 to 2.0.`}
    >
      <div className="flex flex-row items-center justify-between gap-4">
        <span className="text-sm font-medium" aria-hidden="true">
          Avg RR — You vs Team
        </span>
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          Scale: 1.00 → 2.00
        </span>
      </div>
      <div className="mt-2.5">
        <div className="relative h-2 rounded-full bg-muted" aria-hidden="true">
          {you !== null && (
            <span
              className="absolute top-1/2 transition-all duration-700 ease-out"
              style={markerStyle(pct(you))}
            >
              <span className="block w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background shadow-sm" />
            </span>
          )}
          {team !== null && (
            <span
              className="absolute top-1/2 transition-all duration-700 ease-out"
              style={markerStyle(pct(team))}
            >
              <span className="block w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow-sm" />
            </span>
          )}
        </div>
        <div
          className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2.5"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
            You:{' '}
            <span className="text-foreground tabular-nums font-medium">
              {you?.toFixed(2) ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Team:{' '}
            <span className="text-foreground tabular-nums font-medium">
              {team?.toFixed(2) ?? '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton({
  id,
  showRest,
  isLeagueEnded = false,
}: {
  id: string;
  showRest?: boolean;
  isLeagueEnded?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md px-4 lg:px-6 py-2 border-b">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9 w-full rounded-md" />
          {showRest && <Skeleton className="h-9 w-full rounded-md" />}
        </div>
        {isLeagueEnded && (
          <p className="mt-1 text-xs text-muted-foreground">
            Submissions are closed for this league.
          </p>
        )}
        <div className="mt-1.5 h-5 flex items-center">
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      <div className="px-4 lg:px-6 mt-2 space-y-4">
        <Card className="border-primary/20 bg-primary/5 shadow-sm min-h-[280px]">
          <CardHeader className="pb-0 pt-4">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="h-[210px] p-6">
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="min-h-[160px]">
          <CardHeader className="pb-0 pt-4">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="h-[120px] p-6">
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
