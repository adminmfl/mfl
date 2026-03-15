/**
 * GET  /api/leagues/[id]/messages  - Fetch messages for the user
 * POST /api/leagues/[id]/messages  - Send a message
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getMessagesForUser, sendMessage, type MessageFilter } from '@/lib/services/messages';

// ============================================================================
// GET Handler - Fetch messages
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
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const teamId = searchParams.get('team_id') || undefined;
    const filter = (searchParams.get('filter') as MessageFilter) || undefined;
    const adminView = searchParams.get('admin_view') === 'true';

    const messages = await getMessagesForUser(leagueId, userId, {
      cursor,
      limit,
      teamId,
      filter,
      adminView,
    });

    return NextResponse.json({
      success: true,
      data: {
        messages,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    console.error('Error in messages GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Send a message
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
    const { content, team_id, message_type, visibility, is_important, deep_link, parent_message_id } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    const message = await sendMessage(leagueId, userId, {
      content: content.trim(),
      teamId: team_id,
      messageType: message_type,
      visibility,
      isImportant: is_important,
      parentMessageId: parent_message_id,
      deepLink: deep_link,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
