/**
 * Bonding Automations Service - Automated team bonding messages and captain guidance
 * Handles welcome messages, member announcements, and team identity reveals
 */
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { sendMessage } from '@/lib/services/messages';
import { getTeamMembers } from '@/lib/services/teams';
import { getLeagueById } from '@/lib/services/leagues';

// ============================================================================
// Types
// ============================================================================

export interface TeamIdentity {
  team_name: string;
  team_logo_url?: string;
  team_id: string;
  member_count: number;
  captain_name?: string;
}

export interface BondingMessageTemplate {
  welcome_new_member: string;
  team_announcement: string;
  team_identity_reveal: string;
  captain_guidance: string;
  captain_intro_prompt: string;
  first_day_motivation: string;
}

// ============================================================================
// Message Templates
// ============================================================================

const BONDING_TEMPLATES: BondingMessageTemplate = {
  welcome_new_member: `ðŸŽ‰ **Welcome to the team, {member_name}!**

We're excited to have you join us! Here's what you need to know:

â€¢ **Team Goal**: Work together to achieve our fitness targets
â€¢ **Support**: Your teammates are here to motivate and encourage you
â€¢ **Communication**: Use this chat to share progress, ask questions, and celebrate wins

Let's make this league amazing together! ðŸ’ª`,

  team_announcement: `ðŸ‘‹ **Team Update**

{member_name} has joined our squad! Let's give them a warm welcome.

Our team now has **{member_count} members** ready to crush this league together! ðŸ”¥`,

  team_identity_reveal: `ðŸ† **Meet Your Team: {team_name}**

Your team is officially formed and ready for action! Here's your squad:

{member_list}

**Captain**: {captain_name}

Time to bond, support each other, and show everyone what {team_name} can do! 

Good luck, team! ðŸš€`,

  captain_guidance: `ðŸ‘‘ **Captain Guidelines - Week 1 Focus**

As team captain, here are your key responsibilities to build team spirit:

**ðŸ¤ Team Bonding (Days 1-3)**
â€¢ Welcome each new member personally
â€¢ Share your fitness goals and encourage others to do the same
â€¢ Create a positive, supportive team culture

**ðŸ“‹ Organization (Days 4-7)**
â€¢ Help teammates understand league rules and scoring
â€¢ Validate workout submissions promptly
â€¢ Encourage consistent participation

**ðŸ’¬ Communication Tips**
â€¢ Check in with quiet team members
â€¢ Celebrate small wins and progress
â€¢ Address any concerns quickly and positively

Your leadership sets the tone for the entire team's experience! ðŸŒŸ`,

  captain_intro_prompt: `ðŸ‘‘ **Captain, It's Time to Lead!**

Hey Captain! Your team is counting on you to set the tone. Here's your first mission:

**Introduce yourself to your team!** Share:
â€¢ Your fitness background or goals
â€¢ What excites you about this league
â€¢ How you'll support the team

A strong start builds team energy and trust. Your teammates are waiting to hear from you! ðŸ’ª

Drop your intro message below ðŸ‘‡`,

  first_day_motivation: `ðŸŽ¯ **Day 1: Let's Do This!**

Welcome to the first day of the league! This is where champions are made.

**Today's Focus:**
â€¢ Log your first workout and set the momentum
â€¢ Connect with your teammates in the chat
â€¢ Review the league rules and scoring system

**Remember:** Every journey starts with a single step. Your team is here to support you, and together you'll achieve amazing things.

Let's make today count! ðŸ”¥ðŸ’ª`,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Send automated welcome message when a new member joins a team
 */
export async function sendWelcomeMessage(
  leagueId: string,
  teamId: string,
  newMemberUserId: string,
  newMemberName: string,
): Promise<boolean> {
  try {
    const message = BONDING_TEMPLATES.welcome_new_member.replace(
      '{member_name}',
      newMemberName,
    );

    // Get the league host to send the message
    const supabase = getSupabaseServiceRole();
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    if (!league?.created_by) {
      console.error('[Bonding] No league host found');
      return false;
    }

    const result = await sendMessage(leagueId, league.created_by, {
      content: message,
      teamId,
      messageType: 'announcement',
      visibility: 'all',
      isImportant: false,
    });

    console.log(
      `[Bonding] Welcome message sent for ${newMemberName} in team ${teamId}`,
    );
    return !!result;
  } catch (error) {
    console.error('[Bonding] Error sending welcome message:', error);
    return false;
  }
}

/**
 * Send team announcement when a new member is added
 */
export async function sendTeamAnnouncement(
  leagueId: string,
  teamId: string,
  newMemberName: string,
): Promise<boolean> {
  try {
    // Get current team member count
    const members = await getTeamMembers(teamId, leagueId);
    const memberCount = members.length;

    const message = BONDING_TEMPLATES.team_announcement
      .replace('{member_name}', newMemberName)
      .replace('{member_count}', memberCount.toString());

    // Get the league host to send the message
    const supabase = getSupabaseServiceRole();
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    if (!league?.created_by) {
      console.error('[Bonding] No league host found');
      return false;
    }

    const result = await sendMessage(leagueId, league.created_by, {
      content: message,
      teamId,
      messageType: 'announcement',
      visibility: 'all',
      isImportant: false,
    });

    console.log(
      `[Bonding] Team announcement sent for ${newMemberName} in team ${teamId}`,
    );
    return !!result;
  } catch (error) {
    console.error('[Bonding] Error sending team announcement:', error);
    return false;
  }
}

/**
 * Send team identity reveal message when league launches
 */
export async function sendTeamIdentityReveal(
  leagueId: string,
  teamId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRole();

    // Get team details
    const { data: team } = await supabase
      .from('teams')
      .select('team_name, team_logo_url')
      .eq('team_id', teamId)
      .single();

    if (!team) {
      console.error('[Bonding] Team not found:', teamId);
      return false;
    }

    // Get team members
    const members = await getTeamMembers(teamId, leagueId);
    const captain = members.find((m) => m.is_captain);

    // Build member list
    const memberList = members
      .map((m) => `â€¢ ${m.username}${m.is_captain ? ' (Captain)' : ''}`)
      .join('\n');

    const message = BONDING_TEMPLATES.team_identity_reveal
      .replaceAll('{team_name}', team.team_name)
      .replace('{member_list}', memberList)
      .replace('{captain_name}', captain?.username || 'TBD');

    // Get the league host to send the message
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    if (!league?.created_by) {
      console.error('[Bonding] No league host found');
      return false;
    }

    const result = await sendMessage(leagueId, league.created_by, {
      content: message,
      teamId,
      messageType: 'announcement',
      visibility: 'all',
      isImportant: true,
    });

    console.log(`[Bonding] Team identity reveal sent for ${team.team_name}`);
    return !!result;
  } catch (error) {
    console.error('[Bonding] Error sending team identity reveal:', error);
    return false;
  }
}

