/**
 * POST /api/leagues/[id]/launch - Launch a league
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { launchLeague } from '@/lib/services/leagues';
import { sendAllTeamIdentityReveals, sendCaptainIntroPrompts } from '@/lib/services/bonding-automations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const league = await launchLeague(id, session.user.id);

    if (!league) {
      return NextResponse.json(
        { error: 'Failed to launch league. Make sure you are the host and the league is in draft status.' },
        { status: 403 }
      );
    }

    // Send team identity reveals for all teams (don't block response)
    sendAllTeamIdentityReveals(id).catch(error => {
      console.error('[Bonding] Error sending team identity reveals:', error);
    });

    // Send captain intro prompts (don't block response)
    sendCaptainIntroPrompts(id).catch(error => {
      console.error('[Bonding] Error sending captain intro prompts:', error);
    });

    return NextResponse.json({ data: league, success: true });
  } catch (error) {
    console.error('Error launching league:', error);
    return NextResponse.json(
      { error: 'Failed to launch league' },
      { status: 500 }
    );
  }
}
