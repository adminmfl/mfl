export type LeagueRole = 'host' | 'governor' | 'captain' | 'player';
export type LeagueStatus = 'draft' | 'launched' | 'active' | 'completed';

export interface LeagueBranding {
  display_name?: string;
  tagline?: string;
  primary_color?: string;
  logo_url?: string;
  powered_by_visible?: boolean;
}

export interface LeagueRRConfig {
  formula: 'standard' | 'simple' | 'points_only';
  base_duration?: number;
  distance_divisor?: number;
  steps_min?: number;
  steps_max?: number;
  age_adjustments?: boolean;
}

export interface LeagueWithRoles {
  league_id: string;
  name: string;
  description: string | null;
  status: LeagueStatus;
  start_date: string | null;
  end_date: string | null;
  num_teams: number;
  league_capacity: number;
  is_public: boolean;
  is_exclusive: boolean;
  invite_code: string | null;
  logo_url?: string | null;
  roles: LeagueRole[];
  team_id: string | null;
  team_name: string | null;
  team_logo_url: string | null;
  is_host: boolean;
  creator_name?: string | null;
  branding?: LeagueBranding | null;
  rr_config?: LeagueRRConfig | null;
  rest_days?: number;
}
