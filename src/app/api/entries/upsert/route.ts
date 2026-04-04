/**
 * POST /api/entries/upsert - Submit or update a workout entry
 *
 * Creates or updates an effort entry with RR value calculation.
 * Supports proof image upload via URL (image should be uploaded to storage first).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase/client";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getUserLocalDateYMD } from '@/lib/utils/timezone';
import { calculateRR, getAgeThresholds, type RRConfig } from '@/lib/rr-calculator';

// ============================================================================
// Types
// ============================================================================

interface EntryPayload {
  league_member_id: string;
  date: string;
  type: 'workout' | 'rest';
  workout_type?: string;
  duration?: number;
  distance?: number;
  steps?: number;
  holes?: number;
  rr_value?: number;
  proof_url?: string;
  proof_url_2?: string | null;
  notes?: string;
  outcome?: string | null;
  custom_field_value?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  reupload_of?: string | null;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    const body = await req.json();
    const {
      league_id,
      date,
      type,
      workout_type,
      duration,
      distance,
      steps,
      holes,
      proof_url,
      proof_url_2,
      notes,
      reupload_of,
      outcome, // Selected outcome label for multi-outcome activities (e.g., "Win", "Loss")
      custom_field_value, // Custom field value from host-configured custom_field_label
      timezone_offset, // Legacy: sign-inverted offset (e.g., +330 for IST = UTC+5:30)
      tzOffsetMinutes, // Preferred: same value as `new Date().getTimezoneOffset()` (e.g., -330 for IST)
      ianaTimezone, // Preferred IANA tz (e.g., 'America/Los_Angeles')
      overwrite, // Boolean flag to allow overwriting existing entry
    } = body;

    // Validate required fields
    if (!league_id) {
      return NextResponse.json({ error: "league_id is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
    const normalizedDate = normalizeDateOnly(date);

    // Allow submissions only for today unless this is an explicit reupload of a rejected entry
    // Use user's timezone to calculate "today" correctly. We prefer friendly IANA tz strings but
    // keep backwards-compatible fallbacks to tzOffsetMinutes and legacy timezone_offset.
    const todayYmd = getUserLocalDateYMD({
      now: new Date(),
      ianaTimezone: typeof ianaTimezone === 'string' ? ianaTimezone : null,
      tzOffsetMinutes: typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : null,
      legacyTimezoneOffset: typeof timezone_offset === 'number' && Number.isFinite(timezone_offset) ? timezone_offset : null,
    });

    // Calculate yesterday in user's local timezone for allowing yesterday submissions
    const yesterdayYmd = (() => {
      const d = new Date(todayYmd + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    })();

    // Block submissions entirely if the league has completed
    const { data: leagueRow, error: leagueRowError } = await supabase
      .from('leagues')
      .select('league_id, end_date, status, rr_config')
      .eq('league_id', league_id)
      .single();

    if (leagueRowError || !leagueRow) {
      console.error('League lookup error:', leagueRowError);
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    const leagueEnd = (leagueRow as any).end_date || null;
    const leagueStatus = (leagueRow as any).status || null;
    const leagueRRConfig = (leagueRow as any).rr_config || null;

    // Check league completion status and date
    // Logic update: Allow submissions until 08:30 UTC the day AFTER the end date.
    // This handles timezone differences by giving a generous grace period.
    if (leagueStatus === 'completed') {
      return NextResponse.json({ error: 'League has completed. Submissions are closed.' }, { status: 400 });
    }

    if (leagueEnd) {
      // Calculate Cutoff: UTC Midnight of EndDate + 1 day + 9 hours (33 hours grace)

      // Ensure we treat the string strictly as UTC midnight YYYY-MM-DD
      const dateStr = String(leagueEnd).slice(0, 10);
      const [y, m, d] = dateStr.split('-').map(Number);

      const cutoff = new Date(Date.UTC(y, m - 1, d)); // Midnight UTC on End Date

      // Add 1 day (24h) + 9 hours = 33 hours
      cutoff.setHours(cutoff.getHours() + 33);

      const nowUtc = new Date();

      // Strict cutoff check
      if (nowUtc > cutoff) {
        return NextResponse.json({ error: 'League has completed. Submissions are closed.' }, { status: 400 });
      }

      // Exception: Allow submitting for League End Date if within grace period
      // If the submission is for the league end date, and we are within the grace period (checked above), it's allowed.
      // We only throw the "today only" error if it's NOT a reupload AND NOT a valid late submission for end date.
      if (!reupload_of && normalizedDate !== todayYmd && normalizedDate !== yesterdayYmd) {
        const isValidLateSubmission = normalizedDate === dateStr; // dateStr is leagueEnd (YYYY-MM-DD)

        if (!isValidLateSubmission) {
          return NextResponse.json(
            { error: 'You can only submit for today or yesterday.' },
            { status: 400 }
          );
        }
      }

      // CRITICAL FIX: Ensure the submitted date is not AFTER the league end date.
      // Even if "today" is valid (e.g. user is submitting on Jan 10 via the grace period),
      // they should not be able to log a workout FOR Jan 10 if the league ended on Jan 9.
      if (normalizedDate > dateStr && !reupload_of) {
        return NextResponse.json(
          { error: `League ended on ${dateStr}. You cannot submit activities for ${normalizedDate}.` },
          { status: 400 }
        );
      }
    } else {
      // No league end date, standard check
      if (!reupload_of && normalizedDate !== todayYmd && normalizedDate !== yesterdayYmd) {
        return NextResponse.json(
          { error: 'You can only submit for today or yesterday.' },
          { status: 400 }
        );
      }
    }

    if (!type || !['workout', 'rest'].includes(type)) {
      return NextResponse.json({ error: "type must be 'workout' or 'rest'" }, { status: 400 });
    }

    // Validate numeric field ranges to prevent extremely high values
    if (typeof duration === 'number' && (!Number.isFinite(duration) || duration < 0 || duration > 1440)) {
      return NextResponse.json({ error: 'Duration must be between 0 and 1440 minutes (24 hours)' }, { status: 400 });
    }
    if (typeof distance === 'number' && (!Number.isFinite(distance) || distance < 0 || distance > 1000)) {
      return NextResponse.json({ error: 'Distance must be between 0 and 1000 km' }, { status: 400 });
    }
    if (typeof steps === 'number' && (!Number.isFinite(steps) || steps < 0 || steps > 500000)) {
      return NextResponse.json({ error: 'Steps must be between 0 and 500,000' }, { status: 400 });
    }
    if (typeof holes === 'number' && (!Number.isFinite(holes) || holes < 0 || holes > 36)) {
      return NextResponse.json({ error: 'Holes must be between 0 and 36' }, { status: 400 });
    }

    // Get user's league membership for the specified league
    const { data: membership, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, team_id')
      .eq('user_id', userId)
      .eq('league_id', league_id)
      .maybeSingle();

    if (memberError || !membership) {
      console.error('Membership lookup error:', memberError);
      return NextResponse.json(
        { error: "You are not a member of this league" },
        { status: 403 }
      );
    }

    // CRITICAL: User must be assigned to a team to submit activities
    // This prevents host-only users (with team_id = NULL) from submitting
    if (!membership.team_id) {
      return NextResponse.json(
        { error: "You must be assigned to a team to submit activities. Contact the league host." },
        { status: 403 }
      );
    }

    // Enforce per-week activity frequency (if configured)
    if (type === 'workout' && workout_type && !reupload_of) {
      const { data: leagueActivity, error: leagueActivityError } = await supabase
        .from('leagueactivities')
        .select('frequency, frequency_type, activities!inner(activity_name)')
        .eq('league_id', league_id)
        .eq('activities.activity_name', workout_type)
        .maybeSingle();

      if (leagueActivityError) {
        console.error('League activity lookup error:', leagueActivityError);
        return NextResponse.json({ error: 'Failed to validate activity frequency' }, { status: 500 });
      }

      const rawFrequency = (leagueActivity as any)?.frequency ?? null;
      const rawFrequencyType = (leagueActivity as any)?.frequency_type ?? 'weekly';
      const frequencyType: 'daily' | 'weekly' | 'monthly' =
        rawFrequencyType === 'monthly' ? 'monthly' :
        rawFrequencyType === 'daily' ? 'daily' : 'weekly';
      const normalizedFrequency = typeof rawFrequency === 'number' && Number.isFinite(rawFrequency)
        ? Math.floor(rawFrequency)
        : null;
      const frequency = typeof normalizedFrequency === 'number' && normalizedFrequency > 0
        ? normalizedFrequency
        : null;

      // Null means unlimited. Otherwise, enforce max submissions per period.
      if (typeof frequency === 'number' && frequency >= 1) {

        if (frequencyType === 'daily') {
          // Daily frequency: count total entries for this activity on this specific date
          const { data: dailyEntries, error: dailyError } = await supabase
            .from('effortentry')
            .select('id, status')
            .eq('league_member_id', membership.league_member_id)
            .eq('type', 'workout')
            .eq('workout_type', workout_type)
            .eq('date', normalizedDate);

          if (dailyError) {
            console.error('Daily entries lookup error:', dailyError);
            return NextResponse.json({ error: 'Failed to validate activity limit' }, { status: 500 });
          }

          const activeCount = (dailyEntries || []).filter((row: any) => row?.status !== 'rejected').length;

          if (activeCount >= frequency) {
            return NextResponse.json(
              {
                error: `This activity is limited to ${frequency} time${frequency === 1 ? '' : 's'} per day. You have already logged ${activeCount} time${activeCount === 1 ? '' : 's'} today.`,
              },
              { status: 409 }
            );
          }
        } else {
          // Weekly/monthly frequency: count unique dates
          const dateRange = frequencyType === 'monthly'
            ? getMonthRangeYmd(normalizedDate)
            : getWeekRangeYmd(normalizedDate);
          if (!dateRange) {
            return NextResponse.json({ error: 'Invalid date format for submission' }, { status: 400 });
          }

          const { data: periodEntries, error: periodError } = await supabase
            .from('effortentry')
            .select('date, status')
            .eq('league_member_id', membership.league_member_id)
            .eq('type', 'workout')
            .eq('workout_type', workout_type)
            .gte('date', dateRange.start)
            .lte('date', dateRange.end);

          if (periodError) {
            console.error('Period entries lookup error:', periodError);
            return NextResponse.json({ error: 'Failed to validate activity limit' }, { status: 500 });
          }

          const usedDates = new Set(
            (periodEntries || [])
              .filter((row: any) => {
                if (row?.status === 'rejected') return false;
                if (overwrite && normalizeDateOnly(row.date) === normalizedDate) return false;
                return true;
              })
              .map((row: any) => normalizeDateOnly(row.date))
              .filter(Boolean)
          );

          if (usedDates.size >= frequency) {
            return NextResponse.json(
              {
                error: `This activity is limited to ${frequency} day${frequency === 1 ? '' : 's'} per ${frequencyType}. You have already used ${usedDates.size} day${usedDates.size === 1 ? '' : 's'} this ${frequencyType}.`,
              },
              { status: 409 }
            );
          }
        }
      }

      // Store daily frequency info for later use in duplicate check bypass
      if (frequencyType === 'daily' && typeof frequency === 'number' && frequency > 1) {
        (body as any).__isDailyMulti = true;
      }
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

    // Age-based thresholds (used by standard formula and downstream logic)
    const rrConfig: RRConfig = leagueRRConfig || { formula: 'standard', age_adjustments: true };
    const { baseDuration, minSteps, maxSteps } = getAgeThresholds(userAge, rrConfig);

    // If this is a resubmission, ensure the original belongs to the user, is rejected, and has no approved resubmission.
    if (reupload_of) {
      const { data: original, error: originalError } = await supabase
        .from('effortentry')
        .select('id, league_member_id, status, date')
        .eq('id', reupload_of)
        .maybeSingle();

      if (originalError) {
        console.error('Original entry lookup error:', originalError);
        return NextResponse.json({ error: 'Failed to validate resubmission' }, { status: 500 });
      }
      if (!original) {
        return NextResponse.json({ error: 'Original submission not found for resubmit' }, { status: 404 });
      }
      if (original.league_member_id !== membership.league_member_id) {
        return NextResponse.json({ error: 'You can only resubmit your own rejected submissions' }, { status: 403 });
      }
      const resubmittableStatuses = ['rejected', 'rejected_resubmit'];
      if (!resubmittableStatuses.includes(original.status)) {
        return NextResponse.json({ error: 'Only rejected submissions can be resubmitted' }, { status: 400 });
      }

      // Resubmission must keep the same date as the original
      const originalDate = normalizeDateOnly(original.date as any);
      if (originalDate && normalizedDate !== originalDate) {
        return NextResponse.json({ error: 'Resubmissions must use the original submission date' }, { status: 400 });
      }

      // Block further uploads once any resubmission was approved
      const { data: childResubs, error: childError } = await supabase
        .from('effortentry')
        .select('id, status')
        .eq('reupload_of', reupload_of)
        .eq('league_member_id', membership.league_member_id)
        .order('created_date', { ascending: false });

      if (childError) {
        console.error('Resubmission lookup error:', childError);
        return NextResponse.json({ error: 'Failed to validate resubmission history' }, { status: 500 });
      }

      const hasApprovedResub = (childResubs || []).some((row) => row.status === 'approved');
      if (hasApprovedResub) {
        return NextResponse.json({ error: 'This submission already has an approved resubmission. Further uploads are not allowed.' }, { status: 409 });
      }
    }

    // Check for existing entry on same date.
    // IMPORTANT: never use maybeSingle() here because duplicates in the database
    // will cause a "multiple rows" error and allow additional inserts.
    const { data: existingRows, error: existingError } = await supabase
      .from('effortentry')
      .select('id, type, status, proof_url, created_date, notes')
      .eq('league_member_id', membership.league_member_id)
      .eq('date', normalizedDate)
      .order('created_date', { ascending: false });

    if (existingError) {
      console.error('Existing entry lookup error:', existingError);
      return NextResponse.json({ error: 'Failed to validate existing submissions' }, { status: 500 });
    }

    const existing = existingRows?.[0] ?? null;

    // Enforce: only one entry per day per league member.
    // Allow a "replace" only when ALL existing entries for the day are rejected.
    const hasNonRejected = (existingRows ?? []).some((r: any) => r?.status && r.status !== 'rejected');
    const canReplaceRejected = !!existing && !hasNonRejected;

    // Look up per-activity proof/notes/points configuration from leagueactivities
    let activityProofRequirement: 'not_required' | 'optional' | 'mandatory' = 'mandatory';
    let activityNotesRequirement: 'not_required' | 'optional' | 'mandatory' = 'optional';
    let activityPointsPerSession: number = 1;
    let activityOutcomeConfig: { label: string; points: number }[] | null = null;

    if (type === 'workout' && workout_type) {
      const isUuidWorkoutType = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workout_type);

      let activityConfigRow: any = null;

      if (isUuidWorkoutType) {
        // Custom activity — lookup by custom_activity_id
        const { data, error } = await supabase
          .from('leagueactivities')
          .select('proof_requirement, notes_requirement, points_per_session, outcome_config, min_value')
          .eq('league_id', league_id)
          .eq('custom_activity_id', workout_type)
          .maybeSingle();
        // If new columns don't exist yet (pre-migration), ignore the error and use defaults
        if (!error) activityConfigRow = data;
      }

      if (!activityConfigRow) {
        // Global activity — lookup by activity name via join
        const { data, error } = await supabase
          .from('leagueactivities')
          .select('proof_requirement, notes_requirement, points_per_session, outcome_config, min_value, activities!inner(activity_name)')
          .eq('league_id', league_id)
          .eq('activities.activity_name', workout_type)
          .maybeSingle();
        if (!error) activityConfigRow = data;
      }

      if (activityConfigRow) {
        activityProofRequirement = activityConfigRow.proof_requirement ?? 'mandatory';
        activityNotesRequirement = activityConfigRow.notes_requirement ?? 'optional';
        activityPointsPerSession = activityConfigRow.points_per_session ?? 1;
        activityOutcomeConfig = activityConfigRow.outcome_config ?? null;

        // min_value override for baseDuration is handled in calculateRR via overrideBaseDuration
      }
    }

    // Proof validation: respect per-activity proof_requirement config
    if (type === 'workout' && activityProofRequirement === 'mandatory' && !proof_url && !(canReplaceRejected && existing?.proof_url)) {
      return NextResponse.json(
        { error: 'proof_url is required for workout entries' },
        { status: 400 }
      );
    }

    // Notes validation: respect per-activity notes_requirement config
    if (type === 'workout' && activityNotesRequirement === 'mandatory' && !notes) {
      return NextResponse.json(
        { error: 'Notes are required for this activity' },
        { status: 400 }
      );
    }

    // Validate outcome if activity has outcome_config
    if (type === 'workout' && activityOutcomeConfig && activityOutcomeConfig.length > 0) {
      if (!outcome) {
        return NextResponse.json(
          { error: 'An outcome selection is required for this activity' },
          { status: 400 }
        );
      }
      const validLabels = activityOutcomeConfig.map((o: any) => o.label);
      if (!validLabels.includes(outcome)) {
        return NextResponse.json(
          { error: `Invalid outcome. Must be one of: ${validLabels.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Build entry payload
    const payload: EntryPayload = {
      league_member_id: membership.league_member_id,
      date: normalizedDate,
      type,
      workout_type: workout_type || null,
      duration: duration || null,
      distance: distance || null,
      steps: steps || null,
      holes: holes || null,
      proof_url: proof_url || null,
      ...(proof_url_2 ? { proof_url_2 } : {}),
      notes: notes || null,
      outcome: outcome || null,
      ...(custom_field_value ? { custom_field_value } : {}),
      status: 'approved',
      created_by: userId,
      reupload_of: reupload_of || null,
    };

    // Calculate RR value based on activity type using shared calculator
    {
      // Resolve measurement_type for the activity
      let measurementType: string | null = null;

      if (type === 'workout' && workout_type) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workout_type);
        let customActivity = null;

        if (isUuid) {
          const { data } = await supabase
            .from('custom_activities')
            .select('measurement_type')
            .eq('custom_activity_id', workout_type)
            .maybeSingle();
          if (data) customActivity = data;
        }

        if (!customActivity) {
          const { data } = await supabase
            .from('custom_activities')
            .select('measurement_type')
            .eq('activity_name', workout_type)
            .maybeSingle();
          if (data) customActivity = data;
        }

        if (customActivity) {
          measurementType = customActivity.measurement_type;
        } else {
          const { data: regularActivity } = await supabase
            .from('activities')
            .select('measurement_type')
            .eq('activity_name', workout_type)
            .maybeSingle();
          if (regularActivity) {
            measurementType = regularActivity.measurement_type;
          }
        }
      }

      // Use per-activity min_value override for baseDuration if set
      let overrideBaseDuration: number | null = null;
      if (activityConfigRow && typeof activityConfigRow.min_value === 'number' && activityConfigRow.min_value > 0) {
        overrideBaseDuration = activityConfigRow.min_value;
      }

      const rrResult = calculateRR(
        rrConfig,
        type as 'workout' | 'rest',
        { duration, distance, steps, holes },
        workout_type || null,
        userAge,
        measurementType,
        overrideBaseDuration,
      );

      payload.rr_value = rrResult.rr_value;

      // Enforce RR rules: for standard formula, workouts must have RR >= 1.0
      if (type === 'workout' && !rrResult.canSubmit) {
        return NextResponse.json(
          { error: rrConfig.formula === 'simple'
            ? 'Please provide at least one metric (duration, distance, steps, or holes) to submit.'
            : 'Workout RR must be at least 1.0 to submit. Please increase duration/distance/steps.' },
          { status: 400 }
        );
      }
    }

    // If the only existing entry is an auto-assigned rest day and the user is now
    // submitting a real workout, remove the auto rest day so the workout can be inserted.
    // This handles late submissions where the cron already assigned a rest day.
    if (
      existing &&
      !reupload_of &&
      type === 'workout' &&
      existing.type === 'rest' &&
      (existingRows ?? []).length === 1 &&
      typeof existing.notes === 'string' &&
      existing.notes?.includes('Auto-assigned')
    ) {
      const { error: deleteAutoErr } = await supabase
        .from('effortentry')
        .delete()
        .eq('id', existing.id);

      if (deleteAutoErr) {
        console.error('Failed to remove auto-assigned rest day for late submission:', deleteAutoErr);
      } else {
        // Clear the existing reference so the code below inserts fresh
        existingRows!.length = 0;
      }
    }

    const effectiveExisting = (existingRows ?? []).length > 0 ? existingRows![0] : null;
    const effectiveHasNonRejected = (existingRows ?? []).some((r: any) => r?.status && r.status !== 'rejected');
    const effectiveCanReplaceRejected = !!effectiveExisting && !effectiveHasNonRejected;

    // For daily multi-frequency activities, skip the duplicate check entirely
    // (frequency validation above already enforces the limit)
    const isDailyMulti = !!(body as any).__isDailyMulti;

    // If an entry already exists for the day:
    // - If daily multi-frequency, allow inserting additional entries (skip duplicate block)
    // - If overwrite is true, allow updating regardless of status (unless it's a reupload flow)
    // - If this is a reupload (reupload_of is set), always create a new entry (handled below)
    // - Otherwise, block if any existing entry is pending/approved
    // - Allow update/replace only when previous submissions for that day are rejected
    if (effectiveExisting && !reupload_of && !isDailyMulti) {
      // Logic: Allow update if overwrite is requested OR if we are replacing a rejected entry
      // Note: overwrite flag comes from frontend when user confirms they want to update
      if (overwrite || effectiveCanReplaceRejected) {
        const { data: updated, error: updateError } = await supabase
          .from('effortentry')
          .update({
            ...payload,
            modified_by: userId,
            modified_date: new Date().toISOString(),
          })
          .eq('id', effectiveExisting.id)
          .select()
          .single();

        if (updateError) {
          console.error('Update error:', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          data: { ...updated, points_per_session: activityPointsPerSession },
          updated: true,
          replacedRejected: effectiveCanReplaceRejected,
          overwritten: !!overwrite
        });
      }

      // If we get here, it means we have an existing entry that is NOT rejected, and overwrite was NOT requested.
      return NextResponse.json(
        {
          error: `You already submitted an entry for ${normalizedDate}.`,
          // Return info about existing entry so frontend can check effectively
          existing: {
            id: effectiveExisting.id,
            type: effectiveExisting.type,
            status: effectiveExisting.status
          }
        },
        { status: 409 }
      );
    }

    // Insert new entry
    const { data: created, error: insertError } = await supabase
      .from("effortentry")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { ...created, points_per_session: activityPointsPerSession },
      created: true
    });
  } catch (error) {
    console.error('Error in entries/upsert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function normalizeDateOnly(input: unknown): string {
  if (typeof input !== 'string') return '';

  // Accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  // Accept ISO timestamps and similar; keep date portion
  const maybe = input.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(maybe)) return maybe;

  // Fallback: let Postgres attempt to parse; we keep original.
  return input;
}

function getWeekRangeYmd(dateYmd: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;

  const [y, m, d] = dateYmd.split('-').map(Number);
  if (!y || !m || !d) return null;

  const base = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(base.getTime())) return null;

  const dayOfWeek = base.getUTCDay(); // 0 = Sunday
  const start = new Date(base);
  start.setUTCDate(base.getUTCDate() - dayOfWeek);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getMonthRangeYmd(dateYmd: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;

  const [y, m] = dateYmd.split('-').map(Number);
  if (!y || !m) return null;

  const start = new Date(Date.UTC(y, m - 1, 1));
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(Date.UTC(y, m, 0));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
