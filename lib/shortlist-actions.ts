import type { PlanFields } from './plan-v2';
import type { PlanSnapshot } from './plan-client';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export type ShortlistAction = { type: 'add' | 'remove' | 'lead'; id: string } | { type: 'replace'; id: string; previousId: string };
export function changeShortlist(plan: PlanFields, action: ShortlistAction): PlanFields {
  if (!uuid.test(action.id)) throw new Error('Choose a real provider workspace.');
  action = { ...action, id: action.id.toLowerCase() };
  let ids = [...plan.shortlistProviderWorkspaceIds], leading = plan.leadingChoiceProviderWorkspaceId;
  if (action.type === 'add' && !ids.includes(action.id)) { if (ids.length === 3) throw new Error('Choose a provider to replace.'); ids.push(action.id); }
  if (action.type === 'remove') { ids = ids.filter(id => id !== action.id); if (leading === action.id) leading = null; }
  if (action.type === 'lead') { if (!ids.includes(action.id)) throw new Error('Choose a shortlisted provider.'); leading = leading === action.id ? null : action.id; }
  if (action.type === 'replace') {
    const previousId = action.previousId.toLowerCase();
    if (!ids.includes(previousId) || ids.includes(action.id)) throw new Error('Reload your shortlist before replacing a provider.');
    ids = ids.map(id => id === previousId ? action.id : id); if (leading === previousId) leading = null;
  }
  return { ...plan, shortlistProviderWorkspaceIds: ids, leadingChoiceProviderWorkspaceId: leading };
}
export const shortlistFingerprint = (plan: PlanFields) => JSON.stringify([plan.shortlistProviderWorkspaceIds, plan.leadingChoiceProviderWorkspaceId]);
export type ShortlistUndo = { identity: string; generation: number; revision: number; before: Pick<PlanFields, 'shortlistProviderWorkspaceIds' | 'leadingChoiceProviderWorkspaceId'>; after: string };
export function canUndoShortlist(receipt: ShortlistUndo | null, state: PlanSnapshot): boolean {
  return Boolean(receipt && state.identity === receipt.identity && state.generation === receipt.generation && state.revision === receipt.revision + 1 && !state.dirty && state.status === 'saved' && shortlistFingerprint(state.draft) === receipt.after);
}
