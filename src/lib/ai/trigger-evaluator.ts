// ============================================================================
// AI Trigger Evaluator — Pure function, no DB/LLM calls
// Evaluates player context against copy templates and returns matching insights
// ============================================================================

import type {
  PlayerInsightContext,
  CopyTemplate,
  TriggeredInsight,
  InsightScreen,
  InsightPlacement,
} from './types';
import { COPY_LIBRARY } from './copy-library';

// ============================================================================
// Trigger Condition Map
// Each trigger maps to a boolean evaluator function
// ============================================================================

type TriggerFn = (ctx: PlayerInsightContext) => boolean;

const TRIGGER_CONDITIONS: Record<string, TriggerFn> = {
  // Participation triggers
  player_not_logged_today: (ctx) => !ctx.hasLoggedToday,
  team_near_full_participation: (ctx) =>
    ctx.teamParticipationPct >= 80 && ctx.teamParticipationPct < 100 && !ctx.hasLoggedToday,
  player_is_last_remaining: (ctx) =>
    ctx.teamMembersRemaining === 1 && !ctx.hasLoggedToday,
  teammates_logged_today: (ctx) =>
    ctx.teamMembersLogged >= 2 && !ctx.hasLoggedToday,

  // Leader activation triggers
  player_is_top_performer: (ctx) =>
    ctx.hasLoggedToday &&
    ctx.playerAvgRR !== null &&
    ctx.playerAvgRR >= 1.3 &&
    ctx.consecutiveDaysActive >= 3,

  // Team momentum triggers
  team_has_momentum: (ctx) =>
    ctx.teamParticipationPct >= 40 && ctx.teamParticipationPct < 80,
  team_half_logged: (ctx) =>
    ctx.teamParticipationPct >= 40 && ctx.teamParticipationPct < 70,

  // Competition triggers
  team_close_to_leader: (ctx) =>
    !ctx.isLeading && ctx.pointsBehindLeader > 0 && ctx.pointsBehindLeader <= 5,
  team_is_leading: (ctx) => ctx.isLeading,
  competition_tight: (ctx) =>
    ctx.pointsBehindLeader <= 3 && ctx.pointsBehindLeader > 0,
  team_missing_players_today: (ctx) =>
    ctx.teamMembersRemaining > 0 && ctx.teamParticipationPct < 100,
  team_has_rr_advantage: (ctx) =>
    ctx.hasAnyMeasurementActivity &&
    ctx.teamAvgRR !== null &&
    ctx.teamAvgRR >= 1.3,
  general_competition: (_ctx) => true, // fallback for leaderboard screen

  // Rest day risk triggers
  rest_days_used_early: (ctx) => {
    if (ctx.restDaysAllowed <= 0 || ctx.totalLeagueDays <= 0) return false;
    const progressPct = ctx.leagueDay / ctx.totalLeagueDays;
    const restUsedPct = ctx.restDaysUsed / ctx.restDaysAllowed;
    return restUsedPct > progressPct + 0.2; // used 20%+ more rest than league progress
  },
  high_missed_days: (ctx) => ctx.missedDays >= 3,

  // Runrate triggers
  player_low_rr: (ctx) =>
    ctx.hasAnyMeasurementActivity &&
    ctx.playerAvgRR !== null &&
    ctx.playerAvgRR < 1.0 &&
    ctx.playerAvgRR > 0,
  player_rr_below_team: (ctx) =>
    ctx.hasAnyMeasurementActivity &&
    ctx.playerAvgRR !== null &&
    ctx.teamAvgRR !== null &&
    ctx.playerAvgRR < ctx.teamAvgRR,
  top_teams_pushing_rr: (ctx) =>
    ctx.hasAnyMeasurementActivity && ctx.teamRank !== null && ctx.teamRank > 1,

  // Bonding / general
  general_team_context: (_ctx) => true, // always true, lowest priority fallback

  // Final day / end phase
  is_final_week: (ctx) => ctx.isFinalWeek && !ctx.isLastDay,
  is_last_day: (ctx) => ctx.isLastDay,
};

// ============================================================================
// Template Interpolation
// ============================================================================

function interpolate(template: string, ctx: PlayerInsightContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = (ctx as any)[key];
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }
    return String(value);
  });
}

// ============================================================================
// Rotation Logic
// Uses a deterministic hash based on date + userId to pick among same-priority templates
// ============================================================================

function getRotationIndex(ctx: PlayerInsightContext, count: number): number {
  if (count <= 1) return 0;
  // Simple hash: sum of char codes from date + playerId
  const seed = new Date().toISOString().slice(0, 10) + ctx.playerId;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
}

// ============================================================================
// Main Evaluator
// ============================================================================

/**
 * Evaluate all triggers against the player context and return matching insights.
 * Optionally filter by screen and/or placements.
 */
export function evaluateTriggers(
  ctx: PlayerInsightContext,
  filters?: {
    screen?: InsightScreen;
    placements?: InsightPlacement[];
  }
): TriggeredInsight[] {
  const results: TriggeredInsight[] = [];

  for (const tmpl of COPY_LIBRARY) {
    // Filter by screen
    if (filters?.screen && tmpl.screen !== filters.screen) continue;
    // Filter by placements
    if (filters?.placements && !filters.placements.includes(tmpl.placement)) continue;

    // Evaluate trigger condition
    const triggerFn = TRIGGER_CONDITIONS[tmpl.trigger];
    if (!triggerFn) continue;
    if (!triggerFn(ctx)) continue;

    results.push({
      text: interpolate(tmpl.template, ctx),
      category: tmpl.category,
      placement: tmpl.placement,
      priority: tmpl.priority,
      templateId: tmpl.id,
    });
  }

  // Sort by priority descending
  results.sort((a, b) => b.priority - a.priority);

  return results;
}

/**
 * Get the best insight for each requested placement slot.
 * Returns a map of placement -> insight text (or null if none triggered).
 * Applies rotation among same-priority templates per placement.
 */
export function getBestInsights(
  ctx: PlayerInsightContext,
  screen: InsightScreen,
  placements: InsightPlacement[]
): Record<InsightPlacement, string | null> {
  const all = evaluateTriggers(ctx, { screen, placements });

  const result: Record<string, string | null> = {};
  for (const p of placements) {
    result[p] = null;
  }

  for (const placement of placements) {
    const matching = all.filter((i) => i.placement === placement);
    if (matching.length === 0) continue;

    // Group by highest priority
    const topPriority = matching[0].priority;
    const topTier = matching.filter((m) => m.priority === topPriority);

    // Rotate among top-tier templates
    const idx = getRotationIndex(ctx, topTier.length);
    result[placement] = topTier[idx].text;
  }

  return result as Record<InsightPlacement, string | null>;
}
