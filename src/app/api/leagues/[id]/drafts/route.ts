// GET  — list drafts (default: pending + edited)
// POST — generate a new draft via Mistral
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getUserRoleInLeague } from '@/lib/services/messages';
import { generateDraft } from '@/lib/services/ai-league-manager';

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
  const statusFilter = url.searchParams.get('status'); // optional

  const supabase = getSupabaseServiceRole();
  let query = supabase
    .from('ai_message_drafts')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  } else {
    query = query.in('status', ['pending', 'edited']);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map DB columns to frontend format
  const drafts = (data || []).map((d: any) => ({
    id: d.id,
    type: d.draft_type,
    target_scope: d.target_scope,
    content: d.content,
    status: d.status,
    created_at: d.created_at,
    sent_at: d.sent_at,
  }));

  return NextResponse.json(drafts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: leagueId } = await params;
  const role = await getUserRoleInLeague(session.user.id, leagueId);
  if (role !== 'host' && role !== 'governor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { type, targetScope, targetId, contextData } = body;

  if (!type || !targetScope) {
    return NextResponse.json({ error: 'type and targetScope are required' }, { status: 400 });
  }

  try {
    const result = await generateDraft({
      leagueId,
      hostUserId: session.user.id,
      type,
      targetScope,
      targetId,
      contextData,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
