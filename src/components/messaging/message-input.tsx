'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Send,
  ChevronDown,
  AlertTriangle,
  Shield,
  Globe,
  Megaphone,
  X,
  Reply,
  Dumbbell,
  Zap,
  Loader2,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLeague } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CannedMessagePicker } from './canned-message-picker';
import { MentionDropdown, type MentionMember } from './mention-dropdown';
import type { Message } from './message-bubble';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Visibility = 'all' | 'captains_only';

interface MessageInputProps {
  leagueId: string;
  teamId?: string | null;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  onMessageSent: () => void;
  onOptimisticMessage?: (msg: Message) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageInput({
  leagueId,
  teamId,
  replyTo,
  onCancelReply,
  onMessageSent,
  onOptimisticMessage,
}: MessageInputProps) {
  const { data: session } = useSession();
  const { currentRole } = useLeague();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [isImportant, setIsImportant] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [motivating, setMotivating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mention state
  const [mentionVisible, setMentionVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);

  const isHostOrGovernor =
    currentRole === 'host' || currentRole === 'governor';
  // All roles can toggle captains_only (players use it as DM to captain)
  const canSetVisibility = true;
  const canMarkImportant = isHostOrGovernor;
  const canAnnounce = isHostOrGovernor;
  const isCaptain = currentRole === 'captain';

  // Motivate Team — AI-generated message for captains
  const handleMotivateTeam = useCallback(async () => {
    if (!teamId) return;
    setMotivating(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/ai-motivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      const json = await res.json();
      if (json.success && json.message) {
        setContent(json.message);
        textareaRef.current?.focus();
      } else {
        toast.error(json.error || 'Failed to generate message');
      }
    } catch {
      toast.error('Failed to generate motivational message');
    } finally {
      setMotivating(false);
    }
  }, [leagueId, teamId]);

  // -------------------------------------------------------------------------
  // Mention detection
  // -------------------------------------------------------------------------

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart ?? value.length;
    setContent(value);

    // Look backwards from cursor for an unmatched '@'
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt >= 0) {
      // Check there's no space before @ (or it's at start), and no closing bracket
      const charBefore = lastAt > 0 ? textBeforeCursor[lastAt - 1] : ' ';
      const afterAt = textBeforeCursor.slice(lastAt + 1);
      // If there's a ] after @, the mention was already completed
      if (
        (charBefore === ' ' || charBefore === '\n' || lastAt === 0) &&
        !afterAt.includes(']') &&
        !afterAt.includes('\n') &&
        afterAt.length <= 30
      ) {
        setMentionVisible(true);
        setMentionQuery(afterAt);
        setMentionStartIdx(lastAt);
        return;
      }
    }

    setMentionVisible(false);
    setMentionQuery('');
    setMentionStartIdx(-1);
  };

