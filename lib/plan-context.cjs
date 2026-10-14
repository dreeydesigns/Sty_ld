function isValidSlug(value) {
  return typeof value === "string" && /^[a-z0-9-]+$/i.test(value);
}

function splitServiceIds(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /^[a-z0-9-]+$/i.test(item));
}

function sanitizePlanContext(input) {
  const targetType = input?.targetType === "professionals" || input?.targetType === "salons" ? input.targetType : null;
  const targetId = isValidSlug(input?.targetId) ? input.targetId : null;
  const serviceIds = splitServiceIds(input?.serviceIds ?? input?.serviceId);
  return { targetType, targetId, serviceIds };
}

function isValidReturnDestination(url) {
  if (typeof url !== "string" || !url.startsWith("/")) return false;
  if (url.includes("://") || url.startsWith("//")) return false;
  return /^\/[A-Za-z0-9/?=&%_.-]*$/.test(url);
}

module.exports = {
  isValidSlug,
  splitServiceIds,
  sanitizePlanContext,
  isValidReturnDestination,
};
