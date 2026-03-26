/**
 * GET /api/cron/ai-coach — DEPRECATED
 *
 * AI Coach v2.5 uses inline, on-demand insights via /api/leagues/[id]/ai-context
 * instead of cron-based bulk message generation. This endpoint is kept as a no-op
 * to avoid Vercel cron errors until the schedule is removed from vercel.json.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: 'AI Coach v2.5 uses inline insights — cron generation is deprecated',
    generated: 0,
  });
}
