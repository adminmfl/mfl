// POST — generate a draft message from an intervention
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getUserRoleInLeague } from '@/lib/services/messages';
import { createDraftFromIntervention } from '@/lib/services/ai-league-manager';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interventionId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: leagueId, interventionId } = await params;
  const role = await getUserRoleInLeague(session.user.id, leagueId);
  if (role !== 'host' && role !== 'governor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await createDraftFromIntervention(interventionId, session.user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
