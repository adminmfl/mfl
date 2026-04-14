import React, { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { getUserRolesForLeague } from "@/lib/services/roles";
import { LeaderboardClientContainer } from "./leaderboard-client-container";
import { HeaderSkeleton, TableSkeleton, StatsSkeleton } from "@/components/leaderboard/leaderboard-skeletons";

async function getLeaderboardData(leagueId: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/leagues/${leagueId}/leaderboard`;
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (error) {
    console.error('Error fetching leaderboard data on server:', error);
    return null;
  }
}

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
    getLeaderboardData(leagueId)
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4">
      <Suspense fallback={<LeaderboardPageSkeleton />}>
        <LeaderboardClientContainer 
          leagueId={leagueId} 
          initialRoles={roles}
          initialData={initialData}
        />
      </Suspense>
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
