import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

type LeagueRole = 'host' | 'governor' | 'captain' | 'player' | null;

type Membership = {
  leagueMemberId: string;
  role: LeagueRole;
};

function buildError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getMembership(userId: string, leagueId: string): Promise<Membership | null> {
  const supabase = getSupabaseServiceRole();

  // First check if user is a league member
  const { data: memberData, error: memberError } = await supabase
    .from('leaguemembers')
    .select('league_member_id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (memberError || !memberData) {
    return null;
  }

  // Then fetch the user's roles in this league
  const { data: roleData, error: roleError } = await supabase
    .from('assignedrolesforleague')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .eq('league_id', leagueId);

  if (roleError) {
    return null;
  }

  // Get the first role (or highest priority role if multiple)
  const roleNames = (roleData || []).map((r: any) => r.roles?.role_name).filter(Boolean);
  const primaryRole = (roleNames[0] as LeagueRole) ?? null;

  return {
    leagueMemberId: String(memberData.league_member_id),
    role: primaryRole,
  };
}

function isHostOrGovernor(role: LeagueRole): boolean {
  return role === 'host' || role === 'governor';
}

async function ensureChallengeInLeague(leagueId: string, challengeId: string) {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('leagueschallenges')
    .select('id, league_id, status, challenge_type, start_date, end_date')
    .eq('id', challengeId)
    .maybeSingle();

  if (error || !data) return null;
  if (String(data.league_id) !== String(leagueId)) return null;
  return data;
}

// GET - Fetch submissions (host/governor get all, others get own) ----------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return buildError('Unauthorized', 401);
    }

    const { id: leagueId, challengeId } = await params;
    const supabase = getSupabaseServiceRole();

    const membership = await getMembership(session.user.id, leagueId);
    if (!membership) {
      return buildError('Not a member of this league', 403);
    }

    const challenge = await ensureChallengeInLeague(leagueId, challengeId);
    if (!challenge) {
      return buildError('Challenge not found in this league', 404);
    }

    // Get filter params from query string
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const subTeamId = searchParams.get('subTeamId');

    let baseQuery = supabase
      .from('challenge_submissions')
      .select(
        `
        id,
        league_member_id,
        team_id,
        sub_team_id,
        awarded_points,
        status,
        proof_url,
        created_at,
        reviewed_at,
        reviewed_by,
        leaguemembers(user_id, team_id, teams(team_id, team_name), users!leaguemembers_user_id_fkey(user_id, username, email))
      `
      )
      .eq('league_challenge_id', challengeId);

    // Host/Governor see all; others only their own
    if (!isHostOrGovernor(membership.role)) {
      baseQuery = baseQuery.eq('league_member_id', membership.leagueMemberId);
    }

    // Apply team filter if provided (only for team/sub_team challenges)
    if (teamId && (challenge.challenge_type === 'team' || challenge.challenge_type === 'sub_team')) {
      baseQuery = baseQuery.eq('team_id', teamId);
    }

    // Apply sub-team filter if provided (only for sub_team challenges)
    if (subTeamId && challenge.challenge_type === 'sub_team') {
      baseQuery = baseQuery.eq('sub_team_id', subTeamId);
    }

    // For team challenges, surface submissions grouped by team first
    if (challenge.challenge_type === 'team') {
      baseQuery = baseQuery.order('team_id', { ascending: true });
    }

    const query = baseQuery.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching challenge submissions', error);
      return buildError('Failed to fetch submissions', 500);
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Unexpected error in GET challenge submissions', err);
    return buildError('Internal server error', 500);
  }
}

