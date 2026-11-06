'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Provider = { workspaceId: string; role: 'professional' | 'salon'; displayName: string; specialty: string | null; area: string };
export function PublicProviderList({ role, search = '', serviceIds = [] }: { role: Provider['role']; search?: string; serviceIds?: string[] }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<{ id: string; workspaceId: string; name: string }[]>([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setStatus('loading');
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch('/api/providers', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok || body.ok !== true || !Array.isArray(body.providers)) throw new Error('Unavailable');
      if (active) { setProviders(body.providers); setServices(Array.isArray(body.services) ? body.services : []); setStatus('ready'); }
    }).catch(() => { if (active) setStatus('error'); }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  if (status === 'loading') return <p role="status">Loading public profiles...</p>;
  if (status === 'error') return <div role="alert"><p>Profiles could not be loaded.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>;
  const term = search.trim().toLocaleLowerCase();
  const listed = providers.filter(provider => provider.role === role
    && (!serviceIds.length || services.some(service => service.workspaceId === provider.workspaceId && serviceIds.includes(service.id)))
    && (!term || [provider.displayName, provider.specialty, provider.area, ...services.filter(service => service.workspaceId === provider.workspaceId).map(service => service.name)].some(value => value?.toLocaleLowerCase().includes(term))));
  return listed.length ? <ul className="grid gap-4 sm:grid-cols-2">{listed.map(provider => <li key={provider.workspaceId} className="rounded-2xl border p-5">
    <Link href={`/creators/${provider.workspaceId}`} className="font-semibold underline">{provider.displayName}</Link>
    <p>{[provider.specialty, provider.area].filter(Boolean).join(', ')}</p>
  </li>)}</ul> : <p>No public profiles are listed yet.</p>;
}
