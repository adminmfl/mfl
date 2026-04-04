/**
 * AI Coach Service
 *
 * Uses Mistral free tier to generate motivational messages for players,
 * teams, captains, and league Q&A.
 */
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { aiChat } from '@/lib/ai-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CoachMessageType = 'individual' | 'team' | 'captain' | 'bonding' | 'challenge';

interface PlayerContext {
  user_id: string;
  name: string;
  team_name: string;
  team_id: string;
  league_name: string;
  league_id: string;
  recent_activities: { date: string; activity: string; run_rate: number; status: string }[];
  current_streak: number;
  total_points: number;
  team_rank: number | null;
  total_teams: number;
}

interface TeamContext {
  team_id: string;
  team_name: string;
  league_name: string;
  league_id: string;
  rank: number;
  total_teams: number;
  total_points: number;
  member_count: number;
  avg_run_rate: number;
  active_members: number;
  inactive_members: string[];
}

interface ChallengeContext {
  league_id: string;
  league_name: string;
  challenges: { title: string; description: string; end_date: string; type: string }[];
}

// ---------------------------------------------------------------------------
// AI Helper
// ---------------------------------------------------------------------------

async function callAI(systemPrompt: string, userPrompt: string, leagueId?: string): Promise<string> {
  const result = await aiChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    feature: 'ai-coach',
    leagueId,
    temperature: 0.8,
    maxTokens: 300,
  });
  return result.content;
}

// ---------------------------------------------------------------------------
// System Prompts
// ---------------------------------------------------------------------------

const SYSTEM_INDIVIDUAL = `You are Coach MFL, a friendly and energetic fitness coach for the MyFitnessLeague app. Your job is to send short, personalized motivational messages to players based on their recent activity data.

Rules:
- Keep messages under 2-3 sentences
- Be encouraging, specific, and reference their actual data (streak, activities, points)
- Use casual, upbeat tone — like a supportive gym buddy
- If they've been inactive, gently nudge without guilt-tripping
- If they're on a streak, celebrate it
- Never use hashtags or emojis excessively (max 1-2 per message)
- Address the player by first name`;

const SYSTEM_TEAM = `You are Coach MFL, a team motivator for the MyFitnessLeague app. Generate short team motivation messages based on team standings and performance.

Rules:
- Keep messages under 2-3 sentences
- Reference the team's rank, points, or performance trends
- Encourage teamwork and healthy competition
- If team is leading, keep the momentum going
- If team is behind, motivate without being negative
- Use the team name in the message
- Never use hashtags`;

const SYSTEM_CAPTAIN = `You are Coach MFL's intelligence assistant for team captains. Provide actionable insights about their team.

Rules:
- Keep messages under 3-4 sentences
- Highlight inactive players who need attention
- Suggest specific actions the captain can take
- Be direct and data-driven
- Reference specific player names and stats`;

const SYSTEM_CHALLENGE = `You are Coach MFL, hyping up upcoming challenges in MyFitnessLeague.

Rules:
- Keep messages under 2-3 sentences
- Reference the specific challenge name and deadline
- Create excitement and urgency
- Encourage participation`;

const SYSTEM_BONDING = `You are Coach MFL, suggesting team bonding activities for fitness league teams.

Rules:
- Keep messages under 2-3 sentences
- Suggest practical activities (group workouts, morning runs, virtual challenges)
- Be creative but realistic
- Reference the team name`;

const SYSTEM_QA = `You are the MFL League Assistant, a helpful chatbot for MyFitnessLeague players. Answer questions about the league, rules, scoring, and activities.

Context about MFL:
- Players submit daily workouts (running, yoga, cycling, gym, etc.) with screenshot proof
- Run Rate (RR) measures workout intensity on 0-2 scale. 1.0 = minimum effort, above is bonus
- Points are earned based on Run Rate: approved workout × RR
- Teams compete on a leaderboard updated daily
- Captains manage their team and can validate submissions
- Hosts/Governors manage the entire league
- Rest days can be taken but earn 0 points
- Special challenges offer bonus points
- The leaderboard has a 2-day pending window for validation

Rules:
- Be concise and helpful
- If you don't know something specific to their league, say so
- Reference the league context provided
- Keep answers under 3-4 sentences unless the question requires more detail`;

