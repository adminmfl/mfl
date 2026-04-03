/**
 * GET    /api/leagues/[id]/canned-messages - Get canned messages for user's role
 * POST   /api/leagues/[id]/canned-messages - Create a custom canned message
 * PATCH  /api/leagues/[id]/canned-messages - Update a canned message
 * DELETE /api/leagues/[id]/canned-messages - Delete a canned message
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import {
  getCannedMessages,
  createCannedMessage,
  updateCannedMessage,
  deleteCannedMessage,
  getUserRoleInLeague,
} from '@/lib/services/messages';

// ============================================================================
// GET Handler - Get canned messages for user's role
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

    const userId = session.user.id;

    const role = await getUserRoleInLeague(userId, leagueId);
    if (!role) {
      return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
    }
    const roleTarget = role === 'host' ? 'host' : role === 'governor' ? 'governor' : 'captain';
    const cannedMessages = await getCannedMessages(leagueId, roleTarget as any);

    return NextResponse.json({
      success: true,
      data: cannedMessages,
    });
  } catch (error) {
    console.error('Error in canned-messages GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Create a custom canned message
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { title, content, role_target } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      );
    }

    const cannedMessage = await createCannedMessage(leagueId, userId, {
      title: title.trim(),
      content: content.trim(),
      roleTarget: role_target,
    });

    return NextResponse.json({
      success: true,
      data: cannedMessage,
    });
  } catch (error) {
    console.error('Error in canned-messages POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH Handler - Update a canned message
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { canned_message_id, title, content } = body;

    if (!canned_message_id) {
      return NextResponse.json(
        { error: 'canned_message_id is required' },
        { status: 400 }
      );
    }

    const updated = await updateCannedMessage(canned_message_id, userId, {
      title: title?.trim(),
      content: content?.trim(),
      roleTarget: undefined as any,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error in canned-messages PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE Handler - Delete a canned message
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { canned_message_id } = body;

    if (!canned_message_id) {
      return NextResponse.json(
        { error: 'canned_message_id is required' },
        { status: 400 }
      );
    }

    await deleteCannedMessage(canned_message_id);

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Error in canned-messages DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
