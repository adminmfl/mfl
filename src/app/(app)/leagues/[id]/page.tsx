import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { getLeagueById } from "@/lib/services/leagues";
import { getDashboardSummary } from "@/lib/services/dashboard-service";

// Modular Components
import { DashboardHeader } from "@/components/league/dashboard/dashboard-header";
import { HeaderActions } from "@/components/league/dashboard/header-actions";
import { StatsGrid } from "@/components/league/dashboard/stats-grid";
import { ActivityTimeline } from "@/components/league/dashboard/activity-timeline";
import { LeagueInfoSection } from "@/components/league/dashboard/league-info-section";
import { ActionCards } from "@/components/league/dashboard/action-cards";
import { MessageSquareHeart, ExternalLink, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function LeagueDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Parallel Fetch: session, league, and dashboard summary
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  const user = session?.user;

  // We can only fetch summary if we have a user
  const [league, dashboardSummary] = await Promise.all([
    getLeagueById(id),
    user ? getDashboardSummary(id, user.id) : Promise.resolve(null),
  ]);

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

      {/* League Ended Banner */}
      {league.status === "completed" && (
        <div className="mx-4 lg:mx-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3" role="status">
          <MessageSquareHeart className="size-5 text-primary shrink-0" aria-hidden="true" />
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

      {/* Stats Grid with initial server-side data */}
      <Suspense fallback={<StatsSectionSkeleton showRest={(league.rest_days ?? 0) > 0} />}>
        <StatsGrid 
          id={id} 
          showRest={(league.rest_days ?? 0) > 0} 
          initialData={dashboardSummary || undefined} 
        />
      </Suspense>

      {/* Recent Activity Timeline with Suspense */}
      <Suspense fallback={<TimelineSkeleton />}>
        <ActivityTimeline id={id} leagueStartDate={league.start_date} />
      </Suspense>

      {/* Action Cards (Report, Donate) */}
      <ActionCards id={id} league={league} />

      {/* League Information RSC */}
      <LeagueInfoSection league={league} />
    </div>
  );
}

function StatsSectionSkeleton({ showRest }: { showRest?: boolean }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite" aria-label="Loading stats summary">
      {/* Sticky Header Placeholder - Matches StatsGrid exactly */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 lg:px-6 py-2 border-b">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9 w-full rounded-md" />
          {showRest && <Skeleton className="h-9 w-full rounded-md" />}
        </div>
        {/* Reservation for AiWelcomeText/AiCoachInsight area to prevent jumping */}
        <div className="mt-1.5 h-5 flex items-center">
            <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      
      {/* Stats Cards - Locked heights to prevent CLS */}
      <div className="px-4 lg:px-6 mt-2 space-y-4">
        <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
          <CardHeader className="pb-0 pt-4">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="h-[210px] p-6">
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
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

function TimelineSkeleton() {
  return (
    <div className="px-4 lg:px-6 mt-2" aria-busy="true" aria-live="polite" aria-label="Loading activity timeline">
      <Card>
        <CardHeader className="py-3 border-b flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-full" />
          <div className="flex gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
