// ============================================================================
// AI Manager — Shared Types
// ============================================================================

export interface DigestItem {
  id: string;
  category: string;
  title: string;
  body: string;
  priority: number;
  status: string;
  action_type?: string;
  action_payload?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Draft {
  id: string;
  type: string;
  target_scope: string;
  target_id?: string;
  content: string;
  status: string;
  created_at: string;
  sent_at?: string;
}

export interface Intervention {
  id: string;
  member_user_id: string;
  team_id?: string;
  trigger_type: string;
  severity: string;
  title: string;
  description: string;
  suggested_action: string;
  player_context?: Record<string, any>;
  status: string;
  created_at: string;
}

export interface ChallengeTemplate {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  duration_days: number;
  total_points: number;
  comm_templates?: any[];
  rules?: { rule_text: string; is_mandatory: boolean }[];
  scoring_logic?: Record<string, any>;
}

export interface ActiveChallenge {
  id: string;
  name: string;
  challenge_type: string;
  status: string;
  end_date?: string;
}

// ============================================================================
// Severity / Priority Color Helpers
// ============================================================================

export const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export const priorityColor = (p: number): string => {
  if (p >= 8) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  if (p >= 6) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  if (p >= 4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
};
