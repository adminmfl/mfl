/**
 * POST /api/leagues/[id]/teams/[teamId]/vice-captain - Assign vice captain
 * DELETE /api/leagues/[id]/teams/[teamId]/vice-captain - Remove vice captain
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';
import { assignViceCaptain, removeViceCaptain } from '@/lib/services/teams';
import { userHasAnyRole } from '@/lib/services/roles';

const schema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as
      | import('next-auth').Session
      | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAssign = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
    ]);
    if (!canAssign) {
      return NextResponse.json(
        { error: 'Only host or governor can assign vice captains' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = schema.parse(body);

    const result = await assignViceCaptain(
      validated.user_id,
      teamId,
      leagueId,
      session.user.id,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to assign vice captain' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vice captain assigned successfully',
    });
  } catch (error) {
    console.error('Error assigning vice captain:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to assign vice captain' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as
      | import('next-auth').Session
      | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRemove = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
    ]);
    if (!canRemove) {
      return NextResponse.json(
        { error: 'Only host or governor can remove vice captains' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = schema.parse(body);

    const success = await removeViceCaptain(validated.user_id, leagueId);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove vice captain' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vice captain removed successfully',
    });
  } catch (error) {
    console.error('Error removing vice captain:', error);
    return NextResponse.json(
      { error: 'Failed to remove vice captain' },
      { status: 500 },
    );
  }
}
