'use client';

import React, { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  Globe,
  Lock,
  Users,
  Info,
  Shield,
  Calendar,
  Activity,
  CheckCircle2,
  Circle,
} from 'lucide-react';

import { useRole } from '@/contexts/role-context';
import { useLeague } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useLeagueTeams } from '@/hooks/use-league-teams';
import { useLeagueActivities } from '@/hooks/use-league-activities';

// ============================================================================
// League Settings Page (Host Only)
// ============================================================================

function FieldInfoButton({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-5 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 active:scale-95 transition-transform"
          aria-label="Field information"
        >
          <Info className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-[200px] text-xs p-2 bg-popover border shadow-lg">
        <p className="text-muted-foreground leading-relaxed">{text}</p>
      </PopoverContent>
    </Popover>
  );
}

export default function LeagueSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isHost } = useRole();
  const { activeLeague, refetch } = useLeague();
  const { data: teamsData, isLoading: teamsLoading } = useLeagueTeams(id);
  const { data: activitiesData, isLoading: activitiesLoading } = useLeagueActivities(id);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    league_name: activeLeague?.name || '',
    description: activeLeague?.description || '',
    is_public: false,
    is_exclusive: true,
    num_teams: '4',
    rest_days: '1',
    auto_rest_day_enabled: true,
    start_date: '',
    end_date: '',
    status: 'draft' as 'draft' | 'launched' | 'active' | 'completed',
    normalize_points_by_team_size: true,
    max_team_capacity: '10',
    rr_formula: 'standard' as 'standard' | 'simple' | 'points_only',
    branding_display_name: '',
    branding_tagline: '',
    branding_primary_color: '',
    branding_powered_by: true,
  });

  const canEditStructure = formData.status === 'draft';
  const today = new Date().toISOString().slice(0, 10);
  const canEditStartDate = canEditStructure || !formData.start_date || formData.start_date >= today;
  const canEditEndDate = canEditStructure || !formData.end_date || formData.end_date >= today;
  const isTeamsConfigured = (teamsData?.teams?.length ?? 0) > 0;
  const isActivitiesConfigured = (activitiesData?.activities?.length ?? 0) > 0;
  const setupCompletedCount = Number(isTeamsConfigured) + Number(isActivitiesConfigured);
  const setupTotalCount = 2;
  const showSetupChecklist = !teamsLoading && !activitiesLoading && setupCompletedCount < setupTotalCount;

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`/api/leagues/${id}/logo`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Upload failed');
      }

      setLogoUrl(json.data?.url || null);
      toast.success('League logo updated');
      await refetch();
    } catch (error) {
      console.error('[League Settings] logo upload', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleLogoUpload(file);
      e.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    setLogoDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${id}/logo`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Delete failed');
      }
      setLogoUrl(null);
      toast.success('League logo removed');
      await refetch();
    } catch (error) {
      console.error('[League Settings] logo delete', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete logo');
    } finally {
      setLogoDeleting(false);
    }
  };

  useEffect(() => {
    const loadLeague = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/leagues/${id}`);
        if (!res.ok) {
          throw new Error('Failed to load league');
        }

        const json = await res.json();
        const league = json.data;

        const rrCfg = league.rr_config || {};
        const brand = league.branding || {};
        setFormData({
          league_name: league.league_name || '',
          description: league.description || '',
          is_public: !!league.is_public,
          is_exclusive: !!league.is_exclusive,
          num_teams: String(league.num_teams || '4'),
          rest_days: String(league.rest_days ?? '1'),
          auto_rest_day_enabled: !!league.auto_rest_day_enabled,
          start_date: league.start_date,
          end_date: league.end_date,
          status: league.status,
          normalize_points_by_team_size: !!league.normalize_points_by_team_size,
          max_team_capacity: String(league.max_team_capacity || '10'),
          rr_formula: rrCfg.formula || 'standard',
          branding_display_name: brand.display_name || '',
          branding_tagline: brand.tagline || '',
          branding_primary_color: brand.primary_color || '',
          branding_powered_by: brand.powered_by_visible !== false,
        });
        setLogoUrl(league.logo_url || null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load league');
      } finally {
        setLoading(false);
      }
    };

    loadLeague();
  }, [id]);

  // Access check
  if (!isHost) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Shield className="size-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground mb-4">
                Only the league host can access settings.
              </p>
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return <DumbbellLoading label="Loading league settings..." />;
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertTriangle className="size-10 text-destructive mx-auto" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Unable to load league</h2>
                <p className="text-muted-foreground">{loadError}</p>
              </div>
              <Button variant="outline" onClick={() => router.refresh()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      const payload: Record<string, any> = {
        league_name: formData.league_name,
        rest_days: Number(formData.rest_days),
        auto_rest_day_enabled: formData.auto_rest_day_enabled,
        description: formData.description,
        normalize_points_by_team_size: formData.normalize_points_by_team_size,
        max_team_capacity: Number(formData.max_team_capacity),
        rr_config: { formula: formData.rr_formula },
        branding: (formData.branding_display_name || formData.branding_tagline || formData.branding_primary_color)
          ? {
              display_name: formData.branding_display_name || undefined,
              tagline: formData.branding_tagline || undefined,
              primary_color: formData.branding_primary_color || undefined,
              powered_by_visible: formData.branding_powered_by,
            }
          : null,
      };

      // Always send dates — backend will validate if they can be changed
      if (canEditStartDate) payload.start_date = formData.start_date;
      if (canEditEndDate) payload.end_date = formData.end_date;

      if (canEditStructure) {
        Object.assign(payload, {
          is_public: formData.is_public,
          is_exclusive: formData.is_exclusive,
          num_teams: Number(formData.num_teams),
        });
      }

      const res = await fetch(`/api/leagues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to save changes');
      }

      const json = await res.json();
      if (json?.data) {
        const league = json.data;
        setFormData((prev) => ({
          ...prev,
          league_name: league.league_name || prev.league_name,
          description: league.description || '',
          is_public: !!league.is_public,
          is_exclusive: !!league.is_exclusive,
          num_teams: String(league.num_teams || prev.num_teams),
          rest_days: String(league.rest_days ?? prev.rest_days),
          auto_rest_day_enabled: !!league.auto_rest_day_enabled,
          start_date: league.start_date,
          end_date: league.end_date,
          status: league.status,
        }));
      }

      await refetch();

      toast.success('League settings updated.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to delete league');
      }

      await refetch();
      router.push('/dashboard');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete league');
    } finally {
      setDeleting(false);
    }
  };

  // Note: totalMembers calculation removed - capacity now comes from tier

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Settings className="size-6 text-primary" />
            League Settings
            <Badge variant={formData.status === 'active' ? 'default' : 'secondary'} className="capitalize">
              {formData.status}
            </Badge>
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Calendar className="size-3.5" />
            <span>
              {formData.start_date?.split('-').reverse().join('-') || '—'} to {formData.end_date?.split('-').reverse().join('-') || '—'}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure your league settings and preferences
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 lg:px-6">
        <div className="max-w-5xl mx-auto">
          <Card className="overflow-hidden">
            <CardContent className="divide-y">
              {/* Quick Links */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>Manage</Label>
                    {showSetupChecklist && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {setupCompletedCount}/{setupTotalCount} completed
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Manage teams and activities in separate screens.</p>
                  {showSetupChecklist && (
                    <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
                      <p className="font-medium text-foreground">Required setup</p>
                      <p className="text-muted-foreground">Must configure before season starts.</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-md border bg-background/70 px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            {isTeamsConfigured ? (
                              <CheckCircle2 className="size-4 text-green-600" />
                            ) : (
                              <Circle className="size-4 text-muted-foreground" />
                            )}
                            <span className={isTeamsConfigured ? 'text-muted-foreground line-through' : 'text-foreground'}>
                              Team management
                            </span>
                          </div>
                          <Button asChild size="sm" variant={isTeamsConfigured ? 'ghost' : 'outline'} className="h-7 text-[10px]">
                            <Link href={`/leagues/${id}/team`}>
                              {isTeamsConfigured ? 'View' : 'Set up'}
                            </Link>
                          </Button>
                        </div>
                        <div className="flex items-center justify-between rounded-md border bg-background/70 px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            {isActivitiesConfigured ? (
                              <CheckCircle2 className="size-4 text-green-600" />
                            ) : (
                              <Circle className="size-4 text-muted-foreground" />
                            )}
                            <span className={isActivitiesConfigured ? 'text-muted-foreground line-through' : 'text-foreground'}>
                              Configure activities
                            </span>
                          </div>
                          <Button asChild size="sm" variant={isActivitiesConfigured ? 'ghost' : 'outline'} className="h-7 text-[10px]">
                            <Link href={`/leagues/${id}/activities`}>
                              {isActivitiesConfigured ? 'View' : 'Set up'}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <Button
                    asChild
                    variant="outline"
                    className="h-auto py-1.5 px-1 text-[11px] sm:text-xs gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 dark:border-primary/30 dark:bg-primary/15 dark:text-primary-foreground/90 whitespace-normal text-center leading-tight"
                  >
                    <Link href={`/leagues/${id}/team`}>
                      <Users className="size-3.5 shrink-0" />
                      Team Management
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-auto py-1.5 px-1 text-[11px] sm:text-xs gap-1.5 border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 dark:border-accent/40 dark:bg-accent/15 dark:text-accent-foreground whitespace-normal text-center leading-tight"
                  >
                    <Link href={`/leagues/${id}/activities`}>
                      <Activity className="size-3.5 shrink-0" />
                      Configure Activities
                    </Link>
                  </Button>
                </div>
              </div>

              {/* League Name */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="league_name">League Name</Label>
                    <FieldInfoButton text="Shown across invites, leaderboard, and member views." />
                  </div>
                </div>
                <div className="w-full sm:max-w-sm">
                  <Input
                    id="league_name"
                    value={formData.league_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        league_name: e.target.value,
                      }))
                    }
                    placeholder="Enter league name"
                    className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="description">Description</Label>
                    <FieldInfoButton text="Optional summary shown on the league page." />
                  </div>
                </div>
                <div className="w-full sm:max-w-md">
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Describe your league goals and rules..."
                    className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>Schedule</Label>
                    <FieldInfoButton text="Dates can be edited if they haven't passed yet." />
                  </div>
                </div>
                <div className="w-full max-w-md flex gap-2">
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                    }
                    disabled={!canEditStartDate}
                    className="flex-1 min-w-0 bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground text-[12px] sm:text-sm px-2.5"
                  />
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, end_date: e.target.value }))
                    }
                    disabled={!canEditEndDate}
                    className="flex-1 min-w-0 bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground text-[12px] sm:text-sm px-2.5"
                  />
                </div>
              </div>

              {/* Teams */}
              <div className="flex items-center justify-between gap-3 py-5">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>Number of Teams</Label>
                    <FieldInfoButton text="Team count can be edited in draft mode only." />
                  </div>
                </div>
                <Select
                  value={formData.num_teams}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, num_teams: v }))
                  }
                  disabled={!canEditStructure}
                >
                  <SelectTrigger className="w-28 bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground text-center justify-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} teams
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Team Capacity */}
              <div className="flex items-center justify-between gap-3 py-5">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="max_team_capacity">Max Team Capacity</Label>
                    <FieldInfoButton text="Maximum members allowed per team." />
                  </div>
                  <p className="text-xs text-muted-foreground">Limits team size for joining.</p>
                </div>
                <Input
                  id="max_team_capacity"
                  type="number"
                  min="1"
                  value={formData.max_team_capacity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_team_capacity: e.target.value }))
                  }
                  placeholder="e.g. 10"
                  className="w-20 bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground text-center"
                />
              </div>

              {/* Rest Days */}
              <div className="flex items-center justify-between gap-3 py-5">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rest_days">Total Rest Days</Label>
                    <FieldInfoButton text="Total rest days per member." />
                  </div>
                </div>
                <Input
                  id="rest_days"
                  type="number"
                  min="0"
                  value={formData.rest_days}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rest_days: e.target.value }))
                  }
                  placeholder="e.g. 18"
                  className="w-20 bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground text-center"
                />
              </div>

              {/* Auto Rest Day */}
              <div className="flex items-center justify-between gap-3 py-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label>Auto Rest Day</Label>
                    <FieldInfoButton text="When enabled, the cron job assigns a rest day for members with remaining rest days and no submission for the previous day." />
                  </div>
                </div>
                <Switch
                  checked={formData.auto_rest_day_enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, auto_rest_day_enabled: checked }))
                  }
                />
              </div>

              {/* Point Normalization */}
              <div className="flex items-center justify-between gap-3 py-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label>Point Normalization</Label>
                    <FieldInfoButton text="When enabled, team points are normalized using the formula: (raw_points / team_size) × max_team_size" />
                  </div>
                </div>
                <Switch
                  checked={formData.normalize_points_by_team_size}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, normalize_points_by_team_size: checked }))
                  }
                />
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between gap-3 py-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="size-4 text-muted-foreground" />
                      Private League
                    </Label>
                    <FieldInfoButton text="Private leagues are not publicly discoverable. Members can only join via invite code." />
                  </div>
                </div>
                <Switch
                  checked={true}
                  disabled
                />
              </div>

              {/* Invite Only */}
              <div className="flex items-center justify-between gap-3 py-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="size-4 text-muted-foreground" />
                      Invite Only
                    </Label>
                    <FieldInfoButton text="Invite-only leagues require a join code." />
                  </div>
                </div>
                <Switch
                  checked={formData.is_exclusive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_exclusive: checked }))
                  }
                  disabled={!canEditStructure}
                />
              </div>

              {/* RR Formula */}
              <div className="flex items-center justify-between gap-3 py-5">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>Scoring Formula</Label>
                    <FieldInfoButton text="Controls how Run Rate (RR) is calculated. Standard: metric-based (duration/45min = 1 RR). Simple: binary 1 or 0. Points Only: always 1 RR, use points_per_session for scoring." />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.rr_formula === 'standard' && 'Metric-based RR calculation (default)'}
                    {formData.rr_formula === 'simple' && 'Binary: 1.0 if activity done, 0 otherwise'}
                    {formData.rr_formula === 'points_only' && 'Always 1.0 RR — scoring via points per session'}
                  </p>
                </div>
                <Select
                  value={formData.rr_formula}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, rr_formula: v as any }))
                  }
                >
                  <SelectTrigger className="w-36 bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="points_only">Points Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* White-Label Branding */}
              <div className="flex flex-col gap-4 py-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>White-Label Branding</Label>
                    <FieldInfoButton text="Customize how your league appears. Override the default MFL branding with your own name, tagline, and colors." />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to use default MFL branding.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="branding_display_name" className="text-xs text-muted-foreground">Display Name</Label>
                    <Input
                      id="branding_display_name"
                      value={formData.branding_display_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, branding_display_name: e.target.value }))}
                      placeholder="e.g. PowerFit Corporate"
                      className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="branding_tagline" className="text-xs text-muted-foreground">Tagline</Label>
                    <Input
                      id="branding_tagline"
                      value={formData.branding_tagline}
                      onChange={(e) => setFormData((prev) => ({ ...prev, branding_tagline: e.target.value }))}
                      placeholder="e.g. Get Fit, Stay Strong"
                      className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="branding_primary_color" className="text-xs text-muted-foreground">Brand Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="branding_primary_color"
                        value={formData.branding_primary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, branding_primary_color: e.target.value }))}
                        placeholder="#1a5276"
                        className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground flex-1"
                      />
                      {formData.branding_primary_color && /^#[0-9a-fA-F]{6}$/.test(formData.branding_primary_color) && (
                        <div
                          className="size-8 rounded-md border shrink-0"
                          style={{ backgroundColor: formData.branding_primary_color }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 self-end pb-1">
                    <Label className="text-xs text-muted-foreground">"Powered by MFL"</Label>
                    <Switch
                      checked={formData.branding_powered_by}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, branding_powered_by: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* League Logo */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>League Logo</Label>
                    <FieldInfoButton text="logo for your league pages and invites." />
                  </div>
                  <p className="text-xs text-muted-foreground">PNG/JPEG/WebP, max 2MB. Recommended 512×512.</p>
                </div>
                <div className="w-full sm:max-w-md">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="League logo" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No logo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        size="sm"
                      >
                        {logoUploading ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 size-4" />
                            Upload
                          </>
                        )}
                      </Button>
                      {logoUrl && (
                        <Button
                          variant="secondary"
                          onClick={handleLogoDelete}
                          disabled={logoDeleting}
                          size="sm"
                        >
                          {logoDeleting ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 size-4" />
                              Remove
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoFileChange}
                    />
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>Save Changes</Label>
                    <FieldInfoButton text="Apply your configuration updates." />
                  </div>
                  <p className="text-xs text-muted-foreground">Some settings may not take effect immediately for active leagues.</p>
                </div>
                <div className="w-full sm:max-w-sm">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 size-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  {saveError && (
                    <p className="text-sm text-destructive mt-2">{saveError}</p>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-destructive">
                    <Label className="text-destructive">Delete League</Label>
                    <FieldInfoButton text="Irreversible action. Deletes all data." />
                  </div>
                  <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <Trash2 className="mr-2 size-4" />
                      Delete League
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the league and remove all associated data
                        including teams, members, and submissions.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          'Delete League'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}
