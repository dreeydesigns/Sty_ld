'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
type Counts = { pending_professionals: number; pending_salons: number; approved_providers: number; pending_content: number };
export function AdminOverview() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || body.ok !== true || !body.counts || Object.values(body.counts).some(value => typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)) throw new Error();
      setCounts(body.counts);
    } catch { setCounts(null); setError('Overview could not be loaded. Try again.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const cards = counts ? [
    { label: 'Professional applications', value: counts.pending_professionals, detail: 'Awaiting review', href: '/admin/applications?role=professional&status=pending' },
    { label: 'Salon applications', value: counts.pending_salons, detail: 'Awaiting review', href: '/admin/applications?role=salon&status=pending' },
    { label: 'Approved provider workspaces', value: counts.approved_providers, detail: 'Active accounts, including private profiles', href: '/admin/applications?status=approved' },
    { label: 'Content awaiting review', value: counts.pending_content, detail: 'Community posts', href: '/admin/content' },
  ] : [];
  return <main className="space-y-5 p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">Operations</p><h1 className="mt-1 text-2xl font-semibold">Overview</h1></div><button onClick={() => void load()} className="min-h-11 rounded-xl border px-3 text-sm">Refresh</button></div>
    <p className="text-sm text-[var(--text-secondary)]">Real queues from this environment. Open a queue to review its records.</p>
    {error ? <p role="alert" className="rounded-xl border p-4 text-sm">{error}</p> : !counts ? <p role="status">Loading overview...</p> : <div className="grid gap-3 sm:grid-cols-2">{cards.map(card => <Link key={card.href} href={card.href} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 transition hover:border-[var(--color-clay)]"><p className="text-sm font-medium">{card.label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{card.value}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">{card.detail}</p></Link>)}</div>}
    <section className="rounded-2xl border p-4 text-sm"><h2 className="font-semibold">Keep decisions accountable</h2><p className="mt-2 text-[var(--text-secondary)]">Review each application separately. Approval does not create a verification badge or publish a provider profile.</p><Link href="/admin/security" className="mt-3 inline-flex min-h-11 items-center rounded-xl border px-3 font-medium">Open security and audit</Link></section>
  </main>;
}
