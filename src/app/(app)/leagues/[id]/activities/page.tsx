'use client';

import React, { use, useMemo } from 'react';
import {
  Dumbbell,
  Plus,
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  Shield,
  Info,
  Filter,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { useRole } from '@/contexts/role-context';
import { useLeague } from '@/contexts/league-context';
import { useLeagueActivities } from '@/hooks/use-league-activities';
import { ActivityMinimumDropdown } from '@/components/leagues/activity-minimum-dropdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Loading State
// ============================================================================
function TrialPeriodAlert({ daysLeft }: { daysLeft: number }) {
  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <Info className="size-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-300">Trial Period</AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-400">
        This league is in trial mode for {daysLeft} day{daysLeft === 1 ? '' : 's'}.
        Submissions won’t count toward the official leaderboard until the league starts.
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// League Activities Page
// ============================================================================

export default function LeagueActivitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = use(params);
  const { activeLeague } = useLeague();
  const { isHost, isGovernor } = useRole();
  const isAdmin = isHost || isGovernor;

  const {
    data,
    isLoading,
    error,
    refetch,
    addActivities,
    removeActivity,
    updateFrequency,
  } = useLeagueActivities(leagueId, { includeAll: isAdmin });

  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [frequencyDrafts, setFrequencyDrafts] = React.useState<Record<string, string>>({});
  const [frequencyTypeDrafts, setFrequencyTypeDrafts] = React.useState<Record<string, 'daily' | 'weekly' | 'monthly'>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [resetKey, setResetKey] = React.useState(0);
  const [openDescriptionId, setOpenDescriptionId] = React.useState<string | null>(null);

  // Track pending changes before saving
  const [pendingChanges, setPendingChanges] = React.useState<Map<string, { enabled?: boolean; frequency?: number | null; frequency_type?: 'daily' | 'weekly' | 'monthly' | null; minimums?: { min_value: number | null; age_group_overrides: Record<string, any> }; proof_requirement?: 'not_required' | 'optional' | 'mandatory'; notes_requirement?: 'not_required' | 'optional' | 'mandatory'; points_per_session?: number; outcome_config?: { label: string; points: number }[] | null }>>(new Map());

  const hasChanges = pendingChanges.size > 0;
  const toggleLoading = null;

  const enabledActivityIds = React.useMemo(() => {
    return new Set(data?.activities.map((a) => a.activity_id) || []);
  }, [data?.activities]);

  const enabledActivityMap = React.useMemo(() => {
    return new Map((data?.activities || []).map((a) => [a.activity_id, a]));
  }, [data?.activities]);

  const supportsFrequency = data?.supportsFrequency !== false;

  const trialDaysLeft = React.useMemo(() => {
    if (!activeLeague?.start_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(String(activeLeague.start_date).slice(0, 10));
    start.setHours(0, 0, 0, 0);
    const diffMs = start.getTime() - today.getTime();
    if (diffMs <= 0) return null;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [activeLeague?.start_date]);

  // Initialize frequency drafts when data changes (must be before early returns)
  React.useEffect(() => {
    if (!data?.activities) return;
    const next: Record<string, string> = {};
    const nextTypes: Record<string, 'daily' | 'weekly' | 'monthly'> = {};
    for (const activity of data.activities) {
      next[activity.activity_id] =
        typeof activity.frequency === 'number' && activity.frequency > 0
          ? String(activity.frequency)
          : '';
      nextTypes[activity.activity_id] = activity.frequency_type === 'monthly' ? 'monthly' : activity.frequency_type === 'daily' ? 'daily' : 'weekly';
    }
    setFrequencyDrafts(next);
    setFrequencyTypeDrafts(nextTypes);
  }, [data?.activities]);

  // Extract unique categories (must be before early returns)
  const categories = useMemo(() => {
    if (!data) return [];
    const allActivities = isAdmin ? data.allActivities || [] : data.activities;
    const categoryMap = new Map();

    allActivities.forEach((activity) => {
      if (activity.category) {
        categoryMap.set(activity.category.category_id, activity.category);
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
  }, [data, isAdmin]);

  // Filter activities by selected category (must be before early returns)
  const filteredActivities = useMemo(() => {
    if (!data) return [];
    const activities = isAdmin ? data.allActivities || [] : data.activities;
    const search = searchTerm.trim().toLowerCase();

    return activities.filter((a) => {
      const matchesCategory = selectedCategory === 'all' || a.category?.category_id === selectedCategory;
      const matchesSearch =
        !search ||
        a.activity_name.toLowerCase().includes(search) ||
        (a.description || '').toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [data, selectedCategory, searchTerm, isAdmin]);

  const sortedActivities = useMemo(() => {
    const list = [...filteredActivities];
    return list.sort((a, b) => {
      const aEnabled = enabledActivityIds.has(a.activity_id) ? 1 : 0;
      const bEnabled = enabledActivityIds.has(b.activity_id) ? 1 : 0;
      if (aEnabled !== bEnabled) return bEnabled - aEnabled; // enabled first
      return a.activity_name.localeCompare(b.activity_name);
    });
  }, [filteredActivities, enabledActivityIds]);

  if (isLoading) {
    return <ActivitiesPageSkeleton />;
  }

  const handleToggle = (activityId: string, enable: boolean) => {
    // Check if the new state matches the original state
    const originallyEnabled = enabledActivityIds.has(activityId);

    setPendingChanges((prev) => {
      const next = new Map(prev);

      // If toggling back to original state, remove the pending change
      if (enable === originallyEnabled) {
        next.delete(activityId);
      } else {
        // Store change locally instead of saving immediately
        const change = next.get(activityId) || {};
        next.set(activityId, { ...change, enabled: enable });
      }
      return next;
    });
  };

  // Compute checkbox state: use pending change if exists, otherwise use current enabled state
  const getCheckboxState = (activityId: string): boolean => {
    const pendingChange = pendingChanges.get(activityId);
    if (pendingChange?.enabled !== undefined) {
      return pendingChange.enabled;
    }
    return enabledActivityIds.has(activityId);
  };

  const handleFrequencyBlur = (activityId: string) => {
    const raw = (frequencyDrafts[activityId] ?? '').trim();
    const current = enabledActivityMap.get(activityId)?.frequency ?? null;
    const currentType = frequencyTypeDrafts[activityId]
      ?? enabledActivityMap.get(activityId)?.frequency_type
      ?? 'weekly';
    const maxAllowed = currentType === 'monthly' ? 10 : 7;

    if (raw === '') {
      if (current === null) return;
      // Store frequency change
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const change = next.get(activityId) || {};
        next.set(activityId, { ...change, frequency: null });
        return next;
      });
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > maxAllowed) {
      toast.error(`Frequency must be between 1 and ${maxAllowed}`);
      setFrequencyDrafts((prev) => ({
        ...prev,
        [activityId]: typeof current === 'number' ? String(current) : '',
      }));
      return;
    }

    const next = Math.floor(parsed);
    if (current === next) return;

    // Store frequency change
    setPendingChanges((prev) => {
      const nextMap = new Map(prev);
      const change = nextMap.get(activityId) || {};
      nextMap.set(activityId, { ...change, frequency: next });
      return nextMap;
    });
  };

  const handleFrequencyChange = (activityId: string, value: string) => {
    setFrequencyDrafts((prev) => ({
      ...prev,
      [activityId]: value,
    }));

    // Mark as pending immediately when user starts typing
    const trimmed = value.trim();
    const current = enabledActivityMap.get(activityId)?.frequency ?? null;
    const currentType = frequencyTypeDrafts[activityId]
      ?? enabledActivityMap.get(activityId)?.frequency_type
      ?? 'weekly';
    const maxAllowed = currentType === 'monthly' ? 10 : 7;

    if (trimmed === '') {
      if (current !== null) {
        setPendingChanges((prev) => {
          const next = new Map(prev);
          const change = next.get(activityId) || {};
          next.set(activityId, { ...change, frequency: null });
          return next;
        });
      }
    } else {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= maxAllowed) {
        const numVal = Math.floor(parsed);
        if (current !== numVal) {
          setPendingChanges((prev) => {
            const next = new Map(prev);
            const change = next.get(activityId) || {};
            next.set(activityId, { ...change, frequency: numVal });
            return next;
          });
        }
      }
    }
  };

  const handleFrequencyTypeChange = (activityId: string, value: 'daily' | 'weekly' | 'monthly') => {
    setFrequencyTypeDrafts((prev) => ({
      ...prev,
      [activityId]: value,
    }));

    const currentType = enabledActivityMap.get(activityId)?.frequency_type ?? 'weekly';
    const draftFrequencyRaw = (frequencyDrafts[activityId] ?? '').trim();
    const draftFrequency = draftFrequencyRaw === '' ? null : Number(draftFrequencyRaw);
    const maxAllowed = value === 'monthly' ? 10 : 7;

    setPendingChanges((prev) => {
      const next = new Map(prev);
      const change = next.get(activityId) || {};
      if (currentType === value) {
        const { frequency_type: _, ...rest } = change as any;
        if (Object.keys(rest).length === 0) {
          next.delete(activityId);
        } else {
          next.set(activityId, rest);
        }
      } else {
        next.set(activityId, { ...change, frequency_type: value });
      }
      return next;
    });

    if (typeof draftFrequency === 'number' && Number.isFinite(draftFrequency) && draftFrequency > maxAllowed) {
      const clamped = String(maxAllowed);
      setFrequencyDrafts((prev) => ({
        ...prev,
        [activityId]: clamped,
      }));
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const change = next.get(activityId) || {};
        next.set(activityId, { ...change, frequency: maxAllowed });
        return next;
      });
    }
  };

  const handleActivityConfigChange = (config: { activity_id: string; proof_requirement: 'not_required' | 'optional' | 'mandatory'; notes_requirement: 'not_required' | 'optional' | 'mandatory'; points_per_session: number; outcome_config?: { label: string; points: number }[] | null; max_images?: number; custom_field_label?: string | null }) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const change = next.get(config.activity_id) || {};
      next.set(config.activity_id, {
        ...change,
        proof_requirement: config.proof_requirement,
        notes_requirement: config.notes_requirement,
        points_per_session: config.points_per_session,
        outcome_config: config.outcome_config,
        max_images: config.max_images,
        custom_field_label: config.custom_field_label,
      });
      return next;
    });
  };

  const handleMinimumChange = (config: { activity_id: string; min_value: number | null; age_group_overrides: Record<string, any> }) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const change = next.get(config.activity_id) || {};
      next.set(config.activity_id, {
        ...change,
        minimums: {
          min_value: config.min_value,
          age_group_overrides: config.age_group_overrides,
        },
      });
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      // Build all promises in parallel, one set per activity
      const promises: Promise<{ ok: boolean }>[] = [];

      for (const [activityId, change] of pendingChanges) {
        // Enable/disable must run first (sequentially per activity) since
        // removing an activity means we skip its other updates.
        // But different activities can run in parallel.
        const activityPromise = (async (): Promise<{ ok: boolean }> => {
          const results: boolean[] = [];
          const activityInfo = data?.allActivities?.find((a) => a.activity_id === activityId);
          const isCustom = !!activityInfo?.is_custom;

          if (change.enabled !== undefined) {
            const success = change.enabled
              ? await addActivities([activityId], isCustom)
              : await removeActivity(activityId, isCustom);
            results.push(success);
            if (change.enabled === false) return { ok: results.every(Boolean) };
          }

          // Fire PATCH and minimums in parallel for this activity
          const subPromises: Promise<boolean>[] = [];

          if (change.frequency !== undefined || change.frequency_type !== undefined
              || change.proof_requirement !== undefined || change.notes_requirement !== undefined
              || change.points_per_session !== undefined || change.outcome_config !== undefined
              || change.max_images !== undefined || change.custom_field_label !== undefined) {
            const patchBody: Record<string, any> = { activity_id: activityId };

            if (change.frequency !== undefined || change.frequency_type !== undefined) {
              patchBody.frequency = change.frequency !== undefined
                ? change.frequency
                : enabledActivityMap.get(activityId)?.frequency ?? null;
              patchBody.frequency_type = change.frequency_type !== undefined
                ? change.frequency_type
                : frequencyTypeDrafts[activityId]
                ?? enabledActivityMap.get(activityId)?.frequency_type
                ?? 'weekly';
            }

            if (change.proof_requirement !== undefined) patchBody.proof_requirement = change.proof_requirement;
            if (change.notes_requirement !== undefined) patchBody.notes_requirement = change.notes_requirement;
            if (change.points_per_session !== undefined) patchBody.points_per_session = change.points_per_session;
            if (change.outcome_config !== undefined) patchBody.outcome_config = change.outcome_config;
            if (change.max_images !== undefined) patchBody.max_images = change.max_images;
            if (change.custom_field_label !== undefined) patchBody.custom_field_label = change.custom_field_label;

            subPromises.push(
              fetch(`/api/leagues/${leagueId}/activities`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchBody),
              }).then(r => r.ok).catch(() => false)
            );
          }

          if (change.minimums !== undefined) {
            subPromises.push(
              fetch('/api/leagues/activity-minimums', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  league_id: leagueId,
                  activity_id: activityId,
                  symbol: enabledActivityMap.get(activityId)?.activity_name || 'Activity',
                  min_value: change.minimums.min_value,
                  age_group_overrides: change.minimums.age_group_overrides,
                }),
              }).then(r => r.ok).catch(() => false)
            );
          }

          const subResults = await Promise.all(subPromises);
          results.push(...subResults);
          return { ok: results.every(Boolean) };
        })();

        promises.push(activityPromise);
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;
      const errorCount = results.filter(r => !r.ok).length;

      if (errorCount === 0) {
        toast.success(successCount === 1 ? 'Changes saved' : `All ${successCount} activities updated`);
        setPendingChanges(new Map());
      } else if (successCount > 0) {
        toast.error(`Saved ${successCount} changes, but ${errorCount} failed`);
      } else {
        toast.error('Failed to save changes');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    // Reset frequency drafts to current values
    if (data?.activities) {
      const next: Record<string, string> = {};
      const nextTypes: Record<string, 'daily' | 'weekly' | 'monthly'> = {};
      for (const activity of data.activities) {
        next[activity.activity_id] =
          typeof activity.frequency === 'number' && activity.frequency > 0
            ? String(activity.frequency)
            : '';
        nextTypes[activity.activity_id] = activity.frequency_type === 'monthly' ? 'monthly' : activity.frequency_type === 'daily' ? 'daily' : 'weekly';
      }
      setFrequencyDrafts(next);
      setFrequencyTypeDrafts(nextTypes);
    }
    // Force dropdown components to remount with fresh data
    setResetKey(prev => prev + 1);
  };

  // no-op bulk handlers (removed UI); using original per-item toggle UX

  // Regular users just see enabled activities
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        {/* Header */}
        <div className="flex flex-col gap-4 px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Dumbbell className="size-6 text-primary" />
                Allowed Activities
              </h1>
              <p className="text-muted-foreground">
                View activities you can submit for this league
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search activities"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {categories.length > 0 && (
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 size-4" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.category_id} value={cat.category_id}>
                        {cat.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-6">
          {trialDaysLeft && <TrialPeriodAlert daysLeft={trialDaysLeft} />}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && data && (
            <>
              {filteredActivities.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Dumbbell className="size-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">
                      {selectedCategory === 'all'
                        ? 'No Activities Configured'
                        : 'No Activities in This Category'}
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {selectedCategory === 'all'
                        ? 'The league host hasn\'t configured any activities yet. Contact your league host to enable activities.'
                        : 'No activities found in the selected category.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredActivities.map((activity) => (
                    <Card key={activity.activity_id} className="border-primary/50 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Check className="size-4 text-primary" />
                          {activity.activity_name}
                        </CardTitle>
                        {activity.category && (
                          <Badge variant="outline" className="w-fit">
                            {activity.category.display_name}
                          </Badge>
                        )}
                        {activity.description && (
                          <CardDescription className="text-sm">
                            {activity.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Admin view (host/governor)
  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Dumbbell className="size-6 text-primary" />
              Configure Activities
            </h1>
            <p className="text-muted-foreground">
              Enable or disable activities for your league
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activities"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {categories.length > 0 && (
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 size-4" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/leagues/${leagueId}/custom-activities`}>
                  <Sparkles className="size-4 mr-2" />
                  Custom Activities
                </Link>
              </Button>
              <Badge variant="outline">
                {data?.activities.length || 0} Active
              </Badge>
              <Button variant="ghost" size="icon" onClick={refetch} disabled={isSaving} title="Refresh activities">
                <RefreshCw className="size-4" />
              </Button>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button onClick={handleSaveChanges} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="size-4 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDiscardChanges} disabled={isSaving} size="sm">
                  Discard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved Changes Alert */}
      {hasChanges && (
        <div className="px-4 lg:px-6">
          <Alert className="border-amber-200 bg-amber-50 dark:border-primary/20 dark:bg-primary/10">
            <AlertCircle className="size-4 text-amber-600 dark:text-primary" />
            <AlertTitle className="text-amber-900 dark:text-primary">Unsaved Changes</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-primary/80">
              You have {pendingChanges.size} pending change{pendingChanges.size !== 1 ? 's' : ''}. Click "Confirm" to save or "Discard" to cancel.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content */}
      <div className="px-4 lg:px-6 space-y-6">
        {trialDaysLeft && <TrialPeriodAlert daysLeft={trialDaysLeft} />}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && data && (
          <>
            {/* Info Alert */}
            <Alert>
              <Info className="size-4" />
              <AlertTitle>Activity Configuration</AlertTitle>
              <AlertDescription>
                Enable activities that players can submit for this league.
                Players cannot submit workouts until you enable at least one
                activity type.
                {data.activities.length === 0 && (
                  <span className="block mt-2 font-medium text-amber-600">
                    ⚠️ No activities are currently enabled. Players cannot submit
                    workouts.
                  </span>
                )}
                {!supportsFrequency && isHost && (
                  <span className="block mt-2 text-xs text-muted-foreground">
                    Weekly limits are unavailable because the frequency field is not enabled in this environment.
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {/* Host: original toggle grid, with enabled items sorted to the top */}
            {isHost && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedActivities.map((activity) => {
                  const isEnabled = getCheckboxState(activity.activity_id);
                  const isProcessing = toggleLoading === activity.activity_id;
                  const hasPendingChange = pendingChanges.has(activity.activity_id);

                  return (
                    <div
                      key={activity.activity_id}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-lg border transition-all',
                        hasPendingChange && 'ring-2 ring-amber-400 bg-amber-50/50 dark:ring-primary/60 dark:bg-primary/10',
                        !hasPendingChange && isEnabled && 'border-primary bg-primary/5 ring-1 ring-primary',
                        !hasPendingChange && !isEnabled && 'border-border bg-card hover:border-primary/50',
                        isProcessing && 'opacity-50 pointer-events-none'
                      )}
                    >
                      <div className="pt-0.5">
                        {isProcessing ? (
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        ) : (
                          <Checkbox
                            checked={isEnabled}
                            disabled={isProcessing}
                            onClick={() => handleToggle(activity.activity_id, !isEnabled)}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm leading-tight">
                            {activity.activity_name}
                          </p>
                          {activity.is_custom && (
                            <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30">
                              <Sparkles className="size-3 mr-1" />
                              Custom
                            </Badge>
                          )}
                          {activity.category && (
                            <Badge variant="outline" className="text-xs">
                              {activity.category.display_name}
                            </Badge>
                          )}
                          {activity.description && (
                            <div className="relative">
                              <Info
                                className="size-3.5 text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDescriptionId(openDescriptionId === activity.activity_id ? null : activity.activity_id);
                                }}
                              />
                              {openDescriptionId === activity.activity_id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setOpenDescriptionId(null)}
                                  />
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-3 text-xs text-card-foreground shadow-lg">
                                    <p className="leading-relaxed break-words">{activity.description}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          {hasPendingChange && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                              Pending
                            </Badge>
                          )}
                        </div>

                        {isEnabled && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <ActivityMinimumDropdown
                              key={`${activity.activity_id}-${resetKey}`}
                              leagueId={leagueId}
                              activityId={activity.activity_id}
                              symbol={activity.activity_name}
                              measurementType={activity.measurement_type}
                              frequency={frequencyDrafts[activity.activity_id] ? parseInt(frequencyDrafts[activity.activity_id]) : null}
                              frequencyType={frequencyTypeDrafts[activity.activity_id] ?? activity.frequency_type ?? 'weekly'}
                              supportsFrequency={supportsFrequency}
                              initialConfig={{
                                min_value: enabledActivityMap.get(activity.activity_id)?.min_value ?? null,
                                max_value: null,
                                age_group_overrides: enabledActivityMap.get(activity.activity_id)?.age_group_overrides ?? {},
                              }}
                              onMinimumChange={handleMinimumChange}
                              onFrequencyChange={handleFrequencyChange}
                              onFrequencyTypeChange={handleFrequencyTypeChange}
                              onFrequencyBlur={handleFrequencyBlur}
                              proofRequirement={enabledActivityMap.get(activity.activity_id)?.proof_requirement ?? 'mandatory'}
                              notesRequirement={enabledActivityMap.get(activity.activity_id)?.notes_requirement ?? 'optional'}
                              pointsPerSession={enabledActivityMap.get(activity.activity_id)?.points_per_session ?? 1}
                              outcomeConfig={enabledActivityMap.get(activity.activity_id)?.outcome_config ?? null}
                              maxImages={enabledActivityMap.get(activity.activity_id)?.max_images ?? 1}
                              customFieldLabel={enabledActivityMap.get(activity.activity_id)?.custom_field_label ?? null}
                              onActivityConfigChange={handleActivityConfigChange}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Governor: read-only enabled activities */}
            {isGovernor && !isHost && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredActivities
                  .filter((a) => enabledActivityIds.has(a.activity_id))
                  .map((activity) => (
                    <Card key={activity.activity_id} className="border-primary/50 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Check className="size-4 text-primary" />
                          {activity.activity_name}
                        </CardTitle>
                        {activity.category && (
                          <Badge variant="outline" className="w-fit">
                            {activity.category.display_name}
                          </Badge>
                        )}
                        {activity.description && (
                          <CardDescription className="text-sm">
                            {activity.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
              </div>
            )}

            {/* Warning if no activities enabled */}
            {isHost && data.activities.length === 0 && data.allActivities && data.allActivities.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  Players will not be able to submit workouts until you enable
                  at least one activity type. Click on any activity above to
                  enable it.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  );
}
// ============================================================================
// Skeleton Component
// ============================================================================

function ActivitiesPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
          <Skeleton className="h-10 flex-1 min-w-52" />
          <Skeleton className="h-10 w-[180px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="size-9 rounded-md" />
          </div>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-lg border">
              <Skeleton className="size-5 rounded-sm mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
