/**
 * App-wide settings store — persisted to localStorage.
 * All reads are synchronous and SSR-safe (returns defaults when window is unavailable).
 */

const SETTINGS_KEY = "ms_app_settings.v1";

export interface AppSettings {
  // ── Privacy & Safety ─────────────────────────────────────────────────────
  privateAccount: boolean;
  /** who can comment on your posts */
  whoCanComment: "everyone" | "followers" | "nobody";
  showActivityStatus: boolean;
  allowDirectMessages: boolean;

  // ── Notifications ─────────────────────────────────────────────────────────
  pushNotifications: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyFollowers: boolean;
  notifyReposts: boolean;
  notifyMessages: boolean;
  notifyBookings: boolean;
  notifyOffers: boolean;
  notifyAnnouncements: boolean;

  // ── Counter (Shop) ────────────────────────────────────────────────────────
  showAdultProducts: boolean;
  adultProductsAgeVerified: boolean;
  adultProductsVerifiedAt?: string;
  /** date of birth used for age verification — stored as ISO yyyy-mm-dd */
  adultProductsDOB?: string;
  showProductSuggestions: boolean;

  // ── Feed & Content ────────────────────────────────────────────────────────
  showReposts: boolean;
  showSuggestedPosts: boolean;
  autoplayVideos: boolean;

  // ── Appearance ────────────────────────────────────────────────────────────
  colorScheme: "light" | "dark" | "system";
  textSize: "small" | "medium" | "large";

  // ── Accessibility ─────────────────────────────────────────────────────────
  reduceMotion: boolean;
  highContrast: boolean;

  // ── Security ──────────────────────────────────────────────────────────────
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  privateAccount: false,
  whoCanComment: "everyone",
  showActivityStatus: true,
  allowDirectMessages: true,

  pushNotifications: true,
  notifyLikes: true,
  notifyComments: true,
  notifyFollowers: true,
  notifyReposts: false,
  notifyMessages: true,
  notifyBookings: true,
  notifyOffers: false,
  notifyAnnouncements: true,

  showAdultProducts: false,
  adultProductsAgeVerified: false,
  showProductSuggestions: true,

  showReposts: true,
  showSuggestedPosts: true,
  autoplayVideos: false,

  colorScheme: "system",
  textSize: "medium",

  reduceMotion: false,
  highContrast: false,

  twoFactorEnabled: false,
  loginAlerts: true,
};

export const SETTINGS_CHANGE_EVENT = "ms-settings-change";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function readSettings(): AppSettings {
  if (!canUseStorage()) return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(patch: Partial<AppSettings>): AppSettings {
  const current = readSettings();
  const next = { ...current, ...patch };
  if (canUseStorage()) {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT));
  }
  return next;
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings {
  return writeSettings({ [key]: value } as Partial<AppSettings>);
}

/** Returns true if adult products are unlocked */
export function adultProductsEnabled(): boolean {
  const s = readSettings();
  return s.showAdultProducts && s.adultProductsAgeVerified;
}
