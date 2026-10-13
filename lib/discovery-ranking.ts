import type { Professional, Salon } from "@/lib/site-data";
import { normalizeThemeKey, type ThemeKey } from "@/lib/personalization";

type DiscoverySort = "recommended" | "nearest" | "price-low" | "earliest";

function availabilityScore(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("today")) {
    return 100;
  }

  if (normalized.includes("tomorrow")) {
    return 82;
  }

  return 62;
}

function themeAffinityScore(affinity: ThemeKey[] | undefined, theme?: ThemeKey) {
  const normalizedTheme = normalizeThemeKey(theme);

  if (normalizedTheme === "not_set" || !affinity?.length) {
    return 0;
  }

  return affinity.includes(normalizedTheme) ? 14 : 0;
}

// Neutral ordering used only when the shopper asks for no specific sort.
// It deliberately ignores ratings, review counts and other unverified
// engagement figures so no fabricated metric can influence placement.
function sharedMarketplaceScore(item: { nextAvailable: string }) {
  return availabilityScore(item.nextAvailable) * 0.12;
}

export function scoreSalon(salon: Salon, theme?: ThemeKey) {
  const mobileBoost = salon.mobileService ? 8 : 0;

  return sharedMarketplaceScore(salon) + mobileBoost + themeAffinityScore(salon.themeAffinity, theme);
}

export function scoreProfessional(professional: Professional, theme?: ThemeKey) {
  const modeBoost = professional.serviceMode === "Both" ? 8 : professional.serviceMode === "Mobile" ? 6 : 3;
  const profileDepthBoost = Math.min(professional.gallery.length, 8) * 2;

  return sharedMarketplaceScore(professional) + modeBoost + profileDepthBoost + themeAffinityScore(professional.themeAffinity, theme);
}

export function rankSalons(items: Salon[], sortBy: DiscoverySort, theme?: ThemeKey) {
  return [...items].sort((left, right) => {
    if (sortBy === "price-low") {
      return left.startingPrice - right.startingPrice;
    }

    if (sortBy === "earliest") {
      return availabilityScore(right.nextAvailable) - availabilityScore(left.nextAvailable);
    }

    if (sortBy === "nearest") {
      return left.location.localeCompare(right.location);
    }

    return scoreSalon(right, theme) - scoreSalon(left, theme);
  });
}

export function rankProfessionals(items: Professional[], sortBy: DiscoverySort, theme?: ThemeKey) {
  return [...items].sort((left, right) => {
    if (sortBy === "price-low") {
      return left.startingPrice - right.startingPrice;
    }

    if (sortBy === "earliest") {
      return availabilityScore(right.nextAvailable) - availabilityScore(left.nextAvailable);
    }

    if (sortBy === "nearest") {
      return left.location.localeCompare(right.location);
    }

    return scoreProfessional(right, theme) - scoreProfessional(left, theme);
  });
}
