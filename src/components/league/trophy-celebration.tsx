'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, Award, Target, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { SeasonSummary } from './season-summary';

interface TrophyCelebrationProps {
  leagueId: string;
  leagueName: string;
  daysRemaining: number;
}

interface TrophyStats {
  player: {
    username: string;
    totalPoints: number;
    leagueRank: number;
    teamRank: number | null;
    avgRR: number | null;
    totalActiveDays: number;
    bestStreak: number;
    challengePoints: number;
  };
  team: {
    teamName: string;
    totalPoints: number;
    teamRank: number;
    memberCount: number;
  } | null;
  league: {
    leagueName: string;
    totalTeams: number;
    totalMembers: number;
    winnerTeam: {
      teamName: string;
      teamPoints: number;
    } | null;
  };
}

export function TrophyCelebration({
  leagueId,
  leagueName,
  daysRemaining,
}: TrophyCelebrationProps) {
  const [stats, setStats] = useState<TrophyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/trophy-stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching trophy stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [leagueId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-48 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Trophy Celebration Banner */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 p-8">
        <div className="absolute inset-0 opacity-5">
          <Trophy className="absolute top-4 right-4 size-32 text-amber-600" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="size-8 text-amber-600 animate-bounce" />
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-900 border-amber-300"
            >
              Trophy Mode Active
            </Badge>
            <span className="text-sm text-amber-700 font-medium">
              {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
            </span>
          </div>
          <h2 className="text-3xl font-bold text-amber-900 mb-2">
            🎉 {leagueName} Trophy Unlocked!
          </h2>
          <p className="text-amber-800">
            Congratulations! Your league has concluded. Celebrate your
            achievements!
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personal Rank */}
        <Card className="border-primary/20 bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                Your League Rank
              </span>
              <Award className="size-4 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-900">
              #{stats.player.leagueRank}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              of {stats.league.totalMembers} players
            </p>
          </CardContent>
        </Card>

        {/* Total Points */}
        <Card className="border-primary/20 bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                Total Points
              </span>
              <Target className="size-4 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {stats.player.totalPoints.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Regular + Challenge: {stats.player.challengePoints}
            </p>
          </CardContent>
        </Card>

        {/* Active Days */}
        <Card className="border-primary/20 bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Active Days</span>
              <Sparkles className="size-4 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-900">
              {stats.player.totalActiveDays}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Best streak: {stats.player.bestStreak} days
            </p>
          </CardContent>
        </Card>

        {/* Best Performance */}
        <Card className="border-primary/20 bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Best Metric</span>
              <Flame className="size-4 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-900">
              {stats.player.avgRR ? stats.player.avgRR.toFixed(2) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Avg Run Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      {stats.team && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-amber-600" />
              Team: {stats.team.teamName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Team Rank</p>
                <p className="text-2xl font-bold">#{stats.team.teamRank}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">
                  {stats.team.totalPoints.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-bold">{stats.team.memberCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* League Winner */}
      {stats.league.winnerTeam && (
        <Card className="border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🏆</div>
              <div>
                <p className="text-sm text-muted-foreground">League Champion</p>
                <p className="text-xl font-bold">
                  {stats.league.winnerTeam.teamName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.league.winnerTeam.teamPoints.toLocaleString()} points
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-League CTA */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-2">
          Ready for Your Next Challenge?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your own league and host your next competition with your team
          or community.
        </p>
        <Button asChild className="w-full">
          <Link href="/leagues/create">Run Your Own League →</Link>
        </Button>
      </div>

      {/* Season Summary Report */}
      <SeasonSummary
        leagueId={leagueId}
        leagueName={leagueName}
        canDownload={true}
      />
    </div>
  );
}
