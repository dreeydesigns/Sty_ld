import {
  type ThemeQuizResult,
  CLIENT_SESSION_STORAGE_KEY,
  CLIENT_SIGNUP_STORAGE_KEY,
  PHOTO_NUDGE_STORAGE_KEY,
  QUIZ_THEME_STORAGE_KEY,
  getThemeConfig,
  normalizeThemeKey,
  type ClientSignupDraft,
  type ClientUserProfile,
  type ThemeKey,
} from "@/lib/personalization";
import {
  isPersistableWorldKey,
  isWorldIntensity,
  normalizeWorldIntensity,
  worldBadge,
  type WorldIntensity,
} from "@/lib/beauty-world";
import { type ServiceMode } from "@/lib/site-data";

export type AppUserRole = "client" | "salon" | "professional" | "shop" | "delivery" | "super_admin" | "team_member" | "guest";

export interface GuestUserProfile {
  id: string;
  role: "guest";
  theme: ThemeKey;
  tribeBadge: string;
  sessionStartedAt: string;
  /** 24h window — after this the gate shows a sign-up nudge */
  sessionExpiresAt: string;
}

export interface ShopUserProfile {
  id: string;
  role: "shop";
  shopName: string;
  contactName: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  location: string;
  publicSlug: string;
  createdAt: string;
}

export interface DeliveryUserProfile {
  id: string;
  role: "delivery";
  displayName: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  location: string;
  availabilityStatus: "offline" | "available" | "busy";
  createdAt: string;
}

export interface SuperAdminUserProfile {
  id: string;
  role: "super_admin";
  displayName: string;
  phone: string;
  email?: string;
  createdAt: string;
}

/**
 * Team member account — a simplified account type for salon staff.
 * Linked to a salon; their portfolio uploads belong to the salon.
 * Cannot access salon pricing, team list, or other members' earnings.
 */
export interface TeamMemberProfile {
  id: string;
  role: "team_member";
  firstName: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  specialty: string;
  bio?: string;
  /** The salon this team member belongs to */
  salonId: string;
  salonName: string;
  salonSlug: string;
  /** Team member's earnings share (e.g. 20 = 20%) — set by salon admin */
  commissionPct: number;
  createdAt: string;
}

export interface ProfileCardPreference {
  id: string;
  label: string;
  enabled: boolean;
  removable?: boolean;
}

export interface SalonUserProfile {
  id: string;
  role: "salon";
  salonName: string;
  contactName: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  location: string;
  publicSlug: string;
  plan: "basic" | "growth" | "premium";
  subscriptionStatus: "draft" | "active" | "needs_payment";
  listingPublished: boolean;
  description: string;
  teamCount: number;
  servicesCount: number;
  cards: ProfileCardPreference[];
  createdAt: string;
}

export interface ProfessionalUserProfile {
  id: string;
  role: "professional";
  displayName: string;
  specialty: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  location: string;
  serviceMode: ServiceMode;
  areasServed: string[];
  publicSlug: string;
  listingPublished: boolean;
  bio: string;
  cards: ProfileCardPreference[];
  createdAt: string;
}

export type AppUserSession =
  | ClientUserProfile
  | SalonUserProfile
  | ProfessionalUserProfile
  | ShopUserProfile
  | DeliveryUserProfile
  | SuperAdminUserProfile
  | TeamMemberProfile
  | GuestUserProfile;

export interface BookableProviderProfile {
  slug: string;
  name: string;
  role: "salon" | "professional";
  targetType: "salons" | "professionals";
  location: string;
  areasServed: string[];
  nextAvailable: string;
  serviceIds: string[];
  image?: { url: string; alt: string };
  description: string;
}

export function createGuestSession(): GuestUserProfile {
  const quizTheme = typeof window !== "undefined"
    ? normalizeThemeKey(window.sessionStorage.getItem(QUIZ_THEME_STORAGE_KEY))
    : "not_set";
  const config = getThemeConfig(quizTheme);
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    id: `guest_${Date.now()}`,
    role: "guest",
    theme: quizTheme,
    tribeBadge: config.tribeBadge,
    sessionStartedAt: now.toISOString(),
    sessionExpiresAt: expires.toISOString(),
  };
}

