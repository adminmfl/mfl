/**
 * GET /api/leagues/[id]/challenges/[challengeId]/leaderboard
 * Returns rankings for a specific challenge based on its type
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function endOfLocalDayToUtcISOString(dateYYYYMMDD: string, tzOffsetMinutes: number): string {
  const [y, m, d] = dateYYYYMMDD.split('-').map((p) => Number(p));
  // Local end-of-day expressed as UTC: UTC = local + offsetMinutes
  const utcMs = Date.UTC(y, (m || 1) - 1, d || 1, 23, 59, 59, 999) + tzOffsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}

function buildError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return buildError('Unauthorized', 401);
    }

    const { id: leagueId, challengeId } = await params;
    const supabase = getSupabaseServiceRole();

    // Verify user is a member of the league
    const { data: membership } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', session.user.id)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (!membership) {
      return buildError('Not a member of this league', 403);
    }

    // Fetch challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('leagueschallenges')
      .select('id, name, challenge_type, total_points, league_id')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return buildError('Challenge not found', 404);
    }

    if (challenge.league_id !== leagueId) {
      return buildError('Challenge does not belong to this league', 400);
    }

    // Apply a 2-day delay before scores appear on leaderboards.
    const { searchParams } = new URL(req.url);
    const tzOffsetMinutesParam = searchParams.get('tzOffsetMinutes');
    const tzOffsetMinutes = tzOffsetMinutesParam !== null ? Number(tzOffsetMinutesParam) : null;
    const nowLocal =
      typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)
        ? new Date(Date.now() - tzOffsetMinutes * 60_000)
        : new Date();

    const cutoffDate = (() => {
      const d = new Date(nowLocal);
      d.setDate(d.getDate() - 2);
      return formatDateYYYYMMDD(d);
    })();
    const cutoffTimestamp =
      typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)
        ? endOfLocalDayToUtcISOString(cutoffDate, tzOffsetMinutes)
        : new Date(`${cutoffDate}T23:59:59.999Z`).toISOString();

    // Fetch submissions for this challenge
    const { data: submissions, error: submissionsError } = await supabase
      .from('challenge_submissions')
      .select(`
        id,
        created_at,
        league_member_id,
        team_id,
        sub_team_id,
        awarded_points,
        leaguemembers!inner(
          user_id,
          team_id,
          users!leaguemembers_user_id_fkey(username)
        )
      `)
      .eq('league_challenge_id', challengeId)
      .eq('status', 'approved')
      .lte('created_at', cutoffTimestamp);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return buildError('Failed to fetch submissions', 500);
    }

    let rankings: Array<{ id: string; name: string; score: number; rank: number }> = [];

    if (challenge.challenge_type === 'individual') {
      // Individual challenge - scores go to player but aggregate to TEAM level for leaderboard display
      // Each individual submission counts toward their team's total
      const teamScores = new Map<string, { name: string; score: number }>();

      // Fetch team names for all teams of submitters
      const teamIds = Array.from(new Set((submissions || []).map((s: any) => s.leaguemembers?.team_id).filter(Boolean)));
      const { data: teams } = await supabase
        .from('teams')
        .select('team_id, team_name')
        .in('team_id', teamIds);

      const teamNameMap = new Map((teams || []).map((t) => [t.team_id, t.team_name]));

      (submissions || []).forEach((sub: any) => {
        const teamId = sub.leaguemembers?.team_id;
        if (!teamId) return;

        const points = Number(sub.awarded_points || 0);
        const teamName = teamNameMap.get(teamId) || 'Unknown Team';

        const existing = teamScores.get(teamId) || { name: teamName, score: 0 };
        teamScores.set(teamId, {
          ...existing,
          score: existing.score + points,
        });
      });

      rankings = Array.from(teamScores.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          score: data.score,
          rank: 0,
        }))
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({ ...item, rank: index + 1 }));

    } else if (challenge.challenge_type === 'team') {
      // Team challenge - group by team_id
      const teamScores = new Map<string, { name: string; score: number }>();

      // Fetch team names
      const teamIds = Array.from(new Set((submissions || []).map((s: any) => s.team_id).filter(Boolean)));
      const { data: teams } = await supabase
        .from('teams')
        .select('team_id, team_name')
        .in('team_id', teamIds);

      const teamNameMap = new Map((teams || []).map((t) => [t.team_id, t.team_name]));

      (submissions || []).forEach((sub: any) => {
        const teamId = sub.team_id || sub.leaguemembers?.team_id;
        if (!teamId) return;

        const points = Number(sub.awarded_points || 0);
        const teamName = teamNameMap.get(teamId) || 'Unknown Team';

        const existing = teamScores.get(teamId) || { name: teamName, score: 0 };
        teamScores.set(teamId, {
          ...existing,
          score: existing.score + points,
        });
      });

      rankings = Array.from(teamScores.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          score: data.score,
          rank: 0,
        }))
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({ ...item, rank: index + 1 }));

    } else if (challenge.challenge_type === 'sub_team') {
      // Sub-team challenge - check for manually assigned team scores first,
      // then fall back to aggregating from challenge_submissions.
      const { data: leagueChallenge } = await supabase
        .from('leagueschallenges')
        .select('challenge_id')
        .eq('id', challengeId)
        .single();

      let manualScores: Array<{ team_id: string; score: number }> = [];

      if (leagueChallenge?.challenge_id) {
        const { data: scoresData } = await supabase
          .from('specialchallengeteamscore')
          .select('team_id, score')
          .eq('challenge_id', leagueChallenge.challenge_id)
          .eq('league_id', leagueId);

        manualScores = scoresData || [];
      }

      if (manualScores.length > 0) {
        // Use manual scores
        const teamIds = manualScores.map(s => s.team_id);
        const { data: teams } = await supabase
          .from('teams')
          .select('team_id, team_name')
          .in('team_id', teamIds);

        const teamNameMap = new Map((teams || []).map(t => [t.team_id, t.team_name]));

        rankings = manualScores
          .map(s => ({
            id: s.team_id,
            name: teamNameMap.get(s.team_id) || 'Unknown Team',
            score: Number(s.score || 0),
            rank: 0,
          }))
          .sort((a, b) => b.score - a.score)
          .map((item, index) => ({ ...item, rank: index + 1 }));
      } else {
        // Fall back to submission-based scores
        const teamScores = new Map<string, { name: string; score: number }>();

        const subTeamIds = Array.from(new Set((submissions || []).map((s: any) => s.sub_team_id).filter(Boolean)));
        if (subTeamIds.length > 0) {
          const { data: subTeams } = await supabase
            .from('challenge_subteams')
            .select('subteam_id, team_id, teams(team_name)')
            .in('subteam_id', subTeamIds);

          const subTeamToTeamMap = new Map((subTeams || []).map((st: any) => [
            st.subteam_id,
            { teamId: st.team_id, teamName: st.teams?.team_name || 'Unknown Team' }
          ]));

          (submissions || []).forEach((sub: any) => {
            const subTeamId = sub.sub_team_id;
            if (!subTeamId) return;

            const points = Number(sub.awarded_points || 0);
            const teamData = subTeamToTeamMap.get(subTeamId);
            if (!teamData?.teamId) return;

            const existing = teamScores.get(teamData.teamId) || { name: teamData.teamName, score: 0 };
            teamScores.set(teamData.teamId, {
              ...existing,
              score: existing.score + points,
            });
          });

          rankings = Array.from(teamScores.entries())
            .map(([id, data]) => ({
              id,
              name: data.name,
              score: data.score,
              rank: 0,
            }))
            .sort((a, b) => b.score - a.score)
            .map((item, index) => ({ ...item, rank: index + 1 }));
        }
      }
    } else if (challenge.challenge_type === 'tournament') {
      // Tournament challenge - check for manually assigned scores first
      // If manual scores exist, use those. Otherwise calculate from match results.

      // First check if we have a parent challenge_id with manual scores
      const { data: leagueChallenge } = await supabase
        .from('leagueschallenges')
        .select('challenge_id')
        .eq('id', challengeId)
        .single();

      let manualScores: Array<{ team_id: string; score: number }> = [];

      if (leagueChallenge?.challenge_id) {
        const { data: scoresData } = await supabase
          .from('specialchallengeteamscore')
          .select('team_id, score')
          .eq('challenge_id', leagueChallenge.challenge_id)
          .eq('league_id', leagueId);

        manualScores = scoresData || [];
      }

      if (manualScores.length > 0) {
        // Use manual scores
        const teamIds = manualScores.map(s => s.team_id);
        const { data: teams } = await supabase
          .from('teams')
          .select('team_id, team_name')
          .in('team_id', teamIds);

        const teamNameMap = new Map((teams || []).map(t => [t.team_id, t.team_name]));

        rankings = manualScores
          .map(s => ({
            id: s.team_id,
            name: teamNameMap.get(s.team_id) || 'Unknown Team',
            score: Number(s.score || 0),
            rank: 0,
          }))
          .sort((a, b) => b.score - a.score)
          .map((item, index) => ({ ...item, rank: index + 1 }));
      } else {
        // Fall back to match-based calculation
        // 3 points for win, 1 for draw, 0 for loss
        const { data: matches } = await supabase
          .from('challenge_tournament_matches')
          .select(`
            match_id,
            team1_id,
            team2_id,
            score1,
            score2,
            status,
            team1:teams!challenge_tournament_matches_team1_id_fkey(team_name),
            team2:teams!challenge_tournament_matches_team2_id_fkey(team_name)
          `)
          .eq('league_challenge_id', challengeId)
          .eq('status', 'completed');

        const stats: Record<string, { name: string; score: number }> = {};

        // Initialize helper
        const getStat = (id: string, name: string) => {
          if (!stats[id]) stats[id] = { name, score: 0 };
          return stats[id];
        };

        (matches || []).forEach((match: any) => {
          if (!match.team1_id || !match.team2_id) return;

          const t1Name = match.team1?.team_name || 'Unknown Team';
          const t2Name = match.team2?.team_name || 'Unknown Team';

          const t1 = getStat(match.team1_id, t1Name);
          const t2 = getStat(match.team2_id, t2Name);

          if (match.score1 > match.score2) {
            t1.score += 3;
          } else if (match.score2 > match.score1) {
            t2.score += 3;
          } else {
            t1.score += 1;
            t2.score += 1;
          }
        });

        rankings = Object.entries(stats)
          .map(([id, data]) => ({
            id,
            name: data.name,
            score: data.score,
            rank: 0,
          }))
          .sort((a, b) => b.score - a.score)
          .map((item, index) => ({ ...item, rank: index + 1 }));
      }
    }

    return NextResponse.json({
      success: true,
      data: rankings,
    });
  } catch (err) {
    console.error('Unexpected error in challenge leaderboard:', err);
    return buildError('Internal server error', 500);
  }
}
