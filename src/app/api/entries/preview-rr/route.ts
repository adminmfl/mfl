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

    // Verify membership (also gives us league_member_id, but we don't need it for RR)
    const { data: membership, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', userId)
      .eq('league_id', league_id)
      .maybeSingle();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'You are not a member of this league' }, { status: 403 });
    }

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

    // Age-based thresholds
    let baseDuration = 45;
    let minSteps = 10000,
      maxSteps = 20000;
    if (typeof userAge === 'number') {
      if (userAge > 75) {
        minSteps = 3000;
        maxSteps = 6000;
        baseDuration = 30;
      } else if (userAge > 65) {
        minSteps = 5000;
        maxSteps = 10000;
        baseDuration = 30;
      }
    }

    // Fetch league-configured min_value for this activity to override baseDuration
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
        baseDuration = configRow.min_value;
      }
    }

    let rr_value = 0;

    if (type === 'rest') {
      rr_value = 1.0;
    } else {
      // Check if this is a custom activity with measurement_type='none'
      // First, check if workout_type is a custom activity ID (UUID format) or regular activity
      let measurementType: string | null = null;

      if (workout_type) {
        // Try to find as custom activity first
        const { data: customActivity } = await supabase
          .from('custom_activities')
          .select('measurement_type')
          .eq('custom_activity_id', workout_type)
          .maybeSingle();

        if (customActivity) {
          measurementType = customActivity.measurement_type;
        } else {
          // Try regular activity
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

      // If measurement_type is 'none', auto-approve with RR 1.0
      if (measurementType === 'none') {
        rr_value = 1.0;
      } else {
        // Calculate RR for each metric if present
        let rrSteps = 0;
        let rrHoles = 0;
        let rrDuration = 0;
        let rrDistance = 0;

        // Steps Calculation
        if (typeof steps === 'number') {
          if (steps >= minSteps) {
            const capped = Math.min(steps, maxSteps);
            rrSteps = Math.min(1 + (capped - minSteps) / (maxSteps - minSteps), 2.0);
          }
        }

        // Holes Calculation
        if (typeof holes === 'number') {
          rrHoles = Math.min(holes / 9, 2.0);
        }

        // Duration Calculation
        if (typeof duration === 'number' && duration > 0) {
          rrDuration = Math.min(duration / baseDuration, 2.0);
        }

        // Distance Calculation
        if (typeof distance === 'number' && distance > 0) {
          // Use activity-specific logic if available for distance scaling
          let distanceDivisor = 4; // Default for running/walking (4km = 1 RR)

          if (workout_type === 'cycling') {
            distanceDivisor = 10; // 10km = 1 RR for cycling
          }

          rrDistance = Math.min(distance / distanceDivisor, 2.0);
        }

        // Take the maximum of all calculated RRs
        // This allows users to qualify via whichever metric is strongest
        rr_value = Math.max(rrSteps, rrHoles, rrDuration, rrDistance);
      }
    }

    const canSubmit = type === 'rest' || rr_value >= 1.0;

    return NextResponse.json({
      success: true,
      data: {
        rr_value,
        canSubmit,
        minRR: 1.0,
        maxRR: 2.0,
      },
    });
  } catch (error) {
    console.error('Error in preview-rr POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
