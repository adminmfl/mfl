/**
 * League Leaderboard Page - Redesigned
 * Clean, compact layout with tabbed leaderboards and collapsible filters.
 */
'use client';

import React, { use, useState, useMemo } from 'react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import {
  RefreshCw,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trophy,
  Users,
  User,
  Flag,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import { useLeagueLeaderboard } from '@/hooks/use-league-leaderboard';
import { useAiInsights } from '@/hooks/use-ai-insights';
import {
  LeaderboardStats,
  LeagueTeamsTable,
  LeagueIndividualsTable,
  ChallengeSpecificLeaderboard,
  RealTimeScoreboardTable,
} from '@/components/leaderboard';

// ============================================================================
// Week Calculation Helper
// ============================================================================

interface WeekPreset {
  label: string;
  startDate: string;
  endDate: string;
  weekNumber: number;
}

function calculateWeekPresets(leagueStartDate: string, leagueEndDate: string): WeekPreset[] {
  const start = parseISO(leagueStartDate);
  const end = parseISO(leagueEndDate);
  const today = new Date();
  const weeks: WeekPreset[] = [];

  let weekStart = start;
  let weekNumber = 1;

  while (weekStart <= end && weekStart <= today) {
    const weekEnd = addDays(weekStart, 6);
    const actualEnd = weekEnd > end ? end : weekEnd;

    weeks.push({
      label: `Week ${weekNumber}`,
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(actualEnd, 'yyyy-MM-dd'),
      weekNumber,
    });

    weekStart = addDays(weekStart, 7);
    weekNumber++;
  }

  return weeks;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return <DumbbellLoading label="Loading leaderboard..." />;
}

