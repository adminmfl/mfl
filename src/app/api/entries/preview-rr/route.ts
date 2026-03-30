/**
 * POST /api/entries/preview-rr
 *
 * Computes RR for a prospective entry without inserting/updating the DB.
 * Useful to block submissions client-side before uploading proof.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { calculateRR, type RRConfig } from '@/lib/rr-calculator';

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    const body = await req.json();
    const {
      league_id,
      type,
      workout_type,
      duration,
      distance,
      steps,
      holes,
    } = body as {
      league_id?: string;
      type?: 'workout' | 'rest';
      workout_type?: string;
      duration?: number;
      distance?: number;
      steps?: number;
      holes?: number;
    };

    if (!league_id) {
      return NextResponse.json({ error: 'league_id is required' }, { status: 400 });
    }
    if (!type || !['workout', 'rest'].includes(type)) {
      return NextResponse.json({ error: "type must be 'workout' or 'rest'" }, { status: 400 });
    }

    // Verify membership
    const { data: membership, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', userId)
      .eq('league_id', league_id)
      .maybeSingle();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'You are not a member of this league' }, { status: 403 });
    }

    // Fetch league rr_config
    const { data: leagueRow } = await supabase
      .from('leagues')
      .select('rr_config')
      .eq('league_id', league_id)
      .single();

    const rrConfig: RRConfig = (leagueRow as any)?.rr_config || { formula: 'standard', age_adjustments: true };

    // Get user's age for RR calculation adjustments
    const { data: userData } = await supabase
      .from('users')
      .select('date_of_birth')
      .eq('user_id', userId)
      .single();

    let userAge: number | null = null;
    if (userData?.date_of_birth) {
      const birthDate = new Date(userData.date_of_birth);
      const today = new Date();
      userAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        userAge--;
      }
    }

    // Fetch league-configured min_value for baseDuration override
    let overrideBaseDuration: number | null = null;
    if (workout_type && league_id) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workout_type);
      let configRow: any = null;

      if (isUuid) {
        const { data } = await supabase
          .from('leagueactivities')
          .select('min_value')
          .eq('league_id', league_id)
          .eq('custom_activity_id', workout_type)
          .maybeSingle();
        if (data) configRow = data;
      }

      if (!configRow) {
        const { data } = await supabase
          .from('leagueactivities')
          .select('min_value, activities!inner(activity_name)')
          .eq('league_id', league_id)
          .eq('activities.activity_name', workout_type)
          .maybeSingle();
        if (data) configRow = data;
      }

      if (configRow && typeof configRow.min_value === 'number' && configRow.min_value > 0) {
        overrideBaseDuration = configRow.min_value;
      }
    }

    // Resolve measurement_type
    let measurementType: string | null = null;
    if (workout_type) {
      const { data: customActivity } = await supabase
        .from('custom_activities')
        .select('measurement_type')
        .eq('custom_activity_id', workout_type)
        .maybeSingle();

      if (customActivity) {
        measurementType = customActivity.measurement_type;
      } else {
        const { data: regularActivity } = await supabase
          .from('activities')
          .select('measurement_type')
          .eq('activity_id', workout_type)
          .maybeSingle();
        if (regularActivity) {
          measurementType = regularActivity.measurement_type;
        }
      }
    }

    const result = calculateRR(
      rrConfig,
      type as 'workout' | 'rest',
      { duration, distance, steps, holes },
      workout_type || null,
      userAge,
      measurementType,
      overrideBaseDuration,
    );

    return NextResponse.json({
      success: true,
      data: {
        rr_value: result.rr_value,
        canSubmit: result.canSubmit,
        formula: rrConfig.formula,
        minRR: rrConfig.formula === 'standard' ? 1.0 : 0,
        maxRR: 2.0,
      },
    });
  } catch (error) {
    console.error('Error in preview-rr POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
