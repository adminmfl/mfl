"use client";

import * as React from "react";
import { Users, Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeagueMember, MutationResult } from "@/hooks/use-league-teams";

interface ViewUnallocatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: LeagueMember[];
  teams?: Array<{ id: string; name: string }>;
  onAddMember?: (teamId: string, leagueMemberId: string) => Promise<MutationResult>;
}

export function ViewUnallocatedDialog({
  open,
  onOpenChange,
  members,
  teams = [],
  onAddMember,
}: ViewUnallocatedDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTeam, setSelectedTeam] = React.useState<string>("");
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedTeam("");
      setSelectedMembers([]);
    }
  }, [open]);

  // Points (if present) should be merged into member objects by the parent.

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAddSelected = async () => {
    if (selectedMembers.length === 0) return;
    if (!selectedTeam) return;
    if (!onAddMember) return;

    setIsLoading(true);
    try {
      let successCount = 0;
      for (const memberId of selectedMembers) {
        const result = await onAddMember(selectedTeam, memberId);
        if (!result.success) {
          toast.error(result.error || "Failed to add member");
          return;
        }
        successCount++;
      }

      if (successCount > 0) {
        toast.success(
          `${successCount} member${successCount !== 1 ? "s" : ""} added to the selected team`
        );
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-orange-500" />
            Unallocated Members
          </DialogTitle>
          <DialogDescription>
            These members have joined the league but are not yet assigned to any team.
            {members.length > 0 && ` (${members.length} total)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team Selection */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Team to Add To</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-[350px] rounded-md border">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Users className="size-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {members.length === 0 ? "No unallocated members" : "No members match your search"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {members.length === 0
                    ? "All members have been assigned to teams"
                    : "Try a different search term"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredMembers.map((member) => {
                  const isSelected = selectedMembers.includes(member.league_member_id);

                  return (
                    <div
                      key={member.league_member_id}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(member.league_member_id)}
                        className="border-2 border-black dark:border-white"
                      />
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {member.username
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">
                          {member.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Points: {(member as any).points ?? 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        {member.roles
                          .filter((r) => r !== "player" && r !== "captain")
                          .map((role) => (
                            <Badge
                              key={role}
                              variant="outline"
                              className={`text-xs ${
                                role === "governor"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                  : role === "host"
                                  ? "bg-purple-500/10 text-purple-600 border-purple-200"
                                  : ""
                              }`}
                            >
                              {role}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedMembers.length} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSelected}
                disabled={
                  isLoading || selectedMembers.length === 0 || !selectedTeam
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 size-4" />
                    Add Members
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ViewUnallocatedDialog;
