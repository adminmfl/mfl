// ============================================================================
// AI Coach Copy Library — v2.5
// All templates from client's copy library, mapped to triggers and placements
// ============================================================================

import type { CopyTemplate } from './types';

export const COPY_LIBRARY: CopyTemplate[] = [
  // =========================================================================
  // 1. PARTICIPATION — Bottom player / Inactive
  // =========================================================================

  // Missed usual time
  {
    id: 'part-1',
    category: 'participation',
    trigger: 'player_not_logged_today',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: "You usually log by now — quick one today?",
    priority: 7,
  },
  {
    id: 'part-2',
    category: 'participation',
    trigger: 'player_not_logged_today',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: "Missed your usual time — don't skip today",
    priority: 6,
  },
  {
    id: 'part-3',
    category: 'participation',
    trigger: 'player_not_logged_today',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: 'A quick activity now keeps your streak alive',
    priority: 5,
  },

  // Team completion push
  {
    id: 'part-4',
    category: 'participation',
    trigger: 'team_near_full_participation',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: 'Your team is at {{teamParticipationPct}}% — you can complete it',
    priority: 9,
  },
  {
    id: 'part-5',
    category: 'participation',
    trigger: 'player_is_last_remaining',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: 'Only 1 player left — your team is waiting on you',
    priority: 10,
  },
  {
    id: 'part-6',
    category: 'participation',
    trigger: 'player_is_last_remaining',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: "You're the last one needed today",
    priority: 10,
  },

  // Social proof
  {
    id: 'part-7',
    category: 'participation',
    trigger: 'teammates_logged_today',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: '{{teamMembersLogged}} teammates already logged today',
    priority: 6,
  },
  {
    id: 'part-8',
    category: 'participation',
    trigger: 'teammates_logged_today',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: "Your team is moving — join in",
    priority: 5,
  },
  {
    id: 'part-9',
    category: 'participation',
    trigger: 'teammates_logged_today',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: "Everyone's contributing today — your turn",
    priority: 4,
  },

  // Light urgency
  {
    id: 'part-10',
    category: 'participation',
    trigger: 'player_not_logged_today',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: "Still time today — don't miss out",
    priority: 4,
  },
  {
    id: 'part-11',
    category: 'participation',
    trigger: 'player_not_logged_today',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: "Today's activity keeps your team strong",
    priority: 3,
  },
  {
    id: 'part-12',
    category: 'participation',
    trigger: 'player_not_logged_today',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'Small effort today makes a big difference',
    priority: 3,
  },

  // =========================================================================
  // 2. LEADER ACTIVATION — High runrate players
  // =========================================================================

  // Recognition
  {
    id: 'lead-1',
    category: 'leader_activation',
    trigger: 'player_is_top_performer',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: "You're one of the strongest contributors today",
    priority: 7,
  },
  {
    id: 'lead-2',
    category: 'leader_activation',
    trigger: 'player_is_top_performer',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: 'Your consistency is driving your team',
    priority: 6,
  },
  {
    id: 'lead-3',
    category: 'leader_activation',
    trigger: 'player_is_top_performer',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: "You're setting the pace for your team",
    priority: 6,
  },

  // Influence prompt
  {
    id: 'lead-4',
    category: 'leader_activation',
    trigger: 'player_is_top_performer',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'Share your activity — get your team going',
    priority: 5,
  },
  {
    id: 'lead-5',
    category: 'leader_activation',
    trigger: 'player_is_top_performer',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'Your effort can motivate others today',
    priority: 5,
  },
  {
    id: 'lead-6',
    category: 'leader_activation',
    trigger: 'player_is_top_performer',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'Lead the push today',
    priority: 4,
  },

  // Leadership identity
  {
    id: 'lead-7',
    category: 'leader_activation',
    trigger: 'player_is_top_performer',
    screen: 'my_team',
    placement: 'leader_badge',
    template: 'Your team looks up to players like you',
    priority: 5,
  },
  {
    id: 'lead-8',
    category: 'leader_activation',
    trigger: 'player_is_top_performer',
    screen: 'my_team',
    placement: 'leader_badge',
    template: 'Keep leading from the front',
    priority: 4,
  },

  // =========================================================================
  // 3. TEAM MOMENTUM — Social energy
  // =========================================================================

  // Activity momentum
  {
    id: 'mom-1',
    category: 'team_momentum',
    trigger: 'team_has_momentum',
    screen: 'my_team',
    placement: 'team_strip',
    template: 'Your team is gaining momentum today',
    priority: 6,
  },
  {
    id: 'mom-2',
    category: 'team_momentum',
    trigger: 'team_has_momentum',
    screen: 'my_team',
    placement: 'team_strip',
    template: 'Strong start from your team',
    priority: 5,
  },
  {
    id: 'mom-3',
    category: 'team_momentum',
    trigger: 'team_has_momentum',
    screen: 'my_team',
    placement: 'team_strip',
    template: 'Team is active — keep it going',
    priority: 5,
  },

  // Mid-day push
  {
    id: 'mom-4',
    category: 'team_momentum',
    trigger: 'team_half_logged',
    screen: 'my_team',
    placement: 'momentum_insight',
    template: "Half your team is done — let's complete it",
    priority: 7,
  },
  {
    id: 'mom-5',
    category: 'team_momentum',
    trigger: 'team_half_logged',
    screen: 'my_team',
    placement: 'momentum_insight',
    template: 'Good progress — push to full participation',
    priority: 6,
  },
  {
    id: 'mom-6',
    category: 'team_momentum',
    trigger: 'team_near_full_participation',
    screen: 'my_team',
    placement: 'momentum_insight',
    template: 'Team is close — finish strong',
    priority: 8,
  },

  // =========================================================================
  // 4. COMPETITION — Leaderboard pressure
  // =========================================================================

  // Close gap
  {
    id: 'comp-1',
    category: 'competition',
    trigger: 'team_close_to_leader',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: "You're just {{pointsBehindLeader}} points behind — this is winnable",
    priority: 9,
  },
  {
    id: 'comp-2',
    category: 'competition',
    trigger: 'team_close_to_leader',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: 'One strong day can change the leaderboard',
    priority: 7,
  },
  {
    id: 'comp-3',
    category: 'competition',
    trigger: 'team_close_to_leader',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: "You're within reach — push today",
    priority: 7,
  },

  // Leading
  {
    id: 'comp-4',
    category: 'competition',
    trigger: 'team_is_leading',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: "You're leading — stay consistent",
    priority: 6,
  },
  {
    id: 'comp-5',
    category: 'competition',
    trigger: 'team_is_leading',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: 'Top spot is yours to keep',
    priority: 5,
  },
  {
    id: 'comp-6',
    category: 'competition',
    trigger: 'team_is_leading',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: "Don't lose momentum now",
    priority: 5,
  },

  // Runrate awareness
  {
    id: 'comp-7',
    category: 'competition',
    trigger: 'competition_tight',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: 'Runrate can decide this — every entry matters',
    priority: 8,
  },
  {
    id: 'comp-8',
    category: 'competition',
    trigger: 'competition_tight',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'Extra effort today improves your edge',
    priority: 6,
  },

  // Team row tags
  {
    id: 'comp-9',
    category: 'competition',
    trigger: 'team_missing_players_today',
    screen: 'leaderboard',
    placement: 'team_row_tag',
    template: '{{teamMembersRemaining}} player(s) short today',
    priority: 7,
  },
  {
    id: 'comp-10',
    category: 'competition',
    trigger: 'team_has_rr_advantage',
    screen: 'leaderboard',
    placement: 'team_row_tag',
    template: 'Strong Runrate advantage',
    priority: 5,
  },

  // =========================================================================
  // 5. REST-DAY RISK — Prevent drop-off
  // =========================================================================

  {
    id: 'rest-1',
    category: 'rest_day_risk',
    trigger: 'rest_days_used_early',
    screen: 'my_activity',
    placement: 'stat_label_missed',
    template: "You've used rest days early — stay consistent now",
    priority: 7,
  },
  {
    id: 'rest-2',
    category: 'rest_day_risk',
    trigger: 'rest_days_used_early',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'Next few days are important for your team',
    priority: 5,
  },
  {
    id: 'rest-3',
    category: 'rest_day_risk',
    trigger: 'high_missed_days',
    screen: 'my_activity',
    placement: 'stat_label_missed',
    template: 'High risk — stay consistent next few days',
    priority: 8,
  },
  {
    id: 'rest-4',
    category: 'rest_day_risk',
    trigger: 'high_missed_days',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'Your consistency matters more now',
    priority: 6,
  },

  // =========================================================================
  // 6. RUNRATE IMPROVEMENT — Effort push
  // =========================================================================

  {
    id: 'rr-1',
    category: 'runrate_improvement',
    trigger: 'player_low_rr',
    screen: 'my_activity',
    placement: 'stat_label_rr',
    template: "You're consistent — try one extra today",
    priority: 5,
  },
  {
    id: 'rr-2',
    category: 'runrate_improvement',
    trigger: 'player_rr_below_team',
    screen: 'my_activity',
    placement: 'stat_label_rr',
    template: 'Team avg higher — push to match',
    priority: 7,
  },
  {
    id: 'rr-3',
    category: 'runrate_improvement',
    trigger: 'player_low_rr',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'One more activity can improve your Runrate',
    priority: 4,
  },
  {
    id: 'rr-4',
    category: 'runrate_improvement',
    trigger: 'top_teams_pushing_rr',
    screen: 'my_team',
    placement: 'momentum_insight',
    template: 'Top teams are pushing Runrate higher',
    priority: 5,
  },

  // =========================================================================
  // 7. BONDING & SOCIAL
  // =========================================================================

  {
    id: 'bond-1',
    category: 'bonding',
    trigger: 'general_team_context',
    screen: 'my_team',
    placement: 'team_strip',
    template: 'Cheer your teammates — it keeps energy high',
    priority: 3,
  },
  {
    id: 'bond-2',
    category: 'bonding',
    trigger: 'general_team_context',
    screen: 'my_team',
    placement: 'momentum_insight',
    template: 'Great teams support each other',
    priority: 2,
  },
  {
    id: 'bond-3',
    category: 'bonding',
    trigger: 'general_team_context',
    screen: 'my_team',
    placement: 'momentum_insight',
    template: 'Push together — win together',
    priority: 2,
  },

  // =========================================================================
  // 8. CAPTAIN AI MESSAGES — For motivate button
  // =========================================================================

  {
    id: 'cap-1',
    category: 'captain_messages',
    trigger: 'team_near_full_participation',
    screen: 'messages',
    placement: 'motivate_button',
    template: "Team — we're at {{teamParticipationPct}}% today.\nLet's get to 100% — just a few more to go.",
    priority: 8,
  },
  {
    id: 'cap-2',
    category: 'captain_messages',
    trigger: 'team_close_to_leader',
    screen: 'messages',
    placement: 'motivate_button',
    template: "We're just {{pointsBehindLeader}} points behind.\nIf everyone logs today, we can take the lead.",
    priority: 8,
  },
  {
    id: 'cap-3',
    category: 'captain_messages',
    trigger: 'general_team_context',
    screen: 'messages',
    placement: 'motivate_button',
    template: "Great effort so far — let's stay consistent and keep momentum.",
    priority: 5,
  },
  {
    id: 'cap-4',
    category: 'captain_messages',
    trigger: 'team_has_rr_advantage',
    screen: 'messages',
    placement: 'motivate_button',
    template: "We're close — improving Runrate today can make the difference.",
    priority: 6,
  },

  // =========================================================================
  // 9. LEADERBOARD SCREEN — Inline copy (already covered in competition)
  // =========================================================================

  {
    id: 'lb-1',
    category: 'leaderboard_screen',
    trigger: 'general_competition',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: 'Close competition — every activity counts',
    priority: 4,
  },
  {
    id: 'lb-2',
    category: 'leaderboard_screen',
    trigger: 'general_competition',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: 'This leaderboard can change today',
    priority: 3,
  },

  // =========================================================================
  // 10. FINAL DAY / END PHASE — Retention
  // =========================================================================

  // Urgency
  {
    id: 'final-1',
    category: 'final_day',
    trigger: 'is_final_week',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: 'Final days — this decides the winner',
    priority: 10,
  },
  {
    id: 'final-2',
    category: 'final_day',
    trigger: 'is_final_week',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'Last push — every activity matters now',
    priority: 9,
  },
  {
    id: 'final-3',
    category: 'final_day',
    trigger: 'is_final_week',
    screen: 'leaderboard',
    placement: 'leaderboard_cta',
    template: 'Finish strong for your team',
    priority: 9,
  },

  // Emotional close
  {
    id: 'final-4',
    category: 'final_day',
    trigger: 'is_last_day',
    screen: 'my_activity',
    placement: 'welcome_text',
    template: "You've come this far — finish it strong",
    priority: 10,
  },
  {
    id: 'final-5',
    category: 'final_day',
    trigger: 'is_last_day',
    screen: 'my_activity',
    placement: 'coach_insight',
    template: 'End on a high with your team',
    priority: 9,
  },
  {
    id: 'final-6',
    category: 'final_day',
    trigger: 'is_last_day',
    screen: 'my_team',
    placement: 'team_strip',
    template: 'Great journey — one final push',
    priority: 9,
  },
];
