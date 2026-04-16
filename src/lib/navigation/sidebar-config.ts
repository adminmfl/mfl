import {
  LayoutDashboard,
  Trophy,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  Target,
  Flag,
  Shield,
  Crown,
  Dumbbell,
  Plus,
  Search,
  Activity,
  UserCheck,
  HeartHandshake,
  FileText,
  LucideIcon,
  BookOpen,
  HelpCircle,
  CreditCard,
  MessageCircle,
  Brain,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type LeagueRole = 'host' | 'governor' | 'captain' | 'player';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  isActive?: boolean;
  /** If true, item is view-only (visual indicator) */
  viewOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  /** Role required to see this section */
  roles?: LeagueRole[];
}

export interface SidebarConfig {
  sections: NavSection[];
}

// ============================================================================
// Base Navigation (No League Selected)
// ============================================================================

const baseNavItems: NavItem[] = [
  {
    title: 'MFL Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Join a League',
    url: '/leagues/join',
    icon: Search,
  },
  {
    title: 'Profile Settings',
    url: '/profile',
    icon: Settings,
  },
  {
    title: 'Help & Support',
    url: '/help',
    icon: HelpCircle,
  },
  {
    title: 'Payments',
    url: '/payments',
    icon: CreditCard,
  },
];

// ============================================================================
// Role-Based Navigation Configuration
// ============================================================================

/**
 * Get sidebar configuration based on user's role in the league
 *
 * Hierarchy:
 * - Main: Dashboard (always visible)
 * - League: Role-appropriate league features
 * - Oversight: Host/Governor submission validation
 * - My Team: Captain's team management
 * - Player: Submit activity, view team (if user is also a player)
 */
export function getSidebarNavItems(
  role: LeagueRole | null,
  leagueId: string | null,
  options?: {
    /** Whether host/governor is also participating as a player */
    isAlsoPlayer?: boolean;
  }
): NavSection[] {
  // No league selected - show base navigation
  if (!leagueId || !role) {
    return [
      {
        title: 'MyFitnessLeague',
        items: baseNavItems,
      },
    ];
  }

  const sections: NavSection[] = [];

  // Helper to build league URLs
  const leagueUrl = (path: string) => `/leagues/${leagueId}${path}`;

  // ========================================
  // PLAYER Section (Player view + Captain view)
  // ========================================
  if (role === 'player' || role === 'captain') {
    const primaryItems: NavItem[] = [
      {
        title: 'My Activities',
        url: leagueUrl(''),
        icon: Trophy,
        viewOnly: true,
      },
      {
        title: 'My Challenges',
        url: leagueUrl('/challenges'),
        icon: Flag,
        viewOnly: true,
      },
      {
        title: 'My Team',
        url: leagueUrl('/my-team-view'),
        icon: Users,
      },
      {
        title: 'Team Chat',
        url: leagueUrl('/messages'),
        icon: MessageCircle,
      },
      {
        title: 'Leaderboard',
        url: leagueUrl('/leaderboard'),
        icon: BarChart3,
      },
      {
        title: 'Rules',
        url: leagueUrl('/rules'),
        icon: BookOpen,
      },
    ];

    sections.push({
      title: '',
      items: primaryItems,
    });
  }

  // ========================================
  // Host/Governor extras (keep scoped to admin section below)
  // ========================================
  const leagueAdminItems: NavItem[] = [];

  if (role === 'host') {
    leagueAdminItems.push({
      title: 'League Settings',
      url: leagueUrl('/settings'),
      icon: Settings,
    });
  }

  if (role === 'host' || role === 'governor') {
    leagueAdminItems.push({
      title: 'Manage Rules',
      url: leagueUrl('/rules/manage'),
      icon: FileText,
    });
  }

  // ========================================
  // OVERSIGHT Section (Host & Governor)
  // For validating submissions across all teams
  // ========================================
  if (role === 'host' || role === 'governor') {
    const oversightItems: NavItem[] = [
      {
        title: 'Player Activities',
        url: leagueUrl('/submissions'),
        icon: ClipboardCheck,
      },
      {
        title: 'Configure Challenges',
        url: leagueUrl('/configure-challenges'),
        icon: Flag,
      },
      {
        title: 'Manual Workout Entry',
        url: leagueUrl('/manual-entry'),
        icon: UserCheck,
      },
      {
        title: 'Approve Donations',
        url: leagueUrl('/rest-day-donations'),
        icon: HeartHandshake,
      },
      {
        title: 'Team Chat',
        url: leagueUrl('/messages'),
        icon: MessageCircle,
      },
      {
        title: 'AI Manager',
        url: leagueUrl('/ai-manager'),
        icon: Brain,
      },
    ];


    // Include league admin items here to keep all host/governor tools together
    sections.push({
      title: role === 'host' ? 'Host Actions' : 'Governor Actions',
      items: [...leagueAdminItems, ...oversightItems],
    });
  }

  // ========================================
  // MY TEAM Section (Captain only)
  // Captain can only manage their own team
  // ========================================
  if (role === 'captain') {
    sections.push({
      title: 'Captain Actions',
      items: [
        {
          title: 'Team Overview',
          url: leagueUrl('/my-team'),
          icon: Users,
        },
        {
          title: 'Team Activities',
          url: leagueUrl('/my-team/submissions'),
          icon: ClipboardCheck,
        },
        {
          title: 'Approve Donations',
          url: leagueUrl('/rest-day-donations'),
          icon: HeartHandshake,
        },
        {
          title: 'Captain Guidelines',
          url: '#captain-guidelines',
          icon: BookOpen,
        },
      ],
    });
  }

  // ========================================
  // MAIN Section (All Roles) - At the end
  // ========================================
  sections.push({
    title: 'MyFitnessLeague',
    items: baseNavItems,
  });

  return sections;
}

