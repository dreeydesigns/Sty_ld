export type ThemeKey =
  | "feminine"
  | "natural"
  | "spiritual"
  | "cultural"
  | "african_nude"
  | "not_set";

export type ThemeSource = "quiz" | "settings" | "fallback";

export interface ThemeConfig {
  key: ThemeKey;
  displayName: string;
  tribeBadge: string;
  accentColor: string;
  softColor: string;
  darkColor: string;
  symbol: string;
  copy: string;
  feedCopy: string;
}

export interface ThemeQuizAnswer {
  id: string;
  label: string;
  copy: string;
  theme: ThemeKey;
}

export interface ThemeQuizQuestion {
  id: string;
  eyebrow: string;
  question: string;
  answers: ThemeQuizAnswer[];
}

export interface ThemeQuizResult {
  theme: ThemeKey;
  score: number;
  scores: Record<Exclude<ThemeKey, "not_set">, number>;
  answeredAt: string;
}

export interface ClientLocation {
  mode: "gps" | "manual" | "skipped";
  label: string;
  latitude?: number;
  longitude?: number;
}

export interface ClientSignupDraft {
  firstName: string;
  phone: string;
  password?: string;
  theme: ThemeKey;
  tribeBadge: string;
  quiz?: ThemeQuizResult;
  location?: ClientLocation;
  otpVerified?: boolean;
  updatedAt: string;
}

export interface ClientUserProfile {
  id: string;
  role: "client";
  firstName: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  /** Wide banner behind the profile avatar (data-URL or remote URL) */
  coverPhoto?: string;
  /** Short @handle visible on the profile page */
  username?: string;
  /** Instagram-style bio / beauty story */
  bio?: string;
  theme: ThemeKey;
  tribeBadge: string;
  quizCompleted: boolean;
  quizMetadata?: ThemeQuizResult;
  themeSetBy: ThemeSource;
  themeUpdatedAt: string;
  location?: ClientLocation;
  subscription: {
    tier: "none" | "care";
    status: "inactive" | "teaser";
    startedAt?: string;
    expiresAt?: string;
  };
  tribes: ThemeKey[];
  createdAt: string;
}

export const QUIZ_THEME_STORAGE_KEY = "ms_quiz_theme";
export const CLIENT_SIGNUP_STORAGE_KEY = "mobile-salon.client-signup.v1";
export const CLIENT_SESSION_STORAGE_KEY = "mobile-salon.client-session.v1";
export const PHOTO_NUDGE_STORAGE_KEY = "mobile-salon.photo-nudge-dismissed.v1";

export const themeConfigs: Record<ThemeKey, ThemeConfig> = {
  feminine: {
    key: "feminine",
    displayName: "Feminine",
    tribeBadge: "The Romantic",
    accentColor: "#D4537E",
    softColor: "#FFF0F5",
    darkColor: "#4A1730",
    symbol: "Petal",
    copy: "Soft, romantic, polished beauty care with graceful detail.",
    feedCopy: "Romantic finishes, soft glam, neat nails, and beauty care that feels gentle.",
  },
  natural: {
    key: "natural",
    displayName: "Natural",
    tribeBadge: "The Earth Woman",
    accentColor: "#1D9E75",
    softColor: "#EFFAF4",
    darkColor: "#123D32",
    symbol: "Leaf",
    copy: "Healthy hair, skin-first care, and grounded everyday beauty.",
    feedCopy: "Healthy textured hair, skin-safe care, and professionals who protect your routine.",
  },
  spiritual: {
    key: "spiritual",
    displayName: "Spiritual",
    tribeBadge: "The Seeker",
    accentColor: "#7F77DD",
    softColor: "#F3F1FF",
    darkColor: "#28235E",
    symbol: "Moon",
    copy: "Calm rituals, restorative self-care, and beauty that feels peaceful.",
    feedCopy: "Restorative packages, calming appointments, and care that helps you reset.",
  },
  cultural: {
    key: "cultural",
    displayName: "Cultural",
    tribeBadge: "The Daughter of the Soil",
    accentColor: "#BA7517",
    softColor: "#FFF6E8",
    darkColor: "#56310C",
    symbol: "Gold thread",
    copy: "African texture, occasion beauty, and heritage-led styling.",
    feedCopy: "Braids, locs, bridal moments, and African beauty handled with respect.",
  },
  african_nude: {
    key: "african_nude",
    displayName: "African Nude",
    tribeBadge: "The Unbothered One",
    accentColor: "#888780",
    softColor: "#F4F1EC",
    darkColor: "#3A3833",
    symbol: "Silk stone",
    copy: "Minimal, expensive-looking beauty with quiet confidence.",
    feedCopy: "Clean-girl maintenance, nude nails, natural finishes, and calm premium detail.",
  },
  not_set: {
    key: "not_set",
    displayName: "Not set",
    tribeBadge: "Finding your world",
    accentColor: "#C8284A",
    softColor: "#FDF7F2",
    darkColor: "#3A183A",
    symbol: "Spark",
    copy: "Choose a theme when you are ready.",
    feedCopy: "Trusted beauty, clearly organised for your next booking.",
  },
};

