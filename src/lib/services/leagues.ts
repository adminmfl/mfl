/**
 * League Service Layer
 * Handles all league CRUD operations and queries.
 * Centralizes DB logic to avoid duplication across API routes and components.
 */

import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getTeamsForLeague } from '@/lib/services/teams';
import { TierPricingService } from '@/lib/services/tier-pricing';

export interface LeagueInput {
  league_name: string;
  description?: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  tier_id?: string; // references league_tiers
  tier_snapshot?: Record<string, any>; // Frozen tier config at creation time
  num_teams?: number;
  max_participants?: number;
  rest_days?: number;
  rr_config?: { formula: string };
  auto_rest_day_enabled?: boolean;
  normalize_points_by_team_size?: boolean;
  is_public?: boolean;
  is_exclusive?: boolean;
  max_team_capacity?: number;
  price_paid?: number;
  payment_status?: 'pending' | 'completed' | 'failed';
}

export interface League extends LeagueInput {
  league_id: string;
  status:
    | 'draft'
    | 'payment_pending'
    | 'scheduled'
    | 'active'
    | 'ended'
    | 'completed'
    | 'cancelled'
    | 'abandoned';
  is_active: boolean;
  invite_code: string | null;
  logo_url?: string | null;
  rules_summary?: string | null;
  rules_doc_url?: string | null;
  created_by: string;
  created_date: string;
  modified_by: string;
  modified_date: string;
  max_team_capacity?: number; // Configurable limit (default 10)
  league_capacity?: number; // Derived from tier
}

function mapDbLeagueToLeague(dbLeague: any): League {
  if (!dbLeague) return dbLeague;
  return dbLeague as League;
}

function mapLeagueInputToDbUpdates(
  input: Partial<LeagueInput>,
): Record<string, any> {
  return { ...input };
}

/**
 * Derive a UI-friendly status from stored status and schedule dates.
 * Returns the derived status plus a flag indicating if we should persist it
 * back to the DB (we only persist when transitioning to 'completed').
 */
export function deriveLeagueStatus(league: {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}): { derivedStatus: string; shouldPersist: boolean } {
  // Use current timestamp for precise cutoff check
  const now = new Date();

  // Parse dates as UTC midnight to match the logic used in submission/upsert
  const parseUtcMidnight = (ymd?: string | null): Date | null => {
    if (!ymd) return null;
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(String(ymd));
    if (!m) return null;
    const [y, mo, d] = String(ymd)
      .split('-')
      .map((p) => Number(p));
    if (!y || !mo || !d) return null;
    return new Date(Date.UTC(y, mo - 1, d));
  };

  const startDt = parseUtcMidnight(league?.start_date || null);
  const endDt = parseUtcMidnight(league?.end_date || null);

  const rawStatus = String(league?.status || 'draft').toLowerCase();
  let derivedStatus = rawStatus;

  if (derivedStatus !== 'draft') {
    if (startDt && endDt) {
      // Calculate Cutoff: UTC Midnight of EndDate + 33 hours (Grace period)
      // This matches the logic in /api/entries/upsert/route.ts
      const cutoff = new Date(endDt);
      cutoff.setHours(cutoff.getHours() + 33);

      if (now.getTime() > cutoff.getTime()) {
        derivedStatus = 'completed';
      } else if (
        now.getTime() >= startDt.getTime() &&
        now.getTime() <= cutoff.getTime()
      ) {
        // Active if within start and cutoff
        derivedStatus = 'active';
      } else if (now.getTime() < startDt.getTime()) {
        // Keep scheduled/payment_pending as-is (don't convert to launched)
      }
    } else if (endDt) {
      // Legacy check or missing start date?
      const cutoff = new Date(endDt);
      cutoff.setHours(cutoff.getHours() + 33);
      if (now.getTime() > cutoff.getTime()) {
        derivedStatus = 'completed';
      }
    }
  }

  if (
    !['draft', 'scheduled', 'payment_pending', 'active', 'completed'].includes(
      derivedStatus,
    )
  ) {
    // Basic normalization
    if (derivedStatus === 'ended') derivedStatus = 'completed';
  }

  return {
    derivedStatus,
    shouldPersist: derivedStatus === 'completed' && rawStatus !== 'completed',
  };
}

