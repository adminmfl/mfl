// ============================================================================
// AI League Manager Service — V2.5
// Core service: health context builder, daily scan, draft generation, sending
// ============================================================================

import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { Mistral } from '@mistralai/mistralai';
import { evaluateDigest, evaluateInterventions } from '@/lib/ai/digest-evaluator';
import { sendMessage } from '@/lib/services/messages';
import {
  SYSTEM_NUDGE,
  SYSTEM_TEAM_NUDGE,
  SYSTEM_ANNOUNCEMENT,
  SYSTEM_INTERVENTION,
  SYSTEM_CHALLENGE_HYPE,
  SYSTEM_CHALLENGE_RESULTS,
  buildNudgePrompt,
  buildTeamNudgePrompt,
  buildInterventionPrompt,
} from '@/lib/ai/host-prompts';
import type {
  LeagueHealthContext,
  MemberSnapshot,
  TeamHealthSummary,
  ActiveChallengeInfo,
  DraftType,
  DraftTargetScope,
} from '@/lib/ai/types';

// ============================================================================
// Mistral Client
// ============================================================================

const MODEL = 'mistral-small-latest';

function getMistralClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY not configured');
  return new Mistral({ apiKey });
}

async function callMistral(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getMistralClient();
  const response = await client.chat.complete({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    maxTokens: 300,
  });
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('').trim();
  }
  return '';
}

// ============================================================================
// Build League Health Context
// ============================================================================

