"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";


import { AppShell } from "@/components/app-shell";
import { SettingsUI } from "@/components/settings-ui";

export default function SettingsPage() {
  const t = (k: string) => k;

  return (
    <AppShell currentNav="profile" showBottomNav>
      <Suspense fallback={<div className="loader-bloom mx-auto mt-16 h-14 w-14" />}>
        {/* Page header */}
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

        <SettingsUI />
      </Suspense>
    </AppShell>
  );
}
