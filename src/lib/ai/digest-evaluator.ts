// ============================================================================
// Digest Evaluator — Pure function, no DB/LLM calls
// Evaluates LeagueHealthContext and produces DigestCandidate[] for the host
// ============================================================================

import type {
  LeagueHealthContext,
  DigestCandidate,
  InterventionCandidate,
  MemberSnapshot,
  TeamHealthSummary,
} from './types';

// ============================================================================
// Digest Rules
// ============================================================================

type DigestRule = (ctx: LeagueHealthContext) => DigestCandidate | null;

const DIGEST_RULES: DigestRule[] = [
  // --- Participation Drop ---
  (ctx) => {
    if (ctx.overallParticipationPct >= 70) return null;
    return {
      category: 'participation_drop',
      title: 'League participation is low today',
      body: `Only ${Math.round(ctx.overallParticipationPct)}% of members have logged today. Consider sending a league-wide nudge.`,
      priority: 8,
      metadata: { participationPct: ctx.overallParticipationPct },
      actionType: 'send_nudge',
      actionPayload: { scope: 'league' },
    };
  },

  // --- Per-team participation drop ---
  (ctx) => {
    const worst = ctx.teams
      .filter((t) => t.todayParticipationPct < 50 && t.memberCount >= 3)
      .sort((a, b) => a.todayParticipationPct - b.todayParticipationPct)[0];
    if (!worst) return null;
    return {
      category: 'participation_drop',
      title: `${worst.teamName} has low participation`,
      body: `Only ${worst.membersLoggedToday}/${worst.memberCount} members logged today (${Math.round(worst.todayParticipationPct)}%). This team may need extra attention.`,
      priority: 7,
      metadata: { teamId: worst.teamId, pct: worst.todayParticipationPct },
      actionType: 'send_nudge',
      actionPayload: { scope: 'team', teamId: worst.teamId },
    };
  },

  // --- Inactive Members (3+ days) ---
  (ctx) => {
    const inactive = ctx.allMembers.filter((m) => m.consecutiveDaysInactive >= 3);
    if (inactive.length === 0) return null;
    const names = inactive.slice(0, 5).map((m) => m.username).join(', ');
    const more = inactive.length > 5 ? ` and ${inactive.length - 5} more` : '';
    return {
      category: 'inactive_members',
      title: `${inactive.length} member${inactive.length > 1 ? 's' : ''} inactive 3+ days`,
      body: `${names}${more} haven't logged in 3+ days. Consider reaching out before they disengage.`,
      priority: 7,
      metadata: { count: inactive.length, userIds: inactive.map((m) => m.userId) },
      actionType: 'view_interventions',
    };
  },

  // --- Streak Alerts ---
  (ctx) => {
    const broken = ctx.allMembers.filter((m) => m.streakBroken);
    if (broken.length === 0) return null;
    const names = broken.slice(0, 3).map((m) => m.username).join(', ');
    return {
      category: 'streak_alert',
      title: `${broken.length} streak${broken.length > 1 ? 's' : ''} broken`,
      body: `${names}${broken.length > 3 ? ` and ${broken.length - 3} more` : ''} just lost their streak. A quick nudge could get them back on track.`,
      priority: 6,
      metadata: { count: broken.length, userIds: broken.map((m) => m.userId) },
      actionType: 'send_nudge',
      actionPayload: { scope: 'individual' },
    };
  },

  // --- Team Imbalance ---
  (ctx) => {
    if (ctx.teams.length < 2) return null;
    const sorted = [...ctx.teams].sort((a, b) => b.totalPoints - a.totalPoints);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    if (top.totalPoints === 0) return null;
    const gap = top.totalPoints - bottom.totalPoints;
    const gapPct = (gap / top.totalPoints) * 100;
    if (gapPct < 40) return null;
    return {
      category: 'team_imbalance',
      title: 'Large gap between teams',
      body: `${top.teamName} leads ${bottom.teamName} by ${gap} points (${Math.round(gapPct)}% gap). Consider a team challenge to level the field.`,
      priority: 5,
      metadata: { topTeam: top.teamId, bottomTeam: bottom.teamId, gap },
    };
  },

  // --- Challenge Ending Soon ---
  (ctx) => {
    const ending = ctx.activeChallenges.filter((c) => c.daysRemaining <= 2 && c.daysRemaining >= 0);
    if (ending.length === 0) return null;
    const c = ending[0];
    const pct = c.totalMembers > 0 ? Math.round((c.submissionCount / c.totalMembers) * 100) : 0;
    return {
      category: 'challenge_ending',
      title: `"${c.name}" ends ${c.daysRemaining === 0 ? 'today' : `in ${c.daysRemaining} day${c.daysRemaining > 1 ? 's' : ''}`}`,
      body: `${c.submissionCount}/${c.totalMembers} members have submitted (${pct}%). Send a reminder to boost participation.`,
      priority: 8,
      metadata: { challengeId: c.challengeId, daysRemaining: c.daysRemaining },
      actionType: 'send_challenge_reminder',
      actionPayload: { challengeId: c.challengeId },
    };
  },

  // --- RR Anomaly ---
  (ctx) => {
    const declining = ctx.allMembers.filter((m) => m.rrTrend === 'declining' && m.avgRR !== null && m.avgRR < 0.8);
    if (declining.length < 2) return null;
    return {
      category: 'rr_anomaly',
      title: 'Run rate declining for multiple members',
      body: `${declining.length} members show declining run rates this week. They might be losing motivation or struggling with intensity.`,
      priority: 5,
      metadata: { count: declining.length, userIds: declining.map((m) => m.userId) },
    };
  },

  // --- League Health (Final Week) ---
  (ctx) => {
    if (!ctx.isFinalWeek) return null;
    return {
      category: 'league_health',
      title: ctx.isLastDay ? 'Last day of the league!' : 'Final week — keep the energy high',
      body: ctx.isLastDay
        ? `It's the last day! Send a closing message to celebrate everyone's effort. Overall participation: ${Math.round(ctx.overallParticipationPct)}%.`
        : `The league ends soon. Now is a great time to send a motivational message and announce final standings.`,
      priority: ctx.isLastDay ? 9 : 6,
      metadata: { leagueDay: ctx.leagueDay, totalDays: ctx.totalLeagueDays },
      actionType: 'send_announcement',
    };
  },

  // --- Milestone (first week check-in) ---
  (ctx) => {
    if (ctx.leagueDay !== 7) return null;
    return {
      category: 'milestone',
      title: 'Week 1 complete!',
      body: `Your league just finished its first week. ${Math.round(ctx.overallParticipationPct)}% participation today. Consider sharing a weekly recap.`,
      priority: 4,
      metadata: { leagueDay: ctx.leagueDay },
      actionType: 'send_announcement',
    };
  },
];

