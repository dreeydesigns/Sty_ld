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

// Derive a "current session" entry from browser info
function getCurrentSession(): SessionEntry {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /Android|iPhone|iPod/.test(ua);
  const isTablet = /iPad|Android/.test(ua) && !/Mobile/.test(ua);

  let device = "Desktop browser";
  let deviceType: SessionEntry["deviceType"] = "desktop";

  if (isMobile) { device = "Mobile browser"; deviceType = "phone"; }
  else if (isTablet) { device = "Tablet browser"; deviceType = "tablet"; }
  else if (/Chrome/.test(ua))  { device = "Chrome on desktop"; deviceType = "browser"; }
  else if (/Safari/.test(ua))  { device = "Safari on desktop"; deviceType = "browser"; }
  else if (/Firefox/.test(ua)) { device = "Firefox on desktop"; deviceType = "browser"; }

  return {
    id: "current",
    device,
    deviceType,
    location: "Nairobi, Kenya",
    lastActive: "Now",
    current: true,
  };
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
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [signingOutAll, setSigningOutAll] = useState(false);

  useEffect(() => {
    setSessions([getCurrentSession()]);
  }, []);

  function handleSignOutOthers() {
    // In a real app this would call an API. Here we just keep the current session.
    setSigningOutAll(true);
    setTimeout(() => {
      setSessions((prev) => prev.filter((s) => s.current));
      setSigningOutAll(false);
    }, 800);
  }

  function handleSignOutCurrent() {
    clearAppSession();
    window.location.replace("/");
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
        <div>
          <h1 className="text-[20px] font-bold text-[var(--ms-navy)]">Active sessions</h1>
          <p className="text-[12px] text-[var(--ms-mauve)]">Devices where you are signed in</p>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-4 pb-24">
        {/* Session list */}
        <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-start gap-3.5 px-4 py-4 ${i < sessions.length - 1 ? "border-b border-[var(--ms-border)]/60" : ""}`}
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ms-soft-bg)]">
                <DeviceIcon type={s.deviceType} className="h-5 w-5 text-[var(--ms-mauve)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-[var(--ms-navy)]">{s.device}</p>
                  {s.current && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      This device
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--ms-mauve)]">{s.location}</p>
                <p className="text-[11px] text-[var(--ms-mauve)]">Last active: {s.lastActive}</p>
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

        <div className="rounded-[18px] bg-[var(--ms-soft-bg)] px-4 py-4">
          <p className="text-[12px] leading-5 text-[var(--ms-mauve)]">
            <strong className="text-[var(--ms-navy)]">About sessions</strong> — Each device or browser you use to sign in creates a session.
            If you see a session you don&apos;t recognise, sign out of it immediately and change your password.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
