/**
 * POST   /api/leagues/[id]/messages/reactions - Toggle a reaction
 * DELETE /api/leagues/[id]/messages/reactions - Remove a reaction
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { toggleReaction } from '@/lib/services/messages';

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

    const { message_id, emoji } = await request.json();

    if (!message_id || !emoji) {
      return NextResponse.json(
        { error: 'message_id and emoji are required' },
        { status: 400 }
      );
    }

    const result = await toggleReaction(message_id, session.user.id, emoji);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in reactions POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