const scorableThemes = ["feminine", "natural", "spiritual", "cultural", "african_nude"] as const;

export function normalizeThemeKey(value?: string | null): ThemeKey {
  if (!value) {
    return "not_set";
  }

  if (value === "nude") {
    return "african_nude";
  }

  if ((scorableThemes as readonly string[]).includes(value)) {
    return value as ThemeKey;
  }

  return "not_set";
}

export function getThemeConfig(theme?: string | null) {
  return themeConfigs[normalizeThemeKey(theme)];
}

export function scoreThemeQuiz(answerThemes: ThemeKey[]): ThemeQuizResult {
  const scores = scorableThemes.reduce(
    (result, theme) => ({ ...result, [theme]: 0 }),
    {} as Record<Exclude<ThemeKey, "not_set">, number>,
  );

  answerThemes.forEach((answerTheme) => {
    const theme = normalizeThemeKey(answerTheme);

    if (theme !== "not_set") {
      scores[theme] += 1;
    }
  });

  const theme = scorableThemes.reduce((winner, theme) => {
    if (scores[theme] > scores[winner]) {
      return theme;
    }

    return winner;
  }, "feminine" as Exclude<ThemeKey, "not_set">);

  return {
    theme,
    score: scores[theme],
    scores,
    answeredAt: new Date().toISOString(),
  };
}

function answer(id: string, label: string, copy: string, theme: ThemeKey): ThemeQuizAnswer {
  return { id, label, copy, theme };
}

