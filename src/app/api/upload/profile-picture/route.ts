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
import { validateProfilePictureFile, updateStandardProfilePicture, updateLeagueProfilePicture } from '@/lib/services/profile-pictures';

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
        const file = formData.get('file') as File;
        const leagueId = formData.get('leagueId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file
        const validation = validateProfilePictureFile(file);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
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
