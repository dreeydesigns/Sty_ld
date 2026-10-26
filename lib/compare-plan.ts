import type { PlanData, PlanFields, ComparisonProvider } from './plan-v2';
import { summarizePlanSelection, formatListedPrice } from './plan-offer.cjs';
export function comparePlanProvider(plan: PlanFields, data: PlanData, provider: ComparisonProvider) {
  const services = plan.serviceIds.map(id => data.services.find(service => service.id === id));
  const matches = provider.available && services.length > 0 && services.every(service => service?.workspaceId === provider.workspaceId &&
    (!plan.creatorWorkspaceId || service.workspaceId === plan.creatorWorkspaceId));
  let summary = null;
  try { summary = matches ? summarizePlanSelection(services, { kind: 'listed', creatorWorkspaceId: provider.workspaceId }) : null; } catch { /* An invalid amount never becomes a quote. */ }
  return {
    price: summary?.complete ? `${formatListedPrice(summary.knownSubtotalCents)} listed subtotal` : 'Not provided',
    requirements: matches ? services.map(service => service!.name).join(', ') : 'Matching services unconfirmed',
    location: provider.available ? provider.location || 'Not provided' : 'Unavailable',
    mode: provider.available ? provider.serviceMode || 'Not provided' : 'Not provided',
    hours: 'Not provided', availability: 'Unconfirmed', distance: 'Not provided', trust: 'Not provided', reviews: 'Not provided', terms: 'Not provided',
    fees: 'Add-ons, taxes and travel unconfirmed',
  };
}