// ---------------------------------------------------------------------------
// Context Builders (query DB for player/team data)
// ---------------------------------------------------------------------------

export async function getPlayerContexts(leagueId: string): Promise<PlayerContext[]> {
  const supabase = getSupabaseServiceRole();

  // Get league info
  const { data: league } = await supabase
    .from('leagues')
    .select('league_name')
    .eq('league_id', leagueId)
    .single();

  // Get all members with team info
  const { data: members } = await supabase
    .from('leaguemembers')
    .select('user_id, team_id, users(username), teams(team_name)')
    .eq('league_id', leagueId)
;

  if (!members || members.length === 0) return [];

  // Get recent activities (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  // Get all league member IDs for this league
  const allMemberIds = members.map((m: any) => {
    // We need league_member_id, fetch separately
    return m.user_id;
  });

  const { data: memberIdRows } = await supabase
    .from('leaguemembers')
    .select('league_member_id, user_id')
    .eq('league_id', leagueId);

  const lmIds = (memberIdRows || []).map((r: any) => r.league_member_id);

  const { data: entries } = lmIds.length > 0
    ? await supabase
      .from('effortentry')
      .select('league_member_id, date, rr_value, status, type')
      .in('league_member_id', lmIds)
      .gte('date', cutoff)
      .order('date', { ascending: false })
    : { data: [] };

  // Get team standings
  // Get teams for this league via teamleagues
  const { data: teamLeagues } = await supabase
    .from('teamleagues')
    .select('team_id, teams(team_id, team_name)')
    .eq('league_id', leagueId);

  const teams = (teamLeagues || []).map((tl: any) => ({
    team_id: tl.team_id,
    team_name: tl.teams?.team_name || 'Unknown',
  }));

  const teamRankMap: Record<string, number> = {};
  teams.forEach((t: any, i: number) => { teamRankMap[t.team_id] = i + 1; });

  // Reuse memberIdRows for lookup
  const memberIdToUserId: Record<string, string> = {};
  memberIdRows?.forEach((m: any) => { memberIdToUserId[m.league_member_id] = m.user_id; });

  // Build entry map by user
  const userEntries: Record<string, any[]> = {};
  entries?.forEach((e: any) => {
    const userId = memberIdToUserId[e.league_member_id];
    if (userId) {
      if (!userEntries[userId]) userEntries[userId] = [];
      userEntries[userId].push(e);
    }
  });

  // Calculate streaks
  function calcStreak(dates: string[]): number {
    if (dates.length === 0) return 0;
    const sorted = [...new Set(dates)].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    if (sorted[0] !== today) return 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }

  return members.map((m: any) => {
    const activities = userEntries[m.user_id] || [];
    const approvedDates = activities.filter((a) => a.status === 'approved').map((a) => a.date);

    return {
      user_id: m.user_id,
      name: (m.users as any)?.username?.split(' ')[0] || 'Player',
      team_name: (m.teams as any)?.team_name || 'Unknown Team',
      team_id: m.team_id,
      league_name: league?.league_name || 'the league',
      league_id: leagueId,
      recent_activities: activities.slice(0, 5).map((a) => ({
        date: a.date,
        activity: a.type || 'workout',
        run_rate: a.rr_value || 0,
        status: a.status,
      })),
      current_streak: calcStreak(approvedDates),
      total_points: activities.reduce((sum: number, a: any) => sum + (a.status === 'approved' ? (a.rr_value || 0) : 0), 0),
      team_rank: teamRankMap[m.team_id] || null,
      total_teams: teams?.length || 0,
    };
  });
}

