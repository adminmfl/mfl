// GET  — fetch digest items for a date
// PATCH — mark items as read
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getUserRoleInLeague } from '@/lib/services/messages';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: leagueId } = await params;
  const role = await getUserRoleInLeague(session.user.id, leagueId);
  if (role !== 'host' && role !== 'governor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('ai_host_digest')
    .select('*')
    .eq('league_id', leagueId)
    .eq('digest_date', date)
    .order('priority', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map DB columns to frontend format
  const items = (data || []).map((d: any) => ({
    id: d.id,
    category: d.category,
    title: d.title,
    body: d.body,
    priority: d.priority,
    status: d.is_read ? 'read' : 'unread',
    action_type: d.action_type,
    action_payload: d.action_payload,
    metadata: d.metadata,
    created_at: d.created_at,
  }));

  return NextResponse.json(items);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: leagueId } = await params;
  const role = await getUserRoleInLeague(session.user.id, leagueId);
  if (role !== 'host' && role !== 'governor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { itemIds, status } = body;

  if (!itemIds?.length || !['read', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = getSupabaseServiceRole();
  // is_read is a boolean — 'read' maps to true
  const { error } = await supabase
    .from('ai_host_digest')
    .update({ is_read: status === 'read' })
    .in('id', itemIds)
    .eq('league_id', leagueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
