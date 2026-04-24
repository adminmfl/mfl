import { Role } from '@/contexts/role-context';

// Role hierarchy (higher index = higher authority)
const roleHierarchy: Role[] = [
  'player',
  'vice_captain',
  'captain',
  'governor',
  'host',
];

/**
 * Check if a role has at least the specified minimum role level
 */
export function hasRoleLevel(currentRole: Role, minimumRole: Role): boolean {
  const currentLevel = roleHierarchy.indexOf(currentRole);
  const minimumLevel = roleHierarchy.indexOf(minimumRole);
  return currentLevel >= minimumLevel;
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: Role[]): Role | null {
  if (roles.length === 0) return null;

  let highest = roles[0];
  let highestLevel = roleHierarchy.indexOf(highest);

  for (const role of roles) {
    const level = roleHierarchy.indexOf(role);
    if (level > highestLevel) {
      highest = role;
      highestLevel = level;
    }
  }

  return highest;
}

/**
 * Permission definitions based on the role comparison table
 * NOTE: All permissions are LEAGUE-SPECIFIC
 * A user who is 'host' of League A has no special permissions in League B
 * Only system admins have global access
 */
export const permissions = {
  createLeague: (role: Role) => role === 'host',

  configureLeague: (role: Role) => role === 'host',

  deleteLeague: (role: Role) => role === 'host',

  leagueWideOversight: (role: Role) => role === 'host' || role === 'governor',

  validateAnySubmission: (role: Role) => role === 'host' || role === 'governor',

  validateTeamSubmissions: (role: Role) =>
    role === 'host' ||
    role === 'governor' ||
    role === 'captain' ||
    role === 'vice_captain',

  overrideCaptainApprovals: (role: Role) =>
    role === 'host' || role === 'governor',

  accessAllData: (role: Role) => role === 'host' || role === 'governor',

  validateOwnTeamOnly: (role: Role) =>
    role === 'captain' || role === 'vice_captain',

  submitWorkouts: (role: Role) => true, // All roles can submit workouts

  manageTeamMembers: (role: Role) =>
    role === 'host' ||
    role === 'governor' ||
    role === 'captain' ||
    role === 'vice_captain',

  viewLeaderboards: (role: Role) => true, // All roles can view

  editLeagueSettings: (role: Role) => role === 'host',

  assignGovernors: (role: Role) => role === 'host',

  removePlayers: (role: Role) =>
    role === 'host' ||
    role === 'governor' ||
    role === 'captain' ||
    role === 'vice_captain',
} as const;

/**
 * Check if the current role has a specific permission
 */
export function can(
  role: Role | null,
  permission: keyof typeof permissions,
): boolean {
  if (!role) return false;
  return permissions[permission](role);
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: Role): string {
  const names: Record<Role, string> = {
    host: 'Host',
    governor: 'Governor',
    captain: 'Player (C)',
    vice_captain: 'Player (VC)',
    player: 'Player',
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    host: 'Full control - Create and manage league',
    governor: 'League oversight - Validate all submissions',
    captain: 'Team leader - Manage and validate team submissions',
    vice_captain: 'Deputy team leader - Same capabilities as captain',
    player: 'Participant - Submit workouts and compete',
  };
  return descriptions[role];
}
