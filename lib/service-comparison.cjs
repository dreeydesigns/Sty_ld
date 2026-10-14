function buildProfessionalComparisonItems(professionals, services) {
  return professionals.flatMap((professional) =>
    (professional.serviceIds || [])
      .map((id) => services.find((service) => service.id === id))
      .filter(Boolean)
      .map((service) => ({
        key: professional.slug + ":" + service.id,
        providerName: professional.name,
        providerType: "professional",
        providerSlug: professional.slug,
        service,
      }))
  );
}

function buildSalonComparisonItems(salons, services) {
  return salons.flatMap((salon) =>
    (salon.serviceIds || [])
      .map((id) => services.find((service) => service.id === id))
      .filter(Boolean)
      .map((service) => ({
        key: salon.slug + ":" + service.id,
        providerName: salon.name,
        providerType: "salon",
        providerSlug: salon.slug,
        service,
      }))
  );
}

function canCompare(keys) {
  return new Set(keys).size === keys.length && keys.length >= 2;
}

function mergeSelection(keys, next) {
  return keys.includes(next) || keys.length >= 4 ? keys : [...keys, next];
}

function removeSelection(keys, remove) {
  return keys.filter((value) => value !== remove);
}

function priceLabel(service) {
  return service.minPrice === service.maxPrice
    ? "KES " + service.minPrice
    : "KES " + service.minPrice + "-" + service.maxPrice;
}

function durationLabel(service) {
  return service.durationMin === service.durationMax
    ? service.durationMin + " minutes"
    : service.durationMin + "-" + service.durationMax + " minutes";
}

module.exports = {
  buildProfessionalComparisonItems,
  buildSalonComparisonItems,
  canCompare,
  mergeSelection,
  removeSelection,
  priceLabel,
  durationLabel,
};