// ============================================================================
// Leaderboard Page
// ============================================================================

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);

  // AI inline insights
  const { insights: aiInsights } = useAiInsights(leagueId, 'leaderboard', [
    'leaderboard_cta',
  ]);

  const [viewRawTotals, setViewRawTotals] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('teams');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all' | 'custom'>('all');

  // Fetch leaderboard data
  const {
    data,
    rawTeams,
    rawPendingWindow,
    isLoading,
    error,
    refetch,
    setDateRange,
  } = useLeagueLeaderboard(leagueId);

  // Fetch user roles
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/roles`);
        if (res.ok) {
          const json = await res.json();
          const r = json?.roles;
          const arr = Array.isArray(r) ? r : [r];
          const roleNames = arr.map((x: any) => typeof x === 'string' ? x : (x?.role_name || x));
          setRoles(roleNames.filter(Boolean));
        }
      } catch { }
    };
    if (leagueId) fetchRoles();
  }, [leagueId]);

  const canToggleRaw = roles.includes('host') || roles.includes('governor');

  // Calculate week presets based on league dates
  const league = data?.league;
  const weekPresets = useMemo(() => {
    if (!league?.start_date || !league?.end_date) return [];
    return calculateWeekPresets(league.start_date, league.end_date);
  }, [league?.start_date, league?.end_date]);

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
      const preset = weekPresets.find(w => w.weekNumber === week);
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
        format(endDate, 'yyyy-MM-dd')
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

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error Loading Leaderboard</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="size-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const normalizationActive = Boolean(data?.normalization?.active);
  const teams = (viewRawTotals && canToggleRaw && rawTeams) ? rawTeams : (data?.teams || []);
  const allIndividuals = data?.individuals || [];
  // Show only top 20% of players in the individual leaderboard
  const top20pctCount = Math.max(1, Math.ceil(allIndividuals.length * 0.2));
  const individuals = allIndividuals.slice(0, top20pctCount);
  const stats = data?.stats || { total_submissions: 0, approved: 0, pending: 0, rejected: 0, total_rr: 0 };
  const dateRange = data?.dateRange;
  const pendingWindow = (viewRawTotals && canToggleRaw && rawPendingWindow) ? rawPendingWindow : data?.pendingWindow;

  const displayDateRange = dateRange
    ? `${format(parseISO(dateRange.startDate), 'MMM d')} – ${format(parseISO(dateRange.endDate), 'MMM d')}`
    : league?.start_date
      ? `${format(parseISO(league.start_date), 'MMM d')} – ${format(parseISO(league.end_date), 'MMM d')}`
      : 'All time';

  return (
    <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4">
      {/* Header + Filter Card */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border bg-card/70 shadow-sm px-3 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground mr-auto leading-none">
                  {league?.league_name || 'Rankings'}
                </p>
                {normalizationActive && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 pointer-events-none">Normalized</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {normalizationActive && canToggleRaw && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setViewRawTotals(v => !v)}>
                  {viewRawTotals ? 'Normalized' : 'Raw'}
                </Button>
              )}
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-normal shadow-sm hover:shadow">
                    <Calendar className="size-3.5 mr-1.5" />
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {selectedWeek === 'all'
                        ? 'All Time'
                        : selectedWeek === 'custom'
                          ? (startDate && endDate
                            ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
                            : 'Custom')
                          : weekPresets.find(w => w.weekNumber === selectedWeek)?.label || 'All Time'}
                    </span>
                    <ChevronDown className="size-3.5 ml-1.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 shadow-lg border-muted" align="end">
                  <div className="flex flex-col gap-1 p-2">
                    {/* All Time Option */}
                    <Button
                      variant={selectedWeek === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="justify-start shadow-sm"
                      onClick={() => handleWeekSelect('all')}
                    >
                      All Time
                    </Button>

                    {/* Week Presets */}
                    {weekPresets.length > 0 && (
                      <>
                        <div className="text-xs font-medium text-muted-foreground px-2 py-2 mt-1">
                          Weeks
                        </div>
                        <div className="max-h-[240px] overflow-y-auto pr-1 space-y-1">
                          {[...weekPresets].reverse().map((week) => (
                            <Button
                              key={week.weekNumber}
                              variant={selectedWeek === week.weekNumber ? 'secondary' : 'ghost'}
                              size="sm"
                              className="justify-start w-full shadow-sm"
                              onClick={() => handleWeekSelect(week.weekNumber)}
                            >
                              <span className="font-medium">{week.label}</span>
                              <span className="ml-auto text-xs text-muted-foreground pl-2">
                                {format(parseISO(week.startDate), 'MMM d')} – {format(parseISO(week.endDate), 'MMM d')}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Custom Date Range */}
                    <div className="text-xs font-medium text-muted-foreground px-2 py-2 mt-2">
                      Custom Range
                    </div>
                    <div className="flex flex-col gap-2.5 p-3 rounded-md border bg-muted/20 shadow-inner">
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn('flex-1 text-xs shadow-sm hover:shadow', !startDate && 'text-muted-foreground')}>
                              {startDate ? format(startDate, 'MMM d') : 'Start'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 shadow-lg" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              disabled={(date) => endDate ? date > endDate : false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="text-xs text-muted-foreground">–</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn('flex-1 text-xs shadow-sm hover:shadow', !endDate && 'text-muted-foreground')}>
                              {endDate ? format(endDate, 'MMM d') : 'End'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 shadow-lg" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              disabled={(date) => startDate ? date < startDate : false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="flex-1 text-xs shadow-sm hover:shadow" onClick={handleResetDateRange}>Reset</Button>
                        <Button size="sm" className="flex-1 text-xs shadow-sm hover:shadow-md" onClick={handleApplyDateRange}>Apply</Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={refetch}>
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="px-4 lg:px-6">
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">

          {/* Teams Leaderboard (Overall) */}
          <TabsContent value="teams" className="mt-0">
            <div className="rounded-lg border bg-card shadow-sm p-3 sm:p-4">
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-semibold">League standings</h2>
                  {(() => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-normal">
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
                        <DropdownMenuItem onClick={() => setActiveTab('teams')} className="gap-2">
                          <Trophy className="size-4" />
                          <span>Overall</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setActiveTab('challenges')} className="gap-2">
                          <Flag className="size-4" />
                          <span>Challenges</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ))()}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">Combined activity + challenge points</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {aiInsights.leaderboard_cta || 'Log today to move up the rankings.'}
              </p>
              <div className="overflow-hidden">
                <LeagueTeamsTable teams={teams} showAvgRR={true} />
              </div>
            </div>
          </TabsContent>

          {/* Challenges Leaderboard */}
          <TabsContent value="challenges" className="mt-0">
            <ChallengeSpecificLeaderboard
              leagueId={leagueId}
              renderViewSwitcher={(() => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-normal">
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
                    <DropdownMenuItem onClick={() => setActiveTab('teams')} className="gap-2">
                      <Trophy className="size-4" />
                      <span>Overall</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab('challenges')} className="gap-2">
                      <Flag className="size-4" />
                      <span>Challenges</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ))()}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Real-time Scoreboard - Always Visible Below Tabs */}
      {pendingWindow?.dates?.length ? (
        <div className="px-4 lg:px-6">
          <div className="rounded-lg border bg-card shadow-sm p-3 sm:p-4">
            <div className="mb-3">
              <h2 className="text-base sm:text-lg font-semibold">Real-time Scoreboard</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Today's and yesterday's scores (subject to change)</p>
            </div>
            <div className="overflow-hidden">
              <RealTimeScoreboardTable dates={pendingWindow.dates} teams={pendingWindow.teams || []} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Individual Leaderboard - Always Visible Below Real-time */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border bg-card shadow-sm p-3 sm:p-4">
          <div className="mb-3">
            <h2 className="text-base sm:text-lg font-semibold">Individual Rankings</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Top performers</p>
          </div>
          <div className="overflow-hidden">
            <LeagueIndividualsTable individuals={individuals} showAvgRR={true} />
          </div>
        </div>
      </div>

      {/* Stats at Bottom */}
      <div className="px-4 lg:px-6 pb-4">
        <LeaderboardStats stats={stats} />
      </div>
    </div>
  );
}
