"use client";
import { useSyncExternalStore } from 'react';
import { createPlanClient } from '@/lib/plan-client';
import { APP_SESSION_EVENT, readAppSession } from '@/lib/client-session';
import { changeShortlist, canUndoShortlist, shortlistFingerprint, type ShortlistAction, type ShortlistUndo } from '@/lib/shortlist-actions';
let channel: BroadcastChannel | null = null, listening = false;
export const planClient = createPlanClient((...args) => fetch(...args), () => channel?.postMessage('changed'));
export const identityFor = (session: ReturnType<typeof readAppSession>) => {
  const workspaceId = (session as { workspaceId?: string } | null)?.workspaceId;
  return session?.role === 'client' && workspaceId ? JSON.stringify([session.id, workspaceId]) : null;
};
const emptyUi = { replace: null as string | null, undo: null as ShortlistUndo | null, message: '' };
let ui = emptyUi;
const uiListeners = new Set<() => void>();
const publishUi = (patch: Partial<typeof ui>) => { ui = { ...ui, ...patch }; uiListeners.forEach(fn => fn()); };
export function listen() {
  if (listening) return; listening = true;
  const sync = () => {
    const identity = identityFor(readAppSession());
    if (planClient.getSnapshot().identity !== identity) { planClient.identify(identity); publishUi(emptyUi); if (identity) void planClient.load(); }
  };
  window.addEventListener(APP_SESSION_EVENT, sync);
  window.addEventListener('focus', () => void planClient.load());
  if (typeof BroadcastChannel !== 'undefined') { channel = new BroadcastChannel('styld.plan.changed.v2'); channel.onmessage = () => void planClient.load(); }
  sync();
}
const subscribePlan = (listener: () => void) => { listen(); return planClient.subscribe(listener); };
const subscribeUi = (listener: () => void) => { uiListeners.add(listener); return () => { uiListeners.delete(listener); }; };
const uiSnapshot = () => ui, uiServerSnapshot = () => emptyUi;
export function useSharedPlan() { return useSyncExternalStore(subscribePlan, planClient.getSnapshot, planClient.getServerSnapshot); }
export function useShortlistUi() { return useSyncExternalStore(subscribeUi, uiSnapshot, uiServerSnapshot); }
export function shortlistReady() { const state = planClient.getSnapshot(); return Boolean(state.identity && state.data && !state.dirty && ['ready','saved'].includes(state.status)); }
export function editShortlist(action: ShortlistAction) {
  if (!shortlistReady()) return;
  const state = planClient.getSnapshot();
  if (action.type === 'add' && state.draft.shortlistProviderWorkspaceIds.length === 3 && !state.draft.shortlistProviderWorkspaceIds.includes(action.id)) { publishUi({ replace: action.id, message: '', undo: null }); return; }
  try {
    const next = changeShortlist(state.draft, action);
    if (shortlistFingerprint(next) === shortlistFingerprint(state.draft)) return;
    const undo = action.type === 'remove' || action.type === 'replace' ? { identity: state.identity!, generation: state.generation, revision: state.revision,
      before: { shortlistProviderWorkspaceIds: [...state.draft.shortlistProviderWorkspaceIds], leadingChoiceProviderWorkspaceId: state.draft.leadingChoiceProviderWorkspaceId }, after: shortlistFingerprint(next) } : null;
    publishUi({ replace: null, undo, message: action.type === 'remove' ? 'Provider removed. Undo is available after saving.' : action.type === 'lead' ? 'Leading choice updated. This is a preference, not a reservation.' : 'Shortlist updated.' });
    planClient.edit(next);
  } catch { publishUi({ message: 'Your shortlist changed. Reload your saved plan and try again.' }); }
}
export function cancelReplacement() { publishUi({ replace: null }); }
export function undoShortlist() {
  const state = planClient.getSnapshot();
  if (!canUndoShortlist(ui.undo, state)) { publishUi({ undo: null, message: 'Your plan changed. Undo is no longer available.' }); return; }
  const before = ui.undo!.before;
  publishUi({ undo: null, message: 'Previous choices restored.' });
  planClient.edit({ ...state.draft, ...before });
}