/**
 * Persist a derived status back to the DB when appropriate.
 * Currently only writes when moving into 'completed'.
 */
export async function persistLeagueStatusIfNeeded(
  leagueId: string,
  currentStatus: string | null,
  derivedStatus: string,
): Promise<boolean> {
  const normalizedCurrent = String(currentStatus || '').toLowerCase();
  if (derivedStatus !== 'completed' || normalizedCurrent === 'completed')
    return false;

  const { error } = await getSupabaseServiceRole()
    .from('leagues')
    .update({ status: derivedStatus, modified_date: new Date().toISOString() })
    .eq('league_id', leagueId);

  if (error) {
    console.error(`Failed to persist league status for ${leagueId}:`, error);
    return false;
  }

  return true;
}

/**
 * Generate a unique 8-character invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new league
 * @param userId - User ID (will be set as host)
 * @param data - League creation data
 * @returns Created league object
 */
export async function createLeague(
  userId: string,
  data: LeagueInput,
): Promise<League | null> {
  try {
    const supabase = getSupabaseServiceRole();

    // Determine initial status based on start date
    const startDate = new Date(data.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    // Default to 'scheduled' if start date is in the future, 'active' if today or past
    const initialStatus = startDate > today ? 'scheduled' : 'active';

    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        league_name: data.league_name,
        description: data.description || null,
        start_date: data.start_date,
        end_date: data.end_date,
        tier_id: data.tier_id || null,
        tier_snapshot: data.tier_snapshot || {},
        num_teams: data.num_teams || 4,
        rest_days: data.rest_days ?? 1,
        rr_config: data.rr_config || { formula: 'standard' },
        auto_rest_day_enabled: data.auto_rest_day_enabled ?? true,
        normalize_points_by_team_size:
          data.normalize_points_by_team_size ?? true,
        is_public: data.is_public || false,
        is_exclusive: data.is_exclusive ?? true,
        max_team_capacity: data.max_team_capacity || 10,
        invite_code: generateInviteCode(),
        status: initialStatus,
        created_by: userId,
        price_paid: data.price_paid || null,
        payment_status: data.payment_status || 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating league:', error);
      return null;
    }

    // Create league membership for the creator
    if (league) {
      const { error: memberError } = await supabase
        .from('leaguemembers')
        .insert({
          user_id: userId,
          league_id: league.league_id,
          created_by: userId,
        });

      if (memberError) {
        console.error('Error creating league membership:', memberError);
      }

      // Fetch both host and player roles
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('role_id, role_name')
        .in('role_name', ['host', 'player']);

      if (rolesError || !roles || roles.length === 0) {
        console.error('Error fetching roles:', rolesError);
      } else {
        // Assign both host + player roles (per PRD: Host is also a Player)
        const roleInserts = roles.map((role) => ({
          league_id: league.league_id,
          user_id: userId,
          role_id: role.role_id,
          created_by: userId,
        }));

        const { error: assignError } = await supabase
          .from('assignedrolesforleague')
          .insert(roleInserts);

        if (assignError) {
          console.error('Error assigning roles:', assignError);
        }
      }
    }

    return mapDbLeagueToLeague(league);
  } catch (err) {
    console.error('League creation error:', err);
    return null;
  }
}

/**
 * Get a single league by ID
 * @param leagueId - League ID
 * @returns League object or null
 */
