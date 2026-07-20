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
        <section className="mx-auto max-w-3xl overflow-hidden rounded-[38px] border border-[var(--ms-border)] bg-white p-6 text-center shadow-[0_22px_60px_rgba(13,27,42,0.1)] sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ms-petal)] text-[var(--ms-rose)] animate-bounce-subtle">
            <ShieldAlert className="h-7 w-7" />
          </div>
          
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ms-mauve)]">
            Access Restricted
          </p>
          
          <h1 className="mt-3 font-display text-4xl leading-tight text-[var(--ms-plum)] font-medium">
            This account does not have access.
          </h1>
          
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--ms-mauve)]">
            Mobile Salon secures workspaces according to account roles. You may be using a role (like client) that isn&apos;t authorized to access professional or administration panels.
          </p>
          
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(232,62,140,0.15)] hover:opacity-90 transition-opacity"
              href="/profile"
            >
              <UserCheck2 className="h-4 w-4" />
              Go to Profile
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-5 text-sm font-semibold text-[var(--ms-plum)] hover:bg-[var(--ms-soft-bg)] transition-colors"
              href="/home"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          
          <p className="mt-6 text-xs leading-6 text-[var(--ms-mauve)]">
            If you have multiple roles on your account, you can switch them inside your Profile workspace.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
