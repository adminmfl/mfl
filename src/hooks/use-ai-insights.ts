'use client';

import { useState, useEffect, useMemo } from 'react';
import type {
  PlayerInsightContext,
  InsightScreen,
  InsightPlacement,
} from '@/lib/ai/types';
import { getBestInsights } from '@/lib/ai/trigger-evaluator';
import { getClientCache, setClientCache } from '@/lib/client-cache';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook that fetches AI context for the current user/league and evaluates
 * trigger-based insights for the requested screen and placements.
 *
 * Returns a map of placement -> insight text (or null).
 */
export function useAiInsights(
  leagueId: string | null | undefined,
  screen: InsightScreen,
  placements: InsightPlacement[]
): {
  insights: Record<InsightPlacement, string | null>;
  context: PlayerInsightContext | null;
  loading: boolean;
} {
  const [context, setContext] = useState<PlayerInsightContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) {
      setLoading(false);
      return;
    }

    const cacheKey = `ai-context:${leagueId}`;
    const cached = getClientCache<PlayerInsightContext>(cacheKey);
    if (cached) {
      setContext(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch(`/api/leagues/${leagueId}/ai-context`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setClientCache(cacheKey, json.data, CACHE_TTL_MS);
          setContext(json.data);
        }
      })
      .catch(() => {
        // Silently fail — insights are non-critical
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const insights = useMemo(() => {
    if (!context) {
      const empty: Record<string, string | null> = {};
      for (const p of placements) empty[p] = null;
      return empty as Record<InsightPlacement, string | null>;
    }
    return getBestInsights(context, screen, placements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, screen, placements.join(',')]);

  return { insights, context, loading };
}