// POST - Submit proof for a challenge (player) --------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return buildError('Unauthorized', 401);
    }

    const { id: leagueId, challengeId } = await params;
    const supabase = getSupabaseServiceRole();

    const membership = await getMembership(session.user.id, leagueId);
    if (!membership) {
      return buildError('Not a member of this league', 403);
    }

    const challenge = await ensureChallengeInLeague(leagueId, challengeId);
    if (!challenge) {
      return buildError('Challenge not found in this league', 404);
    }

    // Derive a UI-friendly status based on dates so submission checks are accurate
    const parseYmd = (ymd?: string | null): Date | null => {
      if (!ymd) return null;
      const dtIso = new Date(String(ymd));
      if (!isNaN(dtIso.getTime())) {
        return new Date(dtIso.getFullYear(), dtIso.getMonth(), dtIso.getDate());
      }
      const m = /^\d{4}-\d{2}-\d{2}$/.exec(String(ymd));
      if (!m) return null;
      const [y, mo, d] = String(ymd).split('-').map((p) => Number(p));
      if (!y || !mo || !d) return null;
      const dt = new Date(y, mo - 1, d);
      dt.setHours(0, 0, 0, 0);
      return isNaN(dt.getTime()) ? null : dt;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDt = parseYmd(String((challenge as any).start_date || null));
    const endDt = parseYmd(String((challenge as any).end_date || null));
    const normalizedStored = String(challenge.status || 'draft');

    let effectiveStatus = normalizedStored;
    if (normalizedStored !== 'draft') {
      if (startDt && endDt) {
        if (today.getTime() >= startDt.getTime() && today.getTime() <= endDt.getTime()) {
          effectiveStatus = 'active';
        } else if (today.getTime() < startDt.getTime()) {
          effectiveStatus = 'scheduled';
        } else {
          effectiveStatus = (isHostOrGovernor(membership.role) ? 'submission_closed' : 'closed');
        }
      } else if (endDt && today.getTime() > endDt.getTime()) {
        effectiveStatus = (isHostOrGovernor(membership.role) ? 'submission_closed' : 'closed');
      }
    }

    let isResubmission = false;

    if (effectiveStatus !== 'active') {
      // Allow resubmission if submission_closed AND user has a rejected submission
      if (effectiveStatus === 'submission_closed') {
        // Check for existing rejected submission
        const { data: existing } = await supabase
          .from('challenge_submissions')
          .select('status')
          .eq('league_challenge_id', challengeId)
          .eq('league_member_id', membership.leagueMemberId)
          .single();

        if (!existing || existing.status !== 'rejected') {
          return buildError('Challenge is not active', 400);
        }
        isResubmission = true;
      } else {
        return buildError('Challenge is not active', 400);
      }
    } else {
      // Also check if active, if user already has a submission
      // If rejected, it counts as resubmission (allowed).
      // If approved/pending, checked later or via unique constraint, but better to check here?
      // For now, reliance on upsert behavior + status check is safest.
      // Let's just check if we need to set isResubmission for date-bypass (active doesn't need bypass).
      // However, we do need to detect existing for upsert logic if we want to be explicit,
      // but upsert covers it. The only risk is overwriting a 'pending' submission with a new one?
      // Usually we don't allow overwriting pending.

      const { data: existing } = await supabase
        .from('challenge_submissions')
        .select('status')
        .eq('league_challenge_id', challengeId)
        .eq('league_member_id', membership.leagueMemberId)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'rejected') {
          isResubmission = true;
        } else {
          return buildError('You already submitted for this challenge', 409);
        }
      }
    }

    const body = await req.json();
    const { proofUrl, workoutEntryId } = body;

    // Fetch challenge details to know challenge type and get member's team/subteam
    const { data: challengeData, error: challengeError } = await supabase
      .from('leagueschallenges')
      .select('id, challenge_type, league_id, end_date, is_unique_workout')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challengeData) {
      return buildError('Failed to fetch challenge details', 500);
    }

    const isUniqueWorkout = !!(challengeData as any).is_unique_workout;

    // Validate input: unique workout challenges need workoutEntryId, others need proofUrl
    if (isUniqueWorkout) {
      if (!workoutEntryId) {
        return buildError('workoutEntryId is required for unique workout challenges', 400);
      }
    } else {
      if (!proofUrl) {
        return buildError('proofUrl is required', 400);
      }
    }

    // Strict cutoff: cannot submit after end_date UNLESS it is a resubmission
    if (challengeData.end_date && !isResubmission) {
      const todayUtc = new Date().toISOString().slice(0, 10);
      const endDate = String(challengeData.end_date);
      if (todayUtc > endDate) {
        return buildError('Challenge has ended. Submissions are closed.', 400);
      }
    }

    // Fetch member's team info
    const { data: memberData, error: memberError } = await supabase
      .from('leaguemembers')
      .select('team_id')
      .eq('league_member_id', membership.leagueMemberId)
      .single();

    if (memberError) {
      console.error('Error fetching member team:', memberError);
      return buildError('Failed to fetch member team info', 500);
    }

    // For team challenges, verify the member's team belongs to this league
    let validTeamId: string | null = null;
    if (challengeData.challenge_type === 'team' && memberData?.team_id) {
      const { data: teamLeague } = await supabase
        .from('teamleagues')
        .select('team_id')
        .eq('team_id', memberData.team_id)
        .eq('league_id', challengeData.league_id)
        .maybeSingle();

      if (teamLeague) {
        validTeamId = memberData.team_id;
      }
    }

    if (challengeData.challenge_type === 'team' && !validTeamId) {
      return buildError('You must belong to a team in this league to submit for this challenge', 400);
    }

    // For unique workout challenges: validate the selected workout entry
    let uniqueWorkoutDate: string | null = null;
    let uniqueWorkoutProofUrl: string | null = null;

    if (isUniqueWorkout && workoutEntryId) {
      // 1. Fetch the workout entry and verify it belongs to this player
      const { data: entry, error: entryError } = await supabase
        .from('effortentry')
        .select('id, league_member_id, date, type, workout_type, status, proof_url')
        .eq('id', workoutEntryId)
        .maybeSingle();

      if (entryError || !entry) {
        return buildError('Workout entry not found', 404);
      }

      if (String(entry.league_member_id) !== String(membership.leagueMemberId)) {
        return buildError('You can only select your own workouts', 403);
      }

      if (entry.type !== 'workout' || entry.status !== 'approved') {
        return buildError('Only approved workout entries can be selected', 400);
      }

      // 2. Validate the workout date falls within the challenge period
      const entryDate = String(entry.date).slice(0, 10);
      if (challengeData.end_date && entryDate > String(challengeData.end_date)) {
        return buildError('This workout is outside the challenge period', 400);
      }
      const challengeStart = (challenge as any)?.start_date;
      if (challengeStart && entryDate < String(challengeStart)) {
        return buildError('This workout is outside the challenge period', 400);
      }

      // 3. Check uniqueness: has this player EVER done this workout_type before in this league?
      const { data: priorEntries, error: priorError } = await supabase
        .from('effortentry')
        .select('id, date')
        .eq('league_member_id', membership.leagueMemberId)
        .eq('workout_type', entry.workout_type)
        .eq('type', 'workout')
        .eq('status', 'approved')
        .neq('id', workoutEntryId) // exclude this entry itself
        .limit(1);

      if (priorError) {
        return buildError('Failed to validate workout uniqueness', 500);
      }

      if (priorEntries && priorEntries.length > 0) {
        return buildError(
          'This activity is not unique — you have done it before in this league. Pick an activity you have never done before.',
          400
        );
      }

      uniqueWorkoutDate = entryDate;
      uniqueWorkoutProofUrl = entry.proof_url || null;
    }

    // Build submission payload with team/subteam based on challenge type
    const submissionPayload: Record<string, any> = {
      league_challenge_id: challengeId,
      league_member_id: membership.leagueMemberId,
      proof_url: isUniqueWorkout ? uniqueWorkoutProofUrl : proofUrl,
      status: isUniqueWorkout ? 'approved' : 'pending',
      awarded_points: isUniqueWorkout ? (Number(challengeData.total_points) || 1) : null,
      workout_entry_id: isUniqueWorkout ? workoutEntryId : null,
      submission_date: uniqueWorkoutDate,
      team_id: null,
      sub_team_id: null,
      reviewed_by: null,
      reviewed_at: null
    };

    // Set team_id for team challenges (only if verified via teamleagues)
    if (challengeData.challenge_type === 'team' && validTeamId) {
      submissionPayload.team_id = validTeamId;
    }

    // For sub_team challenges, find which sub-team the user belongs to
    if (challengeData.challenge_type === 'sub_team' && memberData?.team_id) {
      // First, set the team_id
      submissionPayload.team_id = memberData.team_id;

      // Then find the sub-team this member belongs to for this challenge
      const { data: memberSubteam } = await supabase
        .from('challenge_subteam_members')
        .select('subteam_id, challenge_subteams!inner(league_challenge_id)')
        .eq('league_member_id', membership.leagueMemberId)
        .eq('challenge_subteams.league_challenge_id', challengeId)
        .single();

      if (memberSubteam) {
        submissionPayload.sub_team_id = memberSubteam.subteam_id;
      }
    }

    const { data, error } = await supabase
      .from('challenge_submissions')
      .upsert(submissionPayload, { onConflict: 'league_challenge_id, league_member_id' })
      .select()
      .single();

    if (error) {
      console.error('Error submitting challenge proof', error);
      return buildError('Failed to submit challenge', 500);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Unexpected error in POST challenge submission', err);
    return buildError('Internal server error', 500);
  }
}
