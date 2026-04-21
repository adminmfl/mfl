/**
 * DELETE /api/leagues/[id]/profile-picture - Remove league-specific profile picture
 *
 * Removes the league-specific profile picture override for the authenticated user.
 * This reverts the user back to their standard MFL profile picture for this league.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import { removeLeagueProfilePicture } from '@/lib/services/profile-pictures';

// ============================================================================
// DELETE Handler
// ============================================================================

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const leagueId = params.id;
        const userId = authUser.id;

        if (!leagueId) {
            return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
        }

        // Remove league-specific profile picture
        const success = await removeLeagueProfilePicture(userId, leagueId);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to remove league profile picture' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'League profile picture removed successfully',
        });
    } catch (error) {
        console.error('Error in DELETE /api/leagues/[id]/profile-picture:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}