export async function getLeagueById(leagueId: string): Promise<League | null> {
  try {
    const supabase = getSupabaseServiceRole();

    // Fetch league with specific columns to avoid large payloads
    const { data, error } = await supabase
      .from('leagues')
      .select(
        'league_id, league_name, description, status, start_date, end_date, num_teams, tier_id, is_public, is_exclusive, invite_code, created_by, logo_url, branding, rr_config, rest_days, tier_snapshot',
      )
      .eq('league_id', leagueId)
      .single();

    if (error || !data) return null;

    // Calculate league_capacity from tier_snapshot or fallback
    let leagueCapacity = 40;

    if (data.tier_snapshot && typeof data.tier_snapshot === 'object') {
      // @ts-ignore
      const snapshotMax = data.tier_snapshot.max_participants;
      if (snapshotMax) {
        leagueCapacity = Number(snapshotMax);
      }
    }

    let creatorName: string | null = null;
    if (data.created_by) {
      const { data: creatorData } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', data.created_by)
        .single();

      creatorName = creatorData?.username ?? null;
    }

    // Count league members
    const { count: memberCount } = await supabase
      .from('leaguemembers')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    const leagueWithCapacity = {
      ...data,
      league_capacity: leagueCapacity,
      creator_name: creatorName,
      member_count: memberCount ?? 0,
    };

    // Derive the status for UI and persist completion back to DB when needed.
    const { derivedStatus, shouldPersist } =
      deriveLeagueStatus(leagueWithCapacity);

    if (shouldPersist) {
      await persistLeagueStatusIfNeeded(
        leagueWithCapacity.league_id,
        leagueWithCapacity.status,
        derivedStatus,
      );
    }

    // Return league with possibly overridden status for UI consumers.
    return mapDbLeagueToLeague({
      ...leagueWithCapacity,
      status: derivedStatus,
    });
  } catch (err) {
    console.error('Error fetching league:', err);
    return null;
  }
}

/**
 * Update league logo URL (host only)
 */
export async function updateLeagueLogoUrl(
  leagueId: string,
  userId: string,
  logoUrl: string | null,
): Promise<boolean> {
  try {
    const role = await getUserRoleInLeague(userId, leagueId);
    if (role !== 'host') {
      return false;
    }

    const { error } = await getSupabaseServiceRole()
      .from('leagues')
      .update({
        logo_url: logoUrl,
        modified_by: userId,
        modified_date: new Date().toISOString(),
      })
      .eq('league_id', leagueId);

    return !error;
  } catch (err) {
    console.error('Error updating league logo:', err);
    return false;
  }
}

/**
 * Update league rules document URL (host or governor)
 */
export async function updateLeagueRulesDocUrl(
  leagueId: string,
  userId: string,
  rulesDocUrl: string | null,
): Promise<boolean> {
  try {
    const role = await getUserRoleInLeague(userId, leagueId);
    if (role !== 'host' && role !== 'governor') {
      return false;
    }

    const { error } = await getSupabaseServiceRole()
      .from('leagues')
      .update({
        rules_doc_url: rulesDocUrl,
        modified_by: userId,
        modified_date: new Date().toISOString(),
      })
      .eq('league_id', leagueId);

    return !error;
  } catch (err) {
    console.error('Error updating league rules doc:', err);
    return false;
  }
}

/**
 * Update league rules summary (host or governor)
 */
export async function updateLeagueRulesSummary(
  leagueId: string,
  userId: string,
  rulesSummary: string | null,
): Promise<boolean> {
  try {
    const role = await getUserRoleInLeague(userId, leagueId);
    if (role !== 'host' && role !== 'governor') {
      return false;
    }

    const { error } = await getSupabaseServiceRole()
      .from('leagues')
      .update({
        rules_summary: rulesSummary,
        modified_by: userId,
        modified_date: new Date().toISOString(),
      })
      .eq('league_id', leagueId);

    return !error;
  } catch (err) {
    console.error('Error updating league rules summary:', err);
    return false;
  }
}

/**
 * Get all leagues for a user
 * @param userId - User ID
 * @returns Array of leagues the user is a member of
 */
export async function getLeaguesForUser(userId: string): Promise<League[]> {
  try {
    const { data, error } = await getSupabaseServiceRole()
      .from('leaguemembers')
      .select(
        'league_id, leagues(league_id, league_name, description, status, start_date, end_date, logo_url)',
      )
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user leagues:', error);
      return [];
    }

    // Extract and deduplicate leagues (user may have multiple roles)
    const leaguesMap = new Map<string, League>();
    (data || []).forEach((row: any) => {
      if (row.leagues) {
        const league = mapDbLeagueToLeague(row.leagues);
        leaguesMap.set(league.league_id, league);
      }
    });

    return Array.from(leaguesMap.values());
  } catch (err) {
    console.error('Error fetching user leagues:', err);
    return [];
  }
}

