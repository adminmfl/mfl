/**
 * League Individuals Table
 * Simple table for displaying top individual player rankings.
 */
'use client';

import * as React from 'react';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Star from 'lucide-react/dist/esm/icons/star';
import Medal from 'lucide-react/dist/esm/icons/medal';


import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfilePicture } from '@/components/ui/profile-picture';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import type { IndividualRanking } from '@/hooks/use-league-leaderboard';

function capitalizeName(name: string) {
  if (!name) return '';
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ============================================================================
// Rank Badge
// ============================================================================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <Trophy className="size-4 text-yellow-600" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Medal className="size-4 text-gray-500" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
        <Medal className="size-4 text-orange-600" />
      </div>
    );

  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
      <span className="text-sm font-medium text-muted-foreground">{rank}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LeagueIndividualsTable({
  individuals,
  showAvgRR = false,
}: {
  individuals: IndividualRanking[];
  showAvgRR?: boolean;
}) {
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Points</TableHead>
            {showAvgRR && <TableHead>RR</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {individuals.length ? (
            individuals.map((player) => (
              <TableRow
                key={player.user_id}
                className={cn(player.rank <= 3 && 'bg-muted/30')}
              >
                <TableCell>
                  <RankBadge rank={player.rank} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ProfilePicture
                      username={player.username}
                      profilePictureUrl={(player as any).profile_picture_url}
                      size={32}
                    />
                    <div>
                      <p className="font-semibold text-sm whitespace-nowrap">{capitalizeName(player.username)}</p>
                      {player.team_name && (
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {player.team_name}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-base font-bold text-primary tabular-nums">
                    {player.points}
                  </div>
                </TableCell>
                {showAvgRR && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="size-3.5 text-yellow-500" />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {player.avg_rr.toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={showAvgRR ? 4 : 3} className="h-24 text-center">
                No players found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default React.memo(LeagueIndividualsTable);

