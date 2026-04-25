/**
 * POST /api/upload/team-chat-photo
 * Upload photo for team chat messages
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

const BUCKET = 'donation-proofs'; // Using existing bucket
const MAX_SIZE = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
    try {
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();

        // Get file from form data
        const formData = await req.formData();
        const file = (formData as any).get('file') as File;
        const leagueId = (formData as any).get('leagueId') as string;
        const teamId = (formData as any).get('teamId') as string;

        if (!file || !leagueId || !teamId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }
        // UUID validation to prevent path traversal
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(leagueId) || !uuidRegex.test(teamId)) {
            return NextResponse.json(
                { error: 'Invalid league or team ID format' },
                { status: 400 }
    );
        
    
}

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Only JPG, PNG, and WebP images are allowed' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: 'File must be less than 1MB' },
                { status: 400 }
            );
        }

        // Verify team membership
        const { data: member } = await supabase
            .from('leaguemembers')
            .select('league_member_id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .eq('team_id', teamId)
            .maybeSingle();

        if (!member) {
            return NextResponse.json(
                { error: 'Not a member of this team' },
                { status: 403 }
            );
        }

        // Upload to storage
        // Derive extension from MIME type (safe, not from user input)
        const extMap: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
};
        const ext = extMap[file.type] || 'jpg';
        const path = `chat/${leagueId}/${teamId}/${userId}/${Date.now()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json(
                { error: 'Upload failed: ' + uploadError.message },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

        return NextResponse.json({
            success: true,
            data: { url: urlData.publicUrl, path },
        });
    } catch (error) {
        console.error('Error uploading photo:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
