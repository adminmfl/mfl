import { getSupabaseServiceRole } from '@/lib/supabase/client';
import type { PlayerInsightContext, InsightScreen, InsightPlacement } from '@/lib/ai/types';
import { getBestInsights } from '@/lib/ai/trigger-evaluator';

function todayYMD(): string {
  // IST (UTC+5:30)
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const da = new Date(a);
  const db = new Date(b);
  return Math.floor((db.getTime() - da.getTime()) / (86400 * 1000));
}

export async function getAiContext(leagueId: string, userId: string, origin: string): Promise<PlayerInsightContext | null> {
  const supabase = getSupabaseServiceRole();
  const today = todayYMD();

  // Parallel queries for efficiency
  // Note: We're calling the leaderboard API via fetch because of its extreme complexity.
  // In a real production environment, we should call the service directly once extracted.
  const [
    leagueRes,
    memberRes,
    todayEntriesRes,
    activitiesRes,
  ] = await Promise.all([
    supabase
      .from('leagues')
      .select('league_id, league_name, start_date, end_date, status, rest_days')
      .eq('league_id', leagueId)
      .single(),
    supabase
      .from('leaguemembers')
      .select('league_member_id, team_id, teams(team_name)')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('effortentry')
      .select('league_member_id, leaguemembers!inner(user_id, team_id)')
      .eq('leaguemembers.league_id', leagueId)
      .eq('date', today)
      .in('status', ['approved', 'pending']),
    supabase
      .from('leagueactivities')
      .select('activity_id, custom_activity_id, activities(measurement_type), custom_activities(measurement_type)')
      .eq('league_id', leagueId),
  ]);

  // Note: Leaderboard data is heavy. We previously fetched it via API.
  // We'll skip it for lightweight context if possible, or fetch only what's needed.
  // For now, let's keep it minimal to fix the 5.3s LCP.
  const leaderboardData = null; 

  const league = leagueRes.data;
  const member = memberRes.data;

  if (!league || !member) return null;

  const teamId = member.team_id;
  const teamName = (member as any).teams?.team_name || null;

  const todayEntries = todayEntriesRes.data || [];
  let teamMembersLogged = 0;
  let teamTotalMembers = 0;

  if (teamId) {
    const { count } = await supabase
      .from('leaguemembers')
      .select('league_member_id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('team_id', teamId);
    teamTotalMembers = count || 0;

    const teamLoggedUsers = new Set<string>();
    for (const entry of todayEntries) {
      const lm = entry.leaguemembers as any;
      if (lm?.team_id === teamId && lm?.user_id) teamLoggedUsers.add(lm.user_id);
    }
    teamMembersLogged = teamLoggedUsers.size;
  }

  const teamParticipationPct = teamTotalMembers > 0 ? Math.round((teamMembersLogged / teamTotalMembers) * 100) : 0;
  
  const teams = (leaderboardData as any)?.data?.teams || [];
  const individuals = (leaderboardData as any)?.data?.individuals || [];

  const myTeam = teams.find((t: any) => t.team_id === teamId);
  const leaderTeam = teams.length > 0 ? teams[0] : null;
  const teamRank = myTeam?.rank ?? null;
  const teamPoints = myTeam?.total_points ?? 0;
  const teamAvgRR = myTeam?.avg_rr ?? null;
  const isLeading = teamRank === 1;
  const pointsBehindLeader = leaderTeam && myTeam && !isLeading ? leaderTeam.total_points - myTeam.total_points : 0;
  const rankDelta = teamRank !== null ? teamRank - 1 : 0;

  const myIndividual = individuals.find((i: any) => i.user_id === userId);
  const playerPoints = myIndividual?.points ?? 0;
  const playerAvgRR = myIndividual?.avg_rr ?? null;
  const playerRank = myIndividual?.rank ?? null;

  const hasLoggedToday = todayEntries.some((e: any) => e.leaguemembers?.user_id === userId);

  let missedDays = 0;
  let restDaysUsed = 0;
  let consecutiveDaysActive = 0;

  const { data: myEntries } = await supabase
    .from('effortentry')
    .select('date, type, status')
    .eq('league_member_id', member.league_member_id)
    .in('status', ['approved', 'pending'])
    .order('date', { ascending: false })
    .limit(500);

  if (myEntries && myEntries.length > 0) {
    restDaysUsed = myEntries.filter((e: any) => e.type === 'rest').length;
    const entryDates = new Set(myEntries.map((e: any) => e.date));
    const todayDate = new Date(today);
    for (let i = 0; i < 365; i++) {
       const checkDate = new Date(todayDate);
       checkDate.setDate(checkDate.getDate() - i);
       const dateStr = checkDate.toISOString().slice(0, 10);
       if (dateStr < (league.start_date || '').slice(0, 10)) break;
       if (entryDates.has(dateStr)) consecutiveDaysActive++; else break;
    }
    const startDate = (league.start_date || '').slice(0, 10);
    const leagueDaysSoFar = Math.max(0, daysBetween(startDate, today) + 1);
    missedDays = Math.max(0, leagueDaysSoFar - new Set(myEntries.map((e: any) => e.date)).size);
  }

  const startDate = (league.start_date || '').slice(0, 10);
  const endDate = (league.end_date || '').slice(0, 10);
  const leagueDay = Math.max(1, daysBetween(startDate, today) + 1);
  const totalLeagueDays = Math.max(1, daysBetween(startDate, endDate) + 1);
  const daysRemaining = Math.max(0, daysBetween(today, endDate));
  const isFinalWeek = daysRemaining <= 7 && daysRemaining > 0;
  const isLastDay = daysRemaining === 0 && today <= endDate;

  const activities = activitiesRes.data || [];
  const hasAnyMeasurementActivity = activities.some((a: any) => {
    const mt = a.activities?.measurement_type || a.custom_activities?.measurement_type || 'duration';
    return mt !== 'none';
  });

  return {
    playerId: userId,
    playerName: 'Player', // Fallback
    teamId,
    teamName,
    leagueId,
    playerPoints,
    playerAvgRR,
    playerRank,
    missedDays,
    restDaysUsed,
    restDaysAllowed: league.rest_days || 0,
    consecutiveDaysActive,
    hasLoggedToday,
    teamPoints,
    teamAvgRR,
    teamRank,
    teamParticipationPct,
    teamMembersLogged,
    teamTotalMembers,
    teamMembersRemaining: Math.max(0, teamTotalMembers - teamMembersLogged),
    rankDelta,
    pointsBehindLeader,
    isLeading,
    leagueDay,
    totalLeagueDays,
    isFinalWeek,
    isLastDay,
    leagueStatus: league.status,
    hasAnyMeasurementActivity,
  };
}

export async function getBestInsightsServer(leagueId: string, userId: string, screen: InsightScreen, placements: InsightPlacement[], origin: string) {
  const ctx = await getAiContext(leagueId, userId, origin);
  if (!ctx) return null;
  return getBestInsights(ctx, screen, placements);
}
