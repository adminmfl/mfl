// PATCH — edit content or dismiss
// DELETE — remove draft
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getUserRoleInLeague } from '@/lib/services/messages';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: leagueId, draftId } = await params;
  const role = await getUserRoleInLeague(session.user.id, leagueId);
  if (role !== 'host' && role !== 'governor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { content, status } = body;

  const supabase = getSupabaseServiceRole();
  const updates: Record<string, any> = {};
  if (content !== undefined) updates.content = content;
  if (status && ['edited', 'dismissed'].includes(status)) updates.status = status;
  if (content && !status) updates.status = 'edited';

  const { error } = await supabase
    .from('ai_message_drafts')
    .update(updates)
    .eq('id', draftId)
    .eq('league_id', leagueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: leagueId, draftId } = await params;
  const role = await getUserRoleInLeague(session.user.id, leagueId);
  if (role !== 'host' && role !== 'governor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseServiceRole();
  const { error } = await supabase
    .from('ai_message_drafts')
    .delete()
    .eq('id', draftId)
    .eq('league_id', leagueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
