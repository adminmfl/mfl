/**
 * Messages Service - Team messaging and communication operations
 * Handles message CRUD, read receipts, canned messages, and role-based visibility
 */
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type MessageType = 'chat' | 'announcement' | 'system';
export type MessageVisibility = 'all' | 'captains_only';
export type CannedMessageRoleTarget = 'host' | 'governor' | 'captain';

export interface Message {
  message_id: string;
  league_id: string;
  team_id: string | null;
  sender_id: string;
  content: string;
  message_type: MessageType;
  visibility: MessageVisibility;
  is_important: boolean;
  parent_message_id: string | null;
  deep_link: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface MessageReaction {
  emoji: string;
  user_ids: string[];
}

export interface ParentMessagePreview {
  content: string;
  sender_username: string;
}

export interface MessageWithSender extends Message {
  sender_name: string | null;
  sender_username: string;
  sender_role: string | null;
  is_read: boolean;
  reactions: MessageReaction[];
  parent_message: ParentMessagePreview | null;
}

export interface ReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  username?: string;
}

export interface CannedMessage {
  canned_message_id: string;
  league_id: string | null;
  role_target: CannedMessageRoleTarget;
  title: string;
  content: string;
  is_system: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type MessageFilter =
  | 'all'
  | 'announcements'
  | 'important'
  | 'host_messages'
  | 'captains_only';

export interface GetMessagesOptions {
  cursor?: string; // created_at timestamp for pagination
  limit?: number;
  teamId?: string;
  filter?: MessageFilter;
  adminView?: boolean; // host/governor opt-in to see all team messages
}

export interface SendMessageData {
  content: string;
  teamId?: string;
  messageType?: MessageType;
  visibility?: MessageVisibility;
  isImportant?: boolean;
  parentMessageId?: string;
  deepLink?: string;
}

export interface CannedMessageData {
  roleTarget: CannedMessageRoleTarget;
  title: string;
  content: string;
  isSystem?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the user's highest role in a league
 * Hierarchy: host > governor > captain > player
 */
export async function getUserRoleInLeague(
  userId: string,
  leagueId: string,
): Promise<string | null> {
  try {
    const supabase = getSupabaseServiceRole();

    // Check if user is the league creator (host)
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    if (league?.created_by === userId) return 'host';

    // Check assigned roles
    const { data, error } = await supabase
      .from('assignedrolesforleague')
      .select('roles(role_name)')
      .eq('user_id', userId)
      .eq('league_id', leagueId);

    if (error || !data || data.length === 0) return null;

    const roleNames = (data as any[])
      .map((row) => row.roles?.role_name)
      .filter(Boolean) as string[];

    if (roleNames.includes('host')) return 'host';
    if (roleNames.includes('governor')) return 'governor';
    if (roleNames.includes('captain')) return 'captain';
    if (roleNames.includes('player')) return 'player';
    return roleNames[0] || null;
  } catch (err) {
    console.error('Error fetching user role in league:', err);
    return null;
  }
}

/**
 * Get user's team_id in a league
 */
export async function getUserTeamInLeague(
  userId: string,
  leagueId: string,
): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseServiceRole()
      .from('leaguemembers')
      .select('team_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (error || !data) return null;
    return data.team_id || null;
  } catch (err) {
    console.error('Error fetching user team in league:', err);
    return null;
  }
}

/**
 * Get the count of intended recipients for a message (excluding the sender).
 * Used to determine if ALL recipients have read (for double blue tick).
 */
async function getIntendedAudienceCount(
  supabase: ReturnType<typeof getSupabaseServiceRole>,
  leagueId: string,
  teamId: string | null,
  visibility: string,
  senderId: string,
): Promise<number> {
  try {
    if (teamId && visibility === 'all') {
      // Team message visible to all: count team members excluding sender
      const { count } = await supabase
        .from('leaguemembers')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('team_id', teamId)
        .neq('user_id', senderId);
      return count || 0;
    }

    if (teamId && visibility === 'captains_only') {
      // Team DM to captain: captains of that team + host + governors (excluding sender)
      const { data: roles } = await supabase
        .from('assignedrolesforleague')
        .select('user_id, roles(role_name)')
        .eq('league_id', leagueId)
        .neq('user_id', senderId);

      if (!roles) return 0;
      // Count host, governor, and captains who are on that team
      let count = 0;
      for (const r of roles as any[]) {
        const roleName = r.roles?.role_name;
        if (roleName === 'host' || roleName === 'governor') {
          count++;
        } else if (roleName === 'captain') {
          // Check if this captain is on the target team
          const { data: membership } = await supabase
            .from('leaguemembers')
            .select('team_id')
            .eq('user_id', r.user_id)
            .eq('league_id', leagueId)
            .maybeSingle();
          if (membership?.team_id === teamId) count++;
        }
      }
      return count;
    }

    if (!teamId && visibility === 'all') {
      // Broadcast to all: count all league members excluding sender
      const { count } = await supabase
        .from('leaguemembers')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .neq('user_id', senderId);
      return count || 0;
    }

    if (!teamId && visibility === 'captains_only') {
      // Broadcast to captains only: count captains + host + governors excluding sender
      const { data: roles } = await supabase
        .from('assignedrolesforleague')
        .select('user_id, roles(role_name)')
        .eq('league_id', leagueId)
        .neq('user_id', senderId);

      if (!roles) return 0;
      return (roles as any[]).filter((r) => {
        const rn = r.roles?.role_name;
        return rn === 'host' || rn === 'governor' || rn === 'captain';
      }).length;
    }

    return 0;
  } catch {
    return 0;
  }
}

// ============================================================================
// Message CRUD Operations
// ============================================================================

/**
 * Get messages visible to a user based on their role and team
 * - Players see: team messages with visibility='all' + league-wide broadcasts (team_id IS NULL)
 * - Captains see: all visibility levels in their team + league-wide broadcasts
 * - Host/Governor see: all messages in the league
 * Paginated by cursor (created_at), ordered newest first
 */
export async function getMessagesForUser(
  leagueId: string,
  userId: string,
  options: GetMessagesOptions = {},
): Promise<MessageWithSender[]> {
  try {
    const supabase = getSupabaseServiceRole();
    const { cursor, limit = 50, teamId, filter, adminView } = options;

    // 1. Initial parallel metadata fetches
    const [role, userTeamId] = await Promise.all([
      getUserRoleInLeague(userId, leagueId),
      getUserTeamInLeague(userId, leagueId),
    ]);

    if (!role) return [];

    const effectiveTeamId = teamId || userTeamId;
    const isHostOrGovernor = role === 'host' || role === 'governor';
    const isCaptain = role === 'captain';

    // 2. Build and execute primary messages query
    let query = supabase
      .from('messages')
      .select('*, users:sender_id(username)')
      .eq('league_id', leagueId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) query = query.lt('created_at', cursor);

    // Apply filters (type/importance)
    if (filter === 'announcements') {
      query = query.eq('message_type', 'announcement');
    } else if (filter === 'important') {
      query = query.eq('is_important', true);
    } else if (filter === 'host_messages') {
      const { data: leaders } = await supabase
        .from('leaguemembers')
        .select('user_id')
        .eq('league_id', leagueId)
        .in('role', ['host', 'governor']);
      const leaderIds = (leaders || []).map((l: any) => l.user_id);
      if (leaderIds.length > 0) query = query.in('sender_id', leaderIds);
    } else if (filter === 'captains_only') {
      query = query.eq('visibility', 'captains_only');
    }

    // Apply visibility logic
    if (isHostOrGovernor) {
      if (teamId) {
        query = adminView
          ? query.or(`team_id.eq.${teamId},team_id.is.null`)
          : query.or(
              `team_id.is.null,and(team_id.eq.${teamId},visibility.eq.captains_only)`,
            );
      } else {
        query = query.is('team_id', null);
      }
    } else if (isCaptain) {
      if (effectiveTeamId)
        query = query.or(`team_id.eq.${effectiveTeamId},team_id.is.null`);
      else query = query.is('team_id', null);
    } else {
      if (effectiveTeamId) {
        query = query.or(
          `and(team_id.eq.${effectiveTeamId},visibility.eq.all),and(team_id.eq.${effectiveTeamId},visibility.eq.captains_only,sender_id.eq.${userId}),and(team_id.is.null,visibility.eq.all)`,
        );
      } else {
        query = query.is('team_id', null).eq('visibility', 'all');
      }
    }

    const { data: messages, error } = await query;
    if (error || !messages) return [];

    // 3. Parallel enrichment data fetches
    const messageIds = messages.map((m: any) => m.message_id);
    const senderIds = [...new Set(messages.map((m: any) => m.sender_id))];
    const parentIds = [
      ...new Set(
        messages
          .filter((m: any) => m.parent_message_id)
          .map((m: any) => m.parent_message_id),
      ),
    ];

    const [rolesRes, receiptsRes, reactionsRes, parentsRes, leagueRes] =
      await Promise.all([
        // Sender roles
        senderIds.length > 0
          ? supabase
              .from('assignedrolesforleague')
              .select('user_id, roles(role_name)')
              .eq('league_id', leagueId)
              .in('user_id', senderIds)
          : Promise.resolve({ data: [] }),
        // Read receipts
        messageIds.length > 0
          ? supabase
              .from('message_read_receipts')
              .select('message_id, user_id')
              .in('message_id', messageIds)
          : Promise.resolve({ data: [] }),
        // Reactions
        messageIds.length > 0
          ? supabase
              .from('message_reactions')
              .select('message_id, emoji, user_id')
              .in('message_id', messageIds)
          : Promise.resolve({ data: [] }),
        // Parent messages
        parentIds.length > 0
          ? supabase
              .from('messages')
              .select(
                'message_id, content, sender_id, users:sender_id(username)',
              )
              .in('message_id', parentIds)
          : Promise.resolve({ data: [] }),
        // League creator (for host role check)
        supabase
          .from('leagues')
          .select('created_by')
          .eq('league_id', leagueId)
          .single(),
      ]);

    // Map sender roles
    const senderRoles = new Map<string, string | null>();
    if (rolesRes.data) {
      const rolesByUser = new Map<string, string[]>();
      (rolesRes.data as any[]).forEach((row) => {
        if (row.roles?.role_name) {
          const list = rolesByUser.get(row.user_id) || [];
          list.push(row.roles.role_name);
          rolesByUser.set(row.user_id, list);
        }
      });
      rolesByUser.forEach((roles, uid) => {
        if (roles.includes('host')) senderRoles.set(uid, 'host');
        else if (roles.includes('governor')) senderRoles.set(uid, 'governor');
        else if (roles.includes('captain')) senderRoles.set(uid, 'captain');
        else if (roles.includes('player')) senderRoles.set(uid, 'player');
        else senderRoles.set(uid, roles[0] || null);
      });
    }
    if (leagueRes.data?.created_by)
      senderRoles.set(leagueRes.data.created_by, 'host');

    // Map read status
    const readSet = new Set<string>();
    const readCountByMsg = new Map<string, number>();
    (receiptsRes.data || []).forEach((r: any) => {
      const msg = messages.find((m: any) => m.message_id === r.message_id);
      if (!msg) return;
      if (msg.sender_id === userId && r.user_id !== userId) {
        readCountByMsg.set(
          r.message_id,
          (readCountByMsg.get(r.message_id) || 0) + 1,
        );
      }
      if (msg.sender_id !== userId && r.user_id === userId)
        readSet.add(r.message_id);
    });

    // Handle own messages read status (Double Tick)
    const ownMessages = messages.filter((m: any) => m.sender_id === userId);
    if (ownMessages.length > 0) {
      // BATCH Audience Count: Fetch all relevant team sizes in one go
      const relevantTeamIds = [
        ...new Set(ownMessages.map((m) => m.team_id).filter(Boolean)),
      ] as string[];

      const [teamCountsRes, totalLeagueCountRes, roleCountsRes] =
        await Promise.all([
          relevantTeamIds.length > 0
            ? supabase
                .from('leaguemembers')
                .select('team_id', { count: 'exact', head: false })
                .eq('league_id', leagueId)
                .in('team_id', relevantTeamIds)
            : Promise.resolve({ data: [], count: 0 }),
          supabase
            .from('leaguemembers')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', leagueId),
          supabase
            .from('assignedrolesforleague')
            .select('user_id, roles(role_name)')
            .eq('league_id', leagueId),
        ]);

      const teamSizeMap = new Map<string, number>();
      if (teamCountsRes.data) {
        teamCountsRes.data.forEach((row: any) => {
          teamSizeMap.set(row.team_id, (teamSizeMap.get(row.team_id) || 0) + 1);
        });
      }

      const totalLeagueMembers = totalLeagueCountRes.count || 0;
      const captainAudience = (roleCountsRes.data || [])
        .filter((r: any) => {
          const rn = r.roles?.role_name;
          return rn === 'host' || rn === 'governor' || rn === 'captain';
        })
        .map((r) => r.user_id);

      // Now determine is_read in-memory without extra DB calls
      for (const msg of ownMessages) {
        let audienceSize = 0;
        if (msg.team_id && msg.visibility === 'all') {
          audienceSize = (teamSizeMap.get(msg.team_id) || 1) - 1;
        } else if (!msg.team_id && msg.visibility === 'all') {
          audienceSize = totalLeagueMembers - 1;
        } else if (msg.visibility === 'captains_only') {
          // Simplification: use the captainAudience list (unique IDs)
          audienceSize = new Set(captainAudience.filter((id) => id !== userId))
            .size;
        }

        const readCount = readCountByMsg.get(msg.message_id) || 0;
        if (audienceSize > 0 && readCount >= audienceSize)
          readSet.add(msg.message_id);
      }
    }

    // Map Reactions
    const reactionsMap = new Map<
      string,
      { emoji: string; user_ids: string[] }[]
    >();
    (reactionsRes.data || []).forEach((r: any) => {
      const existing = reactionsMap.get(r.message_id) || [];
      const entry = existing.find((e) => e.emoji === r.emoji);
      if (entry) entry.user_ids.push(r.user_id);
      else existing.push({ emoji: r.emoji, user_ids: [r.user_id] });
      reactionsMap.set(r.message_id, existing);
    });

    // Map Parents
    const parentMap = new Map<
      string,
      { content: string; sender_username: string }
    >();
    (parentsRes.data || []).forEach((p: any) => {
      parentMap.set(p.message_id, {
        content: p.content?.substring(0, 100) || '',
        sender_username: p.users?.username || 'Unknown',
      });
    });

    return messages.map((m: any) => ({
      message_id: m.message_id,
      league_id: m.league_id,
      team_id: m.team_id,
      sender_id: m.sender_id,
      content: m.content,
      message_type: m.message_type,
      visibility: m.visibility,
      is_important: m.is_important,
      parent_message_id: m.parent_message_id,
      parent_message: m.parent_message_id
        ? parentMap.get(m.parent_message_id) || null
        : null,
      deep_link: m.deep_link,
      created_at: m.created_at,
      edited_at: m.edited_at,
      deleted_at: m.deleted_at,
      sender_name: null,
      sender_username: m.users?.username || 'Unknown',
      sender_role: senderRoles.get(m.sender_id) || null,
      is_read: readSet.has(m.message_id),
      reactions: reactionsMap.get(m.message_id) || [],
    }));
  } catch (err) {
    console.error('Error in getMessagesForUser:', err);
    return [];
  }
}

/**
 * Send a message in a league
 * Validates sender permissions based on message type and target
 */
export async function sendMessage(
  leagueId: string,
  senderId: string,
  data: SendMessageData,
): Promise<Message | null> {
  try {
    const supabase = getSupabaseServiceRole();

    const {
      content,
      teamId,
      messageType = 'chat',
      visibility = 'all',
      isImportant = false,
      parentMessageId,
      deepLink,
    } = data;

    // Validate sender is a member of the league
    const role = await getUserRoleInLeague(senderId, leagueId);
    if (!role) {
      console.error('Sender is not a member of the league');
      return null;
    }

    // Players and captains must always send to a team — only host/governor can broadcast
    const isHostOrGovernor = role === 'host' || role === 'governor';
    if (!teamId && !isHostOrGovernor) {
      console.error('Only host/governor can send league-wide messages');
      return null;
    }

    // Validate team membership if sending to a team
    if (teamId) {
      const senderTeamId = await getUserTeamInLeague(senderId, leagueId);

      // Host/Governor can send to any team; others must be on the team
      if (!isHostOrGovernor && senderTeamId !== teamId) {
        console.error('Sender is not a member of the target team');
        return null;
      }
    }

    // Only host/governor can send announcements
    if (
      messageType === 'announcement' &&
      role !== 'host' &&
      role !== 'governor'
    ) {
      console.error('Only host/governor can send announcements');
      return null;
    }

    // System messages cannot be sent by users
    if (messageType === 'system') {
      console.error('System messages cannot be sent by users');
      return null;
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        league_id: leagueId,
        team_id: teamId || null,
        sender_id: senderId,
        content,
        message_type: messageType,
        visibility,
        is_important: isImportant,
        parent_message_id: parentMessageId || null,
        deep_link: deepLink || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return message as Message;
  } catch (err) {
    console.error('Error in sendMessage:', err);
    return null;
  }
}

/**
 * Edit a message - only the original sender can edit
 */
export async function editMessage(
  messageId: string,
  userId: string,
  newContent: string,
): Promise<Message | null> {
  try {
    const supabase = getSupabaseServiceRole();

    // Verify the user is the sender
    const { data: existing, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('message_id', messageId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      console.error('Message not found:', fetchError);
      return null;
    }

    if (existing.sender_id !== userId) {
      console.error('Only the sender can edit a message');
      return null;
    }

    const { data: updated, error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq('message_id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Error editing message:', error);
      return null;
    }

    return updated as Message;
  } catch (err) {
    console.error('Error in editMessage:', err);
    return null;
  }
}

/**
 * Soft delete a message - sender or host can delete
 */
export async function deleteMessage(
  messageId: string,
  userId: string,
  leagueId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRole();

    // Fetch the message
    const { data: existing, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, league_id')
      .eq('message_id', messageId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      console.error('Message not found:', fetchError);
      return false;
    }

    // Check permission: sender or host
    const isSender = existing.sender_id === userId;
    if (!isSender) {
      const role = await getUserRoleInLeague(userId, leagueId);
      if (role !== 'host') {
        console.error('Only the sender or host can delete a message');
        return false;
      }
    }

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('message_id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteMessage:', err);
    return false;
  }
}

// ============================================================================
// Read Receipts
// ============================================================================

/**
 * Mark messages as read by upserting read receipts
 */
export async function markMessagesAsRead(
  messageIds: string[],
  userId: string,
): Promise<boolean> {
  try {
    if (messageIds.length === 0) return true;

    const supabase = getSupabaseServiceRole();

    const receipts = messageIds.map((messageId) => ({
      message_id: messageId,
      user_id: userId,
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('message_read_receipts')
      .upsert(receipts, { onConflict: 'message_id,user_id' });

    if (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in markMessagesAsRead:', err);
    return false;
  }
}

/**
 * Get count of unread messages for a user in a league
 * Counts messages the user can see but hasn't read
 */
export async function getUnreadCount(
  leagueId: string,
  userId: string,
): Promise<number> {
  const counts = await getMessageCounts(leagueId, userId);
  return counts.unread;
}

/**
 * Get both unread and total message counts for a user in a league
 */
export async function getMessageCounts(
  leagueId: string,
  userId: string,
): Promise<{ unread: number; total: number }> {
  try {
    const supabase = getSupabaseServiceRole();

    // Get user's role and team
    const [role, userTeamId] = await Promise.all([
      getUserRoleInLeague(userId, leagueId),
      getUserTeamInLeague(userId, leagueId),
    ]);

    if (!role) return { unread: 0, total: 0 };

    const isHostOrGovernor = role === 'host' || role === 'governor';
    const isCaptain = role === 'captain';

    // Build query for visible messages
    let query = supabase
      .from('messages')
      .select('message_id', { count: 'exact', head: false })
      .eq('league_id', leagueId)
      .is('deleted_at', null);

    // Apply same visibility filters as getMessagesForUser
    if (isHostOrGovernor) {
      // See all messages - no filter
    } else if (isCaptain) {
      if (userTeamId) {
        query = query.or(`team_id.eq.${userTeamId},team_id.is.null`);
      } else {
        query = query.is('team_id', null);
      }
    } else {
      if (userTeamId) {
        query = query.or(
          `and(team_id.eq.${userTeamId},visibility.eq.all),and(team_id.eq.${userTeamId},visibility.eq.captains_only,sender_id.eq.${userId}),and(team_id.is.null,visibility.eq.all)`,
        );
      } else {
        query = query.is('team_id', null).eq('visibility', 'all');
      }
    }

    const { data: visibleMessages, error: msgError } = await query;

    if (msgError || !visibleMessages) return { unread: 0, total: 0 };

    const total = visibleMessages.length;
    if (total === 0) return { unread: 0, total: 0 };

    const visibleIds = visibleMessages.map((m: any) => m.message_id);

    // Get read message IDs for this user
    const { data: readReceipts, error: readError } = await supabase
      .from('message_read_receipts')
      .select('message_id')
      .eq('user_id', userId)
      .in('message_id', visibleIds);

    if (readError) return { unread: 0, total };

    const readIds = new Set((readReceipts || []).map((r: any) => r.message_id));
    const unread = visibleIds.filter((id: string) => !readIds.has(id)).length;

    return { unread, total };
  } catch (err) {
    console.error('Error in getMessageCounts:', err);
    return { unread: 0, total: 0 };
  }
}

/**
 * Get read receipts for a message with user details
 */
export async function getReadReceipts(
  messageId: string,
): Promise<ReadReceipt[]> {
  try {
    const supabase = getSupabaseServiceRole();

    const { data, error } = await supabase
      .from('message_read_receipts')
      .select(
        `
        id,
        message_id,
        user_id,
        read_at,
        users!message_read_receipts_user_id_fkey(username)
      `,
      )
      .eq('message_id', messageId)
      .order('read_at', { ascending: true });

    if (error || !data) {
      console.error('Error fetching read receipts:', error);
      return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      message_id: r.message_id,
      user_id: r.user_id,
      read_at: r.read_at,
      username: r.users?.username || 'Unknown',
    }));
  } catch (err) {
    console.error('Error in getReadReceipts:', err);
    return [];
  }
}

// ============================================================================
// Canned Messages
// ============================================================================

/**
 * Get canned messages for a role
 * Returns system-wide canned messages + league-specific ones
 */
export async function getCannedMessages(
  leagueId: string,
  role: CannedMessageRoleTarget,
): Promise<CannedMessage[]> {
  try {
    const { data, error } = await getSupabaseServiceRole()
      .from('canned_messages')
      .select('*')
      .eq('role_target', role)
      .or(`league_id.eq.${leagueId},league_id.is.null`)
      .order('is_system', { ascending: false })
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching canned messages:', error);
      return [];
    }

    return (data || []) as CannedMessage[];
  } catch (err) {
    console.error('Error in getCannedMessages:', err);
    return [];
  }
}

/**
 * Create a canned message for a league
 */
export async function createCannedMessage(
  leagueId: string,
  userId: string,
  data: CannedMessageData,
): Promise<CannedMessage | null> {
  try {
    const { data: created, error } = await getSupabaseServiceRole()
      .from('canned_messages')
      .insert({
        league_id: leagueId,
        role_target: data.roleTarget,
        title: data.title,
        content: data.content,
        is_system: data.isSystem || false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating canned message:', error);
      return null;
    }

    return created as CannedMessage;
  } catch (err) {
    console.error('Error in createCannedMessage:', err);
    return null;
  }
}

/**
 * Update an existing canned message
 */
export async function updateCannedMessage(
  cannedMessageId: string,
  userId: string,
  data: Partial<CannedMessageData>,
): Promise<CannedMessage | null> {
  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (data.roleTarget !== undefined)
      updatePayload.role_target = data.roleTarget;
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.content !== undefined) updatePayload.content = data.content;
    if (data.isSystem !== undefined) updatePayload.is_system = data.isSystem;

    const { data: updated, error } = await getSupabaseServiceRole()
      .from('canned_messages')
      .update(updatePayload)
      .eq('canned_message_id', cannedMessageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating canned message:', error);
      return null;
    }

    return updated as CannedMessage;
  } catch (err) {
    console.error('Error in updateCannedMessage:', err);
    return null;
  }
}

/**
 * Delete a canned message
 * Only non-system canned messages can be deleted
 */
export async function deleteCannedMessage(
  cannedMessageId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRole();

    // Prevent deletion of system canned messages
    const { data: existing, error: fetchError } = await supabase
      .from('canned_messages')
      .select('is_system')
      .eq('canned_message_id', cannedMessageId)
      .single();

    if (fetchError || !existing) {
      console.error('Canned message not found:', fetchError);
      return false;
    }

    if (existing.is_system) {
      console.error('Cannot delete system canned messages');
      return false;
    }

    const { error } = await supabase
      .from('canned_messages')
      .delete()
      .eq('canned_message_id', cannedMessageId);

    if (error) {
      console.error('Error deleting canned message:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteCannedMessage:', err);
    return false;
  }
}

// ============================================================================
// Reactions
// ============================================================================

/**
 * Toggle a reaction on a message.
 * If the user already reacted with this emoji, remove it. Otherwise, add it.
 */
export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<{ action: 'added' | 'removed' }> {
  const supabase = getSupabaseServiceRole();

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('reaction_id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('message_reactions')
      .delete()
      .eq('reaction_id', existing.reaction_id);
    return { action: 'removed' };
  }

  await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji });

  return { action: 'added' };
}
