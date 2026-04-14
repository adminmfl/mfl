/**
 * GET /api/leagues/[id]/leaderboard - Get league leaderboard data
 * Refactored to use shared leaderboard calculation logic.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { calculateLeaderboard } from '@/lib/services/leaderboard-logic';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    
    // Auth check for API route
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const tzOffsetMinutes = searchParams.get('tzOffsetMinutes') ? Number(searchParams.get('tzOffsetMinutes')) : null;
    const ianaTimezone = searchParams.get('ianaTimezone');
    const full = searchParams.get('full') === 'true';

    // Call the shared calculation logic
    const data = await calculateLeaderboard(leagueId, {
      startDate,
      endDate,
      tzOffsetMinutes,
      ianaTimezone,
      full
    });

    if (!data) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in leaderboard API GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
