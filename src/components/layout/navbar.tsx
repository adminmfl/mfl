'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dumbbell,
  Trophy,
  Users,
  BookOpen,
  User,
  Menu,
  X,
  LogOut,
  Flag,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { getTeamNameForUser } from '@/lib/services/teams';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { href: '/dashboard', label: 'My Progress', icon: Dumbbell },
  { href: '/team', label: 'My Team', icon: Users },
  { href: '/leaderboards', label: 'Leaderboard', icon: Trophy },
  { href: '/my-challenges', label: 'My Challenges', icon: Flag },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/rules', label: 'Rules', icon: BookOpen },
];

export function Navbar({ navLinks }: { navLinks?: typeof navItems }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name = session?.user?.name ?? null;
  const role = (session?.user as any)?.role as
    | 'player'
    | 'leader'
    | 'governor'
    | undefined;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);

  const handleSignOut = useCallback(async () => {
    try {
      localStorage.removeItem('activeLeagueId');
      localStorage.removeItem('mfl_last_league_id');
      Object.keys(localStorage)
        .filter((k) => k.startsWith('role_'))
        .forEach((k) => localStorage.removeItem(k));
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((k) => caches.delete(k)));
      await fetch('/api/auth/clear-cookies', { method: 'POST' });
    } catch {
      /* ignore */
    }
    signOut({ callbackUrl: '/' });
  }, []);

  // Fetch team name (single optimized query)
  useEffect(() => {
    const fetchTeamName = async () => {
      if (!session?.user?.id) return;

      try {
        const teamName = await getTeamNameForUser(session.user.id);
        if (teamName) {
          setTeamName(teamName);
        }
      } catch (error) {
        console.error('Error fetching team name:', error);
      }
    };

    fetchTeamName();
  }, [session?.user?.id]);

  // Convert team name to logo filename format
  const getTeamLogoPath = (teamName: string | null) => {
    if (!teamName) return '/img/placeholder-team.svg';

    // Normalize team names to expected file names
    const normalized = teamName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');

    // Some logos have a fixed prefix like 'Pristine_' while others are single words
    // Try multiple candidates in order
    const candidates = [
      `/img/${normalized}_Logo.jpeg`,
      `/img/Pristine_${normalized}_Logo.jpeg`,
    ];

    // We can't synchronously check file existence on client; return first candidate.
    // The <img> has onError fallback to placeholder.
    return candidates[0];
  };

  // Minimal header for governors only
  if (role === 'governor') {
    return (
      <nav className="bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white">
                <img
                  src="/img/mfl-logo.jpg"
                  alt="My Fitness League"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-sm sm:text-base">
                Welcome, {name ?? 'Governor'}
              </div>
            </div>
            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3">
              {name ? (
                <>
                  <Button
                    onClick={() => handleSignOut()}
                    variant="outline"
                    size="sm"
                    className="text-primary border-white hover:bg-white hover:text-primary flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Sign Out
                  </Button>
                </>
              ) : null}
            </div>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded hover:bg-primary/10"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-64 bg-primary text-primary-foreground shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-primary-foreground/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded overflow-hidden bg-white">
                    <img
                      src="/img/mfl-logo.jpg"
                      alt="My Fitness League"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-sm">Welcome, {name ?? 'Governor'}</span>
                </div>
                <button
                  className="p-2 rounded hover:bg-primary/10"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 py-3 space-y-2">
                {name ? (
                  <>
                    <button
                      className="w-full text-left px-3 py-2 rounded-md bg-white text-primary font-medium flex items-center gap-2"
                      onClick={() => {
                        setMobileOpen(false);
                        handleSignOut();
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </nav>
    );
  }

  const linksToShow = navLinks ?? navItems;
  return (
    <nav className="bg-primary text-primary-foreground shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* RFL Logo/Brand */}
          <div className="flex items-center space-x-4 shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 shrink-0"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white">
                <img
                  src="/img/mfl-logo.jpg"
                  alt="My Fitness League"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="whitespace-nowrap leading-tight">
                <h1 className="text-lg font-bold whitespace-nowrap">MFL</h1>
                <p className="text-xs text-primary-foreground/80 whitespace-nowrap">
                  My Fitness League
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links (desktop) */}
          <div className="hidden md:flex items-center justify-center flex-1 space-x-6 ml-6 mr-6">
            {linksToShow.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard' || pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu + Mobile toggle */}
          <div className="flex items-center space-x-4">
            {name && (
              <div className="flex items-center space-x-2">
                <Avatar className="size-6 border border-white/20">
                  <AvatarImage
                    src={
                      (session?.user as any)?.profile_picture_url || undefined
                    }
                  />
                  <AvatarFallback className="text-xs bg-white text-primary">
                    {name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{name}</span>
              </div>
            )}
            {/* Desktop-only auth actions */}
            <div className="hidden md:flex items-center space-x-3">
              {name ? (
                <Button
                  onClick={() => handleSignOut()}
                  variant="outline"
                  size="sm"
                  className="text-primary border-white hover:bg-white hover:text-primary flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              ) : null}
            </div>
            {/* Hamburger toggle (mobile only) */}
            <button
              className="md:hidden p-2 rounded hover:bg-primary/10"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-64 bg-primary text-primary-foreground shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary-foreground/10">
              {name && (
                <div className="flex items-center gap-2">
                  <Avatar className="size-6 border border-white/20">
                    <AvatarImage
                      src={
                        (session?.user as any)?.profile_picture_url || undefined
                      }
                    />
                    <AvatarFallback className="text-xs bg-white text-primary">
                      {name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{name}</span>
                </div>
              )}
              <button
                className="p-2 rounded hover:bg-primary/10"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard' || pathname === '/'
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/10'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-auto px-4 py-3 border-t border-primary-foreground/10 space-y-2">
              {name ? (
                <button
                  className="w-full text-left px-3 py-2 rounded-md bg-white text-primary font-medium flex items-center gap-2"
                  onClick={() => {
                    setMobileOpen(false);
                    handleSignOut();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
