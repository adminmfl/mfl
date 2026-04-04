'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Plus,
  Search,
  Crown,
  Shield,
  Users,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Eye,
} from 'lucide-react';

import { useLeague, LeagueWithRoles } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================================
// Leagues Page
// ============================================================================

export default function LeaguesPage() {
  const { userLeagues, isLoading, setActiveLeague } = useLeague();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');

  // Filter leagues
  const filteredLeagues = React.useMemo(() => {
    const filtered = userLeagues.filter((league) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = (league.name || '').toLowerCase().includes(query);
        const matchesDescription = league.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && league.status !== statusFilter) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && !(league.roles || []).includes(roleFilter as any)) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const aCompleted = a.status === 'completed';
      const bCompleted = b.status === 'completed';
      if (aCompleted === bCompleted) return 0;
      return aCompleted ? 1 : -1;
    });
  }, [userLeagues, searchQuery, statusFilter, roleFilter]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const activeCount = userLeagues.filter((l) => l.status === 'active').length;
    const hostCount = userLeagues.filter((l) => (l.roles || []).includes('host')).length;
    return { total: userLeagues.length, active: activeCount, hosting: hostCount };
  }, [userLeagues]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Leagues</h1>
          <p className="text-muted-foreground">
            Manage and view all your fitness leagues
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/leagues/join">
              <Search className="mr-2 size-4" />
              Join
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leagues/create">
              <Plus className="mr-2 size-4" />
              Create
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Section Cards Style */}
      {!isLoading && userLeagues.length > 0 && (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-3 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 sm:grid-cols-2 sm:gap-4 @xl/main:grid-cols-3">
          <Card className="@container/card py-4 sm:py-6">
            <CardHeader className="gap-1.5 px-4 sm:px-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Trophy className="size-4" />
                Total Leagues
              </CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums sm:text-2xl @[250px]/card:text-3xl">
                {stats.total}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-green-600 text-[10px] sm:text-xs whitespace-nowrap">
                  <TrendingUp className="size-3" />
                  Active
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs px-4 pt-3 sm:px-6 sm:pt-6 sm:text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                All your leagues <Trophy className="size-4" />
              </div>
              <div className="text-muted-foreground line-clamp-2">Across all roles and statuses</div>
            </CardFooter>
          </Card>

          <Card className="@container/card py-4 sm:py-6">
            <CardHeader className="gap-1.5 px-4 sm:px-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Dumbbell className="size-4" />
                Active Leagues
              </CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums sm:text-2xl @[250px]/card:text-3xl">
                {stats.active}
              </CardTitle>
              <CardAction>
                <Badge
                  variant="outline"
                  className={`${stats.active > 0 ? 'text-green-600' : 'text-muted-foreground'} text-[10px] sm:text-xs whitespace-nowrap`}
                >
                  {stats.active > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {stats.active > 0 ? (
                    <>
                      <span className="sm:hidden">In Prog</span>
                      <span className="hidden sm:inline">In Progress</span>
                    </>
                  ) : (
                    'None'
                  )}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs px-4 pt-3 sm:px-6 sm:pt-6 sm:text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Currently competing <Dumbbell className="size-4" />
              </div>
              <div className="text-muted-foreground line-clamp-2">Leagues you're participating in</div>
            </CardFooter>
          </Card>

          <Card className="@container/card py-4 sm:py-6">
            <CardHeader className="gap-1.5 px-4 sm:px-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Crown className="size-4" />
                Hosting
              </CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums sm:text-2xl @[250px]/card:text-3xl">
                {stats.hosting}
              </CardTitle>
              <CardAction>
                <Badge
                  variant="outline"
                  className={`${stats.hosting > 0 ? 'text-amber-600' : 'text-muted-foreground'} text-[10px] sm:text-xs whitespace-nowrap`}
                >
                  <Crown className="size-3" />
                  Host
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs px-4 pt-3 sm:px-6 sm:pt-6 sm:text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Leagues you manage <Crown className="size-4" />
              </div>
              <div className="text-muted-foreground line-clamp-2">Full admin control</div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search leagues..."
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
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="launched">Launched</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="host">Host</SelectItem>
            <SelectItem value="governor">Governor</SelectItem>
            <SelectItem value="captain">Captain</SelectItem>
            <SelectItem value="player">Player</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {!isLoading && userLeagues.length > 0 && (
        <div className="px-4 lg:px-6">
          <p className="text-sm text-muted-foreground">
            {filteredLeagues.length} league(s) total
          </p>
        </div>
      )}

      {/* Leagues Table */}
      <div className="px-4 lg:px-6">
        {isLoading ? (
          <DumbbellLoading label="Loading leagues..." />
        ) : filteredLeagues.length === 0 ? (
          <EmptyState
            hasLeagues={userLeagues.length > 0}
            hasFilters={searchQuery !== '' || statusFilter !== 'all' || roleFilter !== 'all'}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setRoleFilter('all');
            }}
          />
        ) : (
          <LeaguesTable leagues={filteredLeagues} onSelect={setActiveLeague} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Leagues Table Component (Dashboard Style)
// ============================================================================

function LeaguesTable({
  leagues,
  onSelect,
}: {
  leagues: LeagueWithRoles[];
  onSelect: (league: LeagueWithRoles) => void;
}) {
  const roleIcons: Record<string, React.ElementType> = {
    host: Crown,
    governor: Shield,
    captain: Users,
    player: Dumbbell,
  };

  const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    launched: 'outline',
    active: 'default',
    completed: 'secondary',
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>League</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Your Role</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leagues.map((league) => {
            const roleHierarchy = ['host', 'governor', 'captain', 'player'];
            const highestRole =
              roleHierarchy.find((r) => (league.roles || []).includes(r)) || 'player';
            const RoleIcon = roleIcons[highestRole];

            return (
              <TableRow key={league.league_id}>
                <TableCell>
                  <Link
                    href={`/leagues/${league.league_id}`}
                    onClick={() => onSelect(league)}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Avatar className="size-10 rounded-lg shrink-0">
                      {league.logo_url ? (
                        <AvatarImage src={league.logo_url} alt={league.name} />
                      ) : (
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                          {(league.name || 'LG').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{league.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {league.description || 'No description'}
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[league.status] || 'secondary'}>
                    {league.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <RoleIcon className="size-4 text-muted-foreground" />
                    <span className="capitalize">{highestRole}</span>
                    {(league.roles || []).length > 1 && (
                      <Badge variant="outline" className="text-xs">
                        +{(league.roles || []).length - 1}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {league.team_name ? (
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <span className="truncate max-w-[120px]">
                        {league.team_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/leagues/${league.league_id}`}
                          onClick={() => onSelect(league)}
                        >
                          <Eye className="mr-2 size-4" />
                          View League
                        </Link>
                      </DropdownMenuItem>
                      {(league.roles || []).includes('host') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/leagues/${league.league_id}/settings`}>
                              Settings
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasLeagues: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <Empty className="border rounded-lg">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyTitle>No matches found</EmptyTitle>
          <EmptyDescription>
            No leagues match your current filters. Try adjusting your search criteria.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="border rounded-lg">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Trophy />
        </EmptyMedia>
        <EmptyTitle>No leagues yet</EmptyTitle>
        <EmptyDescription>
          You haven't joined any leagues yet. Join an existing league or create
          your own to start your fitness journey with friends!
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/leagues/join">
              <Search className="mr-2 size-4" />
              Join a League
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/leagues/create">
              <Plus className="mr-2 size-4" />
              Create League
            </Link>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  );
}

// ============================================================================
// Skeleton Component
// ============================================================================

function LeaguesTableSkeleton() {
  return <DumbbellLoading label="Loading leagues..." />;
}
