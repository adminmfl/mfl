import { NextRequest, NextResponse } from 'next/server';
import { getUserLeaguesWithRoles } from '@/lib/services/leagues';
import { getAuthUser } from '@/lib/auth/get-auth-user';

// ============================================================================
// GET /api/user/leagues
// ============================================================================

/**
 * Fetches all leagues for the current user with their roles in each league.
 * Now uses the centralized getUserLeaguesWithRoles service.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authUser.id;

    const leagues = await getUserLeaguesWithRoles(userId);

    return NextResponse.json({ leagues });
  } catch (err) {
    console.error('Error in /api/user/leagues:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
