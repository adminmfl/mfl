/**
 * GET /api/leagues/[id]/my-submissions - Get current user's submissions for a league
 *
 * Returns all effort entries submitted by the authenticated user for the specified league,
 * including status, proof, and metadata.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface MySubmission {
  id: string;
  date: string;
  type: 'workout' | 'rest';
  workout_type: string | null;
  duration: number | null;
  distance: number | null;
  steps: number | null;
  holes: number | null;
  rr_value: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'rejected_resubmit' | 'rejected_permanent';
  proof_url: string | null;
  notes: string | null;
  created_date: string;
  modified_date: string;
  reupload_of: string | null;
  rejection_reason: string | null;
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
    const userId = session.user.id;

    // Get the user's league_member_id for this league
    const { data: leagueMember, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, team_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (memberError) {
      console.error('Error fetching league member:', memberError);
      return NextResponse.json(
        { error: 'Failed to verify membership' },
        { status: 500 }
      );
    }

    if (!leagueMember) {
      return NextResponse.json(
        { error: 'You are not a member of this league' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'rejected_resubmit' | 'rejected_permanent' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query for user's submissions
    let query = supabase
      .from('effortentry')
      .select(`
        id,
        date,
        type,
        workout_type,
        duration,
        distance,
        steps,
        holes,
        rr_value,
        status,
        proof_url,
        notes,
        created_date,
        modified_date,
        reupload_of,
        rejection_reason,
        outcome
      `)
      .eq('league_member_id', leagueMember.league_member_id)
      .order('date', { ascending: false });

    // Apply optional filters
    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: submissions, error: submissionsError } = await query;

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // List of standard workout types to avoid unnecessary UUID checks
    const standardTypes = ['run', 'walk', 'cycling', 'swimming', 'yoga', 'strength', 'hiit', 'pilates', 'dance', 'rowing', 'elliptical', 'stair_stepper', 'hiking', 'kickboxing', 'tennis', 'basketball', 'soccer', 'volleyball', 'golf', 'baseball', 'football', 'rugby', 'cricket', 'hockey', 'badminton', 'table_tennis', 'squash', 'martial_arts', 'boxing', 'others'];

    // Post-process submissions to attach custom activity names
    const customActivityIds = new Set<string>();
    
    // Identify potential custom activity IDs (UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    (submissions || []).forEach(sub => {
      if (sub.workout_type && !standardTypes.includes(sub.workout_type)) {
        if (uuidRegex.test(sub.workout_type)) {
          customActivityIds.add(sub.workout_type);
        }
      }
    });

    let activityMap = new Map<string, string>();

    // Fetch names for custom activities
    if (customActivityIds.size > 0) {
      const { data: customActivities, error: caError } = await supabase
        .from('custom_activities')
        .select('custom_activity_id, activity_name')
        .in('custom_activity_id', Array.from(customActivityIds));
      
      if (!caError && customActivities) {
        customActivities.forEach(ca => {
          activityMap.set(ca.custom_activity_id, ca.activity_name);
        });
      } else if (caError) {
        console.error('Error fetching custom activity names:', caError);
      }
    }

    // Fetch activity points config for effective_points calculation
    const { data: leagueActivities } = await supabase
      .from('leagueactivities')
      .select('activity_id, custom_activity_id, points_per_session, outcome_config, activities(activity_name)')
      .eq('league_id', leagueId);

    const activityPointsMap = new Map<string, { points_per_session: number; outcome_config: any[] | null }>();
    (leagueActivities || []).forEach((row: any) => {
      const config = { points_per_session: row.points_per_session ?? 1, outcome_config: row.outcome_config };
      const key = row.custom_activity_id || row.activity_id;
      if (key) activityPointsMap.set(key, config);
      const actName = row.activities?.activity_name;
      if (actName) activityPointsMap.set(actName, config);
    });

    const getEffectivePoints = (entry: any): number => {
      if (!entry.workout_type) return entry.rr_value ?? 1;
      const config = activityPointsMap.get(entry.workout_type);
      if (!config) return entry.rr_value ?? 1;
      if (config.outcome_config && Array.isArray(config.outcome_config) && entry.outcome) {
        const match = config.outcome_config.find((o: any) => o.label === entry.outcome);
        if (match) return match.points;
      }
      return config.points_per_session;
    };

    // Attach names and effective_points to submissions
    const enrichedSubmissions = (submissions || []).map(sub => {
      const customName = sub.workout_type ? activityMap.get(sub.workout_type) : undefined;
      return {
        ...sub,
        custom_activity_name: customName,
        effective_points: getEffectivePoints(sub),
      };
    });

    // Calculate summary stats
    const stats = {
      total: enrichedSubmissions?.length || 0,
      pending: enrichedSubmissions?.filter((s) => s.status === 'pending').length || 0,
      approved: enrichedSubmissions?.filter((s) => s.status === 'approved').length || 0,
      rejected: enrichedSubmissions?.filter((s) => ['rejected', 'rejected_resubmit', 'rejected_permanent'].includes(s.status)).length || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        submissions: enrichedSubmissions as (MySubmission & { custom_activity_name?: string })[],
        stats,
        leagueMemberId: leagueMember.league_member_id,
        teamId: leagueMember.team_id,
      },
    });
  } catch (error) {
    console.error('Error in my-submissions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
