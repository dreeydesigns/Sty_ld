const MAX_PLAN_SERVICES = 10;

function listServicesForProvider(provider, services) {
  if (!provider) return services;
  const providerServiceIds = new Set(provider.serviceIds ?? []);
  return services.filter((service) => providerServiceIds.has(service.id));
}

function planServicePool(mode, provider, services) {
  if (mode === 'invalid') return [];
  if (mode === 'provider') return provider ? listServicesForProvider(provider, services) : [];
  return services;
}

function serviceCategoriesFor(services) {
  const categories = [];
  for (const service of services) {
    if (!categories.includes(service.category)) categories.push(service.category);
  }
  return categories;
}

function filterServicesByCategory(services, category) {
  if (!category || category === 'All') return services;
  return services.filter((service) => service.category === category);
}

function toggleServiceSelection(selectedIds, serviceId) {
  if (!Array.isArray(selectedIds)) return [];
  if (typeof serviceId !== 'string' || !serviceId) return selectedIds;
  if (selectedIds.includes(serviceId)) return selectedIds.filter((id) => id !== serviceId);
  if (selectedIds.length >= MAX_PLAN_SERVICES) return selectedIds;
  return [...selectedIds, serviceId];
}

function listedPriceInCents(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value), cents = Math.round(number * 100);
  return Number.isFinite(number) && number >= 0 && Number.isSafeInteger(cents) && Math.abs(number * 100 - cents) < 0.00001 ? cents : null;
}

function formatListedPrice(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) return 'Not provided';
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
}

function summarizePlanSelection(selectedServices, options = {}) {
  if (options.kind === 'listed') {
    if (!Array.isArray(selectedServices) || selectedServices.length > MAX_PLAN_SERVICES) throw new Error('Invalid estimate selection');
    const seen = new Set();
    const lines = selectedServices.map((service) => {
      if (!service || typeof service.id !== 'string' || seen.has(service.id)) throw new Error('Invalid estimate selection');
      seen.add(service.id);
      const mismatch = Boolean(options.creatorWorkspaceId && service.workspaceId && options.creatorWorkspaceId !== service.workspaceId);
      const eligible = Boolean(service.workspaceId && !service.unavailable && !mismatch && !options.creatorUnavailable);
      return { ...service, cents: eligible ? listedPriceInCents(service.price) : null,
        durationMinutes: eligible && Number.isSafeInteger(service.durationMinutes) && service.durationMinutes > 0 ? service.durationMinutes : null,
        problem: service.unavailable ? 'This service or provider is no longer available.' : mismatch ? 'This service does not belong to the selected creator.' : options.creatorUnavailable ? 'The selected creator is no longer available.' : !service.workspaceId ? 'Catalogue interest. A provider price has not been provided.' : null };
    });
    const priced = lines.filter((line) => line.cents !== null);
    const knownSubtotalCents = priced.length ? priced.reduce((sum, line) => sum + line.cents, 0) : null;
    if (knownSubtotalCents !== null && !Number.isSafeInteger(knownSubtotalCents)) throw new Error('Estimate amount is too large');
    return { lines, knownSubtotalCents, complete: lines.length > 0 && priced.length === lines.length,
      multipleProviders: new Set(lines.filter((line) => line.workspaceId).map((line) => line.workspaceId)).size > 1 };
  }
  if (!Array.isArray(selectedServices) || selectedServices.length === 0) return null;
  return selectedServices.reduce(
    (summary, service) => ({
      count: summary.count + 1,
      minTotal: summary.minTotal + service.minPrice,
      maxTotal: summary.maxTotal + service.maxPrice,
      durationMin: summary.durationMin + service.durationMin,
      durationMax: summary.durationMax + service.durationMax,
    }),
    { count: 0, minTotal: 0, maxTotal: 0, durationMin: 0, durationMax: 0 },
  );
}

function matchesPlanServiceIds(providerServiceIds, planServiceIds) {
  if (!Array.isArray(providerServiceIds) || !Array.isArray(planServiceIds)) return false;
  if (providerServiceIds.length === 0 || planServiceIds.length === 0) return false;
  return providerServiceIds.some((id) => planServiceIds.includes(id));
}

module.exports = {
  MAX_PLAN_SERVICES,
  planServicePool,
  serviceCategoriesFor,
  filterServicesByCategory,
  toggleServiceSelection,
  summarizePlanSelection,
  listedPriceInCents,
  formatListedPrice,
  matchesPlanServiceIds,
};
