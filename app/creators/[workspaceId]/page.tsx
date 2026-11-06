import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { authPool } from '@/lib/auth-database';
import { readPublicDiscovery } from '@/lib/public-discovery';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Provider | STYLD', robots: { index: false, follow: false } };
export default async function CreatorProfilePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const result = await readPublicDiscovery(authPool, workspaceId);
  const provider = result.providers[0];
  if (!provider) notFound();
  return <AppShell currentNav="discover" showFooter><main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
    <Link href="/discover" className="underline">Back to Discover</Link>
    <h1 className="font-display text-3xl">{provider.displayName}</h1>
    <p>{[provider.specialty, provider.area].filter(Boolean).join(', ')}</p>
    <h2 className="text-xl font-semibold">Services</h2>
    {result.services.length ? <ul className="space-y-3">{result.services.map(service => <li key={service.id} className="rounded-2xl border p-4">
      <p className="font-semibold">{service.name}</p>
      {service.durationMinutes !== null && <p>{service.durationMinutes} minutes</p>}
      {service.price !== null && <p>KSh {service.price.toLocaleString('en-KE')}</p>}
    </li>)}</ul> : <p>No active services are listed yet.</p>}
    <p className="text-sm">Keep your conversations inside STYLD. Booking commitments are not available yet.</p>
  </main></AppShell>;
}
