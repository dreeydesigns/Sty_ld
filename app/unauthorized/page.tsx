"use client";

import Link from "next/link";
import { ShieldAlert, UserCheck2, Home } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function UnauthorizedPage() {
  return (
    <AppShell
      currentNav="profile"
      requireSession={false}
      showBottomNav={true}
      showFooter={false}
    >
      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl overflow-hidden rounded-[38px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 text-center shadow-[0_22px_60px_rgba(0,0,0,0.1)] sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--color-clay-text)] animate-bounce-subtle">
            <ShieldAlert className="h-7 w-7" />
          </div>
          
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Access Restricted
          </p>
          
          <h1 className="mt-3 font-display text-4xl leading-tight text-[var(--text-primary)] font-medium">
            This account does not have access.
          </h1>
          
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
            Styld secures workspaces according to account roles. You may be using a role (like client) that isn&apos;t authorized to access professional or administration panels.
          </p>
          
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-text)] shadow-sm hover:opacity-90 transition-opacity"
              href="/profile"
            >
              <UserCheck2 className="h-4 w-4" />
              Go to Profile
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
              href="/home"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          
          <p className="mt-6 text-xs leading-6 text-[var(--text-muted)]">
            If you have multiple roles on your account, you can switch them inside your Profile workspace.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