  const handleMentionSelect = (member: MentionMember) => {
    // Replace @query with @[username]
    const before = content.slice(0, mentionStartIdx);
    const after = content.slice(
      mentionStartIdx + 1 + mentionQuery.length // +1 for '@'
    );
    const mention = `@[${member.username}] `;
    const newContent = before + mention + after;
    setContent(newContent);
    setMentionVisible(false);
    setMentionQuery('');
    setMentionStartIdx(-1);

    // Refocus and place cursor after mention
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        const pos = before.length + mention.length;
        textarea.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  // -------------------------------------------------------------------------
  // Send
  // -------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);

    // Optimistic: show message immediately
    if (onOptimisticMessage && session?.user) {
      const optimistic: Message = {
        message_id: `optimistic-${Date.now()}`,
        league_id: leagueId,
        team_id: teamId || null,
        sender_id: session.user.id,
        sender_name: session.user.name || '',
        sender_username: session.user.name || '',
        content: trimmed,
        message_type: isAnnouncement ? 'announcement' : 'chat',
        visibility,
        is_important: isImportant,
        is_read: true,
        deep_link: deepLink || null,
        parent_message_id: replyTo?.message_id || null,
        parent_message: replyTo ? { sender_name: replyTo.sender_name || replyTo.sender_username || '', content: replyTo.content } : null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        reactions: [],
        role: currentRole || 'player',
      };
      onOptimisticMessage(optimistic);
    }

    try {
      const body: Record<string, unknown> = {
        content: trimmed,
        visibility,
        is_important: isImportant,
        message_type: isAnnouncement ? 'announcement' : 'chat',
      };
      if (teamId) body.team_id = teamId;
      if (replyTo) body.parent_message_id = replyTo.message_id;
      if (deepLink) body.deep_link = deepLink;

      const res = await fetch(`/api/leagues/${leagueId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? 'Failed to send message');
      }

      setContent('');
      setIsImportant(false);
      setIsAnnouncement(false);
      setDeepLink(null);
      onMessageSent();
      textareaRef.current?.focus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send message'
      );
    } finally {
      setSending(false);
    }
  }, [content, sending, visibility, isImportant, isAnnouncement, deepLink, teamId, leagueId, replyTo, onMessageSent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention dropdown is visible, let it handle Enter/Tab/Arrow keys
    if (mentionVisible) {
      if (['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'Escape'].includes(e.key)) {
        return; // handled by MentionDropdown's global keydown listener
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCannedSelect = (text: string) => {
    setContent((prev) => (prev ? `${prev}\n${text}` : text));
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t bg-background px-3 py-2 sm:px-4 sm:py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/50 border-l-2 border-blue-400">
          <Reply className="size-3.5 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block">
              {replyTo.sender_name || replyTo.sender_username || 'Unknown'}
            </span>
            <span className="text-[11px] text-muted-foreground line-clamp-1 block">
              {replyTo.content}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Active modifiers */}
      {/* Deep link preview */}
      {deepLink && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/50 border-l-2 border-green-400">
          <Dumbbell className="size-3.5 text-green-500 shrink-0" />
          <span className="text-[11px] text-muted-foreground flex-1 truncate">
            Workout link attached
          </span>
          <button
            type="button"
            onClick={() => setDeepLink(null)}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {(visibility === 'captains_only' || isImportant || isAnnouncement) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {isAnnouncement && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-medium px-2 py-0.5">
              <Megaphone className="size-3" />
              Announcement
            </span>
          )}
          {visibility === 'captains_only' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[11px] font-medium px-2 py-0.5">
              <Shield className="size-3" />
              {currentRole === 'player' ? 'DM to Captain' : 'Captains Only'}
            </span>
          )}
          {isImportant && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[11px] font-medium px-2 py-0.5">
              <AlertTriangle className="size-3" />
              Important
            </span>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 relative">
        {/* Target group dropdown (left side) */}
        {(canSetVisibility || canMarkImportant || canAnnounce) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 shrink-0 gap-1 text-xs',
                  (isAnnouncement || isImportant || visibility === 'captains_only') &&
                    'border-amber-400 text-amber-600 dark:text-amber-400'
                )}
              >
                {isAnnouncement ? (
                  <><Megaphone className="size-3" /> Announcement</>
                ) : visibility === 'captains_only' ? (
                  <><Shield className="size-3" /> {currentRole === 'player' ? 'DM Captain' : 'Captains'}</>
                ) : (
                  <><Globe className="size-3" /> All</>
                )}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {canAnnounce && (
                <DropdownMenuItem
                  onClick={() => setIsAnnouncement((v) => !v)}
                  className={cn(isAnnouncement && 'bg-accent')}
                >
                  <Megaphone className="size-4 mr-2" />
                  {isAnnouncement ? 'Switch to Chat' : 'Send as Announcement'}
                </DropdownMenuItem>
              )}
              {canSetVisibility && (
                <>
                  <DropdownMenuItem
                    onClick={() => setVisibility('all')}
                    className={cn(visibility === 'all' && 'bg-accent')}
                  >
                    <Globe className="size-4 mr-2" />
                    Visible to All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setVisibility('captains_only')}
                    className={cn(visibility === 'captains_only' && 'bg-accent')}
                  >
                    <Shield className="size-4 mr-2" />
                    {currentRole === 'player' ? 'DM to Captain' : 'Captains Only'}
                  </DropdownMenuItem>
                </>
              )}
              {canMarkImportant && (
                <DropdownMenuItem
                  onClick={() => setIsImportant((v) => !v)}
                  className={cn(isImportant && 'bg-accent')}
                >
                  <AlertTriangle className="size-4 mr-2" />
                  {isImportant ? 'Unmark Important' : 'Mark as Important'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Canned messages */}
        {canSetVisibility && (
          <CannedMessagePicker leagueId={leagueId} onSelect={handleCannedSelect} />
        )}

        {/* AI Motivate Team — captain only */}
        {isCaptain && teamId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs gap-1 h-8 px-2"
            disabled={motivating}
            onClick={handleMotivateTeam}
            title="AI-generated team motivation message"
          >
            {motivating ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
            <span className="hidden sm:inline">Motivate</span>
          </Button>
        )}

        {/* Attach link — popover with selectable options */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('size-8 shrink-0', deepLink && 'text-green-600 dark:text-green-400')}
              title="Attach a link"
            >
              <Dumbbell className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-56 p-1">
            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Attach a link</p>
            {deepLink && (
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent text-red-600 dark:text-red-400"
                onClick={() => setDeepLink(null)}
              >
                <X className="size-3.5" />
                Remove attached link
              </button>
            )}
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                deepLink === `/leagues/${leagueId}/submit` && 'bg-accent font-medium'
              )}
              onClick={() => setDeepLink(`/leagues/${leagueId}/submit`)}
            >
              <Dumbbell className="size-3.5" />
              Submit Workout
            </button>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                deepLink === `/leagues/${leagueId}/challenges` && 'bg-accent font-medium'
              )}
              onClick={() => setDeepLink(`/leagues/${leagueId}/challenges`)}
            >
              <Link2 className="size-3.5" />
              Challenges
            </button>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                deepLink === `/leagues/${leagueId}/leaderboard` && 'bg-accent font-medium'
              )}
              onClick={() => setDeepLink(`/leagues/${leagueId}/leaderboard`)}
            >
              <Link2 className="size-3.5" />
              Leaderboard
            </button>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                deepLink === `/leagues/${leagueId}/activities` && 'bg-accent font-medium'
              )}
              onClick={() => setDeepLink(`/leagues/${leagueId}/activities`)}
            >
              <Link2 className="size-3.5" />
              Activities
            </button>
          </PopoverContent>
        </Popover>

        {/* Textarea wrapper with mention dropdown */}
        <div className="relative flex-1">
          {/* Mention dropdown */}
          <MentionDropdown
            leagueId={leagueId}
            teamId={teamId}
            currentRole={currentRole}
            currentUserId={session?.user?.id}
            query={mentionQuery}
            visible={mentionVisible}
            onSelect={handleMentionSelect}
            onClose={() => setMentionVisible(false)}
            position={{ top: 4, left: 0 }}
          />

          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... Use @ to mention"
            className="min-h-[40px] max-h-32 resize-none text-sm py-2"
            rows={1}
            disabled={sending}
          />
        </div>

        {/* Send */}
        <Button
          type="button"
          size="icon"
          className="size-8 shrink-0"
          disabled={!content.trim() || sending}
          onClick={handleSend}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
