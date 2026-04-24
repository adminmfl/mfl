'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MentionMember {
  user_id: string;
  username: string;
  role?: string;
}

interface MentionDropdownProps {
  leagueId: string;
  teamId?: string | null;
  currentRole?: string | null;
  currentUserId?: string;
  query: string; // text after '@'
  visible: boolean;
  onSelect: (member: MentionMember) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

// ---------------------------------------------------------------------------
// Role badge colors (compact)
// ---------------------------------------------------------------------------

const ROLE_STYLE: Record<string, string> = {
  host: 'text-red-600 dark:text-red-400',
  governor: 'text-purple-600 dark:text-purple-400',
  captain: 'text-blue-600 dark:text-blue-400',
  player: 'text-muted-foreground',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MentionDropdown({
  leagueId,
  teamId,
  currentRole,
  currentUserId,
  query,
  visible,
  onSelect,
  onClose,
  position,
}: MentionDropdownProps) {
  const [members, setMembers] = useState<MentionMember[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch members once
  useEffect(() => {
    if (!leagueId) return;

    fetch(`/api/leagues/${leagueId}/members`)
      .then((r) => r.json())
      .then((json) => {
        const raw = json.data ?? json.members ?? json ?? [];
        const isLeader = currentRole === 'host' || currentRole === 'governor';

        const mapped: MentionMember[] = (Array.isArray(raw) ? raw : [])
          .map((m: any) => {
            const roles: string[] = Array.isArray(m.roles) ? m.roles : [];
            const role = roles.includes('host')
              ? 'host'
              : roles.includes('governor')
                ? 'governor'
                : roles.includes('captain')
                  ? 'captain'
                  : roles.includes('vice_captain')
                    ? 'vice_captain'
                    : roles.includes('player')
                      ? 'player'
                      : roles[0] || undefined;

            return {
              user_id: m.user_id,
              username: m.username || 'unknown',
              role,
              team_id: m.team_id as string | null,
            };
          })
          .filter((m: any) => {
            // Exclude self
            if (m.user_id === currentUserId) return false;
            // Host/Governor see all members
            if (isLeader) return true;
            // Player/Captain see: same team + host + governor
            if (m.role === 'host' || m.role === 'governor') return true;
            if (teamId && m.team_id === teamId) return true;
            return false;
          });

        setMembers(mapped);
      })
      .catch(() => {});
  }, [leagueId, teamId, currentRole, currentUserId]);

  // Filter by query
  const filtered = useMemo(() => {
    if (!query) return members.slice(0, 8);
    const q = query.toLowerCase();
    return members
      .filter((m) => m.username.toLowerCase().includes(q))
      .slice(0, 8);
  }, [members, query]);

  // Reset active index when filtered list changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0);
  }, [filtered.length, query]);

  // Keyboard navigation via global listener
  useEffect(() => {
    if (!visible || filtered.length === 0) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        onSelect(filtered[activeIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [visible, filtered, activeIndex, onSelect, onClose]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg py-1 w-56 max-h-48 overflow-y-auto"
      style={
        position
          ? { bottom: position.top, left: position.left }
          : { bottom: '100%', left: 0 }
      }
    >
      {filtered.map((member, i) => (
        <button
          key={member.user_id}
          type="button"
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors',
            i === activeIndex && 'bg-accent',
          )}
          onMouseDown={(e) => {
            e.preventDefault(); // prevent textarea blur
            onSelect(member);
          }}
          onMouseEnter={() => setActiveIndex(i)}
        >
          <span className="font-medium truncate">@{member.username}</span>
          {member.role && (
            <span
              className={cn(
                'text-[10px] capitalize ml-auto shrink-0',
                ROLE_STYLE[member.role] ?? ROLE_STYLE.player,
              )}
            >
              {member.role}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
