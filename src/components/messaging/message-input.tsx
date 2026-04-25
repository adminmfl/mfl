'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
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
  ImageIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/lib/toast';
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
import { compressImage } from '@/lib/utils/image-compression';
import { CannedMessagePicker } from './canned-message-picker';
import { RecentWorkoutPicker } from './recent-workout-picker';
import { MentionDropdown, type MentionMember } from './mention-dropdown';
import type { Message } from './message-bubble';

interface RecentWorkout {
  id: string;
  date: string;
  workout_type: string | null;
  custom_activity_name?: string | null;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatWorkoutTypeLabel(type: string | null): string {
  if (!type || isUuidLike(type)) return 'Workout';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toPossessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

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
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Photo attachment state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Mention state
  const [mentionVisible, setMentionVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);

  const isHostOrGovernor = currentRole === 'host' || currentRole === 'governor';
  // All roles can toggle captains_only (players use it as DM to captain)
  const canSetVisibility = true;
  const canMarkImportant = isHostOrGovernor;
  const canAnnounce = isHostOrGovernor;
  const isCaptain = currentRole === 'captain' || currentRole === 'vice_captain';

  // Memoized label for selected workout deep link
  const deepLinkLabel = useMemo(() => {
    if (!deepLink) return null;

    // For workout links, prefer the explicit label passed from picker.
    if (deepLink.includes('/submit')) {
      const query = deepLink.split('?')[1] || '';
      const params = new URLSearchParams(query);
      const selectedLabel = params.get('label');
      return selectedLabel || 'Workout';
    }

    return 'Link';
  }, [deepLink]);

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
      mentionStartIdx + 1 + mentionQuery.length, // +1 for '@'
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
  // Photo attachment
  // -------------------------------------------------------------------------

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are supported');
      return;
    }