export async function getTeamContexts(leagueId: string): Promise<TeamContext[]> {
  const supabase = getSupabaseServiceRole();

  const { data: league } = await supabase
    .from('leagues')
    .select('league_name')
    .eq('league_id', leagueId)
    .single();

  const { data: teamLeagueRows } = await supabase
    .from('teamleagues')
    .select('team_id, teams(team_id, team_name)')
    .eq('league_id', leagueId);

  const teams = (teamLeagueRows || []).map((tl: any) => ({
    team_id: tl.team_id,
    team_name: tl.teams?.team_name || 'Unknown',
    total_points: 0, // calculated dynamically
  }));

  if (teams.length === 0) return [];

  // Get member counts and recent activity per team
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 3);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  const contexts: TeamContext[] = [];

  for (const [idx, team] of teams.entries()) {
    const { data: members } = await supabase
      .from('leaguemembers')
      .select('league_member_id, user_id, users(username)')
      .eq('team_id', team.team_id);

    const memberIds = members?.map((m: any) => m.league_member_id) || [];

    // Recent entries for the team
    const { data: recentEntries } = memberIds.length > 0
      ? await supabase
        .from('effortentry')
        .select('league_member_id, rr_value')
        .in('league_member_id', memberIds)
        .gte('date', cutoff)
        .eq('status', 'approved')
      : { data: [] };

    const activeMemberIds = new Set((recentEntries || []).map((e: any) => e.league_member_id));
    const inactiveMembers = (members || [])
      .filter((m: any) => !activeMemberIds.has(m.league_member_id))
      .map((m: any) => (m.users as any)?.username?.split(' ')[0] || 'Unknown');

    const avgRR = recentEntries && recentEntries.length > 0
      ? recentEntries.reduce((s: number, e: any) => s + (e.rr_value || 0), 0) / recentEntries.length
      : 0;

    contexts.push({
      team_id: team.team_id,
      team_name: team.team_name,
      league_name: league?.league_name || 'the league',
      league_id: leagueId,
      rank: idx + 1,
      total_teams: teams.length,
      total_points: team.total_points || 0,
      member_count: members?.length || 0,
      avg_run_rate: Math.round(avgRR * 100) / 100,
      active_members: activeMemberIds.size,
      inactive_members: inactiveMembers,
    });
  }

  return contexts;
}

export async function getActiveChallenges(leagueId: string): Promise<ChallengeContext | null> {
  const supabase = getSupabaseServiceRole();

  const { data: league } = await supabase
    .from('leagues')
    .select('league_name')
    .eq('league_id', leagueId)
    .single();

  const { data: challenges } = await supabase
    .from('leagueschallenges')
    .select('name, description, end_date, challenge_type')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .gte('end_date', new Date().toISOString().split('T')[0]);

  if (!challenges || challenges.length === 0) return null;

  return {
    league_id: leagueId,
    league_name: league?.league_name || 'the league',
    challenges: challenges.map((c: any) => ({
      title: c.name || 'Challenge',
      description: c.description || '',
      end_date: c.end_date,
      type: c.challenge_type || 'individual',
    })),
  };
}

// ---------------------------------------------------------------------------
// Message Generators
// ---------------------------------------------------------------------------

export async function generateIndividualMessage(ctx: PlayerContext): Promise<string> {
  const prompt = `Player: ${ctx.name}
Team: ${ctx.team_name} (Rank #${ctx.team_rank} of ${ctx.total_teams})
League: ${ctx.league_name}
Current streak: ${ctx.current_streak} days
Total points: ${ctx.total_points}
Recent activities (last 7 days):
${ctx.recent_activities.length > 0
    ? ctx.recent_activities.map((a) => `- ${a.date}: ${a.activity} (RR: ${a.run_rate}, ${a.status})`).join('\n')
    : '- No activities logged recently'}

Generate a short motivational message for this player.`;

  return callAI(SYSTEM_INDIVIDUAL, prompt, ctx.league_id);
}