export async function buildLeagueHealthContext(leagueId: string): Promise<LeagueHealthContext> {
  const supabase = getSupabaseServiceRole();
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch league info
  const { data: league } = await supabase
    .from('leagues')
    .select('league_id, league_name, start_date, end_date')
    .eq('league_id', leagueId)
    .single();

  if (!league) throw new Error(`League ${leagueId} not found`);

  const startDate = new Date(league.start_date);
  const endDate = new Date(league.end_date);
  const now = new Date();
  const leagueDay = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / 86400000));
  const totalLeagueDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  const isFinalWeek = daysRemaining <= 7 && daysRemaining >= 0;
  const isLastDay = daysRemaining <= 1 && daysRemaining >= 0;

  // 2. Fetch teams (via teamleagues junction)
  const { data: teamLinks } = await supabase
    .from('teamleagues')
    .select('team_id')
    .eq('league_id', leagueId);

  const teamIds = (teamLinks || []).map((tl: any) => tl.team_id);
  const { data: teams } = teamIds.length > 0
    ? await supabase.from('teams').select('team_id, team_name').in('team_id', teamIds)
    : { data: [] as any[] };

  // 3. Fetch all members (no join — ambiguous FK on users)
  const { data: members } = await supabase
    .from('leaguemembers')
    .select('league_member_id, user_id, team_id')
    .eq('league_id', leagueId);

  // Fetch usernames separately
  const memberUserIds = (members || []).map(m => m.user_id);
  const { data: usersData } = memberUserIds.length > 0
    ? await supabase.from('users').select('user_id, username').in('user_id', memberUserIds)
    : { data: [] as any[] };
  const usernameMap: Record<string, string> = {};
  for (const u of usersData || []) {
    usernameMap[u.user_id] = u.username;
  }

  // Fetch league rest_days_allowed from league settings
  const { data: leagueSettings } = await supabase
    .from('leagues')
    .select('rest_days')
    .eq('league_id', leagueId)
    .single();
  const restDaysAllowed = leagueSettings?.rest_days || 0;

  // Build league_member_id → user_id map
  const lmToUser: Record<string, string> = {};
  const userToLm: Record<string, string> = {};
  for (const m of members || []) {
    lmToUser[m.league_member_id] = m.user_id;
    userToLm[m.user_id] = m.league_member_id;
  }
  const allLmIds = (members || []).map(m => m.league_member_id);

  // 4. Fetch today's effort entries (effortentry uses league_member_id, not league_id)
  const { data: todayEntries } = allLmIds.length > 0
    ? await supabase
        .from('effortentry')
        .select('league_member_id, type')
        .in('league_member_id', allLmIds)
        .eq('date', today)
    : { data: [] as any[] };

  const todayLoggedLmIds = new Set(
    (todayEntries || []).filter(e => e.type !== 'rest').map(e => e.league_member_id)
  );
  const todayLoggedUserIds = new Set(
    [...todayLoggedLmIds].map(lmId => lmToUser[lmId]).filter(Boolean)
  );

  // 5. Fetch recent effort entries for streak/inactive calc (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const { data: recentEntries } = allLmIds.length > 0
    ? await supabase
        .from('effortentry')
        .select('league_member_id, date, type')
        .in('league_member_id', allLmIds)
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .lte('date', today)
    : { data: [] as any[] };

  // Also fetch ALL effort entries (not just last 14 days) for rest days + points
  const { data: allEntries } = allLmIds.length > 0
    ? await supabase
        .from('effortentry')
        .select('league_member_id, date, type, rr_value, status')
        .in('league_member_id', allLmIds)
    : { data: [] as any[] };

  // Compute rest_days_used and total_points per user
  const restDaysUsedMap: Record<string, number> = {};
  const totalPointsMap: Record<string, number> = {};
  for (const entry of allEntries || []) {
    const userId = lmToUser[entry.league_member_id];
    if (!userId) continue;
    if (entry.type === 'rest') {
      restDaysUsedMap[userId] = (restDaysUsedMap[userId] || 0) + 1;
    }
    if (entry.type !== 'rest' && entry.status === 'approved') {
      totalPointsMap[userId] = (totalPointsMap[userId] || 0) + (Number(entry.rr_value) || 0);
    }
  }

  // Build per-user date sets (last 14 days only)
  const userWorkoutDates: Record<string, Set<string>> = {};
  for (const entry of recentEntries || []) {
    if (entry.type !== 'rest') {
      const userId = lmToUser[entry.league_member_id];
      if (!userId) continue;
      if (!userWorkoutDates[userId]) userWorkoutDates[userId] = new Set();
      userWorkoutDates[userId].add(entry.date);
    }
  }

  // 6. Fetch active challenges
  const { data: challenges } = await supabase
    .from('leagueschallenges')
    .select('id, name, challenge_type, end_date')
    .eq('league_id', leagueId)
    .eq('status', 'active');

  // Challenge submission counts
  const activeChallenges: ActiveChallengeInfo[] = [];
  for (const ch of challenges || []) {
    if (!ch.end_date) continue;
    const { count } = await supabase
      .from('challenge_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_challenge_id', ch.id);
    const chEnd = new Date(ch.end_date);
    activeChallenges.push({
      challengeId: ch.id,
      name: ch.name,
      type: ch.challenge_type || 'general',
      daysRemaining: Math.ceil((chEnd.getTime() - now.getTime()) / 86400000),
      submissionCount: count || 0,
      totalMembers: (members || []).length,
    });
  }

  // 7. Build member snapshots
  const allMembers: MemberSnapshot[] = [];
  const teamMemberMap: Record<string, MemberSnapshot[]> = {};

  for (const m of members || []) {
    const userId = m.user_id;
    const workoutDates = userWorkoutDates[userId] || new Set<string>();
    const hasLoggedToday = todayLoggedUserIds.has(userId);

    // Calculate consecutive days inactive (from today going back)
    let consecutiveDaysInactive = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (ds < league.start_date) break;
      if (workoutDates.has(ds)) break;
      consecutiveDaysInactive++;
    }

    // Calculate consecutive days active (from today going back)
    let consecutiveDaysActive = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (!workoutDates.has(ds)) break;
      consecutiveDaysActive++;
    }

    // Streak broken = was active yesterday's previous day but not yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const streakBroken =
      !workoutDates.has(yesterday.toISOString().split('T')[0]) &&
      workoutDates.has(twoDaysAgo.toISOString().split('T')[0]);

    // Last activity date
    let lastActivityDate: string | null = null;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (workoutDates.has(ds)) {
        lastActivityDate = ds;
        break;
      }
    }

    // Missed days (total within league period up to today)
    const userRestDays = restDaysUsedMap[userId] || 0;
    const userPoints = totalPointsMap[userId] || 0;
    const missedDays = Math.max(0, leagueDay - workoutDates.size - userRestDays);

    const username = usernameMap[userId] || 'Unknown';
    const teamId = m.team_id || null;

    const snapshot: MemberSnapshot = {
      userId,
      username,
      teamId,
      teamName: null, // filled below
      totalPoints: userPoints,
      avgRR: null,
      missedDays,
      restDaysUsed: userRestDays,
      restDaysAllowed: restDaysAllowed,
      consecutiveDaysActive,
      consecutiveDaysInactive,
      hasLoggedToday,
      lastActivityDate,
      streakBroken,
      rrTrend: null,
    };

    allMembers.push(snapshot);
    if (teamId) {
      if (!teamMemberMap[teamId]) teamMemberMap[teamId] = [];
      teamMemberMap[teamId].push(snapshot);
    }
  }

  // 8. Build team health summaries
  const teamHealthList: TeamHealthSummary[] = [];

  // Calculate team total points from member points
  const teamPointsMap: Record<string, number> = {};
  for (const t of teams || []) {
    const tMembers = teamMemberMap[t.team_id] || [];
    teamPointsMap[t.team_id] = tMembers.reduce((sum, m) => sum + m.totalPoints, 0);
  }

  const sortedTeams = [...(teams || [])].sort((a, b) => (teamPointsMap[b.team_id] || 0) - (teamPointsMap[a.team_id] || 0));

  for (let i = 0; i < sortedTeams.length; i++) {
    const t = sortedTeams[i];
    const tMembers = teamMemberMap[t.team_id] || [];
    const membersLoggedToday = tMembers.filter(m => m.hasLoggedToday).length;
    const inactiveMembers = tMembers.filter(m => m.consecutiveDaysInactive >= 3).map(m => m.userId);
    const atRiskMembers = tMembers.filter(m => m.consecutiveDaysInactive >= 5).map(m => m.userId);

    // Fill team name in member snapshots
    for (const ms of tMembers) {
      ms.teamName = t.team_name;
    }

    teamHealthList.push({
      teamId: t.team_id,
      teamName: t.team_name,
      rank: i + 1,
      totalPoints: teamPointsMap[t.team_id] || 0,
      avgRR: null,
      memberCount: tMembers.length,
      membersLoggedToday,
      todayParticipationPct: tMembers.length > 0 ? (membersLoggedToday / tMembers.length) * 100 : 0,
      inactiveMembers,
      atRiskMembers,
    });
  }

  // Overall participation
  const totalMembers = allMembers.length;
  const totalLogged = allMembers.filter(m => m.hasLoggedToday).length;
  const overallParticipationPct = totalMembers > 0 ? (totalLogged / totalMembers) * 100 : 0;

  return {
    leagueId,
    leagueName: league.league_name,
    leagueDay,
    totalLeagueDays,
    isFinalWeek,
    isLastDay,
    teams: teamHealthList,
    allMembers,
    overallParticipationPct,
    activeChallenges,
  };
}

