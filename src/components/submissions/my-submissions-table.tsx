/**
 * My Activities Table
 * DataTable component for displaying player's activities with filtering and pagination.
 */
'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Eye,
  Dumbbell,
  Moon,
  CheckCircle2,
  XCircle,
  Clock3,
  Calendar,
  RefreshCw,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { cn } from '@/lib/utils';
import { isReuploadWindowOpen } from '@/lib/utils/reupload-window';

import { SubmissionDetailDialog } from './submission-detail-dialog';
import type { MySubmission, SubmissionStats } from '@/hooks/use-my-submissions';
import { isExemptionRequest } from '@/hooks/use-my-submissions';
import { useRouter } from 'next/navigation';
import { useLeague } from '@/contexts/league-context';

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton() {
  return <DumbbellLoading label="Loading activities..." />;
}

// ============================================================================
// Stats Cards Component
// ============================================================================

function StatsCards({ stats, restDaysUsed, showRestDays = true }: { stats: SubmissionStats; restDaysUsed: number; showRestDays?: boolean }) {
  const cards = [
    {
      label: 'Total',
      value: stats.total,
      icon: Calendar,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock3,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    },
    ...(showRestDays ? [{
      label: 'Rest Days',
      value: restDaysUsed,
      icon: Moon,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    }] : []),
  ];

  return (
    <div className={cn("grid gap-2", showRestDays ? "grid-cols-5" : "grid-cols-4")}>
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col items-center justify-center p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors h-14"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <card.icon className={cn("size-3", card.color.split(' ')[0])} />
            <span className="text-sm font-bold leading-none">{card.value}</span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium truncate w-full text-center">
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: MySubmission['status'] }) {
  const config = {
    pending: {
      label: 'Pending',
      icon: Clock3,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    rejected_resubmit: {
      label: 'Rejected (Retry)',
      icon: RefreshCw,
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    },
    rejected_permanent: {
      label: 'Rejected (Final)',
      icon: XCircle,
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
  };

  const { label, icon: Icon, className } = config[status] || config.rejected;

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

// ============================================================================
// MySubmissionsTable Component
// ============================================================================

interface MySubmissionsTableProps {
  submissions: MySubmission[];
  stats: SubmissionStats;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function MySubmissionsTable({
  submissions,
  stats,
  isLoading,
  error,
  onRefresh,
}: MySubmissionsTableProps) {
  const router = useRouter();
  const { activeLeague } = useLeague();
  const rrFormula = (activeLeague as any)?.rr_config?.formula || 'standard';
  const showRR = rrFormula === 'standard';
  const showRestDays = ((activeLeague as any)?.rest_days ?? 1) > 0;
  const pointsUnit = showRR ? 'RR' : 'pts';
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'date', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const tzOffsetMinutes = React.useMemo(() => new Date().getTimezoneOffset(), []);

  // Dialog state
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [selectedSubmission, setSelectedSubmission] = React.useState<MySubmission | null>(null);

  // Get league ID from URL
  const leagueId = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '';

  // Handle resubmit - redirect to submit page with query params
  const handleResubmit = (submission: MySubmission) => {
    const params = new URLSearchParams({
      resubmit: submission.id,
      date: submission.date,
      type: submission.type,
    });

    if (submission.workout_type) params.set('workout_type', submission.workout_type);
    if (submission.duration) params.set('duration', submission.duration.toString());
    if (submission.distance) params.set('distance', submission.distance.toString());
    if (submission.steps) params.set('steps', submission.steps.toString());
    if (submission.holes) params.set('holes', submission.holes.toString());
    if (submission.notes) params.set('notes', submission.notes);

    router.push(`/leagues/${leagueId}/submit?${params.toString()}`);
  };

  // Filter submissions by status
  const filteredSubmissions = React.useMemo(() => {
    if (statusFilter === 'all') return submissions;
    return submissions.filter((s) => s.status === statusFilter);
  }, [submissions, statusFilter]);

  // Track originals that already have a reupload child so we don't offer another resubmit.
  const originalsWithReupload = React.useMemo(() => {
    const parents = new Set<string>();
    submissions.forEach((sub) => {
      if (sub.reupload_of) parents.add(sub.reupload_of);
    });
    return parents;
  }, [submissions]);

  // Determine which submissions can be resubmitted
  // Core Rule: Re-submit button appears ONLY on original submissions (reupload_of = null)
  // when rejected AND no newer reupload already exists for it.
  const resubmittableIds = React.useMemo(() => {
    const canResubmit = new Set<string>();

    submissions.forEach((sub) => {
      const rejectionTime = sub.modified_date || sub.created_date;
      const windowOpen = isReuploadWindowOpen(rejectionTime, tzOffsetMinutes);
      if (
        sub.reupload_of === null &&
        sub.reupload_of === null &&
        (sub.status === 'rejected' || sub.status === 'rejected_resubmit') &&
        !originalsWithReupload.has(sub.id) &&
        windowOpen
      ) {
        canResubmit.add(sub.id);
      }
    });

    return canResubmit;
  }, [submissions, originalsWithReupload, tzOffsetMinutes]);

  // Note: Only reupload entries (reupload_of != null) should display the
  // "Re-submitted" indicator. Originals should remain unmarked.

  // Format workout type for display
  const formatWorkoutType = (type: string | null) => {
    if (!type) return 'General';
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ============================================================================
  // Table Columns
  // ============================================================================

  const columns: ColumnDef<MySubmission>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="font-medium text-sm whitespace-nowrap">
          {format(parseISO(row.original.date), 'MMM d')}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Activity',
      cell: ({ row }) => {
        const isWorkout = row.original.type === 'workout';
        const isExemption = isExemptionRequest(row.original);
        return (
          <div className="flex items-center gap-1 min-w-0">
            {isWorkout ? (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Dumbbell className="size-3.5 text-primary" />
              </div>
            ) : isExemption ? (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                <ShieldAlert className="size-3.5 text-amber-600" />
              </div>
            ) : (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Moon className="size-3.5 text-blue-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {isWorkout
                  ? (row.original.workout_type ? formatWorkoutType(row.original.workout_type) : 'Workout')
                  : isExemption ? 'Exemption' : 'Rest'}
              </p>
              {((row.original as any).effective_points ?? row.original.rr_value) != null && (
                <p className="text-xs text-muted-foreground">
                  {(row.original as any).effective_points ?? row.original.rr_value} {pointsUnit}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={row.original.status} />
          {Boolean(row.original.reupload_of) && (
            <RefreshCw className="size-3 text-blue-500" />
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              setSelectedSubmission(row.original);
              setDetailDialogOpen(true);
            }}
          >
            <Eye className="size-3.5" />
            <span className="sr-only">View details</span>
          </Button>
          {resubmittableIds.has(row.original.id) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-blue-600"
              onClick={() => handleResubmit(row.original)}
            >
              <Upload className="size-3.5" />
              <span className="sr-only">Re-submit</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ============================================================================
  // Table Instance
  // ============================================================================

  const table = useReactTable({
    data: filteredSubmissions,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header section deleted */}

      {/* Stats Cards */}
      <StatsCards
        stats={stats}
        restDaysUsed={submissions.filter(s => s.type === 'rest' && s.status === 'approved').length}
        showRestDays={showRestDays}
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by date or type..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
          <p className="text-sm font-medium">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRefresh}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  className={['rejected', 'rejected_resubmit', 'rejected_permanent'].includes(row.original.status) ? 'bg-red-50/50 dark:bg-red-950/20' : ''}
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
                <TableCell colSpan={columns.length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Dumbbell className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No activities yet</p>
                      <p className="text-sm text-muted-foreground">
                        {statusFilter !== 'all'
                          ? `No ${statusFilter} activities found`
                          : 'Submit your first activity to get started!'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredSubmissions.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            {table.getFilteredRowModel().rows.length} activit{table.getFilteredRowModel().rows.length === 1 ? 'y' : 'ies'}
          </div>

          {/* Right controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Rows</Label>
              <Select
                value={`${pagination.pageSize}`}
                onValueChange={(value) =>
                  setPagination({ ...pagination, pageSize: Number(value) })
                }
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page info */}
            <div className="text-xs whitespace-nowrap">
              Page {pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="size-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="size-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="size-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <SubmissionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        submission={selectedSubmission}
        isOwner={true}
        onReupload={() => {
          if (selectedSubmission) {
            handleResubmit(selectedSubmission);
          }
        }}
      />
    </div>
  );
}

export default MySubmissionsTable;