/**
 * Send captain guidance message to newly assigned captains
 */
export async function sendCaptainGuidance(
  leagueId: string,
  teamId: string,
  captainUserId: string,
): Promise<boolean> {
  try {
    const message = BONDING_TEMPLATES.captain_guidance;

    // Get the league host to send the message
    const supabase = getSupabaseServiceRole();
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    if (!league?.created_by) {
      console.error('[Bonding] No league host found');
      return false;
    }

    const result = await sendMessage(leagueId, league.created_by, {
      content: message,
      teamId,
      messageType: 'announcement',
      visibility: 'captains_only',
      isImportant: true,
    });

    console.log(
      `[Bonding] Captain guidance sent to ${captainUserId} in team ${teamId}`,
    );
    return !!result;
  } catch (error) {
    console.error('[Bonding] Error sending captain guidance:', error);
    return false;
  }
}

/**
 * Send team identity reveals for all teams when league launches
 */
export async function sendAllTeamIdentityReveals(
  leagueId: string,
): Promise<void> {
  try {
    const supabase = getSupabaseServiceRole();

    // Check if bonding automations are enabled
    const { data: league } = await supabase
      .from('leagues')
      .select('bonding_automations_enabled')
      .eq('league_id', leagueId)
      .single();

    if (!league?.bonding_automations_enabled) {
      console.log('[Bonding] Automations disabled for league:', leagueId);
      return;
    }

    // Get all teams in the league
    const { data: teams } = await supabase
      .from('teams')
      .select('team_id')
      .eq('league_id', leagueId);

    if (!teams || teams.length === 0) {
      console.log('[Bonding] No teams found for league:', leagueId);
      return;
    }

    // Send identity reveal for each team
    const promises = teams.map((team) =>
      sendTeamIdentityReveal(leagueId, team.team_id),
    );

    await Promise.all(promises);
    console.log(
      `[Bonding] Team identity reveals sent for ${teams.length} teams`,
    );
  } catch (error) {
    console.error('[Bonding] Error sending team identity reveals:', error);
  }
}

/**
 * Get captain guidelines content for in-app display
 */
export function getCaptainGuidelines(): string {
  return BONDING_TEMPLATES.captain_guidance;
}

/**
 * Send captain intro prompt to all captains when league launches
 */
