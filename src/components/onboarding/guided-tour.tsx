'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dumbbell,
  Trophy,
  TrendingUp,
  Target,
  Activity,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell,
  Trophy,
  TrendingUp,
  Target,
  Activity,
};

// ---------------------------------------------------------------------------
// Fallback steps (used if DB fetch fails)
// ---------------------------------------------------------------------------

interface TourStep {
  title: string;
  description: string;
  icon_name: string;
  icon_color: string;
}

const FALLBACK_STEPS: TourStep[] = [
  {
    title: 'Submit Your Activity',
    description:
      'Log your daily workouts — running, yoga, cycling, gym, and more. Upload a screenshot as proof and the app calculates your effort score (Run Rate) automatically. Consistency is key — submit every day to maximize your team\'s score!',
    icon_name: 'Dumbbell',
    icon_color: 'text-green-500',
  },
  {
    title: 'Points & Scoring',
    description:
      'Every approved workout earns you points based on your Run Rate. The harder you push, the more points you earn (up to 2x). Your points add up to your team\'s total on the leaderboard. Team rankings are updated daily!',
    icon_name: 'Trophy',
    icon_color: 'text-amber-500',
  },
  {
    title: 'Run Rate (RR)',
    description:
      'Run Rate measures your workout intensity on a 0-2 scale. An RR of 1.0 means you met the minimum effort — anything above is bonus! RR is calculated from duration, distance, or steps depending on the activity. Age-adjusted thresholds ensure fairness for all.',
    icon_name: 'TrendingUp',
    icon_color: 'text-blue-500',
  },
  {
    title: 'Challenges',
    description:
      'Compete in special challenges for bonus points! Individual challenges test your personal limits, while team challenges bring everyone together. Watch for new challenge announcements from your host — they can be game-changers on the leaderboard.',
    icon_name: 'Target',
    icon_color: 'text-purple-500',
  },
  {
    title: 'Activities',
    description:
      'Choose from 15+ activity types across cardio, strength, flexibility, and wellness. Each activity has its own measurement — duration, distance, steps, or holes. Your host may also create custom activities specific to your league. Pick what you love and get moving!',
    icon_name: 'Activity',
    icon_color: 'text-red-500',
  },
];

const STORAGE_KEY = 'mfl_guided_tour_dismissed';

// ---------------------------------------------------------------------------
// Public API to re-open tour from Help menu
// ---------------------------------------------------------------------------

export function getPublicTourApi() {
  return {
    open: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      window.dispatchEvent(new Event('mfl:open-tour'));
    },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GuidedTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>(FALLBACK_STEPS);

  // Fetch steps from DB
  useEffect(() => {
    fetch('/api/admin/tour-steps')
      .then((res) => res.json())
      .then((json) => {
        const dbSteps = (json.steps || []).filter((s: any) => s.is_active !== false);
        if (dbSteps.length > 0) {
          setSteps(dbSteps);
        }
      })
      .catch(() => {
        // Use fallback steps
      });
  }, []);

  // Auto-open on first visit
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === 'true') return;
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    } catch {}
  }, []);

  // Listen for manual re-open from Help menu
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener('mfl:open-tour', handler);
    return () => window.removeEventListener('mfl:open-tour', handler);
  }, []);

  if (!open || steps.length === 0) return null;

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const Icon = ICON_MAP[currentStep.icon_name] || Activity;
  const iconColor = currentStep.icon_color || 'text-blue-500';

  const handleClose = () => {
    setOpen(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        {/* Icon area */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-transparent pt-8 pb-4 px-6">
          <div className="size-32 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Icon className={`size-16 ${iconColor}`} />
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-primary'
                    : i < step
                      ? 'w-1.5 bg-primary/40'
                      : 'w-1.5 bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-2">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg">{currentStep.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
              {currentStep.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-5 pt-3 flex-col gap-3 sm:flex-col">
          <div className="flex items-center justify-between w-full gap-3">
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
              Skip
            </Button>
            <div className="text-xs text-muted-foreground">
              {step + 1} of {steps.length}
            </div>
            <Button size="sm" onClick={handleNext}>
              {isLast ? 'Get Started' : 'Next'}
            </Button>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(v) => setDontShowAgain(v === true)}
            />
            <label
              htmlFor="dontShowAgain"
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              Don&apos;t show this again
            </label>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
