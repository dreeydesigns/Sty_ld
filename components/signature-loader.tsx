"use client";

import { useEffect, useState } from "react";
import { StyldMark, StyldWordmark } from "@/components/styld-logo";

// One brand gesture per cold tab session. sessionStorage is the guard, so a
// client navigation, a re-entry or a background tab never replays it.
const SEEN_KEY = "styld.loader.seen.v1";
// Wordmark reveal ends at 760ms, the mark is held untouched until the veil
// starts at 1380ms, so the whole lockup is still and visible for 620ms.
const TOTAL_MS = 1700;
const FAILSAFE_MS = 2000;
// A visitor whose content is already usable should not have a veil drawn over
// it, so the gesture is skipped once hydration has taken this long.
const LATE_HYDRATION_MS = 4000;

export function SignatureLoader() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let skipReason = "";
    try {
      if (window.sessionStorage.getItem(SEEN_KEY) === "1") skipReason = "seen";
      else window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      skipReason = "storage-denied";
    }

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!skipReason && window.matchMedia("(prefers-reduced-motion: reduce)").matches) skipReason = "reduced-motion";
    if (!skipReason && window.matchMedia("(prefers-reduced-data: reduce)").matches) skipReason = "reduced-data";
    if (!skipReason && connection?.saveData) skipReason = "save-data";
    if (!skipReason && document.visibilityState === "hidden") skipReason = "hidden-tab";
    if (!skipReason && performance.now() > LATE_HYDRATION_MS) skipReason = "late-hydration";

    const root = document.documentElement;
    if (skipReason) {
      root.dataset.signatureLoader = skipReason;
      return;
    }

    root.dataset.signatureLoader = "playing";
    setActive(true);

    let failsafe = 0;
    const exit = window.setTimeout(() => {
      window.clearTimeout(failsafe);
      setActive(false);
      root.dataset.signatureLoader = "done";
    }, TOTAL_MS);
    failsafe = window.setTimeout(() => {
      setActive(false);
      root.dataset.signatureLoader = "failsafe";
    }, FAILSAFE_MS);

    return () => {
      window.clearTimeout(exit);
      window.clearTimeout(failsafe);
    };
  }, []);

  if (!active) return null;

  // The artwork is the shipped Logo Book component, unchanged. The masks only
  // control when its existing parts become visible.
  return (
    <div className="signature-loader" data-styld-loader="" aria-hidden="true">
      <div className="signature-loader__stage">
        <span className="signature-loader__mark">
          <StyldMark size={64} variant="default" />
        </span>
        <span className="signature-loader__word">
          <StyldWordmark fontSize="text-3xl" variant="default" />
        </span>
      </div>
    </div>
  );
}
