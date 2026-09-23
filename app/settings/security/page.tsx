"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Smartphone,
  Mail,
  KeyRound,
  Fingerprint,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { PhoneVerificationModal } from "@/components/auth/phone-verification-modal";

interface IdentityItem {
  id: string;
  provider: string;
  providerSubject: string;
  email?: string | null;
  phone?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

interface SecurityStatus {
  totpEnabled: boolean;
  passkeyEnabled: boolean;
  phone: string | null;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
}

export default function SecuritySettingsPage() {
  const [identities, setIdentities] = useState<IdentityItem[]>([]);
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchIdentities();
  }, []);

  async function fetchIdentities() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/identities");
      if (res.ok) {
        const data = await res.json();
        setIdentities(data.identities || []);
        setStatus(data.status || null);
      }
    } catch {
      setError("Failed to load security settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlinkIdentity(identityId: string) {
    if (identities.length <= 1) {
      setError("You cannot remove your only remaining sign-in method.");
      return;
    }

    if (!confirm("Are you sure you want to remove this sign-in method?")) return;

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/identities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to remove method.");

      setSuccess("Sign-in method removed.");
      fetchIdentities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink method.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartTotpSetup() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to start 2FA setup.");

      setTotpSetupData(data);
      setShowTotpModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "2FA setup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmTotp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Invalid code.");

      setRecoveryCodes(data.recoveryCodes || []);
      setSuccess("Two-factor authentication is now active!");
      fetchIdentities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "2FA confirmation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisableTotp() {
    if (!confirm("Are you sure you want to disable two-factor authentication?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/mfa/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to disable 2FA.");

      setSuccess("Two-factor authentication disabled.");
      setShowTotpModal(false);
      setRecoveryCodes([]);
      fetchIdentities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable 2FA.");
    } finally {
      setBusy(false);
    }
  }

  // Helpers to check provider connection status
  const hasGoogle = identities.some((i) => i.provider === "google");
  const hasEmail = Boolean(status?.emailVerified || identities.some((i) => i.provider === "email"));
  const hasPassword = identities.some((i) => i.provider === "password");
  const hasPasskey = Boolean(status?.passkeyEnabled || identities.some((i) => i.provider === "passkey"));
  const hasPhone = Boolean(status?.phoneVerified || identities.some((i) => i.provider === "phone" && i.verifiedAt));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <Link href="/settings" className="hover:text-[var(--text-primary)]">
          Settings
        </Link>
        <span>/</span>
        <span className="text-[var(--text-primary)] font-semibold">Security</span>
      </nav>

      <header className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-surface-raised)] text-[var(--color-clay-text)]">
          <ShieldCheck size={26} />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Security & Sign-In Methods
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Manage your verified credentials, biometric passkeys, and multi-factor authentication.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 ">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm font-medium text-green-700 ">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sign-in Methods Card */}
          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-sm">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Connected Sign-In Methods</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              You can access your Styld account using any of the active methods below.
            </p>

            <div className="mt-6 divide-y divide-[var(--border-subtle)]">
              {/* 1. Google */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface-raised)]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Google</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {hasGoogle ? "Connected" : "Fast one-tap sign-in"}
                    </p>
                  </div>
                </div>
                <div>
                  {hasGoogle ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-700 ">
                      <CheckCircle2 size={12} /> Connected
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Not connected</span>
                  )}
                </div>
              </div>

              {/* 2. Email */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)]">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Email</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {status?.email || "Universal code & magic link sign-in"}
                    </p>
                  </div>
                </div>
                <div>
                  {hasEmail ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-700 ">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Not configured</span>
                  )}
                </div>
              </div>

              {/* 3. Password */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)]">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Password</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Traditional password credential</p>
                  </div>
                </div>
                <Link
                  href="/settings/change-password"
                  className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
                >
                  {hasPassword ? "Change password" : "Set password"}
                </Link>
              </div>

              {/* 4. Passkeys */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface-raised)] text-[var(--color-clay-text)]">
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Passkey / Biometrics</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Face ID, fingerprint, or device screen lock</p>
                  </div>
                </div>
                <div>
                  {hasPasskey ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-700 ">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Available</span>
                  )}
                </div>
              </div>

              {/* 5. Phone Contact Verification */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)]">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phone Number</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {status?.phone ? status.phone : "Used for appointment coordination"}
                    </p>
                  </div>
                </div>
                <div>
                  {hasPhone ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-700 ">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowPhoneModal(true)}
                      className="rounded-full bg-[var(--action-primary-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--action-primary-text)] hover:bg-[var(--action-primary-hover)]"
                    >
                      Verify phone
                    </button>
                  )}
                </div>
              </div>

              {/* 6. Authenticator App (TOTP) */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface-raised)] text-[var(--color-clay-text)]">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Authenticator App (TOTP)</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Google Authenticator, Microsoft Authenticator, or 1Password
                    </p>
                  </div>
                </div>
                <div>
                  {status?.totpEnabled ? (
                    <button
                      onClick={handleDisableTotp}
                      disabled={busy}
                      className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={handleStartTotpSetup}
                      disabled={busy}
                      className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                    >
                      Set up 2FA
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Sessions Quick Link */}
          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Active Sessions & Devices</h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Review and revoke login sessions across your phones and computers.
              </p>
            </div>
            <Link
              href="/settings/active-sessions"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--color-clay-text)] hover:underline"
            >
              View devices <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Value-Moment Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onVerified={(verifiedPhone) => {
          setSuccess(`Phone number ${verifiedPhone} verified successfully.`);
          fetchIdentities();
        }}
      />

      {/* TOTP 2FA Setup Modal */}
      {showTotpModal && totpSetupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[32px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Set up Authenticator App</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Scan this key into Google Authenticator or 1Password, then enter the 6-digit code.
            </p>

            <div className="mt-4 rounded-2xl bg-[var(--bg-surface-raised)] p-4 font-mono text-center text-xs tracking-wider select-all break-all text-[var(--text-primary)]">
              {totpSetupData.secret}
            </div>

            {recoveryCodes.length > 0 ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-800 ">
                    Save your backup recovery codes
                  </h3>
                  <p className="mt-1 text-xs text-green-700 ">
                    Each code works once. Store them in a secure password manager.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs text-[var(--text-primary)]">
                    {recoveryCodes.map((c, i) => (
                      <div key={i} className="rounded-lg bg-[var(--card-bg)] p-1.5 text-center font-bold">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowTotpModal(false)}
                  className="w-full rounded-full bg-[var(--action-primary-bg)] py-3 text-sm font-semibold text-[var(--action-primary-text)]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmTotp} className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    6-Digit Authenticator Code
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    autoFocus
                    required
                    className="mt-2 block w-full text-center font-mono text-xl tracking-[0.3em] rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-[var(--input-text)] focus:border-[var(--color-clay)] focus:outline-none"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTotpModal(false)}
                    className="flex-1 rounded-full border border-[var(--border-default)] py-3 text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-full bg-[var(--action-primary-bg)] py-3 text-xs font-semibold text-[var(--action-primary-text)] disabled:opacity-60"
                  >
                    {busy ? "Activating..." : "Confirm & Enable"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
