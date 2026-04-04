/**
 * GET /api/leagues/[id]/messages/unread-count - Get unread and total message counts
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getMessageCounts } from '@/lib/services/messages';

// ============================================================================
// GET Handler - Get message counts (unread + total)
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

    const { unread, total } = await getMessageCounts(leagueId, userId);

    return NextResponse.json({
      success: true,
      data: { count: unread, unread, total },
    });
  } catch (error) {
    console.error('Error in unread-count GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
