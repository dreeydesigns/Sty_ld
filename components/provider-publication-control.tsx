'use client';
import { useEffect, useState } from 'react';
import { marketAreas } from '@/lib/site-data';

export function ProviderPublicationControl({ workspaceId }: { workspaceId?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [area, setArea] = useState<string>(marketAreas[0]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetch('/api/providers/publication', { cache: 'no-store' }).then(async response => {
      const body = await response.json();
      if (!response.ok || body.ok !== true) throw new Error('Unavailable');
      if (active) { setEnabled(body.enabled === true); if (marketAreas.includes(body.area)) setArea(body.area); setStatus('ready'); }
    }).catch(() => { if (active) { setMessage('Listing settings could not be loaded. Reload to try again.'); setStatus('error'); } });
    return () => { active = false; };
  }, [workspaceId]);
  async function save(next: boolean) {
    setStatus('saving'); setMessage('');
    try {
      const response = await fetch('/api/providers/publication', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next, area }) });
      const body = await response.json();
      if (!response.ok || body.ok !== true) throw new Error(body.error || 'Listing preference could not be saved.');
      setEnabled(body.enabled === true); setMessage(next ? 'Public listing enabled.' : 'Your profile is private.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Listing preference could not be saved.'); }
    finally { setStatus('ready'); }
  }
  return <section className="space-y-3 rounded-2xl border p-4">
    <h2 className="font-semibold">Public listing</h2>
    <p className="text-sm">Private by default. After admin approval, you can share your display name, specialty, area and active services. Contacts and documents stay private.</p>
    <label className="block">Public area<select value={area} onChange={event => setArea(event.target.value)} disabled={status !== 'ready'} className="ml-3 rounded border p-2">{marketAreas.map(item => <option key={item}>{item}</option>)}</select></label>
    <p>{status === 'loading' ? 'Loading preference...' : enabled ? 'Public listing is enabled.' : 'Public listing is disabled.'}</p>
    <button type="button" disabled={status !== 'ready'} onClick={() => save(!enabled)} className="rounded-full border px-4 py-2">{enabled ? 'Make profile private' : 'Enable public listing'}</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
