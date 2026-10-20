import type { ThemeKey } from "@/lib/personalization";

export const BEAUTY_WORLD_KEYS = [
  "feminine",
  "natural",
  "spiritual",
  "cultural",
  "african_nude",
] as const;

export type BeautyWorldKey = (typeof BEAUTY_WORLD_KEYS)[number];

export const WORLD_KEYS = ["default", ...BEAUTY_WORLD_KEYS] as const;
export type WorldKey = (typeof WORLD_KEYS)[number];

export const WORLD_INTENSITIES = ["calm", "balanced", "immersive"] as const;
export type WorldIntensity = (typeof WORLD_INTENSITIES)[number];
export const DEFAULT_WORLD_INTENSITY: WorldIntensity = "balanced";

export type WorldAmbient = "none" | "petals" | "pollen" | "stars" | "weave" | "shimmer";

export interface WorldDefinition {
  key: WorldKey;
  themeKey: ThemeKey;
  displayName: string;
  shortName: string;
  badge: string;
  personality: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentForeground: string;
  ink: string;
  page: string;
  raised: string;
  panel: string;
  border: string;
  header: string;
  focus: string;
  link: string;
  selection: string;
  glassTint: string;
  glassBorder: string;
  glassShadow: string;
  ambient: WorldAmbient;
  ambientColor: string;
  ambientOpacity: number;
  ambientSpeed: string;
  motionScale: number;
  headingFont: "display" | "sans";
  headingStyle: "normal" | "italic";
  keywords: readonly string[];
  services: readonly string[];
  categories: readonly string[];
  copy: string;
  feedCopy: string;
}

