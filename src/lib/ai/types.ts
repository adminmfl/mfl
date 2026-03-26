// ============================================================================
// AI Insight System — Types
// ============================================================================

/** Summarized context for a player in a league — used by trigger evaluator */
export interface PlayerInsightContext {
  // Identity
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamName: string | null;
  leagueId: string;

  // Player stats
  playerPoints: number;
  playerAvgRR: number | null;
  playerRank: number | null; // individual rank
  missedDays: number;
  restDaysUsed: number;
  restDaysAllowed: number;
  consecutiveDaysActive: number;
  hasLoggedToday: boolean;

  // Team stats
  teamPoints: number;
  teamAvgRR: number | null;
  teamRank: number | null;
  teamParticipationPct: number; // 0-100, today's participation
  teamMembersLogged: number; // how many logged today
  teamTotalMembers: number;
  teamMembersRemaining: number; // teamTotalMembers - teamMembersLogged

  // Competition
  rankDelta: number; // distance from #1 team (0 = leading)
  pointsBehindLeader: number;
  isLeading: boolean;

  // League timeline
  leagueDay: number; // which day of the league (1-based)
  totalLeagueDays: number;
  isFinalWeek: boolean;
  isLastDay: boolean;
  leagueStatus: 'draft' | 'launched' | 'active' | 'completed';

  // Feature flags
  hasAnyMeasurementActivity: boolean;
}

/** Screen where an insight can appear */
export type InsightScreen = 'my_activity' | 'my_team' | 'leaderboard' | 'messages';

/** Placement slot within a screen */
export type InsightPlacement =
  | 'welcome_text'
  | 'coach_insight'
  | 'stat_label_rr'
  | 'stat_label_missed'
  | 'team_strip'
  | 'momentum_insight'
  | 'leader_badge'
  | 'leaderboard_cta'
  | 'team_row_tag'
  | 'motivate_button';

/** Copy category from client's library */
export type CopyCategory =
  | 'participation'
  | 'leader_activation'
  | 'team_momentum'
  | 'competition'
  | 'rest_day_risk'
  | 'runrate_improvement'
  | 'bonding'
  | 'captain_messages'
  | 'leaderboard_screen'
  | 'final_day';

/** A copy template definition */
export interface CopyTemplate {
  id: string;
  category: CopyCategory;
  trigger: string;
  screen: InsightScreen;
  placement: InsightPlacement;
  template: string; // with {{placeholders}}
  priority: number; // higher = more important
}

/** Result from trigger evaluation */
export interface TriggeredInsight {
  text: string;
  category: CopyCategory;
  placement: InsightPlacement;
  priority: number;
  templateId: string;
}
