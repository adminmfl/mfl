/**
 * GET /api/leagues/[id]/messages/unread-count - Get unread message count
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getUnreadCount } from '@/lib/services/messages';

// ============================================================================
// GET Handler - Get unread message count
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

    const count = await getUnreadCount(leagueId, userId);

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Error in unread-count GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
