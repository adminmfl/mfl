/**
 * League Activities Manager
 * Allows host to configure which activities are available for their league.
 */
'use client';

import * as React from 'react';
import {
  Check,
  Plus,
  Trash2,
  Loader2,
  Dumbbell,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import { useLeagueActivities, type LeagueActivity } from '@/hooks/use-league-activities';

// ============================================================================
// Types
// ============================================================================

interface LeagueActivitiesManagerProps {
  leagueId: string;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return <DumbbellLoading label="Loading activities..." />;
}

// ============================================================================
// Activity Card Component
// ============================================================================

interface ActivityCardProps {
  activity: LeagueActivity;
  isEnabled: boolean;
  onToggle: (activityId: string, enable: boolean) => void;
  onUpdateFrequency: (activityId: string, frequency: number | null) => void;
  isLoading: boolean;
}

function ActivityCard({ activity, isEnabled, onToggle, onUpdateFrequency, isLoading }: ActivityCardProps) {
  const [localFrequency, setLocalFrequency] = React.useState<string>('');

  React.useEffect(() => {
    const freq = typeof activity.frequency === 'number' ? String(activity.frequency) : '';
    setLocalFrequency(freq);
  }, [activity.frequency]);

  const handleBlur = () => {
    if (!isEnabled) return;
    const trimmed = localFrequency.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (trimmed !== '' && (!Number.isFinite(next) || next < 1 || next > 7)) {
      toast.error('Frequency must be between 1 and 7 (or empty for unlimited)');
      return;
    }
    onUpdateFrequency(activity.activity_id, trimmed === '' ? null : Math.floor(next as number));
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer',
        isEnabled
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-card hover:border-primary/50'
      )}
      onClick={() => !isLoading && onToggle(activity.activity_id, !isEnabled)}
    >
      <Checkbox
        checked={isEnabled}
        disabled={isLoading}
        className="pointer-events-none"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{activity.activity_name}</p>
        {activity.description && (
          <p className="text-xs text-muted-foreground truncate">
            {activity.description}
          </p>
        )}
        {isEnabled && (
          <div
            className="mt-2 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-muted-foreground">Weekly limit</span>
            <Input
              type="number"
              min={1}
              max={7}
              step={1}
              value={localFrequency}
              placeholder="Unlimited"
              onChange={(e) => setLocalFrequency(e.target.value)}
              onBlur={handleBlur}
              className="h-7 w-28 text-xs"
              disabled={isLoading}
            />
          </div>
        )}
      </div>
      {isEnabled && (
        <Badge variant="secondary" className="shrink-0">
          <Check className="size-3 mr-1" />
          Enabled
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LeagueActivitiesManager({ leagueId }: LeagueActivitiesManagerProps) {
  const [pendingChanges, setPendingChanges] = React.useState<Set<string>>(new Set());
  const [confirmRemove, setConfirmRemove] = React.useState<string | null>(null);

  // Fetch league activities with all available activities for configuration
  const {
    data: leagueData,
    isLoading,
    error: leagueError,
    errorCode: leagueErrorCode,
    refetch,
    addActivities,
    removeActivity,
    updateFrequency,
  } = useLeagueActivities(leagueId, { includeAll: true });

  // Don't treat "no activities configured" as an error in the manager - it's a valid state
  const error = leagueErrorCode === 'NO_ACTIVITIES_CONFIGURED' ? null : leagueError;

  // Get all activities from the API response
  const allActivities = leagueData?.allActivities || [];

  // Get set of enabled activity IDs
  const enabledActivityIds = React.useMemo(() => {
    return new Set((leagueData?.activities || []).map((a) => a.activity_id));
  }, [leagueData?.activities]);

  const enabledActivityMap = React.useMemo(() => {
    return new Map((leagueData?.activities || []).map((a) => [a.activity_id, a]));
  }, [leagueData?.activities]);

  // Handle toggle activity
  const handleToggle = React.useCallback(async (activityId: string, enable: boolean) => {
    setPendingChanges((prev) => new Set(prev).add(activityId));

    try {
      if (enable) {
        const success = await addActivities([activityId]);
        if (success) {
          toast.success('Activity enabled for this league');
        } else {
          toast.error('Failed to enable activity');
        }
      } else {
        // Confirm before removing
        setConfirmRemove(activityId);
      }
    } finally {
      setPendingChanges((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  }, [addActivities]);

  // Handle confirm remove
  const handleConfirmRemove = React.useCallback(async () => {
    if (!confirmRemove) return;

    setPendingChanges((prev) => new Set(prev).add(confirmRemove));

    try {
      const success = await removeActivity(confirmRemove);
      if (success) {
        toast.success('Activity removed from this league');
      } else {
        toast.error('Failed to remove activity');
      }
    } finally {
      setPendingChanges((prev) => {
        const next = new Set(prev);
        next.delete(confirmRemove);
        return next;
      });
      setConfirmRemove(null);
    }
  }, [confirmRemove, removeActivity]);

  // Refresh data
  const handleRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  // Enable all activities
  const handleEnableAll = React.useCallback(async () => {
    const disabledIds = allActivities
      .filter((a) => !enabledActivityIds.has(a.activity_id))
      .map((a) => a.activity_id);

    if (disabledIds.length === 0) {
      toast.info('All activities are already enabled');
      return;
    }

    const success = await addActivities(disabledIds);
    if (success) {
      toast.success(`Enabled ${disabledIds.length} activities`);
    }
  }, [allActivities, enabledActivityIds, addActivities]);

  const handleUpdateFrequency = React.useCallback(
    async (activityId: string, frequency: number | null) => {
      const success = await updateFrequency(activityId, frequency);
      if (success) {
        if (frequency === null) {
          toast.success('Frequency cleared (unlimited)');
        } else {
          toast.success('Frequency updated');
        }
      } else {
        toast.error('Failed to update frequency');
      }
    },
    [updateFrequency]
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="size-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const enabledCount = enabledActivityIds.size;
  const totalCount = allActivities.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">League Activities</h2>
          <p className="text-sm text-muted-foreground">
            Select which activities players can submit for this league
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {enabledCount} / {totalCount} enabled
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          {enabledCount < totalCount && (
            <Button size="sm" onClick={handleEnableAll}>
              <Plus className="size-4 mr-2" />
              Enable All
            </Button>
          )}
        </div>
      </div>

      {/* Info Alert */}
      {enabledCount === 0 && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>No Activities Configured</AlertTitle>
          <AlertDescription>
            Players cannot submit workouts until you enable at least one activity type.
            Select activities below to enable them for this league.
          </AlertDescription>
        </Alert>
      )}

      {/* Activities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allActivities.map((activity) => (
          <ActivityCard
            key={activity.activity_id}
            activity={{
              ...activity,
              frequency: enabledActivityMap.get(activity.activity_id)?.frequency ?? null,
            }}
            isEnabled={enabledActivityIds.has(activity.activity_id)}
            onToggle={handleToggle}
            onUpdateFrequency={handleUpdateFrequency}
            isLoading={pendingChanges.has(activity.activity_id)}
          />
        ))}
      </div>

      {allActivities.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Dumbbell className="size-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">
              No activities available. Contact the system administrator to add activities.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Activity?</AlertDialogTitle>
            <AlertDialogDescription>
              Players will no longer be able to submit workouts for this activity type.
              Existing submissions will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="size-4 mr-2" />
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default LeagueActivitiesManager;
