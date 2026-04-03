// Cron job — runs daily scan for all active leagues
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { runDailyScan, processScheduledComms } from '@/lib/services/ai-league-manager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServiceRole();
  const today = new Date().toISOString().split('T')[0];

  // Find all active leagues (started and not ended)
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('league_id, created_by')
    .lte('start_date', today)
    .gte('end_date', today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { leagueId: string; digest: number; interventions: number; comms: number }[] = [];

  for (const league of leagues || []) {
    try {
      const scanResult = await runDailyScan(league.league_id);
      const commsGenerated = await processScheduledComms(league.league_id, league.created_by);
      results.push({
        leagueId: league.league_id,
        digest: scanResult.digestCount,
        interventions: scanResult.interventionCount,
        comms: commsGenerated,
      });
    } catch (err) {
      console.error(`[ai-daily-scan] Failed for league ${league.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    leaguesScanned: results.length,
    results,
  });
}

// Also support POST for Vercel cron
export async function POST(req: NextRequest) {
  return GET(req);
}
