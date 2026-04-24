'use client';

import { useEffect, useState } from 'react';
import type { LeaguePhase, LeaguePhaseInfo } from '@/lib/utils/league-phases';

/**
 * Hook to fetch and cache league phase information
 */
export function useLeaguePhase(leagueId: string) {
  const [phaseInfo, setPhaseInfo] = useState<LeaguePhaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPhase() {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/phase`);
        if (!res.ok) throw new Error('Failed to fetch phase');
        const data = await res.json();
        setPhaseInfo(data.data);
      } catch (err) {
        console.error('Error fetching league phase:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPhase();
  }, [leagueId]);

  return {
    phase: phaseInfo?.phase ?? ('active' as LeaguePhase),
    phaseInfo,
    loading,
    error,
    isReadOnly: phaseInfo?.isReadOnly ?? false,
    isInTrophy: phaseInfo?.phase === 'trophy',
    isInArchive: phaseInfo?.phase === 'archive',
    isDeleted: phaseInfo?.phase === 'deleted',
  };
}
