/**
 * GET    /api/admin/tour-steps - Fetch all tour steps
 * POST   /api/admin/tour-steps - Create a new tour step
 * PATCH  /api/admin/tour-steps - Update a tour step
 * DELETE /api/admin/tour-steps - Delete a tour step
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

async function requireAdmin() {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user?.id || session.user.platform_role !== 'admin') {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await getSupabaseServiceRole()
      .from('tour_steps')
      .select('*')
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

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, icon_name, icon_color, sort_order } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServiceRole()
      .from('tour_steps')
      .insert({
        title,
        description,
        icon_name: icon_name || 'Activity',
        icon_color: icon_color || 'text-blue-500',
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tour step:', error);
      return NextResponse.json({ error: 'Failed to create tour step' }, { status: 500 });
    }

    return NextResponse.json({ success: true, step: data });
  } catch (error) {
    console.error('Error in tour steps POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { step_id, ...updates } = body;

    if (!step_id) {
      return NextResponse.json({ error: 'step_id is required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.icon_name !== undefined) updatePayload.icon_name = updates.icon_name;
    if (updates.icon_color !== undefined) updatePayload.icon_color = updates.icon_color;
    if (updates.sort_order !== undefined) updatePayload.sort_order = updates.sort_order;
    if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;

    const { data, error } = await getSupabaseServiceRole()
      .from('tour_steps')
      .update(updatePayload)
      .eq('step_id', step_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tour step:', error);
      return NextResponse.json({ error: 'Failed to update tour step' }, { status: 500 });
    }

    return NextResponse.json({ success: true, step: data });
  } catch (error) {
    console.error('Error in tour steps PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stepId = searchParams.get('step_id');

    if (!stepId) {
      return NextResponse.json({ error: 'step_id is required' }, { status: 400 });
    }

    const { error } = await getSupabaseServiceRole()
      .from('tour_steps')
      .delete()
      .eq('step_id', stepId);

    if (error) {
      console.error('Error deleting tour step:', error);
      return NextResponse.json({ error: 'Failed to delete tour step' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in tour steps DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
