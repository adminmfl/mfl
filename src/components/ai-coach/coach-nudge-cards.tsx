'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Flame,
  Trophy,
  Target,
  Users,
  HeartHandshake,
  X,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoachMessage {
  id: string;
  message_type: 'individual' | 'team' | 'captain' | 'bonding' | 'challenge';
  content: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

interface CoachNudgeCardsProps {
  leagueId: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, { icon: typeof Bot; color: string; label: string; bg: string }> = {
  individual: {
    icon: Flame,
    color: 'text-orange-500',
    label: 'Daily Motivation',
    bg: 'from-orange-500/10 to-transparent',
  },
  team: {
    icon: Trophy,
    color: 'text-blue-500',
    label: 'Team Spirit',
    bg: 'from-blue-500/10 to-transparent',
  },
  captain: {
    icon: Target,
    color: 'text-purple-500',
    label: 'Captain Intel',
    bg: 'from-purple-500/10 to-transparent',
  },
  challenge: {
    icon: Sparkles,
    color: 'text-amber-500',
    label: 'Challenge Alert',
    bg: 'from-amber-500/10 to-transparent',
  },
  bonding: {
    icon: HeartHandshake,
    color: 'text-pink-500',
    label: 'Team Bonding',
    bg: 'from-pink-500/10 to-transparent',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoachNudgeCards({ leagueId }: CoachNudgeCardsProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;

    fetch(`/api/leagues/${leagueId}/ai-coach?limit=5`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMessages(json.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leagueId]);

  const handleDismiss = async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    fetch(`/api/leagues/${leagueId}/ai-coach`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: [messageId], action: 'dismiss' }),
    }).catch(() => {});
  };

  const handleMarkRead = async (messageId: string) => {
    fetch(`/api/leagues/${leagueId}/ai-coach`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: [messageId], action: 'read' }),
    }).catch(() => {});
  };

  if (loading || messages.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Bot className="size-4 text-primary" />
        <span className="text-sm font-medium">AI Coach</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {messages.map((msg) => {
          const config = TYPE_CONFIG[msg.message_type] || TYPE_CONFIG.individual;
          const Icon = config.icon;

          return (
            <Card
              key={msg.id}
              className={cn(
                'min-w-[280px] max-w-[320px] snap-start shrink-0 relative overflow-hidden border',
                !msg.is_read && 'ring-1 ring-primary/20'
              )}
              onMouseEnter={() => {
                if (!msg.is_read) handleMarkRead(msg.id);
              }}
            >
              <div className={cn('absolute inset-0 bg-gradient-to-br', config.bg)} />
              <CardContent className="relative p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className={cn('size-3.5', config.color)} />
                    <span className={cn('text-[11px] font-semibold', config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDismiss(msg.id)}
                    className="p-0.5 rounded hover:bg-accent text-muted-foreground shrink-0"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed line-clamp-4">
                  {msg.content}
                </p>
                <div className="text-[10px] text-muted-foreground mt-2">
                  {new Date(msg.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
