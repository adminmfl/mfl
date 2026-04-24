'use client';

import * as React from 'react';
import { Shield, Crown, Users, Dumbbell, ChevronDown } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

import { useRole, Role } from '@/contexts/role-context';
import { useLeague } from '@/contexts/league-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Role Configuration
// ============================================================================

interface RoleConfig {
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const roleConfigs: Record<Role, RoleConfig> = {
  host: {
    icon: Crown,
    label: 'Host',
    description: 'Full league control',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  governor: {
    icon: Shield,
    label: 'Governor',
    description: 'League oversight',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  captain: {
    icon: Users,
    label: 'Player (C)',
    description: 'Captain view',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  player: {
    icon: Dumbbell,
    label: 'Player',
    description: 'Team member',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
};

// ============================================================================
// RoleSwitcher Component
// ============================================================================

export function RoleSwitcher() {
  const { data: session } = useSession();
  const { activeRole, availableRoles, setActiveRole, isLoading } = useRole();
  const { activeLeague } = useLeague();
  const router = useRouter();

  // Don't show if no league selected or only one role
  if (!activeLeague || availableRoles.length <= 1) {
    // Show current role as a badge if available
    if (activeRole) {
      const config = roleConfigs[activeRole];
      const Icon = config.icon;
      return (
        <Badge
          variant="outline"
          className={`${config.bgColor} ${config.color} gap-1`}
        >
          <Icon className="size-3" />
          {config.label}
        </Badge>
      );
    }
    return null;
  }

  if (isLoading || !activeRole) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <div className="size-4 rounded-full bg-muted animate-pulse" />
        Loading...
      </Button>
    );
  }

  const currentConfig = roleConfigs[activeRole];
  const CurrentIcon = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${currentConfig.bgColor} border-0`}
        >
          <CurrentIcon className={`size-4 ${currentConfig.color}`} />
          <span className={currentConfig.color}>{currentConfig.label}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Role View
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map((role) => {
          const config = roleConfigs[role];
          const Icon = config.icon;
          const isActive = role === activeRole;

          return (
            <DropdownMenuItem
              key={role}
              onClick={() => {
                setActiveRole(role);
                if (activeLeague?.league_id) {
                  if (role === 'host') {
                    router.push(`/leagues/${activeLeague.league_id}/settings`);
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
              className="gap-3 p-2 cursor-pointer"
            >
              <div
                className={`flex size-8 items-center justify-center rounded-md ${config.bgColor}`}
              >
                <Icon className={`size-4 ${config.color}`} />
              </div>
              <div className="flex-1">
                <div className="font-medium">{config.label}</div>
                <div className="text-xs text-muted-foreground">
                  {config.description}
                </div>
              </div>
              {isActive && <div className="size-2 rounded-full bg-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// RoleBadge Component (for display only)
// ============================================================================

export function RoleBadge({ role }: { role: Role }) {
  const config = roleConfigs[role];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} gap-1`}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

export default RoleSwitcher;
