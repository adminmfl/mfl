import * as React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    CalendarIcon,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Filter,
    Download
} from "lucide-react";

export function SubmissionsPageSkeleton() {
    return (
        <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled className="gap-2">
                        <Download className="size-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-2 px-4 lg:px-6 sm:grid-cols-4">
                {[
                    { icon: CalendarIcon, color: 'text-primary bg-primary/10' },
                    { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
                    { icon: XCircle, color: 'text-red-600 bg-red-100' },
                    { icon: Clock, color: 'text-yellow-600 bg-yellow-100' }
                ].map((card, i) => (
                    <Card key={i} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-md ${card.color}`}>
                                <card.icon className="size-4" />
                            </div>
                            <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="h-6 w-8 mb-1" />
                        <Skeleton className="h-3 w-16" />
                    </Card>
                ))}
            </div>

            {/* Filters and Search */}
            <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled className="gap-2">
                            <Filter className="size-4" />
                            Filters
                        </Button>
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>

                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search submissions..."
                            disabled
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>

            {/* Submissions Table */}
            <div className="px-4 lg:px-6">
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Activity</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Points</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="size-8 rounded-full" />
                                            <div>
                                                <Skeleton className="h-4 w-24 mb-1" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <Skeleton className="h-4 w-20 mb-1" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-16" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="size-8 rounded" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-6">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="size-8" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TeamSubmissionsPageSkeleton() {
    return (
        <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Skeleton className="h-8 w-56 mb-2" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled className="gap-2">
                        <Download className="size-4" />
                        Export Team Data
                    </Button>
                </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-2 gap-2 px-4 lg:px-6 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="size-5 rounded" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-6 w-10 mb-1" />
                        <Skeleton className="h-3 w-20" />
                    </Card>
                ))}
            </div>

            {/* Search and Filters */}
            <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>

                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search team submissions..."
                            disabled
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>

            {/* Team Submissions Table */}
            <div className="px-4 lg:px-6">
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Activity</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Points</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="size-8 rounded-full" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <Skeleton className="h-4 w-24 mb-1" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-16" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="size-8 rounded" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <Skeleton className="h-4 w-28" />
                    <div className="flex items-center gap-6">
                        <Skeleton className="h-4 w-20" />
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="size-8" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}