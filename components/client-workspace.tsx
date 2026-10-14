"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { readAppSession } from "@/lib/client-session";

export function ClientWorkspace() {
  const [session, setSession] = useState(readAppSession());

  useEffect(() => {
    const sync = () => setSession(readAppSession());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("styld:app-session-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("styld:app-session-change", sync);
    };
  }, []);

  if (!session || session.role !== "client") {
    return (
      <AppShell currentNav="profile" allowedRoles={["guest", "client", "super_admin"]}>
        <section className="mx-auto mt-8 max-w-3xl rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Client account required</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            This workspace belongs to an authenticated client account. Guests can still browse discovery and appointment planning.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/auth/sign-in?returnTo=%2Fworkspace%2Fclient" className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Sign in</Link>
            <Link href="/discover" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Discover</Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell currentNav="profile" allowedRoles={["client", "super_admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6">
        <header className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[0_20px_60px_rgba(29,29,27,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Client workspace</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-none text-[var(--text-primary)]">
            {session.firstName}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{session.location?.label ?? "Location not set"} · {session.theme.replace("_", " ")} theme</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              Appearance and account on this device
            </span>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              No bookings, payments or appointments
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Preference profile</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4"><p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Theme</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{session.theme.replace("_", " ")}</p></div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4"><p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Tribe badge</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{session.tribeBadge}</p></div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4"><p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Quiz completed</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{session.quizCompleted ? "Yes" : "Pending"}</p></div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4"><p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Subscription</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{session.subscription.tier} · {session.subscription.status}</p></div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Account activity</h2>
              <p className="mt-3 rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                This account stores theme, appearance and login information for this device. There are no live bookings, confirmed appointments, payment history or provider relationships to display.
              </p>
              <Link href="/profile" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Open detailed STYLD profile</Link>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Privacy and security</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Social data remains browser-local and is still being isolated from other accounts before production. Passwords, OTP and session behaviour continue to use the existing Better Auth implementation.</p>
              <Link href="/settings" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Account settings</Link>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Next exploration</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/discover" className="inline-flex rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">Discover</Link>
                <Link href="/service-comparison" className="inline-flex rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">Compare</Link>
                <Link href="/book" className="inline-flex rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">Plan</Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
