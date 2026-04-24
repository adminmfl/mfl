import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { userHasAnyRole } from '@/lib/services/roles';
import { Buffer } from 'node:buffer';

const BUCKET = process.env.NEXT_PUBLIC_TEAM_LOGOS_BUCKET || 'team-logos';
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function buildError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function inferExtension(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function pathFromPublicUrl(
  url: string | null | undefined,
  bucket: string,
): string | null {
  if (!url) return null;
  const marker = `/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  const { id: leagueId, teamId } = await params;
  const session = (await getServerSession(authOptions as any)) as
    | import('next-auth').Session
    | null;
  if (!session?.user?.id) return buildError('Unauthorized', 401);

  const supabase = getSupabaseServiceRole();
  const { data: link } = await supabase
    .from('teamleagues')
    .select('logo_url')
    .eq('league_id', leagueId)
    .eq('team_id', teamId)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    data: { url: link?.logo_url || null },
  });
}

// Helper to check if user is captain of this specific team
async function isTeamCaptain(
  userId: string,
  leagueId: string,
  teamId: string,
): Promise<boolean> {
  const supabase = getSupabaseServiceRole();

  // First check if user is on this team
  const { data: member } = await supabase
    .from('leaguemembers')
    .select('league_member_id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!member) return false;

  // Then check if user has captain role for this league
  const { data: roleData } = await supabase
    .from('assignedrolesforleague')
    .select('roles!inner(role_name)')
    .eq('user_id', userId)
    .eq('league_id', leagueId);

  const roles = (roleData || [])
    .map((r: any) => r.roles?.role_name)
    .filter(Boolean);
  return roles.includes('captain') || roles.includes('vice_captain');
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as
      | import('next-auth').Session
      | null;
    const userId = session?.user?.id;
    if (!userId) return buildError('Unauthorized', 401);

    const supabase = getSupabaseServiceRole();

    // Allow host OR captain of this team
    const isHost = await userHasAnyRole(userId, leagueId, ['host']);
    const isCaptain = await isTeamCaptain(userId, leagueId, teamId);
    if (!isHost && !isCaptain)
      return buildError(
        'Only the host or team captain can manage team logos',
        403,
      );

    const { data: link } = await supabase
      .from('teamleagues')
      .select('logo_url')
      .eq('league_id', leagueId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (!link) return buildError('Team not found in this league', 404);

    const path = pathFromPublicUrl(link.logo_url, BUCKET);
    if (path) {
      await supabase.storage
        .from(BUCKET)
        .remove([`${leagueId}/${path.split('/').pop()}`]);
    }

    const { error: updateError } = await supabase
      .from('teamleagues')
      .update({
        logo_url: null,
      })
      .eq('team_id', teamId)
      .eq('league_id', leagueId);

    if (updateError) {
      console.error('[Team Logo] delete DB update error', updateError);
      return buildError('Failed to clear team logo', 500);
    }

    return NextResponse.json({ success: true, data: { url: null } });
  } catch (error) {
    console.error('[Team Logo] delete error', error);
    return buildError('Failed to delete team logo', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as
      | import('next-auth').Session
      | null;
    const userId = session?.user?.id;

    if (!userId) return buildError('Unauthorized', 401);

    const supabase = getSupabaseServiceRole();

    // Allow host OR captain of this team
    const isHost = await userHasAnyRole(userId, leagueId, ['host']);
    const isCaptain = await isTeamCaptain(userId, leagueId, teamId);
    if (!isHost && !isCaptain)
      return buildError(
        'Only the host or team captain can manage team logos',
        403,
      );

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return buildError('File is required', 400);
    if (file.size > MAX_SIZE_BYTES)
      return buildError('File too large (max 2MB)', 413);
    if (!ALLOWED_TYPES.includes(file.type))
      return buildError('Unsupported file type', 400);

    const ext = inferExtension(file.type);
    const fileName = `${leagueId}/${teamId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Team Logo] upload error', uploadError);
      return buildError('Failed to upload team logo', 500);
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);
    // Append timestamp to bust CDN/browser cache
    const logoUrl = `${publicData.publicUrl}?v=${Date.now()}`;

    console.log('[Team Logo] Updating DB:', { teamId, leagueId, logoUrl });

    const { data: updateData, error: updateError } = await supabase
      .from('teamleagues')
      .update({ logo_url: logoUrl })
      .eq('team_id', teamId)
      .eq('league_id', leagueId)
      .select();

    console.log('[Team Logo] DB update result:', { updateData, updateError });

    if (updateError) {
      console.error('[Team Logo] upload DB update error', updateError);
      await supabase.storage.from(BUCKET).remove([fileName]);
      return buildError('Failed to persist team logo reference', 500);
    }

    if (!updateData || updateData.length === 0) {
      console.error('[Team Logo] No teamleagues row found for', {
        teamId,
        leagueId,
      });
      await supabase.storage.from(BUCKET).remove([fileName]);
      return buildError('Team not found in league', 404);
    }

    return NextResponse.json({
      success: true,
      data: {
        url: logoUrl,
        path: fileName,
        bucket: BUCKET,
      },
    });
  } catch (error) {
    console.error('[Team Logo] upload error', error);
    return buildError('Failed to upload team logo', 500);
  }
}
