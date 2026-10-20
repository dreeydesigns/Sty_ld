import { themeConfigs, type ThemeKey } from "@/lib/personalization";

export const BEAUTY_WORLD_KEYS = [
  "feminine",
  "natural",
  "spiritual",
  "cultural",
  "african_nude",
] as const;

export type BeautyWorldKey = (typeof BEAUTY_WORLD_KEYS)[number];

export const BEAUTY_WORLD_KEYWORDS: Record<BeautyWorldKey, readonly string[]> = {
  feminine: [
    "bridal",
    "blush",
    "glow",
    "lashes",
    "makeup",
    "make-up",
    "nails",
    "petal",
    "pretty",
    "romantic",
    "soft glam",
  ],
  natural: [
    "4c",
    "aftercare",
    "curls",
    "healthy",
    "moisture",
    "natural hair",
    "protective",
    "scalp",
    "skin",
    "wash day",
  ],
  spiritual: [
    "calm",
    "facial",
    "massage",
    "reset",
    "rest",
    "ritual",
    "self-care",
    "spa",
    "steam",
    "wellness",
  ],
  cultural: [
    "african",
    "beads",
    "braids",
    "bridal",
    "cornrows",
    "fulani",
    "heritage",
    "knotless",
    "locs",
    "traditional",
  ],
  african_nude: [
    "almond",
    "chrome",
    "classic",
    "clean girl",
    "maintenance",
    "minimal",
    "neutral",
    "nude",
    "silk press",
    "sleek",
  ],
};

export function isBeautyWorldKey(value: unknown): value is BeautyWorldKey {
  return typeof value === "string" && (BEAUTY_WORLD_KEYS as readonly string[]).includes(value);
}

export function beautyWorldBadge(theme: BeautyWorldKey) {
  return themeConfigs[theme].tribeBadge;
}

export function normalizeBeautyWorld(value: unknown): BeautyWorldKey | null {
  return isBeautyWorldKey(value) ? value : null;
}

export function activeBeautyWorld(
  session: { role?: string; theme?: ThemeKey | string } | null | undefined,
): BeautyWorldKey | null {
  if (!session || session.role !== "client") {
    return null;
  }

  return normalizeBeautyWorld(session.theme);
}
