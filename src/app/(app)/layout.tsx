'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

import { LeagueProvider } from '@/contexts/league-context';
import { RoleProvider } from '@/contexts/role-context';
import { LeagueBrandingProvider } from '@/components/providers/league-branding-provider';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppHeader } from '@/components/app/app-header';
import { MobileBottomTabs } from '@/components/app/mobile-bottom-tabs';
import { GuidedTour } from '@/components/onboarding/guided-tour';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldAlert, LogOut } from 'lucide-react';



// ============================================================================
// AppLayout Component
// ============================================================================

/**
 * AppLayout - Unified layout for all user-facing pages.
 *
 * Features:
 * - Authentication check (redirects to login if not authenticated)
 * - LeagueContext and RoleContext providers
 * - Dynamic sidebar based on role/context
 * - Header with breadcrumbs and role switcher
 * - Mobile bottom tabs navigation
 * - Loading state while checking auth
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const backHref = React.useMemo(() => {
    if (!pathname || pathname === '/dashboard') return '/dashboard';

    const leagueMatch = pathname.match(/^\/leagues\/([^/]+)(?:\/(.*))?$/);
    if (leagueMatch) {
      const leagueId = leagueMatch[1];
      const subPath = leagueMatch[2];
      if (subPath) {
        return `/leagues/${leagueId}`;
      }
      return '/dashboard';
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length <= 1) return '/dashboard';
    return `/${segments.slice(0, -1).join('/')}`;
  }, [pathname]);

  const handleBackClick = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backHref);
  }, [backHref, router]);

  const isAdmin = (session?.user as any)?.platform_role === 'admin';
  const leagueMatch = pathname?.match(/^\/leagues\/([^/]+)/);
  const impersonatingLeagueId = isAdmin && leagueMatch ? leagueMatch[1] : null;
  const [isExiting, setIsExiting] = useState(false);

  const handleExitAdminMode = useCallback(async () => {
    if (!impersonatingLeagueId) return;
    setIsExiting(true);
    try {
      await fetch(`/api/admin/leagues/${impersonatingLeagueId}/impersonate`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error cleaning up impersonation:', err);
    }
    // Clear impersonation state from localStorage
    localStorage.removeItem('activeLeagueId');
    localStorage.removeItem(`role_${impersonatingLeagueId}`);
    router.push('/admin/leagues');
  }, [impersonatingLeagueId, router]);

  // Auto-cleanup: when admin navigates away from a league page, clean up
  useEffect(() => {
    if (!isAdmin || !pathname) return;
    // If admin is no longer on a league page, run cleanup for any lingering roles
    if (!pathname.startsWith('/leagues/')) {
      fetch('/api/admin/impersonate/cleanup', { method: 'POST' }).catch(() => {});
    }
  }, [isAdmin, pathname]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/dashboard');
    }
  }, [status, router]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (status === 'unauthenticated') {
    return null;
  }

  // Prepare user data for sidebar
  const user = {
    name: session?.user?.name || 'User',
    email: session?.user?.email || 'user@example.com',
    avatar: (session?.user as any)?.profile_picture_url || session?.user?.image || '',
  };

  return (
    <LeagueProvider>
      <RoleProvider>
        <LeagueBrandingProvider>
        <SidebarProvider>
          {/* Sidebar - Hidden on mobile */}
          <AppSidebar user={user} className="hidden md:flex" />

          {/* Main Content Area */}
          <SidebarInset>
            {/* Header */}
            <AppHeader />

            {/* Page Content */}
            <main className="flex-1 overflow-auto pb-20 md:pb-0">
              <div className="p-4 lg:p-6">
                {impersonatingLeagueId && (
                  <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3">
                    <ShieldAlert className="size-5 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        Admin Mode — You are viewing this league as Host
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Your access will be removed when you leave this page.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40"
                      onClick={handleExitAdminMode}
                      disabled={isExiting}
                    >
                      <LogOut className="size-4 mr-1" />
                      {isExiting ? 'Exiting...' : 'Exit Admin Mode'}
                    </Button>
                  </div>
                )}
                {pathname !== '/dashboard'
                  && !/^\/leagues\/[^/]+$/.test(pathname || '')
                  && !/^\/leagues\/[^/]+\/submit$/.test(pathname || '')
                  && !/^\/leagues\/[^/]+\/settings$/.test(pathname || '') && (
                  <Button variant="outline" size="sm" className="mb-4 gap-2" onClick={handleBackClick}>
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                )}
                {children}
              </div>
            </main>
          </SidebarInset>

          {/* Mobile Bottom Tabs */}
          <MobileBottomTabs />

          {/* Guided Tour (first-time users) */}
          <GuidedTour />
        </SidebarProvider>
        </LeagueBrandingProvider>
      </RoleProvider>
    </LeagueProvider>
  );
}
