'use client';

import * as React from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  PenSquare,
  PlusCircle,
  Shield,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLeagueActivities } from '@/hooks/use-league-activities';

interface MemberOption {
  league_member_id: string;
  username: string;
  email: string;
  team_name: string | null;
}

interface Entry {
  id: string;
  date: string;
  type: 'workout' | 'rest';
  workout_type: string | null;
  duration: number | null;
  distance: number | null;
  steps: number | null;
  holes: number | null;
  rr_value: number | null;
  status: 'pending' | 'approved' | 'rejected';
  proof_url: string | null;
  notes: string | null;
  created_date?: string | null;
  modified_date?: string | null;
}

interface WeekRow {
  date: string;
  label: string;
  entry: Entry | null;
  state: 'missed' | 'approved' | 'pending' | 'rejected' | 'upcoming' | 'nodata';
  pointsLabel: string;
}

function startOfWeekSunday(date: Date) {
  const d = startOfWeek(date, { weekStartsOn: 0 });
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatWeekRange(start: Date) {
  const end = addDays(start, 6);
  return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeRunRateFromForm(form: {
  type: 'workout' | 'rest';
  workout_type: string;
  duration: string;
  distance: string;
  steps: string;
  holes: string;
}) {
  const baseDuration = 45;
  const minSteps = 10000;
  const maxSteps = 20000;

  if (form.type === 'rest') return 1.0;

  const steps = toNumber(form.steps);
  const holes = toNumber(form.holes);
  const duration = toNumber(form.duration);
  const distance = toNumber(form.distance);
  const workoutType = form.workout_type?.toLowerCase() || '';

  if (workoutType === 'steps' && typeof steps === 'number') {
    if (steps < minSteps) return 0;
    const capped = Math.min(steps, maxSteps);
    return Math.min(1 + (capped - minSteps) / (maxSteps - minSteps), 2.0);
  }

  if (workoutType === 'golf' && typeof holes === 'number') {
    return Math.min(holes / 9, 2.0);
  }

  if (workoutType === 'run' || workoutType === 'cardio') {
    const rrDur = typeof duration === 'number' ? duration / baseDuration : 0;
    const rrDist = typeof distance === 'number' ? distance / 4 : 0;
    return Math.min(Math.max(rrDur, rrDist), 2.0);
  }

  if (workoutType === 'cycling') {
    const rrDur = typeof duration === 'number' ? duration / baseDuration : 0;
    const rrDist = typeof distance === 'number' ? distance / 10 : 0;
    return Math.min(Math.max(rrDur, rrDist), 2.0);
  }

  if (typeof duration === 'number') {
    return Math.min(duration / baseDuration, 2.0);
  }

  return 1.0;
}

async function uploadProofFile(file: File, leagueId: string) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Invalid file type. Allowed: JPG, PNG, GIF, WebP');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large. Max size is 10MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('league_id', leagueId);

  const res = await fetch('/api/upload/proof', {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Failed to upload proof');
  }
  const url = json?.data?.url as string | undefined;
  if (!url) {
    throw new Error('Upload succeeded but no URL returned');
  }
  return url;
}

function getWorkoutCategory(type: 'workout' | 'rest', workoutType: string) {
  if (type === 'rest') return 'rest';
  const wt = (workoutType || '').toLowerCase();
  if (wt === 'steps') return 'steps';
  if (wt === 'golf') return 'golf';
  if (wt === 'cycling') return 'cycling';
  if (wt === 'run' || wt === 'cardio') return 'run';
  return 'other';
}

function normalizeStatus(status?: string | null) {
  const v = (status || '').toLowerCase();
  if (v === 'approved' || v === 'accepted') return 'approved';
  if (v === 'pending') return 'pending';
  if (v === 'rejected') return 'rejected';
  return '';
}

function latestEntry(a: Entry, b: Entry) {
  const tsA = String(a.modified_date || a.created_date || '');
  const tsB = String(b.modified_date || b.created_date || '');
  return tsB > tsA ? b : a;
}

export default function ManualEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = React.use(params);
  const { activeLeague } = useLeague();
  const { isLoading: roleLoading, isHost, isGovernor } = useRole();
  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useLeagueActivities(leagueId, { includeAll: false });

  const canUsePage = isHost || isGovernor;

  const [members, setMembers] = React.useState<MemberOption[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(true);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [weekRows, setWeekRows] = React.useState<WeekRow[] | null>(null);
  const [entriesLoading, setEntriesLoading] = React.useState(false);
  const [formMemberId, setFormMemberId] = React.useState('');
  const [selectedTeam, setSelectedTeam] = React.useState('');

  const normalizedTeamName = (teamName: string | null) =>
    teamName && teamName.trim().length > 0 ? teamName : 'Unassigned';

  const teamOptions = React.useMemo(() => {
    const names = new Set<string>();
    members.forEach((member) => names.add(normalizedTeamName(member.team_name)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [members]);

  const filteredMembers = React.useMemo(() => {
    if (!selectedTeam) return [];
    if (selectedTeam === 'all') return members;
    return members.filter((member) => normalizedTeamName(member.team_name) === selectedTeam);
  }, [members, selectedTeam]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'add' | 'overwrite'>('add');
  const [dialogDate, setDialogDate] = React.useState<string | null>(null);
  const [dialogSubmitting, setDialogSubmitting] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [uploadingProof, setUploadingProof] = React.useState(false);
  const [dialogForm, setDialogForm] = React.useState({
    type: 'workout' as 'workout' | 'rest',
    workout_type: '',
    duration: '',
    distance: '',
    steps: '',
    holes: '',
    rr_value: '',
    proof_url: '',
    notes: '',
  });

  // Load league members
  React.useEffect(() => {
    if (!leagueId) return;
    setMembersLoading(true);
    fetch(`/api/leagues/${leagueId}/manual-entry`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load members');
        const json = await res.json();
        setMembers(json.data || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Unable to load members for this league');
      })
      .finally(() => setMembersLoading(false));
  }, [leagueId]);

  // Load weekly entries when member or week changes
  React.useEffect(() => {
    const run = async () => {
      if (!leagueId || !formMemberId) return;
      setEntriesLoading(true);
      setWeekRows(null);
      try {
        const start = addDays(startOfWeekSunday(new Date()), -weekOffset * 7);
        const end = addDays(start, 6);
        const startDate = format(start, 'yyyy-MM-dd');
        const endDate = format(end, 'yyyy-MM-dd');

        const res = await fetch(
          `/api/leagues/${leagueId}/members/${formMemberId}/entries?startDate=${startDate}&endDate=${endDate}`
        );
        if (!res.ok) throw new Error('Failed to load entries');
        const json = await res.json();
        const entries: Entry[] = json?.data?.entries || [];

        const byDate = new Map<string, Entry>();
        entries.forEach((e) => {
          if (!e.date) return;
          const existing = byDate.get(e.date);
          if (!existing) byDate.set(e.date, e);
          else byDate.set(e.date, latestEntry(existing, e));
        });

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const rows: WeekRow[] = [];
        for (let i = 0; i < 7; i += 1) {
          const day = addDays(start, i);
          const ymd = format(day, 'yyyy-MM-dd');
          const label = format(day, 'EEE, MMM dd, yyyy');
          const entry = byDate.get(ymd) || null;

          const status = normalizeStatus(entry?.status);
          let state: WeekRow['state'] = 'nodata';
          if (!entry) {
            if (ymd > todayStr) {
              state = 'upcoming';
            } else {
              state = 'missed';
            }
          } else if (status === 'approved') state = 'approved';
          else if (status === 'pending') state = 'pending';
          else if (status === 'rejected') state = 'rejected';

          const rr = typeof entry?.rr_value === 'number' ? entry.rr_value : null;
          const pointsLabel = rr === null ? '0 pt' : `${rr.toFixed(1)} RR`;

          rows.push({ date: ymd, label, entry, state, pointsLabel });
        }

        setWeekRows(rows);
      } catch (error) {
        console.error(error);
        toast.error('Unable to load weekly view');
        setWeekRows([]);
      } finally {
        setEntriesLoading(false);
      }
    };

    run();
  }, [leagueId, formMemberId, weekOffset]);

  function openDialog(mode: 'add' | 'overwrite', row: WeekRow) {
    setDialogMode(mode);
    setDialogDate(row.date);
    setDialogForm({
      type: row.entry?.type || 'workout',
      workout_type: row.entry?.workout_type || '',
      duration: row.entry?.duration?.toString() || '',
      distance: row.entry?.distance?.toString() || '',
      steps: row.entry?.steps?.toString() || '',
      holes: row.entry?.holes?.toString() || '',
      rr_value: row.entry?.rr_value?.toString() || '',
      proof_url: row.entry?.proof_url || '',
      notes: row.entry?.notes || '',
    });
    setSelectedFile(null);
    setShowPreview(false);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!leagueId || !formMemberId || !dialogDate) return;

    const durationNum = toNumber(dialogForm.duration);
    const distanceNum = toNumber(dialogForm.distance);
    const stepsNum = toNumber(dialogForm.steps);
    const holesNum = toNumber(dialogForm.holes);

    // Validate max values to prevent unreasonable entries
    if (typeof durationNum === 'number' && (durationNum < 0 || durationNum > 1440)) {
      toast.error('Duration must be between 0 and 1440 minutes (24 hours).');
      return;
    }
    if (typeof distanceNum === 'number' && (distanceNum < 0 || distanceNum > 1000)) {
      toast.error('Distance must be between 0 and 1000 km.');
      return;
    }
    if (typeof stepsNum === 'number' && (stepsNum < 0 || stepsNum > 500000)) {
      toast.error('Steps must be between 0 and 500,000.');
      return;
    }
    if (typeof holesNum === 'number' && (holesNum < 0 || holesNum > 36)) {
      toast.error('Holes must be between 0 and 36.');
      return;
    }

    if (dialogForm.type === 'workout') {
      if (workoutCategory === 'steps') {
        if (typeof stepsNum !== 'number' || stepsNum <= 0) {
          toast.error('Steps are required for a steps workout. Enter a positive number.');
          return;
        }
      } else if (workoutCategory === 'golf') {
        if (typeof holesNum !== 'number' || holesNum <= 0) {
          toast.error('Holes are required for a golf workout. Enter a positive number.');
          return;
        }
      } else if (workoutCategory === 'run' || workoutCategory === 'cycling') {
        const hasDuration = typeof durationNum === 'number' && durationNum > 0;
        const hasDistance = typeof distanceNum === 'number' && distanceNum > 0;
        if ((hasDuration && hasDistance) || (!hasDuration && !hasDistance)) {
          toast.error('Provide either duration or distance (not both) for this workout.');
          return;
        }
      } else if (workoutCategory === 'other') {
        if (typeof durationNum !== 'number' || durationNum <= 0) {
          toast.error('Duration is required for this workout. Enter a positive number.');
          return;
        }
      }

      if (dialogMode === 'overwrite') {
        const hasProof = (dialogForm.proof_url && dialogForm.proof_url.trim().length > 0) || selectedFile;
        if (!hasProof) {
          toast.error('Proof image is required when overwriting. Upload or paste a proof URL.');
          return;
        }
      }
    }

    setDialogSubmitting(true);
    try {
      let finalProofUrl = dialogForm.proof_url;

      if (selectedFile) {
        setUploadingProof(true);
        try {
          finalProofUrl = await uploadProofFile(selectedFile, leagueId);
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : 'Proof upload failed');
          setUploadingProof(false);
          setDialogSubmitting(false);
          return;
        }
        setUploadingProof(false);
      }

      const payload = {
        league_member_id: formMemberId,
        date: dialogDate,
        type: dialogForm.type,
        workout_type: dialogForm.workout_type || null,
        duration: durationNum,
        distance: distanceNum,
        steps: stepsNum,
        holes: holesNum,
        rr_value: typeof computedRR === 'number' ? computedRR : null,
        proof_url: finalProofUrl || null,
        notes: dialogForm.notes || null,
        overwriteExisting: true,
      };

      const res = await fetch(`/api/leagues/${leagueId}/manual-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save entry');

      toast.success(dialogMode === 'overwrite' ? 'Entry overwritten' : 'Entry added');
      setDialogOpen(false);

      const start = addDays(startOfWeekSunday(new Date()), -weekOffset * 7);
      const end = addDays(start, 6);
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');
      setEntriesLoading(true);
      const refresh = await fetch(
        `/api/leagues/${leagueId}/members/${formMemberId}/entries?startDate=${startDate}&endDate=${endDate}`
      );
      if (refresh.ok) {
        const json2 = await refresh.json();
        const entries: Entry[] = json2?.data?.entries || [];
        const byDate = new Map<string, Entry>();
        entries.forEach((e) => {
          if (!e.date) return;
          const existing = byDate.get(e.date);
          if (!existing) byDate.set(e.date, e);
          else byDate.set(e.date, latestEntry(existing, e));
        });
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const rows: WeekRow[] = [];
        for (let i = 0; i < 7; i += 1) {
          const day = addDays(start, i);
          const ymd = format(day, 'yyyy-MM-dd');
          const label = format(day, 'EEE, MMM dd, yyyy');
          const entry = byDate.get(ymd) || null;
          const status = normalizeStatus(entry?.status);
          let state: WeekRow['state'] = 'nodata';
          if (!entry) state = ymd > todayStr ? 'upcoming' : 'missed';
          else if (status === 'approved') state = 'approved';
          else if (status === 'pending') state = 'pending';
          else if (status === 'rejected') state = 'rejected';
          const rr = typeof entry?.rr_value === 'number' ? entry.rr_value : null;
          const pointsLabel = rr === null ? '0 pt' : `${rr.toFixed(1)} RR`;
          rows.push({ date: ymd, label, entry, state, pointsLabel });
        }
        setWeekRows(rows);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to save entry');
    } finally {
      setDialogSubmitting(false);
      setEntriesLoading(false);
    }
  }

  if (!roleLoading && !canUsePage) {
    return (
      <div className="max-w-3xl space-y-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Restricted</AlertTitle>
          <AlertDescription>Only the league host or governor can create or overwrite player workouts.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const weekStart = addDays(startOfWeekSunday(new Date()), -weekOffset * 7);
  const canGoNext = weekOffset > 0;
  const computedRR = computeRunRateFromForm(dialogForm);
  const workoutCategory = getWorkoutCategory(dialogForm.type, dialogForm.workout_type);
  const showDuration = workoutCategory !== 'rest' && workoutCategory !== 'steps' && workoutCategory !== 'golf';
  const showDistance = workoutCategory === 'run' || workoutCategory === 'cycling';
  const showSteps = workoutCategory === 'steps';
  const showHoles = workoutCategory === 'golf';

  // Build a lookup map to resolve custom activity UUIDs to display names
  const activityNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (activitiesData?.activities || []).forEach((a) => {
      map.set(a.value, a.activity_name);
      if (a.custom_activity_id) map.set(a.custom_activity_id, a.activity_name);
      if (a.activity_id) map.set(a.activity_id, a.activity_name);
    });
    return map;
  }, [activitiesData]);

  const resolveWorkoutType = (wt: string | null) => {
    if (!wt) return '';
    return activityNameMap.get(wt) || wt;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <h1 className="text-2xl font-bold tracking-tight">Manual Workout Entry</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Hosts and Governors can add or overwrite a player's workout day-by-day with proof.
        </p>
      </div>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Pick a player</CardTitle>
          <CardDescription>Select the player to manage, then adjust the week and add/overwrite entries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select
                value={selectedTeam}
                onValueChange={(value) => {
                  setSelectedTeam(value);
                  setFormMemberId('');
                  setWeekOffset(0);
                }}
                disabled={membersLoading}
              >
                <SelectTrigger
                  id="team"
                  className="h-auto min-h-12 py-3 [&>span]:line-clamp-none [&>span]:whitespace-normal text-left"
                >
                  <SelectValue placeholder={membersLoading ? 'Loading teams...' : 'Select team'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teamOptions.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member">Player</Label>
              <Select
                value={formMemberId}
                onValueChange={(value) => setFormMemberId(value)}
                disabled={membersLoading || !selectedTeam}
              >
                <SelectTrigger id="member" className="h-auto min-h-12 py-3 [&>span]:line-clamp-none [&>span]:whitespace-normal text-left">
                  <SelectValue
                    placeholder={
                      membersLoading
                        ? 'Loading players...'
                        : !selectedTeam
                          ? 'Select team first'
                          : 'Select player'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredMembers.map((member) => (
                    <SelectItem key={member.league_member_id} value={member.league_member_id}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{member.username || member.email}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                        {member.team_name ? (
                          <span className="text-xs text-muted-foreground">Team: {member.team_name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Team: Unassigned</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Week</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  disabled={!formMemberId}
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekOffset((w) => (canGoNext ? Math.max(0, w - 1) : w))}
                  disabled={!formMemberId || !canGoNext}
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  {formatWeekRange(weekStart)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="divide-y">
              {!formMemberId ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Select a player to view the week.</div>
              ) : entriesLoading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading week…</div>
              ) : weekRows === null || weekRows.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No data for this week.</div>
              ) : (
                weekRows.map((row) => {
                  const isApproved = row.state === 'approved';
                  const isMissed = row.state === 'missed';
                  const isUpcoming = row.state === 'upcoming';
                  const actionLabel = isApproved ? 'Overwrite' : 'Add workout';
                  const canAct = !isUpcoming;

                  const statusColor =
                    row.state === 'approved'
                      ? 'text-emerald-500'
                      : row.state === 'pending'
                        ? 'text-amber-500'
                        : row.state === 'rejected'
                          ? 'text-red-500'
                          : 'text-muted-foreground';

                  return (
                    <div key={row.date} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{row.label}</span>
                        <span className={cn('text-sm', statusColor)}>
                          {row.entry
                            ? `${row.entry.type === 'workout' ? 'Workout' : 'Rest Day'}${row.entry.workout_type ? ` - ${resolveWorkoutType(row.entry.workout_type)}` : ''}${row.entry.status ? ` - ${row.entry.status}` : ''}`
                            : row.state === 'missed'
                              ? 'Missed day'
                              : row.state === 'upcoming'
                                ? 'Upcoming'
                                : 'No submission'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium tabular-nums text-muted-foreground">{row.pointsLabel}</span>
                        <Button
                          size="sm"
                          variant={isApproved ? 'secondary' : 'default'}
                          disabled={!canAct}
                          onClick={() => openDialog(isApproved ? 'overwrite' : 'add', row)}
                        >
                          {isApproved ? <PenSquare className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                          {actionLabel}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Audit hint</AlertTitle>
        <AlertDescription>
          Entries added here are auto-approved and logged under your account as the creator. Keep proof links for compliance.
          {activeLeague?.name ? ` League: ${activeLeague.name}.` : ''}
        </AlertDescription>
      </Alert>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'overwrite' ? 'Overwrite entry' : 'Add workout'} {dialogDate ? ` | ${dialogDate}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={dialogForm.type}
                onValueChange={(value: 'workout' | 'rest') => setDialogForm((p) => ({ ...p, type: value }))}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workout">Workout</SelectItem>
                  <SelectItem value="rest">Rest Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workout_type">Workout Type</Label>
              <Select
                value={dialogForm.workout_type || ''}
                onValueChange={(value) => setDialogForm((p) => ({ ...p, workout_type: value }))}
                disabled={dialogForm.type === 'rest' || activitiesLoading || !!activitiesError}
              >
                <SelectTrigger id="workout_type">
                  <SelectValue placeholder={activitiesLoading ? 'Loading activities...' : 'Select activity'} />
                </SelectTrigger>
                <SelectContent>
                  {(activitiesData?.activities || []).map((activity) => (
                    <SelectItem key={activity.activity_id} value={activity.value}>
                      {activity.activity_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!activitiesLoading && (activitiesError || (activitiesData?.activities || []).length === 0) ? (
                <p className="text-xs text-muted-foreground">No activities configured for this league. Configure league activities to enable selection.</p>
              ) : null}
            </div>

            {showDuration && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes){' '}
                  {workoutCategory === 'run' || workoutCategory === 'cycling' ? <span className="text-destructive">(required if no distance)</span> : null}
                  {workoutCategory === 'other' ? <span className="text-destructive">(required)</span> : null}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min={0}
                  max={1440}
                  step="1"
                  value={dialogForm.duration}
                  onChange={(e) => setDialogForm((p) => ({ ...p, duration: e.target.value }))}
                />
                {workoutCategory === 'run' || workoutCategory === 'cycling' ? (
                  <p className="text-xs text-muted-foreground">Provide either duration or distance, not both.</p>
                ) : null}
              </div>
            )}

            {showDistance && (
              <div className="space-y-2">
                <Label htmlFor="distance">Distance (km) <span className="text-destructive">(required if no duration)</span></Label>
                <Input
                  id="distance"
                  type="number"
                  min={0}
                  max={1000}
                  step="0.1"
                  value={dialogForm.distance}
                  onChange={(e) => setDialogForm((p) => ({ ...p, distance: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Provide either distance or duration, not both.</p>
              </div>
            )}

            {showSteps && (
              <div className="space-y-2">
                <Label htmlFor="steps">Steps <span className="text-destructive">(required)</span></Label>
                <Input
                  id="steps"
                  type="number"
                  min={0}
                  max={500000}
                  step="1"
                  value={dialogForm.steps}
                  onChange={(e) => setDialogForm((p) => ({ ...p, steps: e.target.value }))}
                />
              </div>
            )}

            {showHoles && (
              <div className="space-y-2">
                <Label htmlFor="holes">Holes (golf) <span className="text-destructive">(required)</span></Label>
                <Input
                  id="holes"
                  type="number"
                  min={0}
                  max={36}
                  step="1"
                  value={dialogForm.holes}
                  onChange={(e) => setDialogForm((p) => ({ ...p, holes: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rr_value">Run Rate (RR)</Label>
              <Input
                id="rr_value"
                type="number"
                min={0}
                step="0.1"
                value={typeof computedRR === 'number' ? computedRR.toFixed(2) : ''}
                readOnly
                aria-readonly="true"
              />
              <p className="text-xs text-muted-foreground">Auto-calculated from workout type, duration, distance, steps, or holes.</p>
            </div>

            {dialogForm.type !== 'rest' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="proof_upload">Upload new proof (image)</Label>
                <Input
                  id="proof_upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={uploadingProof || dialogSubmitting || !leagueId}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedFile
                    ? `Selected: ${selectedFile.name}`
                    : 'Images only (JPG, PNG, GIF, WebP), max 10MB. Uploaded on save.'}
                </p>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Context for this entry (visible to auditors)"
                value={dialogForm.notes}
                onChange={(e) => setDialogForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {dialogForm.type !== 'rest' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="proof_url">Current proof</Label>
                <div className="flex gap-2">
                  <Input
                    id="proof_url"
                    type="url"
                    placeholder="Link to uploaded proof"
                    value={dialogForm.proof_url}
                    onChange={(e) => setDialogForm((p) => ({ ...p, proof_url: e.target.value }))}
                  />
                  {dialogForm.proof_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowPreview(!showPreview)}
                      title={showPreview ? 'Hide Preview' : 'Show Preview'}
                    >
                      {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                {showPreview && dialogForm.proof_url && (
                  <div className="relative mt-2 overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dialogForm.proof_url}
                      alt="Proof preview"
                      className="max-h-[300px] w-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        toast.error('Failed to load image preview');
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {dialogMode === 'overwrite'
                    ? 'Required when overwriting: add proof for the new workout you are submitting now.'
                    : 'Optional for new workouts; upload above to attach proof.'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={dialogSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={dialogSubmitting}>
              {dialogSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Save Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
