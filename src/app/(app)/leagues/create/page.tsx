'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import Confetti from 'react-confetti';
import {
  ArrowRight,
  Loader2,
  Sparkles,
  PartyPopper,
  Trophy,
  CreditCard,
  IndianRupee,
  Info,
  FileText,
} from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import {
  TierConfig,
  PriceBreakdown,
  TierValidationResult,
  recommendTier,
  TierRecommendation,
} from '@/lib/services/tier-helpers';
import { LeagueFormSection } from '@/components/league/league-form-section';
import { TierRecommendationCard } from '@/components/league/tier-recommendation-card';
import { TiersModal } from '@/components/league/tiers-modal';
import { LeagueCreatorChat } from '@/components/ai-coach/league-creator-chat';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type FormData = {
  league_name: string;
  description: string;
  num_teams: string;
  max_participants: string;
  rest_days: string;
  is_public: boolean;
  is_exclusive: boolean;
};

export default function CreateLeaguePage() {
  const router = useRouter();
  const { refetch } = useLeague();

  // UI State
  const [step, setStep] = React.useState<'form' | 'success'>('form');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });
  const [tiersModalOpen, setTiersModalOpen] = React.useState(false);
  const [createdLeagueId, setCreatedLeagueId] = React.useState<string | null>(null);

  // Data State
  const [tiers, setTiers] = React.useState<TierConfig[]>([]);
  const [formData, setFormData] = React.useState<FormData>({
    league_name: '',
    description: '',
    num_teams: '',
    max_participants: '',
    rest_days: '',
    is_public: false,
    is_exclusive: true,
  });

  // Date/Duration State
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [duration, setDuration] = React.useState();
  const [endDate, setEndDate] = React.useState<Date | undefined>();

  // Tier & Pricing State
  const [selectedTierId, setSelectedTierId] = React.useState<string | null>(null);
  const [recommendation, setRecommendation] = React.useState<TierRecommendation | null>(null);
  const [pricePreview, setPricePreview] = React.useState<PriceBreakdown | null>(null);
  const [validation, setValidation] = React.useState<TierValidationResult | null>(null);
  const [loadingPrice, setLoadingPrice] = React.useState(false);

  // Window size for confetti
  React.useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Confetti on success
  React.useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Initialize start date
  const startOfTodayLocal = React.useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  React.useEffect(() => {
    if (!startDate) {
      setStartDate(startOfTodayLocal());
    }
  }, [startDate, startOfTodayLocal]);

  // Update end date when start date or duration changes
  React.useEffect(() => {
    if (startDate && duration > 0) {
      const end = new Date(startDate);
      end.setDate(end.getDate() + duration - 1);
      end.setHours(0, 0, 0, 0);
      setEndDate(end);
    }
  }, [startDate, duration]);

  // Auto-calculate rest days (20% of duration)
  React.useEffect(() => {
    const calculatedRestDays = Math.round(duration * 0.20);
    setFormData(prev => ({
      ...prev,
      rest_days: calculatedRestDays.toString()
    }));
  }, [duration]);

  // Fetch tiers on mount
  React.useEffect(() => {
    const fetchTiers = async () => {
      try {
        const res = await fetch('/api/leagues/tiers');
        const json = await res.json();
        if (!res.ok || !json.success) {
          console.error('Failed to fetch tiers:', json.error);
          return;
        }
        const tierList: TierConfig[] = json.data?.tiers || [];
        setTiers(tierList);
      } catch (err) {
        console.error('Failed to fetch tiers:', err);
      }
    };
    fetchTiers();
  }, []);

  // Recommend tier when form data changes (shows recommendation but doesn't auto-select)
  React.useEffect(() => {
    if (tiers.length === 0) return;

    const estimatedParticipants = parseInt(formData.max_participants) || parseInt(formData.num_teams) * 5;
    const rec = recommendTier(tiers, duration, estimatedParticipants);
    setRecommendation(rec);

    // Clear selected tier when form changes so user must confirm new recommendation
    setSelectedTierId(null);
  }, [tiers, duration, formData]);

  // Fetch price preview when tier or form changes
  React.useEffect(() => {
    if (!selectedTierId || !duration) {
      setPricePreview(null);
      setValidation(null);
      return;
    }

    const tier = tiers.find(t => t.tier_id === selectedTierId);
    if (!tier) return;

    // For fixed price tiers, use the fixed price directly
    if (tier.pricing.pricing_type === 'fixed' && tier.pricing.fixed_price) {
      const fixedTotal = tier.pricing.fixed_price;
      const gstAmount = (fixedTotal * (tier.pricing.gst_percentage || 18)) / 100;
      setPricePreview({
        total: fixedTotal + gstAmount,
        subtotal: fixedTotal,
        gst_amount: gstAmount,
        pricing_type: 'fixed',
        duration_days: duration,
        breakdown_details: [
          `Base Price: ₹${fixedTotal.toFixed(2)}`,
          `GST (${tier.pricing.gst_percentage || 18}%): ₹${gstAmount.toFixed(2)}`,
        ],
      });
      setValidation({ valid: true, errors: [], warnings: [] });
      return;
    }

    // For dynamic pricing, fetch preview
    const estimatedParticipants = parseInt(formData.max_participants) || parseInt(formData.num_teams) * 5;

    const fetchPreview = async () => {
      setLoadingPrice(true);
      try {
        const res = await fetch('/api/tiers/preview-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier_id: selectedTierId,
            duration_days: duration,
            estimated_participants: estimatedParticipants,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setPricePreview(json.price_breakdown);
          setValidation(json.validation);
        } else {
          setValidation(json.validation || null);
          setPricePreview(null);
        }
      } catch (err) {
        console.error('Price preview error:', err);
        setPricePreview(null);
        setValidation(null);
      } finally {
        setLoadingPrice(false);
      }
    };

    const timeout = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timeout);
  }, [selectedTierId, duration, formData.num_teams, formData.max_participants]);

  // Load Razorpay script
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedTier = React.useMemo(
    () => tiers.find((t) => t.tier_id === selectedTierId) || null,
    [tiers, selectedTierId]
  );
  const estimatedParticipants = React.useMemo(() => {
    const maxParticipants = parseInt(formData.max_participants);
    if (!Number.isNaN(maxParticipants) && maxParticipants > 0) return maxParticipants;
    const numTeams = parseInt(formData.num_teams);
    return Number.isNaN(numTeams) ? 0 : numTeams * 5;
  }, [formData.max_participants, formData.num_teams]);

  const handleCreateLeague = async () => {
    if (!formData.league_name.trim()) {
      setError('Please enter a league name');
      return;
    }
    if (!selectedTierId) {
      setError('Please select a tier');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select league dates');
      return;
    }
    if (validation && !validation.valid) {
      setError('Please fix validation errors before proceeding');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if league name already exists
      const checkNameRes = await fetch('/api/leagues/check-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_name: formData.league_name.trim() }),
      });

      const checkNameData = await checkNameRes.json();

      if (!checkNameRes.ok || checkNameData.exists) {
        setError('This league name is already taken. Please choose a different name.');
        setLoading(false);
        return;
      }

      const leagueData = {
        league_name: formData.league_name.trim(),
        description: formData.description.trim() || null,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        tier_id: selectedTierId,
        num_teams: parseInt(formData.num_teams),
        max_participants: parseInt(formData.max_participants),
        rest_days: parseInt(formData.rest_days),
        is_public: formData.is_public,
        is_exclusive: formData.is_exclusive,
      };

      const orderRes = await fetch('/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueData }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'My Fitness League',
        description: `Payment for ${formData.league_name}`,
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

            setStep('success');
            await refetch();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment verification failed');
            setLoading(false);
          }
        },
        prefill: {},
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setError('Payment was cancelled');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league');
      setLoading(false);
    }
  };

  // Success State
  if (step === 'success') {
    return (
      <>
        {showConfetti && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.2}
            colors={['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']}
          />
        )}

        <Dialog open={true}>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto mb-4">
                <div className="size-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center animate-bounce">
                  <PartyPopper className="size-10 text-white" />
                </div>
              </div>
              <DialogTitle className="text-2xl">League Created!</DialogTitle>
              <DialogDescription className="text-base">
                <span className="font-semibold text-primary">{formData.league_name}</span> has been created successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 py-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center border">
                <p className="text-2xl font-bold text-primary">{formData.num_teams}</p>
                <p className="text-xs text-muted-foreground">Teams</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center border">
                <p className="text-2xl font-bold text-primary">{parseInt(formData.max_participants)}</p>
                <p className="text-xs text-muted-foreground">Capacity</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center border">
                <p className="text-2xl font-bold text-primary">{duration}</p>
                <p className="text-xs text-muted-foreground">Days</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/leagues">
                  <Trophy className="mr-2 size-4" />
                  View All Leagues
                </Link>
              </Button>
              {createdLeagueId && (
                <Button asChild className="flex-1">
                  <Link href={`/leagues/${createdLeagueId}`}>
                    Open League
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex flex-1 flex-col items-center justify-center p-4" />
      </>
    );
  }

  // Main Form State
  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            Create a League
          </h1>
          <p className="text-muted-foreground">
            Set up your fitness league and invite participants
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form Area - 2 columns on desktop */}
          <div className="lg:col-span-2 space-y-6">
            <LeagueFormSection
              formData={formData}
              startDate={startDate}
              endDate={endDate}
              duration={duration}
              onFormChange={handleFormChange}
              onStartDateChange={setStartDate}
              onDurationChange={setDuration}
              maxDuration={365}
              error={error}
            />
          </div>

          {/* Sidebar - Tier Recommendation & Summary */}
          <div className="space-y-6">
            {/* Tier Recommendation Card - Always shows when recommendation exists */}
            {recommendation && (
              <>
                <TierRecommendationCard
                  recommendation={recommendation}
                  tier={tiers.find(t => t.tier_id === recommendation.tier_id) || null}
                  priceBreakdown={pricePreview}
                  isLoading={loadingPrice}
                  onViewAllTiers={() => setTiersModalOpen(true)}
                  onChangeTier={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />

                {/* Confirm Button - Shows if no tier selected OR if recommendation changed */}
                {(!selectedTierId || selectedTierId !== recommendation.tier_id) && (
                  <Button
                    onClick={() => setSelectedTierId(recommendation.tier_id)}
                    size="lg"
                    className="w-full"
                  >
                    Confirm Recommendation
                  </Button>
                )}

                {/* Tiers Modal */}
                <TiersModal
                  open={tiersModalOpen}
                  onOpenChange={setTiersModalOpen}
                  tiers={tiers}
                  selectedTierId={selectedTierId}
                  recommendedTierId={recommendation?.tier_id}
                  durationDays={duration}
                  estimatedParticipants={estimatedParticipants}
                  onSelectTier={(tierId) => {
                    setSelectedTierId(tierId);
                    setTiersModalOpen(false);
                  }}
                />
              </>
            )}

            {/* Validation & Price Summary Card - Shows only after tier selected */}
            {selectedTier && (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    Summary
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Info className="size-3" />
                    Review pricing & details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pricing */}
                  {loadingPrice ? (
                    <div className="text-sm text-muted-foreground">Calculating price...</div>
                  ) : pricePreview ? (
                    <div className="space-y-3">
                      {pricePreview.breakdown_details && (
                        <div className="text-xs space-y-1 text-muted-foreground">
                          {pricePreview.breakdown_details.map((detail, idx) => (
                            <p key={idx}>{detail}</p>
                          ))}
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary flex items-center">
                          <IndianRupee className="size-4" />
                          {pricePreview.total.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Validation Errors */}
                  {validation && !validation.valid && (
                    <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20 text-sm">
                      <h4 className="font-semibold text-destructive mb-1">Errors</h4>
                      <ul className="text-xs text-destructive space-y-1">
                        {validation.errors.map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {validation?.warnings.length > 0 && (
                    <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 border border-yellow-200 dark:border-yellow-800 text-sm">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Warnings</h4>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                        {validation.warnings.map((warn, idx) => (
                          <li key={idx}>• {warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold flex items-center gap-2">
                        <CreditCard className="size-4 text-primary" />
                        Payment & Create
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-4 h-4 w-4 rounded-full p-0">
                            <Info className="size-3 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[calc(100vw-2rem)] max-w-xs sm:max-w-xs" side="bottom" align="start" sideOffset={8}>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold">Payment Process</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Clicking "Pay & Create" redirects you to Razorpay's secure payment gateway. Once payment is verified, your league will be created automatically.
                            </p>
                            <p className="text-xs text-muted-foreground pt-1 border-t">
                              <strong>Note:</strong> Make sure all errors are fixed before proceeding. The button is disabled if there are validation errors.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      onClick={handleCreateLeague}
                      disabled={loading || !pricePreview || !validation?.valid}
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="mr-2 size-4" />
                          Pay & Create
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="pt-2 border-t text-xs text-muted-foreground flex gap-2">
                    <Info className="size-3 flex-shrink-0 mt-0.5" />
                    <p>Payment required to create. Modify settings after creation.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* AI League Creation Assistant */}
      <LeagueCreatorChat />
    </div>
  );
}
