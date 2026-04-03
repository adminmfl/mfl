"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { getLastLeagueId } from "@/lib/last-league-storage";

// ============================================================================
// Config
// ============================================================================

export const dynamic = "force-dynamic";

// ============================================================================
// LoginPage Component
// ============================================================================

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  // Redirect authenticated users
  useEffect(() => {
    if (status === "authenticated") {
      const user = session?.user as any;
      const needsProfileCompletion = user?.needsProfileCompletion;
      const isAdmin = user?.platform_role === 'admin';

      if (needsProfileCompletion) {
        router.replace("/complete-profile");
      } else if (isAdmin && callbackUrl === "/dashboard") {
        // Redirect admins to /admin unless they have a specific callbackUrl
        router.replace("/admin");
      } else {
        // Default: try to restore the user's last league; otherwise try first league.
        (async () => {
          try {
            if (callbackUrl === "/dashboard") {
              // Check if there's a last visited league
              const lastLeagueId = getLastLeagueId();
              if (lastLeagueId) {
                // Verify the user still has access to that league
                const res = await fetch("/api/leagues");
                if (res.ok) {
                  const json = await res.json();
                  const leagues = Array.isArray(json?.data) ? json.data : [];
                  const hasLastLeague = leagues.some((l: any) => (l?.league_id || l?.id || l?.leagueId) === lastLeagueId);
                  if (hasLastLeague) {
                    router.replace(`/leagues/${lastLeagueId}`);
                    return;
                  }
                }
              }

              // Fallback: try to redirect to first league
              const res = await fetch("/api/leagues");
              if (res.ok) {
                const json = await res.json();
                const leagues = Array.isArray(json?.data) ? json.data : [];
                const first = leagues[0];
                const firstId = first?.league_id || first?.id || first?.leagueId;
                if (firstId) {
                  router.replace(`/leagues/${firstId}`);
                  return;
                }
              }
            }
          } catch (err) {
            console.error("Login redirect league fetch failed:", err);
          }

          // Fallback to provided callbackUrl (or /dashboard)
          router.replace(callbackUrl);
        })();
      }
    }
  }, [status, session, router, callbackUrl]);

  if (status === "loading") {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-background">
        {/* Brand */}
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <img
              src="/img/mfl-logo.jpg"
              alt="My Fitness League"
              className="size-8 rounded-md object-cover"
            />
            My Fitness League
          </Link>
        </div>

        {/* Form Container */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="relative hidden lg:flex items-center justify-center p-12">
        <img
          src="/img/auth-illustration.svg"
          alt="My Fitness League"
          className="w-full max-w-lg drop-shadow-xl"
        />
      </div>
    </div>
  );
}
