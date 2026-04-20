/**
 * GET /api/leagues/[id]/teams - List all teams in a league
 * POST /api/leagues/[id]/teams - Create a new team (Host/Governor only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import { z } from 'zod';
import {
  getTeamsForLeague,
  getTeamCountForLeague,
  createTeamForLeague,
  getLeagueMembersWithTeams,
  getLeagueGovernors,
} from '@/lib/services/teams';
import { getLeagueById } from '@/lib/services/leagues';
import { userHasAnyRole } from '@/lib/services/roles';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getTeamSizeStats } from '@/lib/utils/normalization';

const createTeamSchema = z.object({
  team_name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authUser.id;

    // Check if user is a member of this league (via leaguemembers or assignedrolesforleague)
    const supabase = getSupabaseServiceRole();

    // Check leaguemembers table
    const { data: memberCheck } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    // Also check assignedrolesforleague (user might have role without being in leaguemembers)
    const hasRole = await userHasAnyRole(userId, leagueId, [
      'host',
      'governor',
      'captain',
      'player',
    ]);

    if (!memberCheck && !hasRole) {
      return NextResponse.json(
        { error: 'You are not a member of this league' },
        { status: 403 }
      );
    }

    // Get league to check num_teams limit
    const league = await getLeagueById(leagueId);
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Get teams with member counts and captain info
    const teams = await getTeamsForLeague(leagueId);

    // Get league members (allocated and unallocated)
    const { allocated, unallocated } = await getLeagueMembersWithTeams(leagueId);

    console.log('[GET Teams] League:', leagueId, 'Allocated:', allocated.length, 'Unallocated:', unallocated.length);
    console.log('[GET Teams] Unallocated members:', unallocated.map(m => ({ user_id: m.user_id, username: m.username })));

    // Get governors info
    const governors = await getLeagueGovernors(leagueId);

    // Calculate team size variance stats
    const teamSizeStats = getTeamSizeStats(
      teams.map(t => ({
        teamId: t.team_id,
        teamName: t.team_name,
        memberCount: t.member_count || 0,
      }))
    );

    // Determine max capacity for UI display
    let displayCapacity = 40;

    if (league.tier_snapshot && typeof league.tier_snapshot === 'object') {
      // @ts-ignore
      const snapshotMax = league.tier_snapshot.max_participants;
      if (snapshotMax) {
        displayCapacity = Number(snapshotMax);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        teams,
        members: {
          allocated,
          unallocated,
        },
        governors,
        league: {
          league_id: league.league_id,
          league_name: league.league_name,
          invite_code: league.invite_code || null,
          num_teams: league.num_teams || 0,
          league_capacity: displayCapacity,
          status: league.status,
          host_user_id: league.created_by,
          normalize_points_by_team_size: league.normalize_points_by_team_size,
          logo_url: league.logo_url || null,
          tier_name: (league.tier_snapshot as any)?.display_name || (league.tier_snapshot as any)?.tier_name || null,
        },
        teamSizeVariance: {
          hasVariance: teamSizeStats.hasVariance,
          minSize: teamSizeStats.minSize,
          maxSize: teamSizeStats.maxSize,
          avgSize: teamSizeStats.avgSize,
        },
        meta: {
          current_team_count: teams.length,
          max_teams: league.num_teams ?? 0,
          can_create_more: teams.length < (league.num_teams ?? 0),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authUser.id;

    // Check permissions (must be host or governor)
    const canCreate = await userHasAnyRole(userId, leagueId, [
      'host',
      'governor',
    ]);

    console.log('[Create Team] User:', userId, 'League:', leagueId, 'canCreate:', canCreate);

    if (!canCreate) {
      return NextResponse.json(
        { error: 'Only host or governor can create teams' },
        { status: 403 }
      );
    }

    // Get league to check limits
    const league = await getLeagueById(leagueId);
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Check if max teams reached
    const currentCount = await getTeamCountForLeague(leagueId);
    const maxTeams = league.num_teams ?? 0;
    if (currentCount >= maxTeams) {
      return NextResponse.json(
        { error: `Maximum of ${maxTeams} teams allowed for this league` },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validated = createTeamSchema.parse(body);

    // Create the team
    const team = await createTeamForLeague(
      leagueId,
      validated.team_name,
      userId
    );

    if (!team) {
      return NextResponse.json(
        { error: 'Failed to create team. Team name may already exist.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: team },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating team:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
