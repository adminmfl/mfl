/**
 * GET /api/leagues/[id]/leaderboard - Get league leaderboard data
 *
 * Returns team rankings and individual rankings for a league.
 * Supports date range filtering for custom periods.
 * Includes special challenge bonuses in team scores.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getUserLocalDateYMD } from '@/lib/utils/timezone';

export const dynamic = 'force-dynamic';

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function minDateString(a: string, b: string): string {
  return a <= b ? a : b;
}

function maxDateString(a: string, b: string): string {
  return a >= b ? a : b;
}

function parseLocalYYYYMMDD(dateString: string): Date | null {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(dateString);
  if (!match) return null;
  const [y, m, d] = dateString.split('-').map((p) => Number(p));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function addDaysYYYYMMDD(dateString: string, days: number): string {
  const dt = parseLocalYYYYMMDD(dateString);
  if (!dt) return dateString;
  dt.setDate(dt.getDate() + days);
  return formatDateYYYYMMDD(dt);
}

function uniqueStringsPreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

// ============================================================================
// Types
// ============================================================================

export interface TeamRanking {
  rank: number;
  team_id: string;
  team_name: string;
  points: number;
  challenge_bonus: number;
  total_points: number;
  avg_rr: number;
  member_count: number;
  submission_count: number;
}

export interface IndividualRanking {
  rank: number;
  user_id: string;
  username: string;
  team_id: string | null;
  team_name: string | null;
  points: number;
  challenge_points?: number;
  avg_rr: number;
  submission_count: number;
  profile_picture_url?: string;
}

export interface SubTeamRanking {
  rank: number;
  subteam_id: string;
  subteam_name: string;
  team_id: string | null;
  team_name: string | null;
  points: number;
  submission_count: number;
}

export interface LeaderboardStats {
  total_submissions: number;
  approved: number;
  pending: number;
  rejected: number;
  total_rr: number;
}

export interface PendingTeamWindowRanking {
  rank: number;
  team_id: string;
  team_name: string;
  total_points: number;
  avg_rr: number;
  pointsByDate: Record<string, number>;
}

export interface PendingWindow {
  dates: string[];
  teams: PendingTeamWindowRanking[];
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // Get query params for date range filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Client timezone offset in minutes (same value as `new Date().getTimezoneOffset()`).
    // This allows the "2-day delay" to roll over at the user's local midnight instead of
    // the server's timezone (often UTC in production).
    const tzOffsetMinutesParam = searchParams.get('tzOffsetMinutes');
    const tzOffsetMinutes = tzOffsetMinutesParam !== null ? Number(tzOffsetMinutesParam) : null;
    const ianaTimezone = searchParams.get('ianaTimezone') || null;

    // Compute today's date string in user's timezone (preferred: IANA timezone)
    const todayYmd = getUserLocalDateYMD({
      now: new Date(),
      ianaTimezone: typeof ianaTimezone === 'string' ? ianaTimezone : null,
      tzOffsetMinutes: typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : null,
    });

    // Verify league exists and get its date range and status
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, league_name, start_date, end_date, status, rr_config, rest_days')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Only use date filtering if BOTH startDate and endDate are explicitly provided
    // Otherwise use league's start and end dates for the overall view
    const hasDateFilter = startDate && endDate;
    const filterStartDate = startDate || league.start_date;
    const filterEndDate = endDate || league.end_date;

    let effectiveEndDate: string;
    let pendingWindowDates: string[] = [];

    // Check if league is completed.
    // If completed, we show ALL data immediately (no 2-day delay, no pending window).
    if (league.status === 'completed') {
      effectiveEndDate = String(filterEndDate);
      pendingWindowDates = [];
    } else {
      // LEAGUE ACTIVE/LAUNCHED: Apply a 2-day delay mechanism.
      // 1. Main Leaderboard shows points up to (Today - 2 days).
      // 2. Real-Time Scoreboard shows points for Today and Yesterday.

      // Cutoff: effective end date is today's date in user's timezone minus 2 days
      const cutoff = (() => {
        const [y, m, d] = todayYmd.split('-').map((p) => Number(p));
        const dt = new Date(y, m - 1, d);
        dt.setDate(dt.getDate() - 2);
        return formatDateYYYYMMDD(dt);
      })();

      // effectiveEndDate is now the query bound -> We want EVERYTHING up to today for Individuals.
      // But we will filter it later for Team calculations using `cutoff`.
      // So effectiveEndDate for Query = Today (or filterEnd).
      const todayYYYYMMDD = todayYmd;
      const cappedEndDate = minDateString(String(filterEndDate), todayYYYYMMDD);
      effectiveEndDate = cappedEndDate;

      // Compute pending window range for "Real Time" column
      // We will derive the actual window data from the main `entries` list later
      // by checking if entry.date > cutoff.
      const pendingWindowEnd = minDateString(String(filterEndDate), todayYYYYMMDD);
      const pendingWindowStart = addDaysYYYYMMDD(pendingWindowEnd, -1);

      // We still define the dates for UI column headers
      pendingWindowDates = uniqueStringsPreserveOrder([
        pendingWindowEnd,
        pendingWindowStart,
      ])
        .filter((d) => d >= filterStartDate && d <= String(filterEndDate))
        .filter((d) => d > cutoff) // Only show dates that are actually "pending" relative to main team board
        .sort();
    }


    // =========================================================================
    // Get all teams in the league via teamleagues
    // =========================================================================
    const { data: teams, error: teamsError } = await supabase
      .from('teamleagues')
      .select(`
        team_id,
        teams(team_id, team_name)
      `)
      .eq('league_id', leagueId);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    // Create a set of valid team IDs for this league (for validation)
    const validTeamIds = new Set((teams || []).map((t) => t.team_id as string));

    // =========================================================================
    // Get all league members with team assignment
    // =========================================================================
    const { data: members, error: membersError } = await supabase
      .from('leaguemembers')
      .select(`
        league_member_id,
        user_id,
        team_id,
        users!leaguemembers_user_id_fkey(user_id, username, profile_picture_url)
      `)
      .eq('league_id', leagueId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Create member lookup maps
    const memberIds = (members || []).map((m) => m.league_member_id);
    const memberToUser = new Map<string, { user_id: string; username: string; team_id: string | null; profile_picture_url?: string }>();
    const teamMembers = new Map<string, string[]>(); // team_id -> league_member_ids

    (members || []).forEach((m) => {
      const user = m.users as any;
      memberToUser.set(m.league_member_id, {
        user_id: m.user_id,
        username: user?.username || 'Unknown',
        team_id: m.team_id,
        profile_picture_url: user?.profile_picture_url || undefined,
      });

      if (m.team_id) {
        const existing = teamMembers.get(m.team_id) || [];
        existing.push(m.league_member_id);
        teamMembers.set(m.team_id, existing);
      }
    });

    // =========================================================================
    // Get all effort entries within date range
    // =========================================================================
    // Supabase JS client defaults to 1000 rows. For leagues with many members
    // this can silently truncate results, causing incorrect point totals.
    // We paginate in chunks of 1000 to fetch ALL entries.
    const PAGE_SIZE = 1000;
    let entries: any[] = [];
    let entriesError: any = null;

    {
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        let entriesQuery = supabase
          .from('effortentry')
          .select('id, league_member_id, date, type, workout_type, outcome, rr_value, status')
          .in('league_member_id', memberIds);

        if (startDate) {
          entriesQuery = entriesQuery.gte('date', startDate);
        } else {
          entriesQuery = entriesQuery.gte('date', league.start_date);
        }

        entriesQuery = entriesQuery
          .lte('date', effectiveEndDate)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        const { data, error } = await entriesQuery;
        if (error) {
          entriesError = error;
          break;
        }
        entries = entries.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        page++;
      }
    }

    // Fallback if 'outcome' or 'workout_type' columns don't exist yet
    if (entriesError && typeof entriesError?.message === 'string' && entriesError.message.toLowerCase().includes('column')) {
      entries = [];
      entriesError = null;
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const fallbackQuery = supabase
          .from('effortentry')
          .select('id, league_member_id, date, type, rr_value, status')
          .in('league_member_id', memberIds);
        if (startDate) fallbackQuery.gte('date', startDate);
        else fallbackQuery.gte('date', league.start_date);
        fallbackQuery.lte('date', effectiveEndDate);
        fallbackQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        const fallback = await fallbackQuery;
        if (fallback.error) { entriesError = fallback.error; break; }
        entries = entries.concat(fallback.data || []);
        hasMore = (fallback.data?.length || 0) === PAGE_SIZE;
        page++;
      }
    }

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    // =========================================================================
    // Fetch activity points configuration for this league
    // =========================================================================
    let activityConfigRows: any[] | null = null;
    const configResult = await supabase
      .from('leagueactivities')
      .select('activity_id, custom_activity_id, points_per_session, outcome_config, activities(activity_name)')
      .eq('league_id', leagueId);
    if (!configResult.error) {
      activityConfigRows = configResult.data;
    } else {
      // Fallback if points_per_session/outcome_config columns don't exist yet (pre-migration)
      const fallback = await supabase
        .from('leagueactivities')
        .select('activity_id, custom_activity_id, activities(activity_name)')
        .eq('league_id', leagueId);
      activityConfigRows = fallback.data;
    }

    // Build lookup maps: activity_name -> config, custom_activity_id -> config
    const activityPointsMap = new Map<string, { points_per_session: number; outcome_config: any[] | null }>();
    for (const row of (activityConfigRows || [])) {
      const config = {
        points_per_session: (row as any).points_per_session ?? 1,
        outcome_config: (row as any).outcome_config ?? null,
      };
      if ((row as any).activities?.activity_name) {
        activityPointsMap.set((row as any).activities.activity_name, config);
      }
      if (row.custom_activity_id) {
        activityPointsMap.set(row.custom_activity_id, config);
      }
    }

    // Helper to resolve points for an entry
    const getEntryPoints = (entry: any): number => {
      if (!entry.workout_type) return 1;
      const config = activityPointsMap.get(entry.workout_type);
      if (!config) return 1;
      // If outcome_config exists and entry has an outcome, use outcome-specific points
      if (config.outcome_config && Array.isArray(config.outcome_config) && entry.outcome) {
        const outcomeMatch = config.outcome_config.find((o: any) => o.label === entry.outcome);
        if (outcomeMatch) return outcomeMatch.points;
      }
      return config.points_per_session;
    };

    // =========================================================================
    // Fetch pending-window effort entries (today/yesterday), excluded from main due to delay
    // =========================================================================
    // START of pending window fetch removal
    // We fetch everything in the main query now, so we don't need a separate pending query.
    // We will simulate `pendingEntries` from the main `entries` array later.
    let pendingEntries: Array<{
      league_member_id: string;
      date: string;
      rr_value: number | null;
      status: string;
    }> = [];
    // END of pending window fetch removal

    // =========================================================================
    // Get league challenge submissions with points
    // =========================================================================
    const { data: challengeSubmissions, error: challengeSubmissionsError } = await supabase
      .from('challenge_submissions')
      .select(`
        id,
        league_member_id,
        league_challenge_id,
        team_id,
        sub_team_id,
        status,
        created_at,
        awarded_points,
        leagueschallenges(
          id,
          name,
          total_points,
          challenge_type,
          start_date,
          end_date,
          league_id
        )
      `)
      .eq('status', 'approved');

    // Filter to only this league's challenges
    const leagueSubmissions = (challengeSubmissions || []).filter((sub) => {
      const challenge = (sub.leagueschallenges as any);
      return challenge && challenge.league_id === leagueId;
    });

    if (challengeSubmissionsError) {
      console.error('Error fetching challenge submissions:', challengeSubmissionsError);
      // Continue without challenge points
    }

    // Calculate challenge points by team, sub-team, and individual within date range
    const teamChallengePoints = new Map<string, number>();
    const memberChallengePoints = new Map<string, number>();
    const subTeamChallengePoints = new Map<string, number>();
    const subTeamSubmissionCounts = new Map<string, number>();

    // Team size helpers for dual-cap logic (visible vs internal)
    const teamSizes = new Map<string, number>();
    teamMembers.forEach((members, teamId) => {
      teamSizes.set(teamId, members.length);
    });
    const maxTeamSize = Array.from(teamSizes.values()).reduce((max, size) => Math.max(max, size), 0);



    // Deduplicate submissions: ensure only one approved submission per challenge per member counts.
    // Use map key: memberId_challengeId
    const uniqueSubmissionsMap = new Map<string, any>();
    (leagueSubmissions || []).forEach((sub) => {
      const challenge = (sub.leagueschallenges as any);
      if (!challenge) return;

      const key = `${sub.league_member_id}_${challenge.id}`;
      const existing = uniqueSubmissionsMap.get(key);

      const points = sub.awarded_points !== null ? Number(sub.awarded_points) : (Number(challenge.total_points) || 0);
      const existingPoints = existing ? (existing.awarded_points !== null ? Number(existing.awarded_points) : (Number(existing.leagueschallenges.total_points) || 0)) : -1;

      if (!existing || points > existingPoints || (points === existingPoints && sub.created_at > existing.created_at)) {
        uniqueSubmissionsMap.set(key, sub);
      }
    });

    const uniqueLeagueSubmissions = Array.from(uniqueSubmissionsMap.values());

    uniqueLeagueSubmissions.forEach((sub) => {
      const challenge = (sub.leagueschallenges as any);
      if (!challenge) return;

      // Use submission date for filtering, then apply the same delayed end bound.
      const submissionDate =
        typeof sub.created_at === 'string' && sub.created_at.includes('T')
          ? sub.created_at.split('T')[0]
          : (challenge.end_date || challenge.start_date || new Date().toISOString().split('T')[0]);

      // Always filter by league/range start (overall or custom) and delayed end.
      if (submissionDate < filterStartDate || submissionDate > effectiveEndDate) {
        return;
      }

      // Use awarded_points when present; otherwise fall back to the challenge's total_points.
      // Avoid `||` here because it can treat legitimate 0 values as falsy and incorrectly
      // fall back to the max points.
      const points =
        sub.awarded_points !== null && sub.awarded_points !== undefined
          ? Number(sub.awarded_points)
          : Number(challenge.total_points) || 0;
      if (points <= 0) {
        console.debug(`[Leaderboard] Skipping challenge submission ${sub.id} - no points (awarded: ${sub.awarded_points}, total: ${challenge.total_points})`);
        return;
      }
      console.debug(`[Leaderboard] Including challenge submission ${sub.id} with ${points} points for member ${sub.league_member_id}`);


      // UPDATED LOGIC: Challenge points are ONLY added to team totals, NOT to individual scores.
      // Individual players only earn activity points from workouts.
      const memberKey = sub.league_member_id as string;
      const memberInfo = memberToUser.get(memberKey);
      const memberTeamId = memberInfo?.team_id || null;
      const memberTeamSize = memberTeamId ? Math.max(1, teamSizes.get(memberTeamId) || 1) : 1;

      // Handle team aggregation based on challenge type
      // All challenges (individual, team, sub_team) contribute to team scores
      // Challenge points are added immediately without 2-day delay
      if (challenge.challenge_type === 'team' && sub.team_id) {
        // Team challenge: use team_id from submission if it belongs to this league
        const teamKey = sub.team_id as string;
        if (validTeamIds.has(teamKey)) {
          const size = Math.max(1, teamSizes.get(teamKey) || 1);
          const internalCap = size > 0 ? Number(challenge.total_points || 0) / size : points;
          const internalContribution = Math.min(points, internalCap);
          const teamCurrent = teamChallengePoints.get(teamKey) || 0;
          teamChallengePoints.set(teamKey, teamCurrent + internalContribution);
        }
      } else if (challenge.challenge_type === 'sub_team' && sub.sub_team_id) {
        // Sub-team challenges: points show on sub-team leaderboard AND roll up to team leaderboard.
        // Challenge points are added immediately without 2-day delay
        const subTeamKey = sub.sub_team_id as string;
        const subTeamCurrent = subTeamChallengePoints.get(subTeamKey) || 0;
        subTeamChallengePoints.set(subTeamKey, subTeamCurrent + points);
        const subTeamCount = subTeamSubmissionCounts.get(subTeamKey) || 0;
        subTeamSubmissionCounts.set(subTeamKey, subTeamCount + 1);

        // Sub-team challenge: sub_team_id submissions should be aggregated to their parent team
        // We need to lookup which team this sub_team belongs to
        // Since sub_team members are league members, and league members have team_id, 
        // we aggregate through the submitter's team membership
        const memberInfo = memberToUser.get(sub.league_member_id as string);
        if (memberInfo?.team_id && validTeamIds.has(memberInfo.team_id)) {
          const size = Math.max(1, teamSizes.get(memberInfo.team_id) || 1);
          const internalCap = size > 0 ? Number(challenge.total_points || 0) / size : points;
          const internalContribution = Math.min(points, internalCap);
          const teamKey = memberInfo.team_id;
          const teamCurrent = teamChallengePoints.get(teamKey) || 0;
          teamChallengePoints.set(teamKey, teamCurrent + internalContribution);
        }
      } else if (challenge.challenge_type === 'individual') {
        // Individual challenges: Each player earns their awarded_points independently.
        // Team score = sum of all members' individual challenge points (no per-member cap).
        // Challenge points are added immediately without 2-day delay.
        const memberInfo = memberToUser.get(sub.league_member_id as string);
        if (memberInfo?.team_id && validTeamIds.has(memberInfo.team_id)) {
          const teamKey = memberInfo.team_id;
          const teamCurrent = teamChallengePoints.get(teamKey) || 0;
          teamChallengePoints.set(teamKey, teamCurrent + points);
        }
      }
    });

    // =========================================================================
    // Get special challenge bonuses for teams (legacy)
    // =========================================================================
    let challengesQuery = supabase
      .from('specialchallengeteamscore')
      .select(`
        team_id,
        score,
        specialchallenges(challenge_id, name)
      `)
      .eq('league_id', leagueId);

    const { data: challengeScores, error: challengeError } = await challengesQuery;

    if (challengeError) {
      console.error('Error fetching challenge scores:', challengeError);
      // Continue without challenge bonuses
    }

    // Aggregate bonus scores (date filtering removed: specialchallenges no longer has end_date)
    const specialChallengeBonus = new Map<string, number>();
    (challengeScores || []).forEach((cs) => {
      const challenge = cs.specialchallenges as any;
      if (!challenge) return;
      const existing = specialChallengeBonus.get(cs.team_id) || 0;
      specialChallengeBonus.set(cs.team_id, existing + (cs.score || 0));
    });

    // =========================================================================
    // Calculate statistics
    // =========================================================================
    const stats: LeaderboardStats = {
      total_submissions: (entries || []).length,
      approved: (entries || []).filter((e) => e.status === 'approved').length,
      pending: (entries || []).filter((e) => e.status === 'pending').length,
      rejected: (entries || []).filter((e) => e.status === 'rejected').length,
      total_rr: (entries || [])
        .filter((e) => e.status === 'approved' && e.rr_value)
        .reduce((sum, e) => sum + (e.rr_value || 0), 0),
    };

    // =========================================================================
    // Calculate team rankings
    // =========================================================================
    const teamStats = new Map<string, {
      team_id: string;
      team_name: string;
      points: number;
      total_rr: number;
      rr_count: number;
      member_count: number;
      submission_count: number;
    }>();

    // Initialize team stats
    (teams || []).forEach((t) => {
      const team = t.teams as any;
      if (team) {
        const memberList = teamMembers.get(team.team_id) || [];
        teamStats.set(team.team_id, {
          team_id: team.team_id,
          team_name: team.team_name,
          points: 0,
          total_rr: 0,
          rr_count: 0,
          member_count: memberList.length,
          submission_count: 0,
        });
      }
    });

    // Deduplicate entries: Ensure only one approved entry per day per user counts.
    // This matches the Summary view logic which enforces daily limits.
    const uniqueEntriesMap = new Map<string, any>();
    (entries || []).forEach((entry) => {
      // Only care about approved entries for deduplication logic (others don't count anyway)
      if (entry.status !== 'approved') return;

      // Include workout_type in key so multiple different activities on the same day
      // (e.g. monthly frequency leagues) each count separately.
      const key = `${entry.league_member_id}_${entry.date}_${entry.workout_type || ''}`;
      const existing = uniqueEntriesMap.get(key);
      if (!existing || (!existing.rr_value && entry.rr_value)) {
        uniqueEntriesMap.set(key, entry);
      }
    });

    // Use deduplicated entries (one per member per day) for team aggregation
    const deduplicatedEntries = Array.from(uniqueEntriesMap.values());

    // Aggregate entries by team
    deduplicatedEntries.forEach((entry) => {
      const memberInfo = memberToUser.get(entry.league_member_id);
      if (!memberInfo?.team_id) return;

      const teamStat = teamStats.get(memberInfo.team_id);
      if (!teamStat) return;

      // SPLIT DELAY LOGIC:
      // For Team Stats, we enforce the 2-day delay.
      // We calculate the cutoff date (T-2).
      // If the league is completed, `cutoff` isn't defined in the same way, but 
      // effectiveEndDate covers it. If strict delay applies:
      // We assume `cutoff` variable exists from above scope.
      // If entry.date > cutoff, we SKIP it for Team Main stats.

      // Determine cutoff to use:
      // If league completed, cutoff is effectively infinite (or we ignore it).
      // But above code logic sets cutoff only in 'else' block.
      // Let's rely on checking if date is in pending window? No.
      // Safe bet: If league is active, we check against cutoff.

      // Re-calculate cutoff if needed or access from scope?
      // `cutoff` was defined inside the `else` block above. It is NOT available here if using `let`/`const` block scope.
      // We need to move `cutoff` definition to outer scope or re-calculate.

      // FIX: Accessing `cutoff` from block scope above will fail if not hoisted.
      // Since we can't easily change scope in this replace, we'll re-implement the check logic:
      // If date is in `pendingWindowDates`, it is > cutoff.

      const isPending = pendingWindowDates.includes(entry.date);
      // OR explicitly check date logic if pendingWindowDates is inconsistent?
      // pendingWindowDates are strictly > cutoff.

      if (league.status !== 'completed' && isPending) {
        // Skip this entry for TEAM MAIN stats (it belongs in Real Time board)
        return;
      }
      // If it's even newer than pending window? (Future). Skip.
      // Our query bounds capped at Today.

      teamStat.submission_count++; // Count all submissions for stats

      // For points, check against our Unique Map
      if (entry.status === 'approved') {
        const key = `${entry.league_member_id}_${entry.date}_${entry.workout_type || ''}`;
        const unique = uniqueEntriesMap.get(key);
        // Only count if THIS entry is the unique one (by ID)
        if (unique && unique.id === entry.id) {
          teamStat.points += getEntryPoints(entry);

          if (entry.rr_value && entry.rr_value > 0) {
            teamStat.total_rr += entry.rr_value;
            teamStat.rr_count++;
          }
        }
      }
    });

    // Convert to array and add challenge bonuses
    const teamRankings: TeamRanking[] = Array.from(teamStats.values())
      .map((ts) => {
        const legacyBonus = specialChallengeBonus.get(ts.team_id) || 0;
        const challengePoints = teamChallengePoints.get(ts.team_id) || 0;
        const totalChallengeBonus = legacyBonus + challengePoints;
        return {
          rank: 0, // Will be set after sorting
          team_id: ts.team_id,
          team_name: ts.team_name,
          points: ts.points,
          challenge_bonus: totalChallengeBonus,
          total_points: ts.points + totalChallengeBonus,
          avg_rr: ts.rr_count > 0 ? Math.round((ts.total_rr / ts.rr_count) * 100) / 100 : 0,
          member_count: ts.member_count,
          submission_count: ts.submission_count,
        };
      })
      .sort((a, b) => {
        // Sort by total_points DESC, then avg_rr DESC
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return b.avg_rr - a.avg_rr;
      })
      .map((team, index) => ({ ...team, rank: index + 1 }));

    // =========================================================================
    // Calculate pending-window team rankings (today/yesterday)
    // =========================================================================
    const pendingWindowTeams: PendingTeamWindowRanking[] = (() => {
      if (pendingWindowDates.length === 0) return [];

      const pointsByTeamDate = new Map<string, Map<string, number>>();
      const rrAggByTeam = new Map<string, { total_rr: number; rr_count: number }>();

      // Initialize maps for all teams so UI is stable.
      for (const ts of teamStats.values()) {
        const dateMap = new Map<string, number>();
        for (const d of pendingWindowDates) dateMap.set(d, 0);
        pointsByTeamDate.set(ts.team_id, dateMap);
        rrAggByTeam.set(ts.team_id, { total_rr: 0, rr_count: 0 });
      }

      // Populate pendingEntries from main entries list (deduplicated: one per member per day)
      // Filter entries that are IN the pending window dates.
      const pendingDedup = new Map<string, any>();
      (entries || []).filter(e => pendingWindowDates.includes(e.date) && e.status === 'approved').forEach(e => {
        const key = `${e.league_member_id}_${e.date}_${e.workout_type || ''}`;
        const existing = pendingDedup.get(key);
        if (!existing || (!existing.rr_value && e.rr_value)) pendingDedup.set(key, e);
      });
      pendingEntries = Array.from(pendingDedup.values());

      for (const entry of pendingEntries) {

        const memberInfo = memberToUser.get(entry.league_member_id);
        if (!memberInfo?.team_id) continue;
        const teamId = memberInfo.team_id;

        const teamDateMap = pointsByTeamDate.get(teamId);
        if (!teamDateMap) continue;
        teamDateMap.set(entry.date, (teamDateMap.get(entry.date) || 0) + getEntryPoints(entry));

        if (entry.rr_value && entry.rr_value > 0) {
          const agg = rrAggByTeam.get(teamId) || { total_rr: 0, rr_count: 0 };
          agg.total_rr += entry.rr_value;
          agg.rr_count += 1;
          rrAggByTeam.set(teamId, agg);
        }
      }

      const out: PendingTeamWindowRanking[] = Array.from(teamStats.values()).map((ts) => {
        const dateMap = pointsByTeamDate.get(ts.team_id) || new Map<string, number>();
        const pointsByDate: Record<string, number> = {};
        let total = 0;
        for (const d of pendingWindowDates) {
          const v = dateMap.get(d) || 0;
          pointsByDate[d] = v;
          total += v;
        }

        const rrAgg = rrAggByTeam.get(ts.team_id) || { total_rr: 0, rr_count: 0 };
        const avg_rr = rrAgg.rr_count > 0 ? Math.round((rrAgg.total_rr / rrAgg.rr_count) * 100) / 100 : 0;

        return {
          rank: 0,
          team_id: ts.team_id,
          team_name: ts.team_name,
          total_points: total,
          avg_rr,
          pointsByDate,
        };
      });

      return out
        .sort((a, b) => {
          if (b.total_points !== a.total_points) return b.total_points - a.total_points;
          return b.avg_rr - a.avg_rr;
        })
        .map((t, idx) => ({ ...t, rank: idx + 1 }));
    })();

    // =========================================================================
    // Calculate individual rankings
    // =========================================================================
    const individualStats = new Map<string, {
      user_id: string;
      username: string;
      team_id: string | null;
      team_name: string | null;
      points: number;
      challenge_points: number;
      total_rr: number;
      rr_count: number;
      submission_count: number;
      profile_picture_url?: string;
    }>();

    // Initialize individual stats from members
    (members || []).forEach((m) => {
      const user = m.users as any;
      const team = (teams || []).find((t) => (t.teams as any)?.team_id === m.team_id);
      const teamInfo = team?.teams as any;

      individualStats.set(m.league_member_id, {
        user_id: m.user_id,
        username: user?.username || 'Unknown',
        team_id: m.team_id,
        team_name: teamInfo?.team_name || null,
        points: 0,
        challenge_points: 0,
        total_rr: 0,
        rr_count: 0,
        submission_count: 0,
        profile_picture_url: user?.profile_picture_url || undefined,
      });
    });

    // Aggregate entries by individual
    (entries || []).forEach((entry) => {
      const individualStat = individualStats.get(entry.league_member_id);
      if (!individualStat) return;

      individualStat.submission_count++;

      if (entry.status === 'approved') {
        // Deduplication check: logic matches Team Stats loop above
        const key = `${entry.league_member_id}_${entry.date}_${entry.workout_type || ''}`;
        const unique = uniqueEntriesMap.get(key);

        if (unique && unique.id === entry.id) {
          individualStat.points += getEntryPoints(entry);

          if (entry.rr_value && entry.rr_value > 0) {
            individualStat.total_rr += entry.rr_value;
            individualStat.rr_count++;
          }
        }
      }
    });

    // NOTE: Challenge points are NO LONGER added to individuals.
    // All challenge points (individual, team, sub-team) only go to team totals.
    // Individual players only see their activity points.

    // Convert to array and sort
    const fullParam = searchParams.get('full') === 'true';

    let individualRankings: IndividualRanking[] = Array.from(individualStats.values())
      .map((is) => ({
        rank: 0,
        user_id: is.user_id,
        username: is.username,
        team_id: is.team_id,
        team_name: is.team_name,
        points: is.points,
        challenge_points: is.challenge_points,
        avg_rr: is.rr_count > 0 ? Number((is.total_rr / is.rr_count).toFixed(2)) : 0,
        submission_count: is.submission_count,
        profile_picture_url: is.profile_picture_url,
      }))
      .sort((a, b) => {
        // Sort by points DESC, then avg_rr DESC
        if (b.points !== a.points) return b.points - a.points;
        return b.avg_rr - a.avg_rr;
      })
      .map((individual, index) => ({ ...individual, rank: index + 1 }));

    // By default, limit to top 50 unless client asks for full=true
    if (!fullParam) {
      individualRankings = individualRankings.slice(0, 50);
    }

    // =========================================================================
    // Calculate sub-team rankings (challenge points only)
    // =========================================================================
    let subTeamRankings: SubTeamRanking[] = [];
    const subTeamIds = Array.from(subTeamChallengePoints.keys());

    if (subTeamIds.length > 0) {
      const { data: subTeams, error: subTeamsError } = await supabase
        .from('challenge_subteams')
        .select('subteam_id, name, team_id, teams(team_name)')
        .in('subteam_id', subTeamIds);

      if (subTeamsError) {
        console.error('Error fetching sub-teams:', subTeamsError);
      }

      const subTeamInfoMap = new Map(
        (subTeams || []).map((st: any) => [
          String(st.subteam_id),
          {
            subteam_name: st.name as string,
            team_id: (st.team_id as string | null) ?? null,
            team_name: (st.teams?.team_name as string | null) ?? null,
          },
        ])
      );

      subTeamRankings = subTeamIds
        .map((subteam_id) => {
          const info = subTeamInfoMap.get(String(subteam_id));
          return {
            rank: 0,
            subteam_id: String(subteam_id),
            subteam_name: info?.subteam_name || 'Unknown Sub-team',
            team_id: info?.team_id ?? null,
            team_name: info?.team_name ?? null,
            points: subTeamChallengePoints.get(subteam_id) || 0,
            submission_count: subTeamSubmissionCounts.get(subteam_id) || 0,
          };
        })
        .filter((st) => st.points > 0)
        .sort((a, b) => b.points - a.points)
        .map((st, index) => ({ ...st, rank: index + 1 }));
    }

    // =========================================================================
    // Calculate challenge-only leaderboards
    // =========================================================================
    const challengeTeamRankings: TeamRanking[] = Array.from(teamStats.values())
      .map((ts) => {
        const challengePoints = teamChallengePoints.get(ts.team_id) || 0;
        return {
          rank: 0,
          team_id: ts.team_id,
          team_name: ts.team_name,
          points: challengePoints,
          challenge_bonus: 0,
          total_points: challengePoints,
          avg_rr: 0,
          member_count: ts.member_count,
          submission_count: 0,
        };
      })
      .filter((t) => t.points > 0) // Only include teams with challenge points
      .sort((a, b) => b.total_points - a.total_points)
      .map((team, index) => ({ ...team, rank: index + 1 }));

    const challengeIndividualRankings: IndividualRanking[] = Array.from(individualStats.values())
      .map((is) => {
        const challengePoints = memberChallengePoints.get(is.user_id) || 0;
        return {
          rank: 0,
          user_id: is.user_id,
          username: is.username,
          team_id: is.team_id,
          team_name: is.team_name,
          points: challengePoints,
          avg_rr: 0,
          submission_count: 0,
        };
      })
      .filter((i) => i.points > 0) // Only include individuals with challenge points
      .sort((a, b) => b.points - a.points)
      .map((individual, index) => ({ ...individual, rank: index + 1 }))
      .slice(0, 50);

    // =========================================================================
    // Return response
    // =========================================================================
    return NextResponse.json({
      success: true,
      data: {
        teams: teamRankings,
        pendingWindow: {
          dates: pendingWindowDates,
          teams: pendingWindowTeams,
        } satisfies PendingWindow,
        subTeams: subTeamRankings,
        individuals: individualRankings,
        challengeTeams: challengeTeamRankings,
        challengeIndividuals: challengeIndividualRankings,
        stats,
        dateRange: {
          startDate: filterStartDate,
          endDate: effectiveEndDate,
        },
        league: {
          league_id: league.league_id,
          league_name: league.league_name,
          start_date: league.start_date,
          end_date: league.end_date,
          rr_config: (league as any).rr_config || { formula: 'standard' },
          rest_days: (league as any).rest_days ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('Error in leaderboard GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
