'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLeague, LeagueRole } from './league-context';

// ============================================================================
// Types
// ============================================================================

// Re-export for convenience
export type Role = LeagueRole;

interface RoleContextType {
  // Role state (synced from LeagueContext)
  activeRole: Role | null;
  availableRoles: Role[];
  setActiveRole: (role: Role) => void;
  isLoading: boolean;

  // Whether the user is also a player in current role context
  isAlsoPlayer: boolean;

  // Permission helpers based on current role view
  isHost: boolean;
  isGovernor: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isPlayer: boolean;

  // Action permissions
  canManageLeague: boolean; // Edit league settings
  canManageTeams: boolean; // Create/edit teams, assign members
  canValidateSubmissions: boolean; // Validate submissions
  canValidateOwnTeamOnly: boolean; // Captain-level validation
  canSubmitWorkouts: boolean; // Submit workouts as a player
}

// ============================================================================
// Context
// ============================================================================

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface RoleProviderProps {
  children: ReactNode;
}

/**
 * RoleProvider - Provides role-based permissions derived from LeagueContext.
 *
 * This provider syncs with LeagueContext and provides:
 * - Role switching UI support
 * - Permission helpers for conditional rendering
 * - Action permission checks
 */
export function RoleProvider({ children }: RoleProviderProps) {
  const {
    currentRole,
    setCurrentRole,
    availableRoles,
    isLoading: leagueLoading,
    isAlsoPlayer,
  } = useLeague();

  // Permission helpers based on CURRENT ROLE VIEW
  // These reflect what the user can do in their current role context
  const permissions = useMemo(() => {
    const role = currentRole;

    // Role checks (for current view)
    const isHost = role === 'host';
    const isGovernor = role === 'governor';
    const isCaptain = role === 'captain';
    const isViceCaptain = role === 'vice_captain';
    const isPlayer = role === 'player';
    const isCaptainLevel = isCaptain || isViceCaptain;

    // Action permissions (cumulative based on role hierarchy)
    // Host can do everything
    // Governor can do Host-1 level
    // Captain / Vice Captain can do their team only
    // Player can only submit

    return {
      isHost,
      isGovernor,
      isCaptain,
      isViceCaptain,
      isPlayer,

      // Host-only: Edit league settings
      canManageLeague: isHost,

      // Host + Governor: Manage all teams, assign members/captains
      canManageTeams: isHost || isGovernor,

      // Host + Governor: Validate any submission
      // Captain / Vice Captain: Validate own team only
      canValidateSubmissions: isHost || isGovernor || isCaptainLevel,
      canValidateOwnTeamOnly: isCaptainLevel && !isHost && !isGovernor,

      // Can submit workouts (must be a player)
      canSubmitWorkouts: isAlsoPlayer,
    };
  }, [currentRole, isAlsoPlayer]);

  return (
    <RoleContext.Provider
      value={{
        activeRole: currentRole,
        availableRoles: availableRoles.filter((role) => {
          const hasCaptainLevel =
            availableRoles.includes('captain') ||
            availableRoles.includes('vice_captain');

          if (role === 'player') {
            // If captain/vice_captain role exists, show Player(C)/Player(VC) instead of Player
            if (hasCaptainLevel) return false;
            return true;
          }

          return true;
        }),
        setActiveRole: setCurrentRole,
        isLoading: leagueLoading,
        isAlsoPlayer,
        ...permissions,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

export default RoleProvider;
