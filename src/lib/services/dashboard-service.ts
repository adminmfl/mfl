import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getLeagueById } from '@/lib/services/leagues';
import { getUserLocalDateYMD } from '@/lib/utils/timezone';
import { DashboardSummaryData } from '@/lib/types/dashboard';

// Helper functions for date manipulation
function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function minDateString(a: string, b: string): string {
  return a <= b ? a : b;
}

export interface GetDashboardSummaryOptions {
  startDate?: string | null;
  endDate?: string | null;
  tzOffsetMinutes?: number | null;
  ianaTimezone?: string | null;
}

export async function getDashboardSummary(
  leagueId: string,
  userId: string,
  opts: GetDashboardSummaryOptions = {},
): Promise<DashboardSummaryData | null> {
  const supabase = getSupabaseServiceRole();

  // 1. Fetch League and Member details in parallel
  const [league, memberRes] = await Promise.all([
    getLeagueById(leagueId),
    supabase
      .from('leaguemembers')
      .select('league_member_id, team_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle(),
  ]);

  if (!league) return null;

  const leagueMember = memberRes.data;
  if (!leagueMember) return null;

  const { league_member_id: memberId, team_id: teamId } = leagueMember;

  const isChallengesOnly = (league as any).league_mode === 'challenges_only';

  // Use current date for status and delay logic
  const todayYmd = getUserLocalDateYMD({
    now: new Date(),
    ianaTimezone: opts.ianaTimezone || null,
    tzOffsetMinutes: opts.tzOffsetMinutes ?? null,
  });

  // Determine query range for activities (grid)
  // const filterStartDate = opts.startDate || league.start_date;
  // const filterEndDate = opts.endDate || league.end_date;

  // 2. Parallel Fetching for stats, submissions, rest days, team info, activities
  // For challenges_only leagues, skip activity-related queries
  const [
    statsRes,
    submissionsRes,
    restRes,
    allLeagueMembers,
    activitiesRes,
    challengeSubsRes,
  ] = await Promise.all([
    isChallengesOnly
      ? Promise.resolve({ data: null, error: null })
      : supabase.rpc('get_league_participation_stats', {
          p_league_id: leagueId,
        }),
    isChallengesOnly
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('effortentry')
          .select(
            `
            id, date, type, workout_type, duration, distance, steps, holes, rr_value, status, outcome,
            created_date, modified_date
          `,
          )
          .eq('league_member_id', memberId)
          .gte('date', league.start_date)
          .lte('date', todayYmd),
    isChallengesOnly
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('effortentry')
          .select('date')
          .eq('league_member_id', memberId)
          .eq('type', 'rest')
          .eq('status', 'approved')
          .gte('date', league.start_date),
    supabase
      .from('leaguemembers')
      .select('league_member_id, team_id')
      .eq('league_id', leagueId),
    isChallengesOnly
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('leagueactivities')
          .select(
            'activity_id, custom_activity_id, points_per_session, outcome_config, frequency_type, activities(activity_name)',
          )
          .eq('league_id', leagueId),
    supabase
      .from('challenge_submissions')
      .select(
        `
        id, league_member_id, league_challenge_id, team_id, status, awarded_points,
        leagueschallenges(id, total_points, league_id)
      `,
      )
      .eq('status', 'approved'),
  ]);

  // 3. Process Activity Point Config
  const activityPointsMap = new Map<
    string,
    { points_per_session: number; outcome_config: any[] | null }
  >();
  const activityNameMap = new Map<string, string>();
  (activitiesRes.data || []).forEach((row: any) => {
    const config = {
      points_per_session: row.points_per_session ?? 1,
      outcome_config: row.outcome_config,
    };
    const key = row.custom_activity_id || row.activity_id;
    if (key) activityPointsMap.set(key, config);
    const actName = row.activities?.activity_name;
    if (actName) {
      activityPointsMap.set(actName, config);
      if (row.custom_activity_id)
        activityNameMap.set(row.custom_activity_id, actName);
    }
  });

  const getEffectivePoints = (entry: any): number => {
    if (!entry.workout_type) return entry.rr_value ?? 1;
    const config = activityPointsMap.get(entry.workout_type);
    if (!config) return entry.rr_value ?? 1;
    if (
      config.outcome_config &&
      Array.isArray(config.outcome_config) &&
      entry.outcome
    ) {
      const match = config.outcome_config.find(
        (o: any) => o.label === entry.outcome,
      );
      if (match) return match.points;
    }
    return config.points_per_session;
  };

  // 4. Process Submissions for Personal Summary (Deduplicated)
  const submissions = submissionsRes.data || [];
  const dedupedApproved = new Map<string, any>();
  submissions
    .filter((s) => s.status === 'approved' || s.status === 'accepted')
    .forEach((s) => {
      const key = `${s.date}_${s.workout_type || ''}`;
      const existing = dedupedApproved.get(key);
      if (!existing || (!existing.rr_value && s.rr_value)) {
        dedupedApproved.set(key, s);
      }
    });
  const approvedList = Array.from(dedupedApproved.values());

  let points = 0;
  const formula = (league.rr_config as any)?.formula || 'standard';
  if (formula === 'points_only') {
    points = approvedList.reduce((sum, s) => sum + getEffectivePoints(s), 0);
  } else {
    points = approvedList.length;
  }

  const totalRR = approvedList.reduce((sum, s) => {
    if (s.type === 'rest') return sum + 1;
    return sum + (Number(s.rr_value) || 0);
  }, 0);
  const avgRR =
    approvedList.length > 0
      ? Math.round((totalRR / approvedList.length) * 100) / 100
      : null;

  // Missed Days calculation
  let missedDays = 0;
  const startDt = parseLocalYYYYMMDD(league.start_date);
  const yesterdayDt = parseLocalYYYYMMDD(todayYmd);
  if (yesterdayDt) yesterdayDt.setDate(yesterdayDt.getDate() - 1);

  if (startDt && yesterdayDt && startDt <= yesterdayDt) {
    const allSubDateSet = new Set(submissions.map((s) => s.date));
    let cur = new Date(startDt);
    while (cur <= yesterdayDt) {
      if (!allSubDateSet.has(formatDateYYYYMMDD(cur))) missedDays++;
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Rest Days
  const restUsed = restRes.data?.length || 0;
  const totalRestAllowed = league.rest_days || 0;
  const restUnused = Math.max(0, totalRestAllowed - restUsed);

  // 5. Process Challenge Points
  const leagueChallengeSubs = (challengeSubsRes.data || []).filter(
    (sub: any) => sub.leagueschallenges?.league_id === leagueId,
  );

  const uniqueChallengeMap = new Map<string, any>();
  leagueChallengeSubs.forEach((sub: any) => {
    const key = `${sub.league_member_id}_${sub.league_challenge_id}`;
    if (!uniqueChallengeMap.has(key)) uniqueChallengeMap.set(key, sub);
  });
  const uniqueChallengeSubs = Array.from(uniqueChallengeMap.values());

  const personalChallengePoints = uniqueChallengeSubs
    .filter((s) => s.league_member_id === memberId)
    .reduce(
      (sum, s) =>
        sum +
        (s.awarded_points ?? (s.leagueschallenges as any)?.total_points ?? 0),
      0,
    );

  const teamChanPts = teamId
    ? uniqueChallengeSubs
        .filter((s) => s.team_id === teamId)
        .reduce(
          (sum, s) =>
            sum +
            (s.awarded_points ??
              (s.leagueschallenges as any)?.total_points ??
              0),
          0,
        )
    : 0;

  // For challenges_only leagues, skip activity stats and timeline — return challenge-centric summary
  if (isChallengesOnly) {
    // Minimal team ranking based on challenge points only
    const teamMemberMapCO = new Map<string, Set<string>>();
    (allLeagueMembers.data || []).forEach((m: any) => {
      if (m.team_id) {
        if (!teamMemberMapCO.has(m.team_id))
          teamMemberMapCO.set(m.team_id, new Set());
        teamMemberMapCO.get(m.team_id)!.add(m.league_member_id);
      }
    });

    const teamChallengePointsMap = new Map<string, number>();
    uniqueChallengeSubs.forEach((s) => {
      if (s.team_id) {
        const current = teamChallengePointsMap.get(s.team_id) || 0;
        teamChallengePointsMap.set(
          s.team_id,
          current +
            (s.awarded_points ??
              (s.leagueschallenges as any)?.total_points ??
              0),
        );
      }
    });

    const teamRankingsCO = Array.from(teamMemberMapCO.keys())
      .map((tId) => ({
        team_id: tId,
        total_points: teamChallengePointsMap.get(tId) || 0,
      }))
      .sort((a, b) => b.total_points - a.total_points);

    const myTeamStatsCO = teamId
      ? teamRankingsCO.find((t) => t.team_id === teamId)
      : null;
    const myTeamRankCO = teamId
      ? teamRankingsCO.findIndex((t) => t.team_id === teamId) + 1
      : null;

    return {
      league,
      stats: null,
      mySummary: {
        points: personalChallengePoints,
        totalPoints: personalChallengePoints,
        challengePoints: personalChallengePoints,
        avgRR: null,
        restUsed: 0,
        restUnused: 0,
        missedDays: 0,
        teamPoints: myTeamStatsCO?.total_points || 0,
        teamRank: myTeamRankCO || null,
        teamAvgRR: null,
        teamChallengePoints: teamChanPts,
      },
      recentDays: [],
      rejectedCount: 0,
      isMonthlyFrequency: false,
    };
  }

  // 6. Rejected Count
  const latestByDate = new Map<string, { status: string; ts: string }>();
  submissions.forEach((s) => {
    const ts = (s.modified_date || s.created_date || '').toString();
    const existing = latestByDate.get(s.date);
    if (!existing || ts > existing.ts) {
      latestByDate.set(s.date, { status: s.status || 'pending', ts });
    }
  });
  const rejectedCount = Array.from(latestByDate.values()).filter((v) =>
    ['rejected', 'rejected_resubmit', 'rejected_permanent'].includes(v.status),
  ).length;

  // 7. Grid Row Generation (Recent Days)
  const recentDays: any[] = [];
  const activities = activitiesRes.data || [];
  const isMonthly =
    activities.length > 0 &&
    activities.every((a: any) => a.frequency_type === 'monthly');
  const isWeekly =
    !isMonthly &&
    activities.length > 0 &&
    activities.every((a: any) => a.frequency_type === 'weekly');

  const leagueStartLocal = parseLocalYYYYMMDD(league.start_date);
  const anchorDay = leagueStartLocal ? leagueStartLocal.getDay() : 0;

  const todayLocal = parseLocalYYYYMMDD(todayYmd) || new Date();
  const startOfWeekAnchored = (d: Date, anchor: number) => {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    const diff = (out.getDay() - anchor + 7) % 7;
    out.setDate(out.getDate() - diff);
    return out;
  };

  const currentWeekStart = startOfWeekAnchored(todayLocal, anchorDay);

  let rangeStart: Date;
  let numDays: number;

  if (isMonthly) {
    rangeStart = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1);
    const monthEnd = new Date(
      todayLocal.getFullYear(),
      todayLocal.getMonth() + 1,
      0,
    );
    numDays = monthEnd.getDate();
  } else {
    rangeStart = currentWeekStart;
    numDays = 7;
  }

  const byDate = new Map<string, any[]>();
  submissions.forEach((s) => {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push(s);
  });

  if (isWeekly) {
    // Weekly frequency: show submissions only + one summary row if none
    const weekStartLabel = rangeStart.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
    });
    const weekEndDate = new Date(rangeStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEndLabel = weekEndDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
    const weekLabel = `${weekStartLabel} – ${weekEndLabel}`;

    // Collect all submissions in the week range
    const weekEntries: any[] = [];
    for (let offset = 0; offset < numDays; offset++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + offset);
      const ymd = formatDateYYYYMMDD(d);
      const dayEntries = byDate.get(ymd) || [];
      dayEntries.forEach((sub) => weekEntries.push({ ...sub, _date: ymd }));
    }

    if (weekEntries.length > 0) {
      weekEntries.forEach((sub) => {
        const dayLabel = new Date(sub._date + 'T00:00:00').toLocaleDateString(
          'en-US',
          { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' },
        );
        const isWorkout = sub.type === 'workout';
        const wt = isWorkout
          ? sub.custom_activity_name ||
            (sub.workout_type
              ? String(sub.workout_type).replace(/_/g, ' ')
              : '')
          : '';
        const tl = isWorkout ? wt || 'Workout' : 'Rest Day';
        const sl = sub.status || '';
        const st = sl ? `${tl} • ${sl}` : tl;
        const ep = getEffectivePoints(sub);
        const rv = typeof sub.rr_value === 'number' ? sub.rr_value : null;
        const pl =
          formula === 'standard'
            ? rv !== null
              ? `${rv.toFixed(1)} RR`
              : '0 pt'
            : `${ep} pt`;
        recentDays.push({
          date: sub._date,
          label: dayLabel,
          subtitle: st,
          status: sl,
          pointsLabel: pl,
          submission: sub,
        });
      });
    } else {
      // No submissions this week — show a single summary row
      const weekRangeEnd = formatDateYYYYMMDD(weekEndDate);
      const leagueEnd = league.end_date;
      const leagueStartStr = league.start_date;
      const isAfterEnd =
        leagueEnd && formatDateYYYYMMDD(rangeStart) > leagueEnd;
      const isBeforeStart = leagueStartStr && weekRangeEnd < leagueStartStr;

      if (isAfterEnd || isBeforeStart) {
        recentDays.push({
          date: formatDateYYYYMMDD(rangeStart),
          label: weekLabel,
          subtitle: '—',
          pointsLabel: '—',
          submission: null,
        });
      } else if (formatDateYYYYMMDD(rangeStart) > todayYmd) {
        recentDays.push({
          date: formatDateYYYYMMDD(rangeStart),
          label: weekLabel,
          subtitle: 'Upcoming',
          pointsLabel: '—',
          submission: null,
        });
      } else {
        recentDays.push({
          date: formatDateYYYYMMDD(rangeStart),
          label: weekLabel,
          subtitle: 'No submission this week',
          pointsLabel: '0 pt',
          submission: null,
        });
      }
    }
  } else {
    for (let offset = 0; offset < numDays; offset++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + offset);
      const ymd = formatDateYYYYMMDD(d);
      const label = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });

      const dayEntries = byDate.get(ymd) || [];
      const leagueEnd = league.end_date;
      const leagueStartStr = league.start_date;

      const isAfterEnd = leagueEnd && ymd > leagueEnd;
      const isBeforeStart = leagueStartStr && ymd < leagueStartStr;

      if (isMonthly) {
        if (dayEntries.length > 0) {
          dayEntries.forEach((sub) => {
            const isWorkout = sub.type === 'workout';
            const wt = isWorkout
              ? sub.custom_activity_name ||
                (sub.workout_type
                  ? String(sub.workout_type).replace(/_/g, ' ')
                  : '')
              : '';
            const tl = isWorkout ? wt || 'Workout' : 'Rest Day';
            const sl = sub.status || '';
            const st = sl ? `${tl} • ${sl}` : tl;
            const ep = getEffectivePoints(sub);
            const rv = typeof sub.rr_value === 'number' ? sub.rr_value : null;
            const pl =
              formula === 'standard'
                ? rv !== null
                  ? `${rv.toFixed(1)} RR`
                  : '0 pt'
                : `${ep} pt`;
            recentDays.push({
              date: ymd,
              label,
              subtitle: st,
              status: sl,
              pointsLabel: pl,
              submission: sub,
            });
          });
        }
      } else {
        // Daily frequency (default)
        if (isAfterEnd) {
          recentDays.push({
            date: ymd,
            label,
            subtitle: '—',
            pointsLabel: '—',
            submission: null,
          });
        } else if (isBeforeStart && dayEntries.length === 0) {
          recentDays.push({
            date: ymd,
            label,
            subtitle: '—',
            pointsLabel: '—',
            submission: null,
          });
        } else if (dayEntries.length === 0) {
          if (ymd > todayYmd) {
            recentDays.push({
              date: ymd,
              label,
              subtitle: 'Upcoming',
              pointsLabel: '—',
              submission: null,
            });
          } else if (ymd === todayYmd) {
            recentDays.push({
              date: ymd,
              label,
              subtitle: 'No submission yet',
              pointsLabel: '—',
              submission: null,
            });
          } else {
            recentDays.push({
              date: ymd,
              label,
              subtitle: 'Missed day',
              pointsLabel: '0 pt',
              submission: null,
            });
          }
        } else {
          const entry = dayEntries.sort((a, b) =>
            (b.modified_date || b.created_date || '').localeCompare(
              a.modified_date || a.created_date || '',
            ),
          )[0];
          const isWorkout = entry.type === 'workout';
          const typeLabel = isWorkout
            ? activityNameMap.get(entry.workout_type) || 'Workout'
            : 'Rest Day';
          const statusLabel = entry.status || '';
          let subtitle = statusLabel
            ? `${typeLabel} • ${statusLabel}`
            : typeLabel;
          if (isBeforeStart) subtitle = `(Trial) ${subtitle}`;

          const ep = getEffectivePoints(entry);
          const rr = typeof entry.rr_value === 'number' ? entry.rr_value : null;
          const pointsLabel =
            formula === 'standard'
              ? rr !== null
                ? `${rr.toFixed(1)} RR`
                : '0 pt'
              : `${ep} pt`;
          recentDays.push({
            date: ymd,
            label,
            subtitle,
            status: statusLabel,
            pointsLabel,
            submission: entry,
            entryCount: dayEntries.length,
          });
        }
      }
    }
  }

  // 8. Team Ranking & Points
  const cutoffDate =
    league.status === 'completed'
      ? league.end_date
      : addDaysYYYYMMDD(todayYmd, -2);

  const { data: allApprovedEntries } = await supabase
    .from('effortentry')
    .select(
      'league_member_id, date, rr_value, workout_type, outcome, status, type',
    )
    .in(
      'league_member_id',
      (allLeagueMembers.data || []).map((m: any) => m.league_member_id),
    )
    .eq('status', 'approved')
    .lte('date', cutoffDate);

  const teamPointsMap = new Map<string, number>();
  const teamRRMap = new Map<string, { total: number; count: number }>();
  const teamMemberMap = new Map<string, Set<string>>();

  (allLeagueMembers.data || []).forEach((m: any) => {
    if (m.team_id) {
      if (!teamMemberMap.has(m.team_id))
        teamMemberMap.set(m.team_id, new Set());
      teamMemberMap.get(m.team_id)!.add(m.league_member_id);
    }
  });

  const allDeduped = new Map<string, any>();
  (allApprovedEntries || []).forEach((e) => {
    const key = `${e.league_member_id}_${e.date}_${e.workout_type || ''}`;
    if (!allDeduped.has(key)) allDeduped.set(key, e);
  });

  const memberToTeam = new Map<string, string>();
  (allLeagueMembers.data || []).forEach((m: any) => {
    if (m.team_id) memberToTeam.set(m.league_member_id, m.team_id);
  });

  const getEntryPoints = (entry: any): number => {
    if (formula === 'points_only') return getEffectivePoints(entry);
    return 1;
  };

  Array.from(allDeduped.values()).forEach((e) => {
    const tId = memberToTeam.get(e.league_member_id);
    if (tId) {
      const currentPoints = teamPointsMap.get(tId) || 0;
      teamPointsMap.set(tId, currentPoints + getEntryPoints(e));

      const rr = Number(e.rr_value) || (e.type === 'rest' ? 1 : 0);
      if (rr > 0) {
        const stats = teamRRMap.get(tId) || { total: 0, count: 0 };
        stats.total += rr;
        stats.count += 1;
        teamRRMap.set(tId, stats);
      }
    }
  });

  uniqueChallengeSubs.forEach((s) => {
    if (s.team_id) {
      const current = teamPointsMap.get(s.team_id) || 0;
      teamPointsMap.set(
        s.team_id,
        current +
          (s.awarded_points ?? (s.leagueschallenges as any)?.total_points ?? 0),
      );
    }
  });

  const teamRankings = Array.from(teamMemberMap.keys())
    .map((tId) => ({
      team_id: tId,
      total_points: teamPointsMap.get(tId) || 0,
      avg_rr:
        (teamRRMap.get(tId)?.count || 0) > 0
          ? teamRRMap.get(tId)!.total / teamRRMap.get(tId)!.count
          : 0,
    }))
    .sort((a, b) => b.total_points - a.total_points || b.avg_rr - a.avg_rr);

  const myTeamStats = teamId
    ? teamRankings.find((t) => t.team_id === teamId)
    : null;
  const myTeamRank = teamId
    ? teamRankings.findIndex((t) => t.team_id === teamId) + 1
    : null;

  return {
    league,
    stats: statsRes.data || null,
    mySummary: {
      points,
      totalPoints: points,
      challengePoints: personalChallengePoints,
      avgRR,
      restUsed,
      restUnused,
      missedDays,
      teamPoints: myTeamStats?.total_points || 0,
      teamRank: myTeamRank || null,
      teamAvgRR: myTeamStats
        ? Math.round(myTeamStats.avg_rr * 100) / 100
        : null,
      teamChallengePoints: teamChanPts,
    },
    recentDays: recentDays.reverse(),
    rejectedCount,
    isMonthlyFrequency: isMonthly,
  };
}
