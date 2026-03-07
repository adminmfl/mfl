'use client';

import { useState, useEffect } from 'react';
import { MessageSquareText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CannedMessage {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface CannedMessagePickerProps {
  leagueId: string;
  onSelect: (content: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CannedMessagePicker({
  leagueId,
  onSelect,
}: CannedMessagePickerProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CannedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!open || fetched) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leagues/${leagueId}/canned-messages`);
        if (!res.ok) throw new Error('Failed to load canned messages');
        const json = await res.json();
        if (!cancelled) {
          const raw: any[] = json.data ?? json.canned_messages ?? [];
          setMessages(
            raw.map((m: any) => ({
              id: m.canned_message_id ?? m.id,
              title: m.title,
              content: m.content,
              category: m.role_target ?? m.category ?? 'General',
            }))
          );
          setFetched(true);
        }
      } catch {
        // silently fail – popover will show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, fetched, leagueId]);

  // Group by category
  const grouped = messages.reduce<Record<string, CannedMessage[]>>(
    (acc, msg) => {
      const cat = msg.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(msg);
      return acc;
    },
    {}
  );

  const categories = Object.keys(grouped).sort();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          title="Canned messages"
        >
          <MessageSquareText className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="px-4 py-3">
          <h4 className="text-sm font-semibold">Quick Messages</h4>
          <p className="text-xs text-muted-foreground">
            Click to insert into your message
          </p>
        </div>
        <Separator />
        <ScrollArea className="h-64">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquareText className="size-8 mb-2 opacity-40" />
              <p className="text-sm">No canned messages yet</p>
            </div>
          )}

          {!loading &&
            categories.map((category) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                  {category}
                </div>
                {grouped[category].map((msg) => (
                  <button
                    key={msg.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors"
                    onClick={() => {
                      onSelect(msg.content);
                      setOpen(false);
                    }}
                  >
                    <p className="text-sm font-medium leading-tight">
                      {msg.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {msg.content}
                    </p>
                  </button>
                ))}
              </div>
            ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
