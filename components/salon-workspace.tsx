"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { readAppSession, type AppUserSession } from "@/lib/client-session";

export function SalonWorkspace() {
  const [session, setSession] = useState(readAppSession());
  const isSalon = session?.role === "salon";

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

  if (!session || !isSalon) {
    return (
      <AppShell currentNav="profile" allowedRoles={["guest", "salon", "super_admin"]}>
        <section className="mx-auto mt-8 max-w-3xl rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Salon account required</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            This workspace belongs to an authenticated Salon account. Guests, clients and professionals cannot view it.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/auth/sign-in?returnTo=%2Fworkspace%2Fsalon" className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Sign in</Link>
            <Link href="/discover" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Discover</Link>
          </div>
        </section>
      </AppShell>
    );
  }

  const salon = session as Extract<AppUserSession, { role: "salon" }>;

  return (
    <AppShell currentNav="profile" allowedRoles={["salon", "super_admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6">
        <header className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[0_20px_60px_rgba(29,29,27,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Salon workspace</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-none text-[var(--text-primary)]">{salon.salonName}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{salon.contactName} · {salon.location} · {salon.plan} membership</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              Salon account on this device
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${salon.listingPublished ? "border-[var(--color-clay)] bg-[rgba(192,160,144,0.08)] text-[var(--color-clay-text)]" : "border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-secondary)]"}`}>
              {salon.listingPublished ? "Public listing indicated by account metadata" : "No verified published listing"}
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <section className="space-y-5">
            {salon.profilePhoto && (
              <div className="overflow-hidden rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
                <img src={salon.profilePhoto} alt={salon.salonName} className="aspect-[16/9] w-full object-cover" />
                <div className="p-4 text-xs text-[var(--text-muted)]">Business image from this Salon account. It is not represented as proof of a published portfolio.</div>
              </div>
            )}

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Business profile</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{salon.description}</p>
              <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
                Team count and service count reflect supported account metadata, not live employment, applicants, transactions or availability.
              </p>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Services and public work</h2>
              <ol className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">Linked services count: {salon.servicesCount} (supported where the account record establishes them).</li>
                <li className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">Linked team members: {salon.teamCount}. Only existing authorized relationships may be shown; no sample employees are generated.</li>
                <li className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">Live bookings, payments, appointment requests and engagement statistics remain disabled.</li>
              </ol>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Business tools</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/profile?tab=requests" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Requests and services</Link>
                <Link href="/profile?tab=messages" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Messages</Link>
                <Link href="/settings" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Settings</Link>
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
                Links use existing routes. Unsupported editing or saving is not presented as working.
              </p>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Privacy and ownership</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                You are signed in as an authorized Salon account. This page does not expose Client, Professional, shop or delivery account data. Social data remains browser-local and is not represented as secure account data.
              </p>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Public business discovery</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {salon.publicSlug ? `Your public salon slug is ${salon.publicSlug}. Marketplace catalogue records remain separate sample data.` : "No public salon slug is available for this account."}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
