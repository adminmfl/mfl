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

// ============================================================================
// V2.5 — AI League Manager Types
// ============================================================================

/** Per-member activity snapshot for league health evaluation */
export interface MemberSnapshot {
  userId: string;
  username: string;
  teamId: string | null;
  teamName: string | null;
  totalPoints: number;
  avgRR: number | null;
  missedDays: number;
  restDaysUsed: number;
  restDaysAllowed: number;
  consecutiveDaysActive: number;
  consecutiveDaysInactive: number;
  hasLoggedToday: boolean;
  lastActivityDate: string | null;
  streakBroken: boolean;
  rrTrend: 'improving' | 'stable' | 'declining' | null;
}

/** Per-team health summary */
export interface TeamHealthSummary {
  teamId: string;
  teamName: string;
  rank: number;
  totalPoints: number;
  avgRR: number | null;
  memberCount: number;
  membersLoggedToday: number;
  todayParticipationPct: number;
  inactiveMembers: string[]; // userIds
  atRiskMembers: string[]; // userIds
}

/** Active challenge info for digest evaluation */
export interface ActiveChallengeInfo {
  challengeId: string;
  name: string;
  type: string;
  daysRemaining: number;
  submissionCount: number;
  totalMembers: number;
}

/** Full league health context — input to digest evaluator */
export interface LeagueHealthContext {
  leagueId: string;
  leagueName: string;
  leagueDay: number;
  totalLeagueDays: number;
  isFinalWeek: boolean;
  isLastDay: boolean;
  teams: TeamHealthSummary[];
  allMembers: MemberSnapshot[];
  overallParticipationPct: number;
  activeChallenges: ActiveChallengeInfo[];
}

// --- Digest Types ---

export type DigestCategory =
  | 'participation_drop'
  | 'inactive_members'
  | 'streak_alert'
  | 'team_imbalance'
  | 'challenge_ending'
  | 'rr_anomaly'
  | 'league_health'
  | 'milestone';

export interface DigestCandidate {
  category: DigestCategory;
  title: string;
  body: string;
  priority: number; // 1-10
  metadata: Record<string, any>;
  actionType?: string;
  actionPayload?: Record<string, any>;
}

// --- Intervention Types ---

export type InterventionTriggerType =
  | 'inactivity_5d'
  | 'inactivity_3d'
  | 'streak_broken'
  | 'rr_declining'
  | 'rest_days_exhausted'
  | 'dropout_risk';

export type InterventionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface InterventionCandidate {
  memberUserId: string;
  teamId: string | null;
  triggerType: InterventionTriggerType;
  severity: InterventionSeverity;
  title: string;
  description: string;
  suggestedAction: string;
  playerContext: Record<string, any>;
}

// --- Draft Types ---

export type DraftType = 'nudge' | 'team_nudge' | 'announcement' | 'intervention' | 'challenge_hype' | 'challenge_results';
export type DraftStatus = 'pending' | 'edited' | 'sent' | 'dismissed';
export type DraftTargetScope = 'league' | 'team' | 'individual';

// --- Challenge Template Types ---

export interface ChallengeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultDuration: number;
  commSchedule: ChallengeCommItem[];
  isActive: boolean;
}

export interface ChallengeCommItem {
  dayOffset: number;
  type: DraftType;
  promptHint: string;
}
