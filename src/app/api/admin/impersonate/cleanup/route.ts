import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

/**
 * POST /api/admin/impersonate/cleanup
 * Removes all temporary league memberships and roles for the admin user.
 * Called on admin layout mount to clean up any orphaned impersonation state.
 */
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminUserId = (session.user as any)?.id;
    const supabase = getSupabaseServiceRole();

    // Remove all role assignments for this admin user across all leagues
    const { error: rolesError } = await supabase
      .from('assignedrolesforleague')
      .delete()
      .eq('user_id', adminUserId);

    if (rolesError) {
      console.error('Error cleaning up admin roles:', rolesError);
    }

    // Remove all league memberships for this admin user
    const { error: membersError } = await supabase
      .from('leaguemembers')
      .delete()
      .eq('user_id', adminUserId);

    if (membersError) {
      console.error('Error cleaning up admin memberships:', membersError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in impersonate cleanup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
