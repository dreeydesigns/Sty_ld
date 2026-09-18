"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { parsePhoneNumber } from "@/lib/phone-utils";
import { writeAppSession } from "@/lib/client-session";

export interface WhatsAppAuthFlowProps {
  returnTo?: string;
  onSuccess?: (destination: string) => void;
  preview?: boolean;
  onBack?: () => void;
}

interface ProviderStatus {
  available: boolean;
  isTestMode: boolean;
  devMode: boolean;
  channel?: string;
  message?: string;
}

/**
 * WhatsAppAuthFlow
 *
 * Phone-first authentication flow supporting:
 * - Production WhatsApp OTP verification (Meta / Twilio Verify)
 * - Safe Test Authentication Mode (TestOtpProvider in local dev & staging)
 * - Password Sign-In fallback
 * - New user profile step with first name & terms acceptance
 * - Client-side session store hydration and post-login redirection
 */
export function WhatsAppAuthFlow({
  returnTo = "/home",
  onSuccess,
  preview = false,
  onBack,
}: WhatsAppAuthFlowProps) {
  const router = useRouter();

  const [authMethod, setAuthMethod] = useState<"whatsapp" | "password">("whatsapp");
  const [step, setStep] = useState<"phone" | "code" | "profile" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [role, setRole] = useState("client");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devHint, setDevHint] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  const safeDestination =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")
      ? returnTo
      : "/home";

  // Check auth provider availability on mount
  useEffect(() => {
    let active = true;
    fetch("/api/auth/whatsapp", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (active && data) {
          setProviderStatus({
            available: data.available !== false,
            isTestMode: Boolean(data.isTestMode),
            devMode: Boolean(data.devMode),
            channel: data.channel,
            message: data.message,
          });
        }
      })
      .catch(() => {
        if (active) {
          setProviderStatus({
            available: false,
            isTestMode: false,
            devMode: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const finalizeRedirect = useCallback(
    (targetPath?: string) => {
      const destination = targetPath || safeDestination;
      if (onSuccess) {
        onSuccess(destination);
      } else {
        router.push(destination);
        router.refresh();
      }
    },
    [onSuccess, router, safeDestination]
  );

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
    try {
      if (preview) {
        finalizeRedirect();
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

      if (data.user) {
        writeAppSession(data.user);
      }
      finalizeRedirect();
    } catch (err: any) {
      setError(err?.message || "Sign-in failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(action: "start" | "verify" | "complete") {
    if (busy) return;
    setError("");

    const parsed = parsePhoneNumber(phone);
    if (action === "start" && (!parsed.isValid || /[^\d+\s().-]/.test(phone))) {
      setError("Enter a valid phone number with its country code (e.g. 0712 345 678 or +254).");
      return;
    }

    setBusy(true);
    try {
      if (preview) {
        if (action === "start") setStep("code");
        else if (action === "verify") setStep("profile");
        else {
          setStep("done");
          finalizeRedirect();
        }
        return;
      }

      const response = await fetch("/api/auth/whatsapp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          phone: parsed.fullE164,
          code,
          firstName,
          role,
          acceptTerms: accepted,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Authentication request failed. Please try again.");
      }

      if (result.devHint) {
        setDevHint(result.devHint);
      }

      if (result.step === "done") {
        setStep("done");
        const profileRes = await fetch("/api/me", { credentials: "include", cache: "no-store" });
        const profile = await profileRes.json();
        if (profileRes.ok && profile.user) {
          writeAppSession(profile.user);
          const roleDest =
            profile.user.role === "shop"
              ? "/dashboard/shop"
              : profile.user.role === "delivery"
              ? "/dashboard/delivery"
              : safeDestination;
          finalizeRedirect(roleDest);
        } else {
          finalizeRedirect();
        }
      } else if (result.step === "code" || result.step === "profile") {
        setStep(result.step);
        if (action === "start") {
          setCooldown(result.retryAfter || 60);
          setCode("");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3.5 text-base text-[var(--input-text)] placeholder-[var(--input-placeholder)] outline-none transition focus:border-[var(--color-clay)] focus:ring-2 focus:ring-[var(--color-clay)]/20";

  return (
    <section className="mx-auto w-full max-w-md rounded-[32px] border border-[var(--auth-card-border)] bg-[var(--auth-card-bg)] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.08)]">
      {preview && (
        <div className="mb-5 rounded-2xl bg-[var(--bg-surface-raised)] p-3 text-xs font-medium text-[var(--text-secondary)]">
          Design preview · No messages sent or accounts created.
        </div>
      )}

      {/* Header icon & Method Toggle */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-surface-raised)] text-[var(--color-clay-text)]">
          {authMethod === "whatsapp" ? (
            <MessageCircle aria-hidden="true" size={24} />
          ) : (
            <KeyRound aria-hidden="true" size={24} />
          )}
        </div>

        {/* Method Toggle */}
        <div className="flex rounded-full bg-[var(--bg-surface-raised)] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthMethod("whatsapp");
              setError("");
            }}
            className={`rounded-full px-3.5 py-1.5 transition ${
              authMethod === "whatsapp"
                ? "bg-[var(--auth-card-bg)] text-[var(--text-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {providerStatus?.isTestMode ? "Test Code" : "WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod("password");
              setError("");
            }}
            className={`rounded-full px-3.5 py-1.5 transition ${
              authMethod === "password"
                ? "bg-[var(--auth-card-bg)] text-[var(--text-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Password
          </button>
        </div>
      </div>

      {/* Test Mode Active Badge */}
      {providerStatus?.isTestMode && authMethod === "whatsapp" && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <ShieldCheck size={13} aria-hidden="true" />
          Test authentication is active
        </div>
      )}

      {/* Provider Unavailable Fallback Banner */}
      {providerStatus && !providerStatus.available && authMethod === "whatsapp" && (
        <div className="mb-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-3 text-xs text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">WhatsApp verification connecting</p>
          <p className="mt-0.5 text-[var(--text-muted)]">
            Live WhatsApp authentication is being finalized. You can sign in with your password below.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm font-medium text-red-700 dark:text-red-300"
        >
          <p>{error}</p>
          {error.includes("not available") && authMethod === "whatsapp" && (
            <button
              type="button"
              onClick={() => {
                setAuthMethod("password");
                setError("");
              }}
              className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--color-clay-text)] hover:underline"
            >
              Sign in with password instead &rarr;
            </button>
          )}
        </div>
      )}

      {authMethod === "whatsapp" ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--auth-heading)] sm:text-3xl font-display">
            {step === "phone"
              ? "A little closer to your next look."
              : step === "code"
              ? providerStatus?.isTestMode
                ? "Enter test verification code."
                : "Check your WhatsApp."
              : step === "profile"
              ? "What should we call you?"
              : "You're ready to explore."}
          </h1>

          <p className="mb-6 mt-2 text-sm leading-6 text-[var(--auth-body)]">
            {step === "phone"
              ? providerStatus?.isTestMode
                ? "Sign in or join with a test phone number. Instant verification code provided."
                : "Sign in or join with your WhatsApp number. No password to remember."
              : step === "code"
              ? `Enter the 6-digit verification code sent to ${parsePhoneNumber(phone).fullE164 || phone}.`
              : step === "profile"
              ? "Just your first name to start. Add your photo, preferences, and location whenever you're ready."
              : "Your verified Styld account is now active."}
          </p>

          {step !== "done" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit(step === "phone" ? "start" : step === "code" ? "verify" : "complete");
              }}
            >
              {step === "phone" && (
                <label className="block text-sm font-medium text-[var(--auth-label)]">
                  Phone number
                  <input
                    className={inputClass}
                    autoComplete="tel"
                    inputMode="tel"
                    type="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={25}
                    autoFocus
                  />
                  <span className="mt-2 block text-xs font-normal text-[var(--text-muted)]">
                    Kenyan numbers work with 07, 01, or +254. Include country code for other numbers.
                  </span>
                </label>
              )}

              {step === "code" && (
                <>
                  <label className="block text-sm font-medium text-[var(--auth-label)]">
                    Enter 6-Digit Code
                    <input
                      className={`${inputClass} text-center text-2xl tracking-[0.3em] font-mono`}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      required
                      autoFocus
                    />
                  </label>

                  {devHint && (
                    <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                      {devHint}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <button
                      type="button"
                      className="underline text-[var(--color-clay-text)] hover:text-[var(--text-primary)]"
                      disabled={busy}
                      onClick={() => {
                        setStep("phone");
                        setCode("");
                        setError("");
                      }}
                    >
                      Change number
                    </button>
                    <button
                      type="button"
                      className="underline text-[var(--color-clay-text)] hover:text-[var(--text-primary)] disabled:opacity-50"
                      disabled={busy || cooldown > 0}
                      onClick={() => void submit("start")}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                  </div>
                </>
              )}

              {step === "profile" && (
                <>
                  <label className="block text-sm font-medium text-[var(--auth-label)]">
                    First name
                    <input
                      className={inputClass}
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Amani"
                      required
                      maxLength={100}
                      autoFocus
                    />
                  </label>

                  <details className="mt-4 text-sm text-[var(--text-secondary)]">
                    <summary className="cursor-pointer font-medium text-[var(--text-primary)]">
                      Joining Styld for business?
                    </summary>
                    <label className="mt-3 block text-[var(--auth-label)]">
                      Account type
                      <select
                        className={inputClass}
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="client">Client · Book beauty services</option>
                        <option value="professional">Independent professional</option>
                        <option value="salon">Salon</option>
                        <option value="shop">Beauty shop</option>
                        <option value="delivery">Delivery partner</option>
                      </select>
                    </label>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Business verification and service setup are completed after onboarding.
                    </p>
                  </details>

                  <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[var(--auth-body)]">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded border-[var(--input-border)] text-[var(--color-clay)] accent-[var(--color-clay)]"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      required
                    />
                    <span>
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="underline text-[var(--color-clay-text)] hover:text-[var(--text-primary)]"
                        target="_blank"
                      >
                        Terms
                      </Link>{" "}
                      and have read the{" "}
                      <Link
                        href="/privacy"
                        className="underline text-[var(--color-clay-text)] hover:text-[var(--text-primary)]"
                        target="_blank"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </>
              )}

              <button
                disabled={busy || (step === "phone" && cooldown > 0)}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] active:scale-[0.99] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
                type="submit"
              >
                {busy
                  ? "Please wait…"
                  : step === "phone"
                  ? providerStatus?.isTestMode
                    ? "Send test code"
                    : "Send code on WhatsApp"
                  : step === "code"
                  ? "Verify & continue"
                  : "Join Styld"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 size={32} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-[var(--auth-heading)]">Welcome to Styld!</h2>
              <p className="mt-2 text-sm text-[var(--auth-body)]">Redirecting to your dashboard…</p>
            </div>
          )}
        </>
      ) : (
        /* Password Authentication Mode */
        <form onSubmit={handlePasswordSubmit} className="mt-3">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--auth-heading)] sm:text-3xl font-display">
            Welcome back.
          </h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-[var(--auth-body)]">
            Sign in with your registered phone number and account password.
          </p>

          <label className="block text-sm font-medium text-[var(--auth-label)]">
            Phone number
            <input
              className={inputClass}
              autoComplete="tel"
              inputMode="tel"
              type="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-[var(--auth-label)]">
            Password
            <input
              className={inputClass}
              autoComplete="current-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            disabled={busy}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] active:scale-[0.99] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
            type="submit"
          >
            {busy ? "Signing in…" : "Sign in with Password"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>
      )}

      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]">
        <ShieldCheck size={16} className="shrink-0 text-[var(--color-clay-text)]" aria-hidden="true" />
        Your number is used for account verification. Styld will never ask you to share a code in chat.
      </p>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 block w-full text-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← Back to all options
        </button>
      )}

      <Link
        href="/explore"
        className="mt-4 block text-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4"
      >
        Keep exploring
      </Link>
    </section>
  );
}
