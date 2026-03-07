'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Megaphone, ExternalLink, Pencil, Shield, Check, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Message {
  message_id: string;
  league_id: string;
  team_id: string | null;
  sender_id: string;
  content: string;
  message_type: 'chat' | 'announcement' | 'system';
  visibility: 'all' | 'captains_only';
  is_important: boolean;
  deep_link: string | null;
  created_at: string;
  edited_at: string | null;
  sender_name?: string;
  sender_username?: string;
  sender_role: string;
  is_read?: boolean;
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

/** Very lightweight markdown-lite: **bold**, [text](url) links, @[name] mentions */
function renderContent(content: string) {
  const parts: (string | JSX.Element)[] = [];
  // Matches: **bold**, @[username](user_id) (legacy), @[username] (new), [text](url)
  const regex = /(\*\*(.+?)\*\*)|(@\[([^\]]+)\](?:\([^)]+\))?)|(\[([^\]]+)\]\(([^)]+)\))/g;
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
        </strong>
      );
    } else if (match[3]) {
      // @mention — @[username] or @[username](user_id)
      parts.push(
        <span
          key={match.index}
          className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded px-0.5"
        >
          @{match[4]}
        </span>
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
        )
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
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const relativeTime = useMemo(
    () => formatRelativeTime(message.created_at),
    [message.created_at]
  );

  const isAnnouncement = message.message_type === 'announcement';
  const isSystem = message.message_type === 'system';

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
        'flex flex-col max-w-[85%] sm:max-w-[70%] gap-0.5',
        isOwn ? 'self-end items-end' : 'self-start items-start'
      )}
    >
      {/* Sender info */}
      {!isOwn && (
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-xs font-medium text-foreground">
            {message.sender_name || message.sender_username || 'Unknown'}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-4 capitalize',
              ROLE_COLORS[message.sender_role] ?? ROLE_COLORS.player
            )}
          >
            {message.sender_role}
          </Badge>
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          'rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
          isAnnouncement
            ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-foreground'
            : isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
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

        {/* Content */}
        <p>{renderContent(message.content)}</p>

        {/* Deep link card */}
        {message.deep_link && (
          <Link
            href={message.deep_link}
            className={cn(
              'mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
              'bg-background/50 hover:bg-background/80 border-border text-foreground'
            )}
          >
            <ExternalLink className="size-3.5 shrink-0" />
            <span className="truncate">{message.deep_link}</span>
          </Link>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[10px] text-muted-foreground">{relativeTime}</span>
        {message.edited_at && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Pencil className="size-2.5" />
            edited
          </span>
        )}
        {message.visibility === 'captains_only' && (
          <span className="flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400">
            <Shield className="size-2.5" />
            Captains Only
          </span>
        )}
        {isOwn && (
          message.is_read
            ? <CheckCheck className="size-3 text-blue-500" />
            : <Check className="size-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
