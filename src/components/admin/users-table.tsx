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
  UserCircle,
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
import { UserFormDialog } from "./user-form-dialog";
import { useAdminUsers } from "@/hooks/admin";
import type { AdminUser } from "@/types/admin";

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
          : "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

// ============================================================================
// Role Badge Component
// ============================================================================

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-600",
    user: "bg-gray-500/10 text-gray-600",
  };

  return (
    <Badge variant="outline" className={variants[role] || variants.user}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton() {
  return <DumbbellLoading label="Loading users..." />;
}

// ============================================================================
// UsersTable Component
// ============================================================================

export function UsersTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch users with hook
  const { users, isLoading, error, createUser, updateUser, deleteUser, refetch } = useAdminUsers();

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleAddUser = () => {
    setEditingUser(null);
    setFormDialogOpen(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (user: AdminUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      setIsDeleting(true);
      const success = await deleteUser(userToDelete.user_id);
      setIsDeleting(false);

      if (success) {
        toast.success(`User "${userToDelete.username}" deactivated successfully`);
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } else {
        toast.error("Failed to deactivate user");
      }
    }
  };

  const handleFormSubmit = async (userData: {
    username: string;
    email: string;
    password?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    platform_role?: "admin" | "user";
    is_active?: boolean;
  }) => {
    if (editingUser) {
      // Edit existing user
      const result = await updateUser(editingUser.user_id, {
        username: userData.username,
        email: userData.email,
        phone: userData.phone || null,
        date_of_birth: userData.date_of_birth || null,
        gender: userData.gender || null,
        platform_role: userData.platform_role,
        is_active: userData.is_active,
      });

      if (result) {
        toast.success("User updated successfully");
        setFormDialogOpen(false);
      } else {
        toast.error("Failed to update user");
      }
    } else {
      // Add new user
      if (!userData.password) {
        toast.error("Password is required for new users");
        return;
      }

      const result = await createUser({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        date_of_birth: userData.date_of_birth,
        gender: userData.gender,
        platform_role: userData.platform_role,
      });

      if (result) {
        toast.success("User created successfully");
        setFormDialogOpen(false);
      } else {
        toast.error("Failed to create user");
      }
    }
  };

  // ============================================================================
  // Filtered Data
  // ============================================================================

  const filteredData = React.useMemo(() => {
    let result = users;

    // Apply role filter
    if (roleFilter !== "all") {
      result = result.filter((u) => u.platform_role === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      result = result.filter((u) => u.is_active === isActive);
    }

    return result;
  }, [users, roleFilter, statusFilter]);

  // ============================================================================
  // Table Columns
  // ============================================================================

  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: "username",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <UserCircle className="size-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{row.original.username}</div>
            <div className="text-sm text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.phone || "-"}</span>
      ),
    },
    {
      accessorKey: "platform_role",
      header: "Role",
      cell: ({ row }) => <RoleBadge role={row.original.platform_role} />,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <StatusBadge isActive={row.original.is_active} />,
    },
    {
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => (
        <span className="text-muted-foreground capitalize">
          {row.original.gender || "-"}
        </span>
      ),
    },
    {
      accessorKey: "created_date",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.created_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleEditUser(row.original)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteClick(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ============================================================================
  // Table Instance
  // ============================================================================

  // Use empty array if there's an error
  const displayData = error ? [] : filteredData;

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

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage all users on the platform</p>
        </div>
        <Button onClick={handleAddUser}>
          <Plus className="mr-2 size-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                      <UserCircle className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No users found</p>
                      <p className="text-sm text-muted-foreground">
                        {error
                          ? "Unable to load users. Please try again."
                          : "Get started by creating a new user."}
                      </p>
                    </div>
                    {!error && (
                      <Button size="sm" onClick={handleAddUser}>
                        <Plus className="mr-2 size-4" />
                        Add User
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} user(s) total
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

      {/* Form Dialog */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        user={editingUser}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{userToDelete?.username}"? The user will no longer be able to access the platform.
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
                  Deactivating...
                </>
              ) : (
                "Deactivate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UsersTable;