export function isGuestExpired(session: GuestUserProfile): boolean {
  return new Date() > new Date(session.sessionExpiresAt);
}

export const APP_SESSION_EVENT = "mobile-salon.client-session-change";
export const APP_VISIT_EVENT = "mobile-salon.app-visit-change";

const APP_VISIT_COUNT_STORAGE_KEY = "mobile-salon.app-visits.v1";
const QUIZ_PROMPT_DISMISSED_STORAGE_KEY = "mobile-salon.theme-quiz-dismissed.v1";
const ACCOUNT_REGISTRY_STORAGE_KEY = "mobile-salon.account-registry.v1";

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window && "sessionStorage" in window;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readQuizTheme(): ThemeKey {
  if (!canUseStorage()) {
    return "not_set";
  }

  return normalizeThemeKey(window.sessionStorage.getItem(QUIZ_THEME_STORAGE_KEY));
}

export function writeQuizTheme(theme: ThemeKey) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(QUIZ_THEME_STORAGE_KEY, normalizeThemeKey(theme));
}

export function readAppVisitCount() {
  if (!canUseStorage()) {
    return 0;
  }

  const stored = Number(window.localStorage.getItem(APP_VISIT_COUNT_STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

export function recordAppVisit() {
  if (!canUseStorage()) {
    return 0;
  }

  const nextCount = readAppVisitCount() + 1;
  window.localStorage.setItem(APP_VISIT_COUNT_STORAGE_KEY, String(nextCount));
  window.dispatchEvent(new Event(APP_VISIT_EVENT));
  return nextCount;
}

export function isThemeQuizPromptDismissed() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(QUIZ_PROMPT_DISMISSED_STORAGE_KEY) === "true";
}

export function dismissThemeQuizPrompt() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(QUIZ_PROMPT_DISMISSED_STORAGE_KEY, "true");
  window.dispatchEvent(new Event(APP_VISIT_EVENT));
}

export function readSignupDraft(): ClientSignupDraft | null {
  if (!canUseStorage()) {
    return null;
  }

  const draft = safeParse<ClientSignupDraft>(window.sessionStorage.getItem(CLIENT_SIGNUP_STORAGE_KEY));
  if (draft && 'password' in draft) {
    delete draft.password;
    window.sessionStorage.setItem(CLIENT_SIGNUP_STORAGE_KEY, JSON.stringify(draft));
  }
  return draft;
}

export function writeSignupDraft(draft: Partial<ClientSignupDraft>) {
  if (!canUseStorage()) {
    return;
  }

  const current = readSignupDraft();
  const theme = normalizeThemeKey(draft.theme ?? current?.theme ?? readQuizTheme());
  const next: ClientSignupDraft = {
    firstName: draft.firstName ?? current?.firstName ?? "",
    phone: draft.phone ?? current?.phone ?? "",
    theme,
    tribeBadge: draft.tribeBadge ?? current?.tribeBadge ?? getThemeConfig(theme).tribeBadge,
    quiz: draft.quiz ?? current?.quiz,
    location: draft.location ?? current?.location,
    otpVerified: draft.otpVerified ?? current?.otpVerified,
    updatedAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(CLIENT_SIGNUP_STORAGE_KEY, JSON.stringify(next));
}

let verifiedProfile:AppUserSession|null=null;
let sessionResolved=false;
export function hasResolvedAppSession(){return sessionResolved;}
function clearWorkspaceCaches(){
 if(!canUseStorage())return;
 for(const storage of [window.localStorage,window.sessionStorage]){
  for(const key of Object.keys(storage))if(key.startsWith('ms_social_')||['ms_bookings','ms_messages','ms_followed_authors'].includes(key)||key===ACCOUNT_REGISTRY_STORAGE_KEY||key===CLIENT_SESSION_STORAGE_KEY)storage.removeItem(key);
 }
}
export function readAppSession():AppUserSession|null{return verifiedProfile;}
// Only call after a successful server /api/me response. No usable token or
// private profile is persisted in localStorage.
export function writeVerifiedAppSession(profile:AppUserSession){
 const old=verifiedProfile as (AppUserSession&{workspaceId?:string})|null;
 const next=profile as AppUserSession&{workspaceId?:string};
 if(old?.id!==next.id||old?.workspaceId!==next.workspaceId||old?.role!==next.role)clearWorkspaceCaches();
 verifiedProfile=profile;sessionResolved=true;
 if(canUseStorage())window.dispatchEvent(new Event(APP_SESSION_EVENT));
}
export function writeAppSession(profile:AppUserSession){
 // Optimistic profile edits may update the current display but cannot create
 // an identity or switch roles. Server APIs still authorise every operation.
 if(!verifiedProfile||profile.id!==verifiedProfile.id||profile.role!==verifiedProfile.role)return;
 verifiedProfile=profile;
 if(canUseStorage())window.dispatchEvent(new Event(APP_SESSION_EVENT));
}
export function clearAppSession(){verifiedProfile=null;sessionResolved=true;clearWorkspaceCaches();if(canUseStorage())window.dispatchEvent(new Event(APP_SESSION_EVENT));}

export function readClientSession(): ClientUserProfile | null {
  const session = readAppSession();

  return session?.role === "client" ? session : null;
}

export function writeClientSession(profile: ClientUserProfile) {
  writeAppSession(profile);
}

export function updateClientTheme(theme: ThemeKey) {
  const profile = readClientSession();

  if (!profile) {
    return null;
  }

  const normalizedTheme = normalizeThemeKey(theme);
  const next: ClientUserProfile = {
    ...profile,
    theme: normalizedTheme,
    tribeBadge: worldBadge(normalizedTheme),
    quizCompleted: normalizedTheme !== "not_set",
    themeSetBy: "settings",
    themeUpdatedAt: new Date().toISOString(),
    tribes: Array.from(new Set([...profile.tribes, normalizedTheme])).filter(
      (item): item is ThemeKey => item !== "not_set",
    ),
  };

  writeClientSession(next);
  return next;
}

export type BeautyWorldSaveResult =
  | { ok: true; profile: ClientUserProfile | null }
  | { ok: false; error: string };

function sameClientIdentity(
  profile: ClientUserProfile | null,
  id: string,
  workspaceId: string | undefined,
) {
  if (!profile || profile.id !== id) {
    return false;
  }

  return (profile as ClientUserProfile & { workspaceId?: string }).workspaceId === workspaceId;
}

export async function saveClientBeautyWorld(theme: ThemeKey): Promise<BeautyWorldSaveResult> {
  const current = readClientSession();

  if (!current) {
    return { ok: false, error: "Sign in to change your beauty world." };
  }

  const normalized = normalizeThemeKey(theme);

  if (!isPersistableWorldKey(normalized)) {
    return { ok: false, error: "Choose Pure or one of the five beauty worlds." };
  }

  const id = current.id;
  const workspaceId = (current as ClientUserProfile & { workspaceId?: string }).workspaceId;
  const previous = current;
  updateClientTheme(normalized);

  try {
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: normalized }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      user?: { theme?: string };
    } | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Could not save your beauty world.");
    }

    if (payload.user?.theme && payload.user.theme !== normalized) {
      throw new Error("The saved beauty world did not match. Please try again.");
    }

    const latest = readClientSession();

    if (!sameClientIdentity(latest, id, workspaceId)) {
      return { ok: true, profile: null };
    }

    if (latest && latest.theme !== normalized) {
      return { ok: true, profile: updateClientTheme(normalized) };
    }

    return { ok: true, profile: latest };
  } catch (error) {
    const latest = readClientSession();

    if (sameClientIdentity(latest, id, workspaceId)) {
      writeClientSession(previous);
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save your beauty world.",
    };
  }
}

