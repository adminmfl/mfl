/**
 * Team Submissions Page (Captain)
 * Captain's validation queue for their team's submissions.
 */
'use client';

import * as React from 'react';
import { use, useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock3,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  Eye,
  Crown,
  Dumbbell,
  Moon,
  Calendar as CalendarIcon,
  RefreshCw,
  Check,
  X,
  Loader2,
  ShieldAlert,
  Ban,
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
import { format, parseISO, isSameDay } from 'date-fns';
import { toast } from '@/lib/toast';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ProfilePicture } from '@/components/ui/profile-picture';
import { cn } from '@/lib/utils';

import { SubmissionDetailDialog } from '@/components/submissions';

// ============================================================================
// Types
// ============================================================================

interface TeamSubmission {
  id: string;
  league_member_id: string;
  date: string;
  type: 'workout' | 'rest';
  workout_type: string | null;
  duration: number | null;
  distance: number | null;
  steps: number | null;
  holes: number | null;
  rr_value: number | null;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'rejected_resubmit'
    | 'rejected_permanent';
  proof_url: string | null;
  notes: string | null;
  created_date: string;
  modified_date: string;
  modified_by: string | null;
  graded_by_role: 'host' | 'governor' | 'captain' | 'player' | 'system' | null;
  reupload_of: string | null;
  member: {
    user_id: string;
    username: string;
    email: string;
  };
}

interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function PageSkeleton() {
  return <DumbbellLoading label="Loading submissions..." />;
}

// ============================================================================
// Stats Cards
// ============================================================================

