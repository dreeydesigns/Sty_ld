"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { SettingsUI } from "@/components/settings-ui";

export default function SettingsPage() {
  return (
    <AppShell currentNav="settings" showBottomNav>
      <Suspense fallback={<div role="status" className="mt-16 text-center"><div className="loader-bloom mx-auto h-14 w-14" aria-hidden="true" /><p className="mt-5 text-sm font-semibold text-[var(--color-secondary)]">Loading your settings.</p></div>}>
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)] shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <Settings className="h-5 w-5 text-[var(--color-primary)]" strokeWidth={1.85} />
            <h1 className="text-[20px] font-bold text-[var(--text-primary)]">Settings</h1>
          </div>
        </div>

        <nav className="mb-5 flex flex-wrap gap-4">
          <Link href="/settings/security" className="underline">Security & devices</Link>
          <Link href="/settings/workspaces" data-tour="settings-workspaces" className="underline">Workspaces & services</Link>
          <Link href="/settings/privacy" className="underline">Privacy</Link>
        </nav>

        <SettingsUI />
      </Suspense>
    </AppShell>
  );
}