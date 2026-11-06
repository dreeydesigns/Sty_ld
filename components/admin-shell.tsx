'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { StyldLockup } from '@/components/styld-logo';

const sections = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/applications', label: 'Applications' },
  { href: '/admin/content', label: 'Content review' },
  { href: '/admin/security', label: 'Security and audit' },
];
export function AdminShell({ children, identity, clientWorkspaceId }: { children: ReactNode; identity: string; clientWorkspaceId?: string }) {
  const path = usePathname();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');
  async function switchToClient() {
    if (!clientWorkspaceId || switching) return;
    setSwitching(true); setSwitchError('');
    try {
      const response = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId: clientWorkspaceId }) });
      const body = await response.json();
      if (!response.ok || body.success !== true || body.new_role !== 'client' || body.workspaceId !== clientWorkspaceId) throw new Error();
      window.location.assign('/home');
    } catch { setSwitchError('Workspace could not be switched. Try again.'); setSwitching(false); }
  }
  return <div className="min-h-dvh bg-[var(--bg-page)] text-[var(--text-primary)]">
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link href="/admin" aria-label="STYLD Admin overview"><StyldLockup size={28} variant="auto" /></Link>
        <div className="min-w-0 text-xs"><p className="font-semibold">Admin Command Centre</p><p className="mt-1 break-all text-[var(--text-secondary)]">{identity} · Platform administration</p></div>
        {clientWorkspaceId && <button disabled={switching} onClick={() => void switchToClient()} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border-subtle)] px-3 text-sm disabled:opacity-50">{switching ? 'Switching...' : 'Switch to Client'}</button>}
      </div>
    </header>
    <div className="mx-auto max-w-7xl md:grid md:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label="Admin navigation" className="border-b border-[var(--border-subtle)] p-3 md:min-h-[calc(100dvh-5rem)] md:border-b-0 md:border-r">
        <div className="flex gap-2 overflow-x-auto pb-1 md:sticky md:top-4 md:flex-col">
          {sections.map(section => <Link key={section.href} href={section.href} aria-current={path === section.href ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 py-2 text-sm font-medium ${path === section.href ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--surface-elevated)]'}`}>{section.label}</Link>)}
        </div>
      </nav>
      <div className="min-w-0 pb-[calc(2rem+env(safe-area-inset-bottom))]">{switchError && <p role="alert" className="m-4 rounded-xl border p-3 text-sm">{switchError}</p>}{children}</div>
    </div>
  </div>;
}