/**
 * Update a league
 * @param leagueId - League ID
 * @param userId - User ID (must be host to update)
 * @param data - Partial league data to update
 * @returns Updated league or null
 */
export async function updateLeague(
  leagueId: string,
  userId: string,
  data: Partial<LeagueInput>,
): Promise<League | null> {
  try {
    // Verify user is host
    const league = await getLeagueById(leagueId);
    if (!league) return null;

    const userRole = await getUserRoleInLeague(userId, leagueId);
    if (userRole !== 'host') {
      console.error('User is not host of league');
      return null;
    }

    const isDraft = league.status === 'draft';

    // Only allow a restricted set of fields once the league is launched/active
    const allowedUpdates: Partial<LeagueInput> = {};

    if (isDraft) {
      Object.assign(allowedUpdates, data);
    } else if (league.status === 'launched' || league.status === 'active') {
      if (data.rest_days !== undefined)
        allowedUpdates.rest_days = data.rest_days;
      if (data.auto_rest_day_enabled !== undefined) {
        allowedUpdates.auto_rest_day_enabled = data.auto_rest_day_enabled;
      }
      if (data.normalize_points_by_team_size !== undefined) {
        allowedUpdates.normalize_points_by_team_size =
          data.normalize_points_by_team_size;
      }
      if (data.max_team_capacity !== undefined) {
        allowedUpdates.max_team_capacity = data.max_team_capacity;
      }
      if (data.description !== undefined)
        allowedUpdates.description = data.description;
      // RR config and branding are always editable for active leagues
      if ((data as any).rr_config !== undefined)
        (allowedUpdates as any).rr_config = (data as any).rr_config;
      if ((data as any).branding !== undefined)
        (allowedUpdates as any).branding = (data as any).branding;
      // League name is always editable (league_id stays constant)
      if (data.league_name !== undefined)
        allowedUpdates.league_name = data.league_name;
      // Allow date edits if the date hasn't passed yet
      const today = new Date().toISOString().slice(0, 10);
      if (data.start_date !== undefined) {
        const currentStart = league.start_date;
        if (!currentStart || currentStart >= today) {
          allowedUpdates.start_date = data.start_date;
        }
      }
      if (data.end_date !== undefined) {
        const currentEnd = league.end_date;
        if (!currentEnd || currentEnd >= today) {
          allowedUpdates.end_date = data.end_date;
        }
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      console.error('No updatable fields for current league status');
      return null;
    }

    const { data: updated, error } = await getSupabaseServiceRole()
      .from('leagues')
      .update({
        ...mapLeagueInputToDbUpdates(allowedUpdates),
        modified_by: userId,
        modified_date: new Date().toISOString(),
      })
      .eq('league_id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating league:', error);
      return null;
    }

    return mapDbLeagueToLeague(updated);
  } catch (err) {
    console.error('Error updating league:', err);
    return null;
  }
}

/**
 * Delete a league (host only, before launch)
 * @param leagueId - League ID
 * @param userId - User ID (must be host)
 * @returns Success boolean
 */
export async function deleteLeague(
  leagueId: string,
  userId: string,
): Promise<boolean> {
  try {
    const league = await getLeagueById(leagueId);
    if (!league) return false;

    const userRole = await getUserRoleInLeague(userId, leagueId);
    if (userRole !== 'host') {
      console.error('User is not host of league');
      return false;
    }

    if (league.status !== 'draft') {
      console.error('Cannot delete league after launch');
      return false;
    }

    const { error } = await getSupabaseServiceRole()
      .from('leagues')
      .delete()
      .eq('league_id', leagueId);

    return !error;
  } catch (err) {
    console.error('Error deleting league:', err);
    return false;
  }
}

/**
 * Launch a league (change status from draft to launched)
 * @param leagueId - League ID
 * @param userId - User ID (must be host)
 * @returns Updated league or null
 */
