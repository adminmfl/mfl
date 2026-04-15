'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Trash2,
  ArrowRight,
  Users,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';

interface TeamWithLeague {
  team_id: string;
  team_name: string;
  league_id: string;
  member_count?: number;
}

interface LeagueMember {
  league_member_id: string;
  user_id: string;
  username: string;
  email: string;
  team_id: string | null;
  team_name: string | null;
  roles: string[];
}

interface MemberManagementProps {
  leagueId: string;
}

export function MemberManagement({ leagueId }: MemberManagementProps) {
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [teamsList, setTeamsList] = useState<TeamWithLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Move member dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<LeagueMember | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [moveLoading, setMoveLoading] = useState(false);

  // Delete member dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<LeagueMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [leagueId]);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/members`);
      if (!res.ok) {
        throw new Error('Failed to load members');
      }
      const json = await res.json();
      setMembers(json.data.members || []);

      // Also fetch teams for the move dialog
      const teamsRes = await fetch(`/api/leagues/${leagueId}/teams`);
      if (teamsRes.ok) {
        const teamsJson = await teamsRes.json();
        setTeamsList(teamsJson.data || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load members';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveMember = (member: LeagueMember) => {
    setSelectedMember(member);
    setSelectedTeam(member.team_id || '');
    setMoveDialogOpen(true);
  };

  const handleConfirmMove = async () => {
    if (!selectedMember || !selectedTeam) return;

    setMoveLoading(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.league_member_id,
          teamId: selectedTeam,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to move member');
      }

      await loadMembers();
      setMoveDialogOpen(false);
      setSelectedMember(null);
      setSelectedTeam('');
      toast.success(`Moved ${selectedMember.username} to team.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to move member';
      toast.error(msg);
    } finally {
      setMoveLoading(false);
    }
  };

  const handleDeleteMember = (member: LeagueMember) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/members?memberId=${memberToDelete.league_member_id}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to remove member');
      }

      await loadMembers();
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      toast.success(`Removed ${memberToDelete.username} from league.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member';
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Users className="size-5" />
          League Members ({members.length})
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage member assignments and remove members from the league.
        </p>
      </div>

      {members.length === 0 ? (
        <Alert>
          <AlertDescription>No members in this league yet.</AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Team</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.league_member_id}>
                  <TableCell className="font-medium">{member.username}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    {member.team_name ? (
                      <Badge variant="secondary">{member.team_name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {member.roles.length > 0 ? (
                        member.roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Player
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveMember(member)}
                      title="Move to different team"
                    >
                      <ArrowRight className="size-4 mr-1" />
                      Move
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMember(member)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Move Member Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Member to Team</DialogTitle>
            <DialogDescription>
              Select a team to move {selectedMember?.username} to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teamsList.map((team) => (
                    <SelectItem key={team.team_id} value={team.team_id}>
                      {team.team_name} ({team.member_count} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMoveDialogOpen(false)}
              disabled={moveLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMove}
              disabled={!selectedTeam || moveLoading}
            >
              {moveLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Moving...
                </>
              ) : (
                'Move Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member from League</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold">{memberToDelete?.username}</span>{' '}
              from the league? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove from League'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
