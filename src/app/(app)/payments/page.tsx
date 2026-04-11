'use client';

import * as React from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ArrowUpDown,
  Receipt,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Payment {
  payment_id: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purpose: 'league_creation' | 'subscription' | 'other';
  base_amount: number;
  platform_fee: number;
  gst_amount: number;
  total_amount: number;
  currency: string;
  description: string | null;
  receipt: string | null;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  league_id: string | null;
  league_name: string | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// Table Columns
// ============================================================================

const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4"
      >
        Date
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {date.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            {date.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'purpose',
    header: 'Purpose',
    cell: ({ row }) => {
      const purposeLabels: Record<string, string> = {
        league_creation: 'League Creation',
        subscription: 'Subscription',
        other: 'Other',
      };
      return (
        <div className="flex flex-col gap-1">
          <span>{purposeLabels[row.original.purpose] || row.original.purpose}</span>
          {row.original.league_name && (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              {row.original.league_name}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4"
      >
        Amount
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.original.total_amount;
      return (
        <div className="flex items-center gap-1 font-medium">
          <IndianRupee className="size-3.5" />
          {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const statusConfig: Record<
        string,
        { icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
      > = {
        completed: {
          icon: CheckCircle2,
          variant: 'secondary',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        },
        pending: {
          icon: Clock,
          variant: 'secondary',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        },
        failed: {
          icon: XCircle,
          variant: 'destructive',
          className: '',
        },
        refunded: {
          icon: RefreshCw,
          variant: 'secondary',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        },
      };

      const config = statusConfig[status] || statusConfig.pending;
      const Icon = config.icon;

      return (
        <Badge variant={config.variant} className={`gap-1 capitalize ${config.className}`}>
          <Icon className="size-3" />
          {status}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value === 'all' || row.getValue(id) === value;
    },
  },
  {
    accessorKey: 'razorpay_payment_id',
    header: 'Transaction ID',
    cell: ({ row }) => {
      const paymentId = row.original.razorpay_payment_id;
      if (!paymentId) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {paymentId.slice(0, 12)}...
        </span>
      );
    },
  },
];

// ============================================================================
// Payments Page
// ============================================================================

export default function PaymentsPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'created_at', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Fetch payments
  React.useEffect(() => {
    async function fetchPayments() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/payments');
        if (!response.ok) {
          if (response.status === 401) {
            setPayments([]);
            return;
          }
          throw new Error('Failed to fetch payments');
        }
        const data = await response.json();
        setPayments(data.payments || []);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPayments();
  }, []);

  // Filter by search
  const filteredPayments = React.useMemo(() => {
    let result = payments;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.league_name?.toLowerCase().includes(query) ||
          p.razorpay_order_id?.toLowerCase().includes(query) ||
          p.razorpay_payment_id?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    return result;
  }, [payments, searchQuery, statusFilter]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const completed = payments.filter((p) => p.status === 'completed');
    const totalSpent = completed.reduce((sum, p) => sum + p.total_amount, 0);
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    return {
      total: payments.length,
      totalSpent,
      completedCount: completed.length,
      pendingCount,
    };
  }, [payments]);

  const table = useReactTable({
    data: filteredPayments,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">View your payment history and transactions</p>
        </div>
      </div>

      {/* Stats Cards */}
      {!isLoading && payments.length > 0 && (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-3 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 sm:grid-cols-2 sm:gap-4 @xl/main:grid-cols-3">
          <Card className="@container/card py-4 sm:py-6">
            <CardHeader className="gap-1.5 px-4 sm:px-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <IndianRupee className="size-4" />
                Total Spent
              </CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums sm:text-2xl @[250px]/card:text-3xl">
                {stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-green-600 text-[10px] sm:text-xs whitespace-nowrap">
                  <TrendingUp className="size-3" />
                  INR
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs px-4 pt-3 sm:px-6 sm:pt-6 sm:text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Across all payments <CreditCard className="size-4" />
              </div>
              <div className="text-muted-foreground line-clamp-2">Lifetime total</div>
            </CardFooter>
          </Card>

          <Card className="@container/card py-4 sm:py-6">
            <CardHeader className="gap-1.5 px-4 sm:px-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <CheckCircle2 className="size-4" />
                Completed
              </CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums sm:text-2xl @[250px]/card:text-3xl">
                {stats.completedCount}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-green-600 text-[10px] sm:text-xs whitespace-nowrap px-1.5 py-0.5 gap-1 tracking-tight">
                  <CheckCircle2 className="size-3" />
                  Success
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs px-4 pt-3 sm:px-6 sm:pt-6 sm:text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Successful transactions <Receipt className="size-4" />
              </div>
              <div className="text-muted-foreground line-clamp-2">
                {stats.total > 0
                  ? `${((stats.completedCount / stats.total) * 100).toFixed(0)}% success rate`
                  : 'No transactions'}
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card py-4 sm:py-6">
            <CardHeader className="gap-1.5 px-4 sm:px-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Clock className="size-4" />
                Pending
              </CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums sm:text-2xl @[250px]/card:text-3xl">
                {stats.pendingCount}
              </CardTitle>
              <CardAction>
                <Badge
                  variant="outline"
                  className={`${stats.pendingCount > 0 ? 'text-yellow-600' : 'text-muted-foreground'} text-[10px] sm:text-xs whitespace-nowrap`}
                >
                  {stats.pendingCount > 0 ? (
                    <Clock className="size-3" />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                  {stats.pendingCount > 0 ? (
                    <>
                      <span className="sm:hidden">Wait</span>
                      <span className="hidden sm:inline">Awaiting</span>
                    </>
                  ) : (
                    'Clear'
                  )}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs px-4 pt-3 sm:px-6 sm:pt-6 sm:text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {stats.pendingCount > 0 ? 'Transactions in progress' : 'All payments processed'}
              </div>
              <div className="text-muted-foreground line-clamp-2">
                {stats.pendingCount > 0 ? 'May require action' : 'No pending payments'}
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by league or transaction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="px-4 lg:px-6">
        {isLoading ? (
          <PaymentsPageSkeleton />
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="p-6 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : payments.length === 0 ? (
          <Empty className="border rounded-lg">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCard />
              </EmptyMedia>
              <EmptyTitle>No payments yet</EmptyTitle>
              <EmptyDescription>
                You haven't made any payments yet. Payments will appear here when you create or
                join leagues that require payment.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/leagues/create">Create a League</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : filteredPayments.length === 0 ? (
          <Empty className="border rounded-lg">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>No matches found</EmptyTitle>
              <EmptyDescription>
                No payments match your current filters. Try adjusting your search criteria.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
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
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-4">
              <div className="text-muted-foreground text-sm">
                {filteredPayments.length} payment(s) total
              </div>
              <div className="flex items-center gap-8">
                <div className="hidden items-center gap-2 lg:flex">
                  <Label htmlFor="rows-per-page" className="text-sm font-medium">
                    Rows per page
                  </Label>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                      <SelectValue placeholder={table.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-center text-sm font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="hidden size-8 lg:flex"
                    size="icon"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="size-8"
                    size="icon"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="size-8"
                    size="icon"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden size-8 lg:flex"
                    size="icon"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// ============================================================================
// Skeleton Component
// ============================================================================

function PaymentsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="py-4 sm:py-6">
            <CardHeader className="gap-1.5 px-4 sm:px-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-16" />
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 px-4 pt-3 sm:px-6 sm:pt-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted p-4 border-b">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 items-center gap-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
