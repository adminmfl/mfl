import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getDashboardSummary } from '@/lib/services/dashboard-service';

export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url);
    const tzOffsetMinutes = searchParams.get('tzOffsetMinutes') ? Number(searchParams.get('tzOffsetMinutes')) : null;
    const ianaTimezone = searchParams.get('ianaTimezone') || null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const result = await getDashboardSummary(leagueId, session.user.id, {
      tzOffsetMinutes,
      ianaTimezone,
      startDate,
      endDate
    });

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in dashboard-summary GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
