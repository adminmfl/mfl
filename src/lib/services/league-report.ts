/**
 * League Report Service
 * 
 * Aggregates all data needed for generating a personalized PDF report
 * for a league member's journey in a league.
 */

import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ActivitySummary {
    activityName: string;
    sessionCount: number;
    totalDuration: number | null;  // minutes
    totalDistance: number | null;  // km
    totalSteps: number | null;
    totalHoles: number | null;
}

export interface RestDaysSummary {
    total: number;
    donated: number;
    received: number;
    dates: string[];  // ISO date strings (YYYY-MM-DD)
}

export interface ChallengeSummary {
    name: string;
    type: 'individual' | 'team' | 'sub_team';
    status: 'Completed' | 'Not completed';
    pointsEarned: number;
    totalPoints: number;
}

export interface RankingsSummary {
    userRankInTeam: number;
    userRankInLeague: number;
    teamRankInLeague: number;
    userTotalPoints: number;
    teamTotalPoints: number;
}

export interface PerformanceSummary {
    totalActivities: number;
    totalActiveDays: number;
    totalRestDays: number;
    totalChallengePoints: number;
    finalLeagueScore: number;
    totalMissedDays: number;
    bestStreak: number;
}

export interface LeagueReportData {
    // User & League Overview
    user: {
        userId: string;
        username: string;
    };
    league: {
        leagueId: string;
        name: string;
        startDate: string;
        endDate: string;
        logoUrl: string | null;
        rrConfig: { formula: string } | null;
        restDaysConfig: number;
    };
    team: {
        teamId: string;
        name: string;
        logoUrl: string | null;
    } | null;
    finalIndividualScore: number;
    finalTeamScore: number;

    // Summaries
    activities: ActivitySummary[];
    restDays: RestDaysSummary;
    challenges: ChallengeSummary[];
    rankings: RankingsSummary;
    performance: PerformanceSummary;

