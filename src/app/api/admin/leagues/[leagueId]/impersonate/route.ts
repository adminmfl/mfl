import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

/**
 * POST /api/admin/leagues/[leagueId]/impersonate
 * Temporarily grants the admin user host access to a league.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { leagueId } = await params;
    const adminUserId = (session.user as any)?.id;
    const supabase = getSupabaseServiceRole();

    // Verify league exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Get host role_id
    const { data: hostRole, error: roleError } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', 'host')
      .single();

    if (roleError || !hostRole) {
      return NextResponse.json({ error: 'Host role not found' }, { status: 500 });
    }

    // Insert into leaguemembers if not already there
    const { data: existingMember } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('league_id', leagueId)
      .eq('user_id', adminUserId)
      .maybeSingle();

    if (!existingMember) {
      const { error: memberError } = await supabase
        .from('leaguemembers')
        .insert({ league_id: leagueId, user_id: adminUserId });

      if (memberError) {
        console.error('Error inserting league member:', memberError);
        return NextResponse.json({ error: 'Failed to add admin to league' }, { status: 500 });
      }
    }

    // Insert host role if not already assigned
    const { data: existingRole } = await supabase
      .from('assignedrolesforleague')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', adminUserId)
      .eq('role_id', hostRole.role_id)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleAssignError } = await supabase
        .from('assignedrolesforleague')
        .insert({
          league_id: leagueId,
          user_id: adminUserId,
          role_id: hostRole.role_id,
          created_by: adminUserId,
        });

      if (roleAssignError) {
        console.error('Error assigning host role:', roleAssignError);
        return NextResponse.json({ error: 'Failed to assign host role' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, redirect: `/leagues/${leagueId}` });
  } catch (error) {
    console.error('Error in impersonate POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/leagues/[leagueId]/impersonate
 * Removes the admin's temporary host access from a specific league.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { leagueId } = await params;
    const adminUserId = (session.user as any)?.id;
    const supabase = getSupabaseServiceRole();

    // Remove role assignments for this admin in this league
    await supabase
      .from('assignedrolesforleague')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', adminUserId);

    // Remove league membership
    await supabase
      .from('leaguemembers')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', adminUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in impersonate DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
