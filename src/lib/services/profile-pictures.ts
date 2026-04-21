/**
 * Profile Pictures Service - Handle profile picture operations
 * Supports both standard MFL pics and league-specific overrides
 */
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ProfilePictureValidation {
    valid: boolean;
    error?: string;
}

// ============================================================================
// File Validation
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export function validateProfilePictureFile(file: File): ProfilePictureValidation {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File size must be less than 5MB' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Only JPG and PNG files are supported' };
    }

    return { valid: true };
}

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
                standard_profile_picture_url: profilePictureUrl,
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
            .select('standard_profile_picture_url')
            .eq('user_id', userId)
            .maybeSingle();

        return user?.standard_profile_picture_url || null;
    } catch (err) {
        console.error('Error getting effective profile picture:', err);
        return null;
    }
}

/**
 * Generate initials from username for fallback display
 */
export function generateInitials(username: string): string {
    if (!username) return 'U';

    return username
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Generate gradient colors based on username for consistent fallback
 */
export function generateGradientColors(username: string): { from: string; to: string } {
    if (!username) return { from: '#6366f1', to: '#8b5cf6' };

    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
        { from: '#6366f1', to: '#8b5cf6' }, // indigo to violet
        { from: '#3b82f6', to: '#06b6d4' }, // blue to cyan
        { from: '#10b981', to: '#059669' }, // emerald to green
        { from: '#f59e0b', to: '#d97706' }, // amber to orange
        { from: '#ef4444', to: '#dc2626' }, // red to red-600
        { from: '#8b5cf6', to: '#a855f7' }, // violet to purple
        { from: '#06b6d4', to: '#0891b2' }, // cyan to cyan-600
        { from: '#84cc16', to: '#65a30d' }, // lime to lime-600
    ];

    const index = Math.abs(hash) % colors.length;
    return colors[index];
}