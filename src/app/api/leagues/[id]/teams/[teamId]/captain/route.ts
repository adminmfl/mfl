/**
 * POST /api/leagues/[id]/teams/[teamId]/captain - Assign captain to team
 * DELETE /api/leagues/[id]/teams/[teamId]/captain - Remove captain from team
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';
import { assignCaptain, removeCaptain, getTeamMembers } from '@/lib/services/teams';
import { userHasAnyRole } from '@/lib/services/roles';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { sendCaptainGuidance } from '@/lib/services/bonding-automations';

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

const assignCaptainSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
});

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

    // Check permissions (must be host or governor)
    const canAssign = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
    ]);

    if (!canAssign) {
      return NextResponse.json(
        { error: 'Only host or governor can assign captains' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = assignCaptainSchema.parse(body);

    const result = await assignCaptain(
      validated.user_id,
      teamId,
      leagueId,
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to assign captain' },
        { status: 400 }
      );
    }

    // Send captain guidance message (don't block response)
    sendCaptainGuidance(leagueId, teamId, validated.user_id).catch(error => {
      console.error('[Bonding] Error sending captain guidance:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Captain assigned successfully',
    });
  } catch (error) {
    console.error('Error assigning captain:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to assign captain' },
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

    // Check permissions (must be host or governor)
    const canRemove = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
    ]);

    if (!canRemove) {
      return NextResponse.json(
        { error: 'Only host or governor can remove captains' },
        { status: 403 }
      );
    }

    // Find current captain of this team
    const members = await getTeamMembers(teamId, leagueId);
    const captain = members.find((m) => m.is_captain);

    if (!captain) {
      return NextResponse.json(
        { error: 'No captain assigned to this team' },
        { status: 400 }
      );
    }

    const success = await removeCaptain(captain.user_id, leagueId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove captain' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Captain removed successfully',
    });
  } catch (error) {
    console.error('Error removing captain:', error);
    return NextResponse.json(
      { error: 'Failed to remove captain' },
      { status: 500 }
    );
  }
}
