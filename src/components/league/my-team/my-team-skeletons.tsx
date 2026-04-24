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
import { Crown, Camera, Users, UserPlus, Search } from "lucide-react";

export function MyTeamPageSkeleton() {
    return (
        <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <Skeleton className="size-14 rounded-xl" />
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-40 mb-1" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled className="gap-2">
                        <UserPlus className="size-4" />
                        Add Players
                    </Button>
                    <Button variant="outline" disabled className="gap-2">
                        <Users className="size-4" />
                        <Skeleton className="h-4 w-24" />
                    </Button>
                    <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 border-amber-200"
                    >
                        <Crown className="size-3 mr-1" />
                        Team Captain
                    </Badge>
                    <Button variant="outline" size="sm" disabled className="gap-2">
                        <Camera className="size-4" />
                        Team Logo
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Compact 2x2 grid */}
            <div className="grid grid-cols-2 gap-2 px-4 lg:px-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-2.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5">
                            <Skeleton className="size-3 rounded" />
                            <Skeleton className="h-2.5 w-12" />
                        </div>
                        <Skeleton className="h-5 w-8 mb-1" />
                        <Skeleton className="h-2.5 w-16" />
                    </Card>
                ))}
            </div>

            {/* AI Momentum Insight Placeholder */}
            <div className="px-4 lg:px-6">
                <Skeleton className="h-3 w-3/4" />
            </div>

            {/* Team Members Table */}
            <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
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

                {/* Members Table */}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-8 text-center">#</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead className="w-16 text-center">Avg RR</TableHead>
                                <TableHead className="w-16 text-center">Rest Days</TableHead>
                                <TableHead className="w-16 text-center">Points</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[1, 2, 3, 4, 5].map((i) => (
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
                                    <TableCell className="text-center">
                                        <Skeleton className="h-4 w-8 mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-4 w-6 mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-4 w-10 mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex items-center gap-6">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                        <Skeleton className="h-4 w-16" />
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