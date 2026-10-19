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

const TARGET_TYPES = new Set(['professionals', 'salons']);

function isProvided(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function sanitizePlanContext(input) {
  const rawTargetType = input?.targetType;
  const rawTargetId = input?.targetId;
  const serviceIds = splitServiceIds(input?.serviceIds ?? input?.serviceId);

  const hasTargetType = isProvided(rawTargetType);
  const hasTargetId = isProvided(rawTargetId);

  // Neither provider field supplied: general browsing with an explicit service selection only.
  if (!hasTargetType && !hasTargetId) {
    return { mode: 'general', targetType: null, targetId: null, serviceIds };
  }

  const targetType = TARGET_TYPES.has(rawTargetType) ? rawTargetType : null;
  const targetId = isValidSlug(rawTargetId) ? rawTargetId : null;

  // Any partial, unsupported or malformed provider input is invalid, never general.
  if (!targetType || !targetId) {
    return { mode: 'invalid', targetType: null, targetId: null, serviceIds };
  }

  return { mode: 'provider', targetType, targetId, serviceIds };
}

function resolvePlanContext(context, { professionals, salons, services }) {
  const serviceIds = Array.isArray(context?.serviceIds) ? context.serviceIds : [];
  const selectedServices = serviceIds
    .map((id) => services.find((service) => service.id === id))
    .filter(Boolean);

  if (context?.mode === 'general') {
    return { mode: 'general', provider: null, services: selectedServices };
  }

  if (context?.mode !== 'provider' || !context.targetType || !context.targetId) {
    return { mode: 'invalid', provider: null, services: [] };
  }

  const collection =
    context.targetType === 'salons'
      ? salons
      : context.targetType === 'professionals'
        ? professionals
        : null;

  const target = collection?.find((item) => item.slug === context.targetId) ?? null;

  // A provider selection that does not resolve to a real catalogue record is invalid.
  if (!target) {
    return { mode: 'invalid', provider: null, services: [] };
  }

  const providerServiceIds = new Set(target.serviceIds ?? []);
  const resolvedServices = selectedServices.filter((service) => providerServiceIds.has(service.id));

  return { mode: 'provider', provider: target, services: resolvedServices };
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