export async function launchLeague(
  leagueId: string,
  userId: string,
): Promise<League | null> {
  try {
    const league = await getLeagueById(leagueId);
    if (!league) return null;

    const userRole = await getUserRoleInLeague(userId, leagueId);
    if (userRole !== 'host') {
      console.error('User is not host of league');
      return null;
    }

    const { data, error } = await getSupabaseServiceRole()
      .from('leagues')
      .update({
        status: 'launched',
        modified_by: userId,
        modified_date: new Date().toISOString(),
      })
      .eq('league_id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error launching league:', error);
      return null;
    }

    return data as League;
  } catch (err) {
    console.error('Error launching league:', err);
    return null;
  }
}

/**
 * Get user's role in a specific league
 * @param userId - User ID
 * @param leagueId - League ID
 * @returns Role name or null if user is not a member
 */
export async function getUserRoleInLeague(
  userId: string,
  leagueId: string,
): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseServiceRole()
      .from('assignedrolesforleague')
      .select('roles(role_name)')
      .eq('user_id', userId)
      .eq('league_id', leagueId);

    if (error || !data || data.length === 0) return null;

    const roleNames = (data as any[])
      .map((row) => row.roles?.role_name)
      .filter(Boolean) as string[];

    if (roleNames.includes('host')) return 'host';
    if (roleNames.includes('governor')) return 'governor';
    if (roleNames.includes('captain')) return 'captain';
    if (roleNames.includes('player')) return 'player';
    return roleNames[0] || null;
  } catch (err) {
    console.error('Error fetching user role:', err);
    return null;
  }
}

/**
 * Get all roles assigned to a user in a league
 * @param userId - User ID
 * @param leagueId - League ID
 * @returns Array of role names
 */
export async function getUserRolesInLeague(
  userId: string,
  leagueId: string,
): Promise<string[]> {
  try {
    const { data, error } = await getSupabaseServiceRole()
      .from('assignedrolesforleague')
      .select('roles(role_name)')
      .eq('user_id', userId)
      .eq('league_id', leagueId);

    if (error) return [];
    return (data || []).map((row: any) => row.roles?.role_name).filter(Boolean);
  } catch (err) {
    console.error('Error fetching user roles:', err);
    return [];
  }
}

/**
 * Assign a role to a user in a league
 * @param userId - User ID
 * @param leagueId - League ID
 * @param roleName - Role name (e.g., 'host', 'governor', 'captain', 'player')
 * @param assignedBy - User ID of who is assigning the role
 * @returns Success boolean
 */
export async function assignRoleToUser(
  userId: string,
  leagueId: string,
  roleName: string,
  assignedBy: string,
): Promise<boolean> {
  try {
    // Get role_id from role_name
    const { data: roleData, error: roleError } = await getSupabaseServiceRole()
      .from('roles')
      .select('role_id')
      .eq('role_name', roleName)
      .single();

    if (roleError || !roleData) {
      console.error('Role not found:', roleName);
      return false;
    }

    // Check if assignment already exists
    const { data: existing } = await getSupabaseServiceRole()
      .from('assignedrolesforleague')
      .select('id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .eq('role_id', roleData.role_id)
      .maybeSingle();

    if (existing) {
      // Already assigned
      return true;
    }

    const { error } = await getSupabaseServiceRole()
      .from('assignedrolesforleague')
      .insert({
        user_id: userId,
        league_id: leagueId,
        role_id: roleData.role_id,
        created_by: assignedBy,
      });

    return !error;
  } catch (err) {
    console.error('Error assigning role:', err);
    return false;
  }
}

/**
 * Remove a role from a user in a league
 * @param userId - User ID
 * @param leagueId - League ID
 * @param roleName - Role name
 * @returns Success boolean
 */
export async function removeRoleFromUser(
  userId: string,
  leagueId: string,
  roleName: string,
): Promise<boolean> {
  try {
    const { data: roleData, error: roleError } = await getSupabaseServiceRole()
      .from('roles')
      .select('role_id')
      .eq('role_name', roleName)
      .single();

    if (roleError || !roleData) return false;

    const { error } = await getSupabaseServiceRole()
      .from('assignedrolesforleague')
      .delete()
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .eq('role_id', roleData.role_id);

    return !error;
  } catch (err) {
    console.error('Error removing role:', err);
    return false;
  }
}