    // Metadata
    generatedAt: string;
    averageRR: number;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Get all data needed for a league member's personalized report
 * @param leagueId - The league ID
 * @param userId - The user ID to generate the report for
 * @param options - Optional date range for dynamic reports
 * @returns LeagueReportData or null if user is not a member
 */
export async function getLeagueReportData(
    leagueId: string,
    userId: string,
    options?: { startDate?: string; endDate?: string }
): Promise<LeagueReportData | null> {
    const supabase = getSupabaseServiceRole();

    // 1. Get league member info
    const { data: leagueMember, error: memberError } = await supabase
        .from('leaguemembers')
        .select('league_member_id, team_id')
        .eq('user_id', userId)
        .eq('league_id', leagueId)
        .maybeSingle();

    if (memberError || !leagueMember) {
        console.error('League member not found:', memberError);
        return null;
    }

    const leagueMemberId = leagueMember.league_member_id;

    // 2. Get user info
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('user_id, username')
        .eq('user_id', userId)
        .single();

    if (userError || !user) {
        console.error('User not found:', userError);
        return null;
    }

    // 3. Get league info
    const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('league_id, league_name, start_date, end_date, logo_url, normalize_points_by_team_size, rr_config, rest_days')
        .eq('league_id', leagueId)
        .single();

    if (leagueError || !league) {
        console.error('League not found:', leagueError);
        return null;
    }

    // 4. Get team info (with logo from teamleagues)
    let teamInfo: { teamId: string; name: string; logoUrl: string | null } | null = null;
    if (leagueMember.team_id) {
        const { data: team } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .eq('team_id', leagueMember.team_id)
            .single();

        if (team) {
            // Get team logo from teamleagues junction table
            const { data: teamLeague } = await supabase
                .from('teamleagues')
                .select('logo_url')
                .eq('team_id', leagueMember.team_id)
                .eq('league_id', leagueId)
                .maybeSingle();

            teamInfo = {
                teamId: team.team_id,
                name: team.team_name,
                logoUrl: teamLeague?.logo_url || null,
            };
        }
    }

    // 5. Get all effort entries for this member (approved only for scoring)
    // ALWAYS filter to league date range to exclude pre-league / post-league entries.
    // Dynamic reports can narrow the range further via options.
    const effectiveStart = options?.startDate || league.start_date;
    const effectiveEnd = options?.endDate || league.end_date;

    const { data: entries } = await supabase
        .from('effortentry')
        .select('*')
        .eq('league_member_id', leagueMemberId)
        .eq('status', 'approved')
        .gte('date', effectiveStart)
        .lte('date', effectiveEnd);

    const allEntries = entries || [];

    // 6. Build custom activity name map and aggregate activity data
    const activityNameMap = new Map<string, string>();
    const { data: laRows } = await supabase
        .from('leagueactivities')
        .select('activity_id, custom_activity_id, activities(activity_name), custom_activities(activity_name)')
        .eq('league_id', leagueId);
    for (const row of (laRows || [])) {
        if ((row as any).custom_activity_id && (row as any).custom_activities?.activity_name) {
            activityNameMap.set((row as any).custom_activity_id, (row as any).custom_activities.activity_name);
        }
    }
    const activities = aggregateActivities(allEntries, activityNameMap);

    // 7. Get rest days + donation info
    const { data: donatedRows } = await supabase
        .from('rest_day_donations')
        .select('days_transferred')
        .eq('donor_member_id', leagueMemberId)
        .eq('status', 'approved');
    const { data: receivedRows } = await supabase
        .from('rest_day_donations')
        .select('days_transferred')
        .eq('receiver_member_id', leagueMemberId)
        .eq('status', 'approved');

    const donated = (donatedRows || []).reduce((sum, r) => sum + (r.days_transferred || 0), 0);
    const received = (receivedRows || []).reduce((sum, r) => sum + (r.days_transferred || 0), 0);
    const restDays = aggregateRestDays(allEntries, donated, received);

    // 8. Get challenge data
    const challenges = await getChallengesSummary(supabase, leagueId, leagueMemberId, leagueMember.team_id);

    // 9. Get rankings
    const rankings = await getRankings(
        supabase,
        leagueId,
        userId,
        leagueMember.team_id,
        (league as any).normalize_points_by_team_size || false,
        { start: effectiveStart, end: effectiveEnd }
    );

    // 10. Calculate performance summary
    // Deduplicate workout entries by date+activity (multiple activities per day each count)
    const workoutEntries = allEntries.filter(e => e.type === 'workout');
    const totalChallengePoints = challenges.reduce((sum, c) => sum + c.pointsEarned, 0);
    const activeDatesSet = new Set(workoutEntries.map(e => e.date));
    // totalActivities = unique date+activity combos (not just unique dates)
    const uniqueWorkoutKeys = new Set(workoutEntries.map(e => `${e.date}_${(e as any).workout_type || ''}`));
    const uniqueWorkoutCount = uniqueWorkoutKeys.size;

    // Calculate missed days
    // Use date range if provided, otherwise full league duration
    const reportStartDate = options?.startDate ? new Date(options.startDate) : new Date(league.start_date);
    const reportEndDate = options?.endDate ? new Date(options.endDate) : new Date(league.end_date);
    const diffTime = Math.abs(reportEndDate.getTime() - reportStartDate.getTime());
    const totalReportDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Union of active and rest dates to avoid double counting if any overlap (though unlikely)
    const allLoggedDates = new Set([
        ...Array.from(activeDatesSet),
        ...restDays.dates
    ]);

    // Ensure we don't return negative missed days if data is weird or extra entries
    const totalMissedDays = Math.max(0, totalReportDays - allLoggedDates.size);


    // Calculate best streak (consecutive workout days)
    const bestStreak = calculateBestStreak(activeDatesSet, reportStartDate, reportEndDate);

    const performance: PerformanceSummary = {
        totalActivities: uniqueWorkoutCount,
        totalActiveDays: activeDatesSet.size,
        totalRestDays: restDays.total,
        totalMissedDays,
        totalChallengePoints,
        finalLeagueScore: rankings.userTotalPoints,
        bestStreak,
    };

    // Calculate Average RR
    // Average of rr_value from all approved workout entries
    let totalRR = 0;
    let rrCount = 0;

    for (const entry of workoutEntries) {
        if (entry.rr_value) {
            totalRR += parseFloat(String(entry.rr_value));
            rrCount++;
        }
    }

    const averageRR = rrCount > 0 ? Number((totalRR / rrCount).toFixed(2)) : 0;

    return {
        user: {
            userId: user.user_id,
            username: user.username,
        },
        league: {
            leagueId: league.league_id,
            name: league.league_name,
            startDate: league.start_date,
            endDate: league.end_date,
            logoUrl: league.logo_url,
            rrConfig: league.rr_config as { formula: string } | null,
            restDaysConfig: (league.rest_days as number) ?? 1,
        },
        team: teamInfo,
        finalIndividualScore: rankings.userTotalPoints,
        finalTeamScore: rankings.teamTotalPoints,
        activities,
        restDays,
        challenges,
        rankings,
        performance,
        generatedAt: new Date().toISOString(),
        averageRR,
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateBestStreak(activeDates: Set<string>, startDate: Date, endDate: Date): number {
    let bestStreak = 0;
    let currentStreak = 0;
    const d = new Date(startDate);
    while (d <= endDate) {
        const ds = d.toISOString().split('T')[0];
        if (activeDates.has(ds)) {
            currentStreak++;
            if (currentStreak > bestStreak) bestStreak = currentStreak;
        } else {
            currentStreak = 0;
        }
        d.setDate(d.getDate() + 1);
    }
    return bestStreak;
}

function aggregateActivities(entries: any[], activityNameMap?: Map<string, string>): ActivitySummary[] {
    const workoutEntries = entries.filter(e => e.type === 'workout');

    const activityMap = new Map<string, {
        count: number;
        totalDuration: number;
        totalDistance: number;
        totalSteps: number;
        totalHoles: number;
    }>();

    for (const entry of workoutEntries) {
        const rawType = entry.workout_type || 'Unknown Activity';
        const activityName = activityNameMap?.get(rawType) || rawType;
        const existing = activityMap.get(activityName) || {
            count: 0,
            totalDuration: 0,
            totalDistance: 0,
            totalSteps: 0,
            totalHoles: 0,
        };

        existing.count += 1;
        existing.totalDuration += entry.duration || 0;
        existing.totalDistance += parseFloat(entry.distance) || 0;
        existing.totalSteps += entry.steps || 0;
        existing.totalHoles += entry.holes || 0;

        activityMap.set(activityName, existing);
    }

    return Array.from(activityMap.entries()).map(([name, data]) => ({
        activityName: name,
        sessionCount: data.count,
        totalDuration: data.totalDuration > 0 ? data.totalDuration : null,
        totalDistance: data.totalDistance > 0 ? data.totalDistance : null,
        totalSteps: data.totalSteps > 0 ? data.totalSteps : null,
        totalHoles: data.totalHoles > 0 ? data.totalHoles : null,
    }));
}

function aggregateRestDays(entries: any[], donated: number = 0, received: number = 0): RestDaysSummary {
    const restEntries = entries.filter(e => e.type === 'rest');
    const dates = restEntries.map(e => e.date).sort();

    return {
        total: restEntries.length,
        donated,
        received,
        dates,
    };
}

async function getChallengesSummary(
    supabase: ReturnType<typeof getSupabaseServiceRole>,
    leagueId: string,
    leagueMemberId: string,
    teamId: string | null
): Promise<ChallengeSummary[]> {
    // Get all challenges for this league (active, published, closed, submission_closed)
    const { data: leagueChallenges } = await supabase
        .from('leagueschallenges')
        .select(`
      id,
      name,
      challenge_type,
      total_points,
      status
    `)
        .eq('league_id', leagueId)
        .in('status', ['active', 'submission_closed', 'published', 'closed']);

    if (!leagueChallenges || leagueChallenges.length === 0) {
        return [];
    }

    const challengeIds = leagueChallenges.map(c => c.id);

    // Get user's submissions for these challenges
    const { data: submissions } = await supabase
        .from('challenge_submissions')
        .select('league_challenge_id, status, awarded_points')
        .eq('league_member_id', leagueMemberId)
        .in('league_challenge_id', challengeIds);

    const submissionMap = new Map<string, { status: string; points: number }>();
    for (const sub of (submissions || [])) {
        submissionMap.set(sub.league_challenge_id, {
            status: sub.status,
            points: sub.awarded_points || 0,
        });
    }

    return leagueChallenges.map(challenge => {
        const submission = submissionMap.get(challenge.id);
        const isCompleted = submission?.status === 'approved';
        const pointsEarned = submission?.points || 0;

        return {
            name: challenge.name || 'Unnamed Challenge',
            type: challenge.challenge_type as 'individual' | 'team' | 'sub_team',
            status: isCompleted ? 'Completed' : 'Not completed',
            pointsEarned,
            totalPoints: challenge.total_points || 0,
        };
    });
}

async function getRankings(
    supabase: ReturnType<typeof getSupabaseServiceRole>,
    leagueId: string,
    userId: string,
    teamId: string | null,
    normalizePoints: boolean = false,
    dateRange?: { start: string; end: string }
): Promise<RankingsSummary> {
    // Get all members with their points for ranking calculation
    const { data: allMembers } = await supabase
        .from('leaguemembers')
        .select(`
      league_member_id,
      user_id,
      team_id
    `)
        .eq('league_id', leagueId);

    if (!allMembers || allMembers.length === 0) {
        return {
            userRankInTeam: 0,
            userRankInLeague: 0,
            teamRankInLeague: 0,
            userTotalPoints: 0,
            teamTotalPoints: 0,
        };
    }

    const memberIds = allMembers.map(m => m.league_member_id);

    // Get all approved entries for scoring — filtered to league date range
    // LOGIC MATCH: Same as /api/leagues/[id]/leaderboard — use points_per_session from leagueactivities
    let entriesQuery = supabase
        .from('effortentry')
        .select('league_member_id, date, rr_value, workout_type, outcome')
        .eq('status', 'approved')
        .in('league_member_id', memberIds);

    if (dateRange) {
        entriesQuery = entriesQuery.gte('date', dateRange.start).lte('date', dateRange.end);
    }

    const { data: allEntries } = await entriesQuery;

    // Fetch activity points configuration for this league (including outcome_config)
    const activityPointsMap = new Map<string, { points_per_session: number; outcome_config: any[] | null }>();
    const { data: laRows } = await supabase
        .from('leagueactivities')
        .select('activity_id, custom_activity_id, points_per_session, outcome_config, activities(activity_name)')
        .eq('league_id', leagueId);
    for (const row of (laRows || [])) {
        const config = { points_per_session: (row as any).points_per_session ?? 1, outcome_config: (row as any).outcome_config ?? null };
        if ((row as any).activities?.activity_name) {
            activityPointsMap.set((row as any).activities.activity_name, config);
        }
        if (row.custom_activity_id) {
            activityPointsMap.set(row.custom_activity_id, config);
        }
    }

    // Helper to resolve points for an entry (matches leaderboard getEntryPoints)
    const getEntryPoints = (entry: any): number => {
        if (!entry.workout_type) return 1;
        const config = activityPointsMap.get(entry.workout_type);
        if (!config) return 1;
        if (config.outcome_config && Array.isArray(config.outcome_config) && entry.outcome) {
            const match = config.outcome_config.find((o: any) => o.label === entry.outcome);
            if (match) return match.points;
        }
        return config.points_per_session;
    };

    // Deduplicate: one entry per date per member per activity (matches leaderboard logic)
    const seenMemberDate = new Set<string>();
    const dedupedEntries: typeof allEntries = [];
    for (const entry of (allEntries || [])) {
        const key = `${entry.league_member_id}:${entry.date}:${(entry as any).workout_type || ''}`;
        if (!seenMemberDate.has(key)) {
            seenMemberDate.add(key);
            dedupedEntries.push(entry);
        }
    }

    // Calculate points per member using configured points (with outcome support)
    const memberPoints = new Map<string, number>();
    for (const entry of dedupedEntries) {
        const current = memberPoints.get(entry.league_member_id) || 0;
        memberPoints.set(entry.league_member_id, current + getEntryPoints(entry));
    }

    // Map user_id to points
    const userPointsMap = new Map<string, number>();
    for (const member of allMembers) {
        const points = memberPoints.get(member.league_member_id) || 0;
        userPointsMap.set(member.user_id, points);
    }

    // Get challenge bonus points - including challenge type to filter correct scoring
    const { data: challengeSubs } = await supabase
        .from('challenge_submissions')
        .select(`
            league_member_id, 
            awarded_points, 
            status,
            leagueschallenges!inner (
                challenge_type,
                total_points
            )
        `)
        .eq('status', 'approved')
        .in('league_member_id', memberIds);

    // Pre-compute team sizes for proportional scaling of team challenges
    const teamSizes = new Map<string, number>();
    for (const member of allMembers) {
        if (member.team_id) {
            teamSizes.set(member.team_id, (teamSizes.get(member.team_id) || 0) + 1);
        }
    }
    const maxTeamSize = Math.max(...Array.from(teamSizes.values()), 1);

    // UPDATED LOGIC: Add ALL challenge points to member totals (Individual, Team, Sub-team)
    // For team challenges, apply proportional scaling: visible = (awarded / I) × V
    for (const sub of (challengeSubs || [])) {
        const challenge = sub.leagueschallenges as any;

        const member = allMembers.find(m => m.league_member_id === sub.league_member_id);
        if (member) {
            const current = userPointsMap.get(member.user_id) || 0;

            // Logic matching Leaderboard: use awarded if present, else default to total
            let points = sub.awarded_points !== null ? sub.awarded_points : (challenge.total_points || 0);

            // Apply proportional scaling for team challenges
            if (challenge.challenge_type === 'team' && maxTeamSize > 0) {
                const totalPoints = Number(challenge.total_points || 0);
                const memberTeamSize = member.team_id ? (teamSizes.get(member.team_id) || 1) : 1;
                const internalCap = memberTeamSize > 0 ? totalPoints / memberTeamSize : totalPoints;
                const visibleCap = totalPoints / maxTeamSize;
                const proportion = internalCap > 0 ? points / internalCap : 1;
                points = Math.min(proportion * visibleCap, visibleCap);
            }

            userPointsMap.set(member.user_id, current + points);
        }
    }

    const userPoints = userPointsMap.get(userId) || 0;

    // Calculate league rank
    const allPoints = Array.from(userPointsMap.values()).sort((a, b) => b - a);
    const userRankInLeague = allPoints.indexOf(userPoints) + 1;

    // Calculate team rankings
    let userRankInTeam = 0;
    let teamTotalPoints = 0;
    let teamRankInLeague = 0;

    if (teamId) {
        const teamMembers = allMembers.filter(m => m.team_id === teamId);
        const teamMemberPoints = teamMembers.map(m => userPointsMap.get(m.user_id) || 0).sort((a, b) => b - a);
        userRankInTeam = teamMemberPoints.indexOf(userPoints) + 1;
        teamTotalPoints = teamMemberPoints.reduce((sum, p) => sum + p, 0);

        // Calculate normalization if enabled
        let teamSizes = new Map<string, number>();
        let maxTeamSize = 0;

        if (normalizePoints) {
            for (const member of allMembers) {
                if (member.team_id) {
                    teamSizes.set(member.team_id, (teamSizes.get(member.team_id) || 0) + 1);
                }
            }
            maxTeamSize = Math.max(...Array.from(teamSizes.values()));
        }

        // Calculate team ranks across all teams
        const teamScores = new Map<string, number>();
        for (const member of allMembers) {
            if (member.team_id) {
                const current = teamScores.get(member.team_id) || 0;
                teamScores.set(member.team_id, current + (userPointsMap.get(member.user_id) || 0));
            }
        }

        // Apply normalization
        if (normalizePoints && maxTeamSize > 0) {
            for (const [tId, rawScore] of teamScores.entries()) {
                const size = teamSizes.get(tId) || 1;
                // Formula: (raw / size) * max
                const normalized = Math.round(rawScore * (maxTeamSize / size));
                teamScores.set(tId, normalized);
            }
        }

        const allTeamScores = Array.from(teamScores.values()).sort((a, b) => b - a);

        // Update teamTotalPoints to use the normalized score if applicable
        if (normalizePoints && teamId) {
            teamTotalPoints = teamScores.get(teamId) || 0;
        } else if (teamId && !normalizePoints) {
            // Re-fetch strictly from map to be safe, though accumulator loop above should equal it
            teamTotalPoints = teamScores.get(teamId) || 0;
        }

        teamRankInLeague = allTeamScores.indexOf(teamTotalPoints) + 1;
    }

    return {
        userRankInTeam,
        userRankInLeague,
        teamRankInLeague,
        userTotalPoints: Math.round(userPoints * 100) / 100,
        teamTotalPoints: Math.round(teamTotalPoints * 100) / 100,
    };
}
