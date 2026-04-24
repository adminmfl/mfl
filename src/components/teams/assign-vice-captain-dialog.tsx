'use client';

import * as React from 'react';
import { Loader2, ShieldPlus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ProfilePicture } from '@/components/ui/profile-picture';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TeamMember } from '@/hooks/use-league-teams';

interface AssignViceCaptainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  leagueId: string;
  members: TeamMember[];
}

export function AssignViceCaptainDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  leagueId,
  members,
}: AssignViceCaptainDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setSearchQuery('');
  }, [open]);

  const currentViceCaptains = members.filter((m) =>
    m.roles.includes('vice_captain'),
  );
  const eligibleMembers = React.useMemo(() => {
    const filtered = members.filter(
      (m) => !m.roles.includes('captain') && !m.roles.includes('vice_captain'),
    );
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  const handleAssign = async (userId: string) => {
    setIsLoading(userId);
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/teams/${teamId}/vice-captain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to assign');
      }
      // Force re-render by closing and re-opening
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/teams/${teamId}/vice-captain`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to remove');
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="size-5 text-blue-500" />
            Vice Captains &mdash; {teamName}
          </DialogTitle>
          <DialogDescription>
            Vice captains have the same capabilities as the captain &mdash; they
            can validate submissions, manage team members, and act on the
            captain&apos;s behalf.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Vice Captains */}
          {currentViceCaptains.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Current Vice Captains
              </p>
              {currentViceCaptains.map((vc) => (
                <div
                  key={vc.user_id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20"
                >
                  <ProfilePicture username={vc.username} size={32} />
                  <span className="font-medium text-sm flex-1 truncate">
                    {vc.username}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(vc.user_id)}
                    disabled={removing === vc.user_id}
                  >
                    {removing === vc.user_id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <X className="size-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Search for new */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Eligible members */}
          <ScrollArea className="h-[240px] rounded-md border">
            {eligibleMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <ShieldPlus className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {members.length <= 1
                    ? 'No eligible members'
                    : 'All members are already assigned roles'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {eligibleMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <ProfilePicture username={member.username} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleAssign(member.user_id)}
                      disabled={isLoading === member.user_id}
                    >
                      {isLoading === member.user_id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        'Add'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
