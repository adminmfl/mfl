'use client';

import { useState } from 'react';
import {
  Calendar,
  Dumbbell,
  Trophy,
  Moon,
  Zap,
  Check,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeaguePlan {
  calendar: {
    phase: string;
    startDay: number;
    endDay: number;
    description: string;
  }[];
  recommendedActivities: {
    activity_id?: string;
    activity_name: string;
    frequency: number;
    frequency_type: string;
    measurement_type?: string;
    reason: string;
  }[];
  challengeSuggestions: {
    template_id?: string;
    title: string;
    scheduledDay: number;
    reason: string;
  }[];
  restDayRecommendation: number;
  rrProfile: 'standard' | 'simple' | 'points_only';
  summary: string;
}

interface LeaguePlanPreviewProps {
  plan: LeaguePlan;
  duration: number;
  onAccept: (plan: LeaguePlan, selectedActivities: string[]) => void;
  onBack: () => void;
  accepting?: boolean;
}

// ---------------------------------------------------------------------------
// Phase Colors
// ---------------------------------------------------------------------------

const phaseColor: Record<string, string> = {
  Onboarding: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Gameplay: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Challenge Week': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Awards: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

const rrLabels: Record<string, string> = {
  standard: 'Standard (metric-based)',
  simple: 'Simple (binary)',
  points_only: 'Points Only',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeaguePlanPreview({
  plan,
  duration,
  onAccept,
  onBack,
  accepting,
}: LeaguePlanPreviewProps) {
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(plan.recommendedActivities.map((a) => a.activity_name))
  );

  const toggleActivity = (name: string) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Summary */}
      {plan.summary && (
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-purple-500/5 border">
          <p className="text-[13px] leading-relaxed">{plan.summary}</p>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Calendar className="size-3.5" /> League Calendar
        </h4>
        <div className="space-y-1.5">
          {plan.calendar.map((phase, i) => {
            const width = ((phase.endDay - phase.startDay + 1) / duration) * 100;
            return (
              <div key={i} className="flex items-center gap-2">
                <Badge className={cn('text-[10px] shrink-0 w-24 justify-center', phaseColor[phase.phase] || phaseColor.Gameplay)}>
                  {phase.phase}
                </Badge>
                <div className="flex-1 relative h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="absolute h-full bg-primary/20 rounded"
                    style={{ width: `${Math.min(width, 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] text-muted-foreground">
                    Day {phase.startDay}–{phase.endDay} · {phase.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activities */}
      <div>
        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Dumbbell className="size-3.5" /> Recommended Activities
          <span className="text-[10px] font-normal">(toggle to include/exclude)</span>
        </h4>
        <div className="space-y-1">
          {plan.recommendedActivities.map((act) => (
            <button
              key={act.activity_name}
              type="button"
              onClick={() => toggleActivity(act.activity_name)}
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded-md border text-left transition-colors',
                selectedActivities.has(act.activity_name)
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-muted/30 border-transparent opacity-50'
              )}
            >
              <div className={cn(
                'size-5 rounded-full flex items-center justify-center shrink-0',
                selectedActivities.has(act.activity_name) ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                {selectedActivities.has(act.activity_name) ? (
                  <Check className="size-3" />
                ) : (
                  <X className="size-3" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[12px] truncate">{act.activity_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {act.frequency}x/{act.frequency_type} · {act.reason}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Challenges */}
      {plan.challengeSuggestions.length > 0 && (
        <div>
          <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Trophy className="size-3.5" /> Challenge Schedule
          </h4>
          <div className="space-y-1">
            {plan.challengeSuggestions.map((ch, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                <Badge variant="outline" className="text-[10px] shrink-0">Day {ch.scheduledDay}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[12px] truncate">{ch.title}</div>
                  <div className="text-[10px] text-muted-foreground">{ch.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Moon className="size-3" />
          {plan.restDayRecommendation} rest days
        </div>
        <div className="flex items-center gap-1">
          <Zap className="size-3" />
          {rrLabels[plan.rrProfile] || plan.rrProfile}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1" onClick={onBack} disabled={accepting}>
          Back to Chat
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1"
          onClick={() => onAccept(plan, Array.from(selectedActivities))}
          disabled={accepting || selectedActivities.size === 0}
        >
          {accepting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              Accept Plan
              <ChevronRight className="size-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
