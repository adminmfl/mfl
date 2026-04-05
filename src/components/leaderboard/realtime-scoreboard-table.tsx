/**
 * Real-time Scoreboard Table
 * Shows the last 1-2 days that are still within the 2-day leaderboard delay window.
 */
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Medal, Star, Trophy, Users } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { cn } from '@/lib/utils';

import type { PendingTeamWindowRanking } from '@/hooks/use-league-leaderboard';

interface RealTimeScoreboardTableProps {
  dates: string[];
  teams: PendingTeamWindowRanking[];
  showAvgRR?: boolean;
}

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

function formatHeaderDate(dateYYYYMMDD: string): string {
  // Date strings are in YYYY-MM-DD; use local date for display.
  const [y, m, d] = dateYYYYMMDD.split('-').map((p) => Number(p));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return format(dt, 'MMM d');
}

export function RealTimeScoreboardTable({ dates, teams, showAvgRR = true }: RealTimeScoreboardTableProps) {
  if (!dates.length) return null;

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] px-2 text-center">Rank</TableHead>
            <TableHead className="px-2">Team</TableHead>
            {dates.map((d) => (
              <TableHead key={d} className="text-right tabular-nums whitespace-nowrap w-[65px] px-2 text-xs sm:text-sm">
                {formatHeaderDate(d)}
              </TableHead>
            ))}
            {showAvgRR && <TableHead className="text-right w-[65px] px-2">RR</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length ? (
            teams.map((t) => (
              <TableRow
                key={t.team_id}
                className={cn(t.rank <= 3 && 'bg-muted/30')}
              >
                <TableCell className="px-2">
                  <RankBadge rank={t.rank} />
                </TableCell>
                <TableCell className="px-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8 rounded-md shrink-0">
                      {t.logo_url ? (
                        <AvatarImage src={t.logo_url} alt={t.team_name} />
                      ) : (
                        <AvatarFallback className="rounded-md text-xs uppercase">
                          {t.team_name.slice(0, 2)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">{t.team_name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Pending verification</p>
                    </div>
                  </div>
                </TableCell>
                {dates.map((d) => {
                  const points = t.pointsByDate?.[d] ?? 0;
                  return (
                    <TableCell key={d} className="text-right tabular-nums px-2">
                      <span className={cn('text-base font-bold', points > 0 ? 'text-primary' : 'text-muted-foreground')}>
                        {points}
                      </span>
                    </TableCell>
                  );
                })}
                {showAvgRR && (
                <TableCell className="text-right px-2">
                  <div className="flex items-center justify-end gap-1">
                    <Star className="size-3.5 text-yellow-500" />
                    <span className="text-sm font-medium tabular-nums whitespace-nowrap">{t.avg_rr.toFixed(2)}</span>
                  </div>
                </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3 + dates.length} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Users className="size-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No teams found</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default RealTimeScoreboardTable;
