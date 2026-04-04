/**
 * Cron: AI Motivation Nudges
 * Runs daily — generates personalized motivational messages for all players
 * in all active leagues and sends them via team chat.
 */
import { NextRequest, NextResponse } from 'next/server';
import { runAllNudges } from '@/lib/services/ai-nudges';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAllNudges();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[ai-nudges] Cron failed:', error);
    return NextResponse.json(
      { error: 'Nudge cron failed' },
      { status: 500 },
    );
  }
}

// Support POST for Vercel cron
export async function POST(req: NextRequest) {
  return GET(req);
}
