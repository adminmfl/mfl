/**
 * My Team Page (Captain)
 * Captain's view for managing their team - members and team info.
 */
'use client';

import { use, useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Trophy,
  Target,
  Crown,
  Flame,
  Search,
  AlertCircle,
  Loader2,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { toast } from '@/lib/toast';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiInsights } from '@/hooks/use-ai-insights';
import { Sparkles } from 'lucide-react';

import type { TeamMember } from '@/hooks/use-league-teams';

// ============================================================================
// Loading Skeleton
// ============================================================================

function PageSkeleton() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="size-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Skeleton className="size-3 rounded-sm" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16" />
            <Skeleton className="mt-1 h-3 w-full" />
          </Card>
        ))}
      </div>

      <div className="px-4 lg:px-6">
        <Skeleton className="h-3 w-52" />
      </div>

      <div className="px-4 lg:px-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-full sm:w-64" />
        </div>

        <div className="rounded-lg border">
          <div className="grid grid-cols-5 gap-3 border-b bg-muted/50 px-4 py-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
          <div className="space-y-4 px-4 py-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid grid-cols-5 items-center gap-3">
                <Skeleton className="h-4 w-6" />
                <div className="col-span-2 flex items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Captain's My Team Page
// ============================================================================

export default function MyTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = use(params);
  const { activeLeague } = useLeague();
  const { isCaptain } = useRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teamRank, setTeamRank] = useState<string>('#--');
  const [teamPoints, setTeamPoints] = useState<string>('--');
  const [teamAvgRR, setTeamAvgRR] = useState<string>('--');
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);

  // Logo dialog state
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const userTeamId = activeLeague?.team_id;
  const [freshTeamName, setFreshTeamName] = useState<string | null>(null);
  const userTeamName = freshTeamName || activeLeague?.team_name;
  const teamCapacity = activeLeague?.league_capacity || 20;

  // AI inline insights
  const { insights: aiInsights } = useAiInsights(leagueId, 'my_team', [
    'team_strip',
    'momentum_insight',
    'leader_badge',
  ]);

  // Combined data fetch for team members, stats, and logo
  useEffect(() => {
    async function fetchData() {
      if (!userTeamId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setLeaderboardError(null);

        // Fetch everything in parallel
        const [membersRes, lbRes, teamRes] = await Promise.all([
          fetch(`/api/leagues/${leagueId}/teams/${userTeamId}/members`),
          fetch(`/api/leagues/${leagueId}/leaderboard?full=true`),
          fetch(`/api/leagues/${leagueId}/teams/${userTeamId}`),
        ]);

        const [membersJson, lbJson, teamJson] = await Promise.all([
          membersRes.json(),
          lbRes.json(),
          teamRes.json(),
        ]);

        // 1. Process Team Members
        if (!membersRes.ok)
          throw new Error(membersJson.error || 'Failed to fetch team members');

        let membersData = membersJson.data || [];

        // 2. Process Leaderboard (Individual Points + Team Stats)
        if (lbRes.ok && lbJson?.success) {
          // Individual points
          if (lbJson.data?.individuals) {
            const pts = new Map<string, number>(
              lbJson.data.individuals.map((i: any) => [
                String(i.user_id),
                Number(i.points || 0),
              ]),
            );
            membersData = membersData.map((m: any) => ({
              ...m,
              points: pts.get(String(m.user_id)) || 0,
            }));
          }

          // Team stats
          if (lbJson.data?.teams) {
            const team = lbJson.data.teams.find(
              (t: any) => String(t.team_id) === String(userTeamId),
            );
            if (team) {
              // Include pending window points
              const pendingTeam = (
                lbJson.data?.pendingWindow?.teams || []
              ).find((t: any) => String(t.team_id) === String(userTeamId));
              const pendingPts = pendingTeam?.total_points ?? 0;

              setTeamRank(`#${team.rank ?? '--'}`);
              const mainPts = team.total_points ?? team.points ?? 0;
              setTeamPoints(String(mainPts + pendingPts));
              setTeamAvgRR(String(team.avg_rr ?? 0));
              if (team.team_name) setFreshTeamName(team.team_name);
            }
          }
        } else if (!lbRes.ok) {
          setLeaderboardError(`Leaderboard request failed: ${lbRes.status}`);
        }

        setMembers(membersData);

        // 3. Process Team Logo
        if (teamRes.ok && teamJson?.success && teamJson.data?.logo_url) {
          setTeamLogoUrl(`${teamJson.data.logo_url}?t=${Date.now()}`);
        }
      } catch (err) {
        console.error('Error fetching My Team data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load team data',
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [leagueId, userTeamId]);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    return members.filter(
      (member) =>
        member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, members]);

  const rrFormula = (activeLeague as any)?.rr_config?.formula || 'standard';
  const showRR = rrFormula === 'standard';
  const showRestDays = ((activeLeague as any)?.rest_days ?? 1) > 0;

  // Stats cards data
  const stats = [
    {
      title: 'Team Rank',
      value: teamRank,
      description: 'League standing',
      detail: 'Rank updates daily',
      icon: Trophy,
    },
    {
      title: 'Team Members',
      value: `${members.length}/${teamCapacity}`,
      description: 'Current roster',
      detail: 'Active members',
      icon: Users,
    },
    {
      title: 'Team Points',
      value: String(teamPoints),
      description: 'Total points',
      detail: 'Combined team effort',
      icon: Target,
    },
    ...(showRR
      ? [
          {
            title: 'Team RR',
            value: String(teamAvgRR),
            description: 'RR',
            detail: 'Average RR per approved entry',
            icon: Flame,
          },
        ]
      : []),
  ];

  // Logo handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userTeamId) return;

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `/api/leagues/${leagueId}/teams/${userTeamId}/logo`,
        {
          method: 'POST',
          body: formData,
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || 'Upload failed');
      // Add cache-busting timestamp to prevent browser from showing cached old image
      const urlWithCacheBust = `${json.data.url}?t=${Date.now()}`;
      setTeamLogoUrl(urlWithCacheBust);
      toast.success('Team logo updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoDelete = async () => {
    if (!userTeamId) return;
    setLogoDeleting(true);
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/teams/${userTeamId}/logo`,
        {
          method: 'DELETE',
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || 'Delete failed');
      setTeamLogoUrl(null);
      toast.success('Team logo removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete logo');
    } finally {
      setLogoDeleting(false);
    }
  };

  // Check if user is captain
  if (!isCaptain) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="px-4 lg:px-6">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              This page is only accessible to team captains. If you believe you
              should have access, please contact your league administrator.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // User not assigned to a team
  if (!userTeamId || !userTeamName) {
    return (
      <div className="@container/main flex flex-1 flex-col items-center justify-center gap-4 min-h-[400px]">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Users className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Not Assigned to a Team</h2>
          <p className="text-muted-foreground mt-1 max-w-md">
            You haven't been assigned to a team yet. Please wait for the host or
            governor to assign you to a team.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {teamLogoUrl ? (
            <img
              src={teamLogoUrl}
              alt={userTeamName || 'Team logo'}
              className="size-14 rounded-xl object-cover shrink-0 shadow-lg"
            />
          ) : activeLeague?.team_logo_url ? (
            <img
              src={activeLeague.team_logo_url}
              alt={userTeamName || 'Team logo'}
              className="size-14 rounded-xl object-cover shrink-0 shadow-lg"
            />
          ) : (
            <div className="size-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-lg">
              <Crown className="size-7 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {userTeamName}
            </h1>
            <p className="text-muted-foreground">Manage your team as captain</p>
            {aiInsights.team_strip && (
              <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                <Sparkles className="size-3 shrink-0" />
                {aiInsights.team_strip}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-200"
          >
            <Crown className="size-3 mr-1" />
            Team Captain
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogoDialogOpen(true)}
            className="gap-2"
          >
            <Camera className="size-4" />
            Team Logo
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-4 lg:px-6">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {leaderboardError && (
        <div className="px-4 lg:px-6">
          <Alert variant="destructive">
            <AlertTitle>Leaderboard Error</AlertTitle>
            <AlertDescription>{leaderboardError}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Stats Cards - Compact 2x2 grid */}
      <div className="grid grid-cols-2 gap-2 px-4 lg:px-6">
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
            <Card key={index} className="p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5">
                <StatIcon className="size-3" />
                {stat.title}
              </div>
              <div className="text-lg font-bold tabular-nums leading-tight">
                {stat.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                {stat.description}
              </div>
            </Card>
          );
        })}
      </div>

      {/* AI Momentum Insight */}
      {aiInsights.momentum_insight && (
        <div className="px-4 lg:px-6">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3 text-primary/60 shrink-0" />
            {aiInsights.momentum_insight}
          </p>
        </div>
      )}

      {/* Team Members Table */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Team Members</h2>
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''} in your
              team
            </p>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Members Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-8 text-center">#</TableHead>
                <TableHead>Member</TableHead>
                {showRR && (
                  <TableHead className="w-16 text-center">Avg RR</TableHead>
                )}
                {showRestDays && (
                  <TableHead className="w-16 text-center">Rest Days</TableHead>
                )}
                <TableHead className="w-16 text-center">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, index) => (
                  <TableRow key={member.league_member_id}>
                    <TableCell className="text-muted-foreground text-center text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {member.username
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          {member.is_captain && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-background">
                              <Crown className="size-2 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-sm truncate">
                          {member.username}
                        </span>
                      </div>
                    </TableCell>
                    {showRR && (
                      <TableCell className="text-center text-sm tabular-nums">
                        {((member as any).avg_rr ?? 0).toFixed(1)}
                      </TableCell>
                    )}
                    {showRestDays && (
                      <TableCell className="text-center text-sm tabular-nums">
                        {(member as any).rest_days_used ?? 0}
                      </TableCell>
                    )}
                    <TableCell className="text-center text-sm font-medium tabular-nums">
                      {(member as any).points ?? 0}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {searchQuery
                      ? 'No members found matching your search.'
                      : 'No members in this team yet.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Team Logo Dialog */}
      <Dialog open={logoDialogOpen} onOpenChange={setLogoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Team Logo</DialogTitle>
            <DialogDescription>
              Upload or change your team's logo. Max 2MB. Supported: PNG, JPG,
              WebP.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {teamLogoUrl ? (
              <div className="relative">
                <img
                  src={teamLogoUrl}
                  alt="Team Logo"
                  className="size-32 rounded-xl object-cover shadow-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 size-8 rounded-full"
                  onClick={handleLogoDelete}
                  disabled={logoDeleting}
                >
                  {logoDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="size-32 rounded-xl bg-muted flex items-center justify-center">
                <Camera className="size-12 text-muted-foreground" />
              </div>
            )}
            <div className="w-full">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
                id="captain-logo-upload"
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />{' '}
                    {teamLogoUrl ? 'Change Logo' : 'Upload Logo'}
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
