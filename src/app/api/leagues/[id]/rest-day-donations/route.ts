/**
 * REST API for Rest Day Donations
 * GET: List donations for the league (filtered by role)
 * POST: Create a new donation request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { z } from 'zod';

const createDonationSchema = z.object({
    receiver_member_id: z.string().uuid(),
    days_transferred: z.number().int().min(1),
    notes: z.string().optional(),
    proof_url: z.string().url('Please provide a valid proof URL'),
});

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

        // Verify membership and get team_id
        const { data: membership, error: memberError } = await supabase
            .from('leaguemembers')
            .select('league_member_id, team_id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .single();

        if (memberError || !membership) {
            return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
        }

        // Get user's role in league
        const { data: roleData } = await supabase
            .from('assignedrolesforleague')
            .select('role_id, roles(role_name)')
            .eq('user_id', userId)
            .eq('league_id', leagueId);

        // Determine highest role (host > governor > captain > player)
        const roleNames = (roleData || []).map((r: any) => r.roles?.role_name?.toLowerCase()).filter(Boolean);
        let userRole = 'player';
        if (roleNames.includes('host')) userRole = 'host';
        else if (roleNames.includes('governor')) userRole = 'governor';
        else if (roleNames.includes('captain')) userRole = 'captain';

        // Get donations with donor and receiver info
        const { data: donations, error: donationsError } = await supabase
            .from('rest_day_donations')
            .select(`
                id,
                days_transferred,
                status,
                notes,
                proof_url,
                created_at,
                updated_at,
                donor_member_id,
                receiver_member_id,
                captain_approved_by,
                captain_approved_at,
                final_approved_by,
                final_approved_at,
                donor:leaguemembers!donor_member_id (
                    league_member_id,
                    team_id,
                    users!leaguemembers_user_id_fkey (user_id, username)
                ),
                receiver:leaguemembers!receiver_member_id (
                    league_member_id,
                    users!leaguemembers_user_id_fkey (user_id, username)
                )
            `)
            .eq('league_id', leagueId)
            .order('created_at', { ascending: false });

        if (donationsError) {
            console.error('Error fetching donations:', donationsError);
            return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 });
        }

        // Get all league members (any team) for the dropdown
        const { data: allMembers } = await supabase
            .from('leaguemembers')
            .select(`
                league_member_id,
                team_id,
                users!leaguemembers_user_id_fkey (user_id, username),
                teams!leaguemembers_team_id_fkey (team_name)
            `)
            .eq('league_id', leagueId);

        const membersList = (allMembers || []).map((m: any) => ({
            league_member_id: m.league_member_id,
            user_id: m.users?.user_id,
            username: m.users?.username,
            team_id: m.team_id || null,
            team_name: m.teams?.team_name || null,
        }));

        // Format response
        const formattedDonations = (donations || []).map((d: any) => ({
            id: d.id,
            days_transferred: d.days_transferred,
            status: d.status,
            notes: d.notes,
            proof_url: d.proof_url || null,
            created_at: d.created_at,
            updated_at: d.updated_at,
            donor: {
                member_id: d.donor?.league_member_id,
                team_id: d.donor?.team_id,
                user_id: d.donor?.users?.user_id,
                username: d.donor?.users?.username,
            },
            receiver: {
                member_id: d.receiver?.league_member_id,
                user_id: d.receiver?.users?.user_id,
                username: d.receiver?.users?.username,
            },
            captain_approved_by: d.captain_approved_by,
            captain_approved_at: d.captain_approved_at,
            final_approved_by: d.final_approved_by,
            final_approved_at: d.final_approved_at,
        }));



        return NextResponse.json({
            success: true,
            data: formattedDonations,
            members: membersList,
            userRole,
            userMemberId: membership.league_member_id,
            userTeamId: membership.team_id,
        });
    } catch (error) {
        console.error('Error in rest-day-donations GET:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
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

        // Parse and validate body
        const body = await req.json();
        const parsed = createDonationSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
        }

        const { receiver_member_id, days_transferred, notes, proof_url } = parsed.data;

        // Get donor's membership
        const { data: donorMembership, error: donorError } = await supabase
            .from('leaguemembers')
            .select('league_member_id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .single();

        if (donorError || !donorMembership) {
            return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
        }

        // Prevent self-donation
        if (donorMembership.league_member_id === receiver_member_id) {
            return NextResponse.json({ error: 'Cannot donate to yourself' }, { status: 400 });
        }

        // Verify receiver exists in the same league
        const { data: receiverMembership, error: receiverError } = await supabase
            .from('leaguemembers')
            .select('league_member_id')
            .eq('league_member_id', receiver_member_id)
            .eq('league_id', leagueId)
            .single();

        if (receiverError || !receiverMembership) {
            return NextResponse.json({ error: 'Receiver not found in this league' }, { status: 400 });
        }

        // Validate donor has enough rest days remaining before creating the donation request.
        const { data: league, error: leagueError } = await supabase
            .from('leagues')
            .select('rest_days, start_date')
            .eq('league_id', leagueId)
            .single();

        if (leagueError || !league) {
            return NextResponse.json({ error: 'League not found' }, { status: 404 });
        }

        const totalAllowed = league.rest_days ?? 1;
        const activeDonationStatuses = ['pending', 'captain_approved', 'approved'];

        const restDayQuery = supabase
            .from('effortentry')
            .select('*', { count: 'exact', head: true })
            .eq('league_member_id', donorMembership.league_member_id)
            .eq('type', 'rest')
            .eq('status', 'approved');

        const restDayQueryWithDate = league.start_date ? restDayQuery.gte('date', league.start_date) : restDayQuery;
        const { count: approvedRestDays } = await restDayQueryWithDate;

        const { data: receivedDonations } = await supabase
            .from('rest_day_donations')
            .select('days_transferred')
            .eq('receiver_member_id', donorMembership.league_member_id)
            .in('status', activeDonationStatuses);

        const received = (receivedDonations || []).reduce((sum, d) => sum + d.days_transferred, 0);

        const { data: donatedDonations } = await supabase
            .from('rest_day_donations')
            .select('days_transferred')
            .eq('donor_member_id', donorMembership.league_member_id)
            .in('status', activeDonationStatuses);

        const donated = (donatedDonations || []).reduce((sum, d) => sum + d.days_transferred, 0);

        const finalRemaining = Math.max(0, totalAllowed + received - donated - (approvedRestDays || 0));

        if (days_transferred > finalRemaining) {
            return NextResponse.json({
                error: `You only have ${finalRemaining} rest day${finalRemaining === 1 ? '' : 's'} available to donate.`,
            }, { status: 400 });
        }

        // Create donation request
        const { data: donation, error: createError } = await supabase
            .from('rest_day_donations')
            .insert({
                league_id: leagueId,
                donor_member_id: donorMembership.league_member_id,
                receiver_member_id,
                days_transferred,
                notes,
                proof_url,
                status: 'pending',
            })

            .select()
            .single();

        if (createError) {
            console.error('Error creating donation:', createError);
            return NextResponse.json({ error: 'Failed to create donation request' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: donation,
        }, { status: 201 });
    } catch (error) {
        console.error('Error in rest-day-donations POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