// ============================================================================
// Run Daily Scan — evaluates digest + interventions, inserts to DB
// ============================================================================

export async function runDailyScan(leagueId: string) {
  const supabase = getSupabaseServiceRole();
  const today = new Date().toISOString().split('T')[0];

  // Build context
  const ctx = await buildLeagueHealthContext(leagueId);

  // Evaluate digest rules
  const digestCandidates = evaluateDigest(ctx);

  // Evaluate intervention rules
  const interventionCandidates = evaluateInterventions(ctx);

  // Get host user id (league creator)
  const { data: leagueCreator } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('league_id', leagueId)
    .single();
  const hostUserId = leagueCreator?.created_by || '';

  // Insert digest items
  for (const d of digestCandidates) {
    await supabase.from('ai_host_digest').insert({
      league_id: leagueId,
      host_user_id: hostUserId,
      digest_date: today,
      category: d.category,
      title: d.title,
      body: d.body,
      priority: d.priority,
      metadata: d.metadata,
      action_type: d.actionType || null,
      action_payload: d.actionPayload || null,
      is_read: false,
    });
  }

  // Insert interventions
  for (const i of interventionCandidates) {
    // Check if intervention already exists for this member today
    const { data: existing } = await supabase
      .from('ai_interventions')
      .select('id')
      .eq('league_id', leagueId)
      .eq('member_user_id', i.memberUserId)
      .eq('trigger_type', i.triggerType)
      .gte('created_at', today)
      .maybeSingle();

    if (existing) continue; // skip duplicate

    await supabase.from('ai_interventions').insert({
      league_id: leagueId,
      member_user_id: i.memberUserId,
      team_id: i.teamId,
      trigger_type: i.triggerType,
      severity: i.severity,
      title: i.title,
      description: i.description,
      suggested_action: i.suggestedAction,
      player_context: i.playerContext,
      status: 'pending',
    });
  }

  return {
    digestCount: digestCandidates.length,
    interventionCount: interventionCandidates.length,
  };
}

