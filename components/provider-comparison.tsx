"use client";
import Link from 'next/link';
import { useEffect } from 'react';
import { AppShell } from './app-shell';
import { planClient, useSharedPlan, editShortlist, shortlistReady } from './plan-state';
import { ShortlistTray, shortlistSecondary } from './shortlist';
import { comparePlanProvider } from '@/lib/compare-plan';
import { rememberLookOrigin, comparisonPosition, restoreComparisonPosition } from '@/lib/look-navigation';
export function ProviderComparison() {
  const state = useSharedPlan();
  useEffect(() => { if (state.data) restoreComparisonPosition(); }, [state.data]);
  const providers = state.draft.shortlistProviderWorkspaceIds.map(workspaceId => state.data?.comparisonProviders?.find(provider => provider.workspaceId === workspaceId)
    ?? { workspaceId, available: false, displayName: null, location: null, serviceMode: null });
  const leading = providers.find(provider => provider.available && provider.workspaceId === state.draft.leadingChoiceProviderWorkspaceId);
  const factsLoading = Boolean(state.data?.comparisonProviders && state.draft.shortlistProviderWorkspaceIds.some(id => !state.data!.comparisonProviders!.some(provider => provider.workspaceId === id)));
  const unavailable = providers.filter(provider => !provider.available);
  const rows: [string, keyof ReturnType<typeof comparePlanProvider>][] = [['Selected requirements','requirements'],['Listed price','price'],['Other charges','fees'],['General location','location'],['Service mode','mode'],['Stated hours','hours'],['Appointment availability','availability'],['Distance','distance'],['Verification','trust'],['Reviews and ratings','reviews'],['Cancellation and inclusions','terms']];
  return <AppShell currentNav="book"><div className="mx-auto w-full min-w-0 max-w-5xl pb-28">
    <h1 className="font-display text-3xl font-semibold">Compare your choices</h1><p className="mt-3 text-sm">The same saved Plan is used for every provider. A leading choice is a preference, not a reservation.</p>
    <p className="mt-2 text-sm">Prices are shown only for the exact selected services offered by that provider. Similar service names do not prove an equivalent offer.</p>
    <ShortlistTray inline />
    {!state.identity ? <p className="my-5"><Link href="/auth/sign-in?returnTo=%2Fcompare" className={shortlistSecondary}>Sign in to compare your saved plan</Link></p>
      : state.status === 'error' || state.status === 'conflict' ? <div role="alert" className="my-5"><p>{state.message}</p>
        {state.status === 'error' ? <button className={shortlistSecondary} onClick={() => void (state.dirty ? planClient.save() : planClient.load())}>Retry shortlist</button> : null}
        <Link href="/book" className={shortlistSecondary}>Review plan</Link></div>
      : state.status === 'loading' || !state.data ? <p role="status" className="my-5">Loading your saved shortlist...</p>
      : providers.length < 2 ? <section className="my-6"><h2 className="text-lg font-semibold">{providers.length ? 'Choose one more provider' : 'Your shortlist is empty'}</h2><p>Add two or three real providers from their Looks or profiles.</p><Link href="/discover?tab=looks" className={`${shortlistSecondary} mt-4`}>Find providers</Link></section> :
      factsLoading ? <p role="status" className="my-5">Loading provider details...</p> : <table className="my-5 w-full table-fixed border-collapse text-xs sm:text-sm" aria-label="Providers compared against the same Plan">
        <thead><tr>{providers.map((provider, index) => <th key={provider.workspaceId} scope="col" className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 align-top font-normal [overflow-wrap:anywhere]">
          <strong>{provider.displayName || `Unavailable provider ${index + 1}`}</strong><p className="my-2">{provider.available ? 'Active provider workspace' : 'Provider unavailable'}</p>
          <button type="button" className={`${shortlistSecondary} w-full px-1 text-xs`} aria-pressed={state.draft.leadingChoiceProviderWorkspaceId === provider.workspaceId} aria-label={`Make ${provider.displayName || `provider ${index + 1}`} leading choice`} disabled={!provider.available || !shortlistReady()} onClick={() => editShortlist({ type: 'lead', id: provider.workspaceId })}>{state.draft.leadingChoiceProviderWorkspaceId === provider.workspaceId ? 'Leading choice' : 'Choose'}</button>
          <button type="button" className={`${shortlistSecondary} mt-2 w-full px-1 text-xs`} aria-label={`Remove ${provider.displayName || `provider ${index + 1}`}`} disabled={!shortlistReady()} onClick={() => editShortlist({ type: 'remove', id: provider.workspaceId })}>Remove</button>
          {provider.available ? <Link className="mt-2 inline-flex min-h-11 min-w-11 items-center justify-center underline" href={`/creators/${provider.workspaceId}`} onClick={() => { comparisonPosition(); rememberLookOrigin(`/creators/${provider.workspaceId}`); }}>Profile</Link> : null}
        </th>)}</tr></thead>
        <tbody>{rows.map(([label, key]) => <tr key={key}>{providers.map((provider, index) => <td key={provider.workspaceId} className="border border-[var(--border-subtle)] p-2 align-top [overflow-wrap:anywhere]"><span className="mb-1 block text-[0.625rem] font-semibold sm:text-xs">{label}</span><span aria-label={`${provider.displayName || `provider ${index + 1}`}, ${label}`}>{comparePlanProvider(state.draft, state.data!, provider)[key]}</span></td>)}</tr>)}</tbody>
      </table>}
    {!factsLoading && unavailable.length > 0 && shortlistReady() ? <button type="button" className={shortlistSecondary} onClick={() => {
      const draft = planClient.getSnapshot().draft;
      const ids = draft.shortlistProviderWorkspaceIds.filter(id => !unavailable.some(provider => provider.workspaceId === id));
      planClient.edit({ ...draft, shortlistProviderWorkspaceIds: ids, leadingChoiceProviderWorkspaceId: ids.includes(draft.leadingChoiceProviderWorkspaceId ?? '') ? draft.leadingChoiceProviderWorkspaceId : null });
    }}>Remove unavailable providers</button> : null}
    {leading ? <Link href={`/creators/${leading.workspaceId}`} onClick={() => { comparisonPosition(); rememberLookOrigin(`/creators/${leading.workspaceId}`); }} className="my-5 inline-flex min-h-11 max-w-full items-center [overflow-wrap:anywhere] rounded-full bg-[var(--action-primary-bg)] px-5 py-3 font-semibold text-[var(--action-primary-text)]">View {leading.displayName || 'leading provider'} profile</Link> : <Link href="/book" className="my-5 inline-flex min-h-11 max-w-full items-center [overflow-wrap:anywhere] rounded-full bg-[var(--action-primary-bg)] px-5 py-3 font-semibold text-[var(--action-primary-text)]">Return to my Plan</Link>}
    <p className="text-sm">No appointment is reserved. Requests, booking and payments remain unavailable.</p>
  </div></AppShell>;
}
