import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import {
  deriveLeagueStatus,
  persistLeagueStatusIfNeeded,
} from '@/lib/services/leagues';
import { getAuthUser } from '@/lib/auth/get-auth-user';

// ============================================================================
// GET /api/user/leagues
// ============================================================================

/**
 * Fetches all leagues for the current user with their roles in each league.
 *
 * Returns:
 * - league_id, name, description, cover_image, status
 * - roles: Array of role names the user has in this league
 * - team_id, team_name: The user's team in this league (if any)
 * - is_host: Boolean indicating if user is the league host
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authUser.id;

    const supabase = getSupabaseServiceRole();

    // Get all league memberships for the user.
    // NOTE: We intentionally avoid embedded joins here because some DBs no longer have
    // `leagues.team_size`, and embedded relation queries may still reference it.
    const { data: memberships, error: membershipError } = await supabase
      .from('leaguemembers')
      .select('league_id, team_id')
      .eq('user_id', userId);

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError);
      return NextResponse.json(
        { error: 'Failed to fetch leagues' },
        { status: 500 },
      );
    }

    const leagueIds = Array.from(
      new Set((memberships || []).map((m: any) => m.league_id).filter(Boolean)),
    );
    const teamIds = Array.from(
      new Set((memberships || []).map((m: any) => m.team_id).filter(Boolean)),
    );

    // Early return if no memberships
    if (leagueIds.length === 0) {
      return NextResponse.json({ leagues: [] });
    }

    // Parallelize the second level of queries
    const [leaguesRes, roleAssignmentsRes, teamsRes, teamLeaguesRes] =
      await Promise.all([
        // 1. Fetch leagues
        supabase
          .from('leagues')
          .select(
            'league_id, league_name, description, status, start_date, end_date, num_teams, tier_id, is_public, is_exclusive, invite_code, created_by, logo_url, branding, rr_config, rest_days',
          )
          .in('league_id', leagueIds),

        // 2. Get all role assignments for the user
        supabase
          .from('assignedrolesforleague')
          .select(
            `
          league_id,
          roles (
            role_name
          )
        `,
          )
          .eq('user_id', userId),

        // 3. Fetch teams
        teamIds.length > 0
          ? supabase
              .from('teams')
              .select('team_id, team_name')
              .in('team_id', teamIds)
          : Promise.resolve({ data: [], error: null }),

        // 4. Fetch team logos from teamleagues
        teamIds.length > 0
          ? supabase
              .from('teamleagues')
              .select('team_id, league_id, logo_url')
              .in('team_id', teamIds)
              .in('league_id', leagueIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    const { data: leaguesData, error: leaguesError } = leaguesRes;
    const { data: roleAssignments, error: roleError } = roleAssignmentsRes;
    const { data: teamsData, error: teamsError } = teamsRes;
    const { data: teamLeaguesData } = teamLeaguesRes;

    if (leaguesError || roleError || teamsError) {
      console.error('Error fetching league data:', {
        leaguesError,
        roleError,
        teamsError,
      });
      return NextResponse.json(
        { error: 'Failed to fetch league data' },
        { status: 500 },
      );
    }

    // Parallelize the third level of queries (dependent on leaguesData)
    const creatorIds = Array.from(
      new Set(
        (leaguesData || []).map((l: any) => l.created_by).filter(Boolean),
      ),
    );
    const tierIds = Array.from(
      new Set((leaguesData || []).map((l: any) => l.tier_id).filter(Boolean)),
    );

    const [usersRes, tiersRes] = await Promise.all([
      creatorIds.length > 0
        ? supabase
            .from('users')
            .select('user_id, username')
            .in('user_id', creatorIds)
        : Promise.resolve({ data: [] }),
      tierIds.length > 0
        ? supabase
            .from('league_tiers')
            .select('tier_id, league_capacity')
            .in('tier_id', tierIds)
        : Promise.resolve({ data: [] }),
    ]);

    let creatorNameMap = new Map<string, string>();
    (usersRes.data || []).forEach((u: any) => {
      creatorNameMap.set(u.user_id, u.username);
    });

    let tierCapacityMap = new Map<string, number>();
    (tiersRes.data || []).forEach((t: any) => {
      tierCapacityMap.set(t.tier_id, t.league_capacity || 20);
    });

    let teamLogoMap = new Map<string, string | null>();
    for (const tl of teamLeaguesData || []) {
      teamLogoMap.set(`${tl.team_id}_${tl.league_id}`, tl.logo_url || null);
    }

    const leagueById = new Map(
      (leaguesData || []).map((l: any) => [l.league_id, l] as const),
    );
    const teamById = new Map(
      (teamsData || []).map((t: any) => [t.team_id, t] as const),
    );

    // Build a map of league_id -> roles[]
    const rolesMap = new Map<string, string[]>();
    (roleAssignments || []).forEach((assignment: any) => {
      const leagueId = assignment.league_id;
      const roleName = assignment.roles?.role_name;
      if (leagueId && roleName) {
        if (!rolesMap.has(leagueId)) {
          rolesMap.set(leagueId, []);
        }
        rolesMap.get(leagueId)!.push(roleName);
      }
    });

    const pendingStatusUpdates: Promise<boolean>[] = [];

    // Build the response
    const leagues = (memberships || []).map((membership: any) => {
      const leagueId = membership.league_id;
      const league = leagueById.get(leagueId);
      const team = membership.team_id ? teamById.get(membership.team_id) : null;
      const roles = rolesMap.get(leagueId) || [];

      // Check if user is host (created the league or has host role)
      const isHost = league?.created_by === userId || roles.includes('host');

      // If user has no explicit roles but is a member, they're at least a player
      if (roles.length === 0) {
        roles.push('player');
      }

      // Get league_capacity from tier map
      const leagueCapacity = league?.tier_id
        ? tierCapacityMap.get(league.tier_id) || 20
        : 20;

      let derivedStatus = 'draft';
      let shouldPersist = false;
      try {
        const result = deriveLeagueStatus(league || {});
        derivedStatus = result.derivedStatus;
        shouldPersist = result.shouldPersist;
      } catch (e) {
        console.error(`Error deriving status for league ${leagueId}:`, e);
      }

      if (shouldPersist && leagueId) {
        pendingStatusUpdates.push(
          persistLeagueStatusIfNeeded(
            leagueId,
            league?.status || null,
            derivedStatus,
          ),
        );
      }

      return {
        league_id: leagueId,
        name: league?.league_name || 'Unknown League',
        description: league?.description || null,
        logo_url: league?.logo_url || null,
        status: derivedStatus,
        start_date: league?.start_date || null,
        end_date: league?.end_date || null,
        num_teams: league?.num_teams || 4,
        league_capacity: leagueCapacity,
        is_public: league?.is_public || false,
        is_exclusive: league?.is_exclusive || true,
        invite_code: league?.invite_code || null,
        roles: Array.isArray(roles) ? roles : [],
        team_id: team?.team_id || membership.team_id || null,
        team_name: team?.team_name || null,
        team_logo_url: membership.team_id
          ? teamLogoMap.get(`${membership.team_id}_${leagueId}`) || null
          : null,
        is_host: isHost,
        creator_name: league?.created_by
          ? creatorNameMap.get(league.created_by) || null
          : null,
        branding: (league as any)?.branding || null,
        rr_config: (league as any)?.rr_config || null,
        rest_days: (league as any)?.rest_days ?? 1,
        league_mode: (league as any)?.league_mode || 'standard',
      };
    });

    // Remove duplicates (user might have multiple entries)
    const uniqueLeagues = Array.from(
      new Map(leagues.map((l: any) => [l.league_id, l])).values(),
    );

    if (pendingStatusUpdates.length > 0) {
      await Promise.allSettled(pendingStatusUpdates);
    }

    return NextResponse.json({ leagues: uniqueLeagues });
  } catch (err) {
    console.error('Error in /api/user/leagues:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
