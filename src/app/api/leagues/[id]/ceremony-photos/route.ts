import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { userHasAnyRole, userHasRole } from '@/lib/services/roles';
import { Buffer } from 'node:buffer';

const CEREMONY_PHOTOS_BUCKET =
  process.env.NEXT_PUBLIC_CEREMONY_PHOTOS_BUCKET ||
  process.env.NEXT_PUBLIC_PROOF_BUCKET ||
  'proofs';
const CEREMONY_PREFIX = 'leagues';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function buildError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function inferExtension(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leagueId } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) return buildError('Unauthorized', 401);

    const supabase = getSupabaseServiceRole();

    const isLeagueMember = await userHasAnyRole(authUser.id, leagueId, [
      'host',
      'governor',
      'captain',
      'player',
    ]);
    if (!isLeagueMember) {
      return buildError('Forbidden', 403);
    }

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) return buildError('League not found', 404);

    const folder = `${CEREMONY_PREFIX}/${leagueId}/ceremony`;
    const { data: files, error: listError } = await supabase.storage
      .from(CEREMONY_PHOTOS_BUCKET)
      .list(folder, { limit: 200, sortBy: { column: 'name', order: 'desc' } });

    if (listError) {
      console.error('[Ceremony Photos] list error', listError);
      return buildError(
        `Failed to list ceremony photos: ${listError.message}`,
        500,
      );
    }

    const photos = (files || [])
      .filter((file) => {
        if (!file?.name) return false;
        const name = file.name.toLowerCase();
        return (
          name.endsWith('.jpg') ||
          name.endsWith('.jpeg') ||
          name.endsWith('.png') ||
          name.endsWith('.webp') ||
          name.endsWith('.gif')
        );
      })
      .map((file) => {
        const path = `${folder}/${file.name}`;
        const { data } = supabase.storage
          .from(CEREMONY_PHOTOS_BUCKET)
          .getPublicUrl(path);

        return {
          path,
          url: data.publicUrl,
          name: file.name,
          createdAt: file.created_at || null,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        canUpload: await userHasRole(authUser.id, leagueId, 'host'),
        photos,
      },
    });
  } catch (error) {
    console.error('[Ceremony Photos] GET error', error);
    return buildError('Failed to fetch ceremony photos', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leagueId } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser) return buildError('Unauthorized', 401);

    const isHostRole = await userHasRole(authUser.id, leagueId, 'host');
    if (!isHostRole) {
      return buildError('Only host can upload ceremony photos', 403);
    }

    const supabase = getSupabaseServiceRole();

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) return buildError('League not found', 404);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return buildError('File is required', 400);
    if (file.size > MAX_SIZE_BYTES) {
      return buildError('File too large (max 10MB)', 413);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return buildError('Unsupported file type', 400);
    }

    const ext = inferExtension(file.type);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${CEREMONY_PREFIX}/${leagueId}/ceremony/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(CEREMONY_PHOTOS_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Ceremony Photos] upload error', uploadError);
      return buildError(
        `Failed to upload ceremony photo: ${uploadError.message}`,
        500,
      );
    }

    const { data } = supabase.storage
      .from(CEREMONY_PHOTOS_BUCKET)
      .getPublicUrl(path);

    return NextResponse.json({
      success: true,
      data: {
        path,
        url: data.publicUrl,
      },
    });
  } catch (error) {
    console.error('[Ceremony Photos] POST error', error);
    return buildError('Failed to upload ceremony photo', 500);
  }
}
