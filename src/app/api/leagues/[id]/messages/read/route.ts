/**
 * POST /api/leagues/[id]/messages/read - Mark messages as read
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { markMessagesAsRead } from '@/lib/services/messages';

// ============================================================================
// POST Handler - Mark messages as read
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
    const { message_ids } = body;

    if (!Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json(
        { error: 'message_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    await markMessagesAsRead(message_ids, userId);

    return NextResponse.json({
      success: true,
      data: { marked: message_ids.length },
    });
  } catch (error) {
    console.error('Error in messages/read POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
