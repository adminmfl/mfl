import * as React from "react";
import { 
  DashboardLeaguesSkeleton, 
  DashboardStatsSkeleton, 
  DashboardHeaderSkeleton 
} from "@/components/dashboard/DashboardSkeletons";
import Activity from 'lucide-react/dist/esm/icons/activity.js';
import Trophy from 'lucide-react/dist/esm/icons/trophy.js';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Welcome Header Skeleton */}
      <DashboardHeaderSkeleton />

      {/* Leagues Section Skeleton */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">My Leagues</h2>
            <p className="text-sm text-muted-foreground">
              All leagues you are a member of
            </p>
          </div>
        </div>
        <DashboardLeaguesSkeleton />
      </div>

      {/* Activity Overview Skeleton */}
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="size-5 text-primary opacity-50" />
          Activity Overview
        </h2>
      </div>
      <DashboardStatsSkeleton />

      {/* League Involvement Skeleton */}
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="size-5 text-primary opacity-50" />
          League Involvement
        </h2>
      </div>
      <DashboardStatsSkeleton />
    </div>
  );
}
