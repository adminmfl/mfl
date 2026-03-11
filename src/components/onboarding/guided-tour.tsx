'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Tour steps config
// ---------------------------------------------------------------------------

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  lottieFile: string; // filename in /public/lottie/
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Submit Your Activity',
    description:
      'Log your daily workouts — running, yoga, cycling, gym, and more. Upload a screenshot as proof and the app calculates your effort score (Run Rate) automatically. Consistency is key — submit every day to maximize your team\'s score!',
    icon: Dumbbell,
    iconColor: 'text-green-500',
    lottieFile: 'submit-activity.json',
  },
  {
    title: 'Points & Scoring',
    description:
      'Every approved workout earns you points based on your Run Rate. The harder you push, the more points you earn (up to 2x). Your points add up to your team\'s total on the leaderboard. Team rankings are updated daily!',
    icon: Trophy,
    iconColor: 'text-amber-500',
    lottieFile: 'points.json',
  },
  {
    title: 'Run Rate (RR)',
    description:
      'Run Rate measures your workout intensity on a 0-2 scale. An RR of 1.0 means you met the minimum effort — anything above is bonus! RR is calculated from duration, distance, or steps depending on the activity. Age-adjusted thresholds ensure fairness for all.',
    icon: TrendingUp,
    iconColor: 'text-blue-500',
    lottieFile: 'run-rate.json',
  },
  {
    title: 'Challenges',
    description:
      'Compete in special challenges for bonus points! Individual challenges test your personal limits, while team challenges bring everyone together. Watch for new challenge announcements from your host — they can be game-changers on the leaderboard.',
    icon: Target,
    iconColor: 'text-purple-500',
    lottieFile: 'challenges.json',
  },
  {
    title: 'Activities',
    description:
      'Choose from 15+ activity types across cardio, strength, flexibility, and wellness. Each activity has its own measurement — duration, distance, steps, or holes. Your host may also create custom activities specific to your league. Pick what you love and get moving!',
    icon: Activity,
    iconColor: 'text-red-500',
    lottieFile: 'activities.json',
  },
];

const STORAGE_KEY = 'mfl_guided_tour_dismissed';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GuidedTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage — don't show if dismissed
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === 'true') return;
      // Small delay so the main UI renders first
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    } catch {
      // localStorage not available
    }
  }, []);

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const Icon = currentStep.icon;

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

  const handleSkip = () => {
    handleClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        {/* Lottie / Icon area */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-transparent pt-8 pb-4 px-6">
          {/* Lottie placeholder — replace with actual Lottie player */}
          <div className="size-32 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <LottieOrIcon
              lottieFile={currentStep.lottieFile}
              Icon={Icon}
              iconColor={currentStep.iconColor}
            />
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
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
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
              Skip
            </Button>
            <div className="text-xs text-muted-foreground">
              {step + 1} of {TOUR_STEPS.length}
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

// ---------------------------------------------------------------------------
// Lottie player (with icon fallback)
// ---------------------------------------------------------------------------

function LottieOrIcon({
  lottieFile,
  Icon,
  iconColor,
}: {
  lottieFile: string;
  Icon: React.ElementType;
  iconColor: string;
}) {
  const [LottiePlayer, setLottiePlayer] = useState<any>(null);
  const [hasLottie, setHasLottie] = useState(false);

  useEffect(() => {
    // Try to dynamically import lottie-react
    import('lottie-react')
      .then((mod) => {
        setLottiePlayer(() => mod.default);
      })
      .catch(() => {
        // lottie-react not installed — use icon fallback
      });
  }, []);

  useEffect(() => {
    // Check if the lottie file exists
    fetch(`/lottie/${lottieFile}`, { method: 'HEAD' })
      .then((res) => setHasLottie(res.ok))
      .catch(() => setHasLottie(false));
  }, [lottieFile]);

  if (LottiePlayer && hasLottie) {
    return (
      <LottiePlayerWrapper
        Player={LottiePlayer}
        src={`/lottie/${lottieFile}`}
      />
    );
  }

  // Fallback to icon
  return <Icon className={`size-16 ${iconColor}`} />;
}

function LottiePlayerWrapper({ Player, src }: { Player: any; src: string }) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch(src)
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, [src]);

  if (!animationData) return null;

  return (
    <Player
      animationData={animationData}
      loop
      autoplay
      style={{ width: 120, height: 120 }}
    />
  );
}
