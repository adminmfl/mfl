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
} from 'lucide-react';
import { toast } from 'sonner';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { useLeagueTeams } from '@/hooks/use-league-teams';
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
  const { isCaptain } = useRole();
  const { data: teamsData, isLoading: teamsLoading, assignMember, refetch: refetchTeams } = useLeagueTeams(leagueId);

  console.debug('[MyTeamPage] render', { leagueId, activeLeague });

  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnallocatedDialogOpen, setIsUnallocatedDialogOpen] = useState(false);
  // Team selector removed - captains can only add to their own team
  const [unallocatedSearchQuery, setUnallocatedSearchQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [assigningMembers, setAssigningMembers] = useState<Set<string>>(new Set());
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

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

  // Fetch team members
  useEffect(() => {
    async function fetchMembers() {
      if (!userTeamId) {
        setIsLoading(false);
        return;
      }

      console.debug('[MyTeamPage] fetchMembers start', { leagueId, userTeamId });

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(
          `/api/leagues/${leagueId}/teams/${userTeamId}/members`
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch team members');
        }

        if (result.success) {
          // Map members and attach default points
          let membersWithPoints = (result.data || []).map((m: any) => ({ ...m, points: 0 }));

          // Try to fetch full leaderboard to get individual points
          try {
            const lbRes = await fetch(`/api/leagues/${leagueId}/leaderboard?full=true`);
            const lbJson = await lbRes.json();
            if (lbRes.ok && lbJson?.success && lbJson.data?.individuals) {
              console.debug('[MyTeamPage] leaderboard individuals count:', lbJson.data.individuals.length);
              console.debug('[MyTeamPage] sample individuals:', lbJson.data.individuals.slice(0, 5));
              const pts = new Map<string, number>(
                lbJson.data.individuals.map((i: any) => [String(i.user_id), Number(i.points || 0)])
              );
              console.debug('[MyTeamPage] built points map size:', pts.size);
              membersWithPoints = membersWithPoints.map((m: any) => ({ ...m, points: pts.get(String(m.user_id)) || 0 }));
            }
          } catch (err) {
            console.error('Error fetching leaderboard for points:', err);
          }

          setMembers(membersWithPoints);

          // Also attempt to fetch leaderboard stats now that we have team id
          try {
            console.debug('[MyTeamPage] fetching leaderboard from fetchMembers');
            const res2 = await fetch(`/api/leagues/${leagueId}/leaderboard`);
            const json2 = await res2.json();
            console.debug('[MyTeamPage] leaderboard from fetchMembers ok:', res2.ok, 'status:', res2.status, 'keys:', Object.keys(json2 || {}));
            if (!res2.ok) {
              setLeaderboardError(`Leaderboard request failed: ${res2.status}`);
            } else {
              setLeaderboardError(null);
            }
            if (res2.ok && json2?.success && json2.data?.teams) {
              const teams2: any[] = json2.data.teams || [];
              const team2 = teams2.find((t) => String(t.team_id) === String(userTeamId));
              console.debug('[MyTeamPage] matched team (from fetchMembers):', team2);
              if (team2) {
                setTeamRank(`#${team2.rank ?? '--'}`);
                const pts2 = team2.total_points ?? team2.points ?? 0;
                setTeamPoints(String(pts2));
                setTeamAvgRR(String(team2.avg_rr ?? 0));
                if (team2.team_name) setFreshTeamName(team2.team_name);
              }
            }
          } catch (err) {
            console.error('Error fetching leaderboard inside fetchMembers:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError(err instanceof Error ? err.message : 'Failed to load team');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMembers();
  }, [leagueId, userTeamId]);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    return members.filter(
      (member) =>
        member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, members]);

  // Pagination
  const paginatedMembers = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredMembers.slice(start, start + pagination.pageSize);
  }, [filteredMembers, pagination]);

  const pageCount = Math.ceil(filteredMembers.length / pagination.pageSize);

  // Get captain info
  const captain = members.find((m) => m.is_captain);

  // Handle bulk assigning selected members to captain's own team only
  const handleBulkAssignMembers = async () => {
    // Captains can only add to their own team
    const teamId = userTeamId;
    if (!teamId) {
      toast.error('You are not assigned to a team');
      return;
    }

    if (selectedMemberIds.size === 0) {
      toast.error('Please select at least one member');
      return;
    }

    const teamName = userTeamName;
    const memberCount = selectedMemberIds.size;

    setIsBulkAssigning(true);

    try {
      let successCount = 0;
      let failCount = 0;

      // Assign all selected members
      for (const memberId of selectedMemberIds) {
        try {
          const success = await assignMember(teamId, memberId);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error('Error assigning member:', err);
          failCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`${successCount} member${successCount !== 1 ? 's' : ''} assigned to ${teamName}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to assign ${failCount} member${failCount !== 1 ? 's' : ''}`);
      }

      // Clear selections and refetch
      setSelectedMemberIds(new Set());
      await refetchTeams();
    } catch (err) {
      console.error('Error in bulk assignment:', err);
      toast.error('Failed to assign members');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Toggle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  // Select/deselect all filtered members
  const toggleSelectAll = () => {
    if (selectedMemberIds.size === filteredUnallocatedMembers.length && filteredUnallocatedMembers.length > 0) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(filteredUnallocatedMembers.map(m => m.league_member_id)));
    }
  };

  // Filter unallocated members based on search
  const filteredUnallocatedMembers = useMemo(() => {
    if (!teamsData?.members?.unallocated) return [];
    return teamsData.members.unallocated.filter(
      (member) =>
        member.username.toLowerCase().includes(unallocatedSearchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(unallocatedSearchQuery.toLowerCase())
    );
  }, [teamsData?.members?.unallocated, unallocatedSearchQuery]);

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
    ...(showRR ? [{
      title: 'Team RR',
      value: String(teamAvgRR),
      description: 'RR',
      detail: 'Average RR per approved entry',
      icon: Flame,
    }] : []),
  ];

  // Fetch leaderboard to populate team rank/points/avg rr
  useEffect(() => {
    async function fetchLeaderboardStats() {
      if (!leagueId || !userTeamId) return;
      try {
        console.debug('[MyTeamPage] fetchLeaderboardStats start', { leagueId, userTeamId });
        const res = await fetch(`/api/leagues/${leagueId}/leaderboard`);
        const json = await res.json();
        console.debug('[MyTeamPage] leaderboard response ok:', res.ok, 'status:', res.status, 'body keys:', Object.keys(json || {}));
        console.debug('[MyTeamPage] leaderboard teams length:', json?.data?.teams?.length ?? 0);
        if (!res.ok) {
          setLeaderboardError(`Leaderboard request failed: ${res.status}`);
        } else {
          setLeaderboardError(null);
        }
        if (res.ok && json?.success && json.data?.teams) {
          const teams: any[] = json.data.teams || [];
          const team = teams.find((t) => String(t.team_id) === String(userTeamId));
          console.debug('[MyTeamPage] matched team:', team);
          if (team) {
            // Include pending window points so recently submitted entries are visible
            const pendingTeam = (json.data?.pendingWindow?.teams || []).find((t: any) => String(t.team_id) === String(userTeamId));
            const pendingPts = pendingTeam?.total_points ?? 0;

            setTeamRank(`#${team.rank ?? '--'}`);
            const mainPts = team.total_points ?? team.points ?? 0;
            setTeamPoints(String(mainPts + pendingPts));
            setTeamAvgRR(String(team.avg_rr ?? 0));
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboard stats for team:', err);
      }
    }

    fetchLeaderboardStats();
  }, [leagueId, userTeamId]);

  // Fetch team logo
  useEffect(() => {
    async function fetchTeamLogo() {
      if (!leagueId || !userTeamId) return;
      try {
        const res = await fetch(`/api/leagues/${leagueId}/teams/${userTeamId}`);
        const json = await res.json();
        if (res.ok && json?.success && json.data?.logo_url) {
          // Add cache busting to initial load too
          setTeamLogoUrl(`${json.data.logo_url}?t=${Date.now()}`);
        }
      } catch (err) {
        console.error('Error fetching team logo:', err);
      }
    }
    fetchTeamLogo();
  }, [leagueId, userTeamId]);

  // Logo handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userTeamId) return;

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/leagues/${leagueId}/teams/${userTeamId}/logo`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Upload failed');
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
      const res = await fetch(`/api/leagues/${leagueId}/teams/${userTeamId}/logo`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
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
              This page is only accessible to team captains. If you believe
              you should have access, please contact your league administrator.
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
            You haven't been assigned to a team yet. Please wait for the host
            or governor to assign you to a team.
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
            <h1 className="text-2xl font-bold tracking-tight">{userTeamName}</h1>
            <p className="text-muted-foreground">
              Manage your team as captain
            </p>
            {aiInsights.team_strip && (
              <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                <Sparkles className="size-3 shrink-0" />
                {aiInsights.team_strip}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {teamsData?.members?.unallocated && teamsData.members.unallocated.length > 0 && (
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
              {members.length} member{members.length !== 1 ? 's' : ''} in your team
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
                {showRR && <TableHead className="w-16 text-center">Avg RR</TableHead>}
                {showRestDays && <TableHead className="w-16 text-center">Rest Days</TableHead>}
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
                        <span className="font-medium text-sm truncate">{member.username}</span>
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
      <Dialog open={isUnallocatedDialogOpen} onOpenChange={setIsUnallocatedDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Unallocated Members
            </DialogTitle>
            <DialogDescription>
              These members have joined the league but are not yet assigned to any team. ({teamsData?.members?.unallocated?.length || 0} total)
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Add to own team action */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Add members to <span className="font-medium text-foreground">{userTeamName}</span>
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
                  {selectedMemberIds.size === filteredUnallocatedMembers.length && filteredUnallocatedMembers.length > 0 ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredUnallocatedMembers.length > 0 ? (
                filteredUnallocatedMembers.map((member) => {
                  const isHost = member.roles?.includes('host');
                  const isSelected = selectedMemberIds.has(member.league_member_id);
                  return (
                    <div
                      key={member.league_member_id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors overflow-hidden cursor-pointer"
                      onClick={() => !isBulkAssigning && toggleMemberSelection(member.league_member_id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMemberSelection(member.league_member_id)}
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
                        <div className="font-medium truncate">{member.username}</div>
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
              Upload or change your team's logo. Max 2MB. Supported: PNG, JPG, WebP.
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
                  {logoDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
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
                  <><Loader2 className="size-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="size-4" /> {teamLogoUrl ? 'Change Logo' : 'Upload Logo'}</>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

