'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';
import { Users, Plus, Trash2, Edit, AlertCircle } from 'lucide-react';

interface SubTeam {
  subteam_id: string;
  name: string;
  team_id: string;
  members: {
    league_member_id: string;
    user_id: string;
    full_name: string;
  }[];
}

interface TeamMember {
  league_member_id: string;
  user_id: string;
  full_name: string;
}

interface SubTeamManagerProps {
  leagueId: string;
  challengeId: string;
  teams: Array<{ team_id: string; team_name: string }>;
}

export function SubTeamManager({
  leagueId,
  challengeId,
  teams,
}: SubTeamManagerProps) {
  const [open, setOpen] = useState(false);
  const [subTeams, setSubTeams] = useState<SubTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersInOtherSubteams, setMembersInOtherSubteams] = useState<Set<string>>(new Set());

  const [pendingTeamId, setPendingTeamId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subTeamName, setSubTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const selectedTeam = teams.find((t) => t.team_id === selectedTeamId);

  useEffect(() => {
    if (open && teams.length > 0 && !pendingTeamId) {
      setPendingTeamId(teams[0].team_id);
      setSelectedTeamId(teams[0].team_id);
    }
  }, [open, teams, pendingTeamId]);

  useEffect(() => {
    if (open && selectedTeamId) {
      fetchSubTeams();
      fetchTeamMembers();
    }
  }, [open, selectedTeamId]);

  async function fetchSubTeams() {
    if (!selectedTeamId) return;
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/challenges/${challengeId}/subteams?teamId=${selectedTeamId}`
      );
      if (res.ok) {
        const json = await res.json();
        const transformed = (json.data || []).map((st: any) => ({
          subteam_id: st.subteam_id,
          name: st.name,
          team_id: st.team_id,
          members: (st.challenge_subteam_members || []).map((m: any) => ({
            league_member_id: m.league_member_id,
            user_id: m.leaguemembers?.user_id,
            full_name: m.leaguemembers?.users?.username || 'Unknown',
          })),
        }));
        setSubTeams(transformed);

        // Identify members who are in ANY subteam for this challenge (for the current editing subteam)
        const allMembersInSubteams = new Set<string>();
        transformed.forEach((st: SubTeam) => {
          // Only exclude members from the current subteam being edited
          if (st.subteam_id !== editingId) {
            st.members.forEach((m) => {
              allMembersInSubteams.add(m.league_member_id);
            });
          }
        });
        setMembersInOtherSubteams(allMembersInSubteams);
      }
    } catch {
      toast.error('Failed to load sub-teams');
    }
  }

  async function fetchTeamMembers() {
    if (!selectedTeamId) return;
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/teams/${selectedTeamId}/members`
      );
      if (res.ok) {
        const json = await res.json();
        const transformed = (json.data || []).map((m: any) => ({
          league_member_id: m.league_member_id,
          user_id: m.user_id,
          full_name: m.username || 'Unknown',
        }));
        setTeamMembers(transformed);
      }
    } catch {
      toast.error('Failed to load team members');
    }
  }

  async function handleCreateOrUpdate() {
    if (!subTeamName.trim()) {
      toast.error('Sub-team name is required');
      return;
    }

    if (!selectedTeamId) {
      toast.error('Please select a team first');
      return;
    }

    setLoading(true);
    try {
      const url = editingId
        ? `/api/leagues/${leagueId}/challenges/${challengeId}/subteams/${editingId}`
        : `/api/leagues/${leagueId}/challenges/${challengeId}/subteams`;

      const method = editingId ? 'PUT' : 'POST';

      const body = editingId
        ? { name: subTeamName, memberIds: selectedMembers }
        : { teamId: selectedTeamId, name: subTeamName, memberIds: selectedMembers };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      toast.success(editingId ? 'Sub-team updated' : 'Sub-team created');
      setCreateOpen(false);
      setEditingId(null);
      setSubTeamName('');
      setSelectedMembers([]);
      fetchSubTeams();
    } catch {
      toast.error('Failed to save sub-team');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sub-team?')) return;
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/challenges/${challengeId}/subteams/${id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error();
      toast.success('Sub-team deleted');
      fetchSubTeams();
    } catch {
      toast.error('Failed to delete sub-team');
    }
  }

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setCreateOpen(false);
          setEditingId(null);
          setSubTeamName('');
          setSelectedMembers([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs gap-1"
        >
          <Users className="h-3 w-3" />
          Manage Sub-Teams
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sub-Team Management</DialogTitle>
          <DialogDescription>
            Create and manage sub-teams for this challenge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-select">Select Team</Label>
            <div className="flex gap-2 items-end">
              <Select
                value={pendingTeamId}
                onValueChange={(val) => {
                  setPendingTeamId(val);
                  setSelectedTeamId(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.team_id} value={t.team_id}>
                      {t.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setSelectedTeamId(pendingTeamId)}>
                Apply
              </Button>
            </div>
          </div>

          {selectedTeamId && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setSubTeamName('');
                  setSelectedMembers([]);
                  setCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Sub-Team
              </Button>

              <div className="space-y-3">
                {subTeams.map((st) => (
                  <div
                    key={st.subteam_id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{st.name}</h4>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(st.subteam_id);
                            setSubTeamName(st.name);
                            setSelectedMembers(
                              st.members.map((m) => m.league_member_id)
                            );
                            setCreateOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(st.subteam_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {st.members.length > 0
                        ? st.members.map((m) => m.full_name).join(', ')
                        : 'No members'}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>

      <Dialog open={createOpen} onOpenChange={(val) => {
        setCreateOpen(val);
        if (!val) {
          setEditingId(null);
          setSubTeamName('');
          setSelectedMembers([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Sub-Team' : 'Create Sub-Team'}</DialogTitle>
            <DialogDescription>
              Assign a name and members for the sub-team{selectedTeam ? ` in ${selectedTeam.team_name}` : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="subteam-name">Sub-Team Name</Label>
              <Input
                id="subteam-name"
                placeholder="e.g. Team Alpha"
                value={subTeamName}
                onChange={(e) => setSubTeamName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Members</Label>
              {membersInOtherSubteams.size > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-sm">
                    <strong>Already in another sub-team:</strong> Members marked with ⚠️ are already assigned to another sub-team for this challenge and cannot be selected.
                  </AlertDescription>
                </Alert>
              )}
              <div className="max-h-52 overflow-y-auto rounded-md border p-3 space-y-2">
                {teamMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No members available for this team.</p>
                )}
                {teamMembers.map((m) => {
                  const isInOtherSubteam = membersInOtherSubteams.has(m.league_member_id);
                  const isSelected = selectedMembers.includes(m.league_member_id);
                  
                  return (
                    <label
                      key={m.league_member_id}
                      className={`flex items-center gap-2 text-sm p-2 rounded ${
                        isInOtherSubteam && !isSelected ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(m.league_member_id)}
                        disabled={isInOtherSubteam && !isSelected}
                      />
                      <span>
                        {m.full_name}
                        {isInOtherSubteam && !isSelected && (
                          <span className="ml-2 text-yellow-600">⚠️ In another sub-team</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateOrUpdate} disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Sub-Team' : 'Create Sub-Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
