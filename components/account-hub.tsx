"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAppSession, readAppSession } from "@/lib/client-session";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/app-shell";

export function AccountHub() {
  const [session, setSession] = useState(readAppSession());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => setSession(readAppSession());
    sync();
    window.addEventListener("styld:app-session-change", sync);
    return () => window.removeEventListener("styld:app-session-change", sync);
  }, []);
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not sign out. Please try again.");
      clearAppSession();
      window.location.assign("/discover");
    } catch {
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }
  const isGuest = !session || session.role === "guest";

  return (
    <AppShell currentNav="profile" allowedRoles={["guest", "client", "professional", "salon", "super_admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6">
        <header className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[0_20px_60px_rgba(29,29,27,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Account hub</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-none text-[var(--text-primary)]">
            {isGuest ? "Welcome to STYLD" : "My STYLD account"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {isGuest
              ? "Sign in to access your personal workspace, saved content and account settings."
              : "Manage your role-specific workspace, account information and supported settings. No bookings, payments, fake notifications or fabricated account activity are displayed here."
            }
          </p>
          {isGuest && (
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/auth/sign-in?returnTo=%2Faccount" className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Sign in</Link>
              <Link href="/discover" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Discover</Link>
            </div>
          )}
        </header>

        {!isGuest && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Workspace", href: `/workspace/${session.role === "professional" ? "professional" : session.role === "salon" ? "salon" : "client"}`, description: "Open your role-specific workspace." },
              { label: "Profile", href: "/profile", description: "Personal account data and profile functionality." },
              { label: "Settings", href: "/settings", description: "Account preferences, privacy and security controls." },
              { label: "Messages", href: "/profile?tab=messages", description: "Supported authorized conversations only." },
              { label: "Requests", href: "/profile?tab=requests", description: "Supported requests and account tools only." },
              { label: "Activity", href: "/activity", description: "Genuine activity where authorized records exist." },
              { label: "Notifications", href: "/notifications", description: "Account notifications where supported." },
              { label: "Help & support", href: "/help", description: "Find help with your account." },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(29,29,27,0.08)]">
                <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">{item.label}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
              </Link>
            ))}
            <button disabled={busy} onClick={signOut} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 text-left disabled:opacity-50">
              {busy ? "Signing out..." : "Sign out"}
            </button>
            {error && <p role="alert">{error}</p>}
          </div>
        )}

        <section className="mt-6 rounded-[30px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-6">
          <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Account activity honesty</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Activity, messages, notifications and onboarding signals are shown only where genuine supported records exist. Unsupported counts, alerts and social analytics are not displayed.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
