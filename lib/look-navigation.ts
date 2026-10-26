"use client";

import { useEffect, useState } from "react";

const key = "styld.look-navigation.v1";
type Trail = { origins: Record<string, string>; feeds: Record<string, { y: number; shown: number }> };

// Tab-local public navigation only. Saved IDs and Plan preferences never enter this record.
function read(): Trail {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    return { origins: value?.origins || {}, feeds: value?.feeds || {} };
  } catch { return { origins: {}, feeds: {} }; }
}

function safePath(value: unknown): value is string {
  return typeof value === "string" && value.length < 2000 &&
    /^\/(?:compare|discover(?:\?[^#]*)?|home\?tab=saved|(?:looks|creators)\/[a-f0-9-]+)$/.test(value);
}

export function rememberLookOrigin(target: string) {
  const current = location.pathname + location.search;
  if (!safePath(current) || !safePath(target) || current === target) return;
  try {
    const trail = read();
    if (trail.origins[current] === target) return;
    trail.origins[target] = current;
    if (location.pathname === "/discover") trail.feeds[current] = {
      y: window.scrollY,
      shown: document.querySelectorAll('main a[href^="/looks/"]').length,
    };
    // Keep the record bounded even during a long browsing session.
    trail.origins = Object.fromEntries(Object.entries(trail.origins).slice(-50));
    trail.feeds = Object.fromEntries(Object.entries(trail.feeds).slice(-10));
    sessionStorage.setItem(key, JSON.stringify(trail));
  } catch { /* Navigation still works when tab storage is unavailable. */ }
}

export function useLookReturn(path: string) {
  const [href, setHref] = useState("/discover?tab=looks");
  useEffect(() => {
    const origin = read().origins[path];
    setHref(safePath(origin) ? origin : "/discover?tab=looks");
  }, [path]);
  return { href, label: href === "/compare" ? "Back to compare" : href.startsWith("/home") ? "Back to saved looks" : href.startsWith("/looks/") ? "Back to the look" : href.startsWith("/creators/") ? "Back to creator" : "Back to looks" };
}

export function comparisonPosition() { try { sessionStorage.setItem('styld.compare.scroll.v1', String(window.scrollY)); } catch { /* Navigation still works. */ } }
export function restoreComparisonPosition() {
  try {
    const value = sessionStorage.getItem('styld.compare.scroll.v1');
    if (value === null) return;
    sessionStorage.removeItem('styld.compare.scroll.v1');
    const y = Number(value);
    if (Number.isFinite(y) && y >= 0) requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  } catch { /* Tab-local scroll restoration is best effort. */ }
}

export function discoverPosition(path: string) {
  const value = read().feeds[path];
  return value && Number.isFinite(value.y) && Number.isFinite(value.shown)
    ? { y: Math.max(0, value.y), shown: Math.max(12, Math.min(50, value.shown)) } : null;
}
