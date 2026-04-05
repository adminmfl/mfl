/**
 * GET /api/tour-steps - Public endpoint to fetch active tour steps
 * No admin auth required — any authenticated user can read active steps.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await getSupabaseServiceRole()
      .from('tour_steps')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching tour steps:', error);
      return NextResponse.json({ error: 'Failed to fetch tour steps' }, { status: 500 });
    }

    return NextResponse.json({ success: true, steps: data || [] });
  } catch (error) {
    console.error('Error in tour steps GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
