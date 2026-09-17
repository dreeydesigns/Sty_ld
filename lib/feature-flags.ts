/**
 * Styld — Master Feature Flags System
 *
 * Controls surface availability across navigation, routes, API endpoints,
 * and server operations.
 *
 * Direct URL access to disabled surfaces is intercepted at the middleware layer.
 *
 * 30-DAY BETA FOCUS:
 * - Client discovery, provider profiles, booking, reviews, admin moderation.
 * - Shop, Delivery, and Counter retail are gated until subsequent release phases.
 */

export const FEATURES = {
  /** Counter & Shop Marketplace (disabled during beta) */
  SHOP: false,
  /** Delivery & Courier Logistics (disabled during beta) */
  DELIVERY: false,
  /** Retail Counter & physical product cart (disabled during beta) */
  COUNTER: false,
  /** Live payment gateways (disabled until commercial rails approved) */
  PAYMENTS_LIVE: false,
  /** Verified Provider and Salon directory */
  DISCOVERY: true,
  /** Booking and appointment management */
  BOOKINGS: true,
  /** Community stories and beauty updates */
  COMMUNITY_STORIES: true,
  /** Interactive role-aware onboarding tour */
  ONBOARDING_TOUR: true,
} as const;

export type FeatureFlagKey = keyof typeof FEATURES;

export function isFeatureEnabled(feature: FeatureFlagKey): boolean {
  return FEATURES[feature] === true;
}

/**
 * Route prefix to feature mapping for middleware interception.
 */
export const ROUTE_FEATURE_GATES: Record<string, FeatureFlagKey> = {
  '/shop': 'SHOP',
  '/delivery': 'DELIVERY',
  '/counter': 'COUNTER',
  '/dashboard/shop': 'SHOP',
  '/dashboard/delivery': 'DELIVERY',
  '/onboarding/shop': 'SHOP',
  '/onboarding/delivery': 'DELIVERY',
};