// ============================================================================
// Mobile Bottom Tab Configuration
// ============================================================================

export function getMobileTabItems(
  role: LeagueRole | null,
  leagueId: string | null,
  options?: {
    isAlsoPlayer?: boolean;
  }
): NavItem[] {
  // No league - basic tabs
  if (!leagueId || !role) {
    return [
      {
        title: 'MFL Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Leagues',
        url: '/leagues',
        icon: Trophy,
      },
      {
        title: 'Join',
        url: '/leagues/join',
        icon: Search,
      },

    ];
  }

  const leagueUrl = (path: string) => `/leagues/${leagueId}${path}`;

  const tabs: NavItem[] = [];

  if (role === 'player' || role === 'captain') {
    tabs.push(
      {
        title: 'My Activity',
        url: leagueUrl(''),
        icon: Trophy,
      },
      {
        title: 'My Team',
        url: leagueUrl('/my-team-view'),
        icon: Users,
      },
      {
        title: 'My Challenges',
        url: leagueUrl('/challenges'),
        icon: Flag,
      },
      {
        title: 'Leaderboard',
        url: leagueUrl('/leaderboard'),
        icon: BarChart3,
      },
      {
        title: 'Team Chat',
        url: leagueUrl('/messages'),
        icon: MessageCircle,
      }
    );
    if (role === 'captain') {
      tabs.push(
        {
          title: 'Team Logs',
          url: leagueUrl('/my-team/submissions'),
          icon: ClipboardCheck,
        },
        {
          title: 'Donations',
          url: leagueUrl('/rest-day-donations'),
          icon: HeartHandshake,
        }
      );
    }
  } else if (role === 'host' || role === 'governor') {
    if (role === 'host') {
      tabs.push({
        title: 'Settings',
        url: leagueUrl('/settings'),
        icon: Settings,
      });
    }
    tabs.push(
      {
        title: 'Rules',
        url: leagueUrl('/rules/manage'),
        icon: FileText,
      },
      {
        title: 'Validate',
        url: leagueUrl('/submissions'),
        icon: ClipboardCheck,
      },
      {
        title: 'Challenges',
        url: leagueUrl('/configure-challenges'),
        icon: Flag,
      },
      {
        title: 'Manual Entry',
        url: leagueUrl('/manual-entry'),
        icon: UserCheck,
      },
      {
        title: 'Donations',
        url: leagueUrl('/rest-day-donations'),
        icon: HeartHandshake,
      }
    );
  }

  // Limit to 5 tabs max for mobile
  return tabs.slice(0, 5);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has elevated permissions (can manage league)
 */
export function canManageLeague(role: LeagueRole | null): boolean {
  return role === 'host' || role === 'governor';
}

/**
 * Check if user can validate submissions
 */
export function canValidateSubmissions(role: LeagueRole | null): boolean {
  return role === 'host' || role === 'governor' || role === 'captain';
}

/**
 * Check if user can access all teams (not just their own)
 */
export function canAccessAllTeams(role: LeagueRole | null): boolean {
  return role === 'host' || role === 'governor';
}

/**
 * Check if user can modify league settings
 */
export function canModifyLeagueSettings(role: LeagueRole | null): boolean {
  return role === 'host';
}

/**
 * Get role display information
 */
export function getRoleDisplay(role: LeagueRole): {
  label: string;
  icon: LucideIcon;
  color: string;
} {
  const roleConfig: Record<LeagueRole, { label: string; icon: LucideIcon; color: string }> = {
    host: {
      label: 'Host',
      icon: Crown,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
    governor: {
      label: 'Governor',
      icon: Shield,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    captain: {
      label: 'Player (C)',
      icon: Target,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    },
    player: {
      label: 'Player',
      icon: Dumbbell,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
  };

  return roleConfig[role];
}

export default getSidebarNavItems;
