/**
 * POST /api/upload/profile-picture - Upload profile picture to Supabase Storage
 *
 * Uploads user profile pictures to the 'profile-pictures' bucket in Supabase Storage.
 * Returns the public URL for the uploaded file.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

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

        // Get file from form data
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB for profile pictures)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const fileName = `${userId}/${timestamp}.${extension}`;

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

        return NextResponse.json({
            success: true,
            data: {
                url: urlData.publicUrl,
                path: fileName,
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