export function updateClientWorldIntensity(intensity: WorldIntensity): ClientUserProfile | null {
  const profile = readClientSession();

  if (!profile) {
    return null;
  }

  const next: ClientUserProfile = {
    ...profile,
    worldIntensity: normalizeWorldIntensity(intensity),
  };

  writeClientSession(next);
  return next;
}

export type WorldIntensitySaveResult =
  | { ok: true; profile: ClientUserProfile | null }
  | { ok: false; error: string };

export type SocialSaveResult =
  | { ok: true; profile: ClientUserProfile | null; savedPostIds: string[] }
  | { ok: false; error: string };

function sameClientForSocial(profile: ClientUserProfile | null, id: string, workspaceId: string | undefined) {
  if (!profile || profile.id !== id) {
    return false;
  }

  return (profile as ClientUserProfile & { workspaceId?: string }).workspaceId === workspaceId;
}

export async function saveSocialPost(postId: string): Promise<SocialSaveResult> {
  const current = readClientSession();

  if (!current) {
    return { ok: false, error: "Sign in to save posts." };
  }

  const id = current.id;
  const workspaceId = (current as ClientUserProfile & { workspaceId?: string }).workspaceId;
  const previous = current;
  const nextIds = Array.from(new Set([...(current.savedPostIds ?? []), postId]));

  if (nextIds.length > 100) {
    return { ok: false, error: "You can save up to 100 posts." };
  }

  const optimistic: ClientUserProfile = { ...current, savedPostIds: nextIds };
  writeClientSession(optimistic);

  try {
    const response = await fetch("/api/social/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      savedPostIds?: string[];
    } | null;

    if (!response.ok || !payload?.ok || !Array.isArray(payload.savedPostIds)) {
      throw new Error(payload?.error || "Could not save this post.");
    }

    const latest = readClientSession();

    if (!sameClientForSocial(latest, id, workspaceId)) {
      return { ok: true, profile: null, savedPostIds: payload.savedPostIds };
    }

    const next: ClientUserProfile = { ...(latest ?? current), savedPostIds: payload.savedPostIds };
    writeClientSession(next);
    return { ok: true, profile: next, savedPostIds: payload.savedPostIds };
  } catch (error) {
    const latest = readClientSession();

    if (sameClientForSocial(latest, id, workspaceId)) {
      writeClientSession(previous);
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save this post.",
    };
  }
}

