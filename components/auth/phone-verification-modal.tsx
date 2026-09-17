"use client";

import React, { useState } from "react";
import { X, ShieldCheck, Smartphone, ArrowRight, CheckCircle2 } from "lucide-react";
import { parsePhoneNumber } from "@/lib/phone-utils";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (verifiedPhone: string) => void;
  title?: string;
  description?: string;
}

export function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
  title = "Verify your phone number",
  description = "We use your phone number for appointment updates and emergency booking coordination.",
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sid, setSid] = useState("");

  if (!isOpen) return null;

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    const parsed = parsePhoneNumber(phone);
    if (!parsed.isValid) {
      setError("Please enter a valid phone number (e.g. 0712 345 678).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", phone: parsed.fullE164, channel }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send code.");

      setSid(data.sid || "");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!code || code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setBusy(true);
    try {
      const parsed = parsePhoneNumber(phone);
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: parsed.fullE164, code, channel, sid }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Verification failed.");

      onVerified(parsed.fullE164);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-[32px] border border-[var(--auth-card-border)] bg-[var(--auth-card-bg)] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)]"
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-surface-raised)] text-[var(--color-clay-text)]">
          <ShieldCheck size={24} />
        </div>

        <h2 className="mt-4 text-xl font-bold tracking-tight text-[var(--auth-heading)]">{title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-[var(--auth-body)]">{description}</p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--auth-label)]">
                Mobile Number
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

            <div className="flex gap-2" role="tablist" aria-label="Verification Channel">
              <button
                type="button"
                role="tab"
                aria-selected={channel === "sms"}
                onClick={() => setChannel("sms")}
                className={`min-h-[44px] flex-1 rounded-xl py-2.5 text-xs font-semibold border transition ${
                  channel === "sms"
                    ? "border-[var(--color-clay)] bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] shadow-sm"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)]"
                }`}
              >
                Send via SMS
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={channel === "whatsapp"}
                onClick={() => setChannel("whatsapp")}
                className={`min-h-[44px] flex-1 rounded-xl py-2.5 text-xs font-semibold border transition ${
                  channel === "whatsapp"
                    ? "border-[var(--color-clay)] bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] shadow-sm"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)]"
                }`}
              >
                Send via WhatsApp
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
            >
              {busy ? "Sending code..." : "Send Verification Code"}
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="mt-5 space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Enter the 6-digit code sent to <strong className="text-[var(--text-primary)]">{phone}</strong>.
            </p>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--auth-label)]">
                Verification Code
              </span>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                autoFocus
                required
                className="mt-2 block w-full text-center font-mono text-xl tracking-[0.3em] rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--color-clay)] focus:outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-3 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:cursor-not-allowed"
            >
              {busy ? "Verifying..." : "Confirm & Proceed"}
              <CheckCircle2 size={16} />
            </button>

            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