// ============================================================================
// Generate Draft — calls Mistral to produce a message draft
// ============================================================================

export async function generateDraft(params: {
  leagueId: string;
  hostUserId: string;
  type: DraftType;
  targetScope: DraftTargetScope;
  targetId?: string; // userId or teamId
  contextData?: Record<string, any>;
}): Promise<{ draftId: string; content: string }> {
  const { leagueId, hostUserId, type, targetScope, targetId, contextData } = params;
  const supabase = getSupabaseServiceRole();

  // Pick system prompt
  const systemPromptMap: Record<DraftType, string> = {
    nudge: SYSTEM_NUDGE,
    team_nudge: SYSTEM_TEAM_NUDGE,
    announcement: SYSTEM_ANNOUNCEMENT,
    intervention: SYSTEM_INTERVENTION,
    challenge_hype: SYSTEM_CHALLENGE_HYPE,
    challenge_results: SYSTEM_CHALLENGE_RESULTS,
  };
  const systemPrompt = systemPromptMap[type] || SYSTEM_ANNOUNCEMENT;

  // Build user prompt from context
  let userPrompt = '';
  if (type === 'nudge' && contextData) {
    userPrompt = buildNudgePrompt(contextData as any);
  } else if (type === 'team_nudge' && contextData) {
    userPrompt = buildTeamNudgePrompt(contextData as any);
  } else if (type === 'intervention' && contextData) {
    userPrompt = buildInterventionPrompt(contextData as any);
  } else {
    // Generic prompt from context data
    userPrompt = Object.entries(contextData || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n') + '\n\nGenerate an appropriate message.';
  }

  // Call Mistral
  const content = await callMistral(systemPrompt, userPrompt);

  // Save draft to DB
  const { data: draft, error } = await supabase
    .from('ai_message_drafts')
    .insert({
      league_id: leagueId,
      created_by: hostUserId,
      draft_type: type,
      target_scope: targetScope,
      content,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !draft) throw new Error('Failed to save draft: ' + (error?.message || 'unknown'));

  return { draftId: draft.id, content };
}

// ============================================================================
// Send Draft — converts a draft into a real message in the messaging system
// ============================================================================

export async function sendDraft(draftId: string, senderId: string): Promise<void> {
  const supabase = getSupabaseServiceRole();

  // Fetch draft
  const { data: draft, error } = await supabase
    .from('ai_message_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (error || !draft) throw new Error('Draft not found');
  if (draft.status === 'sent') throw new Error('Draft already sent');
  if (draft.status === 'dismissed') throw new Error('Draft was dismissed');

  // Determine target team (null = league-wide broadcast)
  let teamId: string | null = null;
  if (draft.target_scope === 'team') {
    // No target_id column — would need to be stored elsewhere or derived
    teamId = null;
  }

  // Use the existing sendMessage service (handles permissions, inserts to messages table)
  const messageType = draft.target_scope === 'league' ? 'announcement' : 'chat';
  const result = await sendMessage(draft.league_id, senderId, {
    content: draft.content,
    teamId: teamId || undefined,
    messageType,
    visibility: 'all',
  });

  if (!result) throw new Error('Failed to send message');

  // Mark draft as sent
  await supabase
    .from('ai_message_drafts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', draftId);
}

// ============================================================================
// Deploy Challenge from Template
// ============================================================================

export async function deployChallengeFromTemplate(params: {
  leagueId: string;
  hostUserId: string;
  templateId: string;
  startDate: string;
  customName?: string;
}): Promise<{ challengeId: string; commCount: number }> {
  const { leagueId, hostUserId, templateId, startDate, customName } = params;
  const supabase = getSupabaseServiceRole();

  // Fetch template
  const { data: template, error } = await supabase
    .from('challenge_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error || !template) throw new Error('Template not found');

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (template.duration_days || 7));

  // Create challenge
  const { data: challenge, error: chErr } = await supabase
    .from('leagueschallenges')
    .insert({
      league_id: leagueId,
      name: customName || template.title,
      description: template.description,
      challenge_type: template.challenge_type,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    })
    .select('id')
    .single();

  if (chErr || !challenge) throw new Error('Failed to create challenge: ' + (chErr?.message || 'unknown'));

  // Create comm schedule entries
  const commSchedule = template.definition?.comm_schedule || [];
  for (const item of commSchedule) {
    const scheduledDate = new Date(startDate);
    scheduledDate.setDate(scheduledDate.getDate() + (item.day_offset || 0));

    await supabase.from('challenge_comm_schedule').insert({
      league_id: leagueId,
      template_id: templateId,
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      draft_type: item.type,
      status: 'pending',
    });
  }

  return { challengeId: challenge.id, commCount: commSchedule.length };
}

// ============================================================================
// Process Scheduled Comms — generates drafts for today's scheduled items
// ============================================================================

export async function processScheduledComms(leagueId: string, hostUserId: string): Promise<number> {
  const supabase = getSupabaseServiceRole();
  const today = new Date().toISOString().split('T')[0];

  const { data: scheduled } = await supabase
    .from('challenge_comm_schedule')
    .select('*')
    .eq('league_id', leagueId)
    .eq('scheduled_date', today)
    .eq('status', 'pending');

  let generated = 0;
  for (const item of scheduled || []) {
    await generateDraft({
      leagueId,
      hostUserId,
      type: item.draft_type as DraftType,
      targetScope: 'league',
      contextData: {
        leagueId,
      },
    });

    await supabase
      .from('challenge_comm_schedule')
      .update({ status: 'generated' })
      .eq('id', item.id);

    generated++;
  }

  return generated;
}

// ============================================================================
// Create Draft from Intervention
// ============================================================================

export async function createDraftFromIntervention(
  interventionId: string,
  hostUserId: string
): Promise<{ draftId: string; content: string }> {
  const supabase = getSupabaseServiceRole();

  const { data: intervention, error } = await supabase
    .from('ai_interventions')
    .select('*')
    .eq('id', interventionId)
    .single();

  if (error || !intervention) throw new Error('Intervention not found');

  // Fetch league name
  const { data: league } = await supabase
    .from('leagues')
    .select('league_name')
    .eq('league_id', intervention.league_id)
    .single();

  // Fetch player name
  const { data: playerUser } = await supabase
    .from('users')
    .select('username')
    .eq('user_id', intervention.member_user_id)
    .single();

  const playerName = playerUser?.username || 'Player';
  const playerContext = intervention.player_context || {};

  const result = await generateDraft({
    leagueId: intervention.league_id,
    hostUserId,
    type: 'intervention',
    targetScope: 'individual',
    targetId: intervention.member_user_id,
    contextData: {
      playerName,
      triggerType: intervention.trigger_type,
      daysInactive: playerContext.consecutiveDaysInactive || playerContext.missedDays || 0,
      restDaysUsed: playerContext.restDaysUsed || 0,
      restDaysAllowed: playerContext.restDaysAllowed || 0,
      totalPoints: playerContext.totalPoints || 0,
      leagueName: league?.league_name || 'League',
      teamName: null,
    },
  });

  // Mark intervention as acted on
  await supabase
    .from('ai_interventions')
    .update({ status: 'acted' })
    .eq('id', interventionId);

  return result;
}
