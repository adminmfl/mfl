'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLeague } from '@/contexts/league-context';
import Link from 'next/link';
import {
  Trophy,
  Users,
  Calendar,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  LogIn,
  UserPlus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';

// ============================================================================
// Types
// ============================================================================

interface LeagueInfo {
  league_id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  member_count: number;
  max_capacity: number;
  is_full: boolean;
  can_join: boolean;
}

// ============================================================================
// Public Invite Page
// ============================================================================

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = React.use(params);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [league, setLeague] = React.useState<LeagueInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [joined, setJoined] = React.useState(false);
  const [alreadyMember, setAlreadyMember] = React.useState(false);

  // Fetch league info on mount
  React.useEffect(() => {
    const fetchLeagueInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/invite/${code}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setError(data.error || 'Invalid invite code');
          return;
        }

        setLeague(data.league);
      } catch (err) {
        setError('Failed to load invite details');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchLeagueInfo();
    }
  }, [code]);

  // Handle join action
  const handleJoin = React.useCallback(async () => {
    if (!session?.user) {
      // Store invite code and redirect to login
      localStorage.setItem('pendingInviteCode', code);
      router.push(`/login?callbackUrl=/invite/${code}`);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/invite/${code}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresAuth) {
          localStorage.setItem('pendingInviteCode', code);
          router.push(`/login?callbackUrl=/invite/${code}`);
          return;
        }
        throw new Error(data.error || 'Failed to join league');
      }

      if (data.alreadyMember) {
        setAlreadyMember(true);
      }
      setJoined(true);

      // Redirect to league after short delay
      setTimeout(() => {
        router.push(`/leagues/${data.leagueId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
    } finally {
      setJoining(false);
    }
  }, [session?.user, code, router]);

  // Auto-join if user returns after authentication with pending invite
  React.useEffect(() => {
    const pendingCode = localStorage.getItem('pendingInviteCode');
    if (
      session?.user &&
      pendingCode === code &&
      league &&
      !joined &&
      !joining &&
      league.can_join
    ) {
      // Clear the pending code and auto-join
      localStorage.removeItem('pendingInviteCode');
      handleJoin();
    }
  }, [session, code, league, joined, joining, handleJoin]);

  // Handle signup redirect
  const handleSignup = () => {
    localStorage.setItem('pendingInviteCode', code);
    router.push(`/signup?callbackUrl=/invite/${code}`);
  };

  // Handle login redirect
  const handleLogin = () => {
    localStorage.setItem('pendingInviteCode', code);
    router.push(`/login?callbackUrl=/invite/${code}`);
  };

  // Loading state
  if (loading) {
    return <DumbbellLoading label="Loading invite..." />;
  }

  // Error state
  if (error && !league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="size-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              The invite code may have expired or been entered incorrectly.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" asChild>
                <Link href="/">Go Home</Link>
              </Button>
              <Button asChild>
                <Link href="/leagues/join">Enter Code Manually</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden">
          {/* Animated gradient header */}
          <div className="p-8 text-center dark:text-white text-black relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute -top-6 -left-6 size-24 rounded-full bg-white/10 blur-lg animate-pulse" />
              <div className="absolute -bottom-6 -right-6 size-24 rounded-full bg-white/10 blur-lg animate-pulse delay-500" />
            </div>

            <div className="relative">
              <div className="size-20 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 ring-4 ring-white/30">
                <CheckCircle2 className="size-10 dark:text-white text-black animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-1">
                {alreadyMember ? 'Welcome Back!' : 'You\'re In!'}
              </h2>
              <p className="dark:text-white text-black">
                {alreadyMember
                  ? `You're already part of the team`
                  : `Successfully joined the league`}
              </p>
            </div>
          </div>

          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-2">{league?.name}</h3>
            <p className="text-muted-foreground mb-6">
              {alreadyMember
                ? 'Taking you back to your league...'
                : 'Get ready to compete, stay fit, and win together!'}
            </p>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-muted/50 border">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Redirecting to league...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main invite page
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Header with gradient */}
        <div className="p-6 text-center dark:text-white text-black">
          <div className="size-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Trophy className="size-8" />
          </div>
          <h1 className="text-2xl font-bold mb-1">You're Invited!</h1>
          <p className="dark:text-white text-black">
            Join the fitness competition
          </p>
        </div>

        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">{league?.name}</CardTitle>
          {league?.description && (
            <CardDescription className="line-clamp-2">
              {league.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* League stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Users className="size-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">
                {league?.member_count}/{league?.max_capacity}
              </p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Calendar className="size-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">
                {league?.start_date
                  ? new Date(league.start_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Starts</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Clock className="size-5 mx-auto mb-1 text-primary" />
              <Badge
                variant={
                  league?.status === 'active'
                    ? 'default'
                    : league?.status === 'launched'
                    ? 'outline'
                    : 'secondary'
                }
                className="text-xs"
              >
                {league?.status}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Status</p>
            </div>
          </div>

          {/* Capacity warning */}
          {league?.is_full && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>This league is full and not accepting new members.</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          {sessionStatus === 'loading' ? (
            <Button disabled className="w-full">
              <Loader2 className="size-4 animate-spin mr-2" />
              Loading...
            </Button>
          ) : session?.user ? (
            // Logged in user
            <Button
              onClick={handleJoin}
              disabled={joining || league?.is_full || !league?.can_join}
              className="w-full"
              size="lg"
            >
              {joining ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Joining...
                </>
              ) : league?.is_full ? (
                'League is Full'
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Join League
                </>
              )}
            </Button>
          ) : (
            // Not logged in
            <div className="space-y-3">
              <Button onClick={handleSignup} className="w-full" size="lg">
                <UserPlus className="size-4 mr-2" />
                Sign Up to Join
              </Button>
              <Button
                onClick={handleLogin}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <LogIn className="size-4 mr-2" />
                Already have an account? Log In
              </Button>
            </div>
          )}

          {/* Footer note */}
          <p className="text-xs text-center text-muted-foreground">
            By joining, you agree to participate fairly and follow the league
            rules.
          </p>

          {/* Back to app link */}
          {session?.user && (
            <Button variant="ghost" asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
