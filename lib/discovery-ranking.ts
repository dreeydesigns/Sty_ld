import type { Professional, Salon } from "@/lib/site-data";
import { normalizeThemeKey, type ThemeKey } from "@/lib/personalization";

type DiscoverySort = "top-rated" | "nearest" | "price-low" | "earliest";

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

function responseScore(minutes: number) {
  return Math.max(0, 100 - minutes * 4);
}

function themeAffinityScore(affinity: ThemeKey[] | undefined, theme?: ThemeKey) {
  const normalizedTheme = normalizeThemeKey(theme);

  if (normalizedTheme === "not_set" || !affinity?.length) {
    return 0;
  }

  return affinity.includes(normalizedTheme) ? 14 : 0;
}

function sharedMarketplaceScore(item: {
  verified: boolean;
  rating: number;
  reviewCount: number;
  responseSpeedMinutes: number;
  completionRate: number;
  repeatBookings: number;
  savedCount: number;
  trendingScore: number;
  nextAvailable: string;
}) {
  const verification = item.verified ? 22 : 0;
  const rating = item.rating * 12;
  const reviews = Math.min(item.reviewCount, 260) / 13;
  const response = responseScore(item.responseSpeedMinutes) * 0.12;
  const completion = item.completionRate * 0.16;
  const repeats = Math.min(item.repeatBookings, 220) * 0.05;
  const saves = Math.min(item.savedCount, 450) * 0.025;
  const trending = item.trendingScore * 0.13;
  const availability = availabilityScore(item.nextAvailable) * 0.12;

  return verification + rating + reviews + response + completion + repeats + saves + trending + availability;
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
