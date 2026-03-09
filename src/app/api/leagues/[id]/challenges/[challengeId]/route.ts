import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

type LeagueRole = 'host' | 'governor' | 'captain' | 'player' | null;

type ChallengeStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'submission_closed'
  | 'published'
  | 'closed'
  | 'upcoming';

const challengeStatusOrder: ChallengeStatus[] = [
  'draft',
  'scheduled',
  'active',
  'submission_closed',
  'published',
  'closed',
  'upcoming',
];

const defaultChallengeStatus: ChallengeStatus = 'draft';

function normalizeStatus(status: ChallengeStatus | string | null | undefined): ChallengeStatus {
  if (!status) return defaultChallengeStatus;
  if (status === 'upcoming') return 'scheduled';
  if (challengeStatusOrder.includes(status as ChallengeStatus)) {
    return status as ChallengeStatus;
  }
  return defaultChallengeStatus;
}

async function getMembership(userId: string, leagueId: string): Promise<LeagueRole> {
  const supabase = getSupabaseServiceRole();
  const { data: roleData, error: roleError } = await supabase
    .from('assignedrolesforleague')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .eq('league_id', leagueId);

  if (roleError) {
    return null;
  }

  const roles = (roleData || []).map((r: any) => r.roles?.role_name).filter(Boolean);
  return (roles[0] as LeagueRole) ?? null;
}

function isHostOrGovernor(role: LeagueRole): boolean {
  return role === 'host' || role === 'governor';
}

function buildError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * DELETE /api/leagues/[id]/challenges/[challengeId]
 * Delete a league challenge (Host only)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const { id: leagueId, challengeId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServiceRole();

    // Check if user is host of the league
    const { data: roleData, error: roleError } = await supabase
      .from('assignedrolesforleague')
      .select('roles(role_name)')
      .eq('user_id', session.user.id)
      .eq('league_id', leagueId);

    if (roleError) {
      console.error('Error checking user role:', roleError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify permissions' },
        { status: 500 }
      );
    }

    const roles = (roleData || []).map((r: any) => r.roles?.role_name);
    const isHost = roles.includes('host');

    if (!isHost) {
      return NextResponse.json(
        { success: false, error: 'Only hosts can delete challenges' },
        { status: 403 }
      );
    }

    // Verify challenge belongs to this league
    const { data: challenge, error: checkError } = await supabase
      .from('leagueschallenges')
      .select('id, league_id')
      .eq('id', challengeId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (checkError || !challenge) {
      return NextResponse.json(
        { success: false, error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Delete the challenge
    const { error: deleteError } = await supabase
      .from('leagueschallenges')
      .delete()
      .eq('id', challengeId);

    if (deleteError) {
      console.error('Error deleting challenge:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete challenge' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Challenge deleted successfully',
    });
  } catch (err) {
    console.error('Error in DELETE challenge:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/leagues/[id]/challenges/[challengeId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const { id: leagueId, challengeId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return buildError('Unauthorized', 401);
    }

    const supabase = getSupabaseServiceRole();
    const role = await getMembership(session.user.id, leagueId);
    if (!isHostOrGovernor(role)) {
      return buildError('Forbidden', 403);
    }

    const body = await req.json();
    const {
      name,
      description,
      challengeType,
      totalPoints,
      docUrl,
      startDate,
      endDate,
      isUniqueWorkout,
    } = body;

    const updates: Record<string, any> = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (challengeType !== undefined) updates.challenge_type = challengeType;
    if (totalPoints !== undefined) updates.total_points = totalPoints;
    if (docUrl !== undefined) updates.doc_url = docUrl;
    if (isUniqueWorkout !== undefined) updates.is_unique_workout = !!isUniqueWorkout;

    // Handle dates and status derivation if dates are provided
    if (startDate !== undefined) updates.start_date = startDate;
    if (endDate !== undefined) updates.end_date = endDate;

    // Only re-derive status if dates are being updated or if it's currently scheduled/active
    // This allows manual overrides (like 'published') to stay unless dates force a change?
    // Actually, let's keep the existing logic: if dates are provided, we re-evaluate status.
    // IF dates are NOT provided, we leave status alone?

    if (startDate || endDate) {
      // If updating dates, we should probably re-eval status to keep it consistent
      // But we need the *other* date if only one is provided.
      // For simplicity, require both if changing timeline? 
      // Or fetch existing? Fetching existing is safer.

      const { data: existing } = await supabase
        .from('leagueschallenges')
        .select('start_date, end_date')
        .eq('id', challengeId)
        .single();

      const newStart = startDate !== undefined ? startDate : existing?.start_date;
      const newEnd = endDate !== undefined ? endDate : existing?.end_date;

      if (newStart && newEnd) {
        const today = new Date().toISOString().slice(0, 10);
        let derivedStatus: ChallengeStatus = 'scheduled';
        if (today === newStart) {
          derivedStatus = 'active';
        } else if (today > newEnd) {
          derivedStatus = 'submission_closed';
        } else if (today > newStart) {
          derivedStatus = 'active';
        } else {
          derivedStatus = 'scheduled';
        }
        updates.status = normalizeStatus(derivedStatus);
      }
    }

    const { data, error } = await supabase
      .from('leagueschallenges')
      .update(updates)
      .eq('id', challengeId)
      .eq('league_id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating challenge', error);
      return buildError('Failed to update challenge', 500);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error in PATCH challenge:', err);
    return buildError('Internal server error', 500);
  }
}
