'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubmissionsRedirectPage() {
  const router = useRouter();
  const { activeLeague, userLeagues, isLoading } = useLeague();

  React.useEffect(() => {
    if (isLoading) return;

    const leagueId = activeLeague?.league_id || userLeagues?.[0]?.league_id;
    if (!leagueId) {
      router.replace('/leagues');
      return;
    }

    router.replace(`/leagues/${leagueId}/my-submissions`);
  }, [activeLeague?.league_id, isLoading, router, userLeagues]);

  return (
    <div className="p-6">
      <Card className="p-8">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ClipboardCheck className="size-6 text-muted-foreground" />
          </div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <div className="flex w-full gap-2 pt-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}
