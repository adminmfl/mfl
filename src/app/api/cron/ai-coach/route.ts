/**
 * GET /api/cron/ai-coach - Generate AI coach messages for all active leagues
 *
 * Runs 3x/day (8am, 1pm, 7pm IST) via Vercel Cron.
 * Morning: individual nudges + challenge reminders
 * Afternoon: team motivation
 * Evening: captain insights + weekly bonding (Fridays)
 *
 * Security: Validates CRON_SECRET header from Vercel
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import {
  getPlayerContexts,
  getTeamContexts,
  getActiveChallenges,
  generateIndividualMessage,
  generateTeamMessage,
  generateCaptainInsight,
  generateChallengeMessage,
  generateBondingMessage,
  storeCoachMessage,
} from '@/lib/services/ai-coach';

// ============================================================================
// Time slot detection (IST)
// ============================================================================

type TimeSlot = 'morning' | 'afternoon' | 'evening';

function getISTTimeSlot(): TimeSlot {
  const now = new Date();
  const istHour = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;

  if (istHour < 12) return 'morning';
  if (istHour < 17) return 'afternoon';
  return 'evening';
}

function isDay(day: string): boolean {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }).toLowerCase() === day;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: 'MISTRAL_API_KEY not configured' }, { status: 500 });
    }

    const supabase = getSupabaseServiceRole();
    const timeSlot = getISTTimeSlot();
    const isFriday = isDay('friday');

    // Get all active leagues
    const { data: leagues, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, league_name')
      .eq('status', 'active');

    if (leagueError || !leagues || leagues.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active leagues found',
        generated: 0,
      });
    }

    let totalGenerated = 0;
    const errors: string[] = [];

    for (const league of leagues) {
      try {
        // Check daily limit: max messages per league per day
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const { count } = await supabase
          .from('ai_coach_messages')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', league.league_id)
          .gte('created_at', todayStart.toISOString());

        // Cap at 50 messages per league per day
        if ((count || 0) >= 50) continue;

        // ============================================================
        // MORNING: Individual nudges + challenge reminders
        // ============================================================
        if (timeSlot === 'morning') {
          // Individual messages (pick random subset to stay within limits)
          const players = await getPlayerContexts(league.league_id);
          const selected = players.sort(() => Math.random() - 0.5).slice(0, 10);

          for (const player of selected) {
            try {
              const msg = await generateIndividualMessage(player);
              if (msg) {
                await storeCoachMessage(league.league_id, 'individual', msg, {
                  userId: player.user_id,
                  teamId: player.team_id,
                  metadata: { streak: player.current_streak, points: player.total_points },
                });
                totalGenerated++;
              }
            } catch (e) {
              errors.push(`Individual msg failed for ${player.name}: ${e}`);
            }
          }

          // Challenge reminders
          const challengeCtx = await getActiveChallenges(league.league_id);
          if (challengeCtx) {
            try {
              const msg = await generateChallengeMessage(challengeCtx);
              if (msg) {
                // Store as league-wide (no team/user)
                await storeCoachMessage(league.league_id, 'challenge', msg);
                totalGenerated++;
              }
            } catch (e) {
              errors.push(`Challenge msg failed: ${e}`);
            }
          }
        }

        // ============================================================
        // AFTERNOON: Team motivation
        // ============================================================
        if (timeSlot === 'afternoon') {
          const teams = await getTeamContexts(league.league_id);

          for (const team of teams) {
            try {
              const msg = await generateTeamMessage(team);
              if (msg) {
                await storeCoachMessage(league.league_id, 'team', msg, {
                  teamId: team.team_id,
                  metadata: { rank: team.rank, points: team.total_points },
                });
                totalGenerated++;
              }
            } catch (e) {
              errors.push(`Team msg failed for ${team.team_name}: ${e}`);
            }
          }
        }

        // ============================================================
        // EVENING: Captain insights + bonding (Friday only)
        // ============================================================
        if (timeSlot === 'evening') {
          const teams = await getTeamContexts(league.league_id);

          // Captain insights
          for (const team of teams) {
            try {
              const msg = await generateCaptainInsight(team);
              if (msg) {
                // Find captain via roles join
                const { data: teamMembers } = await supabase
                  .from('leaguemembers')
                  .select('user_id')
                  .eq('team_id', team.team_id);

                let captainUserId: string | null = null;
                if (teamMembers && teamMembers.length > 0) {
                  for (const tm of teamMembers) {
                    const { data: roles } = await supabase
                      .from('assignedrolesforleague')
                      .select('roles(role_name)')
                      .eq('user_id', tm.user_id)
                      .eq('league_id', league.league_id);
                    if (roles?.some((r: any) => r.roles?.role_name === 'captain')) {
                      captainUserId = tm.user_id;
                      break;
                    }
                  }
                }
                const captain = captainUserId ? { user_id: captainUserId } : null;

                await storeCoachMessage(league.league_id, 'captain', msg, {
                  teamId: team.team_id,
                  userId: captain?.user_id,
                  metadata: {
                    rank: team.rank,
                    inactive: team.inactive_members,
                    active_ratio: `${team.active_members}/${team.member_count}`,
                  },
                });
                totalGenerated++;
              }
            } catch (e) {
              errors.push(`Captain insight failed for ${team.team_name}: ${e}`);
            }
          }

          // Friday bonding suggestions
          if (isFriday) {
            for (const team of teams) {
              try {
                const msg = await generateBondingMessage(team.team_name);
                if (msg) {
                  await storeCoachMessage(league.league_id, 'bonding', msg, {
                    teamId: team.team_id,
                  });
                  totalGenerated++;
                }
              } catch (e) {
                errors.push(`Bonding msg failed for ${team.team_name}: ${e}`);
              }
            }
          }
        }
      } catch (leagueErr) {
        errors.push(`League ${league.league_name} failed: ${leagueErr}`);
      }
    }

    console.log(`AI Coach: Generated ${totalGenerated} messages (${timeSlot} slot, ${leagues.length} leagues)`);
    if (errors.length > 0) console.warn('AI Coach errors:', errors);

    return NextResponse.json({
      success: true,
      timeSlot,
      leaguesProcessed: leagues.length,
      generated: totalGenerated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in AI Coach cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
