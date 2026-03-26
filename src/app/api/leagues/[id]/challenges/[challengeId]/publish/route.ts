import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { syncSpecialChallengeScores } from '@/lib/services/challenges/special-challenge-score';

type LeagueRole = 'host' | 'governor' | 'captain' | 'player' | null;

type ChallengeStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'submission_closed'
  | 'published'
  | 'closed';

type Membership = { leagueMemberId: string; role: LeagueRole };

type PublishResult = { success: boolean; status?: ChallengeStatus; error?: string };

function buildError(message: string, status = 400): NextResponse<PublishResult> {
  return NextResponse.json({ success: false, error: message }, { status });
}

function isHostOrGovernor(role: LeagueRole): boolean {
  return role === 'host' || role === 'governor';
}

function normalizeStatus(status: ChallengeStatus | string | null | undefined): ChallengeStatus {
  if (!status) return 'draft';
  if (status === 'upcoming') return 'scheduled';
  const allowed: ChallengeStatus[] = ['draft', 'scheduled', 'active', 'submission_closed', 'published', 'closed'];
  return allowed.includes(status as ChallengeStatus) ? (status as ChallengeStatus) : 'draft';
}

async function getMembership(userId: string, leagueId: string): Promise<Membership | null> {
  const supabase = getSupabaseServiceRole();

  const { data: memberData, error: memberError } = await supabase
    .from('leaguemembers')
    .select('league_member_id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (memberError || !memberData) return null;

  const { data: roleData, error: roleError } = await supabase
    .from('assignedrolesforleague')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .eq('league_id', leagueId);

  if (roleError) return null;

  const roleNames = (roleData || []).map((r: any) => r.roles?.role_name).filter(Boolean);
  const primaryRole = (roleNames[0] as LeagueRole) ?? null;

  return {
    leagueMemberId: String(memberData.league_member_id),
    role: primaryRole,
  };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const { id: leagueId, challengeId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return buildError('Unauthorized', 401);
    }

    const supabase = getSupabaseServiceRole();
    const membership = await getMembership(session.user.id, leagueId);

    if (!membership || !isHostOrGovernor(membership.role)) {
      return buildError('Only hosts or governors can publish challenge scores', 403);
    }

    const { data: challenge, error: challengeError } = await supabase
      .from('leagueschallenges')
      .select('id, league_id, status, end_date, start_date, challenge_id, challenge_type')
      .eq('id', challengeId)
      .maybeSingle();

    if (challengeError || !challenge) {
      return buildError('Challenge not found', 404);
    }

    if (String(challenge.league_id) !== String(leagueId)) {
      return buildError('Challenge does not belong to this league', 403);
    }

    const parseYmd = (ymd?: string | null): Date | null => {
      if (!ymd) return null;
      const dt = new Date(String(ymd));
      if (Number.isNaN(dt.getTime())) return null;
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const storedStatus = normalizeStatus(challenge.status);
    const startDt = parseYmd(challenge.start_date || null);
    const endDt = parseYmd(challenge.end_date || null);

    let effectiveStatus: ChallengeStatus = storedStatus;
    if (storedStatus !== 'draft' && storedStatus !== 'published') {
      if (startDt && endDt) {
        if (today.getTime() >= startDt.getTime() && today.getTime() <= endDt.getTime()) {
          effectiveStatus = 'active';
        } else if (today.getTime() < startDt.getTime()) {
          effectiveStatus = 'scheduled';
        } else {
          effectiveStatus = 'submission_closed';
        }
      } else if (endDt && today.getTime() > endDt.getTime()) {
        effectiveStatus = 'submission_closed';
      }
    }

    if (effectiveStatus === 'published') {
      return buildError('Challenge scores are already published', 400);
    }

    // Team challenges can be published anytime (host enters scores directly)
    // Other types require submissions to be closed first
    if (challenge.challenge_type !== 'team' && effectiveStatus !== 'submission_closed') {
      return buildError('Publishing is allowed only after submissions have closed', 400);
    }

    if (challenge.challenge_type !== 'team') {
      const { count: pendingCount, error: pendingError } = await supabase
        .from('challenge_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('league_challenge_id', challengeId)
        .eq('status', 'pending');

      if (pendingError) {
        console.error('Error counting pending submissions:', pendingError);
        return buildError('Failed to verify pending submissions', 500);
      }

      if ((pendingCount || 0) > 0) {
        return buildError('Review all pending submissions before publishing', 400);
      }
    }

    // Sub-team all-or-nothing: zero out points for incomplete sub-teams
    if (challenge.challenge_type === 'sub_team') {
      const { data: subteams } = await supabase
        .from('challenge_subteams')
        .select('subteam_id, name')
        .eq('league_challenge_id', challengeId);

      if (subteams && subteams.length > 0) {
        for (const subteam of subteams) {
          // Get all members of this sub-team
          const { data: members } = await supabase
            .from('challenge_subteam_members')
            .select('league_member_id')
            .eq('subteam_id', subteam.subteam_id);

          if (!members || members.length === 0) continue;

          const memberIds = members.map((m: any) => m.league_member_id);

          // Check which members have approved submissions
          const { data: approvedSubs } = await supabase
            .from('challenge_submissions')
            .select('league_member_id')
            .eq('league_challenge_id', challengeId)
            .eq('status', 'approved')
            .in('league_member_id', memberIds);

          const approvedMemberIds = new Set(
            (approvedSubs || []).map((s: any) => String(s.league_member_id))
          );

          const allSubmitted = memberIds.every((id: string) =>
            approvedMemberIds.has(String(id))
          );

          if (!allSubmitted) {
            // Zero out awarded_points for all members of this incomplete sub-team
            console.log(
              `Sub-team "${subteam.name}" (${subteam.subteam_id}) incomplete — zeroing points for ${memberIds.length} members`
            );

            const { error: zeroError } = await supabase
              .from('challenge_submissions')
              .update({ awarded_points: 0 })
              .eq('league_challenge_id', challengeId)
              .eq('status', 'approved')
              .in('league_member_id', memberIds);

            if (zeroError) {
              console.error('Error zeroing sub-team points:', zeroError);
            }
          }
        }
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('leagueschallenges')
      .update({ status: 'published' })
      .eq('id', challengeId)
      .eq('league_id', leagueId)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('Error publishing challenge scores:', updateError);
      return buildError('Failed to publish scores', 500);
    }

    await syncSpecialChallengeScores({
      leagueChallengeId: challengeId,
      challengeId: updated.challenge_id,
      leagueId,
      challengeType: updated.challenge_type,
    });

    return NextResponse.json({ success: true, status: 'published' });
  } catch (err: any) {
    console.error('Unexpected error publishing challenge:', err);
    return buildError(err?.message || 'Internal server error', 500);
  }
}
