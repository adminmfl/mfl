'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  ExternalLink,
  Pencil,
  Shield,
  Check,
  CheckCheck,
  Reply,
  SmilePlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageReaction {
  emoji: string;
  user_ids: string[];
}

export interface ParentMessagePreview {
  content: string;
  sender_username: string;
}

export interface Message {
  message_id: string;
  league_id: string;
  team_id: string | null;
  sender_id: string;
  content: string;
  message_type: 'chat' | 'announcement' | 'system';
  visibility: 'all' | 'captains_only';
  is_important: boolean;
  parent_message_id?: string | null;
  parent_message?: ParentMessagePreview | null;
  deep_link: string | null;
  created_at: string;
  edited_at: string | null;
  sender_name?: string;
  sender_username?: string;
  sender_role: string;
  is_read?: boolean;
  reactions?: MessageReaction[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<string, string> = {
  host: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
  governor:
    'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700',
  captain:
    'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700',
  player:
    'bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700',
};

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '💪', '🔥'];

function containsUuid(value: string): boolean {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
    value,
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diffDay < 7) {
    return `${date.toLocaleDateString([], { weekday: 'short' })} ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Map an internal deep_link path to a user-friendly label.
 * Strips UUIDs / league IDs so raw database identifiers are never shown.
 */
function deepLinkLabel(path: string): string {
  try {
    const url = new URL(path, 'https://mfl.local');
    const customLabel = url.searchParams.get('label');
    if (customLabel && !containsUuid(customLabel)) {
      return customLabel;
    }
  } catch {
    // Fall through to the path-based label mapping.
  }

  // Normalise: remove trailing slash
  const p = path.replace(/\/+$/, '');

  // Match /leagues/<id>/<section> patterns
  const match = p.match(/\/leagues\/[^/]+\/(.+)/);
  if (match) {
    const section = match[1].split('/')[0]; // first segment after league id
    const labels: Record<string, string> = {
      submit: 'Submit Workout',
      challenges: 'Challenges',
      leaderboard: 'Leaderboard',
      activities: 'Activities',
      'manual-entry': 'Manual Entry',
      'my-team': 'My Team',
      rules: 'Rules',
      settings: 'Settings',
      analytics: 'Analytics',
      validate: 'Validate',
      submissions: 'Submissions',
    };
    return (
      labels[section] ||
      section.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  // Fallback: return last meaningful segment, titlecased
  const segments = p.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || 'Link';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Very lightweight markdown-lite: **bold**, [text](url) links, @[name] mentions */
function renderContent(content: string) {
  const parts: ReactNode[] = [];
  // Matches: **bold**, @[username](user_id) (legacy), @[username] (new), [text](url)
  const regex =
    /(\*\*(.+?)\*\*)|(@\[([^\]]+)\](?:\([^)]+\))?)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      parts.push(content.slice(lastIdx, match.index));
    }
    if (match[1]) {
      // bold
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      // @mention — @[username] or @[username](user_id)
      parts.push(
        <span
          key={match.index}
          className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded px-0.5"
        >
          @{match[4]}
        </span>,
      );
    } else if (match[5]) {
      // link — use in-app nav for internal paths, external for others
      const href = match[7];
      const isInternal = href.startsWith('/');
      parts.push(
        isInternal ? (
          <Link
            key={match.index}
            href={href}
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
          >
            {match[6]}
          </Link>
        ) : (
          <a
            key={match.index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
          >
            {match[6]}
          </a>
        ),
      );
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < content.length) {
    parts.push(content.slice(lastIdx));
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  currentUserId,
  onReply,
  onReact,
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const relativeTime = useMemo(
    () => formatRelativeTime(message.created_at),
    [message.created_at],
  );

  const isAnnouncement = message.message_type === 'announcement';
  const isSystem = message.message_type === 'system';
  const reactions = message.reactions || [];

  // System messages render as a centered, muted line
  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-muted-foreground italic bg-muted rounded-full px-3 py-1">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex flex-col max-w-[85%] sm:max-w-[70%]',
        isOwn ? 'self-end items-end' : 'self-start items-start',
      )}
    >
      {/* Single self-contained bubble — WhatsApp style */}
      <div
        className={cn(
          'relative rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
          isAnnouncement
            ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-foreground'
            : isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md',
        )}
        style={{ overflowWrap: 'anywhere' }}
      >
        {/* Sender name + role badge — inside bubble */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={cn(
                'text-xs font-semibold',
                isAnnouncement
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-blue-600 dark:text-blue-400',
              )}
            >
              {message.sender_name || message.sender_username || 'Unknown'}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-4 capitalize',
                ROLE_COLORS[message.sender_role] ?? ROLE_COLORS.player,
              )}
            >
              {message.sender_role}
            </Badge>
          </div>
        )}

        {/* Announcement header */}
        {isAnnouncement && (
          <div className="flex items-center gap-1.5 mb-1 text-amber-700 dark:text-amber-400">
            <Megaphone className="size-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Announcement
            </span>
          </div>
        )}

        {/* Important indicator */}
        {message.is_important && !isAnnouncement && (
          <div className="flex items-center gap-1 mb-1 text-red-600 dark:text-red-400">
            <span className="text-[10px] font-bold uppercase tracking-wide">
              Important
            </span>
          </div>
        )}

        {/* Reply preview — quoted parent message */}
        {message.parent_message && (
          <div
            className={cn(
              'rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2',
              isOwn
                ? 'bg-primary-foreground/10 border-primary-foreground/40'
                : 'bg-background/50 border-blue-400',
            )}
          >
            <span
              className={cn(
                'text-[11px] font-semibold block',
                isOwn
                  ? 'text-primary-foreground/80'
                  : 'text-blue-600 dark:text-blue-400',
              )}
            >
              {message.parent_message.sender_username}
            </span>
            <span
              className={cn(
                'text-[11px] line-clamp-2',
                isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground',
              )}
            >
              {message.parent_message.content}
            </span>
          </div>
        )}

        {/* Content */}
        <p>{renderContent(message.content)}</p>

        {/* Deep link card — show friendly label, never raw URLs/UUIDs */}
        {message.deep_link && (
          <Link
            href={message.deep_link}
            className={cn(
              'mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
              'bg-background/50 hover:bg-background/80 border-border text-foreground',
            )}
          >
            <ExternalLink className="size-3.5 shrink-0" />
            <span className="truncate">{deepLinkLabel(message.deep_link)}</span>
          </Link>
        )}

        {/* Meta row — timestamp, edited, visibility, read receipt — all inside bubble */}
        <div
          className={cn(
            'flex items-center gap-1.5 mt-1 justify-end',
            isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground',
          )}
        >
          {message.visibility === 'captains_only' && (
            <span className="flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400">
              <Shield className="size-2.5" />
              Captains
            </span>
          )}
          {message.edited_at && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <Pencil className="size-2.5" />
              edited
            </span>
          )}
          <span className="text-[10px]">{relativeTime}</span>
          {isOwn &&
            (message.is_read ? (
              <CheckCheck className="size-3 text-blue-400" />
            ) : (
              <Check className="size-3" />
            ))}
        </div>

        {/* Hover actions — reply & react */}
        <div
          className={cn(
            'absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-background border rounded-lg shadow-sm px-1 py-0.5',
            isOwn ? 'left-0' : 'right-0',
          )}
        >
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(message)}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Reply"
            >
              <Reply className="size-3.5" />
            </button>
          )}
          {onReact && (
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              title="React"
            >
              <SmilePlus className="size-3.5" />
            </button>
          )}
        </div>

        {/* Quick emoji picker */}
        {showEmojiPicker && onReact && (
          <div
            className={cn(
              'absolute -top-10 z-10 flex items-center gap-0.5 bg-background border rounded-xl shadow-lg px-2 py-1',
              isOwn ? 'left-0' : 'right-0',
            )}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(message.message_id, emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-lg hover:scale-125 transition-transform p-0.5"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reactions row — below the bubble */}
      {reactions.length > 0 && (
        <div
          className={cn(
            'flex flex-wrap gap-1 mt-0.5 px-1',
            isOwn ? 'justify-end' : 'justify-start',
          )}
        >
          {reactions.map((r) => {
            const hasReacted = currentUserId
              ? r.user_ids.includes(currentUserId)
              : false;
            return (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact?.(message.message_id, r.emoji)}
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors',
                  hasReacted
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted',
                )}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] font-medium">
                  {r.user_ids.length}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
