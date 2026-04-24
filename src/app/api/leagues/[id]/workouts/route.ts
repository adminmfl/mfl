/**
 * GET /api/leagues/[id]/workouts - Fetch approved workouts for viewing
 *
 * Query params:
 *   team_id  - Required. Which team's workouts to view
 *   user_id  - Optional. Filter to specific member's workouts
 *   limit    - Optional. Max results (default 5)
 *
 * Access rules:
 *   - Host/Governor: always allowed
 *   - Captain/Vice Captain: always allowed for their team
 *   - Player: only if league has the visibility setting enabled
 *     - Same team: player_team_workout_visibility
 *     - Other team: player_league_workout_visibility
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

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

    const supabase = getSupabaseServiceRole();
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const targetTeamId = searchParams.get('team_id');
    const targetUserId = searchParams.get('user_id');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '5', 10) || 5,
      50,
    );

    if (!targetTeamId) {
      return NextResponse.json(
        { error: 'team_id is required' },
        { status: 400 },
      );
    }

    // Get user's membership (may be null for non-participating hosts/governors) and roles in parallel
    const [{ data: membership }, { data: userRoles }, { data: league }] =
      await Promise.all([
        supabase
          .from('leaguemembers')
          .select('league_member_id, team_id')
          .eq('user_id', userId)
          .eq('league_id', leagueId)
          .maybeSingle(),
        supabase
          .from('assignedrolesforleague')
          .select('roles!inner(role_name)')
          .eq('user_id', userId)
          .eq('league_id', leagueId),
        supabase
          .from('leagues')
          .select(
            'created_by, player_team_workout_visibility, player_league_workout_visibility',
          )
          .eq('league_id', leagueId)
          .single(),
      ]);

    const roleNames = (userRoles || [])
      .map((r: any) => r.roles?.role_name)
      .filter(Boolean);
    const isHost = league?.created_by === userId || roleNames.includes('host');
    const isGovernor = roleNames.includes('governor');

    // Non-member, non-leader → reject
    if (!membership && !isHost && !isGovernor) {
      return NextResponse.json(
        { error: 'Not a member of this league' },
        { status: 403 },
      );
    }

    const isCaptainLevel =
      roleNames.includes('captain') || roleNames.includes('vice_captain');
    const isSameTeam = membership?.team_id === targetTeamId;

    // Permission check
    if (!isHost && !isGovernor) {
      if (isCaptainLevel && isSameTeam) {
        // Captain/VC can always see their own team
      } else if (isCaptainLevel && !isSameTeam) {
        // Captain/VC viewing other team — only if league-wide visibility is on
        if (!league?.player_league_workout_visibility) {
          return NextResponse.json(
            { error: 'Cross-team workout visibility is not enabled' },
            { status: 403 },
          );
        }
      } else if (isSameTeam) {
        if (!league?.player_team_workout_visibility) {
          return NextResponse.json(
            { error: 'Workout visibility is not enabled for your team' },
            { status: 403 },
          );
        }
      } else {
        if (!league?.player_league_workout_visibility) {
          return NextResponse.json(
            { error: 'Cross-team workout visibility is not enabled' },
            { status: 403 },
          );
        }
      }
    }

    // Get target team members
    const { data: teamMembers } = await supabase
      .from('leaguemembers')
      .select(
        'league_member_id, user_id, users!leaguemembers_user_id_fkey(username)',
      )
      .eq('team_id', targetTeamId)
      .eq('league_id', leagueId);

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({ success: true, data: { workouts: [] } });
    }

    let memberIds = teamMembers.map((m: any) => m.league_member_id);

    // If targeting a specific user, filter
    if (targetUserId) {
      const targetMember = teamMembers.find(
        (m: any) => m.user_id === targetUserId,
      );
      if (!targetMember) {
        return NextResponse.json({ success: true, data: { workouts: [] } });
      }
      memberIds = [targetMember.league_member_id];
    }

    const memberMap = new Map<string, { user_id: string; username: string }>();
    teamMembers.forEach((m: any) => {
      memberMap.set(m.league_member_id, {
        user_id: m.user_id,
        username: (m.users as any)?.username || 'Unknown',
      });
    });

    // Fetch approved workouts — per member, last N each
    let result: any[] = [];

    if (targetUserId) {
      const { data: workouts, error } = await supabase
        .from('effortentry')
        .select(
          'id, league_member_id, date, type, workout_type, duration, distance, steps, holes, rr_value, status, created_date',
        )
        .in('league_member_id', memberIds)
        .eq('status', 'approved')
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching workouts:', error);
        return NextResponse.json(
          { error: 'Failed to fetch workouts' },
          { status: 500 },
        );
      }

      result = (workouts || []).map((w: any) => ({
        ...w,
        member: memberMap.get(w.league_member_id) || {
          user_id: '',
          username: 'Unknown',
        },
      }));
    } else {
      // Fetch last N per member individually to avoid one member crowding out others
      const perMemberResults = await Promise.all(
        memberIds.map(async (mid) => {
          const { data } = await supabase
            .from('effortentry')
            .select(
              'id, league_member_id, date, type, workout_type, duration, distance, steps, holes, rr_value, status, created_date',
            )
            .eq('league_member_id', mid)
            .eq('status', 'approved')
            .order('date', { ascending: false })
            .limit(limit);
          return (data || []).map((w: any) => ({
            ...w,
            member: memberMap.get(w.league_member_id) || {
              user_id: '',
              username: 'Unknown',
            },
          }));
        }),
      );
      result = perMemberResults.flat();
    }

    return NextResponse.json({ success: true, data: { workouts: result } });
  } catch (error) {
    console.error('Error in workouts GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
