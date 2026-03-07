import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// Shared helpers ------------------------------------------------------------
type LeagueRole = 'host' | 'governor' | 'captain' | 'player' | null;

type ChallengeStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'submission_closed'
  | 'published'
  | 'closed';

const challengeStatusOrder: ChallengeStatus[] = [
  'draft',
  'scheduled',
  'active',
  'submission_closed',
  'published',
  'closed',
];

const defaultChallengeStatus: ChallengeStatus = 'draft';

function normalizeStatus(status: ChallengeStatus | string | null | undefined): ChallengeStatus {
  if (!status) return defaultChallengeStatus;
  if (status === 'upcoming') return 'scheduled'; // Legacy support
  if (challengeStatusOrder.includes(status as ChallengeStatus)) {
    return status as ChallengeStatus;
  }
  return defaultChallengeStatus;
}

type Membership = {
  leagueMemberId: string;
  role: LeagueRole;
};

async function getMembership(userId: string, leagueId: string): Promise<Membership | null> {
  const supabase = getSupabaseServiceRole();

  // First check if user is a league member
  const { data: memberData, error: memberError } = await supabase
    .from('leaguemembers')
    .select('league_member_id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (memberError || !memberData) {
    console.warn(`User ${userId} is not a member of league ${leagueId}`);
    return null;
  }

  // Then fetch the user's roles in this league
  const { data: roleData, error: roleError } = await supabase
    .from('assignedrolesforleague')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .eq('league_id', leagueId);

  if (roleError) {
    console.error(`Error fetching roles for user ${userId} in league ${leagueId}:`, roleError);
    return null;
  }

  // Get the first role (or highest priority role if multiple)
  const roleNames = (roleData || []).map((r: any) => r.roles?.role_name).filter(Boolean);
  const primaryRole = (roleNames[0] as LeagueRole) ?? null;

  return {
    leagueMemberId: String(memberData.league_member_id),
    role: primaryRole,
  };
}

function isHostOrGovernor(role: LeagueRole): boolean {
  return role === 'host' || role === 'governor';
}

