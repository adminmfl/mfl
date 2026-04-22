/**
 * POST /api/leagues/[id]/add-players - Host manually adds players by name + email
 *
 * Creates temp accounts (if needed), adds them to leaguemembers, and optionally
 * assigns them to a team.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { userHasRole } from '@/lib/services/roles';
import { sendEmail } from '@/lib/mailer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

const playerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  team_id: z.string().uuid().optional(),
});

const bodySchema = z.object({
  players: z
    .array(playerSchema)
    .min(1, 'At least one player is required')
    .max(50, 'Max 50 players at once'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leagueId } = await params;

    // 1. Auth
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is host of this league
    const isHost = await userHasRole(authUser.id, leagueId, 'host');
    if (!isHost) {
      return NextResponse.json(
        { error: 'Only the league host can add players' },
        { status: 403 },
      );
    }

    // 3. Parse & validate body
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { players } = parsed.data;
    const supabase = getSupabaseServiceRole();

    // Fetch league info for invite email + capacity checks
    const { data: league } = await supabase
      .from('leagues')
      .select('league_name, num_teams, tier_snapshot')
      .eq('league_id', leagueId)
      .single();
    const leagueName = league?.league_name || 'a fitness league';

    // Derive capacity from tier_snapshot (matches getLeagueById in leagues.ts)
    let leagueCapacity = 40;
    if (league?.tier_snapshot && typeof league.tier_snapshot === 'object') {
      const snapshotMax = (league.tier_snapshot as any).max_participants;
      if (snapshotMax) leagueCapacity = Number(snapshotMax);
    }
    const perTeamCap = Math.ceil(leagueCapacity / (league?.num_teams || 4));

    let added = 0;
    let existing = 0;
    const errors: string[] = [];

    for (const player of players) {
      try {
        // a. Check if email already exists in users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', player.email.toLowerCase().trim())
          .maybeSingle();

        let userId: string;

        if (existingUser) {
          userId = existingUser.user_id;
          existing++;
        } else {
          // b. Create new user with temp password
          const tempPassword = crypto.randomBytes(4).toString('hex'); // 8-char hex
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              username: player.name.trim(),
              email: player.email.toLowerCase().trim(),
              password_hash: hashedPassword,
              is_active: true,
            })
            .select('user_id')
            .single();

          if (createError || !newUser) {
            errors.push(
              `Failed to create account for ${player.email}: ${createError?.message || 'Unknown error'}`,
            );
            continue;
          }

          userId = newUser.user_id;
          added++;

          // Send invite email with temp credentials (fire-and-forget)
          const baseUrl =
            process.env.NEXTAUTH_URL || 'https://myfitnessleague.com';
          sendEmail(
            player.email.toLowerCase().trim(),
            `You've been added to ${leagueName} on MyFitnessLeague`,
            `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2>Welcome to ${leagueName}!</h2>
              <p>Hi ${player.name.trim()},</p>
              <p>You've been added to <strong>${leagueName}</strong> on MyFitnessLeague. Here are your login credentials:</p>
              <div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:16px 0">
                <p style="margin:4px 0"><strong>Email:</strong> ${player.email.toLowerCase().trim()}</p>
                <p style="margin:4px 0"><strong>Temporary Password:</strong> ${tempPassword}</p>
              </div>
              <p>Please log in and change your password from your profile settings.</p>
              <a href="${baseUrl}/login" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px">Log In</a>
              <p style="margin-top:24px;color:#6b7280;font-size:13px">If you didn't expect this email, you can safely ignore it.</p>
            </div>`,
          ).catch((emailErr: unknown) => {
            console.error(
              `Failed to send invite email to ${player.email}:`,
              emailErr,
            );
          });
        }

        // c. Check if already a league member
        const { data: existingMember } = await supabase
          .from('leaguemembers')
          .select('league_member_id')
          .eq('user_id', userId)
          .eq('league_id', leagueId)
          .maybeSingle();

        // Track the team_id that was actually assigned (for teammembers sync)
        let finalTeamId: string | null = null;

        if (!existingMember) {
          // If team requested, check capacity before inserting
          let assignTeamId: string | null = player.team_id || null;
          if (assignTeamId) {
            const { count: teamSize } = await supabase
              .from('leaguemembers')
              .select('league_member_id', { count: 'exact', head: true })
              .eq('league_id', leagueId)
              .eq('team_id', assignTeamId);
            if ((teamSize ?? 0) >= perTeamCap) {
              errors.push(
                `Team is full — adding ${player.email} to league without team assignment`,
              );
              assignTeamId = null;
            }
          }

          // Add user to leaguemembers (with team_id if provided — source of truth)
          const { error: memberError } = await supabase
            .from('leaguemembers')
            .insert({
              user_id: userId,
              league_id: leagueId,
              team_id: assignTeamId,
              created_by: authUser.id,
            });

          if (memberError) {
            errors.push(
              `Failed to add ${player.email} to league: ${memberError.message}`,
            );
            continue;
          }

          finalTeamId = assignTeamId;

          // Assign player role (matches normal join flow in invites.ts)
          const { data: playerRole } = await supabase
            .from('roles')
            .select('role_id')
            .eq('role_name', 'player')
            .single();

          if (playerRole) {
            await supabase.from('assignedrolesforleague').insert({
              user_id: userId,
              league_id: leagueId,
              role_id: playerRole.role_id,
              created_by: authUser.id,
            });
          }
        } else if (player.team_id) {
          // Existing member — check if already assigned to a team
          const { data: currentMember } = await supabase
            .from('leaguemembers')
            .select('league_member_id, team_id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .single();

          if (currentMember?.team_id) {
            if (currentMember.team_id === player.team_id) {
              finalTeamId = player.team_id; // already on this team
            } else {
              errors.push(
                `${player.email} is already assigned to another team`,
              );
            }
          } else {
            // Unassigned — check team capacity before assigning
            const { count: teamSize } = await supabase
              .from('leaguemembers')
              .select('league_member_id', { count: 'exact', head: true })
              .eq('league_id', leagueId)
              .eq('team_id', player.team_id);

            if ((teamSize ?? 0) >= perTeamCap) {
              errors.push(`Team is full — cannot assign ${player.email}`);
            } else {
              await supabase
                .from('leaguemembers')
                .update({ team_id: player.team_id })
                .eq('user_id', userId)
                .eq('league_id', leagueId);
              finalTeamId = player.team_id;
            }
          }
        }

        // d. Sync teammembers table (for team chat etc.) — only if actually assigned
        if (finalTeamId) {
          const { data: existingTeamMember } = await supabase
            .from('teammembers')
            .select('team_member_id')
            .eq('user_id', userId)
            .eq('team_id', finalTeamId)
            .maybeSingle();

          if (!existingTeamMember) {
            const { error: teamError } = await supabase
              .from('teammembers')
              .insert({
                user_id: userId,
                team_id: finalTeamId,
              });

            if (teamError) {
              errors.push(
                `Added ${player.email} to league but failed to sync team membership: ${teamError.message}`,
              );
            }
          }
        }
      } catch (playerErr) {
        errors.push(
          `Error processing ${player.email}: ${playerErr instanceof Error ? playerErr.message : 'Unknown error'}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: { added, existing, errors },
    });
  } catch (error) {
    console.error('Error in add-players:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to add players' },
      { status: 500 },
    );
  }
}
