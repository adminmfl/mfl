'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Shield } from 'lucide-react';

import { useRole } from '@/contexts/role-context';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ValidateSubmissionsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { isCaptain, isGovernor, isHost } = useRole();
  const router = useRouter();

  React.useEffect(() => {
    if (isHost || isGovernor) {
      router.replace(`/leagues/${id}/submissions`);
      return;
    }
    if (isCaptain) {
      router.replace(`/leagues/${id}/my-team/submissions`);
    }
  }, [id, isCaptain, isGovernor, isHost, router]);

  if (!isCaptain && !isGovernor && !isHost) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Shield className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only team captains, governors, and hosts can validate submissions.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="p-8">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ClipboardCheck className="size-6 text-muted-foreground" />
          </div>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52" />
          <div className="flex w-full gap-2 pt-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}
