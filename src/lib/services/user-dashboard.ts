import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { cache } from 'react';

export interface UserDashboardSummary {
  activitiesLogged: number;
  challengePoints: number;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  hasLeagues: boolean;
}

export const getUserDashboardSummary = cache(async (userId: string): Promise<UserDashboardSummary> => {
  try {
    const supabase = getSupabaseServiceRole();

    // 1. Get all league memberships for user
    const { data: memberships, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, league_id, team_id')
      .eq('user_id', userId);

    if (memberError) throw memberError;
    if (!memberships || memberships.length === 0) {
      return {
        activitiesLogged: 0,
        challengePoints: 0,
        totalPoints: 0,
        currentStreak: 0,
        bestStreak: 0,
        hasLeagues: false
      };
    }

    const memberIds = memberships.map(m => m.league_member_id);
    
    // 2. Fetch data in parallel
    // We join challenge_submissions with leagueschallenges to get points directly
    const [entriesRes, subsRes] = await Promise.all([
      supabase
        .from('effortentry')
        .select('date, league_member_id')
        .in('league_member_id', memberIds)
        .eq('status', 'approved')
        .order('date', { ascending: true }),
      supabase
        .from('challenge_submissions')
        .select(`
          awarded_points,
          leagueschallenges (
            total_points
          )
        `)
        .in('league_member_id', memberIds)
        .in('status', ['approved', 'accepted'])
    ]);

    if (entriesRes.error) throw entriesRes.error;
    if (subsRes.error) throw subsRes.error;

    const entries = entriesRes.data || [];
    const challengeSubs = subsRes.data || [];

    // 3. Process Activities Logged (unique dates across all leagues)
    const dateSet = new Set<string>();
    entries.forEach(e => {
      if (e.date) dateSet.add(e.date);
    });
    const activitiesLogged = dateSet.size;

    // 4. Process Challenge Points
    let challengePoints = 0;
    challengeSubs.forEach((sub: any) => {
      const pts = sub.awarded_points ?? sub.leagueschallenges?.total_points ?? 0;
      challengePoints += Number(pts);
    });

    const totalPoints = activitiesLogged + challengePoints;

    // 5. Compute Streaks
    // Group entries by league_member_id first to avoid repeated filtering
    const entriesByMember = new Map<string, string[]>();
    entries.forEach(e => {
      if (!e.date) return;
      if (!entriesByMember.has(e.league_member_id)) {
        entriesByMember.set(e.league_member_id, []);
      }
      entriesByMember.get(e.league_member_id)!.push(e.date);
    });

    const helper = {
      addDays: (dateStr: string, days: number) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        dt.setDate(dt.getDate() + days);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      },
      today: () => {
        const dt = new Date();
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }
    };

    const todayStr = helper.today();
    const yesterdayStr = helper.addDays(todayStr, -1);
    let overallBest = 0;
    let overallCurrent = 0;

    entriesByMember.forEach((dates) => {
      // Dates are already sorted by the query
      if (dates.length === 0) return;

      const uniqueDates = Array.from(new Set(dates));
      const dateSetLocal = new Set(uniqueDates);
      
      let longest = 0;
      let currentSeq = 0;
      let prevDate: string | null = null;

      for (const d of uniqueDates) {
        if (prevDate && helper.addDays(prevDate, 1) === d) {
          currentSeq++;
        } else {
          currentSeq = 1;
        }
        if (currentSeq > longest) longest = currentSeq;
        prevDate = d;
      }

      // Current streak: must include today or yesterday
      let curLen = 0;
      if (dateSetLocal.has(todayStr) || dateSetLocal.has(yesterdayStr)) {
        let cursor = dateSetLocal.has(todayStr) ? todayStr : yesterdayStr;
        while (dateSetLocal.has(cursor)) {
          curLen++;
          cursor = helper.addDays(cursor, -1);
        }
      }

      if (longest > overallBest) overallBest = longest;
      if (curLen > overallCurrent) overallCurrent = curLen;
    });

    return {
      activitiesLogged,
      challengePoints,
      totalPoints,
      currentStreak: overallCurrent,
      bestStreak: overallBest,
      hasLeagues: true
    };

  } catch (error) {
    console.error('Error in getUserDashboardSummary:', error);
    throw error;
  }
});
