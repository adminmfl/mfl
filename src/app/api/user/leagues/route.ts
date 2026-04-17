import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getUserLeaguesWithRoles } from '@/lib/services/leagues';

/**
 * Fetches all leagues for the current user with their roles in each league.
 * Now uses the centralized getUserLeaguesWithRoles service.
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    const userId = (session?.user as any)?.id || (session?.user as any)?.user_id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leagues = await getUserLeaguesWithRoles(userId);

    return NextResponse.json({ leagues });
  } catch (err) {
    console.error('Error in /api/user/leagues:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
