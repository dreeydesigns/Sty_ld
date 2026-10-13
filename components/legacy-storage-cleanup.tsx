"use client";

import { useEffect } from "react";

/**
 * Removes draft keys left in browser storage by the old Shop and Delivery
 * onboarding flows. Those flows persisted business, identity and payout
 * details locally; the flows are disabled and no longer collect that data.
 *
 * Scope: only the two exact legacy keys below. Nothing else in storage is
 * read or cleared.
 */
const LEGACY_ONBOARDING_KEYS = [
  "shop_onboarding_draft",
  "delivery_onboarding_draft",
] as const;

export function LegacyStorageCleanup() {
  useEffect(() => {
    for (const key of LEGACY_ONBOARDING_KEYS) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Storage may be unavailable (private mode, blocked); ignore.
      }
    }
  }, []);

  return null;
}
