'use client';

import * as React from 'react';
import { DownloadReportButton, DownloadCertificateButton } from '@/components/leagues/download-report-button';
import { InviteDialog } from '@/components/league/invite-dialog';

interface HeaderActionsProps {
  leagueId: string;
  userId: string;
  leagueStatus: string;
  leagueName: string;
  inviteCode: string | null;
  memberCount?: number;
  maxCapacity?: number;
}

export function HeaderActions({ 
  leagueId, 
  userId, 
  leagueStatus, 
  leagueName, 
  inviteCode, 
  memberCount, 
  maxCapacity 
}: HeaderActionsProps) {
  return (
    <div className="flex gap-2 flex-wrap sm:ml-auto sm:justify-end px-4 lg:px-6">
      <InviteDialog
        leagueId={leagueId}
        leagueName={leagueName}
        inviteCode={inviteCode}
        memberCount={memberCount}
        maxCapacity={maxCapacity}
        buttonLabel="Invite"
      />
      <DownloadReportButton
        leagueId={leagueId}
        userId={userId}
        leagueStatus={leagueStatus}
        variant="outline"
        size="sm"
      />
      <DownloadCertificateButton
        leagueId={leagueId}
        userId={userId}
        leagueStatus={leagueStatus}
        variant="outline"
        size="sm"
      />
    </div>
  );
}
