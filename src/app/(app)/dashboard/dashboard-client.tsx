"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Trophy,
  Users,
  TrendingUp,
  TrendingDown,
  Crown,
  Shield,
  Dumbbell,
  ChevronRight,
  Activity,
  Target,
  Flame,
  Award,
} from "lucide-react";

import { useLeague } from "@/contexts/league-context";
import { LeagueWithRoles } from "@/lib/types/leagues";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DumbbellLoading } from "@/components/ui/dumbbell-loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ============================================================================
// Types
// ============================================================================

interface StatCard {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  description: string;
  icon?: React.ElementType;
}

interface DashboardClientProps {
  initialLeagues: LeagueWithRoles[];
  initialSummary: {
    activitiesLogged: number;
    challengePoints: number;
    totalPoints: number;
    currentStreak: number;
    bestStreak: number;
    hasLeagues: boolean;
  } | null;
}

// ============================================================================
// Main Dashboard Client Component
// ============================================================================

export default function DashboardClient({ 
  initialLeagues, 
  initialSummary 
}: DashboardClientProps) {
  const { data: session } = useSession();
  const { userLeagues: contextLeagues, isLoading: contextLoading, setActiveLeague } = useLeague();
  
  // Use pre-fetched leagues if available, fallback to context
  const userLeagues = initialLeagues.length > 0 ? initialLeagues : contextLeagues;
  const isLoading = initialLeagues.length > 0 ? false : contextLoading;

  const [isMounted, setIsMounted] = React.useState(false);

  const userName = session?.user?.name?.split(" ")[0] || "User";

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // League involvement stats
  const leagueStats = React.useMemo(() => {
    const activeLeagues = userLeagues.filter(
      (l) => l.status === "active",
    ).length;
    const hostingCount = userLeagues.filter((l) => l.is_host).length;
    const governorCount = userLeagues.filter((l) =>
      (l.roles || []).includes("governor"),
    ).length;
    const captainCount = userLeagues.filter((l) =>
      (l.roles || []).includes("captain"),
    ).length;
    return {
      totalLeagues: userLeagues.length,
      activeLeagues,
      hostingCount,
      leadershipRoles: governorCount + captainCount,
    };
  }, [userLeagues]);

  const leagueStatCards: StatCard[] = [
    {
      title: "Total Leagues",
      value: leagueStats.totalLeagues,
      change: 0,
      changeLabel:
        leagueStats.totalLeagues > 0 ? "Growing strong" : "Join a league",
      description: "Leagues you are part of",
      icon: Trophy,
    },
    {
      title: "Active Leagues",
      value: leagueStats.activeLeagues,
      change: 0,
      changeLabel:
        leagueStats.activeLeagues > 0 ? "In progress" : "No active leagues",
      description: "Currently running leagues",
      icon: Target,
    },
    {
      title: "Hosting",
      value: leagueStats.hostingCount,
      change: 0,
      changeLabel:
        leagueStats.hostingCount > 0 ? "League creator" : "Create your first",
      description: "Leagues you created",
      icon: Crown,
    },
    {
      title: "Leadership Roles",
      value: leagueStats.leadershipRoles,
      change: 0,
      changeLabel: "Governor & Captain",
      description: "Management positions",
      icon: Shield,
    },
  ];

  // Consolidated dashboard stats
  const [summaryData, setSummaryData] = React.useState(initialSummary);
  const [summaryLoading, setSummaryLoading] = React.useState(!initialSummary);

  React.useEffect(() => {
    // If we have initial summary, don't fetch on mount
    if (initialSummary) return;

    let mounted = true;
    async function fetchSummary() {
      setSummaryLoading(true);
      try {
        const response = await fetch("/api/user/dashboard-summary");
        const result = await response.json();
        if (mounted && result.success) {
          setSummaryData(result.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard summary:", error);
      } finally {
        if (mounted) setSummaryLoading(false);
      }
    }
    fetchSummary();
    return () => {
      mounted = false;
    };
  }, [userLeagues, initialSummary]);

  const activityStats: StatCard[] = [
    {
      title: "Activities Logged",
      value: summaryLoading ? "..." : (summaryData?.activitiesLogged ?? 0),
      change: 0,
      changeLabel: "Start logging!",
      description: "Total workouts submitted",
      icon: Dumbbell,
    },
    {
      title: "Total Points",
      value: summaryLoading ? "..." : (summaryData?.totalPoints ?? 0),
      change: 0,
      changeLabel: "Earn points",
      description: "Points earned across leagues",
      icon: Award,
    },
    {
      title: "Current Streak",
      value: summaryLoading ? "..." : `${summaryData?.currentStreak ?? 0} days`,
      change: 0,
      changeLabel: "Build your streak",
      description: "Consecutive active days",
      icon: Flame,
    },
    {
      title: "Best Streak",
      value: summaryLoading ? "..." : `${summaryData?.bestStreak ?? 0} days`,
      change: 0,
      changeLabel: "Set a record",
      description: "Your longest streak ever",
      icon: Trophy,
    },
  ];

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Hi {userName} !
          </h1>
          <p className="text-muted-foreground">
            {userLeagues.length > 0
              ? `You're part of ${userLeagues.length} league${userLeagues.length !== 1 ? "s" : ""}. Here's your overview.`
              : "Get started by joining or creating a league to track your fitness journey."}
          </p>
        </div>
        <div className="flex gap-2"></div>
      </div>

      {/* Leagues Section */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">My Leagues</h2>
            <p className="text-sm text-muted-foreground">
              All leagues you are a member of
            </p>
          </div>
          {userLeagues.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/leagues">
                View All
                <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <LeagueGridSkeleton />
        ) : userLeagues.length === 0 ? (
          <LeaguesEmptyState />
        ) : (
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            {userLeagues
              .filter((league) => league.status !== "completed")
              .map((league) => (
                <LeagueCard
                  key={league.league_id}
                  league={league}
                  onSelect={() => setActiveLeague(league)}
                />
              ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button size="sm" asChild>
            <Link href="/leagues/join">
              <Users className="mr-2 size-4" />
              Join League
            </Link>
          </Button>
          <Button size="sm" asChild variant="outline">
            <Link href="/leagues/create">
              <Trophy className="mr-2 size-4" />
              Create League
            </Link>
          </Button>
        </div>
      </div>

      {/* Activity Overview */}
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          Activity Overview
        </h2>
      </div>
      {!isMounted || isLoading ? (
        <SectionCardsSkeleton />
      ) : (
        <SectionCards stats={activityStats} />
      )}

      {/* League Involvement */}
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          League Involvement
        </h2>
      </div>
      {!isMounted || isLoading ? (
        <SectionCardsSkeleton />
      ) : (
        <SectionCards stats={leagueStatCards} />
      )}
    </div>
  );
}

// ============================================================================
// Section Cards Component (Admin Style)
// ============================================================================

function SectionCards({ stats }: { stats: StatCard[] }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-2 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 sm:grid-cols-2 lg:grid-cols-3 @5xl/main:grid-cols-3">
      {stats.map((stat, index) => {
        const isPositive = stat.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;
        const StatIcon = stat.icon;

        return (
          <Card key={index} className="@container/card p-2.5 sm:p-4">
            <CardHeader className="p-0 sm:p-4 sm:pb-1.5">
              <CardDescription className="flex items-center gap-2 text-[11px] sm:text-xs">
                {StatIcon && <StatIcon className="size-4" />}
                {stat.title}
              </CardDescription>
              <CardTitle className="text-lg sm:text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 p-0 pt-1.5 sm:p-4 sm:pt-0">
              <div className="line-clamp-1 flex gap-1.5 font-medium text-[11px] sm:text-xs">
                {stat.changeLabel} <TrendIcon className="size-3 sm:size-4" />
              </div>
              <div className="text-muted-foreground text-[10px] sm:text-xs line-clamp-1 w-full">
                {stat.description}
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// League Card Component
// ============================================================================

function LeagueCard({
  league,
  onSelect,
}: {
  league: LeagueWithRoles;
  onSelect: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    launched:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  };

  const roleIcons: Record<string, React.ElementType> = {
    host: Crown,
    governor: Shield,
    captain: Users,
    player: Dumbbell,
  };

  return (
    <Link href={`/leagues/${league.league_id}`} onClick={onSelect}>
      <Card className="h-full p-0 hover:shadow-md transition-shadow cursor-pointer group overflow-hidden">
        {/* Cover Gradient */}
        <div className="relative h-16 lg:h-28 rounded-t-lg bg-linear-to-br from-primary/80 to-primary">
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <div className="absolute top-1.5 right-1.5 lg:top-3 lg:right-3">
            <Badge className={statusColors[league.status]} variant="secondary">
              {league.status}
            </Badge>
          </div>
          <div className="absolute top-1.5 left-1.5 lg:top-3 lg:left-3">
            <Avatar className="size-6 lg:size-10 border-2 border-white/70 shadow-sm">
              {league.logo_url ? (
                <AvatarImage src={league.logo_url} alt={league.name} />
              ) : (
                <AvatarFallback className="bg-white/20 text-white font-semibold uppercase">
                  {league.name?.slice(0, 2) || "LG"}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="absolute bottom-1.5 left-2.5 right-2.5 lg:bottom-3 lg:left-4 lg:right-4 text-white">
            <h3 className="text-xs lg:text-sm font-semibold truncate group-hover:underline">
              {league.name}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-2 lg:p-4">
          <p className="text-[11px] lg:text-sm text-muted-foreground line-clamp-1 lg:line-clamp-2 mb-1 lg:mb-3 min-h-[18px] lg:min-h-[40px]">
            {league.description || "No description"}
          </p>

          {/* Creator Badge */}
          {league.creator_name ? (
            <Badge className="mb-2 text-white border-0 px-2 py-0.5 hover:from-blue-600 hover:to-cyan-600 transition-all shadow-sm text-[9px] lg:text-xs">
              <Crown className="size-2.5 lg:size-3 mr-1" />
              Hosted by {league.creator_name}
            </Badge>
          ) : null}

          {/* Roles */}
          <div className="flex flex-wrap gap-1">
            {(league.roles || []).map((role) => {
              const RoleIcon = roleIcons[role];
              return (
                <Badge
                  key={role}
                  variant="outline"
                  className="gap-1 text-[9px] lg:text-xs"
                >
                  <RoleIcon className="size-2.5 lg:size-3" />
                  <span className="capitalize">{role}</span>
                </Badge>
              );
            })}
          </div>

          {/* Team */}
          {league.team_name && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t">
              <Users className="size-3.5" />
              <span>Team: {league.team_name}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ============================================================================
// Empty State Component (Using shadcn Empty)
// ============================================================================

function LeaguesEmptyState() {
  return (
    <Empty className="border rounded-lg">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Trophy />
        </EmptyMedia>
        <EmptyTitle>No leagues yet</EmptyTitle>
        <EmptyDescription>
          You haven't joined any leagues yet. Join an existing league or create
          your own to start your fitness journey with friends!
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

// ============================================================================
// Skeleton Components
// ============================================================================

function SectionCardsSkeleton() {
  return <DumbbellLoading label="Loading dashboard..." />;
}

function LeagueGridSkeleton() {
  return <DumbbellLoading label="Loading leagues..." />;
}
