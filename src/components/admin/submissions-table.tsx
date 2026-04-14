"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";
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
} from "@tanstack/react-table";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SubmissionFormDialog, type Submission } from "./submission-form-dialog";

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    pending: {
      className: "bg-yellow-500/10 text-yellow-600",
      icon: <Clock className="mr-1 size-3" />,
    },
    approved: {
      className: "bg-green-500/10 text-green-600",
      icon: <CheckCircle className="mr-1 size-3" />,
    },
    rejected: {
      className: "bg-red-500/10 text-red-600",
      icon: <XCircle className="mr-1 size-3" />,
    },
    rejected_resubmit: {
      className: "bg-orange-500/10 text-orange-600",
      icon: <FileText className="mr-1 size-3" />,
    },
    rejected_permanent: {
      className: "bg-red-500/10 text-red-600",
      icon: <XCircle className="mr-1 size-3" />,
    },
  };

  const { className, icon } = config[status] || config.pending;

  return (
    <Badge variant="outline" className={`flex w-fit items-center ${className}`}>
      {icon}
      {status === "rejected_resubmit"
        ? "Rejected (Retry)"
        : status === "rejected_permanent"
          ? "Rejected (Final)"
          : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function SubmissionsTable() {
  const [data, setData] = React.useState<Submission[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingSubmission, setEditingSubmission] = React.useState<Submission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [submissionToDelete, setSubmissionToDelete] = React.useState<Submission | null>(null);

  const handleApprove = (submission: Submission) => {
    setData(data.map(s => s.id === submission.id ? { ...s, status: 'approved', points: 10, reviewedAt: new Date().toISOString(), reviewedBy: 'Admin' } : s));
    toast.success(`Submission "${submission.title}" approved`);
  };

  const handleReject = (submission: Submission, type: "rejected_resubmit" | "rejected_permanent") => {
    setData(data.map(s => s.id === submission.id ? { ...s, status: type, points: 0, reviewedAt: new Date().toISOString(), reviewedBy: 'Admin' } : s));
    toast.success(`Submission "${submission.title}" rejected`);
  };

  const handleEditSubmission = (submission: Submission) => {
    setEditingSubmission(submission);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (submission: Submission) => {
    setSubmissionToDelete(submission);
    setDeleteDialogOpen(true);
  };

  const handleAddSubmission = () => {
    setEditingSubmission(null);
    setFormDialogOpen(true);
  };

  const handleFormSubmit = (submission: Partial<Submission>) => {
    if (editingSubmission) {
      setData(data.map(s => s.id === editingSubmission.id ? { ...s, ...submission } as Submission : s));
      toast.success("Submission updated");
    } else {
      const newSubmission = { ...submission, id: Math.random().toString(36).substr(2, 9), status: 'pending', createdAt: new Date().toISOString() } as Submission;
      setData([newSubmission, ...data]);
      toast.success("Submission added");
    }
    setFormDialogOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (submissionToDelete) {
      setData(data.filter(s => s.id !== submissionToDelete.id));
      toast.success("Submission deleted");
    }
    setDeleteDialogOpen(false);
  };

  const columns: ColumnDef<Submission>[] = [
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.status === "pending" && (
              <>
                <DropdownMenuItem onClick={() => handleApprove(row.original)}>
                  <CheckCircle className="mr-2 size-4 text-green-600" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject(row.original, "rejected_resubmit")}>
                  <FileText className="mr-2 size-4 text-orange-600" />
                  Reject (Retry)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject(row.original, "rejected_permanent")}>
                  <XCircle className="mr-2 size-4 text-red-600" />
                  Reject (Final)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => handleEditSubmission(row.original)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteClick(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submission Management</h1>
          <p className="text-muted-foreground">Review and manage activity submissions</p>
        </div>
        <Button onClick={handleAddSubmission}>
          <Plus className="mr-2 size-4" />
          Add Submission
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search submissions..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={(table.getColumn("status")?.getFilterValue() as string) || "all"}
          onValueChange={(value) =>
            table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
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
                <TableRow key={row.id}>
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
                  No submissions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} submission(s) total
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="rows-per-page" className="text-sm">
              Rows per page
            </Label>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) => setPagination({ ...pagination, pageSize: Number(value) })}
            >
              <SelectTrigger className="w-16" id="rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm">
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <SubmissionFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        submission={editingSubmission}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{submissionToDelete?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SubmissionsTable;
