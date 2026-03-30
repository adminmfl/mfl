'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 30_000; // 30 seconds

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageBadgeProps {
  leagueId: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageBadge({ leagueId, className }: MessageBadgeProps) {
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const latestRef = useRef(0);

  useEffect(() => {
    if (!leagueId) return;

    let cancelled = false;

    async function fetchCount() {
      const fetchId = ++latestRef.current;
      try {
        const res = await fetch(
          `/api/leagues/${leagueId}/messages/unread-count`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && fetchId === latestRef.current) {
          setUnread(data.data?.unread ?? data.data?.count ?? 0);
          setTotal(data.data?.total ?? 0);
        }
      } catch {
        // silently ignore
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);

    // Listen for messages-read event (fired by ChatWindow after marking read)
    const handleRead = () => fetchCount();
    window.addEventListener('mfl:messages-read', handleRead);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('mfl:messages-read', handleRead);
    };
  }, [leagueId]);

  // Nothing to show if no messages at all
  if (total <= 0 && unread <= 0) return null;

  // If unread = 0, show only total in muted style
  if (unread <= 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center text-[10px] font-medium leading-none text-muted-foreground',
          className
        )}
      >
        {total > 999 ? '999+' : total}
      </span>
    );
  }

  // Show unread / total format
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-bold leading-none',
        className
      )}
    >
      <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white min-w-[18px] h-[18px] px-1">
        {unread > 99 ? '99+' : unread}
      </span>
      <span className="text-muted-foreground font-normal">
        /{total > 999 ? '999+' : total}
      </span>
    </span>
  );
}
