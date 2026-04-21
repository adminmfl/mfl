/**
 * POST /api/submissions/[id]/validate - Approve or reject a workout submission
 *
 * Only governors, captains (for their team), and hosts can validate submissions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { userHasAnyRole } from '@/lib/services/roles';
import { z } from 'zod';

// ============================================================================
// Validation Schema
// ============================================================================

const validateSchema = z.object({
  status: z.enum([
    'approved',
    'rejected',
    'rejected_resubmit',
    'rejected_permanent',
  ]),
  rejection_reason: z.string().optional(),
  awarded_points: z.number().optional(),
  suspicious_proof: z.boolean().optional(),
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: submissionId } = await params;
    const session = (await getServerSession(authOptions as any)) as
      | import('next-auth').Session
      | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { status, rejection_reason, awarded_points, suspicious_proof } =
      validateSchema.parse(body);

    // Map legacy 'rejected' to 'rejected_resubmit'
    if (status === 'rejected') {
      status = 'rejected_resubmit';
    }

    const supabase = getSupabaseServiceRole();
    const userId = session.user.id;

    // Get the submission with league info
    const { data: submission, error: submissionError } = await supabase
      .from('effortentry')
      .select(
        `
        id,
        league_member_id,
        modified_by,
        created_date,
        type,
        status,
        leaguemembers!inner(
          league_id,
          team_id,
          user_id,
          suspicious_proof_strikes
        )
      `,
      )
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 },
      );
    }

    const leagueMember = submission.leaguemembers as any;
    const leagueId = leagueMember.league_id;
    const submissionTeamId = leagueMember.team_id;
    const submissionLeagueMemberId = submission.league_member_id as string;
    const currentStrikeCount = Number(
      leagueMember.suspicious_proof_strikes ?? 0,
    );

    let finalStatus = status;
    let shouldCountSuspiciousProof = false;

    if (
      suspicious_proof &&
      ['rejected_resubmit', 'rejected_permanent'].includes(status)
    ) {
      shouldCountSuspiciousProof = true;
      const { data: leagueRow, error: leagueFetchError } = await supabase
        .from('leagues')
        .select('suspicious_proof_rejection_threshold')
        .eq('league_id', leagueId)
        .single();

      const escalationThreshold =
        !leagueFetchError && leagueRow?.suspicious_proof_rejection_threshold
          ? Number(leagueRow.suspicious_proof_rejection_threshold)
          : 3;

      if (
        currentStrikeCount + 1 >= escalationThreshold &&
        status === 'rejected_resubmit'
      ) {
        finalStatus = 'rejected_permanent';
      }
    }

    // Check user's permissions to validate this submission
    // 1) Host/Governor override
    // NOTE: Do not use maybeSingle() for role checks: users often have multiple roles,
    // which causes maybeSingle() to fail and incorrectly deny permissions.
    const canOverride = await userHasAnyRole(userId, leagueId, [
      'host',
      'governor',
    ]);

    // 3. Check if user is captain of the submission's team (via assignedrolesforleague)
    let isCaptainOfTeam = false;
    if (submissionTeamId) {
      // First check if user is on this team
      const { data: memberRows, error: memberRowsError } = await supabase
        .from('leaguemembers')
        .select('league_member_id')
        .eq('user_id', userId)
        .eq('team_id', submissionTeamId)
        .eq('league_id', leagueId)
        .limit(1);

      if (memberRowsError) {
        console.error('Error checking team membership:', memberRowsError);
      }

      if (memberRows && memberRows.length > 0) {
        // Check if user has captain role
        const { data: captainRole } = await supabase
          .from('roles')
          .select('role_id')
          .eq('role_name', 'captain')
          .single();

        if (captainRole) {
          const { data: captainRows, error: captainRowsError } = await supabase
            .from('assignedrolesforleague')
            .select('id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .eq('role_id', captainRole.role_id)

            // In rare cases duplicate rows can exist; any row means captain.
            .limit(1);

          if (captainRowsError) {
            console.error('Error checking captain role:', captainRowsError);
          }

          isCaptainOfTeam = !!(captainRows && captainRows.length > 0);
        }
      }
    }

    // Permission check
    if (!canOverride && !isCaptainOfTeam) {
      return NextResponse.json(
        { error: 'You do not have permission to validate this submission' },
        { status: 403 },
      );
    }

    // Role-specific restrictions
    if (
      (status === 'rejected_permanent' ||
        finalStatus === 'rejected_permanent') &&
      !canOverride
    ) {
      return NextResponse.json(
        {
          error: 'Only Hosts and Governors can permanently reject submissions',
        },
        { status: 403 },
      );
    }

    // Captains can override their team's submissions (including their own)
    // Hosts/Governors can override any submission
    // Note: Removed the restriction that prevented captains from overriding already graded submissions

    // Prevent validating own submission (unless host/governor/captain override)
    if (!canOverride && !isCaptainOfTeam && leagueMember.user_id === userId) {
      return NextResponse.json(
        { error: 'You cannot validate your own submission' },
        { status: 403 },
      );
    }

    // Update the submission status
    const updateData: Record<string, any> = {
      status: finalStatus,
      modified_by: userId,
      modified_date: new Date().toISOString(),
    };

    // Store rejection reason if provided
    if (
      (status === 'rejected_resubmit' || status === 'rejected_permanent') &&
      rejection_reason
    ) {
      updateData.rejection_reason = rejection_reason;
    }

    if (awarded_points !== undefined) {
      updateData.rr_value = awarded_points;
    }

    const { data: updatedSubmission, error: updateError } = await supabase
      .from('effortentry')
      .update(updateData)
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 },
      );
    }

    if (shouldCountSuspiciousProof) {
      const { error: strikeUpdateError } = await supabase.rpc(
        'increment_suspicious_proof_strike',
        {
          p_league_member_id: submissionLeagueMemberId,
        },
      );

      if (strikeUpdateError) {
        console.error(
          'Error updating suspicious proof strikes:',
          strikeUpdateError,
        );
        return NextResponse.json(
          {
            error:
              'Submission was updated, but strike increment failed. Please retry or contact support.',
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedSubmission,
    });
  } catch (error) {
    console.error('Error validating submission:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to validate submission' },
      { status: 500 },
    );
  }
}
