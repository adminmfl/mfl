/**
 * GET /api/user/rejected-submissions
 *
 * Returns a per-league summary of the authenticated user's rejected submissions.
 * Includes a small in-memory TTL cache to reduce unnecessary DB load.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

type RejectedLeagueSummary = {
  league_id: string;
  league_name: string;
  rejectedCount: number;
  latestDate: string | null;
};

type ApiResponse = {
  success: true;
  data: {
    totalRejected: number;
    leagues: RejectedLeagueSummary[];
    cached: boolean;
    cacheTtlMs: number;
  };
} | {
  success: false;
  error: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: ApiResponse }>();

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const force = request.nextUrl.searchParams.get('force');
    const bypassCache = force === '1' || force === 'true';

    const cached = bypassCache ? undefined : cache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      // Mark cached=true for callers.
      if (cached.value.success) {
        return NextResponse.json({
          ...cached.value,
          data: { ...cached.value.data, cached: true },
        });
      }
      return NextResponse.json(cached.value);
    }

    const supabase = getSupabaseServiceRole();

    // Fetch memberships (avoid embedded joins for maximum schema compatibility).
    const { data: memberships, error: membershipsError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, league_id')
      .eq('user_id', userId);

    if (membershipsError) {
      console.error('Error fetching memberships:', membershipsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch memberships' }, { status: 500 });
    }

    const membershipRows = (memberships || []) as unknown as Array<{
      league_member_id: string;
      league_id: string;
    }>;

    if (membershipRows.length === 0) {
      const value: ApiResponse = {
        success: true,
        data: { totalRejected: 0, leagues: [], cached: false, cacheTtlMs: CACHE_TTL_MS },
      };
      cache.set(userId, { expiresAt: now + CACHE_TTL_MS, value });
      return NextResponse.json(value);
    }

    const leagueMemberIds = membershipRows.map((m) => m.league_member_id);

    const leagueIds = Array.from(new Set(membershipRows.map((m) => m.league_id).filter(Boolean)));
    const { data: leaguesData, error: leaguesError } = await supabase
      .from('leagues')
      .select('league_id, league_name')
      .in('league_id', leagueIds);

    if (leaguesError) {
      console.error('Error fetching leagues:', leaguesError);
      return NextResponse.json({ success: false, error: 'Failed to fetch leagues' }, { status: 500 });
    }

    const leagueNameById = new Map((leaguesData || []).map((l: any) => [l.league_id, l.league_name] as const));

    // Fetch all entries for these memberships so we can decide per-day latest status.
    const { data: entries, error: entriesError } = await supabase
      .from('effortentry')
      .select('league_member_id, date, status, created_date, modified_date, workout_type')
      .in('league_member_id', leagueMemberIds);

    if (entriesError) {
      console.error('Error fetching submissions:', entriesError);
      return NextResponse.json({ success: false, error: 'Failed to fetch submissions' }, { status: 500 });
    }

    const membershipByLmId = new Map(
      membershipRows.map((m) => {
        return [
          m.league_member_id,
          {
            league_id: m.league_id,
            league_name: leagueNameById.get(m.league_id) || 'Unknown league',
          },
        ] as const;
      })
    );

    // For each (league_member_id, date, activity), take the latest entry and count it as rejected only if that latest status is rejected.
    type EntryRow = { league_member_id: string; date: string; status: string; created_date: string | null; modified_date: string | null; workout_type?: string | null };
    const latestByMemberDate = new Map<string, EntryRow>();

    const allEntries = (entries || []) as EntryRow[];
    for (const row of allEntries) {
      if (!row.date || !row.league_member_id) continue;
      const key = `${row.league_member_id}::${row.date}::${row.workout_type || ''}`;
      const existing = latestByMemberDate.get(key);
      const ts = (row.modified_date || row.created_date || '').toString();
      if (!existing) {
        latestByMemberDate.set(key, row);
      } else {
        const existingTs = (existing.modified_date || existing.created_date || '').toString();
        if (ts > existingTs) {
          latestByMemberDate.set(key, row);
        }
      }
    }

    // Deduplicate by date per league, counting only if latest status for that day is rejected.
    const byLeague = new Map<string, { dates: Set<string>; latestDate: string | null; meta: { league_id: string; league_name: string } }>();

    for (const entry of latestByMemberDate.values()) {
      if (entry.status !== 'rejected') continue;
      const meta = membershipByLmId.get(entry.league_member_id);
      if (!meta) continue;

      const key = meta.league_id;
      const bucket = byLeague.get(key) ?? {
        dates: new Set<string>(),
        latestDate: null,
        meta,
      };

      bucket.dates.add(entry.date);
      if (!bucket.latestDate || entry.date > bucket.latestDate) {
        bucket.latestDate = entry.date;
      }

      byLeague.set(key, bucket);
    }

    const leagues: RejectedLeagueSummary[] = Array.from(byLeague.values()).map(({ dates, latestDate, meta }) => ({
      league_id: meta.league_id,
      league_name: meta.league_name,
      rejectedCount: dates.size,
      latestDate,
    })).sort((a, b) => {
      // Sort with most recent rejection first.
      const ad = a.latestDate || '';
      const bd = b.latestDate || '';
      if (bd !== ad) return bd.localeCompare(ad);
      return b.rejectedCount - a.rejectedCount;
    });

    const totalRejected = leagues.reduce((sum, l) => sum + l.rejectedCount, 0);

    const value: ApiResponse = {
      success: true,
      data: { totalRejected, leagues, cached: false, cacheTtlMs: CACHE_TTL_MS },
    };

    cache.set(userId, { expiresAt: now + CACHE_TTL_MS, value });
    return NextResponse.json(value);
  } catch (error) {
    console.error('Error in rejected-submissions GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
