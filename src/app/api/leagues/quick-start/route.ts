/**
 * POST /api/leagues/quick-start
 *
 * Creates a pre-configured league with auto-generated teams and default
 * activities in a single request. Designed for the quick-start onboarding flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { createLeague } from '@/lib/services/leagues';
import { createTeamForLeague } from '@/lib/services/teams';

// ─── Constants ───────────────────────────────────────────────────────

const TEAM_NAMES = [
  'Team Alpha',
  'Team Bravo',
  'Team Charlie',
  'Team Delta',
  'Team Echo',
  'Team Foxtrot',
  'Team Golf',
  'Team Hotel',
  'Team India',
  'Team Juliet',
  'Team Kilo',
  'Team Lima',
];

const FIVE_DEFAULT_ACTIVITIES = [
  'Running',
  'Gym',
  'Yoga',
  'Walking',
  'Cycling',
];

const ALL_EIGHT_ACTIVITIES = [
  'Running',
  'Gym',
  'Yoga',
  'Walking',
  'Cycling',
  'Swimming',
  'Dance',
  'Sports',
];

// PFL format: all approved workout types from PFL Program Summary
const PFL_ACTIVITIES = [
  'Running',
  'Gym',
  'Yoga',
  'Walking',
  'Cycling',
  'Swimming',
  'Dance',
  'Sports',
  'Steps',
  'Golf',
];

// rest_days is per-week (DB constraint: 0-7).
// 40-day ~6 weeks → 1/week ≈ 6 rest days total
// 60-day ~9 weeks → 1/week ≈ 9 rest days total
// 90-day ~13 weeks → 1/week ≈ 13 rest days total (hosts can adjust)
const TEMPLATE_CONFIG = {
  '40_day': {
    duration: 40,
    rest_days: 1,
    activities: FIVE_DEFAULT_ACTIVITIES,
    label: '40-Day Fitness League',
  },
  '60_day': {
    duration: 60,
    rest_days: 1,
    activities: ALL_EIGHT_ACTIVITIES,
    label: '60-Day Fitness League',
  },
  '90_day_pfl': {
    duration: 90,
    rest_days: 1,
    activities: PFL_ACTIVITIES,
    label: '90-Day PFL Format',
  },
} as const;

type TemplateKey = keyof typeof TEMPLATE_CONFIG;

// ─── Helpers ─────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function calculateTeams(playerCount: number) {
  let numTeams = Math.ceil(playerCount / 8);
  numTeams = Math.max(2, Math.min(12, numTeams));
  const maxTeamCapacity = Math.ceil(playerCount / numTeams) + 2;
  return { numTeams, maxTeamCapacity };
}

// ─── POST Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authUser.id;

    // 2. Parse & validate body
    const body = await request.json();
    const { template, league_type, player_count, league_name } = body as {
      template?: string;
      league_type?: string;
      player_count?: number;
      league_name?: string;
    };

    if (!template || !TEMPLATE_CONFIG[template as TemplateKey]) {
      return NextResponse.json(
        { error: 'template must be "40_day", "60_day", or "90_day_pfl"' },
        { status: 400 },
      );
    }

    if (!league_type || !['corporate', 'residential'].includes(league_type)) {
      return NextResponse.json(
        { error: 'league_type must be "corporate" or "residential"' },
        { status: 400 },
      );
    }

    if (!player_count || typeof player_count !== 'number' || player_count < 2) {
      return NextResponse.json(
        { error: 'player_count must be a number >= 2' },
        { status: 400 },
      );
    }

    // 3. Derive configuration from template
    const config = TEMPLATE_CONFIG[template as TemplateKey];
    const { numTeams, maxTeamCapacity } = calculateTeams(player_count);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = toDateString(tomorrow);

    const endDateObj = new Date(tomorrow);
    endDateObj.setDate(endDateObj.getDate() + config.duration - 1);
    const endDate = toDateString(endDateObj);

    const resolvedName =
      league_name?.trim() ||
      `${league_type === 'corporate' ? 'Corporate' : 'Community'} Fitness League`;

    // 4. Create the league
    const league = await createLeague(userId, {
      league_name: resolvedName,
      start_date: startDate,
      end_date: endDate,
      num_teams: numTeams,
      max_team_capacity: maxTeamCapacity,
      rest_days: config.rest_days,
      rr_config: { formula: 'standard' },
    });

    if (!league) {
      return NextResponse.json(
        { error: 'Failed to create league' },
        { status: 500 },
      );
    }

    const leagueId = league.league_id;

    // 5. Auto-generate teams
    let teamsCreated = 0;
    for (let i = 0; i < numTeams; i++) {
      const team = await createTeamForLeague(leagueId, TEAM_NAMES[i], userId);
      if (team) teamsCreated++;
    }

    // 6. Add default activities
    const supabase = getSupabaseServiceRole();

    // Fetch activity IDs by name
    const { data: activityRows, error: activityError } = await supabase
      .from('activities')
      .select('activity_id, activity_name')
      .in('activity_name', config.activities as unknown as string[]);

    if (activityError) {
      console.error('Error fetching activities:', activityError);
      // League and teams are already created, so return partial success
      return NextResponse.json({
        success: true,
        warning: 'League created but failed to add default activities',
        data: {
          league_id: leagueId,
          league_name: resolvedName,
          teams_created: teamsCreated,
          activities_added: 0,
          start_date: startDate,
          end_date: endDate,
        },
      });
    }

    let activitiesAdded = 0;

    if (activityRows && activityRows.length > 0) {
      const insertData = activityRows.map((row) => ({
        league_id: leagueId,
        activity_id: row.activity_id,
        frequency_type: 'daily' as const,
        frequency: 1,
        proof_requirement: 'mandatory' as const,
        points_per_session: 1,
        created_by: userId,
      }));

      const { error: insertError } = await supabase
        .from('leagueactivities')
        .insert(insertData);

      if (insertError) {
        console.error('Error inserting league activities:', insertError);
      } else {
        activitiesAdded = insertData.length;
      }
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      data: {
        league_id: leagueId,
        league_name: resolvedName,
        teams_created: teamsCreated,
        activities_added: activitiesAdded,
        start_date: startDate,
        end_date: endDate,
      },
    });
  } catch (error) {
    console.error('Error in quick-start league creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
