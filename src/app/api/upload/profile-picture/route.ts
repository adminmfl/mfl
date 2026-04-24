/**
 * POST /api/upload/profile-picture - Upload profile picture to Supabase Storage
 *
 * Uploads user profile pictures to the 'profile-pictures' bucket in Supabase Storage.
 * Supports both standard MFL pics and league-specific overrides.
 * Returns the public URL for the uploaded file.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { validateProfilePictureFile } from '@/lib/utils/profile-picture-utils';
import { updateStandardProfilePicture, updateLeagueProfilePicture } from '@/lib/services/profile-pictures';

// ============================================================================
// POST Handler
// ============================================================================

const PROFILE_PICTURE_BUCKET = process.env.NEXT_PUBLIC_PROFILE_PICTURE_BUCKET || 'profile-pictures';

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;
        const supabase = getSupabaseServiceRole();

        // Get file and optional league ID from form data
        const formData = await req.formData();
        const file = (formData as any).get('file') as File;
        const leagueId = ((formData as any).get('leagueId') as string) || null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate leagueId format if provided (UUID validation)
        if (leagueId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leagueId)) {
            return NextResponse.json({ error: 'Invalid league ID format' }, { status: 400 });
        }

        // Verify league membership if leagueId provided
        if (leagueId) {
            const { data: membership } = await supabase
                .from('leaguemembers')
                .select('league_member_id')
                .eq('user_id', userId)
                .eq('league_id', leagueId)
                .maybeSingle();

            if (!membership) {
                return NextResponse.json({ error: 'User is not a member of this league' }, { status: 403 });
            }
        }

        // Validate file
        const validation = validateProfilePictureFile(file);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Get current profile picture URL to clean up old file
        let oldFileUrl: string | null = null;
        if (leagueId) {
            const { data: leagueMember } = await supabase
                .from('leaguemembers')
                .select('league_profile_picture_url')
                .eq('user_id', userId)
                .eq('league_id', leagueId)
                .maybeSingle();
            oldFileUrl = leagueMember?.league_profile_picture_url || null;
        } else {
            const { data: user } = await supabase
                .from('users')
                .select('profile_picture_url')
                .eq('user_id', userId)
                .maybeSingle();
            oldFileUrl = user?.profile_picture_url || null;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const pathPrefix = leagueId ? `${userId}/leagues/${leagueId}` : `${userId}/standard`;
        const fileName = `${pathPrefix}/${timestamp}.${extension}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(PROFILE_PICTURE_BUCKET)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json(
                { error: 'Failed to upload file: ' + uploadError.message },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(PROFILE_PICTURE_BUCKET)
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // Update database based on upload type
        let updateSuccess = false;
        if (leagueId) {
            // Update league-specific profile picture
            updateSuccess = await updateLeagueProfilePicture(userId, leagueId, publicUrl);
        } else {
            // Update standard MFL profile picture
            updateSuccess = await updateStandardProfilePicture(userId, publicUrl);
        }

        if (!updateSuccess) {
            // Clean up uploaded file if database update failed
            await supabase.storage
                .from(PROFILE_PICTURE_BUCKET)
                .remove([fileName]);

            return NextResponse.json(
                { error: 'Failed to update profile picture in database' },
                { status: 500 }
            );
        }

        // Clean up old file if it exists and is in our storage
        if (oldFileUrl && oldFileUrl.includes(PROFILE_PICTURE_BUCKET)) {
            try {
                const oldFileName = oldFileUrl.split('/').pop();
                if (oldFileName) {
                    const oldFilePath = leagueId
                        ? `${userId}/leagues/${leagueId}/${oldFileName}`
                        : `${userId}/standard/${oldFileName}`;
                    await supabase.storage
                        .from(PROFILE_PICTURE_BUCKET)
                        .remove([oldFilePath]);
                }
            } catch (error) {
                console.warn('Failed to clean up old profile picture:', error);
                // Don't fail the request if cleanup fails
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                url: publicUrl,
                path: fileName,
                type: leagueId ? 'league' : 'standard',
                leagueId: leagueId || undefined,
            },
        });
    } catch (error) {
        console.error('Error in upload/profile-picture:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
