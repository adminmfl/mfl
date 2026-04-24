'use client';

import * as React from 'react';
import { ChevronsUpDown, Plus, Search, Check } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import {
  useLeague,
  LeagueWithRoles,
  LeagueRole,
} from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { getRoleDisplay } from '@/lib/navigation/sidebar-config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================================
// LeagueSwitcher Component
// ============================================================================

interface LeagueSwitcherProps {
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function LeagueSwitcher({ trigger, onOpenChange }: LeagueSwitcherProps) {
  const { activeLeague, userLeagues, setActiveLeague, isLoading } = useLeague();
  const { activeRole, availableRoles, setActiveRole } = useRole();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  const highestRole = React.useCallback(
    (roles: LeagueRole[]): LeagueRole | null => {
      const order: LeagueRole[] = ['host', 'governor', 'captain', 'player'];
      return order.find((role) => roles.includes(role)) || null;
    },
    [],
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const defaultTrigger = (
    <SidebarMenuButton
      size="lg"
      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
    >
      <Avatar className="size-8 rounded-lg">
        {activeLeague?.logo_url ? (
          <AvatarImage src={activeLeague.logo_url} alt={activeLeague.name} />
        ) : (
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
            {activeLeague?.name?.slice(0, 2).toUpperCase() || 'LG'}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">
          {activeLeague?.name || 'Select League'}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {activeRole
            ? `Viewing as ${getRoleDisplay(activeRole).label}`
            : 'No league selected'}
        </span>
      </div>
      <ChevronsUpDown className="ml-auto size-4" />
    </SidebarMenuButton>
  );

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
  const handleLeagueSelect = (league: LeagueWithRoles) => {
    setActiveLeague(league);

    const roles = league.roles || [];
    const preferredRole = roles.includes('captain')
      ? 'captain'
      : roles.includes('vice_captain')
        ? 'vice_captain'
        : roles.includes('player')
          ? 'player'
          : null;

    const nextRole = preferredRole || (highestRole(roles) as LeagueRole | null);

    if (nextRole) {
      setActiveRole(nextRole);
      if (nextRole === 'host') {
        router.push(`/leagues/${league.league_id}/settings`);
      } else if (nextRole === 'governor') {
        router.push(`/leagues/${league.league_id}/submissions`);
      } else {
        router.push(`/leagues/${league.league_id}`);
      }
    } else {
      const nextPath = pathname?.startsWith('/leagues/')
        ? pathname.replace(/^\/leagues\/[^/]+/, `/leagues/${league.league_id}`)
        : `/leagues/${league.league_id}`;
      router.push(nextPath);
    }

    router.refresh();
  };

  // When custom trigger is provided, use a simpler wrapper (for header usage)
  if (trigger) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-72 rounded-lg"
          align="end"
          side="bottom"
          sideOffset={4}
        >
          {/* Current Role Section */}
          {activeLeague && availableRoles.length > 1 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
                Switch Role
              </DropdownMenuLabel>
              {availableRoles.map((role) => {
                const display = getRoleDisplay(role);
                const Icon = display.icon;
                const isActive = role === activeRole;

                return (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => {
                      setActiveRole(role);
                      if (activeLeague?.league_id) {
                        if (role === 'host') {
                          router.push(
                            `/leagues/${activeLeague.league_id}/settings`,
                          );
                        } else if (role === 'governor') {
                          router.push(
                            `/leagues/${activeLeague.league_id}/submissions`,
                          );
                        } else if (
                          role === 'player' ||
                          role === 'captain' ||
                          role === 'vice_captain'
                        ) {
                          router.push(`/leagues/${activeLeague.league_id}`);
                        }
                      }
                    }}
                    className="gap-2 px-2 py-1.5 cursor-pointer text-sm"
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded-sm ${display.color}`}
                    >
                      <Icon className="size-3" />
                    </div>
                    <span className="flex-1">{display.label}</span>
                    {isActive && <Check className="size-3 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator className="my-1" />
            </>
          )}

          {/* Leagues Section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
            My Leagues
          </DropdownMenuLabel>

          {userLeagues.length === 0 ? (
            <DropdownMenuItem
              disabled
              className="text-muted-foreground text-sm py-1.5"
            >
              No leagues yet
            </DropdownMenuItem>
          ) : (
            userLeagues.map((league) => (
              <DropdownMenuItem
                key={league.league_id}
                onClick={() => handleLeagueSelect(league)}
                className="gap-2 px-2 py-1.5 cursor-pointer"
              >
                <Avatar className="size-6 rounded-md">
                  {league.logo_url ? (
                    <AvatarImage src={league.logo_url} alt={league.name} />
                  ) : (
                    <AvatarFallback className="rounded-md text-[10px] bg-primary/10 text-primary font-semibold">
                      {league.name?.slice(0, 2).toUpperCase() || 'LG'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-medium text-sm">
                      {league.name}
                    </span>
                    {league.status === 'completed' && (
                      <Badge
                        variant="secondary"
                        className="text-[12px] px-1.5 py-0.5 h-4"
                      >
                        Completed
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                    {(league.roles || [])
                      .filter(
                        (role) =>
                          !(
                            role === 'player' &&
                            ((league.roles || []).includes('captain') ||
                              (league.roles || []).includes('vice_captain'))
                          ),
                      )
                      .map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className="text-[8px] px-0.5 py-0 h-3"
                        >
                          {getRoleDisplay(role).label}
                        </Badge>
                      ))}
                  </div>
                </div>
                {activeLeague?.league_id === league.league_id && (
                  <Check className="size-3 text-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default sidebar usage
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{defaultTrigger}</DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            {/* Current Role Section */}
            {activeLeague && availableRoles.length > 1 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Switch Role
                </DropdownMenuLabel>
                {availableRoles.map((role) => {
                  const display = getRoleDisplay(role);
                  const Icon = display.icon;
                  const isActive = role === activeRole;

                  return (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => {
                        setActiveRole(role);
                        if (activeLeague?.league_id) {
                          if (role === 'host') {
                            router.push(
                              `/leagues/${activeLeague.league_id}/settings`,
                            );
                          } else if (role === 'governor') {
                            router.push(
                              `/leagues/${activeLeague.league_id}/submissions`,
                            );
                          } else if (
                            role === 'player' ||
                            role === 'captain' ||
                            role === 'vice_captain'
                          ) {
                            router.push(`/leagues/${activeLeague.league_id}`);
                          }
                        }
                      }}
                      className="gap-2 p-2 cursor-pointer"
                    >
                      <div
                        className={`flex size-6 items-center justify-center rounded-sm ${display.color}`}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <span className="flex-1">{display.label}</span>
                      {isActive && <Check className="size-4 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Leagues Section */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              My Leagues
            </DropdownMenuLabel>

            {userLeagues.length === 0 ? (
              <DropdownMenuItem disabled className="text-muted-foreground">
                No leagues yet
              </DropdownMenuItem>
            ) : (
              userLeagues.map((league) => (
                <DropdownMenuItem
                  key={league.league_id}
                  onClick={() => handleLeagueSelect(league)}
                  className="gap-2 p-2 cursor-pointer"
                >
                  <Avatar className="size-8 rounded-md">
                    {league.logo_url ? (
                      <AvatarImage src={league.logo_url} alt={league.name} />
                    ) : (
                      <AvatarFallback className="rounded-md text-xs bg-primary/10 text-primary font-semibold">
                        {league.name?.slice(0, 2).toUpperCase() || 'LG'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-medium">
                        {league.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {(league.roles || [])
                        .filter(
                          (role) =>
                            !(
                              role === 'player' &&
                              ((league.roles || []).includes('captain') ||
                                (league.roles || []).includes('vice_captain'))
                            ),
                        )
                        .slice(0, 2)
                        .map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {getRoleDisplay(role).label}
                          </Badge>
                        ))}
                      {league.status === 'completed' && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-2 py-0.5 h-5"
                        >
                          Completed
                        </Badge>
                      )}
                      {(league.roles || []).length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{(league.roles || []).length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  {activeLeague?.league_id === league.league_id && (
                    <Check className="size-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="gap-2 p-2 cursor-pointer">
              <Link href="/leagues/join">
                <Search className="size-4" />
                <span>Join a League</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="gap-2 p-2 cursor-pointer">
              <Link href="/leagues/create">
                <Plus className="size-4" />
                <span>Create New League</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default LeagueSwitcher;
