'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import Confetti from 'react-confetti';
import {
  Zap,
  Calendar,
  Users,
  Dumbbell,
  Building2,
  Home,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Clock,
  Trophy,
  PartyPopper,
} from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

type Template = {
  id: '40_day' | '60_day' | '90_day_pfl';
  title: string;
  subtitle: string;
  duration: number;
  activities: number;
  restDays: number;
  activityList: string[];
};

const TEMPLATES: Template[] = [
  {
    id: '40_day',
    title: '40-Day League',
    subtitle:
      'Perfect for a focused fitness sprint. 40 days, 5 core activities.',
    duration: 40,
    activities: 5,
    restDays: 8,
    activityList: ['Running', 'Walking', 'Cycling', 'Yoga', 'Gym'],
  },
  {
    id: '60_day',
    title: '60-Day League',
    subtitle: 'Full fitness journey. 60 days, all activities included.',
    duration: 60,
    activities: 8,
    restDays: 12,
    activityList: [
      'Running',
      'Walking',
      'Cycling',
      'Yoga',
      'Gym',
      'Swimming',
      'Sports',
      'Dance',
    ],
  },
  {
    id: '90_day_pfl',
    title: '90-Day PFL Format',
    subtitle:
      'The full Pristine Fitness League format. 90 days, 18 rest days, 10 activities including Golf & Steps.',
    duration: 90,
    activities: 10,
    restDays: 18,
    activityList: [
      'Running',
      'Walking',
      'Cycling',
      'Yoga',
      'Gym',
      'Swimming',
      'Dance',
      'Sports',
      'Steps',
      'Golf',
    ],
  },
];