// ============================================================================
// Intervention Rules
// ============================================================================

type InterventionRule = (
  member: MemberSnapshot,
  team: TeamHealthSummary | null,
  ctx: LeagueHealthContext
) => InterventionCandidate | null;

const INTERVENTION_RULES: InterventionRule[] = [
  // 5+ days inactive → critical
  (m, _t, ctx) => {
    if (m.consecutiveDaysInactive < 5) return null;
    return {
      memberUserId: m.userId,
      teamId: m.teamId,
      triggerType: 'inactivity_5d',
      severity: 'critical',
      title: `${m.username} inactive for ${m.consecutiveDaysInactive} days`,
      description: `${m.username} hasn't logged any activity in ${m.consecutiveDaysInactive} days. High dropout risk.`,
      suggestedAction: `Send a personal check-in message to ${m.username}. Ask if everything is okay and if they need any support.`,
      playerContext: {
        lastActivity: m.lastActivityDate,
        missedDays: m.missedDays,
        restDaysUsed: m.restDaysUsed,
        leagueDay: ctx.leagueDay,
      },
    };
  },

  // 3-4 days inactive → high
  (m) => {
    if (m.consecutiveDaysInactive < 3 || m.consecutiveDaysInactive >= 5) return null;
    return {
      memberUserId: m.userId,
      teamId: m.teamId,
      triggerType: 'inactivity_3d',
      severity: 'high',
      title: `${m.username} inactive for ${m.consecutiveDaysInactive} days`,
      description: `${m.username} missed ${m.consecutiveDaysInactive} consecutive days. Needs a nudge before disengagement.`,
      suggestedAction: `Send a friendly nudge to ${m.username} encouraging them to get back on track.`,
      playerContext: {
        lastActivity: m.lastActivityDate,
        missedDays: m.missedDays,
      },
    };
  },

  // Streak broken
  (m) => {
    if (!m.streakBroken) return null;
    return {
      memberUserId: m.userId,
      teamId: m.teamId,
      triggerType: 'streak_broken',
      severity: 'medium',
      title: `${m.username}'s streak broken`,
      description: `${m.username} had a strong streak going but missed today. Encouraging them now could prevent further disengagement.`,
      suggestedAction: `Acknowledge ${m.username}'s previous streak and motivate them to start a new one.`,
      playerContext: {
        consecutiveDaysActive: m.consecutiveDaysActive,
        lastActivity: m.lastActivityDate,
      },
    };
  },

  // RR declining
  (m) => {
    if (m.rrTrend !== 'declining' || m.avgRR === null) return null;
    return {
      memberUserId: m.userId,
      teamId: m.teamId,
      triggerType: 'rr_declining',
      severity: 'low',
      title: `${m.username}'s run rate is declining`,
      description: `${m.username}'s average RR dropped to ${m.avgRR.toFixed(2)} with a declining trend. They might need motivation to push harder.`,
      suggestedAction: `Send encouragement about improving workout intensity. Suggest specific activities.`,
      playerContext: {
        avgRR: m.avgRR,
        rrTrend: m.rrTrend,
      },
    };
  },

  // Rest days exhausted
  (m) => {
    if (m.restDaysAllowed <= 0) return null;
    if (m.restDaysUsed < m.restDaysAllowed) return null;
    return {
      memberUserId: m.userId,
      teamId: m.teamId,
      triggerType: 'rest_days_exhausted',
      severity: 'medium',
      title: `${m.username} used all rest days`,
      description: `${m.username} has used all ${m.restDaysAllowed} rest days. Any missed day from now will count as a zero.`,
      suggestedAction: `Let ${m.username} know they have no rest days left and encourage daily logging.`,
      playerContext: {
        restDaysUsed: m.restDaysUsed,
        restDaysAllowed: m.restDaysAllowed,
      },
    };
  },

  // Dropout risk: inactive 3+ days + used most rest days
  (m, _t, ctx) => {
    if (m.consecutiveDaysInactive < 3) return null;
    if (m.restDaysAllowed <= 0) return null;
    const restPct = m.restDaysUsed / m.restDaysAllowed;
    if (restPct < 0.7) return null;
    return {
      memberUserId: m.userId,
      teamId: m.teamId,
      triggerType: 'dropout_risk',
      severity: 'critical',
      title: `${m.username} at high dropout risk`,
      description: `${m.username} is inactive ${m.consecutiveDaysInactive} days, used ${m.restDaysUsed}/${m.restDaysAllowed} rest days. Very likely to drop out.`,
      suggestedAction: `Urgent: reach out personally to ${m.username}. They may need a modified plan or extra support.`,
      playerContext: {
        consecutiveDaysInactive: m.consecutiveDaysInactive,
        restDaysUsed: m.restDaysUsed,
        restDaysAllowed: m.restDaysAllowed,
        totalPoints: m.totalPoints,
        leagueDay: ctx.leagueDay,
      },
    };
  },
];

// ============================================================================
// Public API
// ============================================================================

/** Evaluate all digest rules and return sorted candidates */
export function evaluateDigest(ctx: LeagueHealthContext): DigestCandidate[] {
  const candidates: DigestCandidate[] = [];
  for (const rule of DIGEST_RULES) {
    const result = rule(ctx);
    if (result) candidates.push(result);
  }
  return candidates.sort((a, b) => b.priority - a.priority);
}

/** Evaluate all intervention rules for every member */
export function evaluateInterventions(ctx: LeagueHealthContext): InterventionCandidate[] {
  const candidates: InterventionCandidate[] = [];
  const teamMap = new Map(ctx.teams.map((t) => [t.teamId, t]));

  for (const member of ctx.allMembers) {
    const team = member.teamId ? teamMap.get(member.teamId) ?? null : null;
    for (const rule of INTERVENTION_RULES) {
      const result = rule(member, team, ctx);
      if (result) {
        candidates.push(result);
        break; // one intervention per member (highest priority rule wins)
      }
    }
  }

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return candidates.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));
}
