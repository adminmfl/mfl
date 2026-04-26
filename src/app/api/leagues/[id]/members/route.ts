/**
 * GET /api/leagues/[id]/members - List league members (with roles)
 * POST /api/leagues/[id]/members - Add member (Host/Governor only)
 * PATCH /api/leagues/[id]/members - Move member to different team (Host only)
 * DELETE /api/leagues/[id]/members - Remove member from league (Host only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { addLeagueMember } from '@/lib/services/memberships';
import { userHasAnyRole } from '@/lib/services/roles';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import { z } from 'zod';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

const addMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  team_id: z.string().uuid('Invalid team ID').optional(),
});

const moveMemberSchema = z.object({
  memberId: z.string().min(1, 'Member ID required'),
  teamId: z.string().min(1, 'Team ID required'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Initial parallel fetches: Members and User Info
    const supabase = getSupabaseServiceRole();
    const { data: membersRaw, error: membersError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, user_id, league_id, team_id')
      .eq('league_id', id);

    if (membersError) {
      console.error('Error fetching league members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 },
      );
    }

    const members = membersRaw || [];
    const userIds = members.map((m: any) => m.user_id);

    // 2. Fetch Usernames and Roles in parallel
    const [usersRes, rolesRes] = await Promise.all([
      supabase.from('users').select('user_id, username').in('user_id', userIds),
      supabase
        .from('assignedrolesforleague')
        .select('user_id, roles(role_name)')
        .eq('league_id', id)
        .in('user_id', userIds),
    ]);

    const usernameMap = new Map(
      (usersRes.data || []).map((u: any) => [u.user_id, u.username]),
    );

    // Build a map of user_id -> roles[]
    const roleMap = new Map<string, string[]>();
    (rolesRes.data || []).forEach((row: any) => {
      const uid = row.user_id;
      const roleName = row.roles?.role_name;
      if (uid && roleName) {
        if (!roleMap.has(uid)) roleMap.set(uid, []);
        roleMap.get(uid)!.push(roleName);
      }
    });

    // Check if user is member of league (using in-memory check)
    const isUserMember = members.some((m: any) => m.user_id === authUser.id);
    if (!isUserMember) {
      return NextResponse.json(
        { error: 'You are not a member of this league' },
        { status: 403 },
      );
    }

    // Combine everything
    const membersWithRoles = members.map((member) => {
      const roles = roleMap.get(member.user_id) || [];
      // Default to player if no explicit roles found
      if (roles.length === 0) roles.push('player');

      return {
        ...member,
        username: usernameMap.get(member.user_id) || null,
        roles: roles,
      };
    });

    return NextResponse.json({ data: membersWithRoles, success: true });
  } catch (error) {
    console.error('Error fetching league members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (must be host or governor)
    const canAdd = await userHasAnyRole(authUser.id, id, ['host', 'governor']);
    if (!canAdd) {
      return NextResponse.json(
        { error: 'Only host or governor can add members' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = addMemberSchema.parse(body);

    const member = await addLeagueMember(
      validated.user_id,
      id,
      validated.team_id,
      authUser.id,
    );

    if (!member) {
      return NextResponse.json(
        { error: 'Failed to add member' },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: member, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH: Move member to different team (host only)
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leagueId } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Host only
    const isHost = await userHasAnyRole(authUser.id, leagueId, ['host']);
    if (!isHost) {
      return NextResponse.json(
        { error: 'Only league host can move members' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { memberId, teamId } = moveMemberSchema.parse(body);

    const supabase = getSupabaseServiceRole();

    // Verify member exists in league
    const { data: member, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, user_id, league_id, team_id')
      .eq('league_member_id', memberId)
      .eq('league_id', leagueId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found in league' },
        { status: 404 },
      );
    }

    // Verify team exists in league
    const { data: teamLink, error: teamError } = await supabase
      .from('teamleagues')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('league_id', leagueId)
      .single();

    if (teamError || !teamLink) {
      return NextResponse.json(
        { error: 'Team not found in league' },
        { status: 404 },
      );
    }

    // Move member to team
    const success = await assignMemberToTeam(memberId, teamId, authUser.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to move member' },
        { status: 500 },
      );
    }

    // Fetch and return updated member
    const { data: updatedMember } = await supabase
      .from('leaguemembers')
      .select(
        `
        league_member_id,
        user_id,
        team_id,
        league_id,
        users!leaguemembers_user_id_fkey(username, email),
        teams(team_name)
      `,
      )
      .eq('league_member_id', memberId)
      .single();

    return NextResponse.json({
      data: {
        league_member_id: updatedMember?.league_member_id,
        user_id: updatedMember?.user_id,
        team_id: updatedMember?.team_id,
        league_id: updatedMember?.league_id,
        username: (updatedMember?.users as any)?.username,
        email: (updatedMember?.users as any)?.email,
        team_name: (updatedMember?.teams as any)?.team_name,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error moving member:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to move member' },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE: Remove member from league (host only)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leagueId } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Host only
    const isHost2 = await userHasAnyRole(authUser.id, leagueId, ['host']);
    if (!isHost2) {
      return NextResponse.json(
        { error: 'Only league host can remove members' },
        { status: 403 },
      );
    }

    // Get member ID from query string
    const memberId = request.nextUrl.searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceRole();

    // Verify member exists in league
    const { data: member, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, user_id, league_id')
      .eq('league_member_id', memberId)
      .eq('league_id', leagueId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found in league' },
        { status: 404 },
      );
    }

    // Prevent host from removing themselves
    if (member.user_id === authUser.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the league' },
        { status: 400 },
      );
    }

    // Delete the league member record
    const { error: deleteError } = await supabase
      .from('leaguemembers')
      .delete()
      .eq('league_member_id', memberId);

    if (deleteError) {
      console.error('Error deleting member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 },
      );
    }

    // Also clean up any roles assigned to this user in this league
    await supabase
      .from('assignedrolesforleague')
      .delete()
      .eq('user_id', member.user_id)
      .eq('league_id', leagueId);

    return NextResponse.json({
      message: 'Member removed from league',
      data: { memberId },
      success: true,
    });
  } catch (error) {
    console.error('Error removing member from league:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 },
    );
  }
}
