'use client';

<<<<<<< HEAD
import { useState, useMemo } from 'react';
import { Trophy, Flag, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
=======
import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { RefreshCw, Calendar, ChevronDown, Trophy, Flag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
>>>>>>> 67af46e (feature: add grand finale awards view)
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
<<<<<<< HEAD

import dynamic from 'next/dynamic';
import { useLeagueLeaderboard } from '@/hooks/use-league-leaderboard';
import { useAiInsights } from '@/hooks/use-ai-insights';

// Dynamically import heavy components
const LeagueTeamsTable = dynamic(
  () =>
    import('@/components/leaderboard/league-teams-table').then(
      (mod) => mod.LeagueTeamsTable,
    ),
  {
    loading: () => (
      <div className="h-40 animate-pulse bg-muted/20 rounded-lg" />
    ),
  },
);
const LeagueIndividualsTable = dynamic(
  () =>
    import('@/components/leaderboard/league-individuals-table').then(
      (mod) => mod.LeagueIndividualsTable,
    ),
  {
    loading: () => (
      <div className="h-40 animate-pulse bg-muted/20 rounded-lg" />
    ),
  },
);
const ChallengeSpecificLeaderboard = dynamic(
  () =>
    import('@/components/leaderboard/challenge-specific-leaderboard').then(
      (mod) => mod.ChallengeSpecificLeaderboard,
    ),
  {
    loading: () => (
      <div className="h-40 animate-pulse bg-muted/20 rounded-lg" />
    ),
  },
);
const RealTimeScoreboardTable = dynamic(
  () =>
    import('@/components/leaderboard/realtime-scoreboard-table').then(
      (mod) => mod.RealTimeScoreboardTable,
    ),
  {
    loading: () => (
      <div className="h-40 animate-pulse bg-muted/20 rounded-lg" />
    ),
  },
);

=======
import { cn } from '@/lib/utils';

import { useLeagueLeaderboard } from '@/hooks/use-league-leaderboard';
import { useAiInsights } from '@/hooks/use-ai-insights';
import {
  LeaderboardStats,
  LeagueTeamsTable,
  LeagueIndividualsTable,
  ChallengeSpecificLeaderboard,
  RealTimeScoreboardTable,
  GrandeFinaleCelebration,
} from '@/components/leaderboard';
>>>>>>> 67af46e (feature: add grand finale awards view)
import {
  HeaderSkeleton,
  TableSkeleton,
  StatsSkeleton,
} from '@/components/leaderboard/leaderboard-skeletons';
<<<<<<< HEAD
import { LeaderboardStats } from '@/components/leaderboard/leaderboard-stats';
import { calculateWeekPresets } from '@/lib/utils/leaderboard-utils';
import { LeaderboardControls } from './leaderboard-controls';
=======
import { calculateWeekPresets } from '@/lib/utils/leaderboard-utils';
>>>>>>> 67af46e (feature: add grand finale awards view)
import type { LeaderboardData } from '@/hooks/use-league-leaderboard';

interface LeaderboardClientContainerProps {
  leagueId: string;
  initialRoles: string[];
  initialData?: LeaderboardData | null;
}

export function LeaderboardClientContainer({
  leagueId,
  initialRoles,
  initialData,
}: LeaderboardClientContainerProps) {
  // AI inline insights
  const { insights: aiInsights } = useAiInsights(leagueId, 'leaderboard', [
    'leaderboard_cta',
  ]);

  const [viewRawTotals] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('teams');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all' | 'custom'>(
    'all',
  );

  // Fetch leaderboard data (initialize with server data)
  const { data, rawTeams, rawPendingWindow, isLoading, refetch, setDateRange } =
    useLeagueLeaderboard(leagueId, { initialData });

  const canToggleRaw =
    initialRoles.includes('host') || initialRoles.includes('governor');

  // Calculate week presets based on league dates
  const league = data?.league;
<<<<<<< HEAD
  const leagueStartDate = league?.start_date;
  const leagueEndDate = league?.end_date;
  const rrFormula = league?.rr_config?.formula || 'standard';
  const showRR = rrFormula === 'standard';
=======
  const rrFormula = league?.rr_config?.formula || 'standard';
  const showRR = rrFormula === 'standard';
  const leagueStartDate = league?.start_date ?? null;
  const leagueEndDate = league?.end_date ?? null;
>>>>>>> 67af46e (feature: add grand finale awards view)

  const weekPresets = useMemo(() => {
    if (!leagueStartDate || !leagueEndDate) return [];
    return calculateWeekPresets(leagueStartDate, leagueEndDate);
  }, [leagueStartDate, leagueEndDate]);

  const handleWeekSelect = (week: number | 'all' | 'custom') => {
    if (week === 'all') {
      setSelectedWeek('all');
      setStartDate(undefined);
      setEndDate(undefined);
      setDateRange(null, null);
      setFilterOpen(false);
    } else if (week === 'custom') {
      setSelectedWeek(week);
      setFilterOpen(true);
    } else {
      const preset = weekPresets.find((w) => w.weekNumber === week);
      if (preset) {
        setSelectedWeek(week);
        setStartDate(parseISO(preset.startDate));
        setEndDate(parseISO(preset.endDate));
        setDateRange(preset.startDate, preset.endDate);
        setFilterOpen(false);
      }
    }
  };

  const handleApplyDateRange = () => {
    if (startDate && endDate) {
      setSelectedWeek('custom');
      setDateRange(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
      );
      setFilterOpen(false);
    }
  };

  const handleResetDateRange = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDateRange(null, null);
    setSelectedWeek('all');
    setFilterOpen(false);
  };

  // If we are loading and have NO data (even from server), show skeleton
  // This prevents the "blank screen" flash during hydration/initial fetch
  if (isLoading && !data) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4">
        <div className="px-4 lg:px-6">
          <HeaderSkeleton />
          <div className="mt-4">
            <TableSkeleton rows={10} />
          </div>
        </div>
        <div className="px-4 lg:px-6 pb-4">
          <StatsSkeleton />
        </div>
      </div>
    );
  }

  const teams =
    viewRawTotals && canToggleRaw && rawTeams ? rawTeams : data?.teams || [];
  const allIndividuals = data?.individuals || [];
  const top20pctCount = Math.max(1, Math.ceil(allIndividuals.length * 0.2));
  const individuals = allIndividuals.slice(0, top20pctCount);
  const stats = data?.stats || {
    total_submissions: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    total_rr: 0,
  };
  const pendingWindow =
    viewRawTotals && canToggleRaw && rawPendingWindow
      ? rawPendingWindow
      : data?.pendingWindow;

  const isPostLeague = (() => {
    if (!league?.end_date) return false;
    const now = new Date();
    const leagueEnd = new Date(league.end_date);
    if (Number.isNaN(leagueEnd.getTime())) return false;
    leagueEnd.setHours(23, 59, 59, 999);
    return now > leagueEnd;
  })();

  if (isPostLeague && league?.end_date) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4 px-4 pb-4 lg:px-6">
        <GrandeFinaleCelebration
          leagueId={leagueId}
          leagueName={league.league_name || 'League Finale'}
          leagueEndDate={league.end_date}
          teams={teams}
          individuals={allIndividuals}
        />
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4">
      {/* Header + Filter Card */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border bg-card/70 shadow-sm px-3 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
<<<<<<< HEAD
            <LeaderboardControls
              selectedWeek={selectedWeek}
              startDate={startDate}
              endDate={endDate}
              filterOpen={filterOpen}
              setFilterOpen={setFilterOpen}
              weekPresets={weekPresets}
              handleWeekSelect={handleWeekSelect}
              handleApplyDateRange={handleApplyDateRange}
              handleResetDateRange={handleResetDateRange}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              refetch={refetch}
            />
=======
            <div>
              <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
              <p className="text-sm text-muted-foreground leading-none truncate max-w-[200px]">
                {league?.league_name || 'Rankings'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-normal shadow-sm hover:shadow"
                  >
                    <Calendar className="size-3.5 mr-1.5" />
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {selectedWeek === 'all'
                        ? 'All Time'
                        : selectedWeek === 'custom'
                          ? startDate && endDate
                            ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
                            : 'Custom'
                          : weekPresets.find(
                              (w) => w.weekNumber === selectedWeek,
                            )?.label || 'All Time'}
                    </span>
                    <ChevronDown className="size-3.5 ml-1.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 p-0 shadow-lg border-muted"
                  align="end"
                >
                  <div className="flex flex-col gap-1 p-2">
                    <Button
                      variant={selectedWeek === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="justify-start shadow-sm"
                      onClick={() => handleWeekSelect('all')}
                    >
                      All Time
                    </Button>

                    {weekPresets.length > 0 && (
                      <>
                        <div className="text-xs font-medium text-muted-foreground px-2 py-2 mt-1">
                          Weeks
                        </div>
                        <div className="max-h-[240px] overflow-y-auto pr-1 space-y-1">
                          {[...weekPresets].reverse().map((week) => (
                            <Button
                              key={week.weekNumber}
                              variant={
                                selectedWeek === week.weekNumber
                                  ? 'secondary'
                                  : 'ghost'
                              }
                              size="sm"
                              className="justify-start w-full shadow-sm"
                              onClick={() => handleWeekSelect(week.weekNumber)}
                            >
                              <span className="font-medium">{week.label}</span>
                              <span className="ml-auto text-xs text-muted-foreground pl-2">
                                {format(parseISO(week.startDate), 'MMM d')} –{' '}
                                {format(parseISO(week.endDate), 'MMM d')}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="text-xs font-medium text-muted-foreground px-2 py-2 mt-2">
                      Custom Range
                    </div>
                    <div className="flex flex-col gap-2.5 p-3 rounded-md border bg-muted/20 shadow-inner">
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                'flex-1 text-xs shadow-sm hover:shadow',
                                !startDate && 'text-muted-foreground',
                              )}
                            >
                              {startDate ? format(startDate, 'MMM d') : 'Start'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0 shadow-lg"
                            align="start"
                          >
                            <CalendarComponent
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              disabled={(date) =>
                                endDate ? date > endDate : false
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="text-xs text-muted-foreground">–</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                'flex-1 text-xs shadow-sm hover:shadow',
                                !endDate && 'text-muted-foreground',
                              )}
                            >
                              {endDate ? format(endDate, 'MMM d') : 'End'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0 shadow-lg"
                            align="start"
                          >
                            <CalendarComponent
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              disabled={(date) =>
                                startDate ? date < startDate : false
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs shadow-sm hover:shadow"
                          onClick={handleResetDateRange}
                        >
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs shadow-sm hover:shadow-md"
                          onClick={handleApplyDateRange}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={refetch}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
>>>>>>> 67af46e (feature: add grand finale awards view)
          </div>
          <div className="border-t mt-2 pt-3">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-3"
            >
              <TabsContent value="teams" className="mt-0">
                <div className="mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-semibold">
                      League standings
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-normal"
                        >
                          {activeTab === 'teams' ? (
                            <>
                              <Trophy className="size-3.5 mr-1.5" />
                              <span>Overall</span>
                            </>
                          ) : (
                            <>
                              <Flag className="size-3.5 mr-1.5" />
                              <span>Challenges</span>
                            </>
                          )}
                          <ChevronDown className="size-3.5 ml-1.5 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => setActiveTab('teams')}
                          className="gap-2"
                        >
                          <Trophy className="size-4" />
                          <span>Overall</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setActiveTab('challenges')}
                          className="gap-2"
                        >
                          <Flag className="size-4" />
                          <span>Challenges</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Combined activity + challenge points
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {aiInsights.leaderboard_cta ||
                    'Log today to move up the rankings.'}
                </p>
                <div className="overflow-hidden">
                  <LeagueTeamsTable teams={teams} showAvgRR={showRR} />
                </div>
              </TabsContent>

              <TabsContent value="challenges" className="mt-0">
                <ChallengeSpecificLeaderboard
                  leagueId={leagueId}
                  renderViewSwitcher={() => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-normal"
                        >
                          {activeTab === 'challenges' ? (
                            <>
                              <Flag className="size-3.5 mr-1.5" />
                              <span>Challenges</span>
                            </>
                          ) : (
                            <>
                              <Trophy className="size-3.5 mr-1.5" />
                              <span>Overall</span>
                            </>
                          )}
                          <ChevronDown className="size-3.5 ml-1.5 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => setActiveTab('teams')}
                          className="gap-2"
                        >
                          <Trophy className="size-4" />
                          <span>Overall</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setActiveTab('challenges')}
                          className="gap-2"
                        >
                          <Flag className="size-4" />
                          <span>Challenges</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                />
              </TabsContent>
            </Tabs>

            {pendingWindow?.dates?.length ? (
              <div className="border-t mt-3 pt-3">
                <div className="mb-3">
                  <h2 className="text-base sm:text-lg font-semibold">
                    Real-time Scoreboard
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Today's and yesterday's scores (subject to change)
                  </p>
                </div>
                <div className="overflow-hidden">
                  <RealTimeScoreboardTable
                    dates={pendingWindow.dates}
                    teams={pendingWindow.teams || []}
                    showAvgRR={showRR}
                  />
                </div>
              </div>
            ) : null}

            <div className="border-t mt-3 pt-3">
              <div className="mb-3">
                <h2 className="text-base sm:text-lg font-semibold">
                  Top Performers in League
                </h2>
              </div>
              <div className="overflow-hidden">
                <LeagueIndividualsTable
                  individuals={individuals}
                  showAvgRR={showRR}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 
          Rendering stats here for client-side updates. 
          The initial load is handled by page.tsx server component.
          When data changes due to filters, this will update the view.
      */}
      <div className="px-4 lg:px-6 pb-4 mt-4">
        <LeaderboardStats stats={stats} />
      </div>
    </div>
  );
}
