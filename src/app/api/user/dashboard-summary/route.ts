import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    // 1. Get all league memberships for user
    const { data: memberships, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, league_id, team_id')
      .eq('user_id', userId);

    if (memberError) throw memberError;
    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          activitiesLogged: 0,
          challengePoints: 0,
          totalPoints: 0,
          currentStreak: 0,
          bestStreak: 0,
          hasLeagues: false
        }
      });
    }

    const memberIds = memberships.map(m => m.league_member_id);
    const leagueIds = Array.from(new Set(memberships.map(m => m.league_id)));

    // 2. Fetch data in parallel
    const [entriesRes, challengesRes, subsRes] = await Promise.all([
      supabase
        .from('effortentry')
        .select('date, type, status, league_member_id')
        .in('league_member_id', memberIds)
        .eq('status', 'approved'),
      supabase
        .from('leagueschallenges')
        .select('id, league_id, total_points, status')
        .in('league_id', leagueIds),
      supabase
        .from('challenge_submissions')
        .select('league_challenge_id, league_member_id, status, awarded_points')
        .in('league_member_id', memberIds)
        .in('status', ['approved', 'accepted'])
    ]);

    if (entriesRes.error) throw entriesRes.error;
    if (challengesRes.error) throw challengesRes.error;
    if (subsRes.error) throw subsRes.error;

    const entries = entriesRes.data || [];
    const challenges = challengesRes.data || [];
    const challengeSubs = subsRes.data || [];

    // 3. Process Activities Logged (unique dates across all leagues)
    const dateSet = new Set<string>();
    entries.forEach(e => {
      if (e.date) dateSet.add(e.date);
    });
    const activitiesLogged = dateSet.size;

    // 4. Process Challenge Points
    let challengePoints = 0;
    challengeSubs.forEach(sub => {
      const challenge = challenges.find(c => c.id === sub.league_challenge_id);
      if (challenge) {
        const pts = sub.awarded_points != null ? Number(sub.awarded_points) : Number(challenge.total_points || 0);
        if (!isNaN(pts) && pts > 0) challengePoints += pts;
      }
    });

    const totalPoints = activitiesLogged + challengePoints;

    // 5. Compute Streaks
    function addDaysYMD(dateString: string, days: number) {
      const [y, m, d] = dateString.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + days);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }

    function todayYMD() {
      const dt = new Date();
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }

    const today = todayYMD();
    let overallBest = 0;
    let overallCurrent = 0;

    memberships.forEach(m => {
      const leagueEntries = entries.filter(e => e.league_member_id === m.league_member_id);
      const dates = Array.from(new Set(leagueEntries.map(e => e.date).filter(Boolean))).sort();
      if (dates.length === 0) return;

      const dateSetLocal = new Set(dates);
      let longest = 0;
      for (const d of dates) {
        if (!dateSetLocal.has(addDaysYMD(d, -1))) {
          let len = 1, next = addDaysYMD(d, 1);
          while (dateSetLocal.has(next)) { len++; next = addDaysYMD(next, 1); }
          if (len > longest) longest = len;
        }
      }

      let curLen = 0;
      if (dateSetLocal.has(today)) {
        let cursor = today;
        while (dateSetLocal.has(cursor)) { curLen++; cursor = addDaysYMD(cursor, -1); }
      }

      if (longest > overallBest) overallBest = longest;
      if (curLen > overallCurrent) overallCurrent = curLen;
    });

    return NextResponse.json({
      success: true,
      data: {
        activitiesLogged,
        challengePoints,
        totalPoints,
        currentStreak: overallCurrent,
        bestStreak: overallBest,
        hasLeagues: true
      }
    });

  } catch (error) {
    console.error('Error in dashboard-summary GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
