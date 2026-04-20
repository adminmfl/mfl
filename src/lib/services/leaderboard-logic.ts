import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getUserLocalDateYMD } from '@/lib/utils/timezone';

// ============================================================================
// Types (Duplicated from route for service use)
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

export interface LeaderboardCalculationOptions {
  startDate?: string | null;
  endDate?: string | null;
  tzOffsetMinutes?: number | null;
  ianaTimezone?: string | null;
  full?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function minDateString(a: string, b: string): string {
  return a <= b ? a : b;
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

/**
 * Core Leaderboard Calculation Service Logic
 * This logic is extracted from the API route to be callable from both
 * the API and directly from RSCs.
 */
export async function calculateLeaderboard(
  leagueId: string,
  options: LeaderboardCalculationOptions = {},
) {
  const supabase = getSupabaseServiceRole();
  const {
    startDate,
    endDate,
    tzOffsetMinutes,
    ianaTimezone,
    full = false,
  } = options;

  // Compute today's date string in user's timezone
  const todayYmd = getUserLocalDateYMD({
    now: new Date(),
    ianaTimezone: ianaTimezone || null,
    tzOffsetMinutes:
      typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)
        ? tzOffsetMinutes
        : null,
  });

  // 1. Fetch data in parallel
  const [
    leagueRes,
    teamsRes,
    membersRes,
    activityConfigRes,
    challengeSubmissionsRes,
    challengeScoresRes,
  ] = await Promise.all([
    supabase
      .from('leagues')
      .select(
        'league_id, league_name, start_date, end_date, status, rr_config, rest_days',
      )
      .eq('league_id', leagueId)
      .single(),
    supabase
      .from('teamleagues')
      .select('team_id, teams(team_id, team_name)')
      .eq('league_id', leagueId),
    supabase
      .from('leaguemembers')
      .select(
        'league_member_id, user_id, team_id, users!leaguemembers_user_id_fkey(user_id, username, profile_picture_url)',
      )
      .eq('league_id', leagueId),
    supabase
      .from('leagueactivities')
      .select(
        'activity_id, custom_activity_id, points_per_session, outcome_config, activities(activity_name)',
      )
      .eq('league_id', leagueId),
    supabase
      .from('challenge_submissions')
      .select(
        'id, league_member_id, league_challenge_id, team_id, sub_team_id, status, created_at, awarded_points, leagueschallenges(id, name, total_points, challenge_type, start_date, end_date, league_id)',
      )
      .eq('leagueschallenges.league_id', leagueId)
      .eq('status', 'approved'),
    supabase
      .from('specialchallengeteamscore')
      .select('team_id, score, specialchallenges(challenge_id, name)')
      .eq('league_id', leagueId),
  ]);

  const league = leagueRes.data;
  if (!league) return null;

  const filterStartDate = startDate || league.start_date;
  const filterEndDate = endDate || league.end_date;

  let effectiveEndDate: string;
  let pendingWindowDates: string[] = [];

  if (league.status === 'completed') {
    effectiveEndDate = String(filterEndDate);
  } else {
    const cutoff = (() => {
      const [y, m, d] = todayYmd.split('-').map((p) => Number(p));
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() - 2);
      return formatDateYYYYMMDD(dt);
    })();
    const todayYYYYMMDD = todayYmd;
    effectiveEndDate = minDateString(String(filterEndDate), todayYYYYMMDD);
    const pendingWindowEnd = effectiveEndDate;
    const pendingWindowStart = addDaysYYYYMMDD(pendingWindowEnd, -1);
    pendingWindowDates = uniqueStringsPreserveOrder([
      pendingWindowEnd,
      pendingWindowStart,
    ])
      .filter((d) => d >= filterStartDate && d <= String(filterEndDate))
      .filter((d) => d > cutoff)
      .sort();
  }

  const teams = teamsRes.data || [];
  const validTeamIds = new Set(teams.map((t) => (t as any).team_id));
  const members = membersRes.data || [];
  const memberIds = members.map((m) => m.league_member_id);
  const memberToUser = new Map();
  const teamMembers = new Map();
  members.forEach((m) => {
    const user = m.users as any;
    memberToUser.set(m.league_member_id, {
      user_id: m.user_id,
      username: user?.username || 'Unknown',
      team_id: m.team_id,
      profile_picture_url: user?.profile_picture_url,
    });
    if (m.team_id) {
      const existing = teamMembers.get(m.team_id) || [];
      existing.push(m.league_member_id);
      teamMembers.set(m.team_id, existing);
    }
  });