export const WORLDS: Record<WorldKey, WorldDefinition> = {
  default: {
    key: "default",
    themeKey: "not_set",
    displayName: "Pure",
    shortName: "Pure",
    badge: "Finding your world",
    personality: "The original Styld calm",
    accent: "#C0A090",
    accentStrong: "#875945",
    accentSoft: "#FAF5F2",
    accentForeground: "#1D1D1B",
    ink: "#1D1D1B",
    page: "#FAF8F5",
    raised: "#F4F1EC",
    panel: "#FFFFFF",
    border: "rgba(29, 29, 27, 0.12)",
    header: "rgba(250, 248, 245, 0.94)",
    focus: "#875945",
    link: "#875945",
    selection: "rgba(192, 160, 144, 0.32)",
    glassTint: "rgba(255, 255, 255, 0.72)",
    glassBorder: "rgba(29, 29, 27, 0.10)",
    glassShadow: "0 18px 50px rgba(29, 29, 27, 0.10)",
    ambient: "none",
    ambientColor: "#C0A090",
    ambientOpacity: 0,
    ambientSpeed: "0s",
    motionScale: 0,
    headingFont: "display",
    headingStyle: "normal",
    keywords: [],
    services: [],
    categories: [],
    copy: "Clean, warm and quiet. Pure is the original Styld canvas.",
    feedCopy: "Trusted beauty, clearly organised for your next booking.",
  },
  feminine: {
    key: "feminine",
    themeKey: "feminine",
    displayName: "The Romantic",
    shortName: "Romantic",
    badge: "The Romantic",
    personality: "Soft, polished, quietly expressive",
    accent: "#E8BFC6",
    accentStrong: "#8E4F60",
    accentSoft: "#FDF1F3",
    accentForeground: "#1D1D1B",
    ink: "#3E2830",
    page: "#FDF8F7",
    raised: "#FBF0F1",
    panel: "#FFFBFC",
    border: "rgba(232, 191, 198, 0.68)",
    header: "rgba(253, 248, 247, 0.94)",
    focus: "#8E4F60",
    link: "#8E4F60",
    selection: "rgba(232, 191, 198, 0.45)",
    glassTint: "rgba(255, 246, 248, 0.68)",
    glassBorder: "rgba(142, 79, 96, 0.18)",
    glassShadow: "0 18px 50px rgba(142, 79, 96, 0.13)",
    ambient: "petals",
    ambientColor: "#E8BFC6",
    ambientOpacity: 0.42,
    ambientSpeed: "20s",
    motionScale: 0.65,
    headingFont: "display",
    headingStyle: "normal",
    keywords: [
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
    services: ["Bridal glam", "Soft makeup", "Lashes", "Manicure", "Pedicure"],
    categories: ["Bridal", "Makeup", "Nails", "Lashes"],
    copy: "Soft colour, graceful detail and a warm finish for celebration beauty.",
    feedCopy: "Romantic finishes, soft glam, neat nails, and beauty care that feels gentle.",
  },
  natural: {
    key: "natural",
    themeKey: "natural",
    displayName: "The Earth Woman",
    shortName: "Earth",
    badge: "The Earth Woman",
    personality: "Grounded, healthy, skin first",
    accent: "#7B927E",
    accentStrong: "#3F5A46",
    accentSoft: "#EEF4EC",
    accentForeground: "#1D1D1B",
    ink: "#26382C",
    page: "#F8FAF7",
    raised: "#EFF4EE",
    panel: "#FCFDFA",
    border: "rgba(123, 146, 126, 0.46)",
    header: "rgba(248, 250, 247, 0.94)",
    focus: "#3F5A46",
    link: "#3F5A46",
    selection: "rgba(123, 146, 126, 0.34)",
    glassTint: "rgba(244, 249, 242, 0.68)",
    glassBorder: "rgba(63, 90, 70, 0.18)",
    glassShadow: "0 18px 50px rgba(63, 90, 70, 0.12)",
    ambient: "pollen",
    ambientColor: "#7B927E",
    ambientOpacity: 0.34,
    ambientSpeed: "24s",
    motionScale: 0.5,
    headingFont: "sans",
    headingStyle: "normal",
    keywords: [
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
    services: ["Natural hair care", "Scalp treatment", "Protective styling", "Skin care", "Wash day"],
    categories: ["Natural hair", "Skin", "Scalp", "Protective styles"],
    copy: "Earthy colour, calm surfaces and care that puts hair and skin health first.",
    feedCopy: "Healthy textured hair, skin-safe care, and professionals who protect your routine.",
  },
  spiritual: {
    key: "spiritual",
    themeKey: "spiritual",
    displayName: "The Seeker",
    shortName: "Seeker",
    badge: "The Seeker",
    personality: "Calm, restorative, quietly luminous",
    accent: "#8980B3",
    accentStrong: "#51477E",
    accentSoft: "#F3F1FA",
    accentForeground: "#1D1D1B",
    ink: "#302A52",
    page: "#FAF9FD",
    raised: "#F3F1F9",
    panel: "#FDFCFF",
    border: "rgba(137, 128, 179, 0.44)",
    header: "rgba(250, 249, 253, 0.94)",
    focus: "#51477E",
    link: "#51477E",
    selection: "rgba(137, 128, 179, 0.34)",
    glassTint: "rgba(248, 246, 255, 0.68)",
    glassBorder: "rgba(81, 71, 126, 0.18)",
    glassShadow: "0 18px 50px rgba(81, 71, 126, 0.14)",
    ambient: "stars",
    ambientColor: "#8980B3",
    ambientOpacity: 0.38,
    ambientSpeed: "26s",
    motionScale: 0.55,
    headingFont: "display",
    headingStyle: "italic",
    keywords: [
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
    services: ["Massage", "Facial", "Spa ritual", "Steam", "Wellness reset"],
    categories: ["Spa", "Facial", "Massage", "Wellness"],
    copy: "Deep quiet, soft light and a slower rhythm for restorative care.",
    feedCopy: "Restorative packages, calming appointments, and care that helps you reset.",
  },
  cultural: {
    key: "cultural",
    themeKey: "cultural",
    displayName: "The Daughter of the Soil",
    shortName: "Soil",
    badge: "The Daughter of the Soil",
    personality: "Rooted, expressive, heritage proud",
    accent: "#BB795D",
    accentStrong: "#7A3F25",
    accentSoft: "#FBF0E9",
    accentForeground: "#1D1D1B",
    ink: "#482A1D",
    page: "#FCF8F4",
    raised: "#F8EFE7",
    panel: "#FFFCF9",
    border: "rgba(187, 121, 93, 0.48)",
    header: "rgba(252, 248, 244, 0.94)",
    focus: "#7A3F25",
    link: "#7A3F25",
    selection: "rgba(187, 121, 93, 0.36)",
    glassTint: "rgba(255, 248, 242, 0.68)",
    glassBorder: "rgba(122, 63, 37, 0.20)",
    glassShadow: "0 18px 50px rgba(122, 63, 37, 0.14)",
    ambient: "weave",
    ambientColor: "#BB795D",
    ambientOpacity: 0.34,
    ambientSpeed: "28s",
    motionScale: 0.45,
    headingFont: "display",
    headingStyle: "normal",
    keywords: [
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
    services: ["Braids", "Locs", "Cornrows", "Bridal styling", "Heritage looks"],
    categories: ["Braids", "Locs", "Bridal", "Heritage"],
    copy: "Warm clay, woven pattern and proud texture-led beauty.",
    feedCopy: "Braids, locs, bridal moments, and African beauty handled with respect.",
  },
  african_nude: {
    key: "african_nude",
    themeKey: "african_nude",
    displayName: "The Muse",
    shortName: "Muse",
    badge: "The Muse",
    personality: "Minimal, warm, quietly confident",
    accent: "#B3947E",
    accentStrong: "#6E5544",
    accentSoft: "#F6F1EC",
    accentForeground: "#1D1D1B",
    ink: "#3A3028",
    page: "#FAF7F3",
    raised: "#F4EFE9",
    panel: "#FDFBF8",
    border: "rgba(179, 148, 126, 0.52)",
    header: "rgba(250, 247, 243, 0.94)",
    focus: "#6E5544",
    link: "#6E5544",
    selection: "rgba(179, 148, 126, 0.38)",
    glassTint: "rgba(252, 248, 244, 0.70)",
    glassBorder: "rgba(110, 85, 68, 0.18)",
    glassShadow: "0 18px 50px rgba(110, 85, 68, 0.13)",
    ambient: "shimmer",
    ambientColor: "#B3947E",
    ambientOpacity: 0.30,
    ambientSpeed: "22s",
    motionScale: 0.4,
    headingFont: "sans",
    headingStyle: "normal",
    keywords: [
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
    services: ["Silk press", "Nude nails", "Natural finish", "Sleek styling", "Maintenance"],
    categories: ["Nails", "Silk press", "Natural finish", "Minimal"],
    copy: "Warm neutral colour, clean lines and a quiet premium finish.",
    feedCopy: "Clean-girl maintenance, nude nails, natural finishes, and calm premium detail.",
  },
};

export const BEAUTY_WORLD_KEYWORDS: Record<BeautyWorldKey, readonly string[]> = BEAUTY_WORLD_KEYS.reduce(
  (result, key) => ({ ...result, [key]: WORLDS[key].keywords }),
  {} as Record<BeautyWorldKey, readonly string[]>,
);

export function isBeautyWorldKey(value: unknown): value is BeautyWorldKey {
  return typeof value === "string" && (BEAUTY_WORLD_KEYS as readonly string[]).includes(value);
}

export function isWorldKey(value: unknown): value is WorldKey {
  return typeof value === "string" && (WORLD_KEYS as readonly string[]).includes(value);
}

export function isPersistableWorldKey(value: unknown): value is ThemeKey {
  return value === "not_set" || isBeautyWorldKey(value);
}

export function isWorldIntensity(value: unknown): value is WorldIntensity {
  return typeof value === "string" && (WORLD_INTENSITIES as readonly string[]).includes(value);
}

export function normalizeWorldIntensity(value: unknown): WorldIntensity {
  return isWorldIntensity(value) ? value : DEFAULT_WORLD_INTENSITY;
}

export function worldKeyFromTheme(value: unknown): WorldKey {
  return isBeautyWorldKey(value) ? value : "default";
}

export function themeKeyForWorld(world: WorldKey): ThemeKey {
  return WORLDS[world].themeKey;
}

export function getWorld(world: WorldKey | ThemeKey | string | null | undefined): WorldDefinition {
  if (isWorldKey(world)) {
    return WORLDS[world];
  }

  return WORLDS[worldKeyFromTheme(world)];
}

export function beautyWorldBadge(theme: BeautyWorldKey) {
  return WORLDS[theme].badge;
}

export function worldBadge(world: WorldKey | ThemeKey | string | null | undefined) {
  return getWorld(world).badge;
}

export function normalizeBeautyWorld(value: unknown): BeautyWorldKey | null {
  return isBeautyWorldKey(value) ? value : null;
}

export function activeWorldKey(
  session: { role?: string; theme?: ThemeKey | string } | null | undefined,
): WorldKey | null {
  if (!session || session.role !== "client") {
    return null;
  }

  return worldKeyFromTheme(session.theme);
}

export function activeWorld(
  session:
    | { role?: string; theme?: ThemeKey | string; worldIntensity?: WorldIntensity | string }
    | null
    | undefined,
): WorldDefinition | null {
  const key = activeWorldKey(session);

  return key ? WORLDS[key] : null;
}

export function activeWorldIntensity(
  session: { role?: string; worldIntensity?: WorldIntensity | string } | null | undefined,
): WorldIntensity | null {
  if (!session || session.role !== "client") {
    return null;
  }

  return normalizeWorldIntensity(session.worldIntensity);
}

export function activeBeautyWorld(
  session: { role?: string; theme?: ThemeKey | string } | null | undefined,
): BeautyWorldKey | null {
  const key = activeWorldKey(session);

  return key && key !== "default" ? key : null;
}

export function recommendationOrderForWorld(
  world: WorldKey | ThemeKey | string | null | undefined,
): readonly string[] {
  return getWorld(world).keywords;
}

export function worldIntensityLabel(value: WorldIntensity): string {
  if (value === "calm") return "Calm";
  if (value === "immersive") return "Immersive";
  return "Balanced";
}

const WORLD_PREVIEW_COPY: Record<
  WorldKey,
  {
    colours: string;
    buttons: string;
    glass: string;
    atmosphere: string;
    interaction: string;
  }
> = {
  default: {
    colours: "Clay accent, warm white canvas and deep ink text.",
    buttons: "Primary actions stay deep ink with white labels. Accent controls use soft clay.",
    glass: "White glass with a fine ink border and a soft shadow.",
    atmosphere: "None. Pure stays still and minimal.",
    interaction: "Quiet lifts and simple transitions.",
  },
  feminine: {
    colours: "Rose petal accent, blush canvas and deep plum ink.",
    buttons: "Primary actions stay deep ink. Accent selections use soft rose with ink text.",
    glass: "Rose tinted glass with a fine plum border.",
    atmosphere: "A few soft petals drift slowly.",
    interaction: "Gentle lifts and rounded, polished detail.",
  },
  natural: {
    colours: "Sage accent, green white canvas and forest ink.",
    buttons: "Primary actions stay forest ink. Accent selections use soft sage with ink text.",
    glass: "Sage tinted glass with a fine forest border.",
    atmosphere: "Light pollen floats in a slow drift.",
    interaction: "Grounded surfaces with restrained, steady movement.",
  },
  spiritual: {
    colours: "Soft lilac accent, pale violet canvas and deep indigo ink.",
    buttons: "Primary actions stay indigo ink. Accent selections use muted lilac with ink text.",
    glass: "Lilac tinted glass with a fine indigo border.",
    atmosphere: "A restrained field of slow, quiet stars.",
    interaction: "Slow reveals and calm, flowing transitions.",
  },
  cultural: {
    colours: "Terracotta accent, warm clay canvas and deep umber ink.",
    buttons: "Primary actions stay umber ink. Accent selections use warm clay with ink text.",
    glass: "Clay tinted glass with a fine umber border.",
    atmosphere: "Fine woven lines move at a measured pace.",
    interaction: "Pattern led detail with grounded, deliberate motion.",
  },
  african_nude: {
    colours: "Nude clay accent, warm ivory canvas and espresso ink.",
    buttons: "Primary actions stay espresso ink. Accent selections use warm nude with ink text.",
    glass: "Warm neutral glass with a fine espresso border.",
    atmosphere: "A faint champagne shimmer moves slowly.",
    interaction: "Clean spacing with minimal, quiet transitions.",
  },
};

export interface WorldPreviewDetails {
  colours: string;
  buttons: string;
  glass: string;
  atmosphere: string;
  interaction: string;
  recommendations: string;
  unchanged: string;
}

export function worldPreviewDetails(
  world: WorldKey | ThemeKey | string | null | undefined,
): WorldPreviewDetails {
  const definition = getWorld(world);
  const copy = WORLD_PREVIEW_COPY[definition.key];

  return {
    ...copy,
    recommendations:
      definition.key === "default"
        ? "Discovery stays balanced, with no world bias."
        : `Discovery leans towards ${definition.categories.join(", ")}.`,
    unchanged: "Search, filters, bookings, payments, and account controls stay the same.",
  };
}
