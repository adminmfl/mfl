'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface CoachChatWidgetProps {
  leagueId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoachChatWidget({ leagueId }: CoachChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history when opened
  useEffect(() => {
    if (!isOpen || hasLoaded || !leagueId) return;

    fetch(`/api/leagues/${leagueId}/ai-coach/chat-history`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMessages(json.messages || []);
      })
      .catch(() => {})
      .finally(() => setHasLoaded(true));
  }, [isOpen, hasLoaded, leagueId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`/api/leagues/${leagueId}/ai-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });

      const json = await res.json();

      if (json.success && json.answer) {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: json.answer,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: json.error || 'Sorry, something went wrong. Please try again.',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Failed to connect. Please try again.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-50 size-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center md:bottom-6"
        >
          <Bot className="size-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:bottom-6 sm:right-4 sm:w-[380px] flex flex-col bg-background border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] sm:max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">League Assistant</p>
                <p className="text-[10px] text-muted-foreground">
                  Ask about rules, scoring, activities...
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]"
          >
            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Ask me anything about your league!
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {[
                    'How is Run Rate calculated?',
                    'What activities can I log?',
                    'How do challenges work?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-accent text-muted-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="size-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary">Coach</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed text-[13px]">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2 flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="min-h-[36px] max-h-24 resize-none text-sm py-2"
              rows={1}
              disabled={sending}
            />
            <Button
              size="icon"
              className="size-8 shrink-0"
              disabled={!input.trim() || sending}
              onClick={handleSend}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
