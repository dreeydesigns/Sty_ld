"use client";

import { useEffect } from "react";
import { readSettings, SETTINGS_CHANGE_EVENT, type AppSettings } from "@/lib/settings-store";

const LANG_KEY = "ms_language_pref";
const ZOOM_MAP: Record<string, string> = { small: "0.9", medium: "1", large: "1.15" };

function applySettings(settings: AppSettings) {
  const html = document.documentElement;
  html.setAttribute("data-color-scheme", settings.colorScheme ?? "system");
  html.style.setProperty("--ms-zoom", ZOOM_MAP[settings.textSize] ?? "1");
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
    // Apply on mount
    applySettings(readSettings());
    applyLang();

    // Re-apply whenever settings change (from any page)
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
