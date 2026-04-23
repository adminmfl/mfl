/**
 * GET /api/leagues/[id]/submissions - Get all submissions for a league (Host/Governor only)
 *
 * Returns all effort entries for the specified league with member and team info.
 * Used by Host and Governor for the "All Submissions" oversight view.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { userHasAnyRole } from '@/lib/services/roles';

// ============================================================================
// Types
// ============================================================================

export interface LeagueSubmission {
  id: string;
  league_member_id: string;
  date: string;
  type: 'workout' | 'rest';
  workout_type: string | null;
  duration: number | null;
  distance: number | null;
  steps: number | null;
  holes: number | null;
  rr_value: number | null;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'rejected_resubmit'
    | 'rejected_permanent';
  proof_url: string | null;
  notes: string | null;
  created_date: string;
  modified_date: string;
  reupload_of: string | null;
  rejection_reason: string | null;
  member: {
    user_id: string;
    username: string;
    email: string;
    team_id: string | null;
    team_name: string | null;
  };
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as
      | import('next-auth').Session
      | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user is host or governor (only they can access all submissions)
    const canAccess = await userHasAnyRole(userId, leagueId, [
      'host',
      'governor',
    ]);

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Only host or governor can view all submissions' },
        { status: 403 },
      );
    }

    const supabase = getSupabaseServiceRole();

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'pending'
      | 'approved'
      | 'rejected'
      | 'rejected_resubmit'
      | 'rejected_permanent'
      | null;
    const teamId = searchParams.get('teamId');

    // 1. Initial parallel fetches: Members and League Activities
    const [membersRes, activitiesRes] = await Promise.all([
      supabase
        .from('leaguemembers')
        .select(
          `
          league_member_id,
          user_id,
          team_id,
          users!leaguemembers_user_id_fkey(username, email),
          teams(team_name)
        `,
        )
        .eq('league_id', leagueId),
      supabase
        .from('leagueactivities')
        .select(
          'activity_id, custom_activity_id, points_per_session, outcome_config, activities(activity_name), custom_activities(activity_name)',
        )
        .eq('league_id', leagueId),
    ]);

    const { data: members, error: membersError } = membersRes;
    const { data: leagueActivities } = activitiesRes;

    if (membersError) {
      console.error('Error fetching league members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch league members' },
        { status: 500 },
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          submissions: [],
          stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
          teams: [],
        },
      });
    }

    // Create a map of league_member_id to member info
    const memberMap = new Map<
      string,
      {
        user_id: string;
        username: string;
        email: string;
        team_id: string | null;
        team_name: string | null;
      }
    >();

    const teamSet = new Set<string>();

    members.forEach((m) => {
      const user = m.users as any;
      const team = m.teams as any;
      memberMap.set(m.league_member_id, {
        user_id: m.user_id,
        username: user?.username || 'Unknown',
        email: user?.email || '',
        team_id: m.team_id,
        team_name: team?.team_name || null,
        suspicious_proof_strikes: Number(m.suspicious_proof_strikes ?? 0),
      });
      if (m.team_id && team?.team_name) {
        teamSet.add(
          JSON.stringify({ team_id: m.team_id, team_name: team.team_name }),
        );
      }
    });

    const memberIds = members.map((m) => m.league_member_id);

    // 2. Fetch all effort entries with parallel pagination
    const PAGE_SIZE = 1000;
    let submissions: any[] = [];

    // Initial fetch to get count and first page
    let initialQuery = supabase
      .from('effortentry')
      .select(
        `
        id, league_member_id, date, type, workout_type, duration, distance, steps, holes, rr_value, status, proof_url, notes, created_date, modified_date, reupload_of, rejection_reason, outcome
      `,
        { count: 'exact' },
      )
      .in('league_member_id', memberIds)
      .order('date', { ascending: false });

    if (status) {
      initialQuery = initialQuery.eq('status', status);
    }

    const {
      data: firstPageData,
      count,
      error: firstPageError,
    } = await initialQuery.range(0, PAGE_SIZE - 1);

    if (firstPageError) {
      console.error('Error fetching submissions (page 0):', firstPageError);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 },
      );
    }

    submissions = firstPageData || [];
    const totalCount = count || 0;

    if (totalCount > PAGE_SIZE) {
      const remainingPages = Math.ceil((totalCount - PAGE_SIZE) / PAGE_SIZE);
      const pagePromises = [];

      for (let i = 1; i <= remainingPages; i++) {
        let q = supabase
          .from('effortentry')
          .select(
            `
            id, league_member_id, date, type, workout_type, duration, distance, steps, holes, rr_value, status, proof_url, notes, created_date, modified_date, reupload_of, rejection_reason, outcome
          `,
          )
          .in('league_member_id', memberIds)
          .order('date', { ascending: false });

        if (status) {
          q = q.eq('status', status);
        }

        pagePromises.push(q.range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1));
      }

      const results = await Promise.all(pagePromises);
      results.forEach((res, index) => {
        if (res.error) {
          console.error(
            `Error fetching submissions page ${index + 1}:`,
            res.error,
          );
        }
        if (res.data) submissions = submissions.concat(res.data);
      });
    }

    const activityPointsMap = new Map<
      string,
      { points_per_session: number; outcome_config: any[] | null }
    >();
    const activityNameMap = new Map<string, string>();
    (leagueActivities || []).forEach((row: any) => {
      const config = {
        points_per_session: row.points_per_session ?? 1,
        outcome_config: row.outcome_config,
      };
      const key = row.custom_activity_id || row.activity_id;
      if (key) activityPointsMap.set(key, config);
      // Also key by activity name since workout_type stores the name string
      const actName = row.activities?.activity_name;
      if (actName) activityPointsMap.set(actName, config);
      // Build custom activity name map for UUID resolution
      if (
        row.custom_activity_id &&
        (row as any).custom_activities?.activity_name
      ) {
        activityNameMap.set(
          row.custom_activity_id,
          (row as any).custom_activities.activity_name,
        );
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

    // Enrich submissions with member info, effective_points, and filter by team if needed
    let enrichedSubmissions: LeagueSubmission[] = (submissions || []).map(
      (s) => ({
        ...s,
        effective_points: getEffectivePoints(s),
        custom_activity_name: s.workout_type
          ? activityNameMap.get(s.workout_type) || null
          : null,
        member: memberMap.get(s.league_member_id) || {
          user_id: '',
          username: 'Unknown',
          email: '',
          team_id: null,
          team_name: null,
        },
      }),
    );

    // Filter by team if specified
    if (teamId) {
      enrichedSubmissions = enrichedSubmissions.filter(
        (s) => s.member.team_id === teamId,
      );
    }

    // Calculate summary stats (from filtered results)
    const stats = {
      total: enrichedSubmissions.length,
      pending: enrichedSubmissions.filter((s) => s.status === 'pending').length,
      approved: enrichedSubmissions.filter((s) => s.status === 'approved')
        .length,
      rejected: enrichedSubmissions.filter((s) =>
        ['rejected', 'rejected_resubmit', 'rejected_permanent'].includes(
          s.status,
        ),
      ).length,
    };

    // Get unique teams for filter dropdown
    const teams = Array.from(teamSet).map((t) => JSON.parse(t));

    return NextResponse.json({
      success: true,
      data: {
        submissions: enrichedSubmissions,
        stats,
        teams,
      },
    });
  } catch (error) {
    console.error('Error in submissions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
