/**
 * REST API for Rest Day Statistics
 * GET: Returns rest day usage and limits for the current user in a league
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { differenceInWeeks, parseISO, isWithinInterval } from 'date-fns';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = await getServerSession(authOptions as any);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    // Get league info (for rest_days config and dates)
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, league_name, start_date, end_date, rest_days')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Get user's league membership
    const { data: membership, error: membershipError } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
    }

    // Treat rest_days as total allowed rest days (previously per-week)
    const totalAllowedRestDays = league.rest_days ?? 1;

    // Count rest days used (approved only, from league start date onwards)
    let restDayQuery = supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .eq('league_member_id', membership.league_member_id)
      .eq('type', 'rest')
      .eq('status', 'approved');

    if (league.start_date) {
      restDayQuery = restDayQuery.gte('date', league.start_date);
    }

    const { count: approvedRestDays, error: approvedError } = await restDayQuery;

    if (approvedError) {
      console.error('Error counting approved rest days:', approvedError);
      return NextResponse.json({ error: 'Failed to fetch rest day stats' }, { status: 500 });
    }

    // Count pending rest days (not yet approved, from league start date onwards)
    let pendingQuery = supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .eq('league_member_id', membership.league_member_id)
      .eq('type', 'rest')
      .eq('status', 'pending');

    if (league.start_date) {
      pendingQuery = pendingQuery.gte('date', league.start_date);
    }

    const { count: pendingRestDays, error: pendingError } = await pendingQuery;

    if (pendingError) {
      console.error('Error counting pending rest days:', pendingError);
    }

    // Count exemption requests (rest days submitted after limit reached)
    // These are identified by having 'EXEMPTION_REQUEST' in notes
    const { count: exemptionRequests, error: exemptionError } = await supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .eq('league_member_id', membership.league_member_id)
      .eq('type', 'rest')
      .eq('status', 'pending')
      .ilike('notes', '%EXEMPTION_REQUEST%');

    const autoRestDays = approvedRestDays || 0;

    // =========================================================================
    // REST DAY DONATION ADJUSTMENTS
    // Formula: final_used = auto - received + donated
    // (received decreases usage because receiver gains extra days)
    // (donated increases usage because donor gives away their days)
    // =========================================================================

    const activeDonationStatuses = ['pending', 'captain_approved', 'approved'];

    // Get active donations received by this member (includes pending transfers)
    const { data: receivedDonations } = await supabase
      .from('rest_day_donations')
      .select('days_transferred')
      .eq('receiver_member_id', membership.league_member_id)
      .in('status', activeDonationStatuses);

    const daysReceived = (receivedDonations || []).reduce((sum, d) => sum + d.days_transferred, 0);

    // Get active donations given by this member (includes pending transfers)
    const { data: donatedDonations } = await supabase
      .from('rest_day_donations')
      .select('days_transferred')
      .eq('donor_member_id', membership.league_member_id)
      .in('status', activeDonationStatuses);

    const daysDonated = (donatedDonations || []).reduce((sum, d) => sum + d.days_transferred, 0);

    // Final calculation with adjustments
    // When you receive donations, your total allowed increases
    // When you donate, your total allowed decreases
    // Used stays the same (just auto rest days taken)
    const adjustedTotalAllowed = totalAllowedRestDays + daysReceived - daysDonated;
    const finalUsedRestDays = autoRestDays;
    const finalRemainingRestDays = Math.max(0, adjustedTotalAllowed - finalUsedRestDays);
    const isAtLimit = finalUsedRestDays >= adjustedTotalAllowed;

    return NextResponse.json({
      success: true,
      data: {
        totalAllowed: adjustedTotalAllowed,
        used: finalUsedRestDays,
        autoUsed: autoRestDays,
        pending: pendingRestDays || 0,
        remaining: finalRemainingRestDays,
        isAtLimit,
        exemptionsPending: exemptionRequests || 0,
        // Donation breakdown
        donations: {
          received: daysReceived,
          donated: daysDonated,
        },
      },
    });
  } catch (error) {
    console.error('Error in rest-days API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