    try {
      const result = await compressImage(file, {
        maxSizeBytes: 1024 * 1024,
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
      });
      setPhotoFile(result.file);
      setPhotoPreview(URL.createObjectURL(result.file));
    } catch {
      toast.error('Failed to process image');
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // -------------------------------------------------------------------------
  // Send
  // -------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if ((!trimmed && !photoFile) || sending) return;

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
        content: trimmed || (photoFile ? '📷 Photo' : ''),
        message_type: isAnnouncement ? 'announcement' : 'chat',
        visibility,
        is_important: isImportant,
        is_read: true,
        deep_link: deepLink || null,
        photo_url: photoPreview || null,
        parent_message_id: replyTo?.message_id || null,
        parent_message: replyTo
          ? {
            sender_username:
              replyTo.sender_username || replyTo.sender_name || '',
            content: replyTo.content,
          }
          : null,
        created_at: new Date().toISOString(),
        edited_at: null,
        sender_role: currentRole || 'player',
        reactions: [],
      };
      onOptimisticMessage(optimistic);
    }

    try {
      // Upload photo first if attached
      let photoUrl: string | null = null;
      if (photoFile && teamId) {
        setPhotoUploading(true);
        const fd = new FormData();
        fd.append('file', photoFile);
        fd.append('leagueId', leagueId);
        fd.append('teamId', teamId);
        const upRes = await fetch('/api/upload/team-chat-photo', {
          method: 'POST',
          body: fd,
        });
        const upJson = await upRes.json();
        if (!upRes.ok || !upJson.success) {
          throw new Error(upJson.error || 'Photo upload failed');
        }
        photoUrl = upJson.data.url;
        setPhotoUploading(false);
      }

      const body: Record<string, unknown> = {
        content: trimmed || (photoUrl ? '📷 Photo' : ''),
        visibility,
        is_important: isImportant,
        message_type: isAnnouncement ? 'announcement' : 'chat',
      };
      if (teamId) body.team_id = teamId;
      if (replyTo) body.parent_message_id = replyTo.message_id;
      if (deepLink) body.deep_link = deepLink;
      if (photoUrl) body.photo_url = photoUrl;

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
      clearPhoto();
      onMessageSent();
      textareaRef.current?.focus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send message',
      );
    } finally {
      setSending(false);
      setPhotoUploading(false);
    }
  }, [
    content,
    photoFile,
    sending,
    visibility,
    isImportant,
    isAnnouncement,
    deepLink,
    teamId,
    leagueId,
    replyTo,
    onMessageSent,
  ]);

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

  const handleWorkoutSelect = (workout: RecentWorkout) => {
    const baseWorkoutLabel =
      workout.custom_activity_name ||
      formatWorkoutTypeLabel(workout.workout_type);
    const workoutLabel = /session$/i.test(baseWorkoutLabel)
      ? baseWorkoutLabel
      : `${baseWorkoutLabel} Session`;
    const senderFirstName = session?.user?.name?.trim().split(/\s+/)[0];
    const senderPrefix = senderFirstName
      ? `${toPossessive(senderFirstName)} `
      : '';
    const label = `${senderPrefix}${workoutLabel} - ${format(parseISO(workout.date), 'MMM d')}`;
    const params = new URLSearchParams({
      submissionId: workout.id,
      label,
    });

    setDeepLink(`/leagues/${leagueId}/submit?${params.toString()}`);
    setAttachMenuOpen(false);
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
            {deepLinkLabel ? `${deepLinkLabel} link attached` : 'Link attached'}
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

      {/* Photo preview */}
      {photoPreview && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/50 border-l-2 border-primary/40">
          <img
            src={photoPreview}
            alt="preview"
            className="size-10 rounded object-cover shrink-0"
          />
          <span className="text-[11px] text-muted-foreground flex-1 truncate">
            {photoFile?.name}
          </span>
          <button
            type="button"
            onClick={clearPhoto}
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
                  (isAnnouncement ||
                    isImportant ||
                    visibility === 'captains_only') &&
                  'border-amber-400 text-amber-600 dark:text-amber-400',
                )}
              >
                {isAnnouncement ? (
                  <>
                    <Megaphone className="size-3" /> Announcement
                  </>
                ) : visibility === 'captains_only' ? (
                  <>
                    <Shield className="size-3" />{' '}
                    {currentRole === 'player' ? 'DM Captain' : 'Captains'}
                  </>
                ) : (
                  <>
                    <Globe className="size-3" /> All
                  </>
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
                    className={cn(
                      visibility === 'captains_only' && 'bg-accent',
                    )}
                  >
                    <Shield className="size-4 mr-2" />
                    {currentRole === 'player'
                      ? 'DM to Captain'
                      : 'Captains Only'}
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
          <CannedMessagePicker
            leagueId={leagueId}
            onSelect={handleCannedSelect}
          />
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
            {motivating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Zap className="size-3.5" />
            )}
            <span className="hidden sm:inline">Motivate</span>
          </Button>
        )}

        {/* Photo attachment button */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handlePhotoSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8 shrink-0', photoFile && 'text-primary')}
          onClick={() => photoInputRef.current?.click()}
          disabled={sending || photoUploading}
          title="Attach photo"
        >
          {photoUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
        </Button>

        {/* Attach workout — explicit selection via picker */}
        <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'size-8 shrink-0',
                deepLink && 'text-green-600 dark:text-green-400',
              )}
              title="Attach a workout"
            >
              <Dumbbell className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-56 p-1">
            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Attach a workout
            </p>
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
            <RecentWorkoutPicker
              leagueId={leagueId}
              onSelect={handleWorkoutSelect}
            />
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                deepLink === `/leagues/${leagueId}/challenges` &&
                'bg-accent font-medium',
              )}
              onClick={() => {
                setDeepLink(`/leagues/${leagueId}/challenges`);
                setAttachMenuOpen(false);
              }}
            >
              <Link2 className="size-3.5" />
              Challenges
            </button>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                deepLink === `/leagues/${leagueId}/leaderboard` &&
                'bg-accent font-medium',
              )}
              onClick={() => {
                setDeepLink(`/leagues/${leagueId}/leaderboard`);
                setAttachMenuOpen(false);
              }}
            >
              <Link2 className="size-3.5" />
              Leaderboard
            </button>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                deepLink === `/leagues/${leagueId}/activities` &&
                'bg-accent font-medium',
              )}
              onClick={() => {
                setDeepLink(`/leagues/${leagueId}/activities`);
                setAttachMenuOpen(false);
              }}
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
            className="min-h-10 max-h-32 resize-none text-sm py-2"
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
