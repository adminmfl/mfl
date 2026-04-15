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
  Shield,
  Users,
  Lock,
  Loader2,
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
import { toast } from '@/lib/toast';

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
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { RoleFormDialog } from "./role-form-dialog";
import { useAdminRoles } from "@/hooks/admin";
import type { AdminRole } from "@/types/admin";

// System roles that cannot be deleted
const SYSTEM_ROLES = ["host", "governor", "captain", "player"];

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton() {
  return <DumbbellLoading label="Loading roles..." />;
}

// ============================================================================
// RolesTable Component
// ============================================================================

export function RolesTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<AdminRole | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [roleToDelete, setRoleToDelete] = React.useState<AdminRole | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch roles with hook
  const { roles, isLoading, error, createRole, updateRole, deleteRole, isSystemRole, refetch } =
    useAdminRoles();

  const handleAddRole = () => {
    setEditingRole(null);
    setFormDialogOpen(true);
  };

  const handleEditRole = (role: AdminRole) => {
    if (isSystemRole(role.role_name)) {
      toast.error("System roles cannot be edited");
      return;
    }
    setEditingRole(role);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (role: AdminRole) => {
    if (isSystemRole(role.role_name)) {
      toast.error("System roles cannot be deleted");
      return;
    }
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (roleToDelete) {
      setIsDeleting(true);
      const result = await deleteRole(roleToDelete.role_id);
      setIsDeleting(false);

      if (result.success) {
        toast.success(`Role "${roleToDelete.role_name}" deleted successfully`);
        setDeleteDialogOpen(false);
        setRoleToDelete(null);
      } else {
        toast.error(result.error || "Failed to delete role");
      }
    }
  };

  const handleFormSubmit = async (roleData: { role_name: string }) => {
    if (editingRole) {
      // Edit existing role
      const result = await updateRole(editingRole.role_id, {
        role_name: roleData.role_name,
      });

      if (result) {
        toast.success("Role updated successfully");
        setFormDialogOpen(false);
      } else {
        toast.error("Failed to update role");
      }
    } else {
      // Add new role
      const result = await createRole({
        role_name: roleData.role_name,
      });

      if (result) {
        toast.success("Role created successfully");
        setFormDialogOpen(false);
      } else {
        toast.error("Failed to create role");
      }
    }
  };

  const columns: ColumnDef<AdminRole>[] = [
    {
      accessorKey: "role_name",
      header: "Role",
      cell: ({ row }) => {
        const isSystem = isSystemRole(row.original.role_name);
        return (
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium capitalize">{row.original.role_name}</span>
                {isSystem && (
                  <Lock className="size-3 text-muted-foreground" title="System role" />
                )}
              </div>
              {isSystem && (
                <span className="text-xs text-muted-foreground">System role</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "user_count",
      header: "Users Assigned",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="size-4" />
          <span>{row.original.user_count || 0}</span>
        </div>
      ),
    },
    {
      accessorKey: "created_date",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isSystem = isSystemRole(row.original.role_name);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => handleEditRole(row.original)}
                disabled={isSystem}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              {!isSystem && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(row.original)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Use empty array if there's an error
  const displayData = error ? [] : roles;

  const table = useReactTable({
    data: displayData,
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

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">Manage league roles</p>
        </div>
        <Button onClick={handleAddRole}>
          <Plus className="mr-2 size-4" />
          Create Role
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
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
                <TableCell colSpan={columns.length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Shield className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No roles found</p>
                      <p className="text-sm text-muted-foreground">
                        {error
                          ? "Unable to load roles. Please try again."
                          : "Get started by creating a new role."}
                      </p>
                    </div>
                    {!error && (
                      <Button size="sm" onClick={handleAddRole}>
                        <Plus className="mr-2 size-4" />
                        Create Role
                      </Button>
                    )}
                    {error && (
                      <Button size="sm" variant="outline" onClick={refetch}>
                        Try Again
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} role(s) total
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
            Page {pagination.pageIndex + 1} of {table.getPageCount() || 1}
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

      <RoleFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        role={editingRole}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{roleToDelete?.role_name}"? This action cannot be undone. Roles with assigned users cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RolesTable;
