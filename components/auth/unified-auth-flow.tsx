"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import {
  Mail,
  Smartphone,
  ShieldCheck,
  Fingerprint,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { parsePhoneNumber } from "@/lib/phone-utils";
import { writeAppSession } from "@/lib/client-session";

interface UnifiedAuthFlowProps {
  returnTo?: string;
  onSuccess?: (destination: string) => void;
  preview?: boolean;
}

export function UnifiedAuthFlow({
  returnTo = "/home",
  onSuccess,
  preview = false,
}: UnifiedAuthFlowProps) {
  const router = useRouter();

  // Clerk Auth SDK hooks
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();

  // Mode: 'overview' | 'email' | 'phone_password'
  const [mode, setMode] = useState<"overview" | "email" | "phone_password">("overview");

  // Email states
  const [email, setEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "code">("input");
  const [emailCode, setEmailCode] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Phone / Password states (legacy migration bridge)
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // UX & Async states
  const [busy, setBusy] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [supportsPasskey, setSupportsPasskey] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);

  // Safe redirect path (prevents open redirects)
  const safeDestination =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/home";

  // Check platform WebAuthn passkey capability
  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      if (
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
        "function"
      ) {
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((available) => setSupportsPasskey(available))
          .catch(() => setSupportsPasskey(false));
      } else {
        setSupportsPasskey(true);
      }
    }
  }, []);

  const finalizeRedirect = useCallback(() => {
    if (onSuccess) {
      onSuccess(safeDestination);
    } else {
      router.push(safeDestination);
      router.refresh();
    }
  }, [onSuccess, router, safeDestination]);

  // Sync session state to local client session store and database
  const postLoginSync = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          writeAppSession(data.user);
        }
      }
    } catch {
      // Background sync error non-fatal; cookie is already set
    }

    if (supportsPasskey && !preview) {
      setShowPasskeyPrompt(true);
    } else {
      finalizeRedirect();
    }
  }, [finalizeRedirect, preview, supportsPasskey]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Google OAuth Sign-In (Clerk)
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    if (busy) return;
    setError("");
    setBusy(true);
    setLoadingText("Connecting to Google…");

    try {
      if (preview) {
        await postLoginSync();
        return;
      }

      if (!isSignInLoaded || !signIn) {
        throw new Error("Authentication service is initializing. Please try again in a moment.");
      }

      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: safeDestination,
      });
    } catch (err: any) {
      // Graceful cancellation handling
      if (
        err?.errors?.[0]?.code === "oauth_access_denied" ||
        err?.name === "AbortError" ||
        err?.message?.includes("cancelled")
      ) {
        setBusy(false);
        return;
      }
      setError(
        err?.errors?.[0]?.message ||
          err?.message ||
          "Google sign-in couldn't be completed. Check your connection and try again."
      );
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Email 6-Digit Code Flow (Clerk Sign-In / Sign-Up)
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleEmailStart(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    setLoadingText("Sending code…");

    try {
      if (preview) {
        setEmailStep("code");
        setSuccessMsg(`Verification code sent to ${cleanEmail}.`);
        setBusy(false);
        return;
      }

      if (!isSignInLoaded || !signIn || !isSignUpLoaded || !signUp) {
        throw new Error("Authentication service is initializing. Please try again.");
      }

      // First try sign-in
      try {
        const signInAttempt = await signIn.create({
          identifier: cleanEmail,
        });

        const emailFactor = signInAttempt.supportedFirstFactors?.find(
          (f: any) => f.strategy === "email_code"
        ) as any;

        if (emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
          setIsSigningUp(false);
          setEmailStep("code");
          setSuccessMsg(`We sent a 6-digit code to ${cleanEmail}.`);
          return;
        }
      } catch (signInErr: any) {
        const code = signInErr?.errors?.[0]?.code;
        // If account does not exist yet, seamlessly start sign-up flow
        if (
          code === "form_identifier_not_found" ||
          code === "identifier_not_found" ||
          code === "user_not_found"
        ) {
          await signUp.create({
            emailAddress: cleanEmail,
          });
          await signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          setIsSigningUp(true);
          setEmailStep("code");
          setSuccessMsg(`We sent a 6-digit code to ${cleanEmail}.`);
          return;
        }
        throw signInErr;
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message ||
          err?.message ||
          "We couldn't send the code. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailVerify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    const cleanCode = emailCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setBusy(true);
    setLoadingText("Verifying code…");

    try {
      if (preview) {
        await postLoginSync();
        return;
      }

      if (!setActive) {
        throw new Error("Authentication session is unavailable.");
      }

      if (isSigningUp) {
        if (!signUp) throw new Error("Sign up session expired. Please enter email again.");
        const completeSignUp = await signUp.attemptEmailAddressVerification({
          code: cleanCode,
        });

        if (completeSignUp.status === "complete") {
          await setActive({ session: completeSignUp.createdSessionId });
          await postLoginSync();
          return;
        }
      } else {
        if (!signIn) throw new Error("Sign in session expired. Please enter email again.");
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: cleanCode,
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          await postLoginSync();
          return;
        }
      }

      setError("Verification was not completed. Please request a new code.");
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message ||
          err?.message ||
          "The code you entered is incorrect or has expired. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Passkey Sign-In (Clerk)
  // ─────────────────────────────────────────────────────────────────────────────
  async function handlePasskeySignIn() {
    if (busy) return;
    setError("");
    setBusy(true);
    setLoadingText("Checking passkey…");

    try {
      if (preview) {
        await postLoginSync();
        return;
      }

      if (!isSignInLoaded || !signIn || !setActive) {
        throw new Error("Authentication service is initializing. Please try again.");
      }

      if (typeof signIn.authenticateWithPasskey !== "function") {
        throw new Error("Passkey sign-in is not supported on this device.");
      }

      const result = await signIn.authenticateWithPasskey();
      if (result?.status === "complete") {
        await setActive({ session: result.createdSessionId });
        await postLoginSync();
        return;
      }
    } catch (err: any) {
      // User cancelled passkey prompt gracefully
      if (
        err?.name === "NotAllowedError" ||
        err?.errors?.[0]?.code === "passkey_not_allowed" ||
        err?.errors?.[0]?.code === "passkey_cancelled"
      ) {
        setBusy(false);
        return;
      }
      setError(
        err?.errors?.[0]?.message ||
          "No usable passkey was found on this device. Sign in with email or password instead."
      );
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Legacy Phone & Password Sign-In (Migration Bridge)
  // ─────────────────────────────────────────────────────────────────────────────
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    const parsed = parsePhoneNumber(phone);
    if (!parsed.isValid) {
      setError("Please enter a valid phone number (e.g. 0712 345 678 or +254).");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);
    setLoadingText("Signing in…");

    try {
      if (preview) {
        await postLoginSync();
        return;
      }

      const res = await fetch("/api/auth/signin-multi-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: parsed.fullE164,
          password,
          assumedRole: "client",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Check your phone number and password and try again.");
      }

      await postLoginSync();
    } catch (err: any) {
      setError(err?.message || "Sign-in failed. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Passkey Promotion Screen
  // ─────────────────────────────────────────────────────────────────────────────
  if (showPasskeyPrompt) {
    return (
      <div className="mx-auto w-full max-w-md rounded-[32px] border border-[var(--auth-card-border)] bg-[var(--auth-card-bg)] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.08)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-surface-raised)] text-[var(--color-clay-text)]">
          <Fingerprint size={30} aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-[var(--auth-heading)]">
          Make your next sign-in faster
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--auth-body)]">
          Use Face ID, fingerprint, or your device screen lock so you won&apos;t need passwords or codes next time.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={finalizeRedirect}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] active:scale-[0.99]"
          >
            Continue to Styld
            <Sparkles size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Unified Auth Front Door
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-md rounded-[32px] border border-[var(--auth-card-border)] bg-[var(--auth-card-bg)] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.08)]">
      <header className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-surface-raised)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">
          <ShieldCheck size={13} aria-hidden="true" />
          Trusted Access
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--auth-heading)]">
          Welcome to Styld
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--auth-body)]">
          Book trusted beauty professionals and curated salons across Nairobi.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm font-medium text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mb-5 rounded-2xl border border-green-500/20 bg-green-500/10 p-3.5 text-sm font-medium text-green-700 dark:text-green-300"
        >
          {successMsg}
        </div>
      )}

      {/* ── Screen 1: Primary Overview ────────────────────────────────────────── */}
      {mode === "overview" && (
        <div className="space-y-3.5">
          {/* Primary CTA: Continue with Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={busy}
            type="button"
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface-raised)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border-subtle)] active:scale-[0.99] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {busy && loadingText.includes("Google") ? loadingText : "Continue with Google"}
          </button>

          {/* Universal Method: Continue with Email */}
          <button
            onClick={() => {
              setMode("email");
              setError("");
            }}
            disabled={busy}
            type="button"
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[var(--action-primary-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] active:scale-[0.99] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
          >
            <Mail size={18} aria-hidden="true" />
            Continue with email
          </button>

          {/* Passkey authentication (only rendered if platform supports WebAuthn) */}
          {supportsPasskey && (
            <div>
              <button
                onClick={handlePasskeySignIn}
                disabled={busy}
                type="button"
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--border-default)] bg-transparent px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)] active:scale-[0.99] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
              >
                <Fingerprint size={18} className="text-[var(--color-clay-text)]" aria-hidden="true" />
                {busy && loadingText.includes("passkey") ? loadingText : "Sign in with a passkey"}
              </button>
              <p className="mt-1 text-center text-[11px] text-[var(--text-muted)]">
                Use Face ID, fingerprint or your device unlock.
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-subtle)]" />
            </div>
            <span className="relative bg-[var(--auth-card-bg)] px-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              or
            </span>
          </div>

          {/* Migration Bridge: Phone or Password */}
          <button
            onClick={() => {
              setMode("phone_password");
              setError("");
            }}
            type="button"
            className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border-default)]"
          >
            <Smartphone size={17} aria-hidden="true" />
            Phone or password
          </button>

          <p className="pt-2 text-center text-xs text-[var(--text-muted)]">
            New here? Your authentication method creates your account automatically.
          </p>
        </div>
      )}

      {/* ── Screen 2: Email Code Flow ─────────────────────────────────────────── */}
      {mode === "email" && (
        <div>
          {emailStep === "input" ? (
            <form onSubmit={handleEmailStart} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Your Email Address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  autoFocus
                  required
                  className="mt-2 block w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--color-clay)] focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
              >
                {busy ? loadingText : "Send verification code"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setMode("overview")}
                className="w-full text-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ← Back to all options
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailVerify} className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                We sent a 6-digit code to <strong className="text-[var(--text-primary)]">{email}</strong>.
              </p>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--auth-label)]">
                  Enter 6-Digit Code
                </span>
                <input
                  type="text"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  autoFocus
                  required
                  className="mt-2 block w-full tracking-[0.3em] text-center font-mono text-xl rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--color-clay)] focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
              >
                {busy ? loadingText : "Verify & Continue"}
                <CheckCircle2 size={17} aria-hidden="true" />
              </button>

              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={() => setEmailStep("input")}
                  className="hover:text-[var(--text-primary)]"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={handleEmailStart}
                  className="hover:text-[var(--text-primary)]"
                >
                  Resend code
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode("overview");
                  setEmailStep("input");
                }}
                className="w-full text-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] pt-2"
              >
                ← Back to all options
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Screen 3: Phone & Password (Legacy Migration Bridge) ─────────────── */}
      {mode === "phone_password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--auth-label)]">
              Phone Number
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              autoFocus
              required
              className="mt-2 block w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--color-clay)] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--auth-label)]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-2 block w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--color-clay)] focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
          >
            {busy ? loadingText : "Sign in with Password"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setMode("overview")}
            className="w-full text-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ← Back to all options
          </button>
        </form>
      )}

      {/* Footer reassurance */}
      <footer className="mt-6 border-t border-[var(--border-subtle)] pt-4 text-center text-xs text-[var(--text-muted)]">
        By signing in, you agree to Styld&apos;s{" "}
        <Link href="/terms" className="underline hover:text-[var(--text-primary)]">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-[var(--text-primary)]">
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
}
