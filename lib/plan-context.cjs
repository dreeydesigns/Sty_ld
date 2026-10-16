function isValidSlug(value) {
  return typeof value === 'string' && /^[a-z0-9-]+$/i.test(value) && value.length <= 60;
}

const MAX_SERVICE_IDS = 10;
const MAX_SERVICE_ID_LENGTH = 60;

function splitServiceIds(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /^[a-z0-9-]+$/i.test(item) && item.length <= MAX_SERVICE_ID_LENGTH)
    .filter((item, index, self) => self.indexOf(item) === index)
    .slice(0, MAX_SERVICE_IDS);
}

function sanitizePlanContext(input) {
  const targetType = input?.targetType === 'professionals' || input?.targetType === 'salons' ? input.targetType : null;
  const targetId = input?.targetId ? (isValidSlug(input.targetId) ? input.targetId : null) : null;
  const serviceIds = splitServiceIds(input?.serviceIds ?? input?.serviceId);
  return { targetType, targetId, serviceIds };
}

function resolvePlanContext(context, { professionals, salons, services }) {
  const { targetId } = context;

  const target =
    context.targetType === 'salons' && targetId
      ? salons.find((item) => item.slug === targetId) ?? null
      : context.targetType === 'professionals' && targetId
        ? professionals.find((item) => item.slug === targetId) ?? null
        : null;

  const getServiceById = (id) => services.find((service) => service.id === id);
  const allSelectedServices = context.serviceIds.map((id) => getServiceById(id)).filter(Boolean);

  if (!context.targetId) {
    return { provider: null, services: allSelectedServices };
  }

  if (!target) {
    return { provider: null, services: [] };
  }

  const providerServiceIds = new Set(target.serviceIds);
  const resolvedServices = allSelectedServices.filter((service) => providerServiceIds.has(service.id));

  return { provider: target, services: resolvedServices };
}

function isValidReturnDestination(url) {
  if (typeof url !== 'string' || !url.startsWith('/')) return false;
  if (url.includes('://') || url.startsWith('//')) return false;
  return /^\/[A-Za-z0-9/?=&%_.-]*$/.test(url);
}

module.exports = {
  isValidSlug,
  splitServiceIds,
  sanitizePlanContext,
  resolvePlanContext,
  isValidReturnDestination,
};
