import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { getLeagueById } from "@/lib/services/leagues";

// Modular Components
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
  
  // Parallel Fetch: session, league, and dashboard summary
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  const user = session?.user;

  // Only fetch league here; it's fast and needed for the shell
  const league = await getLeagueById(id);

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

      {/* Summary Section (Progressive streaming) */}
      {user && (
        <Suspense fallback={<StatsSectionSkeleton showRest={(league.rest_days ?? 0) > 0} />}>
          <SummarySection 
            id={id} 
            userId={user.id} 
            showRest={(league.rest_days ?? 0) > 0} 
          />
        </Suspense>
      )}

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

// Skeletons have been moved to shared /components/league/dashboard/dashboard-skeletons.tsx
