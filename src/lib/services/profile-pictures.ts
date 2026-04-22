/**
 * Profile Pictures Service - Server-side profile picture operations
 * Supports both standard MFL pics and league-specific overrides
 */
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Update standard MFL profile picture for a user
 */
export async function updateStandardProfilePicture(
    userId: string,
    profilePictureUrl: string
): Promise<boolean> {
    try {
        const supabase = getSupabaseServiceRole();

        const { error } = await supabase
            .from('users')
            .update({
                profile_picture_url: profilePictureUrl,
                modified_date: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating standard profile picture:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Error in updateStandardProfilePicture:', err);
        return false;
    }
}

/**
 * Update league-specific profile picture for a user
 */
export async function updateLeagueProfilePicture(
    userId: string,
    leagueId: string,
    profilePictureUrl: string
): Promise<boolean> {
    try {
        const supabase = getSupabaseServiceRole();

        const { error } = await supabase
            .from('leaguemembers')
            .update({
                league_profile_picture_url: profilePictureUrl,
                modified_date: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('league_id', leagueId);

        if (error) {
            console.error('Error updating league profile picture:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Error in updateLeagueProfilePicture:', err);
        return false;
    }
}

/**
 * Remove league-specific profile picture (reverts to standard)
 */
export async function removeLeagueProfilePicture(
    userId: string,
    leagueId: string
): Promise<boolean> {
    try {
        const supabase = getSupabaseServiceRole();

        // Get current league profile picture URL before removing
        const { data: leagueMember } = await supabase
            .from('leaguemembers')
            .select('league_profile_picture_url')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .maybeSingle();

        const oldFileUrl = leagueMember?.league_profile_picture_url;

        const { error } = await supabase
            .from('leaguemembers')
            .update({
                league_profile_picture_url: null,
                modified_date: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('league_id', leagueId);

        if (error) {
            console.error('Error removing league profile picture:', error);
            return false;
        }

        // Delete the actual file from storage if it exists and is in our storage
        if (oldFileUrl && oldFileUrl.includes('profile-pictures')) {
            try {
                const oldFileName = oldFileUrl.split('/').pop();
                if (oldFileName) {
                    const oldFilePath = `${userId}/leagues/${leagueId}/${oldFileName}`;
                    await supabase.storage
                        .from('profile-pictures')
                        .remove([oldFilePath]);
                }
            } catch (storageError) {
                console.warn('Failed to delete old profile picture file:', storageError);
                // Don't fail the request if storage cleanup fails
            }
        }

        return true;
    } catch (err) {
        console.error('Error in removeLeagueProfilePicture:', err);
        return false;
    }
}

/**
 * Get effective profile picture URL for a user in a specific league
 * Returns league-specific pic if available, otherwise standard pic
 */
export async function getEffectiveProfilePicture(
    userId: string,
    leagueId?: string
): Promise<string | null> {
    try {
        const supabase = getSupabaseServiceRole();

        // If league context provided, check for league-specific override first
        if (leagueId) {
            const { data: leagueMember } = await supabase
                .from('leaguemembers')
                .select('league_profile_picture_url')
                .eq('user_id', userId)
                .eq('league_id', leagueId)
                .maybeSingle();

            if (leagueMember?.league_profile_picture_url) {
                return leagueMember.league_profile_picture_url;
            }
        }

        // Fall back to standard profile picture
        const { data: user } = await supabase
            .from('users')
            .select('profile_picture_url')
            .eq('user_id', userId)
            .maybeSingle();

        return user?.profile_picture_url || null;
    } catch (err) {
        console.error('Error getting effective profile picture:', err);
        return null;
    }
}