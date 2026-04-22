"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Crown,
  UserPlus,
  Shield,
  Loader2,
  Share2,
  Save,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "@/lib/toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { CreateTeamDialog } from "./create-team-dialog";
import { AddMembersDialog } from "./add-members-dialog";
import { AssignCaptainDialog } from "./assign-captain-dialog";
import { AssignGovernorDialog } from "./assign-governor-dialog";
import { ViewUnallocatedDialog } from "./view-unallocated-dialog";
import { ViewTeamMembersDialog } from "./view-team-members-dialog";
import { TeamInviteDialog } from "./team-invite-dialog";
import { InviteDialog } from "@/components/league/invite-dialog";
import { CaptainGuidelinesTooltip } from "@/components/captain/captain-guidelines-tooltip";

import {
  useLeagueTeams,
  type TeamWithDetails,
  type TeamMember,
} from "@/hooks/use-league-teams";

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton() {
  return <DumbbellLoading label="Loading teams..." />;
}

// ============================================================================
// TeamsTable Component
// ============================================================================

interface TeamsTableProps {
  leagueId: string;
  isHost?: boolean;
  isGovernor?: boolean;
}

export function TeamsTable({ leagueId, isHost, isGovernor }: TeamsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 100 });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [addMembersDialogOpen, setAddMembersDialogOpen] = React.useState(false);
  const [assignCaptainDialogOpen, setAssignCaptainDialogOpen] = React.useState(false);
  const [assignGovernorDialogOpen, setAssignGovernorDialogOpen] = React.useState(false);
  const [viewUnallocatedDialogOpen, setViewUnallocatedDialogOpen] = React.useState(false);
  const [viewTeamMembersDialogOpen, setViewTeamMembersDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [selectedTeam, setSelectedTeam] = React.useState<TeamWithDetails | null>(null);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [pointsMap, setPointsMap] = React.useState<Map<string, number> | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [loadingTeamMembers, setLoadingTeamMembers] = React.useState(false);
  const [logoUploadTeamId, setLogoUploadTeamId] = React.useState<string | null>(null);
  const [logoRemovingTeamId, setLogoRemovingTeamId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Edit team name states
  const [editNameDialogOpen, setEditNameDialogOpen] = React.useState(false);
  const [editingTeamName, setEditingTeamName] = React.useState("");
  const [isSavingName, setIsSavingName] = React.useState(false);

  const canManageTeams = isHost || isGovernor;
  const canManageLogos = isHost;

  // Fetch teams data
  const {
    data,
    isLoading,
    error,
    refetch,
    createTeam,
    deleteTeam,
    assignMember,
    removeMember,
    assignCaptain,
    removeCaptain,
    assignGovernor,
    removeGovernor,
  } = useLeagueTeams(leagueId);

  // ============================================================================
  // Handlers
  // ============================================================================

  // Fetch leaderboard points map for the league so dialogs can show per-user points
  React.useEffect(() => {
    let mounted = true;
    async function fetchPoints() {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/leaderboard?full=true`);
        const json = await res.json();
        if (mounted && res.ok && json?.success && json.data?.individuals) {
          console.debug('[TeamsTable] leaderboard individuals count:', json.data.individuals.length);
          console.debug('[TeamsTable] sample individuals:', json.data.individuals.slice(0, 5));
          const map = new Map<string, number>(
            json.data.individuals.map((i: any) => [String(i.user_id), Number(i.points || 0)])
          );
          console.debug('[TeamsTable] built pointsMap size:', map.size);
          setPointsMap(map);
        }
      } catch (err) {
        console.error('Error fetching leaderboard points:', err);
      }
    }

    if (leagueId) fetchPoints();
    return () => {
      mounted = false;
    };
  }, [leagueId]);


  const handleCreateTeam = async (teamName: string): Promise<boolean> => {
    const success = await createTeam(teamName);
    if (success) {
      toast.success(`Team "${teamName}" created successfully`);
    } else {
      toast.error("Failed to create team");
    }
    return success;
  };

  const handleDeleteClick = (team: TeamWithDetails) => {
    setSelectedTeam(team);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTeam) return;

    setIsDeleting(true);
    const success = await deleteTeam(selectedTeam.team_id);
    setIsDeleting(false);

    if (success) {
      toast.success(`Team "${selectedTeam.team_name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setSelectedTeam(null);
    } else {
      toast.error("Failed to delete team");
    }
  };

  const handleEditNameClick = (team: TeamWithDetails) => {
    setSelectedTeam(team);
    setEditingTeamName(team.team_name);
    setEditNameDialogOpen(true);
  };

  const handleEditNameConfirm = async () => {
    if (!selectedTeam || !editingTeamName.trim()) return;

    setIsSavingName(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams/${selectedTeam.team_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: editingTeamName.trim() }),
      });
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to update team name');
      }

      toast.success(`Team renamed to "${editingTeamName.trim()}"`);
      setEditNameDialogOpen(false);
      setSelectedTeam(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update team name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAddMembersClick = (team: TeamWithDetails) => {
    setSelectedTeam(team);
    setAddMembersDialogOpen(true);
  };

  const handleViewTeamMembersClick = async (team: TeamWithDetails) => {
    setSelectedTeam(team);
    setLoadingTeamMembers(true);
    setViewTeamMembersDialogOpen(true);

    try {
      const response = await fetch(`/api/leagues/${leagueId}/teams/${team.team_id}/members`);
      const result = await response.json();
      if (result.success) {
        console.debug('[TeamsTable] fetched team members count:', (result.data || []).length);
        const membersWithPoints = (result.data || []).map((m: any) => ({
          ...m,
          points: pointsMap?.get(String(m.user_id)) ?? 0,
        }));
        console.debug('[TeamsTable] membersWithPoints sample:', membersWithPoints.slice(0, 5));
        setTeamMembers(membersWithPoints as TeamMember[]);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const handleAssignCaptainClick = async (team: TeamWithDetails) => {
    setSelectedTeam(team);
    setLoadingTeamMembers(true);

    try {
      // Fetch team members for captain selection
      const response = await fetch(`/api/leagues/${leagueId}/teams/${team.team_id}/members`);
      const result = await response.json();
      if (result.success) {
        const membersWithPoints = (result.data || []).map((m: any) => ({
          ...m,
          points: pointsMap?.get(String(m.user_id)) ?? 0,
        }));
        setTeamMembers(membersWithPoints as TeamMember[]);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setLoadingTeamMembers(false);
      setAssignCaptainDialogOpen(true);
    }
  };

  const handleAddMember = async (teamId: string, leagueMemberId: string): Promise<boolean> => {
    const success = await assignMember(teamId, leagueMemberId);
    if (success) {
      toast.success("Member added to team");
    } else {
      toast.error("Failed to add member");
    }
    return success;
  };

  const handleAssignCaptain = async (teamId: string, userId: string): Promise<boolean> => {
    const success = await assignCaptain(teamId, userId);
    if (success) {
      toast.success("Captain assigned successfully");
    } else {
      toast.error("Failed to assign captain");
    }
    return success;
  };

  const handleAssignGovernor = async (userId: string): Promise<boolean> => {
    const success = await assignGovernor(userId);
    if (success) {
      toast.success("Governor assigned successfully");
    } else {
      toast.error("Failed to assign governor");
    }
    return success;
  };

  const handleRemoveGovernor = async (userId: string): Promise<boolean> => {
    const success = await removeGovernor(userId);
    if (success) {
      toast.success("Governor removed successfully");
    } else {
      toast.error("Failed to remove governor");
    }
    return success;
  };

  const uploadTeamLogo = async (teamId: string, file: File) => {
    setLogoUploadTeamId(teamId);
    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`/api/leagues/${leagueId}/teams/${teamId}/logo`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Upload failed');
      }

      toast.success('Team logo updated');
      await refetch();
    } catch (err) {
      console.error('[TeamsTable] logo upload', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setLogoUploadTeamId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTeamLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !logoUploadTeamId) {
      setLogoUploadTeamId(null);
      return;
    }
    await uploadTeamLogo(logoUploadTeamId, file);
  };

  const removeTeamLogo = async (teamId: string) => {
    setLogoRemovingTeamId(teamId);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams/${teamId}/logo`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to remove logo');
      }
      toast.success('Team logo removed');
      await refetch();
    } catch (err) {
      console.error('[TeamsTable] logo remove', err);
      toast.error(err instanceof Error ? err.message : 'Failed to remove logo');
    } finally {
      setLogoRemovingTeamId(null);
    }
  };

  // ============================================================================
  // Table Columns
  // ============================================================================

  const columns: ColumnDef<TeamWithDetails>[] = [
    {
      accessorKey: "team_name",
      header: "Team",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar className="size-6 rounded-lg flex-shrink-0">
            {row.original.logo_url ? (
              <AvatarImage src={row.original.logo_url} alt={row.original.team_name} />
            ) : (
              <AvatarFallback className="rounded-lg text-[10px] uppercase">
                {row.original.team_name.slice(0, 2)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col leading-tight min-w-0">
            <div className="font-medium text-xs break-words">{row.original.team_name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "captain",
      header: () => (
        <div className="flex items-center gap-1">
          Captain
          <CaptainGuidelinesTooltip />
        </div>
      ),
      cell: ({ row }) => {
        const captain = row.original.captain;
        if (!captain) {
          return (
            <span className="text-[10px] text-muted-foreground italic">
              No captain
            </span>
          );
        }
        return (
          <div className="flex items-center gap-1 min-w-0">
            <div className="relative flex-shrink-0">
              <Avatar className="size-5">
                <AvatarFallback className="text-[9px]">
                  {captain.username
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-amber-500 flex items-center justify-center ring-1 ring-background">
                <Crown className="size-1.5 text-white" />
              </div>
            </div>
            <span className="text-[10px] break-words min-w-0">{captain.username}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "member_count",
      header: "Members",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {row.original.member_count}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        if (!canManageTeams) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6 p-0">
                <MoreVertical className="size-3.5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {canManageLogos && (
                <>
                  <DropdownMenuItem onClick={() => {
                    setLogoUploadTeamId(row.original.team_id);
                    fileInputRef.current?.click();
                  }} className="text-xs">
                    <Pencil className="mr-1.5 size-3.5" />
                    Upload Logo
                  </DropdownMenuItem>
                  {row.original.logo_url ? (
                    <DropdownMenuItem
                      onClick={() => removeTeamLogo(row.original.team_id)}
                      disabled={logoRemovingTeamId === row.original.team_id}
                      className="text-xs"
                    >
                      <Trash2 className="mr-1.5 size-3.5" />
                      {logoRemovingTeamId === row.original.team_id ? 'Removing...' : 'Remove Logo'}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => handleEditNameClick(row.original)} className="text-xs">
                <Pencil className="mr-1.5 size-3.5" />
                Edit Name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleViewTeamMembersClick(row.original)} className="text-xs">
                <Users className="mr-1.5 size-3.5" />
                View Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAddMembersClick(row.original)} className="text-xs">
                <UserPlus className="mr-1.5 size-3.5" />
                Add Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAssignCaptainClick(row.original)} className="text-xs">
                <Crown className="mr-1.5 size-3.5" />
                Assign Captain
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <TeamInviteDialog
                teamName={row.original.team_name}
                leagueName={data?.league.league_name || ""}
                inviteCode={row.original.invite_code || ""}
                memberCount={row.original.member_count}
                maxCapacity={data?.league.league_capacity || 20}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs">
                    <Share2 className="mr-1.5 size-3.5" />
                    Invite to Team
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteClick(row.original)}
                className="text-destructive focus:text-destructive text-xs"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ============================================================================
  // Table Instance
  // ============================================================================

  const table = useReactTable({
    data: data?.teams || [],
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Team Management</h2>
          <p className="text-sm text-muted-foreground">
            {data?.meta.current_team_count || 0} of {data?.meta.max_teams || 0} teams created
          </p>
        </div>
        {canManageTeams && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs px-2 h-8"
              onClick={() => setViewUnallocatedDialogOpen(true)}
            >
              <Users className="mr-1 size-3" />
              Unallocated ({data?.members.unallocated.length || 0})
            </Button>

            {isHost && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs px-2 h-8"
                onClick={() => setAssignGovernorDialogOpen(true)}
              >
                <Shield className="mr-1 size-3" />
                Governors
              </Button>
            )}

            <Button
              size="sm"
              className="text-xs px-2 h-8"
              onClick={() => setCreateDialogOpen(true)}
              disabled={!data?.meta.can_create_more}
            >
              <Plus className="mr-1 size-3" />
              Create Team
            </Button>

            {isHost && data?.league && (
              <InviteDialog
                leagueId={leagueId}
                leagueName={data.league.league_name}
                inviteCode={data.league.invite_code || ''}
                memberCount={data.members.allocated.length + data.members.unallocated.length}
                maxCapacity={data.league.league_capacity || 20}
                buttonLabel="League Invite"
              />
            )}
          </div>
        )}

      </div>

      {/* Governors Info */}
      {data?.governors && data.governors.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Shield className="size-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">
              {data.governors.length === 1 ? 'Governor' : 'Governors'}: {data.governors.map(g => g.username).join(', ')}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.governors.length === 1 ? 'Has' : 'Have'} oversight of all teams and can validate any submission
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`px-2 py-2 text-xs font-semibold text-muted-foreground ${header.id === "actions" ? "text-right pr-1 pl-1 w-8" : ""} ${header.id === "team_name" ? "w-auto" : ""} ${header.id === "captain" ? "w-[30%]" : ""} ${header.id === "member_count" ? "w-[15%]" : ""}`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-2 py-2 align-middle text-xs ${cell.column.id === "actions" ? "text-right pr-1 pl-1" : ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Users className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No teams yet</p>
                      <p className="text-sm text-muted-foreground">
                        {error
                          ? "Unable to load teams. Please try again."
                          : "Create your first team to get started."}
                      </p>
                    </div>
                    {!error && canManageTeams && (
                      <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Create Team
                      </Button>
                    )}
                    {error && (
                      <Button size="sm" variant="outline" onClick={refetch}>
                        Try Again
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleTeamLogoFileChange}
      />


      {/* Dialogs */}
      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTeam}
        currentCount={data?.meta.current_team_count || 0}
        maxTeams={data?.meta.max_teams || 0}
      />

      {selectedTeam && (
        <AddMembersDialog
          open={addMembersDialogOpen}
          onOpenChange={setAddMembersDialogOpen}
          teamId={selectedTeam.team_id}
          teamName={selectedTeam.team_name}
          teamCapacity={data?.league.league_capacity || 20}
          currentMemberCount={selectedTeam.member_count}
          unallocatedMembers={(data?.members.unallocated || []).map((m: any) => ({
            ...m,
            points: pointsMap?.get(String(m.user_id)) ?? 0,
          }))}
          onAddMember={handleAddMember}
        />
      )}

      {selectedTeam && (
        <AssignCaptainDialog
          open={assignCaptainDialogOpen}
          onOpenChange={setAssignCaptainDialogOpen}
          teamId={selectedTeam.team_id}
          teamName={selectedTeam.team_name}
          members={teamMembers}
          currentCaptain={
            teamMembers.find((m) => m.is_captain) || null
          }
          onAssignCaptain={handleAssignCaptain}
        />
      )}

      <AssignGovernorDialog
        open={assignGovernorDialogOpen}
        onOpenChange={setAssignGovernorDialogOpen}
        members={[...(data?.members.allocated || []), ...(data?.members.unallocated || [])].map((m: any) => ({
          ...m,
          points: pointsMap?.get(String(m.user_id)) ?? 0,
        }))}
        currentGovernors={data?.governors || []}
        hostUserId={data?.league.host_user_id || ""}
        onAssignGovernor={handleAssignGovernor}
        onRemoveGovernor={handleRemoveGovernor}
      />

      <ViewUnallocatedDialog
        open={viewUnallocatedDialogOpen}
        onOpenChange={setViewUnallocatedDialogOpen}
        members={(data?.members.unallocated || []).map((m: any) => ({
          ...m,
          points: pointsMap?.get(String(m.user_id)) ?? 0,
        }))}
        teams={(data?.teams || []).map((t: any) => ({
          id: t.team_id,
          name: t.team_name,
        }))}
        onAddMember={handleAddMember}
      />

      {selectedTeam && (
        <ViewTeamMembersDialog
          open={viewTeamMembersDialogOpen}
          onOpenChange={setViewTeamMembersDialogOpen}
          teamName={selectedTeam.team_name}
          teamId={selectedTeam.team_id}
          leagueId={leagueId}
          members={teamMembers}
          isLoading={loadingTeamMembers}
          isHost={isHost}
          teams={data?.teams}
          onMemberChanged={() => {
            refetch();
          }}
        />
      )}

      {/* Edit Team Name Dialog */}
      <AlertDialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Team Name</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for &quot;{selectedTeam?.team_name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={editingTeamName}
            onChange={(e) => setEditingTeamName(e.target.value)}
            placeholder="Team name"
            maxLength={100}
            className="mt-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editingTeamName.trim()) {
                handleEditNameConfirm();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingName}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditNameConfirm}
              disabled={isSavingName || !editingTeamName.trim()}
            >
              {isSavingName ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTeam?.team_name}"? All members
              will be unassigned and moved to the unallocated pool. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TeamsTable;