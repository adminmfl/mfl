'use client';

import React from 'react';
import { AlertCircle, Lock, Archive, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { LeaguePhase } from '@/lib/utils/league-phases';

interface ReadOnlyBannerProps {
  phase: LeaguePhase;
  daysRemaining: number;
}

export function ReadOnlyBanner({ phase, daysRemaining }: ReadOnlyBannerProps) {
  if (phase === 'active') return null;

  const config = {
    trophy: {
      icon: Lock,
      title: 'Trophy Mode - Read Only',
      message: `🏆 This league is in celebration mode. Data is locked for ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'}.`,
      variant: 'default' as const,
      className: 'border-amber-200 bg-amber-50',
    },
    archive: {
      icon: Archive,
      title: 'Archived - Read Only',
      message: `📦 This league has ended and is archived. Data will be retained for ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'}.`,
      variant: 'default' as const,
      className: 'border-orange-200 bg-orange-50',
    },
    deleted: {
      icon: AlertCircle,
      title: 'Data Archived',
      message:
        '📋 This league data has been archived. Photos and proof files may have been deleted.',
      variant: 'default' as const,
      className: 'border-slate-200 bg-slate-50',
    },
  };

  const config_item = config[phase];
  const Icon = config_item.icon;

  return (
    <Alert className={config_item.className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{config_item.title}</AlertTitle>
      <AlertDescription>{config_item.message}</AlertDescription>
    </Alert>
  );
}
