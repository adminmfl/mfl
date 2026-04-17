import * as React from "react";
import { 
    StatsSectionSkeleton, 
    TimelineSkeleton, 
    LeagueHeaderSkeleton 
} from "@/components/league/dashboard/dashboard-skeletons";

export default function LeagueDashboardLoading() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6 py-1">
            {/* Header Actions Placeholder (matches HeaderActions height) */}
            <div className="px-4 lg:px-6 h-10 flex items-center justify-end gap-2">
                <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
                <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
            </div>

            {/* Main Header Skeleton */}
            <LeagueHeaderSkeleton />

            {/* Stats Grid Skeleton (My Summary, Team Summary) */}
            <StatsSectionSkeleton showRest={true} />

            {/* Activity Timeline Skeleton */}
            <TimelineSkeleton />
        </div>
    );
}
