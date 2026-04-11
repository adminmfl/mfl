'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Dumbbell, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface RecentWorkout {
  id: string;
  date: string;
  workout_type: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'rejected_resubmit' | 'rejected_permanent';
  duration: number | null;
  distance: number | null;
  rr_value: number | null;
}

interface RecentWorkoutPickerProps {
  leagueId: string;
  onSelect: (workout: RecentWorkout) => void;
}

function formatWorkoutType(type: string | null): string {
  if (!type) return 'Workout';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatWorkoutDetails(workout: RecentWorkout): string {
  const parts: string[] = [];

  if (workout.duration !== null) {
    parts.push(`${workout.duration} min`);
  } else if (workout.distance !== null) {
    parts.push(`${workout.distance} distance`);
  } else if (workout.rr_value !== null) {
    parts.push(`${workout.rr_value.toFixed(1)} RR`);
  }

  parts.push(format(parseISO(workout.date), 'MMM d'));
  return parts.join(' • ');
}

export function RecentWorkoutPicker({ leagueId, onSelect }: RecentWorkoutPickerProps) {
  const [open, setOpen] = useState(false);
  const [workouts, setWorkouts] = useState<RecentWorkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;

    let cancelled = false;

    const loadWorkouts = async () => {
      setLoading(true);

      try {
        const res = await fetch(`/api/leagues/${leagueId}/my-submissions`);
        if (!res.ok) throw new Error('Failed to load workouts');

        const json = await res.json();
        if (cancelled) return;

        const raw: RecentWorkout[] = json.data?.submissions ?? json.data ?? [];
        const recentWorkouts = raw.filter((entry) => entry.type === 'workout').slice(0, 12);

        setWorkouts(recentWorkouts);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setWorkouts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadWorkouts();

    return () => {
      cancelled = true;
    };
  }, [leagueId, loaded, open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
        onClick={() => setOpen(true)}
      >
        <Dumbbell className="size-3.5" />
        Choose Workout
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a workout</DialogTitle>
            <DialogDescription>
              Pick the recent workout you want to share in chat.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && workouts.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <CalendarDays className="size-8 opacity-40" />
              <p className="text-sm font-medium">No recent workouts found</p>
              <p className="text-xs">
                Submit a workout first, then come back to attach it here.
              </p>
            </div>
          )}

          {!loading && workouts.length > 0 && (
            <ScrollArea className="max-h-80 pr-3">
              <div className="space-y-2 py-1">
                {workouts.map((workout) => (
                  <button
                    key={workout.id}
                    type="button"
                    className="w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent"
                    onClick={() => {
                      onSelect(workout);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {formatWorkoutType(workout.workout_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatWorkoutDetails(workout)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {workout.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}