function StatsCards({ stats }: { stats: SubmissionStats }) {
  const cards = [
    {
      label: 'Total',
      value: stats.total,
      icon: CalendarIcon,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock3,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 p-4 rounded-lg border bg-card"
        >
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-lg',
              card.color,
            )}
          >
            <card.icon className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: TeamSubmission['status'] }) {
  const config = {
    pending: {
      label: 'Pending',
      icon: Clock3,
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    rejected_resubmit: {
      label: 'Rejected (Retry)',
      icon: RefreshCw,
      className:
        'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    },
    rejected_permanent: {
      label: 'Rejected (Final)',
      icon: Ban,
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
// Team Submissions Page
// ============================================================================

export default function TeamSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = use(params);
  const { activeLeague } = useLeague();
  const rrFormula = (activeLeague as any)?.rr_config?.formula || 'standard';
  const showRR = rrFormula === 'standard';
  const pointsUnit = showRR ? 'RR' : 'pts';
  const { isCaptain, isViceCaptain } = useRole();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [submissions, setSubmissions] = useState<TeamSubmission[]>([]);
  const [stats, setStats] = useState<SubmissionStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [tableAwardedPoints, setTableAwardedPoints] = useState<
    Record<string, number | ''>
  >({});

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<TeamSubmission | null>(null);

  // Fetch submissions
  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/leagues/${leagueId}/my-team/submissions`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch submissions');
      }

      if (result.success) {
        setSubmissions(result.data.submissions);
        setStats(result.data.stats);
      }
    } catch (err) {
      console.error('Error fetching team submissions:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load submissions',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [leagueId]);

  // Handle validation (approve/reject)
  const handleValidate = async (
    submissionId: string,
    newStatus: 'approved' | 'rejected_resubmit',
    awardedPoints?: number | null,
  ) => {
    try {
      setValidatingId(submissionId);

      const body: any = { status: newStatus };
      if (awardedPoints !== undefined) body.awardedPoints = awardedPoints;

      const response = await fetch(
        `/api/submissions/${submissionId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to validate submission');
      }

      toast.success(
        newStatus === 'approved'
          ? 'Submission Approved'
          : 'Submission Rejected',
      );

      // Update local state
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId ? { ...s, status: newStatus } : s,
        ),
      );
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        [newStatus === 'rejected_resubmit' ? 'rejected' : newStatus]:
          prev[newStatus === 'rejected_resubmit' ? 'rejected' : newStatus] + 1,
      }));
    } catch (err) {
      console.error('Error validating submission:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to validate');
    } finally {
      setValidatingId(null);
    }
  };

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter((s) => {
        const subDate = parseISO(s.date);
        return isSameDay(subDate, dateFilter);
      });
    }

    return filtered;
  }, [submissions, statusFilter, dateFilter]);

  // Format workout type for display
  const formatWorkoutType = (type: string | null) => {
    if (!type) return 'General';
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Table columns
  const columns: ColumnDef<TeamSubmission>[] = [
    {
      id: 'memberName',
      accessorFn: (row) => row.member.username,
      header: 'Member',
      filterFn: 'includesString',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {row.original.member.username
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.original.member.username}</span>
        </div>
      ),
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const isTrial =
          activeLeague?.start_date &&
          row.original.date < activeLeague.start_date;
        return (
          <div className="flex flex-col">
            <span className="text-sm">
              {format(parseISO(row.original.date), 'MMM d, yyyy')}
            </span>
            {isTrial && (
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-0.5 border border-blue-200">
                Trial
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const isWorkout = row.original.type === 'workout';
        const isExemption =
          row.original.type === 'rest' &&
          row.original.notes?.includes('[EXEMPTION_REQUEST]');
        return (
          <div className="flex items-center gap-2">
            {isWorkout ? (
              <Dumbbell className="size-4 text-primary" />
            ) : isExemption ? (
              <ShieldAlert className="size-4 text-amber-500" />
            ) : (
              <Moon className="size-4 text-blue-500" />
            )}
            <span className="text-sm">
              {isWorkout
                ? formatWorkoutType(row.original.workout_type)
                : isExemption
                  ? 'Exemption Request'
                  : 'Rest Day'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'rr_value',
      header: 'Points',
      cell: ({ row }) => {
        const value =
          (row.original as any).effective_points ?? row.original.rr_value;
        if (value === null)
          return <span className="text-muted-foreground">-</span>;
        return (
          <span className="font-semibold text-primary">
            {value} {pointsUnit}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const role = row.original.graded_by_role;
        const showGradedBy =
          row.original.status !== 'pending' &&
          (role === 'host' ||
            role === 'governor' ||
            role === 'captain' ||
            role === 'vice_captain');
        const roleLabel = role
          ? role.charAt(0).toUpperCase() + role.slice(1)
          : '';
        const isOwnSubmission =
          !!currentUserId && row.original.member.user_id === currentUserId;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={row.original.status} />
              {Boolean(row.original.reupload_of) && (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                >
                  <RefreshCw className="size-2.5 mr-1" />
                  Re-submitted
                </Badge>
              )}
            </div>
            {showGradedBy ? (
              <span className="text-xs text-muted-foreground">
                Graded by {roleLabel}
              </span>
            ) : null}
            {isOwnSubmission ? (
              <span className="text-xs text-muted-foreground">
                Your submission
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const isPending = row.original.status === 'pending';
        const isValidating = validatingId === row.original.id;
        const isOwnSubmission =
          !!currentUserId && row.original.member.user_id === currentUserId;

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                setSelectedSubmission(row.original);
                setDetailDialogOpen(true);
              }}
            >
              <Eye className="size-4" />
            </Button>
            {isPending && !isOwnSubmission && (
              <>
                <Input
                  type="number"
                  min={0}
                  placeholder="Pts"
                  value={tableAwardedPoints[row.original.id] ?? ''}
                  onChange={(e) =>
                    setTableAwardedPoints((p) => ({
                      ...p,
                      [row.original.id]:
                        e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                  className="w-20"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() =>
                    handleValidate(
                      row.original.id,
                      'approved',
                      tableAwardedPoints[row.original.id] === ''
                        ? undefined
                        : (tableAwardedPoints[row.original.id] as number),
                    )
                  }
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() =>
                    handleValidate(row.original.id, 'rejected_resubmit')
                  }
                  disabled={isValidating}
                >
                  <X className="size-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  // Table instance
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

  // Access check
  if (!isCaptain && !isViceCaptain) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="px-4 lg:px-6">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              Only team captains can validate team submissions.
            </AlertDescription>
          </Alert>
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
          <div className="size-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-lg">
            <ClipboardCheck className="size-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Team Submissions
            </h1>
            <p className="text-muted-foreground">
              Validate submissions from your team members
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-200"
          >
            <Crown className="size-3 mr-1" />
            Team Captain
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchSubmissions}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6 space-y-6">
        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by member..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                {/* <SelectItem value="rejected">Rejected</SelectItem> */}
                <SelectItem value="rejected_resubmit">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <div className="col-span-2 sm:col-span-1 flex gap-2">
              <Popover
                open={isCalendarOpen}
                onOpenChange={(open) => {
                  setIsCalendarOpen(open);
                  if (open) setTempDate(dateFilter);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full sm:w-[200px] justify-start text-left font-normal flex-1',
                      !dateFilter && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {dateFilter ? (
                      format(dateFilter, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={tempDate}
                    onSelect={setTempDate}
                    initialFocus
                  />
                  <div className="p-3 border-t">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setDateFilter(tempDate);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {dateFilter && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateFilter(undefined);
                  }}
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <ClipboardCheck className="size-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">No submissions</p>
                        <p className="text-sm text-muted-foreground">
                          {statusFilter !== 'all'
                            ? `No ${statusFilter} submissions from your team`
                            : 'No submissions from your team yet'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => {
              const submission = row.original;
              const isPending = submission.status === 'pending';
              const isValidating = validatingId === submission.id;
              const isOwnSubmission =
                !!currentUserId && submission.member.user_id === currentUserId;

              return (
                <div
                  key={submission.id}
                  className="rounded-lg border bg-card p-3 shadow-sm flex flex-col gap-2"
                >
                  {/* Top Row: Identity + Date + Points */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <ProfilePicture
                        username={submission.member.username}
                        size={32}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-none truncate">
                          {submission.member.username}
                        </p>
                        {isOwnSubmission && (
                          <span className="text-[10px] text-muted-foreground bg-secondary px-1 py-0 rounded-sm inline-block mt-0.5">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-bold text-primary">
                        {(submission as any).effective_points != null
                          ? `${(submission as any).effective_points} ${pointsUnit}`
                          : submission.rr_value !== null
                            ? `${submission.rr_value.toFixed(1)} ${pointsUnit}`
                            : '-'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(parseISO(submission.date), 'MMM d')}
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Type + Status */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {submission.type === 'workout' ? (
                        <Dumbbell className="size-3.5" />
                      ) : submission.type === 'rest' &&
                        submission.notes?.includes('[EXEMPTION_REQUEST]') ? (
                        <ShieldAlert className="size-3.5 text-amber-500" />
                      ) : (
                        <Moon className="size-3.5" />
                      )}
                      <span>
                        {submission.type === 'workout'
                          ? formatWorkoutType(submission.workout_type)
                          : submission.notes?.includes('[EXEMPTION_REQUEST]')
                            ? 'Exemption'
                            : 'Rest Day'}
                      </span>
                    </div>
                    <div className="scale-90 origin-right">
                      <StatusBadge status={submission.status} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs bg-background"
                      onClick={() => {
                        setSelectedSubmission(submission);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <Eye className="size-3.5 mr-1.5" /> View
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      className={cn(
                        'h-8 text-xs px-3',
                        submission.status === 'approved'
                          ? 'bg-gray-300 text-gray-600 hover:bg-gray-300 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                          : 'bg-green-600 hover:bg-green-700 text-white',
                      )}
                      onClick={() =>
                        handleValidate(submission.id, 'approved', undefined)
                      }
                      disabled={
                        isValidating || submission.status === 'approved'
                      }
                    >
                      <Check className="size-3.5" />
                    </Button>
                    {isPending && !isOwnSubmission && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs px-3 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() =>
                          handleValidate(submission.id, 'rejected_resubmit')
                        }
                        disabled={isValidating}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
              No submissions found
            </div>
          )}
        </div>

        <SubmissionDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          submission={selectedSubmission as any}
          canOverride={false} // Captains cannot override, so actions hidden in dialog? Wait, typically captains validate via table. If dialog has actions, enable them.
          onApprove={
            isCaptain || isViceCaptain
              ? (id) => handleValidate(id, 'approved', undefined)
              : undefined
          }
          onReject={
            isCaptain || isViceCaptain
              ? (id) => handleValidate(id, 'rejected_resubmit')
              : undefined
          }
          isValidating={!!validatingId}
        />
      </div>
    </div>
  );
}
