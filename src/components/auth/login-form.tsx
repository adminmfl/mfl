"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { getLastLeagueId } from "@/lib/last-league-storage";

import type { LoginFormProps } from "@/types/auth";

// ============================================================================
// Google Icon Component
// ============================================================================

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ============================================================================
// LoginForm Component
// ============================================================================

export function LoginForm({
  callbackUrl = "/dashboard",
  className,
  onSuccess,
  onError,
  ...props
}: LoginFormProps & React.ComponentProps<"form">) {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isFormDisabled = isLoading || isGoogleLoading;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        const errorMessage = "Email or password is incorrect. Please try again.";
        toast.error(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        toast.success("Welcome back!");
        onSuccess?.();

        // Fetch session to check for admin role
        const session = await getSession();
        const isAdmin = (session?.user as any)?.platform_role === 'admin';

        // Redirect admins to /admin unless they have a specific callbackUrl
        if (isAdmin && callbackUrl === '/dashboard') {
          window.location.replace('/admin');
          return;
        }

        // If no explicit callback (defaults to /dashboard), try last league or first league
        if (callbackUrl === '/dashboard') {
          try {
            const res = await fetch('/api/leagues');
            if (res.ok) {
              const json = await res.json();
              const leagues = Array.isArray(json?.data) ? json.data : [];

              // Try to restore last league
              const lastLeagueId = getLastLeagueId();
              if (lastLeagueId) {
                const hasLastLeague = leagues.some((l: any) => (l?.league_id || l?.id || l?.leagueId) === lastLeagueId);
                if (hasLastLeague) {
                  window.location.replace(`/leagues/${lastLeagueId}`);
                  return;
                }
              }

              // Fallback to first league
              const first = leagues[0];
              const firstId = first?.league_id || first?.id || first?.leagueId;
              if (firstId) {
                window.location.replace(`/leagues/${firstId}`);
                return;
              }
            }
          } catch (err) {
            console.error('Login form league redirect failed:', err);
          }
        }

        window.location.replace(callbackUrl);
        return;
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = "An unexpected error occurred. Please try again.";
      toast.error(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // When no explicit callback is provided, return to /login so the client
      // can fetch leagues and redirect to the first one.
      const googleCallback = callbackUrl === '/dashboard' ? '/login' : callbackUrl;
      await signIn("google", { callbackUrl: googleCallback });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>

        {/* Email Field */}
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isFormDisabled}
            required
            autoComplete="email"
          />
        </Field>

        {/* Password Field */}
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
              tabIndex={isFormDisabled ? -1 : 0}
            >
              Forgot your password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isFormDisabled}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isFormDisabled}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </Field>

        {/* Submit Button */}
        <Field>
          <Button type="submit" disabled={isFormDisabled} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </Field>

        {/* Divider */}
        <FieldSeparator>Or continue with</FieldSeparator>

        {/* Google Sign In */}
        <Field>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isFormDisabled}
            className="w-full"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <GoogleIcon className="size-4" />
                Login with Google
              </>
            )}
          </Button>

          {/* Sign Up Link */}
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline underline-offset-4">
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}

export default LoginForm;
