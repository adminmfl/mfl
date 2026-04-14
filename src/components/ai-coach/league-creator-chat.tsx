'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Confetti from 'react-confetti';
import {
  Bot,
  Send,
  X,
  Loader2,
  Sparkles,
  Check,
  Pencil,
  CreditCard,
  PartyPopper,
  Trophy,
  ArrowRight,
  Calendar,
  Users,
  Timer,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLeague } from '@/contexts/league-context';
import { LeaguePlanPreview, type LeaguePlan } from './league-plan-preview';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeagueFields {
  league_name?: string;
  description?: string;
  num_teams?: number;
  max_participants?: number;
  start_date?: string;
  duration?: number;
  rest_days?: number;
  is_public?: boolean;
  is_exclusive?: boolean;
  // Profiling fields
  league_type?: string;
  intent?: string;
  age_range?: string;
  participant_mix?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type ViewState = 'chat' | 'plan' | 'summary' | 'payment' | 'success';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// ---------------------------------------------------------------------------
// Lightweight markdown renderer for AI assistant messages
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  // Match **bold**, *italic*, and `code`
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={match.index}>
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      // `code`
      parts.push(
        <code key={match.index} className="bg-muted-foreground/10 rounded px-1 py-0.5 text-xs font-mono">
          {match[6]}
        </code>
      );
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Required fields check
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS = ['league_name', 'num_teams', 'max_participants', 'start_date', 'duration'] as const;

function getMissingFields(fields: LeagueFields): string[] {
  return REQUIRED_FIELDS.filter(
    (f) => (fields as any)[f] === undefined || (fields as any)[f] === null || (fields as any)[f] === ''
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeagueCreatorChat() {
  const router = useRouter();
  const { refetch } = useLeague();

  // Dialog state
  const [open, setOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [fields, setFields] = useState<LeagueFields>({});
  const [isComplete, setIsComplete] = useState(false);

  // View state
  const [view, setView] = useState<ViewState>('chat');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [createdLeagueId, setCreatedLeagueId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Plan state
  const [plan, setPlan] = useState<LeaguePlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, view]);

  // Confetti on success
  useEffect(() => {
    if (view === 'success') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Load Razorpay script
  useEffect(() => {
    if (!open) return;
    const existing = document.querySelector('script[src*="razorpay"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, [open]);

  // Send initial greeting when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      sendMessage('Hi, I want to create a league', true);
    }
  }, [open]);

  // -------------------------------------------------------------------------
  // Send message to AI
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(async (text: string, isInitial = false) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    // Don't show the initial greeting as a user message
    if (!isInitial) {
      setMessages((prev) => [...prev, userMsg]);
    }
    setInput('');
    setSending(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      if (!isInitial) {
        history.push({ role: 'user', content: trimmed });
      }

      const res = await fetch('/api/ai-coach/league-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: isInitial ? [] : history.slice(-10),
          currentFields: fields,
        }),
      });

      const json = await res.json();

      if (json.success) {
        const msgContent = json.message || 'Got it! What else would you like to tell me about the league?';
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: msgContent,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (json.extractedFields) {
          setFields((prev) => ({ ...prev, ...json.extractedFields }));
        }
        if (json.isComplete) {
          setIsComplete(true);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: json.error || 'Something went wrong. Please try again.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Failed to connect. Please try again.',
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [sending, messages, fields]);

  // -------------------------------------------------------------------------
  // Plan generation
  // -------------------------------------------------------------------------

  const generatePlan = useCallback(async () => {
    if (!fields.duration || !fields.league_type || !fields.intent) return;
    setPlanLoading(true);
    try {
      const res = await fetch('/api/ai-coach/league-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league_type: fields.league_type,
          intent: fields.intent,
          age_range: fields.age_range || 'all',
          participant_mix: fields.participant_mix || 'mixed',
          duration: fields.duration,
          num_teams: fields.num_teams || 4,
          max_participants: fields.max_participants || 20,
        }),
      });
      const json = await res.json();
      if (json.success && json.plan) {
        setPlan(json.plan);
        if (json.plan.restDayRecommendation && !fields.rest_days) {
          setFields((prev) => ({ ...prev, rest_days: json.plan.restDayRecommendation }));
        }
        setView('plan');
      } else {
        // Fallback — skip plan, go to summary
        setView('summary');
      }
    } catch {
      setView('summary');
    } finally {
      setPlanLoading(false);
    }
  }, [fields]);

  const handlePlanAccept = useCallback((acceptedPlan: LeaguePlan, activities: string[]) => {
    setSelectedActivities(activities);
    setPlan(acceptedPlan);
    setView('summary');
  }, []);

  // -------------------------------------------------------------------------
  // Key handler
  // -------------------------------------------------------------------------

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // -------------------------------------------------------------------------
  // Payment flow
  // -------------------------------------------------------------------------

  const handleProceedToPayment = async () => {
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      // Calculate end date
      const startDate = new Date(fields.start_date!);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (fields.duration || 30) - 1);

      // Check league name uniqueness
      const checkRes = await fetch('/api/leagues/check-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_name: fields.league_name }),
      });
      const checkData = await checkRes.json();
      if (checkData.exists) {
        setPaymentError('This league name is already taken. Go back and choose a different name.');
        setPaymentLoading(false);
        return;
      }

      // Fetch tiers and auto-recommend
      const tiersRes = await fetch('/api/leagues/tiers');
      const tiersData = await tiersRes.json();
      const tiers = tiersData.data?.tiers || [];

      if (tiers.length === 0) {
        setPaymentError('No pricing tiers available. Please contact support.');
        setPaymentLoading(false);
        return;
      }

      // Find best tier
      const estimatedParticipants = fields.max_participants || (fields.num_teams || 4) * 5;
      const durationDays = fields.duration || 30;

      let bestTier = tiers[0];
      for (const tier of tiers) {
        if (
          tier.limits.max_days >= durationDays &&
          tier.limits.max_participants >= estimatedParticipants
        ) {
          bestTier = tier;
          break;
        }
      }

      const restDays = fields.rest_days ?? Math.round(durationDays * 0.2);

      const leagueData = {
        league_name: fields.league_name!,
        description: fields.description || null,
        start_date: fields.start_date!,
        end_date: format(endDate, 'yyyy-MM-dd'),
        tier_id: bestTier.tier_id,
        num_teams: fields.num_teams!,
        max_participants: fields.max_participants!,
        rest_days: restDays,
        is_public: fields.is_public ?? false,
        is_exclusive: fields.is_exclusive ?? true,
      };

      // Create payment order
      const orderRes = await fetch('/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueData }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // Open Razorpay
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'My Fitness League',
        description: `Payment for ${fields.league_name}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            if (verifyData.payment?.league_id) {
              setCreatedLeagueId(verifyData.payment.league_id);
            }

            setView('success');
            await refetch();
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setPaymentLoading(false);
          }
        },
        theme: { color: '#6366f1' },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
            setPaymentError('Payment was cancelled. You can try again.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Something went wrong');
      setPaymentLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  const handleReset = () => {
    setMessages([]);
    setFields({});
    setIsComplete(false);
    setView('chat');
    setPaymentError(null);
    setCreatedLeagueId(null);
    setPlan(null);
    setSelectedActivities([]);
  };

  const handleClose = () => {
    setOpen(false);
    // Don't reset — user might reopen
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const missing = getMissingFields(fields);
  const filledCount = REQUIRED_FIELDS.length - missing.length;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all px-4 py-3 md:bottom-6"
      >
        <Bot className="size-5" />
        <span className="text-sm font-medium">AI Assistant</span>
        <Sparkles className="size-4" />
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-purple-500/5 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bot className="size-5 text-primary" />
              League Creation Assistant
            </DialogTitle>
            <DialogDescription className="text-xs">
              {view === 'chat' && 'Tell me about the league you want to create'}
              {view === 'plan' && 'Review your AI-generated league plan'}
              {view === 'summary' && 'Review your league configuration'}
              {view === 'payment' && 'Complete payment to create your league'}
              {view === 'success' && 'Your league has been created!'}
            </DialogDescription>
            {/* Progress indicator */}
            {view === 'chat' && (
              <div className="flex items-center gap-1.5 mt-1">
                {REQUIRED_FIELDS.map((f) => (
                  <div
                    key={f}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all',
                      (fields as any)[f] !== undefined && (fields as any)[f] !== null && (fields as any)[f] !== ''
                        ? 'bg-primary'
                        : 'bg-muted-foreground/20'
                    )}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">
                  {filledCount}/{REQUIRED_FIELDS.length}
                </span>
              </div>
            )}
          </DialogHeader>

          {/* ============================================================ */}
          {/* CHAT VIEW */}
          {/* ============================================================ */}
          {view === 'chat' && (
            <>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[300px] max-h-[50vh]"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2 text-[13px]',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="size-3 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">Assistant</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                      </div>
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

                {/* Collected fields badges */}
                {Object.keys(fields).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {Object.entries(fields).map(([key, val]) =>
                      val !== undefined && val !== null && val !== '' ? (
                        <Badge key={key} variant="secondary" className="text-[10px] gap-1">
                          <Check className="size-2.5" />
                          {key.replace(/_/g, ' ')}
                        </Badge>
                      ) : null
                    )}
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="border-t px-3 py-2 shrink-0">
                {isComplete && (
                  <div className="mb-2">
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        if (fields.league_type && fields.intent && fields.duration) {
                          generatePlan();
                        } else {
                          setView('summary');
                        }
                      }}
                      disabled={planLoading}
                    >
                      {planLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                      {planLoading ? 'Generating Plan...' : fields.league_type ? 'Generate Plan & Review' : 'Review & Create League'}
                    </Button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isComplete ? 'Edit details or review summary...' : 'Describe your league...'}
                    className="min-h-[36px] max-h-24 resize-none text-sm py-2"
                    rows={1}
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    className="size-8 shrink-0"
                    disabled={!input.trim() || sending}
                    onClick={() => sendMessage(input)}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* PLAN VIEW */}
          {/* ============================================================ */}
          {view === 'plan' && plan && (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <LeaguePlanPreview
                plan={plan}
                duration={fields.duration || 30}
                onAccept={handlePlanAccept}
                onBack={() => setView('chat')}
              />
            </div>
          )}

          {/* ============================================================ */}
          {/* SUMMARY VIEW */}
          {/* ============================================================ */}
          {view === 'summary' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-base">{fields.league_name}</h3>
                {fields.description && (
                  <p className="text-sm text-muted-foreground">{fields.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="size-4 text-primary" />
                    <div>
                      <p className="font-medium">{fields.num_teams} teams</p>
                      <p className="text-[11px] text-muted-foreground">{fields.max_participants} players</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Timer className="size-4 text-primary" />
                    <div>
                      <p className="font-medium">{fields.duration} days</p>
                      <p className="text-[11px] text-muted-foreground">
                        {fields.rest_days ?? Math.round((fields.duration || 30) * 0.2)} rest days
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="size-4 text-primary" />
                    <div>
                      <p className="font-medium">Starts {fields.start_date}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Ends{' '}
                        {(() => {
                          const start = new Date(fields.start_date!);
                          start.setDate(start.getDate() + (fields.duration || 30) - 1);
                          return format(start, 'MMM d, yyyy');
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 text-primary" />
                    <div>
                      <p className="font-medium">{fields.is_public ? 'Public' : 'Private'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {fields.is_exclusive !== false ? 'Invite only' : 'Open join'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan summary */}
              {plan && selectedActivities.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">AI Plan Included</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedActivities.map((name) => (
                      <Badge key={name} variant="secondary" className="text-[10px]">{name}</Badge>
                    ))}
                  </div>
                  {plan.rrProfile && (
                    <p className="text-[10px] text-muted-foreground">
                      Scoring: {plan.rrProfile === 'standard' ? 'Standard RR' : plan.rrProfile === 'simple' ? 'Simple (binary)' : 'Points Only'}
                    </p>
                  )}
                </div>
              )}

              {paymentError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {paymentError}
                </div>
              )}

              <div className="space-y-2">
                <Button
                  className="w-full gap-2"
                  onClick={handleProceedToPayment}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="size-4" />
                      Pay & Create League
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setView('chat')}
                  disabled={paymentLoading}
                >
                  <Pencil className="size-4" />
                  Edit Details
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SUCCESS VIEW */}
          {/* ============================================================ */}
          {view === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
              {showConfetti && (
                <Confetti
                  width={450}
                  height={500}
                  recycle={false}
                  numberOfPieces={300}
                  gravity={0.2}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                />
              )}

              <div className="size-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center animate-bounce mb-4">
                <PartyPopper className="size-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-1">League Created!</h3>
              <p className="text-sm text-muted-foreground mb-6">
                <span className="font-semibold text-primary">{fields.league_name}</span> is ready to go.
              </p>

              <div className="grid grid-cols-3 gap-3 w-full mb-6">
                <div className="p-3 rounded-xl bg-primary/10 text-center border">
                  <p className="text-xl font-bold text-primary">{fields.num_teams}</p>
                  <p className="text-[11px] text-muted-foreground">Teams</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-center border">
                  <p className="text-xl font-bold text-primary">{fields.max_participants}</p>
                  <p className="text-[11px] text-muted-foreground">Players</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-center border">
                  <p className="text-xl font-bold text-primary">{fields.duration}</p>
                  <p className="text-[11px] text-muted-foreground">Days</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                {createdLeagueId && (
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      handleClose();
                      router.push(`/leagues/${createdLeagueId}`);
                    }}
                  >
                    Open League
                    <ArrowRight className="size-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    handleClose();
                    router.push('/leagues');
                  }}
                >
                  <Trophy className="size-4" />
                  View All Leagues
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