function buildError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// GET - List league challenges with optional user submission state ---------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return buildError('Unauthorized', 401);
    }
    const supabase = getSupabaseServiceRole();

    const membership = await getMembership(session.user.id, leagueId);
    if (!membership) {
      console.error(`Membership check failed for userId=${session.user.id}, leagueId=${leagueId}`);
      return buildError('Not a member of this league', 403);
    }

    // Fetch active challenges for this league
    const { data: challenges, error } = await supabase
      .from('leagueschallenges')
      .select(
        `
        id,
        league_id,
        challenge_id,
        pricing_id,
        name,
        description,
        challenge_type,
        total_points,
        is_custom,
        is_unique_workout,
        payment_id,
        doc_url,
        start_date,
        end_date,
        status,
        updated_at,
        specialchallenges(name, description, doc_url)
      `
      )
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching league challenges', error);
      return buildError('Failed to fetch challenges', 500);
    }

    const challengeIds = (challenges || []).map((c) => c.id);

    // If host/governor fetch aggregate stats for each challenge
    let statsByChallenge: Record<string, { pending: number; approved: number; rejected: number }> = {};
    if (isHostOrGovernor(membership.role) && challengeIds.length) {
      const { data: submissions, error: statsError } = await supabase
        .from('challenge_submissions')
        .select('league_challenge_id, status')
        .in('league_challenge_id', challengeIds);

      if (!statsError && submissions) {
        // Aggregate submissions by challenge_id and status
        submissions.forEach((submission: any) => {
          const challengeId = String(submission.league_challenge_id);
          if (!statsByChallenge[challengeId]) {
            statsByChallenge[challengeId] = { pending: 0, approved: 0, rejected: 0 };
          }
          const statusKey = submission.status as 'pending' | 'approved' | 'rejected';
          statsByChallenge[challengeId][statusKey]++;
        });
      }
    }

    // Fetch the requesting member's submission per challenge
    let mySubmissions: Record<string, any> = {};
    if (challengeIds.length) {
      const { data: subs, error: subsError } = await supabase
        .from('challenge_submissions')
        .select('*')
        .in('league_challenge_id', challengeIds)
        .eq('league_member_id', membership.leagueMemberId);

      if (!subsError && subs) {
        subs.forEach((s) => {
          mySubmissions[String(s.league_challenge_id)] = s;
        });
      }
    }

    const parseYmd = (ymd?: string | null): Date | null => {
      if (!ymd) return null;
      // Try general ISO parse first
      const dtIso = new Date(String(ymd));
      if (!isNaN(dtIso.getTime())) {
        // normalize to local midnight
        return new Date(dtIso.getFullYear(), dtIso.getMonth(), dtIso.getDate());
      }

      // Fallback for strict YYYY-MM-DD format
      const m = /^\d{4}-\d{2}-\d{2}$/.exec(String(ymd));
      if (!m) return null;
      const [y, mo, d] = String(ymd).split('-').map((p) => Number(p));
      if (!y || !mo || !d) return null;
      const dt = new Date(y, mo - 1, d);
      dt.setHours(0, 0, 0, 0);
      return isNaN(dt.getTime()) ? null : dt;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPrivileged = isHostOrGovernor(membership.role);

    const deriveStatus = (rawStatus: any, startDate?: string | null, endDate?: string | null) => {
      const normalized = normalizeStatus(rawStatus);

      // Explicit states that override time-based calculations
      if (normalized === 'draft' || normalized === 'published' || normalized === 'closed') {
        return normalized;
      }

      const startDt = parseYmd(startDate || null);
      const endDt = parseYmd(endDate || null);

      if (startDt && endDt) {
        if (today.getTime() >= startDt.getTime() && today.getTime() <= endDt.getTime()) {
          return 'active' as const;
        }
        if (today.getTime() < startDt.getTime()) {
          return 'scheduled' as const;
        }
        // today > endDt -> Submission Closed (waiting for publish)
        return 'submission_closed' as const;
      }

      if (endDt && today.getTime() > endDt.getTime()) {
        return 'submission_closed' as const;
      }

      // fallback to stored/normalized value
      return normalized;
    };

    const activePayload = (challenges || [])
      .map((c) => {
        const template = (c as any).specialchallenges;
        const challengeId = String(c.id);
        const derived = deriveStatus(c.status, c.start_date, c.end_date);

        return {
          id: challengeId,
          league_id: c.league_id,
          name: c.name || template?.name || 'Challenge',
          pricing_id: c.pricing_id || null,
          description: c.description || null,
          challenge_type: c.challenge_type,
          total_points: Number(c.total_points || template?.total_points || 0),
          is_custom: !!c.is_custom,
          is_unique_workout: !!(c as any).is_unique_workout,
          payment_id: c.payment_id,
          doc_url: c.doc_url || template?.doc_url || null,
          start_date: c.start_date,
          end_date: c.end_date,
          status: derived,
          template_id: c.challenge_id,
          my_submission: mySubmissions[challengeId] || null,
          stats: statsByChallenge[challengeId] || null,
        };
      })
      .filter((c) => {
        // Drafts only visible to host/governor
        if (c.status === 'draft' && !isPrivileged) {
          return false;
        }
        return true;
      });

    // Fetch available preset challenges (admin templates) that haven't been activated yet
    let availablePresets: any[] = [];
    if (isHostOrGovernor(membership.role)) {
      const activatedTemplateIds = (challenges || [])
        .map((c) => c.challenge_id)
        .filter((id) => id !== null);

      let presetsQuery = supabase
        .from('specialchallenges')
        .select('*')
        .order('created_date', { ascending: false });

      if (activatedTemplateIds.length > 0) {
        presetsQuery = presetsQuery.not('challenge_id', 'in', `(${activatedTemplateIds.join(',')})`);
      }

      const { data: presets, error: presetsError } = await presetsQuery;
      if (!presetsError && presets) {
        availablePresets = presets.map((p) => ({
          id: p.challenge_id,
          name: p.name,
          description: p.description,
          doc_url: p.doc_url,
          challenge_type: p.challenge_type,
          is_preset: true,
        }));
      }
    }

    // Fetch singleton pricing for display/defaults
    const { data: defaultPricing } = await supabase
      .from('challengepricing')
      .select('pricing_id, per_day_rate, admin_markup, tax')
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        active: activePayload,
        availablePresets,
        defaultPricing: defaultPricing || null,
      },
    });
  } catch (err) {
    console.error('Unexpected error in GET /challenges', err);
    return buildError('Internal server error', 500);
  }
}

// POST - Create a league-scoped challenge (requires payment if custom) --
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return buildError('Unauthorized', 401);
    }
    const supabase = getSupabaseServiceRole();

    const membership = await getMembership(session.user.id, leagueId);
    if (!membership || !isHostOrGovernor(membership.role)) {
      return buildError('Forbidden', 403);
    }

    const body = await req.json();
    const {
      name,
      description,
      challengeType = 'individual',
      totalPoints = 0,
      startDate,
      endDate,
      docUrl,
      templateId,
      isCustom = false,
      isUniqueWorkout = false,
      status = defaultChallengeStatus,
      pricingId: incomingPricingId,
    } = body;

    if (!name && !templateId) {
      return buildError('Name or templateId is required', 400);
    }

    const normalizedStatus = normalizeStatus(status);

    // Fetch the default pricing_id from the singleton challengepricing table
    const { data: defaultPricing } = await supabase
      .from('challengepricing')
      .select('pricing_id')
      .limit(1)
      .maybeSingle();

    const resolvedPricingId = incomingPricingId || defaultPricing?.pricing_id || null;

    const insertPayload: Record<string, any> = {
      league_id: leagueId,
      name,
      description,
      challenge_type: challengeType,
      total_points: totalPoints,
      start_date: startDate,
      end_date: endDate,
      doc_url: docUrl,
      challenge_id: templateId ?? null,
      is_custom: isCustom,
      is_unique_workout: isUniqueWorkout,
      payment_id: null, // Would be set after payment succeeds
      status: normalizedStatus,
      pricing_id: resolvedPricingId,
    };

    const { data, error } = await supabase
      .from('leagueschallenges')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating league challenge', error);
      return buildError('Failed to create challenge', 500);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Unexpected error in POST /challenges', err);
    return buildError('Internal server error', 500);
  }
}
