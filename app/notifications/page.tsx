"use client";

import Link from "next/link";
import { readAppSession } from "@/lib/client-session";
import { AppShell } from "@/components/app-shell";

export default function NotificationsPage() {
  const session = readAppSession();
  const isGuest = !session || session.role === "guest";

  return (
    <AppShell currentNav="profile" allowedRoles={["guest", "client", "professional", "salon", "super_admin"]}>
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Notifications</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--text-primary)]">
            {isGuest ? "Sign in to view notifications" : "Your notifications"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {isGuest
              ? "Sign in to see account-specific notifications."
              : "You have no notifications at this time. Genuine account notifications will appear here when available."}
          </p>
        </header>

        <section className="rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-8 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            There are no notifications to display. Genuine notifications (e.g., account updates, security alerts) will appear here when they exist.
          </p>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            No fake notification counts or fabricated alerts are shown.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link href="/account" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">
            Back to Account Hub
          </Link>
          <Link href="/discover" className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">
            Discover
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
