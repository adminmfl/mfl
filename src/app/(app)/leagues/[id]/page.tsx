import { Suspense } from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getLeagueById } from '@/lib/services/leagues';
import { calculateLeaderboard } from '@/lib/services/leaderboard-logic';
import { isLeagueEnded as isLeagueEndedByDate } from '@/lib/utils';

// Modular Components

import { DashboardHeader } from '@/components/league/dashboard/dashboard-header';
import { HeaderActions } from '@/components/league/dashboard/header-actions';
import { ActivityTimeline } from '@/components/league/dashboard/activity-timeline';
import { LeagueInfoSection } from '@/components/league/dashboard/league-info-section';
import { ActionCards } from '@/components/league/dashboard/action-cards';
import { SummarySection } from '@/components/league/dashboard/summary-section';
import { MessageSquareHeart, ExternalLink, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatsSectionSkeleton,
  TimelineSkeleton,
} from '@/components/league/dashboard/dashboard-skeletons';

export default async function LeagueDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Parallel Fetch: session, league, dashboard summary, and leaderboard pre-warm
  const sessionPromise = getServerSession(authOptions as any) as Promise<
    import('next-auth').Session | null
  >;
  const leaguePromise = getLeagueById(id);
  const leaderboardPromise = calculateLeaderboard(id); // Direct service call for pre-fetch

  const [session, league] = await Promise.all([
    sessionPromise,
    leaguePromise,
    leaderboardPromise,
  ]);

  const user = session?.user;

  if (!league) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <div
                className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4"
                aria-hidden="true"
              >
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

  const isLeagueEnded =
    league.status === 'completed' || isLeagueEndedByDate(league.end_date);
  const isChallengesOnly = (league as any).league_mode === 'challenges_only';

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      <div className="flex flex-col gap-4">
        {/* Header Actions (Top row on mobile, Right side on desktop) */}
        {user && (
          <HeaderActions
            leagueId={id}
            userId={user.id}
            leagueStatus={isLeagueEnded ? 'ended' : league.status}
            leagueName={league.league_name}
            inviteCode={league.invite_code}
            memberCount={(league as any).member_count}
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
      {isLeagueEnded && (
        <div
          className="mx-4 lg:mx-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3"
          role="status"
        >
          <MessageSquareHeart
            className="size-5 text-primary shrink-0"
            aria-hidden="true"
          />
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
        <Suspense
          fallback={
            <StatsSectionSkeleton showRest={(league.rest_days ?? 0) > 0} />
          }
        >
          <SummarySection
            id={id}
            userId={user.id}
            showRest={(league.rest_days ?? 0) > 0}
            isLeagueEnded={isLeagueEnded}
          />
        </Suspense>
      )}

      {/* Recent Activity Timeline with Suspense — hidden for challenges-only leagues */}
      {!isChallengesOnly && (
        <Suspense fallback={<TimelineSkeleton />}>
          <ActivityTimeline
            id={id}
            leagueStartDate={league.start_date}
            isLeagueEnded={isLeagueEnded}
          />
        </Suspense>
      )}

      {/* Challenges Prominent Link for challenges-only leagues */}
      {isChallengesOnly && (
        <div className="px-4 lg:px-6">
          <Link href={`/leagues/${id}/challenges`} className="block">
            <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shrink-0">
                  <Trophy className="size-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    View Challenges
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    See active challenges and submit your entries
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Action Cards (Report, Donate) */}
      <ActionCards id={id} league={league} isLeagueEnded={isLeagueEnded} />

      {/* League Information RSC */}
      <LeagueInfoSection league={league} isLeagueEnded={isLeagueEnded} />
    </div>
  );
}

// Skeletons have been moved to shared /components/league/dashboard/dashboard-skeletons.tsx
