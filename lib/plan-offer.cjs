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

function summarizePlanSelection(selectedServices) {
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
  matchesPlanServiceIds,
};
