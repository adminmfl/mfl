/**
 * League Activities API
 *
 * GET /api/leagues/[id]/activities - Get activities configured for a league
 * POST /api/leagues/[id]/activities - Add activity to league (host only)
 * DELETE /api/leagues/[id]/activities - Remove activity from league (host only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Helper: Check if user is host (creator OR assigned host role)
// ============================================================================

async function checkIsHost(supabase: any, leagueId: string, userId: string): Promise<boolean> {
  const { data: league } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('league_id', leagueId)
    .single();

  if (league?.created_by === userId) return true;

  const { data: roleData } = await supabase
    .from('assignedrolesforleague')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .eq('league_id', leagueId);

  const roleNames = (roleData || []).map((r: any) => r.roles?.role_name).filter(Boolean);
  return roleNames.includes('host');
}

// ============================================================================
// Types
// ============================================================================

export interface LeagueActivity {
  activity_id: string;
  activity_name: string;
  description: string | null;
  category_id: string | null;
  frequency?: number | null;
  frequency_type?: 'daily' | 'weekly' | 'monthly' | null;
  category?: {
    category_id: string;
    category_name: string;
    display_name: string;
  } | null;
  value: string; // Normalized name for workout_type (e.g., "run", "cycling")
  measurement_type?: 'duration' | 'distance' | 'hole' | 'steps' | 'none';
  settings?: {
    secondary_measurement_type?: 'duration' | 'distance' | 'hole' | 'steps';
    [key: string]: any;
  } | null;
  admin_info?: string | null;
  // Custom activity fields
  is_custom?: boolean;
  custom_activity_id?: string;
  requires_proof?: boolean;
  requires_notes?: boolean;
  // Per-league activity configuration
  proof_requirement?: 'not_required' | 'optional' | 'mandatory';
  notes_requirement?: 'not_required' | 'optional' | 'mandatory';
  points_per_session?: number;
  outcome_config?: { label: string; points: number }[] | null;
}

// ============================================================================
// PATCH Handler - Update activity frequency (host only)
// ============================================================================

export async function PATCH(
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
    const supabase = getSupabaseServiceRole();

    // Check if user is host of this league (creator or assigned host role)
    const isHostUser = await checkIsHost(supabase, leagueId, userId);
    if (!isHostUser) {
      return NextResponse.json(
        { error: 'Only the league host can configure activities' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { activity_id, frequency, frequency_type, proof_requirement, notes_requirement, points_per_session, outcome_config, max_images, custom_field_label } = body as {
      activity_id?: string;
      frequency?: number | null;
      frequency_type?: 'daily' | 'weekly' | 'monthly' | null;
      proof_requirement?: 'not_required' | 'optional' | 'mandatory';
      notes_requirement?: 'not_required' | 'optional' | 'mandatory';
      points_per_session?: number;
      outcome_config?: { label: string; points: number }[] | null;
      max_images?: number;
      custom_field_label?: string | null;
    };

    if (!activity_id) {
      return NextResponse.json(
        { error: 'activity_id is required' },
        { status: 400 }
      );
    }

    const hasFrequency = Object.prototype.hasOwnProperty.call(body, 'frequency');
    const hasFrequencyType = Object.prototype.hasOwnProperty.call(body, 'frequency_type');
    const hasProofRequirement = Object.prototype.hasOwnProperty.call(body, 'proof_requirement');
    const hasNotesRequirement = Object.prototype.hasOwnProperty.call(body, 'notes_requirement');
    const hasPointsPerSession = Object.prototype.hasOwnProperty.call(body, 'points_per_session');
    const hasOutcomeConfig = Object.prototype.hasOwnProperty.call(body, 'outcome_config');
    const hasMaxImages = Object.prototype.hasOwnProperty.call(body, 'max_images');
    const hasCustomFieldLabel = Object.prototype.hasOwnProperty.call(body, 'custom_field_label');

    if (!hasFrequency && !hasFrequencyType && !hasProofRequirement && !hasNotesRequirement && !hasPointsPerSession && !hasOutcomeConfig && !hasMaxImages && !hasCustomFieldLabel) {
      return NextResponse.json(
        { error: 'At least one field to update is required' },
        { status: 400 }
      );
    }

    let normalizedFrequencyType: 'daily' | 'weekly' | 'monthly' | null | undefined = undefined;
    if (hasFrequencyType) {
      if (frequency_type === null || frequency_type === undefined || frequency_type === '') {
        normalizedFrequencyType = null;
      } else if (frequency_type !== 'daily' && frequency_type !== 'weekly' && frequency_type !== 'monthly') {
        return NextResponse.json(
          { error: 'frequency_type must be daily, weekly, or monthly (or null to reset)' },
          { status: 400 }
        );
      } else {
        normalizedFrequencyType = frequency_type as 'daily' | 'weekly' | 'monthly';
      }
    }

    let normalizedFrequency: number | null | undefined = undefined;
    if (hasFrequency) {
      if (frequency === null || frequency === undefined || frequency === '') {
        normalizedFrequency = null;
      } else {
      const asNumber = Number(frequency);
      if (!Number.isFinite(asNumber)) {
        return NextResponse.json(
          { error: 'frequency must be a number or null' },
          { status: 400 }
        );
      }

      let effectiveType = normalizedFrequencyType ?? 'weekly';
      if (!hasFrequencyType) {
        const { data: currentRow } = await supabase
          .from('leagueactivities')
          .select('frequency_type')
          .eq('league_id', leagueId)
          .or(`activity_id.eq.${activity_id},custom_activity_id.eq.${activity_id}`)
          .maybeSingle();
        const currentType = (currentRow as any)?.frequency_type;
        if (currentType === 'monthly') effectiveType = 'monthly';
        if (currentType === 'daily') effectiveType = 'daily';
      }

      const rounded = Math.floor(asNumber);
      const maxAllowed = effectiveType === 'monthly' ? 28 : effectiveType === 'daily' ? 10 : 7;
      if (rounded === 0) {
        normalizedFrequency = null;
      } else if (rounded < 1 || rounded > maxAllowed) {
        return NextResponse.json(
          {
            error: `frequency must be between 1 and ${maxAllowed} (or null for unlimited)`,
          },
          { status: 400 }
        );
      } else {
        normalizedFrequency = rounded;
      }
      }
    }

    const updatePayload: Record<string, any> = {
      modified_by: userId,
      modified_date: new Date().toISOString(),
    };

    if (hasFrequency) {
      updatePayload.frequency = normalizedFrequency ?? null;
    }

    if (hasFrequencyType) {
      updatePayload.frequency_type = normalizedFrequencyType ?? 'weekly';
    }

    // Handle proof_requirement
    if (hasProofRequirement) {
      const validValues = ['not_required', 'optional', 'mandatory'];
      if (!validValues.includes(proof_requirement as string)) {
        return NextResponse.json(
          { error: 'proof_requirement must be not_required, optional, or mandatory' },
          { status: 400 }
        );
      }
      updatePayload.proof_requirement = proof_requirement;
    }

    // Handle notes_requirement
    if (hasNotesRequirement) {
      const validValues = ['not_required', 'optional', 'mandatory'];
      if (!validValues.includes(notes_requirement as string)) {
        return NextResponse.json(
          { error: 'notes_requirement must be not_required, optional, or mandatory' },
          { status: 400 }
        );
      }
      updatePayload.notes_requirement = notes_requirement;
    }

    // Handle points_per_session
    if (hasPointsPerSession) {
      const pts = Number(points_per_session);
      if (!Number.isFinite(pts) || pts < 0) {
        return NextResponse.json(
          { error: 'points_per_session must be a non-negative number' },
          { status: 400 }
        );
      }
      updatePayload.points_per_session = pts;
    }

    // Handle outcome_config
    if (hasOutcomeConfig) {
      if (outcome_config === null) {
        updatePayload.outcome_config = null;
      } else if (Array.isArray(outcome_config)) {
        // Validate each outcome entry
        for (const item of outcome_config) {
          if (!item.label || typeof item.label !== 'string') {
            return NextResponse.json(
              { error: 'Each outcome must have a label string' },
              { status: 400 }
            );
          }
          if (typeof item.points !== 'number' || !Number.isFinite(item.points)) {
            return NextResponse.json(
              { error: 'Each outcome must have a numeric points value' },
              { status: 400 }
            );
          }
        }
        updatePayload.outcome_config = outcome_config;
      } else {
        return NextResponse.json(
          { error: 'outcome_config must be an array or null' },
          { status: 400 }
        );
      }
    }

    // Handle max_images
    if (hasMaxImages) {
      const imgs = Number(max_images);
      if (!Number.isFinite(imgs) || imgs < 1 || imgs > 5) {
        return NextResponse.json(
          { error: 'max_images must be between 1 and 5' },
          { status: 400 }
        );
      }
      updatePayload.max_images = imgs;
    }

    // Handle custom_field_label
    if (hasCustomFieldLabel) {
      updatePayload.custom_field_label = custom_field_label ? String(custom_field_label).trim() : null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('leagueactivities')
      .update(updatePayload)
      .eq('league_id', leagueId)
      .or(`activity_id.eq.${activity_id},custom_activity_id.eq.${activity_id}`)
      .select()
      .maybeSingle();

    if (updateError) {
      const rawMessage = typeof updateError?.message === 'string' ? updateError.message : '';
      const message = rawMessage.toLowerCase();
      if (message.includes('frequency') && message.includes('column')) {
        return NextResponse.json(
          { error: 'Frequency is not supported yet for this league', code: 'FREQUENCY_NOT_SUPPORTED' },
          { status: 409 }
        );
      }

      console.error('Error updating activity frequency:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update activity frequency',
          details: process.env.NODE_ENV === 'development' ? rawMessage || updateError : undefined,
        },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Activity is not enabled for this league' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        activity_id,
        frequency: hasFrequency ? normalizedFrequency ?? null : (updated as any)?.frequency ?? null,
        frequency_type: hasFrequencyType
          ? normalizedFrequencyType ?? 'weekly'
          : (updated as any)?.frequency_type ?? 'weekly',
      },
    });
  } catch (error) {
    console.error('Error in league activities PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - Get activities for a league
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';

    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // First check if user is a member of this league
    const { data: membership } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', session.user.id)
      .eq('league_id', leagueId)
      .maybeSingle();

    // Check user roles in this league
    const { data: roleData } = await supabase
      .from('assignedrolesforleague')
      .select('roles(role_name)')
      .eq('user_id', session.user.id)
      .eq('league_id', leagueId);

    const roleNames = (roleData || []).map((r: any) => r.roles?.role_name).filter(Boolean);

    // Also check if user is league creator
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    const isHost = league?.created_by === session.user.id || roleNames.includes('host');
    const isGovernor = roleNames.includes('governor');

    if (!membership && !isHost && !isGovernor) {
      return NextResponse.json(
        { error: 'You are not a member of this league' },
        { status: 403 }
      );
    }

    // Get league-specific activities via leagueactivities junction table
    let leagueActivities: any[] | null = null;
    let activitiesError: any = null;
    let supportsFrequency = true;

    const withFrequency = await supabase
      .from('leagueactivities')
      .select(`
        activity_id,
        custom_activity_id,
        frequency,
        frequency_type,
        min_value,
        age_group_overrides,
        proof_requirement,
        notes_requirement,
        points_per_session,
        outcome_config,
        max_images,
        custom_field_label,
        activities(
          activity_id,
          activity_name,
          description,
          category_id,
          measurement_type,
          settings,
          admin_info,
          activity_categories(category_id, category_name, display_name)
        ),
        custom_activities(
          custom_activity_id,
          activity_name,
          description,
          measurement_type,
          requires_proof,
          requires_notes
        )
      `)
      .eq('league_id', leagueId);

    leagueActivities = withFrequency.data as any[] | null;
    activitiesError = withFrequency.error;

    // Fallback if new columns are not present yet (pre-migration)
    if (activitiesError && typeof activitiesError?.message === 'string') {
      const msg = activitiesError.message.toLowerCase();

      // Fallback: if proof_requirement/notes_requirement/points_per_session/outcome_config/max_images/custom_field_label columns don't exist
      // Also catch generic column errors (e.g. "column ... does not exist") that may not mention the exact name we check
      const isNewColumnError = (msg.includes('proof_requirement') || msg.includes('notes_requirement') || msg.includes('points_per_session') || msg.includes('outcome_config') || msg.includes('max_images') || msg.includes('custom_field_label'));
      const isGenericColumnError = msg.includes('column') && (msg.includes('does not exist') || msg.includes('not found') || msg.includes('undefined'));
      if (isNewColumnError || isGenericColumnError) {
        const withoutNewCols = await supabase
          .from('leagueactivities')
          .select(`
            activity_id,
            custom_activity_id,
            frequency,
            frequency_type,
            min_value,
            age_group_overrides,
            activities(
              activity_id, activity_name, description, category_id, measurement_type, settings, admin_info,
              activity_categories(category_id, category_name, display_name)
            ),
            custom_activities(
              custom_activity_id, activity_name, description, measurement_type, requires_proof, requires_notes
            )
          `)
          .eq('league_id', leagueId);

        leagueActivities = withoutNewCols.data as any[] | null;
        activitiesError = withoutNewCols.error;
      }

    }

    // Further fallback for frequency columns (may happen after new-column fallback or independently)
    if (activitiesError && typeof activitiesError?.message === 'string') {
      const msg = activitiesError.message.toLowerCase();
      if (msg.includes('frequency_type') && msg.includes('column')) {
        const withoutFrequencyType = await supabase
          .from('leagueactivities')
          .select(`
            activity_id,
            custom_activity_id,
            frequency,
            min_value,
            age_group_overrides,
            activities(
              activity_id, 
              activity_name, 
              description,
              category_id,
              measurement_type,
              settings,
              admin_info,
              activity_categories(category_id, category_name, display_name)
            ),
            custom_activities(
              custom_activity_id,
              activity_name,
              description,
              measurement_type,
              requires_proof,
              requires_notes
            )
          `)
          .eq('league_id', leagueId);

        leagueActivities = withoutFrequencyType.data as any[] | null;
        activitiesError = withoutFrequencyType.error;
      } else if (msg.includes('frequency') && msg.includes('column')) {
        supportsFrequency = false;
        const withoutFrequency = await supabase
          .from('leagueactivities')
          .select(`
            activity_id,
            custom_activity_id,
            min_value,
            age_group_overrides,
            activities(
              activity_id, 
              activity_name, 
              description,
              category_id,
              measurement_type,
              settings,
              admin_info,
              activity_categories(category_id, category_name, display_name)
            ),
            custom_activities(
              custom_activity_id,
              activity_name,
              description,
              measurement_type,
              requires_proof,
              requires_notes
            )
          `)
          .eq('league_id', leagueId);

        leagueActivities = withoutFrequency.data as any[] | null;
        activitiesError = withoutFrequency.error;
      }
    }

    if (activitiesError) {
      console.error('Error fetching league activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Transform enabled activities to LeagueActivity format
    const enabledActivities: LeagueActivity[] = (leagueActivities || [])
      .filter((la) => la.activities || la.custom_activities) // Filter out any null activities
      .map((la) => {
        // Check if this is a custom activity
        if (la.custom_activities) {
          const customAct = la.custom_activities as any;
          return {
            activity_id: customAct.custom_activity_id,
            custom_activity_id: customAct.custom_activity_id,
            activity_name: customAct.activity_name,
            description: customAct.description,
            category_id: null,
            frequency: (la as any).frequency ?? null,
            frequency_type: (la as any).frequency_type ?? 'weekly',
            min_value: (la as any).min_value ?? null,
            age_group_overrides: (la as any).age_group_overrides ?? null,
            category: null,
            value: customAct.custom_activity_id, // Use ID as value for custom activities to ensure correct lookup
            measurement_type: customAct.measurement_type,
            settings: null,
            admin_info: null,
            is_custom: true,
            requires_proof: customAct.requires_proof,
            requires_notes: customAct.requires_notes,
            proof_requirement: (la as any).proof_requirement ?? 'mandatory',
            notes_requirement: (la as any).notes_requirement ?? 'optional',
            points_per_session: (la as any).points_per_session ?? 1,
            outcome_config: (la as any).outcome_config ?? null,
            max_images: (la as any).max_images ?? 1,
            custom_field_label: (la as any).custom_field_label ?? null,
          };
        }

        // Global activity
        const activity = la.activities as any;
        return {
          activity_id: activity.activity_id,
          activity_name: activity.activity_name,
          description: activity.description,
          category_id: activity.category_id,
          frequency: (la as any).frequency ?? null,
          frequency_type: (la as any).frequency_type ?? 'weekly',
          min_value: (la as any).min_value ?? null,
          age_group_overrides: (la as any).age_group_overrides ?? null,
          category: activity.activity_categories,
          value: activity.activity_name,
          measurement_type: activity.measurement_type,
          settings: activity.settings,
          admin_info: activity.admin_info,
          is_custom: false,
          proof_requirement: (la as any).proof_requirement ?? 'mandatory',
          notes_requirement: (la as any).notes_requirement ?? 'optional',
          points_per_session: (la as any).points_per_session ?? 1,
          outcome_config: (la as any).outcome_config ?? null,
          max_images: (la as any).max_images ?? 1,
          custom_field_label: (la as any).custom_field_label ?? null,
        };
      });

    // If host wants all activities (for configuration), fetch them
    let allActivities: LeagueActivity[] = [];
    if (includeAll && isHost) {
      const { data: allActs, error: allError } = await supabase
        .from('activities')
        .select(`
          activity_id, 
          activity_name, 
          description,
          category_id,
          measurement_type,
          settings,
          admin_info,
          activity_categories(category_id, category_name, display_name)
        `)
        .order('activity_name');

      if (!allError && allActs) {
        allActivities = allActs.map((a: any) => ({
          activity_id: a.activity_id,
          activity_name: a.activity_name,
          description: a.description,
          category_id: a.category_id,
          frequency: null,
          frequency_type: 'weekly',
          category: a.activity_categories,
          value: a.activity_name,
          measurement_type: a.measurement_type,
          settings: a.settings,
          admin_info: a.admin_info,
          is_custom: false,
        }));
      }

      // Also fetch host's custom activities for configuration
      const { data: customActs } = await supabase
        .from('custom_activities')
        .select('*')
        .eq('created_by', session.user.id)
        .eq('is_active', true)
        .order('activity_name');

      if (customActs) {
        const customActivitiesForConfig: LeagueActivity[] = customActs.map((ca: any) => ({
          activity_id: ca.custom_activity_id,
          custom_activity_id: ca.custom_activity_id,
          activity_name: ca.activity_name,
          description: ca.description,
          category_id: null,
          frequency: null,
          category: null,
          value: ca.activity_name,
          measurement_type: ca.measurement_type,
          settings: null,
          admin_info: null,
          is_custom: true,
          requires_proof: ca.requires_proof,
          requires_notes: ca.requires_notes,
        }));
        allActivities = [...allActivities, ...customActivitiesForConfig];
      }
    }

    // If no activities configured and not requesting all, return error for players
    if (enabledActivities.length === 0 && !includeAll) {
      return NextResponse.json({
        success: false,
        error: 'NO_ACTIVITIES_CONFIGURED',
        message: 'This league has no activities configured. Please contact the league host.',
        data: { activities: [], isLeagueSpecific: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        activities: enabledActivities,
        allActivities: includeAll ? allActivities : undefined,
        isLeagueSpecific: true,
        supportsFrequency,
        isHost,
      },
    });
  } catch (error) {
    console.error('Error in league activities GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Add activity to league (host only)
// ============================================================================

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
    const supabase = getSupabaseServiceRole();

    // Check if user is host of this league (creator or assigned host role)
    const isHostUser = await checkIsHost(supabase, leagueId, userId);
    if (!isHostUser) {
      return NextResponse.json(
        { error: 'Only the league host can configure activities' },
        { status: 403 }
      );
    }

    const body = await request.json();
    let { activity_ids, custom_activity_ids } = body;

    // Ensure arrays
    if (!activity_ids) activity_ids = [];
    if (!custom_activity_ids) custom_activity_ids = [];

    // Smart detection: Check if any activity_ids are actually custom activities
    if (activity_ids.length > 0) {
      // 1. Check which ones are valid global activities
      const { data: existingActivities, error: verifyError } = await supabase
        .from('activities')
        .select('activity_id')
        .in('activity_id', activity_ids);

      if (verifyError) {
        return NextResponse.json(
          { error: 'Failed to verify activities' },
          { status: 500 }
        );
      }

      const validActivityIds = (existingActivities || []).map((a) => a.activity_id);
      const potentialCustomIds = activity_ids.filter((id: string) => !validActivityIds.includes(id));

      // 2. If there are invalid global IDs, check if they are custom activities
      if (potentialCustomIds.length > 0) {
        const { data: foundCustom } = await supabase
          .from('custom_activities')
          .select('custom_activity_id')
          .in('custom_activity_id', potentialCustomIds)
          .eq('created_by', userId)
          .eq('is_active', true);

        const validCustomIdsFromMixed = (foundCustom || []).map(c => c.custom_activity_id);

        if (validCustomIdsFromMixed.length > 0) {
          // Move them to custom_activity_ids
          custom_activity_ids = [...custom_activity_ids, ...validCustomIdsFromMixed];

          // Update activity_ids to only contain valid global IDs
          activity_ids = validActivityIds;
        } else {
          // No valid custom activities found among the invalid IDs
          return NextResponse.json(
            { error: `Invalid activity IDs: ${potentialCustomIds.join(', ')}` },
            { status: 400 }
          );
        }
      } else {
        // All provided IDs were valid global activities
        // activity_ids remains as is (or explicit filtering to be safe)
        activity_ids = validActivityIds;
      }
    }

    // Handle global activities
    if (activity_ids.length > 0) {
      // Verify all activity IDs exist (already did this above, but we need existingActivities data?)
      // Actually we already have verified them. We can skip re-verification or just proceed with activity_ids which are now clean.

      // Check for duplicates - get existing league activities
      const { data: existing } = await supabase
        .from('leagueactivities')
        .select('activity_id')
        .eq('league_id', leagueId)
        .not('activity_id', 'is', null);

      const existingActivityIds = (existing || []).map((e) => e.activity_id);
      const newActivityIds = activity_ids.filter(
        (id: string) => !existingActivityIds.includes(id)
      );

      if (newActivityIds.length > 0) {
        // Insert new league activities
        const insertData = newActivityIds.map((activity_id: string) => ({
          league_id: leagueId,
          activity_id,
          created_by: userId,
        }));

        const { error: insertError } = await supabase
          .from('leagueactivities')
          .insert(insertData);

        if (insertError) {
          console.error('Error adding activities to league:', insertError);
          return NextResponse.json(
            { error: 'Failed to add activities' },
            { status: 500 }
          );
        }
      }
    }

    // Handle custom activities
    if (custom_activity_ids && Array.isArray(custom_activity_ids) && custom_activity_ids.length > 0) {
      // Verify ownership of custom activities
      const { data: customActivities, error: customVerifyError } = await supabase
        .from('custom_activities')
        .select('custom_activity_id')
        .in('custom_activity_id', custom_activity_ids)
        .eq('created_by', userId)
        .eq('is_active', true);

      if (customVerifyError) {
        return NextResponse.json(
          { error: 'Failed to verify custom activities' },
          { status: 500 }
        );
      }

      const validCustomIds = (customActivities || []).map((ca) => ca.custom_activity_id);
      const invalidCustomIds = custom_activity_ids.filter((id: string) => !validCustomIds.includes(id));

      if (invalidCustomIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid or unauthorized custom activity IDs: ${invalidCustomIds.join(', ')}` },
          { status: 400 }
        );
      }

      // Check for duplicates
      const { data: existingCustom } = await supabase
        .from('leagueactivities')
        .select('custom_activity_id')
        .eq('league_id', leagueId)
        .not('custom_activity_id', 'is', null);

      const existingCustomIds = (existingCustom || []).map((e) => e.custom_activity_id);
      const newCustomIds = custom_activity_ids.filter(
        (id: string) => !existingCustomIds.includes(id)
      );

      if (newCustomIds.length > 0) {
        const customInsertData = newCustomIds.map((custom_activity_id: string) => ({
          league_id: leagueId,
          custom_activity_id,
          created_by: userId,
        }));

        const { error: customInsertError } = await supabase
          .from('leagueactivities')
          .insert(customInsertData);

        if (customInsertError) {
          console.error('Error adding custom activities to league:', customInsertError);
          return NextResponse.json(
            { error: 'Failed to add custom activities' },
            { status: 500 }
          );
        }
      }
    }

    if ((!activity_ids || activity_ids.length === 0) && (!custom_activity_ids || custom_activity_ids.length === 0)) {
      return NextResponse.json(
        { error: 'activity_ids or custom_activity_ids array is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Activities added to the league',
    });
  } catch (error) {
    console.error('Error in league activities POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



// ============================================================================
// DELETE Handler - Remove activity from league (host only)
// ============================================================================

export async function DELETE(
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
    const supabase = getSupabaseServiceRole();

    // Check if user is host of this league (creator or assigned host role)
    const isHostUser = await checkIsHost(supabase, leagueId, userId);
    if (!isHostUser) {
      return NextResponse.json(
        { error: 'Only the league host can configure activities' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { activity_id, custom_activity_id } = body;

    if (!activity_id && !custom_activity_id) {
      return NextResponse.json(
        { error: 'activity_id or custom_activity_id is required' },
        { status: 400 }
      );
    }

    // Remove activity from league
    let deleteQuery = supabase
      .from('leagueactivities')
      .delete()
      .eq('league_id', leagueId);

    if (activity_id) {
      deleteQuery = deleteQuery.eq('activity_id', activity_id);
    } else if (custom_activity_id) {
      deleteQuery = deleteQuery.eq('custom_activity_id', custom_activity_id);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Error removing activity from league:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Activity removed from league',
    });
  } catch (error) {
    console.error('Error in league activities DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
