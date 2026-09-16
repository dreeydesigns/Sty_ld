/**
 * Styld — Role policy (single source of truth)
 *
 * P0A: before this file existed, role decisions were scattered across routes and
 * read from client-supplied values (request bodies, `assumed_role` query/cookie).
 * That allowed a caller to ask for `super_admin` when signing up (live-confirmed
 * privilege escalation). Every role decision must now come from here.
 *
 * Rules encoded below:
 *  1. The ONLY role a public signup may result in is `client`.
 *  2. Privileged roles (admin / super_admin / team_member / staff) can never be
 *     granted by a public signup path — they are assigned by an operator.
 *  3. Provider roles (professional / salon / shop / delivery) are never granted by
 *     a public signup path either — they require professional/business verification,
 *     which is a separate, gated workstream.
 *
 * `role` supplied by a request body/query is treated as an untrusted hint and is
 * ignored: `resolvePublicSignupRole()` always yields a public-safe role.
 */

/** Roles a public (unauthenticated) signup path is allowed to create. */
export const PUBLIC_SIGNUP_ROLES = ["client"] as const;
export type PublicSignupRole = (typeof PUBLIC_SIGNUP_ROLES)[number];

/** Roles that require professional / business verification before they can exist. */
export const PROVIDER_ROLES = ["professional", "salon", "shop", "delivery"] as const;
export type ProviderRole = (typeof PROVIDER_ROLES)[number];

/** Internal roles. Never self-assignable, never publicly resolvable. */
export const PRIVILEGED_ROLES = ["admin", "super_admin", "team_member", "staff"] as const;
export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];

/** Roles that may administer platform data (services, counters, shop, delivery). */
export const ADMIN_ROLES = ["admin", "super_admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Roles the platform understands at all (includes the unauthenticated `guest`). */
export const ALL_ROLES = [
  "guest",
  ...PUBLIC_SIGNUP_ROLES,
  ...PROVIDER_ROLES,
  ...PRIVILEGED_ROLES,
] as const;
export type StyldRole = (typeof ALL_ROLES)[number];

function isOneOf<T extends string>(values: readonly T[], candidate: unknown): candidate is T {
  return typeof candidate === "string" && (values as readonly string[]).includes(candidate);
}

/** True only for roles a public signup path may create. */
export function isPublicSignupRole(candidate: unknown): candidate is PublicSignupRole {
  return isOneOf(PUBLIC_SIGNUP_ROLES, candidate);
}

/** True for provider roles (professional / salon / shop / delivery). */
export function isProviderRole(candidate: unknown): candidate is ProviderRole {
  return isOneOf(PROVIDER_ROLES, candidate);
}

/** True for internal roles (admin / super_admin / team_member / staff). */
export function isPrivilegedRole(candidate: unknown): candidate is PrivilegedRole {
  return isOneOf(PRIVILEGED_ROLES, candidate);
}

/** True for roles that may write platform-owned data. */
export function isAdminRole(candidate: unknown): candidate is AdminRole {
  return isOneOf(ADMIN_ROLES, candidate);
}

/** True for any role this platform understands. */
export function isKnownRole(candidate: unknown): candidate is StyldRole {
  return isOneOf(ALL_ROLES, candidate);
}

/**
 * Resolve an untrusted, client-supplied role hint into a role that is safe to
 * persist on a public signup. Anything that is not explicitly public yields
 * `client`: privileged, provider, malformed and absent values all coerce.
 */
export function resolvePublicSignupRole(requested?: unknown): PublicSignupRole {
  return isPublicSignupRole(requested) ? requested : "client";
}
