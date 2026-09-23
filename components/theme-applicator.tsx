"use client";

import { useEffect } from "react";
import { readSettings, SETTINGS_CHANGE_EVENT, type AppSettings } from "@/lib/settings-store";

const LANG_KEY = "ms_language_pref";
const ZOOM_MAP: Record<string, string> = { small: "0.9", medium: "1", large: "1.15" };

/**
 * Styld is LIGHT MODE ONLY.
 *
 * This applicator intentionally does NOT touch theme: there is no dark mode, no
 * system theme following, no theme preference and no `dark` class. The document
 * ships from the server already in the light theme (app/layout.tsx), so nothing
 * here can cause a theme flash or a hydration mismatch.
 *
 * It applies only non-theme preferences:
 *   - text size (--zoom)
 *   - reduced motion (data-reduce-motion)
 *   - high contrast (data-high-contrast)
 *   - language (lang / dir)
 *
 * Any colour-scheme preference persisted by an older client build is ignored.
 */
export function applySettings(settings: AppSettings) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;

  html.style.setProperty("--zoom", ZOOM_MAP[settings.textSize] ?? "1");

  if (settings.reduceMotion) html.setAttribute("data-reduce-motion", "true");
  else html.removeAttribute("data-reduce-motion");

  if (settings.highContrast) html.setAttribute("data-high-contrast", "true");
  else html.removeAttribute("data-high-contrast");
}

function applyLang() {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (!raw) return;
    const pref = JSON.parse(raw) as { code?: string; dir?: string };
    if (pref.code) document.documentElement.lang = pref.code;
    if (pref.dir) document.documentElement.dir = pref.dir;
  } catch {
    // ignore
  }
}

export function ThemeApplicator() {
  useEffect(() => {
    applySettings(readSettings());
    applyLang();

    function onSettingsChange() {
      applySettings(readSettings());
    }

    window.addEventListener(SETTINGS_CHANGE_EVENT, onSettingsChange);
    window.addEventListener("storage", onSettingsChange);

    return () => {
      window.removeEventListener(SETTINGS_CHANGE_EVENT, onSettingsChange);
      window.removeEventListener("storage", onSettingsChange);
    };
  }, []);

  return null;
}

