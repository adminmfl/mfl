/**
 * GET /api/cron/first-day-motivation - Send first day motivation messages
 * 
 * This cron job runs ONCE PER DAY at 00:00 UTC and sends motivational messages
 * to all teams in leagues that are starting today (start_date = today).
 * 
 * Security: Validates CRON_SECRET header from Vercel
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { sendFirstDayMotivation } from '@/lib/services/bonding-automations';

const LOG_PREFIX = '[CRON][first-day-motivation]';

function logCron(message: string, extra?: Record<string, unknown>) {
    if (extra && Object.keys(extra).length > 0) {
        console.log(LOG_PREFIX, message, extra);
    } else {
        console.log(LOG_PREFIX, message);
    }
}

export async function GET(req: NextRequest) {
    try {
        const startTs = new Date().toISOString();
        logCron('START', { at: startTs });

        // Verify cron secret
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.warn('Unauthorized first-day-motivation cron attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseServiceRole();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Get leagues starting today with bonding automations enabled
        const { data: leagues, error: leaguesError } = await supabase
            .from('leagues')
            .select('league_id, league_name')
            .eq('start_date', today)
            .eq('bonding_automations_enabled', true)
            .eq('is_active', true)
            .in('status', ['active', 'scheduled', 'launched']);

        if (leaguesError) {
            console.error('Error fetching leagues starting today:', leaguesError);
            return NextResponse.json(
                { error: 'Failed to fetch leagues' },
                { status: 500 }
            );
        }

        if (!leagues || leagues.length === 0) {
            logCron('NO_LEAGUES_STARTING', { date: today });
            return NextResponse.json({
                success: true,
                message: 'No leagues starting today',
                sent: 0,
            });
        }

        logCron('LEAGUES_FOUND', { count: leagues.length, date: today });

        // Send first day motivation for each league
        let successCount = 0;
        for (const league of leagues) {
            try {
                await sendFirstDayMotivation(league.league_id);
                successCount++;
                logCron('SENT', { league: league.league_id, name: league.league_name });
            } catch (error) {
                console.error(`Failed to send first day motivation for league ${league.league_id}:`, error);
            }
        }

        logCron('END', {
            total: leagues.length,
            sent: successCount,
            duration_ms: Date.now() - new Date(startTs).getTime(),
        });

        return NextResponse.json({
            success: true,
            message: `Sent first day motivation to ${successCount} leagues`,
            sent: successCount,
            total: leagues.length,
        });
    } catch (error) {
        console.error('Error in first-day-motivation cron:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
