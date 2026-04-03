import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { userHasAnyRole } from '@/lib/services/roles';

const manualEntrySchema = z.object({
  league_member_id: z.string().min(1, 'league_member_id is required'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  type: z.enum(['workout', 'rest']),
  workout_type: z.string().optional().nullable(),
  duration: z.number().finite().min(0).max(1440).optional().nullable(),
  distance: z.number().finite().min(0).max(1000).optional().nullable(),
  steps: z.number().int().min(0).max(500000).optional().nullable(),
  holes: z.number().int().min(0).max(36).optional().nullable(),
  rr_value: z.number().finite().optional().nullable(),
  proof_url: z.string().url().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  overwriteExisting: z.boolean().optional().default(true),
});

function calculateAge(dateString?: string | null) {
  if (!dateString) return null;
  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

function calculateRunRate(opts: {
  type: 'workout' | 'rest';
  workout_type?: string | null;
  duration?: number | null;
  distance?: number | null;
  steps?: number | null;
  holes?: number | null;
  baseDuration: number;
  minSteps: number;
  maxSteps: number;
}) {
  const workoutType = (opts.workout_type || '').toLowerCase();
  const { baseDuration, minSteps, maxSteps } = opts;

  if (opts.type === 'rest') return 1.0;

  if (workoutType === 'steps' && typeof opts.steps === 'number') {
    if (opts.steps < minSteps) return 0;
    const capped = Math.min(opts.steps, maxSteps);
    return Math.min(1 + (capped - minSteps) / (maxSteps - minSteps), 2.0);
  }

  if (workoutType === 'golf' && typeof opts.holes === 'number') {
    return Math.min(opts.holes / 9, 2.0);
  }

  if (workoutType === 'run' || workoutType === 'cardio') {
    const rrDur = typeof opts.duration === 'number' ? opts.duration / baseDuration : 0;
    const rrDist = typeof opts.distance === 'number' ? opts.distance / 4 : 0;
    return Math.min(Math.max(rrDur, rrDist), 2.0);
  }

  if (workoutType === 'cycling') {
    const rrDur = typeof opts.duration === 'number' ? opts.duration / baseDuration : 0;
    const rrDist = typeof opts.distance === 'number' ? opts.distance / 10 : 0;
    return Math.min(Math.max(rrDur, rrDist), 2.0);
  }

  if (typeof opts.duration === 'number') {
    return Math.min(opts.duration / baseDuration, 2.0);
  }

  return 1.0;
}

function normalizeEntryPayload(body: z.infer<typeof manualEntrySchema>) {
  return {
    league_member_id: body.league_member_id,
    date: body.date,
    type: body.type,
    workout_type: body.workout_type ?? null,
    duration: body.duration ?? null,
    distance: body.distance ?? null,
    steps: body.steps ?? null,
    holes: body.holes ?? null,
    rr_value: body.rr_value ?? null,
    proof_url: body.proof_url ?? null,
    notes: body.notes ?? null,
    overwriteExisting: body.overwriteExisting ?? true,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = await userHasAnyRole(session.user.id, leagueId, ['host', 'governor']);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabaseServiceRole();

    const { data, error } = await supabase
      .from('leaguemembers')
      .select(
        `
        league_member_id,
        user_id,
        team_id,
        users!leaguemembers_user_id_fkey(username, email),
        teams(team_name)
      `
      )
      .eq('league_id', leagueId);

    if (error) {
      console.error('manual-entry GET: failed to fetch members', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    const members = (data || []).map((m) => ({
      league_member_id: m.league_member_id,
      user_id: m.user_id,
      username: (m as any).users?.username ?? 'Unknown',
      email: (m as any).users?.email ?? '',
      team_id: m.team_id,
      team_name: (m as any).teams?.team_name ?? null,
    })).filter((m) => m.team_id !== null); // Only show users assigned to teams

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error('manual-entry GET: unexpected error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const canManage = await userHasAnyRole(userId, leagueId, ['host', 'governor']);

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = manualEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = normalizeEntryPayload(parsed.data);
    const supabase = getSupabaseServiceRole();

    const { data: member, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_id, user_id, team_id, users!leaguemembers_user_id_fkey(date_of_birth)')
      .eq('league_member_id', payload.league_member_id)
      .single();

    if (memberError || !member || member.league_id !== leagueId) {
      console.error('manual-entry POST: member lookup failed', {
        memberError,
        foundMember: !!member,
        leagueMismatch: member ? member.league_id !== leagueId : false,
      });
      return NextResponse.json(
        { error: 'League member not found in this league' },
        { status: 404 }
      );
    }

    // CRITICAL: User must be assigned to a team to have entries submitted
    // This prevents host-only users (with team_id = NULL) from having activities logged
    if (!member.team_id) {
      return NextResponse.json(
        { error: 'Member must be assigned to a team. Please assign them to a team first.' },
        { status: 403 }
      );
    }

    const age = calculateAge((member as any).users?.date_of_birth);
    let baseDuration = 45;
    let minSteps = 10000;
    let maxSteps = 20000;

    if (typeof age === 'number') {
      if (age > 75) {
        minSteps = 3000;
        maxSteps = 6000;
        baseDuration = 30;
      } else if (age > 65) {
        minSteps = 5000;
        maxSteps = 10000;
        baseDuration = 30;
      }
    }

    const calculatedRR = calculateRunRate({
      type: payload.type,
      workout_type: payload.workout_type,
      duration: payload.duration || undefined,
      distance: payload.distance || undefined,
      steps: payload.steps || undefined,
      holes: payload.holes || undefined,
      baseDuration,
      minSteps,
      maxSteps,
    });

    if (payload.type === 'workout' && (typeof calculatedRR !== 'number' || calculatedRR < 1.0)) {
      return NextResponse.json(
        { error: 'Workout RR must be at least 1.0 based on duration/distance/steps.' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('effortentry')
      .select('id')
      .eq('league_member_id', payload.league_member_id)
      .eq('date', payload.date)
      .eq('type', payload.type)
      .maybeSingle();

    const baseData = {
      date: payload.date,
      type: payload.type,
      workout_type: payload.workout_type,
      duration: payload.duration,
      distance: payload.distance,
      steps: payload.steps,
      holes: payload.holes,
      rr_value: calculatedRR,
      proof_url: payload.proof_url,
      notes: payload.notes,
      status: 'approved' as const,
    };

    let result;

    if (existing?.id) {
      if (!payload.overwriteExisting) {
        return NextResponse.json(
          { error: 'Entry already exists for this date and type' },
          { status: 409 }
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from('effortentry')
        .update({
          ...baseData,
          modified_by: userId,
          modified_date: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('manual-entry POST: failed to update entry', updateError);
        return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
      }

      result = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('effortentry')
        .insert({
          league_member_id: payload.league_member_id,
          ...baseData,
          created_by: userId,
          modified_by: userId,
        })
        .select()
        .single();

      if (insertError) {
        console.error('manual-entry POST: failed to insert entry', insertError);
        return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 });
      }

      result = inserted;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('manual-entry POST: unexpected error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
