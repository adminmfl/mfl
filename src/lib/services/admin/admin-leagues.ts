/**
 * Admin Leagues Service
 * Handles all league CRUD operations for the admin panel
 */

import { getSupabaseServiceRole } from '@/lib/supabase/client';
import type {
  AdminLeague,
  AdminLeagueCreateInput,
  AdminLeagueUpdateInput,
  AdminLeagueFilters,
} from '@/types/admin';

function mapDbLeagueToAdminLeague(dbLeague: any): AdminLeague {
  if (!dbLeague) return dbLeague;
  return dbLeague as AdminLeague;
}

function mapAdminLeagueInputToDbUpdates(input: Partial<AdminLeagueCreateInput | AdminLeagueUpdateInput>): Record<string, any> {
  return { ...input };
}

/**
 * Generate a unique 8-character invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get all leagues with optional filters and member counts
 */
export async function getAllLeagues(filters?: AdminLeagueFilters): Promise<AdminLeague[]> {
  try {
    const supabase = getSupabaseServiceRole();

    // First get leagues
    let query = supabase
      .from('leagues')
      .select('*');

    // Apply filters
    if (filters?.search) {
      query = query.or(
        `league_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.is_active !== undefined && filters.is_active !== 'all') {
      query = query.eq('is_active', filters.is_active);
    }

    const { data: leagues, error } = await query;

    if (error) {
      console.error('Error fetching leagues:', error);
      return [];
    }

    if (!leagues || leagues.length === 0) {
      return [];
    }

    // Get member counts for all leagues
    const leagueIds = leagues.map((l) => l.league_id);
    const { data: memberCounts } = await supabase
      .from('leaguemembers')
      .select('league_id')
      .in('league_id', leagueIds);

    // Count members per league
    const countMap: Record<string, number> = {};
    (memberCounts || []).forEach((m) => {
      countMap[m.league_id] = (countMap[m.league_id] || 0) + 1;
    });

    // Get host user info for all leagues
    const hostIds = [...new Set(leagues.map((l) => l.created_by).filter(Boolean))];
    const hostMap: Record<string, { username: string; email: string; phone?: string | null }> = {};
    if (hostIds.length > 0) {
      const { data: hostUsers } = await supabase
        .from('users')
        .select('user_id, username, email, phone')
        .in('user_id', hostIds);
      (hostUsers || []).forEach((u: any) => {
        hostMap[u.user_id] = { username: u.username, email: u.email, phone: u.phone };
      });
    }

    return leagues.map((league) => {
      const host = league.created_by ? hostMap[league.created_by] : null;
      return mapDbLeagueToAdminLeague({
        ...league,
        member_count: countMap[league.league_id] || 0,
        host_name: host?.username || null,
        host_email: host?.email || null,
        host_phone: host?.phone || null,
      });
    });
  } catch (err) {
    console.error('Error in getAllLeagues:', err);
    return [];
  }
}

/**
 * Get a single league by ID
 */
export async function getLeagueById(leagueId: string): Promise<AdminLeague | null> {
  try {
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('league_id', leagueId)
      .single();

    if (error) {
      console.error('Error fetching league:', error);
      return null;
    }

    // Get member count
    const { count } = await supabase
      .from('leaguemembers')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    return mapDbLeagueToAdminLeague({
      ...data,
      member_count: count || 0,
    });
  } catch (err) {
    console.error('Error in getLeagueById:', err);
    return null;
  }
}

/**
 * Create a new league
 */
export async function createLeague(
  input: AdminLeagueCreateInput,
  createdBy?: string
): Promise<AdminLeague | null> {
  try {
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('leagues')
      .insert({
        league_name: input.league_name,
        description: input.description || null,
        start_date: input.start_date,
        end_date: input.end_date,
        num_teams: input.num_teams || 4,
        tier_id: input.tier_id || null,
        rest_days: input.rest_days ?? 18,
        auto_rest_day_enabled: input.auto_rest_day_enabled ?? false,
        normalize_points_by_team_size: input.normalize_points_by_team_size ?? false,
        is_public: input.is_public || false,
        is_exclusive: input.is_exclusive ?? true,
        invite_code: generateInviteCode(),
        status: 'draft',
        is_active: true,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating league:', error);
      return null;
    }

    return mapDbLeagueToAdminLeague({ ...data, member_count: 0 });
  } catch (err) {
    console.error('Error in createLeague:', err);
    return null;
  }
}

/**
 * Update an existing league
 */
export async function updateLeague(
  leagueId: string,
  input: AdminLeagueUpdateInput,
  modifiedBy?: string
): Promise<AdminLeague | null> {
  try {
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('leagues')
      .update({
        ...mapAdminLeagueInputToDbUpdates(input),
        modified_by: modifiedBy || null,
        modified_date: new Date().toISOString(),
      })
      .eq('league_id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating league:', error);
      return null;
    }

    // Get member count
    const { count } = await supabase
      .from('leaguemembers')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    return mapDbLeagueToAdminLeague({
      ...data,
      member_count: count || 0,
    });
  } catch (err) {
    console.error('Error in updateLeague:', err);
    return null;
  }
}

/**
 * Soft delete a league (set is_active = false)
 */
export async function softDeleteLeague(
  leagueId: string,
  modifiedBy?: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRole();
    const { error } = await supabase
      .from('leagues')
      .update({
        is_active: false,
        modified_by: modifiedBy || null,
        modified_date: new Date().toISOString(),
      })
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error soft deleting league:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in softDeleteLeague:', err);
    return false;
  }
}

/**
 * Get league statistics for dashboard
 */
export async function getLeagueStats(): Promise<{
  total: number;
  active: number;
  draft: number;
  completed: number;
  newThisMonth: number;
}> {
  try {
    const supabase = getSupabaseServiceRole();

    // Get total leagues
    const { count: total } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get active leagues
    const { count: active } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_active', true);

    // Get draft leagues
    const { count: draft } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft')
      .eq('is_active', true);

    // Get completed leagues
    const { count: completed } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('is_active', true);

    // Get leagues created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
      .gte('created_date', startOfMonth.toISOString());

    return {
      total: total || 0,
      active: active || 0,
      draft: draft || 0,
      completed: completed || 0,
      newThisMonth: newThisMonth || 0,
    };
  } catch (err) {
    console.error('Error in getLeagueStats:', err);
    return { total: 0, active: 0, draft: 0, completed: 0, newThisMonth: 0 };
  }
}
