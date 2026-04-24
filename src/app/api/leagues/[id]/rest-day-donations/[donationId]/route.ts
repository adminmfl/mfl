/**
 * REST API for Individual Rest Day Donation
 * PATCH: Approve or reject a donation
 *
 * Approval flow:
 * - Captain approves: pending → captain_approved (still needs host/governor)
 * - Governor/Host approves captain_approved → approved
 * - Governor/Host can also approve pending → approved directly (captain optional)
 * Either can reject at any stage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { z } from 'zod';

const updateDonationSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

/**
 * Helper to calculate final rest days for a member (including donations)
 */
async function getMemberFinalRestDays(
  supabase: ReturnType<typeof getSupabaseServiceRole>,
  leagueMemberId: string,
  leagueId: string,
): Promise<{
  autoRestDays: number;
  received: number;
  donated: number;
  totalAllowed: number;
  finalRemaining: number;
}> {
  // Get league config
  const { data: league } = await supabase
    .from('leagues')
    .select('rest_days, start_date')
    .eq('league_id', leagueId)
    .single();

  const totalAllowed = league?.rest_days ?? 1;
  const activeDonationStatuses = ['pending', 'captain_approved', 'approved'];

  // Count auto rest days (from effortentry) - only from league start date
  let restDayQuery = supabase
    .from('effortentry')
    .select('*', { count: 'exact', head: true })
    .eq('league_member_id', leagueMemberId)
    .eq('type', 'rest')
    .eq('status', 'approved');
  if (league?.start_date) {
    restDayQuery = restDayQuery.gte('date', league.start_date);
  }
  const { count: autoRestDays } = await restDayQuery;

  // Get active donations received
  const { data: receivedDonations } = await supabase
    .from('rest_day_donations')
    .select('days_transferred')
    .eq('receiver_member_id', leagueMemberId)
    .in('status', activeDonationStatuses);

  const received = (receivedDonations || []).reduce(
    (sum, d) => sum + d.days_transferred,
    0,
  );

  // Get active donations given
  const { data: donatedDonations } = await supabase
    .from('rest_day_donations')
    .select('days_transferred')
    .eq('donor_member_id', leagueMemberId)
    .in('status', activeDonationStatuses);

  const donated = (donatedDonations || []).reduce(
    (sum, d) => sum + d.days_transferred,
    0,
  );

  // Adjusted total allowed = base total + received - donated
  // Used = just auto rest days
  // Remaining = adjusted total - used
  const adjustedTotalAllowed = totalAllowed + received - donated;
  const finalUsed = autoRestDays || 0;
  const finalRemaining = Math.max(0, adjustedTotalAllowed - finalUsed);

  return {
    autoRestDays: autoRestDays || 0,
    received,
    donated,
    totalAllowed,
    finalRemaining,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; donationId: string }> },
) {
  try {
    const { id: leagueId, donationId } = await params;
    const session = await getServerSession(authOptions as any);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    // Verify user is a member of this league
    const { data: membership, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, team_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this league' },
        { status: 403 },
      );
    }

    // Get user's roles in league
    const { data: roleData } = await supabase
      .from('assignedrolesforleague')
      .select('role_id, roles(role_name)')
      .eq('user_id', userId)
      .eq('league_id', leagueId);

    const roleNames = (roleData || [])
      .map((r: any) => r.roles?.role_name?.toLowerCase())
      .filter(Boolean);
    const isCaptain =
      roleNames.includes('captain') || roleNames.includes('vice_captain');
    const isGovernorOrHost =
      roleNames.includes('host') || roleNames.includes('governor');

    // Parse and validate body
    const body = await req.json();
    const parsed = updateDonationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { action } = parsed.data;

    // Get the donation
    const { data: donation, error: donationError } = await supabase
      .from('rest_day_donations')
      .select('*, donor:leaguemembers!donor_member_id(team_id)')
      .eq('id', donationId)
      .eq('league_id', leagueId)
      .single();

    if (donationError || !donation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 },
      );
    }

    const currentStatus = donation.status;
    const donorTeamId = donation.donor?.team_id;

    // Determine what the user can do based on role and current status
    let canAct = false;
    let newStatus: string | null = null;
    let updateFields: Record<string, any> = {};

    if (action === 'reject') {
      // Captain can reject if pending, Governor/Host can reject at any stage before approved
      if (
        isCaptain &&
        currentStatus === 'pending' &&
        membership.team_id === donorTeamId
      ) {
        canAct = true;
        newStatus = 'rejected';
      } else if (
        isGovernorOrHost &&
        (currentStatus === 'pending' || currentStatus === 'captain_approved')
      ) {
        canAct = true;
        newStatus = 'rejected';
      }
    } else if (action === 'approve') {
      // Stage 1: Captain approves pending → captain_approved (if same team)
      if (
        isCaptain &&
        currentStatus === 'pending' &&
        membership.team_id === donorTeamId
      ) {
        canAct = true;
        newStatus = 'captain_approved';
        updateFields = {
          captain_approved_by: userId,
          captain_approved_at: new Date().toISOString(),
        };
      }
      // Stage 2: Governor/Host approves captain_approved → approved
      else if (isGovernorOrHost && currentStatus === 'captain_approved') {
        canAct = true;
        newStatus = 'approved';
        updateFields = {
          final_approved_by: userId,
          final_approved_at: new Date().toISOString(),
        };
      }
      // Governor/Host can directly approve pending donations (captain approval is optional)
      else if (isGovernorOrHost && currentStatus === 'pending') {
        canAct = true;
        newStatus = 'approved';
        updateFields = {
          final_approved_by: userId,
          final_approved_at: new Date().toISOString(),
        };
      }
    }

    if (!canAct || !newStatus) {
      return NextResponse.json(
        {
          error:
            'You do not have permission to perform this action on this donation',
          currentStatus,
          yourRoles: roleNames,
        },
        { status: 403 },
      );
    }

    // If final approval, validate donor has enough rest days
    if (newStatus === 'approved') {
      const donorStats = await getMemberFinalRestDays(
        supabase,
        donation.donor_member_id,
        leagueId,
      );

      if (donorStats.finalRemaining < donation.days_transferred) {
        return NextResponse.json(
          {
            error: `Donor only has ${donorStats.finalRemaining} rest days remaining, cannot donate ${donation.days_transferred}`,
          },
          { status: 400 },
        );
      }
    }

    // Update donation status
    const { data: updatedDonation, error: updateError } = await supabase
      .from('rest_day_donations')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...updateFields,
      })
      .eq('id', donationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating donation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update donation' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedDonation,
      message:
        action === 'approve'
          ? newStatus === 'approved'
            ? 'Donation fully approved!'
            : 'Donation approved by captain. Awaiting Governor/Host approval.'
          : 'Donation rejected.',
    });
  } catch (error) {
    console.error('Error in rest-day-donations PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
