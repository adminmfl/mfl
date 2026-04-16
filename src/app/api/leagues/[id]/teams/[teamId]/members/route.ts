/**
 * GET /api/leagues/[id]/teams/[teamId]/members - Get team members
 * POST /api/leagues/[id]/teams/[teamId]/members - Add member to team
 * DELETE /api/leagues/[id]/teams/[teamId]/members - Remove member from team
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';
import {
  getTeamMembers,
  assignMemberToTeam,
  removeMemberFromTeam,
} from '@/lib/services/teams';
import { getLeagueById } from '@/lib/services/leagues';
import { userHasAnyRole } from '@/lib/services/roles';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// Helper to check if user is league member
async function isLeagueMember(userId: string, leagueId: string): Promise<boolean> {
  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from('leaguemembers')
    .select('league_member_id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();
  return !!data;
}

const addMemberSchema = z.object({
  league_member_id: z.string().uuid('Invalid member ID'),
});

const removeMemberSchema = z.object({
  league_member_id: z.string().uuid('Invalid member ID'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member of this league and fetch team members in parallel
    const [isMember, hasRole, members] = await Promise.all([
      isLeagueMember(session.user.id, leagueId),
      userHasAnyRole(session.user.id, leagueId, [
        'host',
        'governor',
        'captain',
        'player',
      ]),
      getTeamMembers(teamId, leagueId)
    ]);

    if (!isMember && !hasRole) {
      return NextResponse.json(
        { error: 'You are not a member of this league' },
        { status: 403 }
      );
    }
    console.log('[Team Members API] Fetched members:', members);

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (host, governor, or captain of this specific team)
    const isHostOrGovernor = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
    ]);

    let canAssign = isHostOrGovernor;

    // Captains can only add members to their own team
    if (!canAssign) {
      const isCaptain = await userHasAnyRole(session.user.id, leagueId, ['captain']);
      if (isCaptain) {
        // Verify the captain is on this specific team
        const supabaseCheck = getSupabaseServiceRole();
        const { data: captainMembership } = await supabaseCheck
          .from('leaguemembers')
          .select('team_id')
          .eq('user_id', session.user.id)
          .eq('league_id', leagueId)
          .maybeSingle();

        if (captainMembership && captainMembership.team_id === teamId) {
          canAssign = true;
        }
      }
    }

    if (!canAssign) {
      return NextResponse.json(
        { error: 'Only host, governor, or the team captain can assign members to this team' },
        { status: 403 }
      );
    }

    // Get league to check capacity - capacity now comes from tier
    const league = await getLeagueById(leagueId);
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Get current team size - use a reasonable per-team limit (league_capacity / num_teams or 5)
    const perTeamCapacity = Math.ceil((league.league_capacity || 20) / (league.num_teams || 4));
    const currentMembers = await getTeamMembers(teamId, leagueId);
    if (currentMembers.length >= perTeamCapacity) {
      return NextResponse.json(
        { error: `Team is full. Maximum ${perTeamCapacity} members allowed.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = addMemberSchema.parse(body);

    // Verify the member exists and belongs to this league
    const supabase = getSupabaseServiceRole();
    const { data: member } = await supabase
      .from('leaguemembers')
      .select('league_member_id, team_id, league_id')
      .eq('league_member_id', validated.league_member_id)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found in this league' },
        { status: 404 }
      );
    }

    if (member.team_id) {
      return NextResponse.json(
        { error: 'Member is already assigned to a team' },
        { status: 400 }
      );
    }

    const success = await assignMemberToTeam(
      validated.league_member_id,
      teamId,
      session.user.id
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to assign member to team' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member assigned to team successfully',
    });
  } catch (error) {
    console.error('Error assigning member to team:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to assign member to team' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = removeMemberSchema.parse(body);

    const supabase = getSupabaseServiceRole();
    const { data: targetMember } = await supabase
      .from('leaguemembers')
      .select('league_member_id, team_id, league_id')
      .eq('league_member_id', validated.league_member_id)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found in this league' },
        { status: 404 }
      );
    }

    if (targetMember.team_id !== teamId) {
      return NextResponse.json(
        { error: 'Member is not assigned to this team' },
        { status: 400 }
      );
    }

    const isHostOrGovernor = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
    ]);

    let canRemove = isHostOrGovernor;

    if (!canRemove) {
      const isCaptain = await userHasAnyRole(session.user.id, leagueId, ['captain']);
      if (isCaptain) {
        const { data: captainMembership } = await supabase
          .from('leaguemembers')
          .select('team_id')
          .eq('user_id', session.user.id)
          .eq('league_id', leagueId)
          .maybeSingle();

        if (captainMembership?.team_id === teamId) {
          canRemove = true;
        }
      }
    }

    if (!canRemove) {
      return NextResponse.json(
        { error: 'Only host, governor, or the team captain can remove members from this team' },
        { status: 403 }
      );
    }

    const removalResult = await removeMemberFromTeam(
      validated.league_member_id,
      session.user.id
    );

    if (!removalResult.success) {
      return NextResponse.json(
        { error: removalResult.error || 'Failed to remove member from team' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed from team successfully',
    });
  } catch (error) {
    console.error('Error removing member from team:', error);
    if (error instanceof z.ZodError) {
      const validationMessage = error.errors[0]?.message || 'Validation failed';
      return NextResponse.json(
        { error: validationMessage, details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to remove member from team' },
      { status: 500 }
    );
  }
}
