'use client';
import { useEffect, useRef, useState } from 'react';
import { marketAreas } from '@/lib/site-data';

export type PublicationState = { status: 'loading' | 'ready' | 'error'; enabled: boolean; listed: boolean; workspaceId?: string };

export function ProviderPublicationControl({ workspaceId, onState }: { workspaceId?: string; onState?: (state: PublicationState) => void }) {
  const [state, setState] = useState<PublicationState>({ status: 'loading', enabled: false, listed: false });
  const [area, setArea] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const report = useRef(onState);
  useEffect(() => { report.current = onState; }, [onState]);
  useEffect(() => { report.current?.(state); }, [state]);
  useEffect(() => {
    const current = ++generation.current;
    setState({ status: 'loading', enabled: false, listed: false, workspaceId });
    setArea(''); setMessage(''); setSaving(false);
    fetch('/api/providers/publication', { cache: 'no-store' }).then(async response => {
      const body = await response.json();
      if (!response.ok || body.ok !== true || !workspaceId || body.workspaceId !== workspaceId) throw new Error('Unavailable');
      if (generation.current === current) {
        setState({ status: 'ready', enabled: body.enabled === true, listed: body.listed === true, workspaceId });
        setArea(marketAreas.includes(body.area) ? body.area : '');
      }
    }).catch(() => {
      if (generation.current === current) {
        setMessage('Listing settings could not be loaded. Reload to try again.');
        setState({ status: 'error', enabled: false, listed: false, workspaceId });
      }
    });
    return () => { generation.current++; };
  }, [workspaceId]);
  async function save(next: boolean) {
    if (state.status !== 'ready' || state.workspaceId !== workspaceId || saving) return;
    const current = generation.current;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/providers/publication', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next, area, expectedWorkspaceId: workspaceId }) });
      const body = await response.json();
      if (!response.ok || body.ok !== true || body.workspaceId !== workspaceId) throw new Error(body.error || 'Listing preference could not be saved.');
      if (generation.current !== current) return;
      setState({ status: 'ready', enabled: body.enabled === true, listed: body.listed === true, workspaceId });
      setMessage(body.listed === true ? 'Your public listing is available.' : body.enabled === true ? 'Consent saved. Your profile is not currently eligible for public listing.' : 'Your profile is private.');
    } catch (error) {
      if (generation.current === current) {
        setMessage(error instanceof Error ? error.message : 'Listing preference could not be saved.');
        setState({ status: 'error', enabled: false, listed: false, workspaceId });
      }
    } finally { if (generation.current === current) setSaving(false); }
  }
  const ready = state.status === 'ready' && state.workspaceId === workspaceId;
  return <section className="space-y-3 rounded-2xl border p-4">
    <h2 className="font-semibold">Public listing</h2>
    <p className="text-sm">Private by default. After admin approval, you can share your display name, specialty, area and active services. Contacts and documents stay private.</p>
    <label className="block">Public area<select value={area} onChange={event => setArea(event.target.value)} disabled={!ready || saving} className="ml-3 rounded border p-2"><option value="">Choose your area</option>{marketAreas.map(item => <option key={item}>{item}</option>)}</select></label>
    <p>{!ready ? 'Listing status unavailable.' : state.listed ? 'Your public listing is available.' : state.enabled ? 'Consent is saved. Your profile is not currently listed.' : 'Your profile is private.'}</p>
    <button type="button" disabled={!ready || saving || (!state.enabled && !area)} onClick={() => save(!state.enabled)} className="rounded-full border px-4 py-2">{saving ? 'Saving...' : state.enabled ? 'Make profile private' : 'Enable public listing'}</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
