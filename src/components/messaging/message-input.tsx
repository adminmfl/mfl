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
import { cn } from '@/lib/utils';
import { CannedMessagePicker } from './canned-message-picker';
import { MentionDropdown, type MentionMember } from './mention-dropdown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Visibility = 'all' | 'captains_only';

interface MessageInputProps {
  leagueId: string;
  teamId?: string | null;
  onMessageSent: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageInput({
  leagueId,
  teamId,
  onMessageSent,
}: MessageInputProps) {
  const { data: session } = useSession();
  const { currentRole } = useLeague();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [isImportant, setIsImportant] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);
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
    try {
      const body: Record<string, unknown> = {
        content: trimmed,
        visibility,
        is_important: isImportant,
        message_type: isAnnouncement ? 'announcement' : 'chat',
      };
      if (teamId) body.team_id = teamId;

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
      onMessageSent();
      textareaRef.current?.focus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send message'
      );
    } finally {
      setSending(false);
    }
  }, [content, sending, visibility, isImportant, isAnnouncement, teamId, leagueId, onMessageSent]);

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
      {/* Active modifiers */}
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
        {/* Canned messages */}
        {canSetVisibility && (
          <CannedMessagePicker leagueId={leagueId} onSelect={handleCannedSelect} />
        )}

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

        {/* Visibility / important / announcement toggles */}
        {(canSetVisibility || canMarkImportant || canAnnounce) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-8 shrink-0',
                  (isAnnouncement || isImportant || visibility === 'captains_only') &&
                    'text-amber-600 dark:text-amber-400'
                )}
              >
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
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
                    className={cn(
                      visibility === 'all' && 'bg-accent'
                    )}
                  >
                    <Globe className="size-4 mr-2" />
                    Visible to All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setVisibility('captains_only')}
                    className={cn(
                      visibility === 'captains_only' && 'bg-accent'
                    )}
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
