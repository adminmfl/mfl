import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getUserRolesForLeague } from '@/lib/services/roles';
import { calculateLeaderboard } from '@/lib/services/leaderboard-logic';
import { getLeagueById } from '@/lib/services/leagues';
import { getLeaguePhase } from '@/lib/utils/league-phases';

import { LeaderboardClientContainer } from './leaderboard-client-container';

import {
  HeaderSkeleton,
  TableSkeleton,
  StatsSkeleton,
} from '@/components/leaderboard/leaderboard-skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Archive } from 'lucide-react';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = await params;
  const session = await getServerSession(authOptions as any);

  // Parallel fetch: roles, leaderboard data, and league info
  const [roles, initialData, league] = await Promise.all([
    session?.user?.id
      ? getUserRolesForLeague(session.user.id, leagueId)
      : Promise.resolve([]),
    calculateLeaderboard(leagueId),
    getLeagueById(leagueId),
  ]);

  const leagueData = initialData?.league || league;
  const leaguePhase = getLeaguePhase(leagueData?.status, leagueData?.end_date);
  const isReadOnly = leaguePhase.isReadOnly;

  return (
    <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4">
      {/* Read-only alert for trophy/archive/deleted phases */}
      {isReadOnly && (
        <div className="px-4 lg:px-6">
          <Alert
            className={
              leaguePhase.phase === 'trophy'
                ? 'border-amber-200 bg-amber-50'
                : leaguePhase.phase === 'archive'
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-slate-200 bg-slate-50'
            }
          >
            <Lock className="h-4 w-4" />
            <AlertDescription>
              {leaguePhase.phase === 'trophy' ? (
                <>
                  🏆 <strong>Trophy Mode:</strong> Leaderboard is read-only
                  during celebration mode.
                </>
              ) : leaguePhase.phase === 'archive' ? (
                <>
                  📦 <strong>Archived:</strong> This league has ended.
                  Leaderboard is read-only. {leaguePhase.daysRemaining} day
                  {leaguePhase.daysRemaining === 1 ? '' : 's'} until archival.
                </>
              ) : (
                <>
                  📋 <strong>Archived:</strong> This league data has been
                  archived and is read-only.
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Static Header rendered on Server for better LCP */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground leading-none truncate max-w-[200px]">
              {leagueData?.league_name || 'Rankings'}
            </p>
          </div>
          {/* The interactive parts (filters, refresh) remain in the client container */}
        </div>

        <Suspense fallback={<TableSkeleton rows={10} />}>
          <LeaderboardClientContainer
            leagueId={leagueId}
            initialRoles={roles}
            initialData={initialData}
            isReadOnly={isReadOnly}
            leaguePhase={leaguePhase.phase}
          />
        </Suspense>
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
