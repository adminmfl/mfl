"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  SignupFormProps,
  Gender,
  SendOtpResponse,
  VerifyOtpResponse,
} from "@/types/auth";
import { GENDER_OPTIONS, MIN_PASSWORD_LENGTH, OTP_LENGTH } from "@/types/auth";

// ============================================================================
// Types
// ============================================================================

type SignupStep = "details" | "verify-otp";

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
// SignupForm Component
// ============================================================================

export function SignupForm({
  callbackUrl = "/dashboard",
  className,
  onSuccess,
  onError,
  onSwitchToLogin,
  ...props
}: SignupFormProps & React.ComponentProps<"form">) {
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  // UI state
  const [step, setStep] = useState<SignupStep>("details");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isFormDisabled = isLoading || isGoogleLoading;

  // ============================================================================
  // Validation
  // ============================================================================

  const validateForm = (): string | null => {
    if (!email.trim()) return "Please enter your email.";
    if (!username.trim()) return "Please enter a username.";
    if (!dateOfBirth) return "Please enter your date of birth.";
    if (!gender) return "Please select your gender.";
    if (!password) return "Please enter a password.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      onError?.(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data: SendOtpResponse = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Failed to send verification code.";
        toast.error(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
        return;
      }

      toast.success("Verification code sent to your email!");
      setStep("verify-otp");
      setIsLoading(false);
    } catch (error) {
      console.error("Send OTP error:", error);
      const errorMessage = "An error occurred sending verification code.";
      toast.error(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error("Please enter the verification code.");
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      toast.error(`Verification code must be ${OTP_LENGTH} digits.`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase(),
          otp,
          createUser: true,
          password,
          username,
          phone: phone || null,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
        }),
      });

      const data: VerifyOtpResponse = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Invalid verification code.";
        toast.error(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
        return;
      }

      toast.success("Account created successfully!");

      const signInResult = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        onSuccess?.();
        router.push(callbackUrl);
      } else {
        toast.info("Account created. Please sign in.");
        router.push("/login");
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      const errorMessage = "An error occurred during verification.";
      toast.error(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data: SendOtpResponse = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to resend code.");
        setIsLoading(false);
        return;
      }

      toast.success("New verification code sent!");
      setOtp("");
      setIsLoading(false);
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Failed to resend verification code.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      // When no explicit callback is provided, return to /login so the client
      // can fetch leagues and redirect to the first one.
      const googleCallback = callbackUrl === '/dashboard' ? '/login' : callbackUrl;
      await signIn("google", { callbackUrl: googleCallback });
    } catch (error) {
      console.error("Google sign-up error:", error);
      toast.error("Failed to sign up with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  // ============================================================================
  // Render - OTP Verification Step
  // ============================================================================

  if (step === "verify-otp") {
    return (
      <form
        onSubmit={handleOtpSubmit}
        className={cn("flex flex-col gap-6", className)}
        {...props}
      >
        <FieldGroup>
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setOtp("");
            }}
            disabled={isLoading}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          {/* Header */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="text-muted-foreground text-sm text-balance">
              We sent a verification code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          {/* OTP Field */}
          <Field>
            <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
              disabled={isLoading}
              required
              maxLength={OTP_LENGTH}
              className="text-center text-lg tracking-widest font-mono"
              autoComplete="one-time-code"
            />
            <FieldDescription className="text-center">
              Enter the {OTP_LENGTH}-digit code sent to your email
            </FieldDescription>
          </Field>

          {/* Verify Button */}
          <Field>
            <Button
              type="submit"
              disabled={isLoading || otp.length !== OTP_LENGTH}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Create Account"
              )}
            </Button>

            {/* Resend OTP */}
            <FieldDescription className="text-center">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Resend
              </button>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    );
  }

  // ============================================================================
  // Render - Details Step
  // ============================================================================

  return (
    <form
      onSubmit={handleSignupSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your details below to create your account
          </p>
        </div>

        {/* Google Sign Up */}
        <Field>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
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
                Sign up with Google
              </>
            )}
          </Button>
        </Field>

        {/* Divider */}
        <FieldSeparator>Or continue with email</FieldSeparator>

        {/* Email Field */}
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isFormDisabled}
            required
            autoComplete="email"
          />
        </Field>

        {/* Username Field */}
        <Field>
          <FieldLabel htmlFor="signup-username">Username</FieldLabel>
          <Input
            id="signup-username"
            type="text"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isFormDisabled}
            required
            autoComplete="username"
          />
        </Field>

        {/* Phone Field */}
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="signup-phone">Phone</FieldLabel>
            <span className="ml-auto text-xs text-muted-foreground">Optional</span>
          </div>
          <Input
            id="signup-phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isFormDisabled}
            autoComplete="tel"
          />
        </Field>

        {/* Date of Birth Field */}
        <Field>
          <FieldLabel htmlFor="signup-dob">Date of Birth</FieldLabel>
          <Input
            id="signup-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={isFormDisabled}
            required
          />
        </Field>

        {/* Gender Field */}
        <Field>
          <FieldLabel htmlFor="signup-gender">Gender</FieldLabel>
          <Select
            value={gender}
            onValueChange={(value) => setGender(value as Gender)}
            disabled={isFormDisabled}
          >
            <SelectTrigger id="signup-gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Password Field */}
        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isFormDisabled}
              required
              autoComplete="new-password"
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
          <FieldDescription>
            Must be at least {MIN_PASSWORD_LENGTH} characters
          </FieldDescription>
        </Field>

        {/* Confirm Password Field */}
        <Field>
          <FieldLabel htmlFor="signup-confirm-password">Confirm Password</FieldLabel>
          <div className="relative">
            <Input
              id="signup-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isFormDisabled}
              required
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              disabled={isFormDisabled}
              tabIndex={-1}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
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
                Sending verification code...
              </>
            ) : (
              "Continue"
            )}
          </Button>

          {/* Sign In Link */}
          <FieldDescription className="text-center">
            Already have an account?{" "}
            {onSwitchToLogin ? (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="underline underline-offset-4"
              >
                Sign in
              </button>
            ) : (
              <Link href="/login" className="underline underline-offset-4">
                Sign in
              </Link>
            )}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}

export default SignupForm;