type LeagueType = 'corporate' | 'residential';

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function QuickStartPage() {
  const router = useRouter();
  const { refetch } = useLeague();

  // Wizard state
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  // Step 1
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<Template | null>(null);

  // Step 2
  const [leagueType, setLeagueType] = React.useState<LeagueType>('corporate');
  const [playerCount, setPlayerCount] = React.useState<number>(20);
  const [leagueName, setLeagueName] = React.useState('');
  const [startDate, setStartDate] = React.useState(() => {
    const tomorrow = addDays(new Date(), 1);
    return format(tomorrow, 'yyyy-MM-dd');
  });

  // Success
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });

  // Window size for confetti
  React.useEffect(() => {
    const update = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Derived values
  const autoName = React.useMemo(() => {
    if (!selectedTemplate) return '';
    const typeLabel = leagueType === 'corporate' ? 'Corporate' : 'Residential';
    return `${typeLabel} ${selectedTemplate.duration}-Day League`;
  }, [selectedTemplate, leagueType]);

  const effectiveName = leagueName.trim() || autoName;

  const teamCount = React.useMemo(() => {
    if (playerCount <= 8) return 2;
    if (playerCount <= 15) return 3;
    if (playerCount <= 24) return 4;
    if (playerCount <= 40) return 5;
    if (playerCount <= 60) return 6;
    if (playerCount <= 80) return 8;
    if (playerCount <= 100) return 10;
    return 12;
  }, [playerCount]);

  const endDate = React.useMemo(() => {
    if (!selectedTemplate) return '';
    const start = new Date(startDate + 'T00:00:00');
    const end = addDays(start, selectedTemplate.duration - 1);
    return format(end, 'yyyy-MM-dd');
  }, [startDate, selectedTemplate]);

  // Handlers
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setStep(2);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleNext = () => {
    if (step === 2) {
      if (playerCount < 4 || playerCount > 120) {
        toast.error('Player count must be between 4 and 120.');
        return;
      }
      setStep(3);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const payload = {
        template: selectedTemplate.id,
        league_name: effectiveName,
        league_type: leagueType,
        player_count: playerCount,
        num_teams: teamCount,
        start_date: startDate,
        end_date: endDate,
        duration: selectedTemplate.duration,
        rest_days: selectedTemplate.restDays,
        activities: selectedTemplate.activityList,
      };

      const res = await fetch('/api/leagues/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create league');
      }

      toast.success('League created successfully!');
      await refetch();

      // Confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);

      // Redirect after a short delay so confetti is visible
      const leagueId = data.data?.league_id || data.league_id;
      if (leagueId) {
        setTimeout(() => router.push(`/leagues/${leagueId}`), 1500);
      } else {
        setTimeout(() => router.push('/leagues'), 1500);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create league',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Confetti overlay */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
          colors={[
            '#6366f1',
            '#8b5cf6',
            '#ec4899',
            '#f59e0b',
            '#10b981',
            '#3b82f6',
          ]}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push('/leagues')}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Zap className="size-6 text-primary" />
              Quick Start
            </h1>
            <p className="text-muted-foreground text-sm">
              Create a league in under a minute
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={cn(
                  'flex items-center justify-center size-8 rounded-full text-sm font-medium transition-colors',
                  step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {step > s ? <Check className="size-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 rounded-full transition-colors',
                    step > s ? 'bg-primary' : 'bg-muted',
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6">
        {/* --------------------------------------------------------------- */}
        {/* STEP 1: Choose Template */}
        {/* --------------------------------------------------------------- */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Choose a Template</h2>
              <p className="text-sm text-muted-foreground">
                Pick a pre-configured league format to get started quickly.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                    selectedTemplate?.id === template.id &&
                      'border-primary ring-2 ring-primary/20',
                  )}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Trophy className="size-5 text-primary" />
                      {template.title}
                    </CardTitle>
                    <CardDescription>{template.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Calendar className="size-4 mx-auto mb-1 text-primary" />
                        <p className="text-lg font-bold">{template.duration}</p>
                        <p className="text-xs text-muted-foreground">Days</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Dumbbell className="size-4 mx-auto mb-1 text-primary" />
                        <p className="text-lg font-bold">
                          {template.activities}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Activities
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Clock className="size-4 mx-auto mb-1 text-primary" />
                        <p className="text-lg font-bold">{template.restDays}</p>
                        <p className="text-xs text-muted-foreground">
                          Rest Days
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {template.activityList.map((activity) => (
                        <span
                          key={activity}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* STEP 2: Configure */}
        {/* --------------------------------------------------------------- */}
        {step === 2 && selectedTemplate && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h2 className="text-lg font-semibold">Configure Your League</h2>
              <p className="text-sm text-muted-foreground">
                Customize the basics. Everything else is pre-set.
              </p>
            </div>

            {/* League type toggle */}
            <div className="space-y-2">
              <Label>League Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={leagueType === 'corporate' ? 'default' : 'outline'}
                  className="h-14 flex-col gap-1"
                  onClick={() => setLeagueType('corporate')}
                >
                  <Building2 className="size-5" />
                  <span className="text-xs">Corporate</span>
                </Button>
                <Button
                  type="button"
                  variant={leagueType === 'residential' ? 'default' : 'outline'}
                  className="h-14 flex-col gap-1"
                  onClick={() => setLeagueType('residential')}
                >
                  <Home className="size-5" />
                  <span className="text-xs">Residential</span>
                </Button>
              </div>
            </div>

            {/* Number of players */}
            <div className="space-y-2">
              <Label htmlFor="playerCount">Number of Players</Label>
              <Input
                id="playerCount"
                type="number"
                min={4}
                max={120}
                value={playerCount}
                onChange={(e) =>
                  setPlayerCount(Math.max(0, parseInt(e.target.value) || 0))
                }
                placeholder="20"
              />
              <p className="text-xs text-muted-foreground">
                Min 4, max 120 players. We will auto-create {teamCount} teams.
              </p>
            </div>

            {/* League name */}
            <div className="space-y-2">
              <Label htmlFor="leagueName">
                League Name{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="leagueName"
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder={autoName}
              />
            </div>

            {/* Start date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ends on{' '}
                {endDate
                  ? format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy')
                  : '...'}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Review
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* STEP 3: Confirm & Create */}
        {/* --------------------------------------------------------------- */}
        {step === 3 && selectedTemplate && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h2 className="text-lg font-semibold">Review & Create</h2>
              <p className="text-sm text-muted-foreground">
                Confirm your league details and you are good to go.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PartyPopper className="size-5 text-primary" />
                  {effectiveName}
                </CardTitle>
                <CardDescription>
                  {selectedTemplate.title} &middot;{' '}
                  {leagueType === 'corporate' ? 'Corporate' : 'Residential'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryItem
                    icon={<Calendar className="size-4 text-primary" />}
                    label="Duration"
                    value={`${selectedTemplate.duration} days`}
                  />
                  <SummaryItem
                    icon={<Users className="size-4 text-primary" />}
                    label="Players"
                    value={`${playerCount}`}
                  />
                  <SummaryItem
                    icon={<Users className="size-4 text-primary" />}
                    label="Teams"
                    value={`${teamCount}`}
                  />
                  <SummaryItem
                    icon={<Dumbbell className="size-4 text-primary" />}
                    label="Activities"
                    value={`${selectedTemplate.activities}`}
                  />
                  <SummaryItem
                    icon={<Clock className="size-4 text-primary" />}
                    label="Rest Days"
                    value={`${selectedTemplate.restDays}`}
                  />
                  <SummaryItem
                    icon={
                      leagueType === 'corporate' ? (
                        <Building2 className="size-4 text-primary" />
                      ) : (
                        <Home className="size-4 text-primary" />
                      )
                    }
                    label="Type"
                    value={
                      leagueType === 'corporate' ? 'Corporate' : 'Residential'
                    }
                  />
                </div>

                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Starts</span>
                    <span className="font-medium">
                      {format(new Date(startDate + 'T00:00:00'), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ends</span>
                    <span className="font-medium">
                      {format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.activityList.map((activity) => (
                    <span
                      key={activity}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                    >
                      {activity}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 size-4" />
                    Create League
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary row
// ---------------------------------------------------------------------------

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      {icon}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}
