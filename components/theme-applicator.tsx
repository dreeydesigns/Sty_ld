"use client";

import { useEffect } from "react";
import { activeBeautyWorld } from "@/lib/beauty-world";
import { APP_SESSION_EVENT, readAppSession } from "@/lib/client-session";
import { readSettings, SETTINGS_CHANGE_EVENT, type AppSettings } from "@/lib/settings-store";

const LANG_KEY = "ms_language_pref";
const ZOOM_MAP: Record<string, string> = { small: "0.9", medium: "1", large: "1.15" };

/**
 * Styld is LIGHT MODE ONLY. The document ships in the light theme and nothing
 * here sets `data-theme` or a dark class.
 *
 * Beauty World presentation is a separate, validated attribute on the client
 * experience. It is applied only for an authenticated client session and is
 * removed on sign out or when another role or workspace becomes active.
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

export function applyBeautyWorld() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const theme = activeBeautyWorld(readAppSession());

  if (theme) {
    html.setAttribute("data-beauty-world", theme);
  } else {
    html.removeAttribute("data-beauty-world");
  }
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
    applyBeautyWorld();

    function onSettingsChange() {
      applySettings(readSettings());
    }

    function onSessionChange() {
      applyBeautyWorld();
    }

    function onStorage() {
      applySettings(readSettings());
      applyBeautyWorld();
    }

    window.addEventListener(SETTINGS_CHANGE_EVENT, onSettingsChange);
    window.addEventListener(APP_SESSION_EVENT, onSessionChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(SETTINGS_CHANGE_EVENT, onSettingsChange);
      window.removeEventListener(APP_SESSION_EVENT, onSessionChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
