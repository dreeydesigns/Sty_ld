import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { authPool } from '@/lib/auth-database';
import { readPublicDiscovery } from '@/lib/public-discovery';
export const dynamic = 'force-dynamic';
export default async function ServiceComparisonPage() {
  const { providers, services } = await readPublicDiscovery(authPool);
  return <AppShell currentNav="discover"><main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
    <Link href="/discover" className="underline">Back to Discover</Link>
    <h1 data-tour="comparison-summary" className="font-display text-3xl">Compare listed services</h1>
    <p>These active services come from providers who have chosen to appear publicly. Booking commitments are not available yet.</p>
    {services.length ? <div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Active public service offers</caption>
      <thead><tr><th className="p-3">Service</th><th className="p-3">Provider</th><th className="p-3">Area</th><th className="p-3">Duration</th><th className="p-3">Listed price</th></tr></thead>
      <tbody>{services.map(service => { const provider = providers.find(item => item.workspaceId === service.workspaceId); return <tr key={service.id} className="border-t">
        <td className="p-3">{service.name}</td><td className="p-3"><Link className="underline" href={'/creators/' + service.workspaceId}>{provider?.displayName}</Link></td><td className="p-3">{provider?.area}</td>
        <td className="p-3">{service.durationMinutes === null ? 'Not listed' : service.durationMinutes + ' minutes'}</td><td className="p-3">{service.price === null ? 'Not listed' : 'KSh ' + service.price.toLocaleString('en-KE')}</td>
      </tr>; })}</tbody></table></div> : <p>No public service offers are listed yet.</p>}
  </main></AppShell>;
}