export async function sendCaptainIntroPrompts(leagueId: string): Promise<void> {
  try {
    const supabase = getSupabaseServiceRole();

    // Check if bonding automations are enabled
    const { data: league } = await supabase
      .from('leagues')
      .select('bonding_automations_enabled, created_by')
      .eq('league_id', leagueId)
      .single();

    if (!league?.bonding_automations_enabled) {
      console.log('[Bonding] Automations disabled for league:', leagueId);
      return;
    }

    // Get all teams in the league
    const { data: teams } = await supabase
      .from('teams')
      .select('team_id')
      .eq('league_id', leagueId);

    if (!teams || teams.length === 0) {
      console.log('[Bonding] No teams found for league:', leagueId);
      return;
    }

    // Filter teams that have captains assigned
    const teamsWithCaptains = [];
    for (const team of teams) {
      const members = await getTeamMembers(team.team_id, leagueId);
      const hasCaptain = members.some((m) => m.is_captain);
      if (hasCaptain) {
        teamsWithCaptains.push(team.team_id);
      }
    }

    if (teamsWithCaptains.length === 0) {
      console.log(
        '[Bonding] No teams with captains found for league:',
        leagueId,
      );
      return;
    }

    const message = BONDING_TEMPLATES.captain_intro_prompt;

    // Send intro prompt only to teams with captains
    const promises = teamsWithCaptains.map((teamId) =>
      sendMessage(leagueId, league.created_by, {
        content: message,
        teamId: teamId,
        messageType: 'announcement',
        visibility: 'captains_only',
        isImportant: true,
      }),
    );

    await Promise.all(promises);
    console.log(
      `[Bonding] Captain intro prompts sent for ${teamsWithCaptains.length} teams with captains`,
    );
  } catch (error) {
    console.error('[Bonding] Error sending captain intro prompts:', error);
  }
}

/**
 * Optimized function to send both team reveals and captain prompts with consolidated queries
 */
export async function sendLaunchBondingMessages(
  leagueId: string,
): Promise<void> {
  try {
    const supabase = getSupabaseServiceRole();

    // Single query to get league settings and teams
    const [leagueResult, teamsResult] = await Promise.all([
      supabase
        .from('leagues')
        .select('bonding_automations_enabled, created_by')
        .eq('league_id', leagueId)
        .single(),
      supabase.from('teams').select('team_id').eq('league_id', leagueId),
    ]);

    const { data: league } = leagueResult;
    const { data: teams } = teamsResult;

    if (!league?.bonding_automations_enabled) {
      console.log('[Bonding] Automations disabled for league:', leagueId);
      return;
    }

    if (!teams || teams.length === 0) {
      console.log('[Bonding] No teams found for league:', leagueId);
      return;
    }

    // Get team members for all teams in parallel to check for captains
    const teamMembersPromises = teams.map((team) =>
      getTeamMembers(team.team_id, leagueId).then((members) => ({
        teamId: team.team_id,
        members,
        hasCaptain: members.some((m) => m.is_captain),
      })),
    );

    const teamMembersData = await Promise.all(teamMembersPromises);

    // Prepare messages
    const identityRevealPromises = teams.map((team) =>
      sendTeamIdentityReveal(leagueId, team.team_id),
    );

    const teamsWithCaptains = teamMembersData
      .filter((data) => data.hasCaptain)
      .map((data) => data.teamId);

    const captainIntroPromises = teamsWithCaptains.map((teamId) =>
      sendMessage(leagueId, league.created_by, {
        content: BONDING_TEMPLATES.captain_intro_prompt,
        teamId: teamId,
        messageType: 'announcement',
        visibility: 'captains_only',
        isImportant: true,
      }),
    );

    // Send all messages in parallel
    await Promise.all([...identityRevealPromises, ...captainIntroPromises]);

    console.log(
      `[Bonding] Launch messages sent: ${teams.length} team reveals, ${teamsWithCaptains.length} captain prompts`,
    );
  } catch (error) {
    console.error('[Bonding] Error sending launch bonding messages:', error);
  }
}

/**
 * Send first day motivation message to all teams
 */
export async function sendFirstDayMotivation(leagueId: string): Promise<void> {
  try {
    const supabase = getSupabaseServiceRole();

    // Check if bonding automations are enabled
    const { data: league } = await supabase
      .from('leagues')
      .select('bonding_automations_enabled, created_by')
      .eq('league_id', leagueId)
      .single();

    if (!league?.bonding_automations_enabled) {
      console.log('[Bonding] Automations disabled for league:', leagueId);
      return;
    }

    // Idempotency guard: Check if first-day messages already sent today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('message_id')
      .eq('league_id', leagueId)
      .eq('sender_id', league.created_by)
      .eq('message_type', 'announcement')
      .ilike('content', "%Day 1: Let's Do This!%")
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .limit(1);

    if (existingMessages && existingMessages.length > 0) {
      console.log(
        '[Bonding] First day motivation already sent today for league:',
        leagueId,
      );
      return;
    }

    // Get all teams in the league
    const { data: teams } = await supabase
      .from('teams')
      .select('team_id')
      .eq('league_id', leagueId);

    if (!teams || teams.length === 0) {
      console.log('[Bonding] No teams found for league:', leagueId);
      return;
    }

    const message = BONDING_TEMPLATES.first_day_motivation;

    // Send motivation message to each team
    const promises = teams.map((team) =>
      sendMessage(leagueId, league.created_by, {
        content: message,
        teamId: team.team_id,
        messageType: 'announcement',
        visibility: 'all',
        isImportant: true,
      }),
    );

    await Promise.all(promises);
    console.log(
      `[Bonding] First day motivation sent for ${teams.length} teams`,
    );
  } catch (error) {
    console.error('[Bonding] Error sending first day motivation:', error);
  }
}
