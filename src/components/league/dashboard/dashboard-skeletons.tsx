import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsSectionSkeleton({ showRest }: { showRest?: boolean }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite" aria-label="Loading stats summary">
      {/* Sticky Header Placeholder - Matches StatsGrid exactly */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 lg:px-6 py-2 border-b/50">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9 w-full rounded-md" />
          {showRest && <Skeleton className="h-9 w-full rounded-md" />}
        </div>
        {/* Reservation for AiWelcomeText/AiCoachInsight area to prevent jumping */}
        <div className="mt-1.5 h-5 flex items-center">
            <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      
      {/* Stats Cards - Locked heights with visible 'Writing' labels to reduce CLS */}
      <div className="px-4 lg:px-6 mt-2 space-y-4">
        <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
          <CardHeader className="pb-0 pt-4 flex flex-row items-center justify-between">
            <span className="text-base font-semibold pt-1">My Summary</span>
            <Skeleton className="size-8 rounded-md" />
          </CardHeader>
          <CardContent className="h-[210px] p-6">
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="pb-0 pt-4">
             <span className="text-base font-semibold">Team Summary</span>
          </CardHeader>
          <CardContent className="h-[120px] p-6">
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="px-4 lg:px-6 mt-2" aria-busy="true" aria-live="polite" aria-label="Loading activity timeline">
      <Card>
        <CardHeader className="py-3 border-b flex flex-row items-center justify-between">
          <span className="text-sm font-semibold opacity-50">Timeline</span>
          <div className="flex gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
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

export function LeagueHeaderSkeleton() {
    return (
        <div className="flex flex-col gap-1 px-4 lg:px-6">
            <div className="flex items-center gap-3 mb-1">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="ml-auto size-12 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4 mt-1" />
        </div>
    );
}
