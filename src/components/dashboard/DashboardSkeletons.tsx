import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLeaguesSkeleton() {
  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="h-full border shadow-sm overflow-hidden flex flex-col">
          <div className="h-16 lg:h-28 bg-muted animate-pulse" />
          <div className="p-2 lg:p-4 space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-1 pt-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-2.5 sm:p-4 space-y-2">
          <CardHeader className="p-0 space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
          </CardHeader>
          <CardFooter className="p-0 flex-col items-start gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-4 lg:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64 mt-1" />
    </div>
  );
}
