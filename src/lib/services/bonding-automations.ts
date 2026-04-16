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
}

// ============================================================================
// Message Templates
// ============================================================================

const BONDING_TEMPLATES: BondingMessageTemplate = {
    welcome_new_member: `🎉 **Welcome to the team, {member_name}!**

We're excited to have you join us! Here's what you need to know:

• **Team Goal**: Work together to achieve our fitness targets
• **Support**: Your teammates are here to motivate and encourage you
• **Communication**: Use this chat to share progress, ask questions, and celebrate wins

Let's make this league amazing together! 💪`,

    team_announcement: `👋 **Team Update**

{member_name} has joined our squad! Let's give them a warm welcome.

Our team now has **{member_count} members** ready to crush this league together! 🔥`,

    team_identity_reveal: `🏆 **Meet Your Team: {team_name}**

Your team is officially formed and ready for action! Here's your squad:

{member_list}

**Captain**: {captain_name}

Time to bond, support each other, and show everyone what {team_name} can do! 

Good luck, team! 🚀`,

    captain_guidance: `👑 **Captain Guidelines - Week 1 Focus**

As team captain, here are your key responsibilities to build team spirit:

**🤝 Team Bonding (Days 1-3)**
• Welcome each new member personally
• Share your fitness goals and encourage others to do the same
• Create a positive, supportive team culture

**📋 Organization (Days 4-7)**
• Help teammates understand league rules and scoring
• Validate workout submissions promptly
• Encourage consistent participation

**💬 Communication Tips**
• Check in with quiet team members
• Celebrate small wins and progress
• Address any concerns quickly and positively

Your leadership sets the tone for the entire team's experience! 🌟`
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
    newMemberName: string
): Promise<boolean> {
    try {
        const message = BONDING_TEMPLATES.welcome_new_member
            .replace('{member_name}', newMemberName);

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

        console.log(`[Bonding] Welcome message sent for ${newMemberName} in team ${teamId}`);
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
    newMemberName: string
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

        console.log(`[Bonding] Team announcement sent for ${newMemberName} in team ${teamId}`);
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
    teamId: string
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
        const captain = members.find(m => m.is_captain);

        // Build member list
        const memberList = members
            .map(m => `• ${m.username}${m.is_captain ? ' (Captain)' : ''}`)
            .join('\n');

        const message = BONDING_TEMPLATES.team_identity_reveal
            .replace('{team_name}', team.team_name)
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
    captainUserId: string
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

        console.log(`[Bonding] Captain guidance sent to ${captainUserId} in team ${teamId}`);
        return !!result;
    } catch (error) {
        console.error('[Bonding] Error sending captain guidance:', error);
        return false;
    }
}

/**
 * Send team identity reveals for all teams when league launches
 */
export async function sendAllTeamIdentityReveals(leagueId: string): Promise<void> {
    try {
        const supabase = getSupabaseServiceRole();

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
        const promises = teams.map(team =>
            sendTeamIdentityReveal(leagueId, team.team_id)
        );

        await Promise.all(promises);
        console.log(`[Bonding] Team identity reveals sent for ${teams.length} teams`);
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