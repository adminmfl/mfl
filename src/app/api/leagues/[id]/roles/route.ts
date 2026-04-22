/**
 * POST /api/leagues/[id]/roles/assign - Assign role to user (Host only)
 * DELETE /api/leagues/[id]/roles/[userId] - Remove role from user (Host only)
 * GET /api/leagues/[id]/roles - List all available roles for league
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import {
  assignRoleToUser,
  removeRoleFromUser,
  getUserRolesInLeague,
  getUserRoleInLeague,
} from '@/lib/services/leagues';
import { getAllRoles, getRoleByName, userHasRole } from '@/lib/services/roles';
import { z } from 'zod';

const assignRoleSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  role_name: z.string().min(1, 'Role name required'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return roles for the current user in THIS league (league-scoped)
    const rolesForUser = await getUserRoleInLeague(authUser.id, id);
    if (!rolesForUser) {
      return NextResponse.json({ error: 'You are not a member of this league' }, { status: 403 });
    }

    return NextResponse.json({ roles: Array.isArray(rolesForUser) ? rolesForUser : [rolesForUser] });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission (must be host)
    const isHost = await userHasRole(authUser.id, id, 'host');
    if (!isHost) {
      return NextResponse.json(
        { error: 'Only host can assign roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = assignRoleSchema.parse(body);

    // Verify role exists
    const role = await getRoleByName(validated.role_name);
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    const result = await assignRoleToUser(validated.user_id, id, validated.role_name, authUser.id);
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to assign role' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: result, success: true, message: `Role ${validated.role_name} assigned successfully` },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error assigning role:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to assign role' },
      { status: 500 }
    );
  }
}
