import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getUserRolesForLeague } from '@/lib/services/roles';
import { calculateLeaderboard } from '@/lib/services/leaderboard-logic';

import { LeaderboardClientContainer } from './leaderboard-client-container';
import { LeaderboardStats } from '@/components/leaderboard/leaderboard-stats';

import {
  HeaderSkeleton,
  TableSkeleton,
  StatsSkeleton,
} from '@/components/leaderboard/leaderboard-skeletons';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = await params;
  const session = await getServerSession(authOptions as any);

  // Parallel fetch: roles and leaderboard data
  const [roles, initialData] = await Promise.all([
    session?.user?.id
      ? getUserRolesForLeague(session.user.id, leagueId)
      : Promise.resolve([]),
    calculateLeaderboard(leagueId),
  ]);

  const league = initialData?.league;
  const stats = initialData?.stats || {
    total_submissions: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    total_rr: 0,
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4">
      {/* Static Header rendered on Server for better LCP */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border bg-card/70 shadow-sm px-3 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
              <p className="text-sm text-muted-foreground leading-none truncate max-w-[200px]">
                {league?.league_name || 'Rankings'}
              </p>
            </div>
            {/* The interactive parts (filters, refresh) remain in the client container */}
          </div>
          
          <Suspense fallback={<TableSkeleton rows={10} />}>
            <LeaderboardClientContainer
              leagueId={leagueId}
              initialRoles={roles}
              initialData={initialData}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export function LeaderboardPageSkeleton() {
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
