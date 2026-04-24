/**
 * Challenge Leaderboard Component
 * Shows team rankings for challenges (simplified view)
 */
'use client';

import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Challenge {
  id: string;
  name: string;
  challenge_type: 'individual' | 'team' | 'sub_team';
  total_points: number;
  status?:
    | 'draft'
    | 'scheduled'
    | 'active'
    | 'submission_closed'
    | 'published'
    | 'closed'
    | string;
  start_date?: string | null;
  end_date?: string | null;
}

interface ChallengeScore {
  id: string;
  name: string;
  score: number;
  rank: number;
  teamName?: string;
}

interface ChallengeSpecificLeaderboardProps {
  leagueId: string;
  renderViewSwitcher?: React.ReactNode;
}

// ============================================================================
// Rank Badge Component
// ============================================================================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center size-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <Trophy className="size-4 text-yellow-600" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center size-8 rounded-full bg-gray-100 dark:bg-gray-800">
        <Medal className="size-4 text-gray-500" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center size-8 rounded-full bg-orange-100 dark:bg-orange-900/30">
        <Medal className="size-4 text-orange-600" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center size-8 rounded-full bg-muted">
      <span className="text-sm font-medium text-muted-foreground">{rank}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChallengeSpecificLeaderboard({
  leagueId,
  renderViewSwitcher,
}: ChallengeSpecificLeaderboardProps) {
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] =
    React.useState<string>('');
  const [scores, setScores] = React.useState<ChallengeScore[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedChallenge = challenges.find(
    (c) => c.id === selectedChallengeId,
  );

  // Fetch challenges (from leagueschallenges + any special-challenge-only entries)
  React.useEffect(() => {
    const fetchChallenges = async () => {
      try {
        // Fetch standard challenges and special challenges in parallel
        const [res, scRes] = await Promise.all([
          fetch(`/api/leagues/${leagueId}/challenges`),
          fetch(`/api/leagues/${leagueId}/special-challenge-scores`),
        ]);

        const json = await res.json();
        const visible: Challenge[] = [];
        if (json.success && json.data?.active) {
          // Filter to show challenges that are at least active
          const fromLeague = (json.data.active as Challenge[]).filter(
            (c) =>
              c.status === 'active' ||
              c.status === 'submission_closed' ||
              c.status === 'published' ||
              c.status === 'closed',
          );
          visible.push(...fromLeague);
        }

        // Also process special challenges that have team scores but aren't in leagueschallenges
        if (scRes.ok) {
          const scJson = await scRes.json();
          if (scJson.success && scJson.data) {
            const existingIds = new Set(
              visible.map((c) => (c as any).template_id || ''),
            );
            (
              scJson.data as Array<{ challenge_id: string; name: string }>
            ).forEach((sc) => {
              if (!existingIds.has(sc.challenge_id)) {
                visible.push({
                  id: `sc_${sc.challenge_id}`,
                  name: sc.name,
                  challenge_type: 'team',
                  total_points: 0,
                  status: 'closed',
                });
              }
            });
          }
        }

        setChallenges(visible);
      } catch (err) {
        console.error('Failed to fetch challenges:', err);
      }
    };
    fetchChallenges();
  }, [leagueId]);

  // Auto-select most recent challenge
  React.useEffect(() => {
    if (selectedChallengeId || challenges.length === 0) return;

    const toTime = (dateStr?: string | null) => {
      if (!dateStr) return 0;
      const dtIso = new Date(dateStr);
      if (!Number.isNaN(dtIso.getTime())) return dtIso.getTime();
      return 0;
    };

    const sortByRecent = (a: Challenge, b: Challenge) =>
      toTime(b.end_date || b.start_date) - toTime(a.end_date || a.start_date);

    const defaultChallenge = [...challenges].sort(sortByRecent)[0];
    if (defaultChallenge?.id) {
      setSelectedChallengeId(defaultChallenge.id);
    }
  }, [challenges, selectedChallengeId]);

  // Fetch scores for selected challenge
  React.useEffect(() => {
    if (!selectedChallengeId) {
      setScores([]);
      return;
    }

    const fetchScores = async () => {
      setLoading(true);
      setError(null);
      try {
        let url: string;
        if (selectedChallengeId.startsWith('sc_')) {
          // Special-challenge-only entry — fetch scores directly
          const scId = selectedChallengeId.replace('sc_', '');
          url = `/api/leagues/${leagueId}/special-challenge-scores/${scId}`;
        } else {
          url = `/api/leagues/${leagueId}/challenges/${selectedChallengeId}/leaderboard`;
        }
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch scores');
        }
        setScores(json.data || []);
      } catch (err) {
        console.error('Failed to fetch challenge scores:', err);
        setError(err instanceof Error ? err.message : 'Failed to load scores');
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [leagueId, selectedChallengeId]);

  const getChallengeTypeLabel = (type: string) => {
    switch (type) {
      case 'individual':
        return 'Individual';
      case 'team':
        return 'Team';
      case 'sub_team':
        return 'Sub-Team';
      default:
        return type;
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="size-5" />
            Challenge Rankings
          </h2>
          {renderViewSwitcher}
        </div>
        <p className="text-sm text-muted-foreground">
          Team rankings by challenge
        </p>
      </div>

      <div className="space-y-4">
        <Select
          value={selectedChallengeId}
          onValueChange={setSelectedChallengeId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select challenge..." />
          </SelectTrigger>
          <SelectContent>
            {challenges.map((challenge) => (
              <SelectItem key={challenge.id} value={challenge.id}>
                <div className="flex items-center gap-2">
                  <Users className="size-4" />
                  <span>{challenge.name}</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {getChallengeTypeLabel(challenge.challenge_type)}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!selectedChallengeId && challenges.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No completed challenges yet.
          </div>
        )}

        {!selectedChallengeId && challenges.length > 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Select a challenge to view team rankings
          </div>
        )}

        {selectedChallengeId && loading && (
          <div className="text-center py-12 text-muted-foreground">
            Loading rankings...
          </div>
        )}

        {selectedChallengeId && error && (
          <div className="text-center py-12 text-destructive">{error}</div>
        )}

        {selectedChallengeId && !loading && !error && scores.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No scores yet for this challenge.
          </div>
        )}

        {selectedChallengeId && !loading && !error && scores.length > 0 && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map((score) => (
                  <TableRow
                    key={score.id}
                    className={cn(score.rank <= 3 && 'bg-muted/30')}
                  >
                    <TableCell>
                      <RankBadge rank={score.rank} />
                    </TableCell>
                    <TableCell className="font-medium">{score.name}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-lg font-bold text-primary">
                        {score.score}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
