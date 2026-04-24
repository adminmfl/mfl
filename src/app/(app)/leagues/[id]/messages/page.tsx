/**
 * Team Messages Page
 * - Host/Governor: sidebar with team list + "All Teams" broadcast view
 *   By default they see only broadcasts + captain-only messages.
 *   "Admin View" toggle lets them see all team messages.
 * - Captain/Player: shows their team's chat directly
 */
'use client';

import { use, useState } from 'react';
import {
  MessageCircle,
  Users,
  Megaphone,
  Loader2,
  PanelLeftOpen,
  ShieldAlert,
} from 'lucide-react';
import { useLeague } from '@/contexts/league-context';
import useLeagueTeams from '@/hooks/use-league-teams';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChatWindow } from '@/components/messaging/chat-window';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function MessagesSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex-1 overflow-hidden px-4 py-4">
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              {i % 2 !== 0 && <Skeleton className="size-8 rounded-full shrink-0" />}
              <div className="space-y-1.5 max-w-[70%]">
                <div className={`flex items-center gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-16 rounded-lg w-full" />
              </div>
              {i % 2 === 0 && <Skeleton className="size-8 rounded-full shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MessagesPage({ params }: PageProps) {
  const { id: leagueId } = use(params);
  const { activeLeague, currentRole } = useLeague();
  const isLeader = currentRole === 'host' || currentRole === 'governor';
  const [chatLoading, setChatLoading] = useState(true);

  if (isLeader) {
    return <LeaderMessagesView leagueId={leagueId} chatLoading={chatLoading} onChatLoadingChange={setChatLoading} />;
  }

  // Captain / Player: show their own team's chat
  const teamId = activeLeague?.team_id ?? null;
  const teamName = activeLeague?.team_name ?? 'Team Chat';

  return (
    <>
      {/* Show skeleton while loading */}
      {chatLoading && <MessagesSkeleton />}

      {/* Render chat but hide it while loading */}
      <div className={cn("flex flex-col h-[calc(100vh-4rem)]", chatLoading && "hidden")}>
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <MessageCircle className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Team Messages</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            leagueId={leagueId}
            teamId={teamId}
            teamName={teamName}
            onLoadingChange={setChatLoading}
          />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Leader view (host / governor) with team sidebar
// ---------------------------------------------------------------------------

function LeaderMessagesView({ leagueId, chatLoading, onChatLoadingChange }: { leagueId: string; chatLoading: boolean; onChatLoadingChange: (loading: boolean) => void }) {
  const { data, isLoading: teamsLoading } = useLeagueTeams(leagueId);
  const teams = data?.teams ?? [];

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [adminView, setAdminView] = useState(false);

  const selectedTeam = teams.find((t: any) => t.team_id === selectedTeamId) ?? null;
  const chatLabel = selectedTeam ? selectedTeam.team_name : 'All Teams (Broadcast)';

  const selectTeam = (teamId: string | null) => {
    setSelectedTeamId(teamId);
    setMobileSidebarOpen(false);
  };

  // Show skeleton until both teams and chat are loaded
  const showSkeleton = teamsLoading || chatLoading;

  return (
    <>
      {/* Show skeleton while loading */}
      {showSkeleton && <LeaderMessagesSkeleton />}

      {/* Render content but hide it while loading */}
      <div className={cn("flex flex-col h-[calc(100vh-4rem)]", showSkeleton && "hidden")}>
        {/* Page header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <MessageCircle className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Team Messages</h1>

          {/* Admin view toggle — only shown when a team is selected */}
          {selectedTeamId && (
            <div className="hidden md:flex items-center gap-2 ml-4">
              <ShieldAlert className="size-3.5 text-amber-600" />
              <label htmlFor="admin-view" className="text-xs text-muted-foreground cursor-pointer select-none">
                Admin View
              </label>
              <Switch
                id="admin-view"
                checked={adminView}
                onCheckedChange={setAdminView}
                className="scale-75"
              />
            </div>
          )}

          {/* Mobile toggle */}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto md:hidden h-8 gap-1.5 text-xs"
            onClick={() => setMobileSidebarOpen((v) => !v)}
          >
            <PanelLeftOpen className="size-3.5" />
            {chatLabel}
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* ----- Sidebar (always visible on desktop, overlay on mobile) ----- */}
          <div
            className={cn(
              'border-r bg-muted/30 shrink-0 flex flex-col w-56',
              'hidden md:flex',
            )}
          >
            <SidebarContent
              teams={teams}
              teamsLoading={teamsLoading}
              selectedTeamId={selectedTeamId}
              onSelect={selectTeam}
            />
          </div>

          {/* Mobile sidebar overlay */}
          {mobileSidebarOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/30 z-30 md:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="absolute inset-y-0 left-0 w-64 z-40 bg-background border-r shadow-lg flex flex-col md:hidden">
                <SidebarContent
                  teams={teams}
                  teamsLoading={teamsLoading}
                  selectedTeamId={selectedTeamId}
                  onSelect={selectTeam}
                />
                {/* Mobile admin view toggle */}
                {selectedTeamId && (
                  <div className="flex items-center gap-2 px-3 py-2 border-t">
                    <ShieldAlert className="size-3.5 text-amber-600" />
                    <label htmlFor="admin-view-mobile" className="text-xs text-muted-foreground flex-1">
                      Admin View
                    </label>
                    <Switch
                      id="admin-view-mobile"
                      checked={adminView}
                      onCheckedChange={setAdminView}
                      className="scale-75"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ----- Chat area ----- */}
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              key={`${selectedTeamId ?? '__all__'}-${adminView}`}
              leagueId={leagueId}
              teamId={selectedTeamId}
              teamName={chatLabel}
              adminView={adminView}
              onLoadingChange={onChatLoadingChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Leader Messages Skeleton
// ---------------------------------------------------------------------------

function LeaderMessagesSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="border-r bg-muted/30 shrink-0 flex flex-col w-56 hidden md:flex">
          <div className="px-3 py-2 border-b">
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex-1 p-2 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2 px-1 py-2">
                <Skeleton className="size-4 rounded shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        {/* Chat skeleton */}
        <div className="flex-1 overflow-hidden px-4 py-4">
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                {i % 2 !== 0 && <Skeleton className="size-8 rounded-full shrink-0" />}
                <div className="space-y-1.5 max-w-[70%]">
                  <div className={`flex items-center gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-16 rounded-lg w-full" />
                </div>
                {i % 2 === 0 && <Skeleton className="size-8 rounded-full shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar content (shared between desktop & mobile)
// ---------------------------------------------------------------------------

function SidebarContent({
  teams,
  teamsLoading,
  selectedTeamId,
  onSelect,
}: {
  teams: any[];
  teamsLoading: boolean;
  selectedTeamId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <>
      <div className="px-3 py-2 border-b">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Channels
        </span>
      </div>
      <ScrollArea className="flex-1">
        {/* All teams broadcast */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent',
            selectedTeamId === null && 'bg-accent font-medium'
          )}
        >
          <Megaphone className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>All Teams</span>
        </button>

        <Separator />

        {teamsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!teamsLoading &&
          teams.map((team: any) => (
            <button
              key={team.team_id}
              type="button"
              onClick={() => onSelect(team.team_id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent',
                selectedTeamId === team.team_id && 'bg-accent font-medium'
              )}
            >
              <Users className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{team.team_name}</span>
              <Badge
                variant="secondary"
                className="ml-auto text-[10px] px-1.5 py-0 h-4"
              >
                {team.member_count}
              </Badge>
            </button>
          ))}
      </ScrollArea>
    </>
  );
}
