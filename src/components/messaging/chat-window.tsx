'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, MessageCircle, Filter, ChevronDown } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getSupabase } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MessageBubble, type Message } from './message-bubble';
import { MessageInput } from './message-input';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 50;
const FALLBACK_POLL_INTERVAL = 30_000; // 30s fallback if realtime fails

type MessageFilter =
  | 'all'
  | 'announcements'
  | 'important'
  | 'host_messages'
  | 'captains_only';

const FILTER_OPTIONS: { value: MessageFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'host_messages', label: 'Host' },
  { value: 'captains_only', label: 'Captains Only' },
  { value: 'important', label: 'Important' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatWindowProps {
  leagueId: string;
  teamId?: string | null;
  teamName?: string;
  adminView?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatWindow({
  leagueId,
  teamId,
  teamName,
  adminView,
  onLoadingChange,
}: ChatWindowProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestFetchRef = useRef(0);

  const currentUserId = session?.user?.id;

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // -----------------------------------------------------------------------
  // Fetch messages (full reload from API)
  // -----------------------------------------------------------------------

  const fetchMessages = useCallback(
    async (isInitial = false) => {
      const fetchId = ++latestFetchRef.current;
      const startTime = Date.now();
      if (isInitial) setLoading(true);

      try {
        const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
        if (teamId) params.set('team_id', teamId);
        if (filter !== 'all') params.set('filter', filter);
        if (adminView) params.set('admin_view', 'true');

        const res = await fetch(
          `/api/leagues/${leagueId}/messages?${params.toString()}`,
        );
        if (!res.ok) throw new Error('Failed to load messages');

        const json = await res.json();
        if (fetchId !== latestFetchRef.current) return; // stale

        const raw: Message[] = json.data?.messages ?? json.messages ?? [];
        // API returns newest-first; reverse for chat (oldest at top, newest at bottom)
        const incoming = [...raw].reverse();
        setMessages(incoming);
        setError(null);

        // Mark unread messages as read
        const unread = incoming
          .filter((m) => !m.is_read && m.sender_id !== currentUserId)
          .map((m) => m.message_id);

        if (unread.length > 0) {
          fetch(`/api/leagues/${leagueId}/messages/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_ids: unread }),
          })
            .then(() => {
              // Notify badge to refetch immediately
              window.dispatchEvent(new Event('mfl:messages-read'));
            })
            .catch(() => { });
        }
      } catch {
        if (fetchId === latestFetchRef.current) {
          setError('Could not load messages. Please try again.');
        }
      } finally {
        if (fetchId === latestFetchRef.current && isInitial) {
          const elapsed = Date.now() - startTime;
          const minDuration = 500; // Minimum 500ms to show skeleton (avoid flash)

          if (elapsed < minDuration) {
            setTimeout(() => {
              setLoading(false);
            }, minDuration - elapsed);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [leagueId, teamId, currentUserId, filter, adminView],
  );

  // Initial fetch
  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // -----------------------------------------------------------------------
  // Supabase Realtime subscription
  // -----------------------------------------------------------------------

  useEffect(() => {
    const supabase = getSupabase();

    // Build a channel name unique to this league+team combo
    const channelName = teamId
      ? `messages:${leagueId}:${teamId}`
      : `messages:${leagueId}:broadcast`;

    // Subscribe to INSERT events on the messages table for this league
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `league_id=eq.${leagueId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg || newMsg.deleted_at) return;

          // Check if this message belongs to the current view
          const isRelevant = teamId
            ? newMsg.team_id === teamId || newMsg.team_id === null // team messages + broadcasts
            : adminView
              ? true // host/governor "All Teams" with admin view sees everything
              : newMsg.team_id === null; // broadcast-only view

          if (!isRelevant) return;

          // Refetch to get full message with sender info, role, is_read
          // (the realtime payload only has raw DB columns)
          fetchMessages(false);
        },
      )
      .subscribe((status) => {
        setRealtimeActive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, teamId, adminView, fetchMessages]);

  // -----------------------------------------------------------------------
  // Fallback polling (only if realtime is not active)
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (realtimeActive) return;

    const interval = setInterval(
      () => fetchMessages(false),
      FALLBACK_POLL_INTERVAL,
    );
    return () => clearInterval(interval);
  }, [realtimeActive, fetchMessages]);

  // -----------------------------------------------------------------------
  // Auto-scroll to bottom on new messages
  // -----------------------------------------------------------------------

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleMessageSent = useCallback(() => {
    setReplyTo(null);
    // Refetch immediately after sending (realtime will also catch it)
    fetchMessages(false);
  }, [fetchMessages]);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
  }, []);

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/messages/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: messageId, emoji }),
        });
        if (!res.ok) throw new Error('Failed to react');
        // Refetch to update reaction counts
        fetchMessages(false);
      } catch {
        toast.error('Failed to add reaction');
      }
    },
    [leagueId, fetchMessages],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {teamName && (
        <div className="flex items-center gap-2 border-b px-4 py-3 shrink-0">
          <MessageCircle className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{teamName}</h2>

          {/* Filter dropdown */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                >
                  <Filter className="size-3" />
                  {FILTER_OPTIONS.find((o) => o.value === filter)?.label ??
                    'All'}
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {FILTER_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className={cn(filter === opt.value && 'bg-accent')}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {realtimeActive && (
            <span
              className="size-2 rounded-full bg-green-500 shrink-0"
              title="Live"
            />
          )}
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 overflow-hidden" ref={scrollRef}>
        <div className="flex flex-col gap-3 px-4 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">{error}</p>
              <button
                type="button"
                onClick={() => fetchMessages(true)}
                className="mt-2 text-sm text-primary underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {filter !== 'all' ? `No ${filter} messages` : 'No messages yet'}
              </p>
              <p className="text-xs mt-1">
                {filter !== 'all'
                  ? 'Try switching to "All" to see all messages.'
                  : 'Be the first to start the conversation!'}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            messages.map((msg) => (
              <MessageBubble
                key={msg.message_id}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                currentUserId={currentUserId}
                onReply={handleReply}
                onReact={handleReact}
              />
            ))}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <MessageInput
        leagueId={leagueId}
        teamId={teamId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onMessageSent={handleMessageSent}
        onOptimisticMessage={(msg) => {
          setMessages((prev) => [...prev, msg]);
        }}
      />
    </div>
  );
}
