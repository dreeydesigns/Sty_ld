"use client";
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { canUndoShortlist } from '@/lib/shortlist-actions';
import { planClient, useSharedPlan, useShortlistUi, shortlistReady, editShortlist, undoShortlist, cancelReplacement } from './plan-state';
export const shortlistSecondary = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50';
export function ShortlistButton({ workspaceId, name }: { workspaceId: string; name: string }) {
  const state = useSharedPlan();
  const path = usePathname();
  if (!state.identity) return <Link className={shortlistSecondary} href={`/auth/sign-in?returnTo=${encodeURIComponent(path)}`} onClick={event => { event.preventDefault(); window.location.assign(`/auth/sign-in?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`); }}>Sign in to compare</Link>;
  const selected = state.draft.shortlistProviderWorkspaceIds.includes(workspaceId);
  return <button type="button" className={shortlistSecondary} aria-pressed={selected} aria-label={`${selected ? 'Remove' : 'Shortlist'} ${name}`} disabled={!shortlistReady()}
    onClick={event => { event.stopPropagation(); editShortlist({ type: selected ? 'remove' : 'add', id: workspaceId }); }}>{selected ? 'Shortlisted' : 'Compare'}</button>;
}
export function ShortlistTray({ inline = false }: { inline?: boolean } = {}) {
  const state = useSharedPlan(), ui = useShortlistUi(), path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null), restoreFocus = useRef<HTMLElement | null>(null);
  const ids = state.draft.shortlistProviderWorkspaceIds;
  const name = (id: string) => state.data?.comparisonProviders?.find(provider => provider.workspaceId === id)?.displayName || `Provider ${ids.indexOf(id) + 1}`;
  useEffect(() => {
    if (ui.replace && !dialog.current?.open) { restoreFocus.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    if (!ui.replace && dialog.current?.open) { dialog.current.close(); if (restoreFocus.current?.isConnected && !(restoreFocus.current as HTMLButtonElement).disabled) restoreFocus.current.focus(); else document.getElementById('shortlist-link')?.focus(); }
  }, [ui.replace]);
  const error = state.status === 'error' || state.status === 'conflict';
  if (!state.identity || (!ids.length && !ui.undo) || (path === '/compare' && !inline)) return null;
  return <>
    {!inline && (ids.length || ui.undo) ? <div aria-hidden="true" className="h-36 shrink-0" /> : null}
    <aside aria-label="Plan shortlist" className={`${inline ? 'relative my-4' : 'fixed inset-x-2 bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-4'} z-30 mx-auto max-w-3xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-[var(--text-primary)] shadow-md`}>
      <div className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-xs font-semibold">{ids.length} of 3</span><span className="min-w-0 flex-1 truncate text-xs">{ids.map(name).join(', ')}</span><Link id="shortlist-link" href={path === '/compare' ? '/book' : '/compare'} className={`${shortlistSecondary} shrink-0`}>{path === '/compare' ? 'Plan' : 'Compare'}</Link></div>
      {(path !== '/compare' || ids.length < 2) && ids.length ? <div className="flex gap-1">{ids.map((id, index) => <button key={id} type="button" className={`${shortlistSecondary} min-w-0 flex-1 truncate px-1 text-xs`} aria-label={`Remove ${name(id)}`} disabled={!shortlistReady()} onClick={() => editShortlist({ type: 'remove', id })}>Remove {index + 1}</button>)}</div> : null}
      <div role="status" aria-live="polite" className="text-xs">{error ? state.message : state.status === 'saving' ? 'Saving shortlist...' : ui.message}</div>
      {ui.undo ? <button type="button" className={`${shortlistSecondary} text-xs`} disabled={!canUndoShortlist(ui.undo, state)} onClick={undoShortlist}>Undo shortlist change</button> : null}
      {error ? <Link href="/book" className={shortlistSecondary}>Review plan conflict or retry</Link> : null}
    </aside>
    <dialog ref={dialog} aria-labelledby="shortlist-replace-title" onCancel={cancelReplacement} className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 text-[var(--text-primary)] backdrop:bg-black/50">
      <h2 id="shortlist-replace-title" className="text-xl font-semibold">Replace a provider?</h2><p className="my-3 text-sm">Your plan holds up to three providers. Choose one to replace.</p>
      <div className="grid gap-2">{ids.map(id => <button key={id} type="button" className={shortlistSecondary} disabled={!shortlistReady()} onClick={() => ui.replace && editShortlist({ type: 'replace', id: ui.replace, previousId: id })}>Replace {name(id)}</button>)}<button type="button" className={shortlistSecondary} onClick={cancelReplacement}>Keep my choices</button></div>
    </dialog>
  </>;
}
