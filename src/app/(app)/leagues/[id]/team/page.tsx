'use client';

import React, { use, useState, useEffect } from 'react';
import {
  Users,
  Trophy,
  Target,
  Crown,
} from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';

// RR/Rest Day visibility helpers (used in TeamMemberView)
function useLeagueDisplayConfig() {
  const { activeLeague } = useLeague();
  const rrFormula = (activeLeague as any)?.rr_config?.formula || 'standard';
  return {
    showRR: rrFormula === 'standard',
    showRestDays: ((activeLeague as any)?.rest_days ?? 1) > 0,
  };
}

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { TeamsTable } from '@/components/teams';
import { TeamPageSkeleton } from '@/components/teams/team-page-skeleton';

function capitalizeName(name: string) {
  if (!name) return '';
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/* ============================================================================
   Skeleton
============================================================================ */

function PageSkeleton() {
  return <TeamPageSkeleton />;
}

/* ============================================================================
   Team Member View
============================================================================ */

interface TeamMemberViewProps {
  leagueId: string;
  teamId: string;
  teamName: string;
  teamCapacity: number;
  isCaptain: boolean;
}

function TeamMemberView({
  leagueId,
  teamId,
  teamName,
  teamCapacity,
  isCaptain,
}: TeamMemberViewProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [teamRank, setTeamRank] = useState('#--');
  const [teamPoints, setTeamPoints] = useState('--');

  /* ---------------- Fetch Members + Points ---------------- */

  useEffect(() => {
    async function fetchData() {
      try {
        const membersRes = await fetch(
          `/api/leagues/${leagueId}/teams/${teamId}/members`
        );
        const membersJson = await membersRes.json();

        let membersWithPoints = (membersJson.data || []).map((m: any) => ({
          ...m,
          points: 0,
        }));

        const leaderboardRes = await fetch(
          `/api/leagues/${leagueId}/leaderboard?full=true`
        );
        const leaderboardJson = await leaderboardRes.json();

        if (leaderboardJson?.data?.individuals) {
          const pointsMap = new Map(
            leaderboardJson.data.individuals.map((i: any) => [
              String(i.user_id),
              { points: Number(i.points || 0), avg_rr: Number(i.avg_rr || 0) },
            ])
          );

          membersWithPoints = membersWithPoints.map((m: any) => ({
            ...m,
            points: pointsMap.get(String(m.user_id))?.points ?? 0,
            avg_rr: pointsMap.get(String(m.user_id))?.avg_rr ?? 0,
          }));
        }

        if (leaderboardJson?.data?.teams) {
          const team = leaderboardJson.data.teams.find(
            (t: any) => String(t.team_id) === String(teamId)
          );
          if (team) {
            const pendingTeam = (leaderboardJson.data?.pendingWindow?.teams || []).find((t: any) => String(t.team_id) === String(teamId));
            const pendingPts = pendingTeam?.total_points ?? 0;
            setTeamRank(`#${team.rank ?? '--'}`);
            setTeamPoints(String((team.total_points ?? 0) + pendingPts));
          }
        }

        // Sort by points DESC, then RR DESC
        membersWithPoints.sort((a: any, b: any) => {
          if (b.points !== a.points) return b.points - a.points;
          return (b.avg_rr || 0) - (a.avg_rr || 0);
        });
        setMembers(membersWithPoints);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [leagueId, teamId]);

  const { showRR, showRestDays } = useLeagueDisplayConfig();

  if (isLoading) return <PageSkeleton />;

  /* ========================================================================= */

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-xl bg-primary flex items-center justify-center">
            <Users className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{teamName}</h1>
            <p className="text-muted-foreground">
              {members.length} members in your team
            </p>
          </div>
        </div>
        <Badge variant="outline">
          <Crown className="size-3 mr-1" />
          Captain
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Team Rank" value={teamRank} icon={Trophy} />
        <StatCard
          title="Team Members"
          value={`${members.length}/${teamCapacity}`}
          icon={Users}
        />
        <StatCard title="Team Points" value={teamPoints} icon={Target} />
      </div>

      {/* Members Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Member</TableHead>
              {showRestDays && <TableHead className="text-center">Rest Days</TableHead>}
              <TableHead className="text-center">Points</TableHead>
              {showRR && <TableHead className="text-center">RR</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m, i) => (
              <TableRow key={m.league_member_id}>
                <TableCell>
                  {i + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={(m as any).profile_picture_url || undefined} />
                      <AvatarFallback>
                        {m.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{capitalizeName(m.username)}</span>
                    {m.is_captain && <Crown className="size-4 text-yellow-500" />}
                  </div>
                </TableCell>
                {showRestDays && (
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {(m as any).rest_days_used ?? 0}
                  </TableCell>
                )}
                <TableCell className="text-center font-medium">
                  {m.points}
                </TableCell>
                {showRR && (
                  <TableCell className="text-center font-medium">
                    {(m.avg_rr ?? 0).toFixed(2)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}

/* ============================================================================
   Stat Card
============================================================================ */

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4" />
          {title}
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

/* ============================================================================
   Team Page (Router)
============================================================================ */

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  const { activeLeague } = useLeague();
  const { isHost, isGovernor, isCaptain } = useRole();

  const canManageTeams = isHost || isGovernor;

  if (canManageTeams) {
    return (
      <div className="p-6">
        <TeamsTable
          leagueId={leagueId}
          isHost={isHost}
          isGovernor={isGovernor}
        />
      </div>
    );
  }

  if (activeLeague?.team_id && activeLeague?.team_name) {
    return (
      <TeamMemberView
        leagueId={leagueId}
        teamId={activeLeague.team_id}
        teamName={activeLeague.team_name}
        teamCapacity={activeLeague.league_capacity || 20}
        isCaptain={isCaptain}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-96">
      <p className="text-muted-foreground">Not assigned to a team</p>
    </div>
  );
}
