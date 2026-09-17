"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Smartphone,
  KeyRound,
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

  // Mode: 'overview' | 'email' | 'phone_password'
  const [mode, setMode] = useState<"overview" | "email" | "phone_password">("overview");
  
  // Email states
  const [email, setEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "code">("input");
  const [emailCode, setEmailCode] = useState("");
  const [devEmailCode, setDevEmailCode] = useState("");

  // Phone / Password states
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Common UX states
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [supportsPasskey, setSupportsPasskey] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{ id: string; firstName: string; email?: string } | null>(null);

  // Check WebAuthn passkey platform support
  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((available) => setSupportsPasskey(available))
          .catch(() => setSupportsPasskey(false));
      } else {
        setSupportsPasskey(true);
      }
    }
  }, []);

  function handleSuccess(user: { id: string; firstName: string; email?: string; role?: string }) {
    writeAppSession({
      id: user.id,
      role: (user.role as any) || "client",
      firstName: user.firstName,
      phone: (user as any).phone || "",
      email: user.email,
      quizCompleted: false,
      theme: "not_set",
      themeSetBy: "fallback",
      themeUpdatedAt: new Date().toISOString(),
      subscription: { tier: "none", status: "teaser" },
      tribes: [],
      createdAt: new Date().toISOString(),
    } as any);
    setAuthenticatedUser(user);

    // If device supports passkeys, offer enrollment before leaving
    if (supportsPasskey && !preview) {
      setShowPasskeyPrompt(true);
    } else {
      finalizeRedirect();
    }
  }

  function finalizeRedirect() {
    const destination = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/home";
    if (onSuccess) onSuccess(destination);
    else {
      router.push(destination);
      router.refresh();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Google Identity Services Sign-In
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    if (busy) return;
    setError("");
    setBusy(true);

    try {
      if (preview) {
        handleSuccess({ id: "preview_google_user", firstName: "Google User", role: "client" });
        return;
      }

      // Check if real Google Client ID is configured
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (!clientId) {
        // Development Sandbox Token fallback
        const mockToken = `header.${btoa(
          JSON.stringify({
            sub: "mock_google_sub_12345",
            email: "google.member@styld.test",
            email_verified: true,
            name: "Verified Google Member",
            given_name: "Google",
          })
        )}.signature`;

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: mockToken }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Google sign-in failed.");
        handleSuccess(data.user);
        return;
      }

      // Live Google Identity Services
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            try {
              const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential }),
              });
              const data = await res.json();
              if (!res.ok || !data.success) throw new Error(data.error || "Google sign-in failed.");
              handleSuccess(data.user);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Google sign-in failed.");
            }
          },
        });
        google.accounts.id.prompt();
      } else {
        throw new Error("Google Identity Services is loading. Please try again in a moment.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Email OTP Sign-In Flow
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleEmailStart(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      if (preview) {
        setEmailStep("code");
        setDevEmailCode("123456");
        return;
      }

      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send code.");

      setEmailStep("code");
      if (data.devCode) {
        setDevEmailCode(data.devCode);
      }
      setSuccessMsg("Verification code sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailVerify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!emailCode || emailCode.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setBusy(true);
    try {
      if (preview) {
        handleSuccess({ id: "preview_email_user", firstName: email.split("@")[0], email, role: "client" });
        return;
      }

      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: emailCode, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Invalid code.");

      handleSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Phone & Password Sign-In Flow
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
    try {
      if (preview) {
        handleSuccess({ id: "preview_user", firstName: "Phone User", role: "client" });
        return;
      }

      const res = await fetch("/api/auth/signin-multi-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: parsed.fullE164, password, assumedRole: "client" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Invalid phone or password.");

      handleSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Passkey Sign-In
  // ─────────────────────────────────────────────────────────────────────────────
  async function handlePasskeySignIn() {
    if (busy) return;
    setError("");
    setBusy(true);

    try {
      if (preview) {
        handleSuccess({ id: "preview_passkey_user", firstName: "Passkey User", role: "client" });
        return;
      }

      // 1. Get login challenge options
      const optRes = await fetch("/api/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login-options" }),
      });
      const optData = await optRes.json();
      if (!optRes.ok || !optData.success) throw new Error(optData.error || "Passkey login failed.");

      // 2. Invoke browser WebAuthn
      const challengeBuffer = Uint8Array.from(atob(optData.options.challenge.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0)
      );

      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          rpId: optData.options.rpId,
          userVerification: "preferred",
          timeout: 60000,
        },
      })) as PublicKeyCredential;

      if (!credential) throw new Error("Passkey authentication canceled.");

      // 3. Verify assertion on server
      const rawClientData = new Uint8Array((credential.response as AuthenticatorAssertionResponse).clientDataJSON);
      const clientDataBase64 = btoa(String.fromCharCode(...rawClientData)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const verifyRes = await fetch("/api/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login-verify",
          credentialId: credential.id,
          clientDataJSON: clientDataBase64,
          challenge: optData.options.challenge,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.error || "Passkey verification failed.");

      handleSuccess(verifyData.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Post-Auth Passkey Enrollment Prompt
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleRegisterPasskeyNow() {
    setBusy(true);
    try {
      const optRes = await fetch("/api/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register-options" }),
      });
      const optData = await optRes.json();
      if (!optRes.ok || !optData.success) throw new Error(optData.error);

      const challengeBuf = Uint8Array.from(atob(optData.options.challenge.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0)
      );
      const userIdBuf = Uint8Array.from(atob(optData.options.user.id.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0)
      );

      const credential = (await navigator.credentials.create({
        publicKey: {
          ...optData.options,
          challenge: challengeBuf,
          user: {
            ...optData.options.user,
            id: userIdBuf,
          },
        },
      })) as PublicKeyCredential;

      if (!credential) throw new Error("Passkey setup canceled.");

      const rawClientData = new Uint8Array(credential.response.clientDataJSON);
      const clientDataBase64 = btoa(String.fromCharCode(...rawClientData)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const verRes = await fetch("/api/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register-verify",
          credentialId: credential.id,
          clientDataJSON: clientDataBase64,
          challenge: optData.options.challenge,
          deviceName: "Device Passkey",
        }),
      });

      const verData = await verRes.json();
      if (!verRes.ok || !verData.success) throw new Error(verData.error);

      finalizeRedirect();
    } catch {
      // If user dismisses passkey enrollment, proceed into Styld anyway
      finalizeRedirect();
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
          Use Face ID, fingerprint, or your device screen lock so you won&apos;t need to enter passwords or codes next time.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={handleRegisterPasskeyNow}
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] active:scale-[0.99] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
          >
            {busy ? "Activating..." : "Enable Passkey / Biometrics"}
            <Sparkles size={16} aria-hidden="true" />
          </button>
          <button
            onClick={finalizeRedirect}
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center rounded-full border border-[var(--border-default)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
          >
            Maybe later
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
        <div role="alert" className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {successMsg && (
        <div role="status" className="mb-5 rounded-2xl border border-green-500/20 bg-green-500/10 p-3.5 text-sm font-medium text-green-700 dark:text-green-300">
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
            Continue with Google
          </button>

          {/* Universal Fallback: Continue with Email */}
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

          {/* Returning user Passkey (if supported) */}
          {supportsPasskey && (
            <button
              onClick={handlePasskeySignIn}
              disabled={busy}
              type="button"
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--border-default)] bg-transparent px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
            >
              <Fingerprint size={18} className="text-[var(--color-clay-text)]" aria-hidden="true" />
              Sign in with Passkey / Face ID
            </button>
          )}

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-subtle)]" />
            </div>
            <span className="relative bg-[var(--auth-card-bg)] px-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              or
            </span>
          </div>

          {/* Phone or Password */}
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
            New here? You can create your account with any of these options.
          </p>
        </div>
      )}

      {/* ── Screen 2: Email Sign-In Flow ──────────────────────────────────────── */}
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
                {busy ? "Sending code..." : "Send verification code"}
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

              {devEmailCode && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                  Sandbox hint: Use code <strong>{devEmailCode}</strong>
                </div>
              )}

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
                {busy ? "Verifying..." : "Verify & Continue"}
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
            </form>
          )}
        </div>
      )}

      {/* ── Screen 3: Phone & Password Sign-In Flow ──────────────────────────── */}
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
            {busy ? "Signing in..." : "Sign in with Password"}
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
