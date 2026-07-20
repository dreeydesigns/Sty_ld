/**
 * Mobile Salon — MVP Feature Flags
 *
 * These flags control which features are visible during the current phase.
 * To enable a feature for the growth phase, simply set it to `true` here.
 * Every nav item, settings section, and route guard reads from this file.
 *
 * MVP PHASE (beta, 30–50 testers):  SHOP = false
 * GROWTH PHASE (public launch):     SHOP = true
 */
export const FEATURES = {
  /**
   * Counter — Beauty Products Marketplace.
   * Hidden during MVP beta (no real sellers, no live payment processing).
   * Set true when the shop backend, seller onboarding, and M-Pesa escrow are live.
   * When re-enabled, the shop will be accessible to ALL roles (client, pro, salon)
   * exactly like the social home feed — single flag enables it everywhere.
   */
  SHOP: false,
} as const;
