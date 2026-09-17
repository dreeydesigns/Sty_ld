"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Globe, Monitor, Smartphone, Tablet } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { clearAppSession } from "@/lib/client-session";

interface SessionEntry {
  id: string;
  device: string;
  deviceType: "phone" | "tablet" | "desktop" | "browser";
  location: string;
  lastActive: string;
  current: boolean;
}

function DeviceIcon({
  type,
  className,
}: {
  type: SessionEntry["deviceType"];
  className?: string;
}) {
  if (type === "phone")   return <Smartphone className={className} strokeWidth={1.85} />;
  if (type === "tablet")  return <Tablet className={className} strokeWidth={1.85} />;
  if (type === "browser") return <Globe className={className} strokeWidth={1.85} />;
  return <Monitor className={className} strokeWidth={1.85} />;
}

export default function ActiveSessionsPage() {
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [signingOutAll, setSigningOutAll] = useState(false);

  useEffect(() => {
    fetch("/api/auth/sessions", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load sessions.");
      setSessions(data.sessions.map((s: { id: string; device_name: string; browser: string; last_active_at: string; is_current: boolean }) => ({
        id: s.id, device: s.browser || s.device_name || "Browser", deviceType: "browser",
        location: "", lastActive: new Date(s.last_active_at).toLocaleString(), current: s.is_current,
      })));
    }).catch((e) => setError(e.message));
  }, []);

  async function handleSignOutOthers() {
    setSigningOutAll(true); setError("");
    try {
      const response = await fetch("/api/auth/sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allOthers: true }) });
      if (!response.ok) throw new Error("Unable to sign out other sessions.");
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign out."); }
    finally { setSigningOutAll(false); }
  }

  async function handleSignOutCurrent() {
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok && response.status !== 401) throw new Error("Unable to sign out.");
      clearAppSession(); window.location.replace("/");
    } catch { setError("Unable to sign out. Please try again."); }
  }

  return (
    <AppShell currentNav="profile" showBottomNav>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-white text-\[var\(--color-secondary\)] shadow-sm transition hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text-primary)]">Active sessions</h1>
          <p className="text-[12px] text-\[var\(--color-secondary\)]">Devices where you are signed in</p>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-4 pb-24">
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {/* Session list */}
        <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-start gap-3.5 px-4 py-4 ${i < sessions.length - 1 ? "border-b border-[var(--border-subtle)]/60" : ""}`}
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-card)]">
                <DeviceIcon type={s.deviceType} className="h-5 w-5 text-\[var\(--color-secondary\)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">{s.device}</p>
                  {s.current && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      This device
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-\[var\(--color-secondary\)]">{s.location}</p>
                <p className="text-[11px] text-\[var\(--color-secondary\)]">Last active: {s.lastActive}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleSignOutOthers}
              disabled={signingOutAll}
              className="w-full rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-left text-[13px] font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {signingOutAll ? "Signing out…" : "Sign out all other sessions"}
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOutCurrent}
            className="w-full rounded-[18px] border border-red-100 bg-red-50 px-4 py-3.5 text-left text-[13px] font-semibold text-red-600 transition hover:bg-red-100"
          >
            Sign out of this device
          </button>
        </div>

        <div className="rounded-[18px] bg-[var(--surface-card)] px-4 py-4">
          <p className="text-[12px] leading-5 text-\[var\(--color-secondary\)]">
            <strong className="text-[var(--text-primary)]">About sessions</strong> — Each device or browser you use to sign in creates a session.
            If you see a session you don&apos;t recognise, sign out of it immediately and change your password.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
