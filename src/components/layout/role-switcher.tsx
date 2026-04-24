'use client';

import { useRole, Role } from '@/contexts/role-context';
import { useLeague } from '@/contexts/league-context';
import { getRoleDisplayName, getRoleDescription } from '@/lib/rbac/permissions';
import { ChevronDown, Shield, Users, Crown, User } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const roleIcons: Record<Role, React.ComponentType<{ className?: string }>> = {
  host: Crown,
  governor: Shield,
  captain: Users,
  player: User,
};

const roleColors: Record<Role, string> = {
  host: 'text-amber-500 bg-amber-50 border-amber-200',
  governor: 'text-blue-500 bg-blue-50 border-blue-200',
  captain: 'text-emerald-500 bg-emerald-50 border-emerald-200',
  player: 'text-gray-500 bg-gray-50 border-gray-200',
};

export function RoleSwitcher() {
  const { activeRole, availableRoles, setActiveRole, isLoading } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { activeLeague } = useLeague();

  if (isLoading || !activeRole || availableRoles.length <= 1) {
    return null;
  }

  const ActiveIcon = roleIcons[activeRole];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-all ${roleColors[activeRole]} hover:shadow-md`}
      >
        <div className="flex items-center gap-3">
          <ActiveIcon className="w-5 h-5" />
          <div className="text-left">
            <div className="text-sm font-semibold">
              View as {getRoleDisplayName(activeRole)}
            </div>
            <div className="text-xs opacity-70">
              {getRoleDescription(activeRole).split(' - ')[1]}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Switch Role
              </div>
              {availableRoles.map((role) => {
                const Icon = roleIcons[role];
                const isActive = role === activeRole;

                return (
                  <button
                    key={role}
                    onClick={() => {
                      setActiveRole(role);
                      setIsOpen(false);
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium">
                        {getRoleDisplayName(role)}
                      </div>
                      <div
                        className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        {getRoleDescription(role).split(' - ')[1]}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