export async function unsaveSocialPost(postId: string): Promise<SocialSaveResult> {
  const current = readClientSession();

  if (!current) {
    return { ok: false, error: "Sign in to manage saved posts." };
  }

  const id = current.id;
  const workspaceId = (current as ClientUserProfile & { workspaceId?: string }).workspaceId;
  const previous = current;
  const nextIds = (current.savedPostIds ?? []).filter((value) => value !== postId);

  const optimistic: ClientUserProfile = { ...current, savedPostIds: nextIds };
  writeClientSession(optimistic);

  try {
    const response = await fetch(`/api/social/saves/${encodeURIComponent(postId)}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      savedPostIds?: string[];
    } | null;

    if (!response.ok || !payload?.ok || !Array.isArray(payload.savedPostIds)) {
      throw new Error(payload?.error || "Could not remove this saved post.");
    }

    const latest = readClientSession();

    if (!sameClientForSocial(latest, id, workspaceId)) {
      return { ok: true, profile: null, savedPostIds: payload.savedPostIds };
    }

    const next: ClientUserProfile = { ...(latest ?? current), savedPostIds: payload.savedPostIds };
    writeClientSession(next);
    return { ok: true, profile: next, savedPostIds: payload.savedPostIds };
  } catch (error) {
    const latest = readClientSession();

    if (sameClientForSocial(latest, id, workspaceId)) {
      writeClientSession(previous);
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not remove this saved post.",
    };
  }
}

export async function saveClientWorldIntensity(
  intensity: WorldIntensity,
): Promise<WorldIntensitySaveResult> {
  const current = readClientSession();

  if (!current) {
    return { ok: false, error: "Sign in to change your beauty world." };
  }

  if (!isWorldIntensity(intensity)) {
    return { ok: false, error: "Choose calm, balanced or immersive intensity." };
  }

  const id = current.id;
  const workspaceId = (current as ClientUserProfile & { workspaceId?: string }).workspaceId;
  const previous = current;
  updateClientWorldIntensity(intensity);

  try {
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worldIntensity: intensity }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      user?: { worldIntensity?: string };
    } | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Could not save your beauty world intensity.");
    }

    if (payload.user?.worldIntensity && payload.user.worldIntensity !== intensity) {
      throw new Error("The saved intensity did not match. Please try again.");
    }

    const latest = readClientSession();

    if (!sameClientIdentity(latest, id, workspaceId)) {
      return { ok: true, profile: null };
    }

    if (latest && latest.worldIntensity !== intensity) {
      return { ok: true, profile: updateClientWorldIntensity(intensity) };
    }

    return { ok: true, profile: latest };
  } catch (error) {
    const latest = readClientSession();

    if (sameClientIdentity(latest, id, workspaceId)) {
      writeClientSession(previous);
    }

    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not save your beauty world intensity.",
    };
  }
}

export function applyThemeQuizResult(result: ThemeQuizResult) {
  const profile = readClientSession();

  if (!profile) {
    return null;
  }

  const theme = normalizeThemeKey(result.theme);
  const config = getThemeConfig(theme);
  const next: ClientUserProfile = {
    ...profile,
    theme,
    tribeBadge: config.tribeBadge,
    quizCompleted: true,
    quizMetadata: result,
    themeSetBy: "quiz",
    themeUpdatedAt: new Date().toISOString(),
    tribes: Array.from(new Set([...profile.tribes, theme])).filter(
      (item): item is ThemeKey => item !== "not_set",
    ),
  };

  writeClientSession(next);
  return next;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanPhoneSuffix(phone?: string) {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  return cleaned.slice(-4) || String(Date.now()).slice(-4);
}

export function createClientSession(overrides?: Partial<ClientUserProfile>): ClientUserProfile {
  const existing = readClientSession();
  const theme = normalizeThemeKey(overrides?.theme ?? existing?.theme ?? readQuizTheme());
  const config = getThemeConfig(theme);

  return {
    id: overrides?.id ?? existing?.id ?? `client_${Date.now()}`,
    role: "client",
    firstName: overrides?.firstName ?? existing?.firstName ?? "Client",
    phone: overrides?.phone ?? existing?.phone ?? "",
    email: overrides?.email ?? existing?.email,
    profilePhoto: overrides?.profilePhoto ?? existing?.profilePhoto,
    theme,
    tribeBadge: overrides?.tribeBadge ?? existing?.tribeBadge ?? config.tribeBadge,
    quizCompleted: overrides?.quizCompleted ?? existing?.quizCompleted ?? false,
    quizMetadata: overrides?.quizMetadata ?? existing?.quizMetadata,
    themeSetBy: overrides?.themeSetBy ?? existing?.themeSetBy ?? "fallback",
    themeUpdatedAt: overrides?.themeUpdatedAt ?? existing?.themeUpdatedAt ?? new Date().toISOString(),
    location: overrides?.location ?? existing?.location,
    subscription: overrides?.subscription ?? existing?.subscription ?? { tier: "none", status: "teaser" },
    tribes: overrides?.tribes ?? existing?.tribes ?? (theme === "not_set" ? [] : [theme]),
    createdAt: overrides?.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
  };
}

export function createSalonSession(overrides?: Partial<SalonUserProfile>): SalonUserProfile {
  const suffix = cleanPhoneSuffix(overrides?.phone);
  const name = overrides?.salonName ?? "New Salon";
  const slug = overrides?.publicSlug ?? `${slugify(name) || "salon"}-${suffix}`;

  return {
    id: overrides?.id ?? `salon_${Date.now()}`,
    role: "salon",
    salonName: name,
    contactName: overrides?.contactName ?? "",
    phone: overrides?.phone ?? "",
    email: overrides?.email,
    profilePhoto: overrides?.profilePhoto,
    location: overrides?.location ?? "",
    publicSlug: slug,
    plan: overrides?.plan ?? "basic",
    subscriptionStatus: overrides?.subscriptionStatus ?? "draft",
    listingPublished: overrides?.listingPublished ?? false,
    description: overrides?.description ?? "",
    teamCount: overrides?.teamCount ?? 0,
    servicesCount: overrides?.servicesCount ?? 0,
    cards: overrides?.cards ?? [
      { id: "hero", label: "Hero banner", enabled: true },
      { id: "services", label: "Service menu", enabled: true },
      { id: "team", label: "Team showcase", enabled: true },
      { id: "portfolio", label: "Portfolio", enabled: true },
      { id: "packages", label: "Packages", enabled: true, removable: true },
      { id: "reviews", label: "Reviews", enabled: true, removable: true },
    ],
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
  };
}

export function createProfessionalSession(
  overrides?: Partial<ProfessionalUserProfile>,
): ProfessionalUserProfile {
  const suffix = cleanPhoneSuffix(overrides?.phone);
  const name = overrides?.displayName ?? "New Professional";
  const slug = overrides?.publicSlug ?? `${slugify(name) || "professional"}-${suffix}`;

  return {
    id: overrides?.id ?? `professional_${Date.now()}`,
    role: "professional",
    displayName: name,
    specialty: overrides?.specialty ?? "",
    phone: overrides?.phone ?? "",
    email: overrides?.email,
    profilePhoto: overrides?.profilePhoto,
    location: overrides?.location ?? "",
    serviceMode: overrides?.serviceMode ?? "Both",
    areasServed: overrides?.areasServed ?? [],
    publicSlug: slug,
    listingPublished: overrides?.listingPublished ?? false,
    bio: overrides?.bio ?? "",
    cards: overrides?.cards ?? [
      { id: "hero", label: "Hero card", enabled: true },
      { id: "services", label: "Services", enabled: true },
      { id: "portfolio", label: "Portfolio", enabled: true },
      { id: "availability", label: "Availability", enabled: true },
      { id: "packages", label: "Packages", enabled: true, removable: true },
      { id: "reviews", label: "Reviews", enabled: true, removable: true },
    ],
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
  };
}

export function createTeamMemberSession(overrides: {
  firstName: string;
  phone: string;
  specialty: string;
  salonId: string;
  salonName: string;
  salonSlug: string;
  commissionPct: number;
  id?: string;
  email?: string;
  profilePhoto?: string;
  bio?: string;
}): TeamMemberProfile {
  return {
    id: overrides.id ?? `tm_${Date.now()}`,
    role: "team_member",
    firstName: overrides.firstName,
    phone: overrides.phone,
    email: overrides.email,
    profilePhoto: overrides.profilePhoto,
    specialty: overrides.specialty,
    bio: overrides.bio,
    salonId: overrides.salonId,
    salonName: overrides.salonName,
    salonSlug: overrides.salonSlug,
    commissionPct: overrides.commissionPct,
    createdAt: new Date().toISOString(),
  };
}

export function createShopSession(overrides?: Partial<ShopUserProfile>): ShopUserProfile {
  const suffix = cleanPhoneSuffix(overrides?.phone);
  const name = overrides?.shopName ?? "New Shop";

  return {
    id: overrides?.id ?? `shop_${Date.now()}`,
    role: "shop",
    shopName: name,
    contactName: overrides?.contactName ?? "",
    phone: overrides?.phone ?? "",
    email: overrides?.email,
    profilePhoto: overrides?.profilePhoto,
    location: overrides?.location ?? "",
    publicSlug: overrides?.publicSlug ?? `${slugify(name) || "shop"}-${suffix}`,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
  };
}

export function createDeliverySession(overrides?: Partial<DeliveryUserProfile>): DeliveryUserProfile {
  return {
    id: overrides?.id ?? `delivery_${Date.now()}`,
    role: "delivery",
    displayName: overrides?.displayName ?? "Delivery Partner",
    phone: overrides?.phone ?? "",
    email: overrides?.email,
    profilePhoto: overrides?.profilePhoto,
    location: overrides?.location ?? "",
    availabilityStatus: overrides?.availabilityStatus ?? "offline",
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
  };
}

export function createSuperAdminSession(overrides?: Partial<SuperAdminUserProfile>): SuperAdminUserProfile {
  return {
    id: overrides?.id ?? `super_admin_${Date.now()}`,
    role: "super_admin",
    displayName: overrides?.displayName ?? "Styld Admin",
    phone: overrides?.phone ?? "",
    email: overrides?.email,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
  };
}

export function createSessionForRole(role: Exclude<AppUserRole, "guest">, phone?: string): Exclude<AppUserSession, GuestUserProfile> {
  if (role === "salon") {
    return createSalonSession({ phone });
  }

  if (role === "professional") {
    return createProfessionalSession({ phone });
  }

  if (role === "shop") {
    return createShopSession({ phone });
  }

  if (role === "delivery") {
    return createDeliverySession({ phone });
  }

  if (role === "super_admin") {
    return createSuperAdminSession({ phone });
  }

  if (role === "team_member") {
    return createTeamMemberSession({
      firstName: "Team Member",
      phone: phone ?? "",
      specialty: "",
      salonId: "",
      salonName: "",
      salonSlug: "",
      commissionPct: 20,
    });
  }

  return createClientSession({ phone });
}

function readAccountRegistry(): AppUserSession[] {
  if (!canUseStorage()) {
    return [];
  }

  return safeParse<AppUserSession[]>(window.localStorage.getItem(ACCOUNT_REGISTRY_STORAGE_KEY)) ?? [];
}

function upsertAccountRegistry(profile: AppUserSession) {
  if (!canUseStorage() || profile.role === "guest") {
    return;
  }

  const accounts = readAccountRegistry();
  const next = [profile, ...accounts.filter((account) => account.id !== profile.id)];
  window.localStorage.setItem(ACCOUNT_REGISTRY_STORAGE_KEY, JSON.stringify(next));
}

export function readRegisteredProviders(targetType?: "salons" | "professionals"): BookableProviderProfile[] {
  return readAccountRegistry()
    .filter((account): account is SalonUserProfile | ProfessionalUserProfile =>
      account.role === "salon" || account.role === "professional",
    )
    .filter((account) => {
      if (!targetType) {
        return true;
      }

      return targetType === "salons" ? account.role === "salon" : account.role === "professional";
    })
    .map((account) => {
      if (account.role === "salon") {
        return {
          slug: account.publicSlug,
          name: account.salonName,
          role: "salon",
          targetType: "salons",
          location: account.location,
          areasServed: account.location ? [account.location] : [],
          nextAvailable: "Set by salon",
          serviceIds: [],
          image: account.profilePhoto ? { url: account.profilePhoto, alt: account.salonName } : undefined,
          description: account.description || "New salon profile. Services and availability will appear after setup.",
        };
      }

      return {
        slug: account.publicSlug,
        name: account.displayName,
        role: "professional",
        targetType: "professionals",
        location: account.location,
        areasServed: account.areasServed,
        nextAvailable: "Set by professional",
        serviceIds: [],
        image: account.profilePhoto ? { url: account.profilePhoto, alt: account.displayName } : undefined,
        description: account.bio || account.specialty || "New professional profile. Services and availability will appear after setup.",
      };
    });
}

export function isPhotoNudgeDismissed() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(PHOTO_NUDGE_STORAGE_KEY) === "true";
}

export function dismissPhotoNudge() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PHOTO_NUDGE_STORAGE_KEY, "true");
}
