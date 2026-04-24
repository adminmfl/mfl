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
import { Users, Crown, Search, UserPlus } from "lucide-react";

export function TeamPageSkeleton() {
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
                        <UserPlus className="size-4" />
                        Add Members
                    </Button>
                </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-2 gap-2 px-4 lg:px-6 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
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
                    <div>
                        <Skeleton className="h-6 w-32 mb-1" />
                        <Skeleton className="h-4 w-40" />
                    </div>

                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search members..."
                            disabled
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>

            {/* Team Members Table */}
            <div className="px-4 lg:px-6">
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-8 text-center">#</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="w-16 text-center">Points</TableHead>
                                <TableHead className="w-16 text-center">Avg RR</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-4 w-4 mx-auto" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="relative shrink-0">
                                                <Skeleton className="size-8 rounded-full" />
                                                {i === 1 && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-background">
                                                        <Crown className="size-2 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-4 w-8 mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-4 w-8 mx-auto" />
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