export const themeQuizQuestions: ThemeQuizQuestion[] = [
  {
    id: "beauty-feeling",
    eyebrow: "Question 1 of 10",
    question: "When beauty feels right, what is the feeling?",
    answers: [
      answer("soft-polished", "Soft and polished", "Graceful, romantic, and finished with care.", "feminine"),
      answer("healthy-grounded", "Healthy and grounded", "Hair and skin that feel protected first.", "natural"),
      answer("calm-reset", "Calm and reset", "A service that feels like breathing room.", "spiritual"),
      answer("rooted-proud", "Rooted and proud", "African beauty that carries story and presence.", "cultural"),
      answer("quiet-expensive", "Quiet and expensive", "Minimal, neat, and never trying too hard.", "african_nude"),
    ],
  },
  {
    id: "appointment-energy",
    eyebrow: "Question 2 of 10",
    question: "What kind of appointment energy helps you relax?",
    answers: [
      answer("warm-detail", "Warm detail", "Someone notices the little pretty things.", "feminine"),
      answer("ingredient-care", "Care-first", "Products, scalp, skin, and aftercare are explained.", "natural"),
      answer("peaceful-room", "Peaceful room", "Low noise, slow pace, and no pressure.", "spiritual"),
      answer("experienced-hands", "Experienced hands", "A professional who understands our textures.", "cultural"),
      answer("clean-efficient", "Clean and efficient", "Straight to the point, neat, and reliable.", "african_nude"),
    ],
  },
  {
    id: "hair-language",
    eyebrow: "Question 3 of 10",
    question: "Which hair language feels most like you?",
    answers: [
      answer("romantic-styles", "Romantic styles", "Soft curls, soft glam, and feminine detail.", "feminine"),
      answer("healthy-texture", "Healthy texture", "4C care, moisture, and protective routines.", "natural"),
      answer("ritual-wash-day", "Ritual wash day", "A wash, steam, and gentle reset.", "spiritual"),
      answer("braids-locs", "Braids and locs", "Braids, locs, cornrows, and heritage styles.", "cultural"),
      answer("sleek-simple", "Sleek and simple", "Clean installs, neat parts, and low drama.", "african_nude"),
    ],
  },
  {
    id: "event-style",
    eyebrow: "Question 4 of 10",
    question: "For an event, what look would you choose first?",
    answers: [
      answer("soft-glam", "Soft glam", "Pretty, glowing, and still like you.", "feminine"),
      answer("skin-glow", "Skin glow", "Healthy skin, soft finish, and no heaviness.", "natural"),
      answer("rested-glow", "Rested glow", "A calm, fresh, light-filled look.", "spiritual"),
      answer("bridal-cultural", "Statement beauty", "Braids, gold details, or bridal presence.", "cultural"),
      answer("nude-polish", "Nude polish", "Neutral, elegant, and camera-safe.", "african_nude"),
    ],
  },
  {
    id: "professional-trust",
    eyebrow: "Question 5 of 10",
    question: "What makes you trust a professional fastest?",
    answers: [
      answer("gentle-tone", "Gentle tone", "They make the whole process feel safe.", "feminine"),
      answer("aftercare", "Aftercare knowledge", "They protect your hair and skin beyond today.", "natural"),
      answer("calm-presence", "Calm presence", "They reduce stress instead of adding noise.", "spiritual"),
      answer("texture-proof", "Texture proof", "Their portfolio clearly understands African beauty.", "cultural"),
      answer("clean-portfolio", "Clean portfolio", "Everything looks neat, consistent, and precise.", "african_nude"),
    ],
  },
  {
    id: "package-choice",
    eyebrow: "Question 6 of 10",
    question: "Which package would you tap first?",
    answers: [
      answer("birthday-glow", "Birthday Glow", "A pretty, photographed, celebration-ready day.", "feminine"),
      answer("weekend-reset", "Weekend Reset", "Hair, skin, and nails refreshed practically.", "natural"),
      answer("self-care-reset", "Self-Care Reset", "Massage, facial, and quiet recovery.", "spiritual"),
      answer("bridal-morning", "Bridal Morning", "A cultural, organised, beautiful prep moment.", "cultural"),
      answer("corporate-ready", "Corporate Event Ready", "Polished without looking overdone.", "african_nude"),
    ],
  },
  {
    id: "colour-world",
    eyebrow: "Question 7 of 10",
    question: "Which colour world pulls you in?",
    answers: [
      answer("rose-blush", "Rose and blush", "Soft pinks, petals, and warm light.", "feminine"),
      answer("green-earth", "Green and earth", "Leaves, brown skin, and clean freshness.", "natural"),
      answer("violet-moon", "Violet and moonlight", "Soft purple, incense calm, and quiet glow.", "spiritual"),
      answer("gold-soil", "Gold and soil", "Warm gold, clay, beadwork, and depth.", "cultural"),
      answer("taupe-nude", "Taupe and nude", "Warm neutrals, clean lines, and cream.", "african_nude"),
    ],
  },
  {
    id: "rush-help",
    eyebrow: "Question 8 of 10",
    question: "When you need last-minute beauty help, what matters most?",
    answers: [
      answer("reassurance", "Reassurance", "Someone makes it feel handled.", "feminine"),
      answer("safe-choice", "Safe choice", "No damage, no harsh products, no guessing.", "natural"),
      answer("low-stress", "Low stress", "The booking does not make me anxious.", "spiritual"),
      answer("right-skill", "Right skill", "They know the exact style and texture.", "cultural"),
      answer("fast-clean", "Fast and clean", "I can book quickly and move on.", "african_nude"),
    ],
  },
  {
    id: "daily-rhythm",
    eyebrow: "Question 9 of 10",
    question: "Your everyday beauty rhythm is closest to...",
    answers: [
      answer("pretty-maintenance", "Pretty maintenance", "Small details make the day feel lovely.", "feminine"),
      answer("healthy-routine", "Healthy routine", "Consistency, moisture, skin, and comfort.", "natural"),
      answer("intentional-ritual", "Intentional ritual", "I want beauty care to slow me down.", "spiritual"),
      answer("rooted-expression", "Rooted expression", "My style carries culture and confidence.", "cultural"),
      answer("simple-luxury", "Simple luxury", "Clean, quiet, reliable, and put together.", "african_nude"),
    ],
  },
  {
    id: "tribe-fit",
    eyebrow: "Question 10 of 10",
    question: "If Mobile Salon later opens tribes, where would you feel at home?",
    answers: [
      answer("romantic-tribe", "The Romantic", "Women who love softness and beautiful detail.", "feminine"),
      answer("earth-tribe", "The Earth Woman", "Women who put hair and skin health first.", "natural"),
      answer("seeker-tribe", "The Seeker", "Women who want beauty with calm and meaning.", "spiritual"),
      answer("soil-tribe", "The Daughter of the Soil", "Women who celebrate African beauty loudly and proudly.", "cultural"),
      answer("unbothered-tribe", "The Unbothered One", "Women who love minimal, premium ease.", "african_nude"),
    ],
  },
];
