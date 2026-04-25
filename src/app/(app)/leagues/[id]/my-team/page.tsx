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
  Shield,
  Flame,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  UserMinus,
  MoreVertical,
  Loader2,
  Camera,
  Upload,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { toast } from '@/lib/toast';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { useLeagueTeams } from '@/hooks/use-league-teams';
import { AddPlayersDialog } from '@/components/leagues/add-players-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAiInsights } from '@/hooks/use-ai-insights';
import { Sparkles } from 'lucide-react';

import type { TeamMember } from '@/hooks/use-league-teams';

// ============================================================================
// Loading Skeleton
// ============================================================================

function PageSkeleton() {
  return <DumbbellLoading label="Loading team..." />;
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
  const { isCaptain, isViceCaptain, isHost } = useRole();
  const {
    data: teamsData,
    isLoading: teamsLoading,
    assignMember,
    refetch: refetchTeams,
  } = useLeagueTeams(leagueId);

  console.debug('[MyTeamPage] render', { leagueId, activeLeague });

  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnallocatedDialogOpen, setIsUnallocatedDialogOpen] = useState(false);
  // Team selector removed - captains can only add to their own team
  const [unallocatedSearchQuery, setUnallocatedSearchQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [assigningMembers, setAssigningMembers] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  const [teamRank, setTeamRank] = useState<string>('#--');
  const [teamPoints, setTeamPoints] = useState<string>('--');
  const [teamAvgRR, setTeamAvgRR] = useState<string>('--');
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);

  // Add players dialog state
  const [addPlayersOpen, setAddPlayersOpen] = useState(false);

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

      console.debug('[MyTeamPage] fetchData start', { leagueId, userTeamId });

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
              setTeamRank(`#${team.rank ?? '--'}`);
              const mainPts = team.total_points ?? team.points ?? 0;
              setTeamPoints(String(mainPts));

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

  // Check if user is captain or host
  if (!isCaptain && !isViceCaptain && !isHost) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="px-4 lg:px-6">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              This page is only accessible to team captains and league hosts. If
              you believe you should have access, please contact your league
              administrator.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // User not assigned to a team
  if (!userTeamId || !userTeamName) {
    // Hosts can still add players even without a team assignment
    if (isHost) {
      return (
        <div className="@container/main flex flex-1 flex-col items-center justify-center gap-4 min-h-[400px]">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="size-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold">Manage Players</h2>
            <p className="text-muted-foreground mt-1 max-w-md">
              You're not assigned to a team, but as host you can add players to
              the league.
            </p>
          </div>
          <Button onClick={() => setAddPlayersOpen(true)} className="gap-2">
            <UserPlus className="size-4" />
            Add Players
          </Button>
          <AddPlayersDialog
            open={addPlayersOpen}
            onOpenChange={setAddPlayersOpen}
            leagueId={leagueId}
            teams={
              teamsData?.teams?.map((t) => ({
                team_id: t.team_id,
                team_name: t.team_name,
              })) || []
            }
          />
        </div>
      );
    }
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
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddPlayersOpen(true)}
              className="gap-2"
            >
              <UserPlus className="size-4" />
              Add Players
            </Button>
          )}
          {teamsData?.members?.unallocated &&
            teamsData.members.unallocated.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsUnallocatedDialogOpen(true)}
                className="gap-2"
              >
                <Users className="size-4" />
                Unallocated Members ({teamsData.members.unallocated.length})
              </Button>
            )}
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
              {paginatedMembers.length > 0 ? (
                paginatedMembers.map((member, index) => (
                  <TableRow key={member.league_member_id}>
                    <TableCell className="text-muted-foreground text-center text-sm">
                      {pagination.pageIndex * pagination.pageSize + index + 1}
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

        {/* Pagination */}
        {filteredMembers.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {filteredMembers.length} member(s) total
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="members-rows" className="text-sm">
                  Rows per page
                </Label>
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={(v) =>
                    setPagination({
                      ...pagination,
                      pageSize: Number(v),
                      pageIndex: 0,
                    })
                  }
                >
                  <SelectTrigger className="w-16" id="members-rows">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm">
                Page {pagination.pageIndex + 1} of {pageCount || 1}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setPagination({ ...pagination, pageIndex: 0 })}
                  disabled={pagination.pageIndex === 0}
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      pageIndex: pagination.pageIndex - 1,
                    })
                  }
                  disabled={pagination.pageIndex === 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      pageIndex: pagination.pageIndex + 1,
                    })
                  }
                  disabled={pagination.pageIndex >= pageCount - 1}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    setPagination({ ...pagination, pageIndex: pageCount - 1 })
                  }
                  disabled={pagination.pageIndex >= pageCount - 1}
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unallocated Members Dialog */}
      <Dialog
        open={isUnallocatedDialogOpen}
        onOpenChange={setIsUnallocatedDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Unallocated Members
            </DialogTitle>
            <DialogDescription>
              These members have joined the league but are not yet assigned to
              any team. ({teamsData?.members?.unallocated?.length || 0} total)
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Add to own team action */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Add members to{' '}
                <span className="font-medium text-foreground">
                  {userTeamName}
                </span>
              </p>
              <Button
                onClick={handleBulkAssignMembers}
                disabled={selectedMemberIds.size === 0 || isBulkAssigning}
                className="shrink-0"
              >
                {isBulkAssigning ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Users className="size-4 mr-2" />
                    Add Selected ({selectedMemberIds.size})
                  </>
                )}
              </Button>
            </div>

            {/* Search and Select All */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={unallocatedSearchQuery}
                  onChange={(e) => setUnallocatedSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={isBulkAssigning}
                />
              </div>
              {filteredUnallocatedMembers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={isBulkAssigning}
                >
                  {selectedMemberIds.size ===
                    filteredUnallocatedMembers.length &&
                  filteredUnallocatedMembers.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              )}
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredUnallocatedMembers.length > 0 ? (
                filteredUnallocatedMembers.map((member) => {
                  const isHost = member.roles?.includes('host');
                  const isSelected = selectedMemberIds.has(
                    member.league_member_id,
                  );
                  return (
                    <div
                      key={member.league_member_id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors overflow-hidden cursor-pointer"
                      onClick={() =>
                        !isBulkAssigning &&
                        toggleMemberSelection(member.league_member_id)
                      }
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          toggleMemberSelection(member.league_member_id)
                        }
                        disabled={isBulkAssigning}
                        className="shrink-0"
                      />
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {member.username
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="font-medium truncate">
                          {member.username}
                        </div>
                      </div>
                      {isHost && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          host
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {unallocatedSearchQuery
                    ? 'No members found matching your search.'
                    : 'No unallocated members.'}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Add Players Dialog (Host only) */}
      {isHost && (
        <AddPlayersDialog
          open={addPlayersOpen}
          onOpenChange={setAddPlayersOpen}
          leagueId={leagueId}
          teams={
            teamsData?.teams?.map((t) => ({
              team_id: t.team_id,
              team_name: t.team_name,
            })) || []
          }
        />
      )}
    </div>
  );
}
