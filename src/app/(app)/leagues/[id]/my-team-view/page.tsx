/**
 * My Team View Page
 * Read-only view for players to see their team information and teammates.
 */
'use client';

import { use, useState, useEffect } from 'react';
import {
  Users,
  Trophy,
  Target,
  Crown,
  Shield,
  Flame,
  AlertCircle,
  Star,
  Moon,
  XCircle,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { Card } from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import type { TeamMember } from '@/hooks/use-league-teams';

// ============================================================================
// Helpers
// ============================================================================

function capitalizeName(name: string) {
  if (!name) return '';
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function PageSkeleton() {
  return <DumbbellLoading label="Loading team..." />;
}

// ============================================================================
// My Team View Page
// ============================================================================

export default function MyTeamViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = use(params);
  const { activeLeague } = useLeague();
  const { activeRole, canSubmitWorkouts } = useRole();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamRank, setTeamRank] = useState<string>('#--');
  const [teamPoints, setTeamPoints] = useState<string>('--');
  const [teamAvgRR, setTeamAvgRR] = useState<string>('--');
  const [teamActivityPoints, setTeamActivityPoints] = useState<number | null>(null);
  const [teamChallengePoints, setTeamChallengePoints] = useState<number | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  const [teamMissedDays, setTeamMissedDays] = useState<number | null>(null);
  const [teamRestUsed, setTeamRestUsed] = useState<number | null>(null);

  const userTeamId = activeLeague?.team_id;
  const userTeamName = activeLeague?.team_name;
  const teamCapacity = activeLeague?.league_capacity || 20;

  // Fetch team members + merge points & RR from leaderboard
  useEffect(() => {
    async function fetchMembers() {
      if (!userTeamId) {
        setIsLoading(false);
        return;
      }

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
          let membersWithPoints = (result.data || []).map((m: any) => ({
            ...m,
            points: 0,
            avg_rr: 0,
          }));

          try {
            const lbRes = await fetch(`/api/leagues/${leagueId}/leaderboard?full=true`);
            const lbJson = await lbRes.json();
            if (lbRes.ok && lbJson?.success && lbJson.data?.individuals) {
              const statsMap = new Map<string, { points: number; avg_rr: number }>(
                lbJson.data.individuals.map((i: any) => [
                  String(i.user_id),
                  { points: Number(i.points || 0), avg_rr: Number(i.avg_rr || 0) },
                ])
              );
              membersWithPoints = membersWithPoints.map((m: any) => ({
                ...m,
                points: statsMap.get(String(m.user_id))?.points ?? 0,
                avg_rr: statsMap.get(String(m.user_id))?.avg_rr ?? 0,
              }));
            }
          } catch (err) {
            console.error('Error fetching leaderboard for points:', err);
          }

          // Sort by points DESC, then avg_rr DESC
          membersWithPoints.sort((a: any, b: any) => {
            if (b.points !== a.points) return b.points - a.points;
            return (b.avg_rr || 0) - (a.avg_rr || 0);
          });

          setMembers(membersWithPoints);
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

  // Get captain info
  const captain = members.find((m) => m.is_captain);

  // Stats cards data
  const stats = [
    {
      title: 'Team Rank',
      value: teamRank,
      description: 'League standing',
      icon: Trophy,
    },
    {
      title: 'Team Members',
      value: `${members.length}`,
      description: 'Current roster',
      icon: Users,
    },
    {
      title: 'Team Points',
      value: String(teamPoints),
      description: 'Total score',
      icon: Target,
    },
    {
      title: 'RR',
      value: parseFloat(teamAvgRR).toFixed(1),
      description: 'Run Rate',
      icon: Flame,
    },
    {
      title: 'Activity Points',
      value: typeof teamActivityPoints === 'number' ? teamActivityPoints.toLocaleString() : '—',
      description: 'Workout points',
      icon: Star,
    },
    {
      title: 'Challenge Points',
      value: typeof teamChallengePoints === 'number' ? teamChallengePoints.toLocaleString() : '—',
      description: 'Bonus points',
      icon: Star,
    },
    {
      title: 'Rest Days Used',
      value: typeof teamRestUsed === 'number' ? teamRestUsed.toLocaleString() : '—',
      description: 'Team total',
      icon: Moon,
    },
    {
      title: 'Days Missed',
      value: typeof teamMissedDays === 'number' ? teamMissedDays.toLocaleString() : '—',
      description: 'No submission',
      icon: XCircle,
    },
  ];

  // Fetch leaderboard stats for this team
  useEffect(() => {
    async function fetchTeamStats() {
      if (!leagueId || !userTeamId) return;
      try {
        const res = await fetch(`/api/leagues/${leagueId}/leaderboard`);
        const json = await res.json();
        if (res.ok && json?.success && json.data?.teams) {
          const team = (json.data.teams || []).find((t: any) => String(t.team_id) === String(userTeamId));
          if (team) {
            setTeamRank(`#${team.rank ?? '--'}`);
            const pts = team.total_points ?? team.points ?? 0;
            setTeamPoints(String(pts));
            setTeamAvgRR(String(team.avg_rr ?? 0));
            setTeamActivityPoints(typeof team.points === 'number' ? Math.max(0, team.points) : null);
            setTeamChallengePoints(typeof team.challenge_bonus === 'number' ? Math.max(0, team.challenge_bonus) : null);
          }
        }

        // Fetch team logo
        const logoRes = await fetch(`/api/leagues/${leagueId}/teams/${userTeamId}`);
        const logoJson = await logoRes.json();
        if (logoRes.ok && logoJson?.success && logoJson.data?.logo_url) {
          setTeamLogoUrl(logoJson.data.logo_url);
        }

        // Fetch team summary (rest days used + missed days)
        try {
          const summaryRes = await fetch(`/api/leagues/${leagueId}/my-team/summary`);
          const summaryJson = await summaryRes.json();
          if (summaryRes.ok && summaryJson?.success && summaryJson.data) {
            if (typeof summaryJson.data.restUsed === 'number') {
              setTeamRestUsed(summaryJson.data.restUsed);
            }
            if (typeof summaryJson.data.missedDays === 'number') {
              setTeamMissedDays(summaryJson.data.missedDays);
            }
          }
        } catch (err) {
          console.error('Error fetching team summary:', err);
        }
      } catch (err) {
        console.error('Error fetching team leaderboard stats (view):', err);
      }
    }

    fetchTeamStats();
  }, [leagueId, userTeamId]);

  // Access check
  if (!canSubmitWorkouts) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="px-4 lg:px-6">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              You are currently viewing as {activeRole}. To view your team,
              you need to be participating as a player in this league.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Not assigned to a team
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
              alt={userTeamName}
              className="size-14 rounded-xl object-cover shadow-lg"
            />
          ) : (
            <div className="size-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg">
              <Users className="size-7 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{userTeamName}</h1>
            <p className="text-muted-foreground">
              View your team members and performance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {captain && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-200"
            >
              <Crown className="size-3 mr-1" />
              Captain: {capitalizeName(captain.username)}
            </Badge>
          )}
          <Badge variant="outline">
            <Users className="size-3 mr-1" />
            {members.length} Members
          </Badge>
          <Link
            href={`/leagues/${leagueId}/messages`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="size-3" />
            Team Chat
          </Link>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 px-4 lg:px-6">
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
            <Card key={index} className="p-1.5">
              <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                <StatIcon className="size-2" />
                {stat.title}
              </div>
              <div className="text-[20px] font-semibold tabular-nums leading-tight">
                {stat.value}
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-1">
                {stat.description}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Team Members Table — all members, no search, no pagination */}
      <div className="px-4 lg:px-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''} in your team
          </p>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="text-center">Rest Days</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-center">RR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length > 0 ? (
                members.map((member, index) => (
                  <TableRow key={member.league_member_id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="size-10">
                            {(member as any).profile_picture_url && (
                              <AvatarImage src={(member as any).profile_picture_url} alt={member.username} />
                            )}
                            <AvatarFallback>
                              {member.username
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {member.is_captain && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-background">
                              <Crown className="size-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">{capitalizeName(member.username)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {member.is_captain ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                          <Shield className="size-3 mr-1" />
                          Captain
                        </Badge>
                      ) : (
                        <Badge variant="outline">Player</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground tabular-nums">
                      {(member as any).rest_days_used ?? 0}
                    </TableCell>
                    <TableCell className="text-center font-medium tabular-nums">
                      {(member as any).points ?? 0}
                    </TableCell>
                    <TableCell className="text-center font-medium tabular-nums">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="size-3 text-yellow-500" />
                        {((member as any).avg_rr ?? 0).toFixed(2)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No members in this team yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
