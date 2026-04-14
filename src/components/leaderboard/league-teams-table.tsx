/**
 * League Teams Table
 * DataTable component for displaying team rankings in the leaderboard.
 */
'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Users from 'lucide-react/dist/esm/icons/users';
import Star from 'lucide-react/dist/esm/icons/star';
import Medal from 'lucide-react/dist/esm/icons/medal';


import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import type { TeamRanking } from '@/hooks/use-league-leaderboard';

// ============================================================================
// Types
// ============================================================================

interface LeagueTeamsTableProps {
  teams: TeamRanking[];
  showAvgRR?: boolean;
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

export function LeagueTeamsTable({ teams, showAvgRR = false }: LeagueTeamsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // ============================================================================
  // Table Columns
  // ============================================================================

  const columns: ColumnDef<TeamRanking>[] = React.useMemo(() => [
    {
      accessorKey: 'rank',
      header: 'Rank',
      cell: ({ row }) => <RankBadge rank={row.original.rank} />,
    },
    {
      accessorKey: 'team_name',
      header: 'Team',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-8 rounded-md shrink-0">
            {row.original.logo_url ? (
              <AvatarImage src={row.original.logo_url} alt={row.original.team_name} />
            ) : (
              <AvatarFallback className="rounded-md text-xs uppercase">
                {row.original.team_name.slice(0, 2)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-semibold text-sm whitespace-nowrap">{row.original.team_name}</p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {row.original.member_count} members
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'total_points',
      header: 'Points',
      cell: ({ row }) => (
        <div className="text-base font-bold text-primary tabular-nums">
          {row.original.total_points}
        </div>
      ),
    },
    ...(showAvgRR
      ? [{
        accessorKey: 'avg_rr' as const,
        header: 'RR',
        cell: ({ row }: { row: any }) => (
          <div className="flex items-center gap-1">
            <Star className="size-3.5 text-yellow-500" />
            <span className="text-sm font-medium whitespace-nowrap">{row.original.avg_rr.toFixed(2)}</span>
          </div>
        ),
      }]
      : []),
  ], [showAvgRR]);

  // ============================================================================
  // Table Instance
  // ============================================================================

  const table = useReactTable({
    data: teams,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() }}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  row.original.rank <= 3 && 'bg-muted/30'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
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

export default React.memo(LeagueTeamsTable);

