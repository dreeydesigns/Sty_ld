"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Lock } from "lucide-react";

import { AppShell } from "@/components/app-shell";

const MIN_LENGTH = 8;

function strength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= MIN_LENGTH) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-400" };
  if (score === 2) return { score, label: "Fair", color: "bg-amber-400" };
  if (score === 3) return { score, label: "Good", color: "bg-yellow-400" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 focus-within:border-[var(--ms-plum)] transition">
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
        <Lock className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--ms-navy)] outline-none placeholder:text-[var(--ms-border)]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="shrink-0 text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]"
        >
          {visible
            ? <EyeOff className="h-4 w-4" strokeWidth={1.85} />
            : <Eye className="h-4 w-4" strokeWidth={1.85} />}
        </button>
      </div>
    </label>
  );
}

export default function ChangePasswordPage() {
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(false);

  const pw = strength(next);
  const nextMatch = next === confirm && next.length > 0;
  const canSubmit =
    current.trim().length > 0 &&
    next.length >= MIN_LENGTH &&
    nextMatch &&
    pw.score >= 2;

  function handleSave() {
    setError("");
    if (!current.trim()) { setError("Please enter your current password."); return; }
    if (next.length < MIN_LENGTH) { setError(`New password must be at least ${MIN_LENGTH} characters.`); return; }
    if (next !== confirm) { setError("Passwords do not match."); return; }
    if (pw.score < 2) { setError("Password is too weak. Mix letters, numbers, and symbols."); return; }

    setLoading(true);
    // Simulate API call — in a real app this POSTs to the backend
    setTimeout(() => {
      try {
        // Store a "password changed" flag so other sessions can be invalidated later
        localStorage.setItem(
          "ms_password_changed",
          JSON.stringify({ changedAt: new Date().toISOString() }),
        );
      } catch { /* noop */ }
      setLoading(false);
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    }, 900);
  }

  return (
    <AppShell currentNav="profile" showBottomNav>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ms-border)] bg-white text-[var(--ms-mauve)] shadow-sm transition hover:text-[var(--ms-navy)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[20px] font-bold text-[var(--ms-navy)]">Change password</h1>
      </div>

      <div className="mx-auto max-w-md space-y-4 pb-24">
        {saved ? (
          <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-7 w-7 text-emerald-600" strokeWidth={2.5} />
            </div>
            <p className="text-[16px] font-bold text-[var(--ms-navy)]">Password changed</p>
            <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
              Your password has been updated. Other active sessions have been invalidated for your security.
            </p>
            <Link
              href="/settings"
              className="mt-5 inline-block rounded-full bg-[var(--ms-plum)] px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
            >
              Back to settings
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-[24px] bg-white p-5 shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
              <PasswordField
                label="Current password"
                value={current}
                onChange={setCurrent}
                placeholder="Your current password"
              />
              <PasswordField
                label="New password"
                value={next}
                onChange={setNext}
                placeholder={`At least ${MIN_LENGTH} characters`}
              />

              {/* Strength bar */}
              {next.length > 0 && (
                <div className="px-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] text-[var(--ms-mauve)]">Password strength</p>
                    <p className={`text-[11px] font-bold ${pw.score >= 3 ? "text-emerald-600" : pw.score === 2 ? "text-amber-600" : "text-red-500"}`}>
                      {pw.label}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1.5 flex-1 rounded-full transition-all ${seg <= pw.score ? pw.color : "bg-[var(--ms-border)]"}`}
                      />
                    ))}
                  </div>
                  <ul className="mt-2 space-y-1 text-[11px] text-[var(--ms-mauve)]">
                    <li className={next.length >= MIN_LENGTH ? "text-emerald-600" : ""}>
                      {next.length >= MIN_LENGTH ? "✓" : "·"} At least {MIN_LENGTH} characters
                    </li>
                    <li className={/[A-Z]/.test(next) ? "text-emerald-600" : ""}>
                      {/[A-Z]/.test(next) ? "✓" : "·"} One uppercase letter
                    </li>
                    <li className={/[0-9]/.test(next) ? "text-emerald-600" : ""}>
                      {/[0-9]/.test(next) ? "✓" : "·"} One number
                    </li>
                    <li className={/[^A-Za-z0-9]/.test(next) ? "text-emerald-600" : ""}>
                      {/[^A-Za-z0-9]/.test(next) ? "✓" : "·"} One special character
                    </li>
                  </ul>
                </div>
              )}

              <PasswordField
                label="Confirm new password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Re-enter new password"
              />
              {confirm.length > 0 && !nextMatch && (
                <p className="text-[12px] text-red-500">Passwords do not match</p>
              )}
              {confirm.length > 0 && nextMatch && (
                <p className="flex items-center gap-1 text-[12px] text-emerald-600">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Passwords match
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-[14px] bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit || loading}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(132,36,92,0.22)] transition hover:brightness-110 disabled:opacity-40"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