export async function generateTeamMessage(ctx: TeamContext): Promise<string> {
  const prompt = `Team: ${ctx.team_name}
League: ${ctx.league_name}
Rank: #${ctx.rank} of ${ctx.total_teams}
Total points: ${ctx.total_points}
Members: ${ctx.member_count} (${ctx.active_members} active in last 3 days)
Average Run Rate: ${ctx.avg_run_rate}
${ctx.inactive_members.length > 0 ? `Inactive members: ${ctx.inactive_members.join(', ')}` : 'All members active!'}

Generate a short team motivation message.`;

  return callAI(SYSTEM_TEAM, prompt, ctx.league_id);
}

export async function generateCaptainInsight(ctx: TeamContext): Promise<string> {
  const prompt = `Team: ${ctx.team_name}
Rank: #${ctx.rank} of ${ctx.total_teams}
Points: ${ctx.total_points}
Active: ${ctx.active_members}/${ctx.member_count}
Avg RR: ${ctx.avg_run_rate}
Inactive: ${ctx.inactive_members.length > 0 ? ctx.inactive_members.join(', ') : 'None'}

Provide actionable insights for the captain.`;

  return callAI(SYSTEM_CAPTAIN, prompt, ctx.league_id);
}

export async function generateChallengeMessage(ctx: ChallengeContext): Promise<string> {
  const prompt = `League: ${ctx.league_name}
Active challenges:
${ctx.challenges.map((c) => `- "${c.title}" (${c.type}) — ends ${c.end_date}: ${c.description}`).join('\n')}

Generate an exciting challenge reminder.`;

  return callAI(SYSTEM_CHALLENGE, prompt, ctx.league_id);
}

export async function generateBondingMessage(teamName: string): Promise<string> {
  return callAI(SYSTEM_BONDING, `Team: ${teamName}\n\nSuggest a fun team bonding activity for this week.`);
}

// ---------------------------------------------------------------------------
// Q&A Chat
// ---------------------------------------------------------------------------

export async function answerLeagueQuestion(
  question: string,
  leagueId: string,
  userId: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  const supabase = getSupabaseServiceRole();

  // Fetch league context
  const { data: league } = await supabase
    .from('leagues')
    .select('league_name, description, start_date, end_date, status')
    .eq('league_id', leagueId)
    .single();

  // Fetch activities available in this league
  const { data: leagueActivities } = await supabase
    .from('leagueactivities')
    .select('activities(activity_name, measurement_type)')
    .eq('league_id', leagueId)
    .limit(20);

  // Fetch user's team
  const { data: membership } = await supabase
    .from('leaguemembers')
    .select('team_id, teams(team_name)')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .single();

  const activityList = (leagueActivities || [])
    .map((la: any) => la.activities ? `${la.activities.activity_name} (${la.activities.measurement_type})` : null)
    .filter(Boolean);

  const leagueContext = `
League: ${league?.league_name || 'Unknown'}
Description: ${league?.description || 'N/A'}
Status: ${league?.status || 'N/A'}
Dates: ${league?.start_date || '?'} to ${league?.end_date || '?'}
User's team: ${(membership?.teams as any)?.team_name || 'Unknown'}
Available activities: ${activityList.length > 0 ? activityList.join(', ') : 'Standard activities'}`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_QA + '\n\n' + leagueContext },
    ...chatHistory.slice(-6), // Last 6 messages for context
    { role: 'user', content: question },
  ];

  const result = await aiChat({
    messages,
    feature: 'ai-coach',
    leagueId,
    userId,
    temperature: 0.5,
    maxTokens: 500,
  });
  return result.content || 'Sorry, I couldn\'t generate a response. Please try again.';
}

// ---------------------------------------------------------------------------
// Store messages in DB
// ---------------------------------------------------------------------------

export async function storeCoachMessage(
  leagueId: string,
  messageType: CoachMessageType,
  content: string,
  opts?: { teamId?: string; userId?: string; metadata?: Record<string, unknown> }
) {
  const supabase = getSupabaseServiceRole();
  const { error } = await supabase.from('ai_coach_messages').insert({
    league_id: leagueId,
    team_id: opts?.teamId || null,
    user_id: opts?.userId || null,
    message_type: messageType,
    content,
    metadata: opts?.metadata || {},
  });
  if (error) console.error('Failed to store AI coach message:', error);
}
