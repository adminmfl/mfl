'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LogOut,
  MoreVertical,
} from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { getSidebarNavItems, NavSection } from '@/lib/navigation/sidebar-config';
import { MessageBadge } from '@/components/messaging/message-badge';
import { LeagueSwitcher } from './league-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

// ============================================================================
// Types
// ============================================================================

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

// ============================================================================
// AppSidebar Component
// ============================================================================

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const { activeLeague } = useLeague();
  const { activeRole, isAlsoPlayer } = useRole();
  const { state, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  // Get navigation items based on current context
  const navSections = getSidebarNavItems(
    activeRole,
    activeLeague?.league_id || null,
    { isAlsoPlayer }
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header - Logo + League Switcher */}
      <SidebarHeader>
        {(() => {
          const branding = activeLeague?.branding;
          const displayName = branding?.display_name || 'My Fitness League';
          const logoSrc = branding?.logo_url || activeLeague?.logo_url || '/img/mfl-logo.jpg';
          return (
            <div className={`flex items-center py-2 ${isCollapsed ? 'justify-center' : 'gap-3 md:justify-start'}`}>
              <Link href="/dashboard" className={`flex items-center font-semibold min-w-0 overflow-hidden ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <img
                  src={logoSrc}
                  alt={displayName}
                  className="size-10 rounded-md object-cover shadow-sm shrink-0"
                />
                {!isCollapsed && (
                  <div className="flex flex-col leading-tight min-w-0 overflow-hidden">
                    <span className="text-lg truncate">{displayName}</span>
                    {activeLeague && (
                      <span className="text-xs text-muted-foreground truncate block max-w-full" title={activeRole ? `Viewing ${activeLeague.name} as ${activeRole}` : activeLeague.name}>
                        {activeRole ? `Viewing ${activeLeague.name} as ${activeRole}` : activeLeague.name}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </div>
          );
        })()}
        {!isCollapsed && null}
      </SidebarHeader>

      {/* Content - Dynamic Navigation */}
      <SidebarContent>
        {navSections.map((section, idx) => (
          <React.Fragment key={`${section.title || 'primary'}-${idx}`}>
            {section.title === 'MyFitnessLeague' && (
              <div className="mx-2 my-1 border-t-2 border-dashed border-border" />
            )}
            <NavSectionGroup
              section={section}
              pathname={pathname}
              leagueId={activeLeague?.league_id || null}
            />
          </React.Fragment>
        ))}
      </SidebarContent>

      {/* Powered by MFL — shown when league has custom branding */}
      {activeLeague?.branding?.display_name && activeLeague.branding.powered_by_visible !== false && !isCollapsed && (
        <div className="px-3 py-1.5 text-center">
          <span className="text-[10px] text-muted-foreground/60">Powered by My Fitness League</span>
        </div>
      )}

      {/* Footer - User Menu */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || 'User'}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || 'user@example.com'}
                    </span>
                  </div>
                  <MoreVertical className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="rounded-lg">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      localStorage.removeItem('activeLeagueId');
                      Object.keys(localStorage).filter(k => k.startsWith('role_')).forEach(k => localStorage.removeItem(k));
                      const cacheKeys = await caches.keys();
                      await Promise.all(cacheKeys.map(k => caches.delete(k)));
                    } catch { /* ignore */ }
                    signOut({ callbackUrl: '/' });
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  );
}

// ============================================================================
// NavSectionGroup Component
// ============================================================================

function NavSectionGroup({
  section,
  pathname,
  leagueId,
}: {
  section: NavSection;
  pathname: string | null;
  leagueId: string | null;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      {section.title ? (
        <SidebarGroupLabel className={section.title === 'MyFitnessLeague' ? 'text-base font-semibold mb-2' : ''}>
          {section.title}
        </SidebarGroupLabel>
      ) : null}
      <SidebarMenu>
        {section.items.map((item) => {
          const isLeagueRoot = leagueId ? item.url === `/leagues/${leagueId}` : false;
          // Use exact match for team pages to avoid conflicts between /my-team and /my-team-view
          const isTeamPage = item.url.includes('/my-team');
          const isActive = isTeamPage
            ? pathname === item.url
            : pathname === item.url ||
            (!isLeagueRoot && item.url !== '/dashboard' && pathname?.startsWith(item.url));

          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
              >
                <Link href={item.url} onClick={() => setOpenMobile(false)}>
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                  {item.title === 'Team Chat' && leagueId && (
                    <MessageBadge leagueId={leagueId} className="ml-auto" />
                  )}
                  {item.badge && (
                    <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default AppSidebar;