  const PAGE_SIZE = 1000;
  let entries: any[] = [];

  // Fetch first page to get count and initial data
  const firstPageRes = await supabase
    .from('effortentry')
    .select(
      'id, league_member_id, date, type, workout_type, outcome, rr_value, status, leaguemembers!inner(league_id)',
      { count: 'exact' },
    )
    .eq('leaguemembers.league_id', leagueId)
    .gte('date', filterStartDate)
    .lte('date', effectiveEndDate)
    .range(0, PAGE_SIZE - 1);

  if (firstPageRes.error) {
    console.error('Error fetching effort entries:', firstPageRes.error);
  } else {
    entries = firstPageRes.data || [];
    const totalCount = firstPageRes.count || 0;

    if (totalCount > PAGE_SIZE) {
      const remainingPages = Math.ceil((totalCount - PAGE_SIZE) / PAGE_SIZE);
      const pagePromises = [];

      for (let i = 1; i <= remainingPages; i++) {
        pagePromises.push(
          supabase
            .from('effortentry')
            .select(
              'id, league_member_id, date, type, workout_type, outcome, rr_value, status, leaguemembers!inner(league_id)',
            )
            .eq('leaguemembers.league_id', leagueId)
            .gte('date', filterStartDate)
            .lte('date', effectiveEndDate)
            .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1),
        );
      }

      const additionalPages = await Promise.all(pagePromises);
      additionalPages.forEach((res) => {
        if (res.data) entries = entries.concat(res.data);
      });
    }
  }

  const activityPointsMap = new Map();
  (activityConfigRes.data || []).forEach((row: any) => {
    const config = {
      points_per_session: row.points_per_session ?? 1,
      outcome_config: row.outcome_config ?? null,
    };
    if (row.activities?.activity_name)
      activityPointsMap.set(row.activities.activity_name, config);
    if (row.custom_activity_id)
      activityPointsMap.set(row.custom_activity_id, config);
  });

  const getEntryPoints = (entry: any) => {
    const config = activityPointsMap.get(entry.workout_type || '');
    if (!config) return 1;
    if (config.outcome_config && entry.outcome) {
      const match = config.outcome_config.find(
        (o: any) => o.label === entry.outcome,
      );
      if (match) return match.points;
    }
    return config.points_per_session;
  };

  const teamChallengePoints = new Map<string, number>();
  const memberChallengePoints = new Map<string, number>();
  const subTeamChallengePoints = new Map<string, number>();
  const subTeamSubmissionCounts = new Map<string, number>();
  const teamSizes = new Map();
  teamMembers.forEach((m, tid) => teamSizes.set(tid, m.length));

  const uniqueSubmissionsMap = new Map();
  (challengeSubmissionsRes.data || [])
    .filter((sub) => (sub.leagueschallenges as any)?.league_id === leagueId)
    .forEach((sub) => {
      const chal = sub.leagueschallenges as any;
      const key = `${sub.league_member_id}_${chal.id}`;
      const points =
        sub.awarded_points !== null
          ? Number(sub.awarded_points)
          : Number(chal.total_points) || 0;
      const existing = uniqueSubmissionsMap.get(key);
      if (
        !existing ||
        points >
          (existing.awarded_points !== null
            ? Number(existing.awarded_points)
            : Number(existing.leagueschallenges.total_points) || 0)
      ) {
        uniqueSubmissionsMap.set(key, sub);
      }
    });

  uniqueSubmissionsMap.forEach((sub) => {
    const chal = sub.leagueschallenges as any;
    const subDate =
      typeof sub.created_at === 'string' && sub.created_at.includes('T')
        ? sub.created_at.split('T')[0]
        : chal.end_date || chal.start_date || todayYmd;
    if (subDate < filterStartDate || subDate > effectiveEndDate) return;
    const points =
      sub.awarded_points !== null
        ? Number(sub.awarded_points)
        : Number(chal.total_points) || 0;
    const memberInfo = memberToUser.get(sub.league_member_id);
    const teamId = memberInfo?.team_id;
    if (teamId && validTeamIds.has(teamId)) {
      if (chal.challenge_type === 'team') {
        const size = Math.max(1, teamSizes.get(teamId) || 1);
        teamChallengePoints.set(
          teamId,
          (teamChallengePoints.get(teamId) || 0) +
            Math.min(points, Number(chal.total_points || 0) / size),
        );
      } else if (chal.challenge_type === 'sub_team' && sub.sub_team_id) {
        subTeamChallengePoints.set(
          String(sub.sub_team_id),
          (subTeamChallengePoints.get(String(sub.sub_team_id)) || 0) + points,
        );
        subTeamSubmissionCounts.set(
          String(sub.sub_team_id),
          (subTeamSubmissionCounts.get(String(sub.sub_team_id)) || 0) + 1,
        );
        const size = Math.max(1, teamSizes.get(teamId) || 1);
        teamChallengePoints.set(
          teamId,
          (teamChallengePoints.get(teamId) || 0) +
            Math.min(points, Number(chal.total_points || 0) / size),
        );
      } else {
        teamChallengePoints.set(
          teamId,
          (teamChallengePoints.get(teamId) || 0) + points,
        );
        if (chal.challenge_type === 'individual') {
          memberChallengePoints.set(
            sub.league_member_id,
            (memberChallengePoints.get(sub.league_member_id) || 0) + points,
          );
        }
      }
    }
  });

  const specialChallengeBonus = new Map<string, number>();
  (challengeScoresRes.data || []).forEach((cs) => {
    specialChallengeBonus.set(
      cs.team_id,
      (specialChallengeBonus.get(cs.team_id) || 0) + (cs.score || 0),
    );
  });

  const stats: LeaderboardStats = {
    total_submissions: entries.length,
    approved: entries.filter((e) => e.status === 'approved').length,
    pending: entries.filter((e) => e.status === 'pending').length,
    rejected: entries.filter((e) => e.status === 'rejected').length,
    total_rr: entries
      .filter((e) => e.status === 'approved' && e.rr_value)
      .reduce((sum, e) => sum + (e.rr_value || 0), 0),
  };

  const teamStats = new Map();
  teams.forEach((t: any) => {
    const tid = t.teams?.team_id || t.team_id;
    const tname = t.teams?.team_name || 'Unknown';
    teamStats.set(tid, {
      team_id: tid,
      team_name: tname,
      points: 0,
      total_rr: 0,
      rr_count: 0,
      member_count: (teamMembers.get(tid) || []).length,
      submission_count: 0,
    });
  });

  const uniqueEntriesMap = new Map();
  entries
    .filter((e) => e.status === 'approved')
    .forEach((e) => {
      const key = `${e.league_member_id}_${e.date}_${e.workout_type || ''}`;
      const existing = uniqueEntriesMap.get(key);
      if (!existing || (!existing.rr_value && e.rr_value))
        uniqueEntriesMap.set(key, e);
    });

  Array.from(uniqueEntriesMap.values()).forEach((entry) => {
    const teamId = memberToUser.get(entry.league_member_id)?.team_id;
    const teamStat = teamStats.get(teamId);
    if (
      !teamStat ||
      (league.status !== 'completed' && pendingWindowDates.includes(entry.date))
    )
      return;
    teamStat.submission_count++;
    teamStat.points += getEntryPoints(entry);
    if (entry.rr_value > 0) {
      teamStat.total_rr += entry.rr_value;
      teamStat.rr_count++;
    }
  });

  const teamRankings: TeamRanking[] = Array.from(teamStats.values())
    .map((ts) => {
      const totalBonus =
        (specialChallengeBonus.get(ts.team_id) || 0) +
        (teamChallengePoints.get(ts.team_id) || 0);
      return {
        rank: 0,
        team_id: ts.team_id,
        team_name: ts.team_name,
        points: ts.points,
        challenge_bonus: totalBonus,
        total_points: ts.points + totalBonus,
        avg_rr:
          ts.rr_count > 0
            ? Math.round((ts.total_rr / ts.rr_count) * 100) / 100
            : 0,
        member_count: ts.member_count,
        submission_count: ts.submission_count,
      };
    })
    .sort((a, b) =>
      b.total_points !== a.total_points
        ? b.total_points - a.total_points
        : b.avg_rr - a.avg_rr,
    )
    .map((t, index) => ({ ...t, rank: index + 1 }));

  const pendingWindowTeams: PendingTeamWindowRanking[] = (() => {
    if (pendingWindowDates.length === 0) return [];
    const pointsByTeamDate = new Map();
    const rrAggByTeam = new Map();
    for (const ts of teamStats.values()) {
      const dm = new Map();
      pendingWindowDates.forEach((d) => dm.set(d, 0));
      pointsByTeamDate.set(ts.team_id, dm);
      rrAggByTeam.set(ts.team_id, { total_rr: 0, rr_count: 0 });
    }
    entries
      .filter(
        (e) => pendingWindowDates.includes(e.date) && e.status === 'approved',
      )
      .forEach((e) => {
        const key = `${e.league_member_id}_${e.date}_${e.workout_type || ''}`;
        if (uniqueEntriesMap.get(key)?.id !== e.id) return;
        const tid = memberToUser.get(e.league_member_id)?.team_id;
        if (!tid) return;
        const tdm = pointsByTeamDate.get(tid);
        if (tdm) tdm.set(e.date, (tdm.get(e.date) || 0) + getEntryPoints(e));
        if (e.rr_value > 0) {
          const agg = rrAggByTeam.get(tid);
          agg.total_rr += e.rr_value;
          agg.rr_count++;
        }
      });
    return Array.from(teamStats.values())
      .map((ts) => {
        const dm = pointsByTeamDate.get(ts.team_id);
        const res: Record<string, number> = {};
        let total = 0;
        pendingWindowDates.forEach((d) => {
          const v = dm.get(d) || 0;
          res[d] = v;
          total += v;
        });
        const rr = rrAggByTeam.get(ts.team_id);
        return {
          rank: 0,
          team_id: ts.team_id,
          team_name: ts.team_name,
          total_points: total,
          avg_rr:
            rr.rr_count > 0
              ? Math.round((rr.total_rr / rr.rr_count) * 100) / 100
              : 0,
          pointsByDate: res,
        };
      })
      .sort((a, b) =>
        b.total_points !== a.total_points
          ? b.total_points - a.total_points
          : b.avg_rr - a.avg_rr,
      )
      .map((t, idx) => ({ ...t, rank: idx + 1 }));
  })();

  const individualStats = new Map();
  members.forEach((m) => {
    const user = m.users as any;
    const team = teams.find(
      (t: any) => (t.teams?.team_id || t.team_id) === m.team_id,
    );
    individualStats.set(m.league_member_id, {
      user_id: m.user_id,
      username: user?.username || 'Unknown',
      team_id: m.team_id,
      team_name:
        (team as any)?.teams?.team_name || (team as any)?.team_name || null,
      points: 0,
      challenge_points: 0,
      total_rr: 0,
      rr_count: 0,
      submission_count: 0,
      profile_picture_url: user?.profile_picture_url,
    });
  });

  entries.forEach((e) => {
    const is = individualStats.get(e.league_member_id);
    if (!is) return;
    is.submission_count++;
    if (
      e.status === 'approved' &&
      uniqueEntriesMap.get(
        `${e.league_member_id}_${e.date}_${e.workout_type || ''}`,
      )?.id === e.id
    ) {
      is.points += getEntryPoints(e);
      if (e.rr_value > 0) {
        is.total_rr += e.rr_value;
        is.rr_count++;
      }
    }
  });

  let individualRankings: IndividualRanking[] = Array.from(
    individualStats.values(),
  )
    .map((is) => ({
      rank: 0,
      user_id: is.user_id,
      username: is.username,
      team_id: is.team_id,
      team_name: is.team_name,
      points: is.points,
      challenge_points: is.challenge_points,
      avg_rr:
        is.rr_count > 0 ? Number((is.total_rr / is.rr_count).toFixed(2)) : 0,
      submission_count: is.submission_count,
      profile_picture_url: is.profile_picture_url,
    }))
    .sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.avg_rr - a.avg_rr,
    )
    .map((i, idx) => ({ ...i, rank: idx + 1 }));
  if (!full) individualRankings = individualRankings.slice(0, 50);

  return {
    teams: teamRankings,
    pendingWindow: { dates: pendingWindowDates, teams: pendingWindowTeams },
    individuals: individualRankings,
    stats,
    dateRange: { startDate: filterStartDate, endDate: effectiveEndDate },
    league: {
      league_id: league.league_id,
      league_name: league.league_name,
      start_date: league.start_date,
      end_date: league.end_date,
      rr_config: league.rr_config || { formula: 'standard' },
      rest_days: league.rest_days ?? 0,
    },
  };
}
