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

  // Only show badge when there are unread messages
  if (unread <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-red-500 text-white min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none',
        className
      )}
    >
      {unread > 99 ? '99+' : unread}
    </span>
  );
}
