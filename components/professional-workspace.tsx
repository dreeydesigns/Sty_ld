"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { readAppSession } from "@/lib/client-session";

export function ProfessionalWorkspace() {
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

  if (!session || session.role !== "professional") {
    return (
      <AppShell currentNav="profile" allowedRoles={["guest", "professional", "super_admin"]}>
        <section className="mx-auto mt-8 max-w-3xl rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Professional account required</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            This workspace belongs to an authorised Professional account. Guests and clients cannot view it.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/auth/sign-in?returnTo=%2Fworkspace%2Fprofessional" className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Sign in</Link>
            <Link href="/discover" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Discover</Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell currentNav="profile" allowedRoles={["professional", "super_admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6">
        <header className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[0_20px_60px_rgba(29,29,27,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Professional workspace</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-none text-[var(--text-primary)]">{session.displayName}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{session.specialty} · {session.serviceMode.replace("_", " ")} · {session.location}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              Professional account on this device
            </span>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              No fake followers, earnings, appointments or bookings
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <section className="space-y-5">
            {session.profilePhoto && (
              <div className="overflow-hidden rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
                <img src={session.profilePhoto} alt={session.displayName} className="aspect-[16/9] w-full object-cover" />
                <div className="p-4 text-xs text-[var(--text-muted)]">Profile photograph from this professional account. It is not presented as a client portfolio.</div>
              </div>
            )}

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Identity and services</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{session.bio || "No supporting bio has been provided for this account."}</p>
              <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
                Areas served: {session.areasServed.join(", ") || "not available"}. Published services and portfolio remain tied to supported account data only.
              </p>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Supported work tools</h2>
              <ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">Account profile and image settings can use existing profile management screens.</li>
                <li className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">Requests, messages, plans and account settings are linked below; their actual availability is unchanged.</li>
                <li className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">Booking commitments and payments remain disabled.</li>
              </ul>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Workspace actions</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/profile?tab=requests" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Requests and services</Link>
                <Link href="/profile?tab=messages" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Messages</Link>
                <Link href="/settings" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Settings</Link>
              </div>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Role security</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                You are signed in as a Professional. This page does not expose client, Salon, shop or delivery account data. Sessions remain handled by the existing Better Auth system.
              </p>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Public identity</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {session.publicSlug ? `Your public professional slug is ${session.publicSlug}. Catalogue-based article or record links are separate sample data.` : "No public professional profile slug is available for this account."}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
