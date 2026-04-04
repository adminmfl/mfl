// POST — manual scan trigger for host (on-demand)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getUserRoleInLeague } from '@/lib/services/messages';
import { runDailyScan, processScheduledComms } from '@/lib/services/ai-league-manager';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: leagueId } = await params;
  const role = await getUserRoleInLeague(session.user.id, leagueId);
  if (role !== 'host' && role !== 'governor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const scanResult = await runDailyScan(leagueId);
    const commsGenerated = await processScheduledComms(leagueId, session.user.id);
    return NextResponse.json({
      success: true,
      digestCount: scanResult.digestCount,
      interventionCount: scanResult.interventionCount,
      commsGenerated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
