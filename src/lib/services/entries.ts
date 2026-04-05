/**
 * Entries Service Layer
 * Handles workout submissions, validation, and entry queries.
 */

import { getSupabase } from '@/lib/supabase/client';

export interface EffortEntry {
  id: string;
  league_member_id: string;
  date: string; // YYYY-MM-DD
  type: 'workout' | 'rest';
  workout_type?: string;
  duration?: number;
  distance?: number;
  steps?: number;
  holes?: number;
  rr_value?: number;
  status: 'pending' | 'approved' | 'rejected';
  proof_url?: string;
  created_by: string;
  created_date: string;
  modified_by: string;
  modified_date: string;
}

/**
 * Submit a workout entry
 * @param leagueMemberId - League member ID (submitter)
 * @param data - Workout data
 * @param submittedBy - User ID submitting
 * @returns Created entry or null
 */
export async function submitWorkout(
  leagueMemberId: string,
  data: {
    date: string;
    type: 'workout' | 'rest';
    workout_type?: string;
    duration?: number;
    distance?: number;
    steps?: number;
    holes?: number;
    rr_value?: number;
    proof_url?: string;
  },
  submittedBy: string
): Promise<EffortEntry | null> {
  try {
    // Check for duplicate submission (same date, user, type)
    const member = await getSupabase()
      .from('leaguemembers')
      .select('user_id')
      .eq('league_member_id', leagueMemberId)
      .single();

    if (member.error || !member.data) {
      console.error('Invalid league member');
      return null;
    }

    let existingQuery = getSupabase()
      .from('effortentry')
      .select('id')
      .eq('league_member_id', leagueMemberId)
      .eq('date', data.date)
      .eq('type', data.type);

    // For workouts, scope by workout_type so different activities on same day don't conflict
    if (data.type === 'workout' && data.workout_type) {
      existingQuery = existingQuery.eq('workout_type', data.workout_type);
    }

    const existing = await existingQuery.maybeSingle();

    if (existing.data) {
      console.warn('Duplicate submission for this date/type');
      // Update existing instead
      const updated = await updateEntry(existing.data.id, data, submittedBy);
      return updated;
    }

    const { data: entry, error } = await getSupabase()
      .from('effortentry')
      .insert({
        league_member_id: leagueMemberId,
        date: data.date,
        type: data.type,
        workout_type: data.workout_type,
        duration: data.duration,
        distance: data.distance,
        steps: data.steps,
        holes: data.holes,
        rr_value: data.rr_value,
        proof_url: data.proof_url,
        status: 'pending',
        created_by: submittedBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting workout:', error);
      return null;
    }

    return entry as EffortEntry;
  } catch (err) {
    console.error('Error in submitWorkout:', err);
    return null;
  }
}

/**
 * Get entries for a league
 * @param leagueId - League ID
 * @param opts - Optional filters
 * @returns Array of entries
 */
export async function getEntriesForLeague(
  leagueId: string,
  opts?: {
    status?: 'pending' | 'approved' | 'rejected';
    dateRange?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }
): Promise<EffortEntry[]> {
  try {
    let query = getSupabase()
      .from('effortentry')
      .select(
        `
        *,
        leaguemembers!inner(league_id)
      `
      )
      .eq('leaguemembers.league_id', leagueId);

    if (opts?.status) {
      query = query.eq('status', opts.status);
    }

    if (opts?.dateRange) {
      query = query
        .gte('date', opts.dateRange.start)
        .lte('date', opts.dateRange.end);
    }

    query = query.order('date', { ascending: false });

    if (opts?.limit) {
      query = query.limit(opts.limit);
    }

    if (opts?.offset) {
      query = query.range(opts.offset, opts.offset + (opts.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching league entries:', error);
      return [];
    }

    return data as EffortEntry[];
  } catch (err) {
    console.error('Error in getEntriesForLeague:', err);
    return [];
  }
}

/**
 * Get entries for a specific team
 * @param teamId - Team ID
 * @param opts - Optional filters
 * @returns Array of entries
 */
export async function getEntriesForTeam(
  teamId: string,
  opts?: {
    status?: 'pending' | 'approved' | 'rejected';
    dateRange?: { start: string; end: string };
  }
): Promise<EffortEntry[]> {
  try {
    let query = getSupabase()
      .from('effortentry')
      .select(
        `
        *,
        leaguemembers!inner(team_id)
      `
      )
      .eq('leaguemembers.team_id', teamId);

    if (opts?.status) {
      query = query.eq('status', opts.status);
    }

    if (opts?.dateRange) {
      query = query
        .gte('date', opts.dateRange.start)
        .lte('date', opts.dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching team entries:', error);
      return [];
    }

    return data as EffortEntry[];
  } catch (err) {
    console.error('Error in getEntriesForTeam:', err);
    return [];
  }
}

/**
 * Get entries for a specific member
 * @param leagueMemberId - League member ID
 * @param opts - Optional filters
 * @returns Array of entries
 */
export async function getEntriesForMember(
  leagueMemberId: string,
  opts?: {
    status?: 'pending' | 'approved' | 'rejected';
    dateRange?: { start: string; end: string };
  }
): Promise<EffortEntry[]> {
  try {
    let query = getSupabase()
      .from('effortentry')
      .select('*')
      .eq('league_member_id', leagueMemberId);

    if (opts?.status) {
      query = query.eq('status', opts.status);
    }

    if (opts?.dateRange) {
      query = query
        .gte('date', opts.dateRange.start)
        .lte('date', opts.dateRange.end);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching member entries:', error);
      return [];
    }

    return data as EffortEntry[];
  } catch (err) {
    console.error('Error in getEntriesForMember:', err);
    return [];
  }
}

/**
 * Get a single entry by ID
 * @param entryId - Entry ID
 * @returns Entry or null
 */
export async function getEntry(entryId: string): Promise<EffortEntry | null> {
  try {
    const { data, error } = await getSupabase()
      .from('effortentry')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error) return null;
    return data as EffortEntry;
  } catch (err) {
    console.error('Error in getEntry:', err);
    return null;
  }
}

/**
 * Update an entry
 * @param entryId - Entry ID
 * @param data - Partial data to update
 * @param modifiedBy - User ID making the change
 * @returns Updated entry or null
 */
export async function updateEntry(
  entryId: string,
  data: Partial<Omit<EffortEntry, 'id' | 'created_by' | 'created_date'>>,
  modifiedBy: string
): Promise<EffortEntry | null> {
  try {
    const { data: updated, error } = await getSupabase()
      .from('effortentry')
      .update({
        ...data,
        modified_by: modifiedBy,
        modified_date: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating entry:', error);
      return null;
    }

    return updated as EffortEntry;
  } catch (err) {
    console.error('Error in updateEntry:', err);
    return null;
  }
}

/**
 * Validate (approve/reject) an entry
 * @param entryId - Entry ID
 * @param status - 'approved' or 'rejected'
 * @param validatedBy - User ID validating
 * @returns Updated entry or null
 */
export async function validateEntry(
  entryId: string,
  status: 'approved' | 'rejected',
  validatedBy: string
): Promise<EffortEntry | null> {
  return updateEntry(
    entryId,
    {
      status,
    },
    validatedBy
  );
}

/**
 * Count pending entries for a league
 * @param leagueId - League ID
 * @returns Pending entry count
 */
export async function countPendingEntriesForLeague(leagueId: string): Promise<number> {
  try {
    const { count, error } = await getSupabase()
      .from('effortentry')
      .select(
        `
        id,
        leaguemembers!inner(league_id)
      `,
        { count: 'exact', head: true }
      )
      .eq('leaguemembers.league_id', leagueId)
      .eq('status', 'pending');

    return count ?? 0;
  } catch (err) {
    console.error('Error in countPendingEntriesForLeague:', err);
    return 0;
  }
}

/**
 * Count approved entries for a member (for streak calculation)
 * @param leagueMemberId - League member ID
 * @param dateRange - Date range to count within
 * @returns Approved entry count
 */
export async function countApprovedEntriesForMember(
  leagueMemberId: string,
  dateRange: { start: string; end: string }
): Promise<number> {
  try {
    const { count, error } = await getSupabase()
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .eq('league_member_id', leagueMemberId)
      .eq('status', 'approved')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);

    return count ?? 0;
  } catch (err) {
    console.error('Error in countApprovedEntriesForMember:', err);
    return 0;
  }
}

/**
 * Delete an entry
 * @param entryId - Entry ID
 * @returns Success boolean
 */
export async function deleteEntry(entryId: string): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from('effortentry')
      .delete()
      .eq('id', entryId);

    return !error;
  } catch (err) {
    console.error('Error in deleteEntry:', err);
    return false;
  }
}
/**
 * Get approved entries for team members within date range
 * Consolidates multiple effortentry queries into one
 * @param leagueMemberIds - Array of league member IDs in team
 * @param dateRange - Optional date range {start, end} in YYYY-MM-DD format
 * @returns Array of approved entries with league_member_id, type, rr_value, date
 */
export async function getApprovedEntriesForTeam(
  leagueMemberIds: string[],
  dateRange?: { start: string; end: string }
): Promise<Array<{
  league_member_id: string;
  type: string;
  rr_value: number | null;
  date: string;
}> | null> {
  try {
    if (!leagueMemberIds.length) return [];

    let query = getSupabase()
      .from('effortentry')
      .select('league_member_id, type, rr_value, date')
      .in('league_member_id', leagueMemberIds)
      .eq('status', 'approved');

    if (dateRange) {
      query = query.gte('date', dateRange.start).lte('date', dateRange.end);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error in getApprovedEntriesForTeam:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.error('Error in getApprovedEntriesForTeam:', err);
    return null;
  }
}

/**
 * Get pending/approved entries for team within date range with pagination
 * Consolidates both count and paginated fetch queries
 * @param leagueMemberIds - Array of league member IDs in team
 * @param dateRange - Date range {start, end} in YYYY-MM-DD format
 * @param pageNum - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns {count, entries} with count and paginated data
 */
export async function getPaginatedEntriesForTeam(
  leagueMemberIds: string[],
  dateRange: { start: string; end: string },
  pageNum: number = 1,
  pageSize: number = 10
): Promise<{
  count: number;
  entries: Array<{
    id: string;
    league_member_id: string;
    date: string;
    type: string;
    workout_type: string | null;
    duration: number | null;
    distance: number | null;
    steps: number | null;
    holes: number | null;
    rr_value: number | null;
    status: string;
    proof_url: string | null;
  }>;
} | null> {
  try {
    if (!leagueMemberIds.length) return { count: 0, entries: [] };

    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get count
    const { count } = await getSupabase()
      .from('effortentry')
      .select('id', { count: 'exact', head: true })
      .in('league_member_id', leagueMemberIds)
      .eq('status', 'approved')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);

    // Get paginated entries
    const { data: entries, error } = await getSupabase()
      .from('effortentry')
      .select('id,league_member_id,date,type,workout_type,duration,distance,steps,holes,rr_value,status,proof_url')
      .in('league_member_id', leagueMemberIds)
      .eq('status', 'approved')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)
      .order('date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error in getPaginatedEntriesForTeam:', error);
      return null;
    }

    return { count: count || 0, entries: entries || [] };
  } catch (err) {
    console.error('Error in getPaginatedEntriesForTeam:', err);
    return null;
  }
}
