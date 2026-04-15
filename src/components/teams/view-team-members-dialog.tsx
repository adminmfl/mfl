"use client";

import * as React from "react";
import { Users, Crown, Search, Trash2, ArrowRight, Loader2, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/lib/toast";
import type { TeamMember } from "@/hooks/use-league-teams";

interface ViewTeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string;
  teamId: string;
  leagueId: string;
  members: (TeamMember & { points?: number })[];
  isLoading?: boolean;
  isHost?: boolean;
  teams?: any[];
  onMemberChanged?: () => void;
}

export function ViewTeamMembersDialog({
  open,
  onOpenChange,
  teamName,
  teamId,
  leagueId,
  members,
  isLoading,
  isHost = false,
  teams = [],
  onMemberChanged,
}: ViewTeamMembersDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [allTeams, setAllTeams] = React.useState<any[]>([]);
  const [memberToMove, setMemberToMove] = React.useState<(TeamMember & { points?: number }) | null>(null);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>("");
  const [memberToRemove, setMemberToRemove] = React.useState<(TeamMember & { points?: number }) | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setMemberToMove(null);
      setSelectedTeamId("");
      setMemberToRemove(null);

      // Set teams from prop if available, otherwise fetch
      if (teams && teams.length > 0) {
        setAllTeams(teams);
      } else if (isHost && leagueId) {
        fetchTeams();
      }
    }
  }, [open, teams, isHost, leagueId]);

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const captain = members.find((m) => m.is_captain);

  const fetchTeams = async () => {
    if (!leagueId) return;
    try {
      const response = await fetch(`/api/leagues/${leagueId}/teams`);
      if (response.ok) {
        const data = await response.json();
        setAllTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  const handleMoveMember = (member: TeamMember & { points?: number }) => {
    setMemberToMove(member);
    setSelectedTeamId("");
  };

  const handleConfirmMove = async () => {
    if (!memberToMove || !selectedTeamId || selectedTeamId === teamId) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: memberToMove.league_member_id,
          teamId: selectedTeamId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Failed to move member");
        return;
      }

      toast.success(`${memberToMove.username} moved to new team`);
      // Small delay to show success feedback, then close and refresh
      setTimeout(() => {
        setMemberToMove(null);
        setSelectedTeamId("");
        onMemberChanged?.();
        // Close the main dialog to force a fresh reload when reopened
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error("Failed to move member:", error);
      toast.error("An error occurred while moving the member");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = (member: TeamMember & { points?: number }) => {
    setMemberToRemove(member);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/leagues/${leagueId}/members?memberId=${memberToRemove.league_member_id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Failed to remove member");
        return;
      }

      toast.success(`${memberToRemove.username} removed from league`);
      // Small delay to show success feedback, then close and refresh
      setTimeout(() => {
        setMemberToRemove(null);
        onMemberChanged?.();
        // Close the main dialog to force a fresh reload when reopened
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("An error occurred while removing the member");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            {teamName} - Members
          </DialogTitle>
          <DialogDescription>
            {members.length > 0
              ? `${members.length} member${members.length !== 1 ? "s" : ""} in this team`
              : "No members in this team yet"}
            {captain && ` | Captain: ${captain.username}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          {members.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Members List */}
          <ScrollArea className="max-h-[60vh] rounded-md border">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground mt-2">Loading members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Users className="size-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {members.length === 0 ? "No members yet" : "No members match your search"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {members.length === 0
                    ? "Add members to this team to get started"
                    : "Try a different search term"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredMembers.map((member) => (
                  <div
                    key={member.league_member_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${member.is_captain
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                      : "bg-card hover:bg-muted/50"
                      }`}
                  >
                    <div className="relative">
                      <Avatar className="size-10">
                        <AvatarFallback>
                          {member.username
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {member.is_captain && (
                        <div className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-background">
                          <Crown className="size-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.username}
                        {member.is_captain && (
                          <span className="text-amber-600 ml-1">(Captain)</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {member.roles
                        .filter((r) => r !== "player" && r !== "captain")
                        .map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className={
                              role === "governor"
                                ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                : role === "host"
                                  ? "bg-purple-500/10 text-purple-600 border-purple-200"
                                  : ""
                            }
                          >
                            {role}
                          </Badge>
                        ))}
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveMember(member)}
                          disabled={isProcessing}
                          className="h-8 w-8 p-0"
                          title="Move to another team"
                        >
                          <ArrowRight className="size-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          disabled={isProcessing}
                          className="h-8 w-8 p-0"
                          title="Remove from league"
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Move Member Dialog */}
        <AlertDialog open={!!memberToMove} onOpenChange={(open) => !open && setMemberToMove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move Member to Another Team</AlertDialogTitle>
              <AlertDialogDescription>
                Select the team where you want to move {memberToMove?.username}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2">
                <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Member will be removed from their current team and added to the selected team.
                </p>
              </div>

              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose destination team..." />
                </SelectTrigger>
                <SelectContent side="top" sideOffset={8} className="z-50">
                  {allTeams.length > 0 ? (
                    allTeams
                      .filter((t) => t.team_id !== teamId)
                      .map((team) => (
                        <SelectItem key={team.team_id} value={team.team_id}>
                          {team.team_name}
                        </SelectItem>
                      ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      No other teams available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmMove}
                disabled={!selectedTeamId || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Moving...
                  </>
                ) : (
                  "Move Member"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Member Dialog */}
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member from League</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <span className="font-semibold">{memberToRemove?.username}</span> from this league? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>
                The member will lose access to the league and all their data will be preserved in history.
              </AlertDescription>
            </Alert>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRemove}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove Member"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent >
    </Dialog >
  );
}

export default ViewTeamMembersDialog;
