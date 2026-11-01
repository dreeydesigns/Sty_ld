"use client";

import { useEffect } from "react";
import { activeWorld, activeWorldIntensity } from "@/lib/beauty-world";
import { APP_SESSION_EVENT, readAppSession } from "@/lib/client-session";
import { readSettings, SETTINGS_CHANGE_EVENT, TEXT_SCALE_VALUES, type AppSettings } from "@/lib/settings-store";

const LANG_KEY = "ms_language_pref";

/**
 * Styld is LIGHT MODE ONLY. The document ships in the light theme and nothing
 * here sets `data-theme` or a dark class.
 *
 * World presentation is a separate, validated attribute on the client
 * experience. It is applied only for an authenticated client session and is
 * removed on sign out or when another role or workspace becomes active.
 * `data-world` and `data-intensity` are authoritative. `data-beauty-world`
 * remains only as a bridge for older profile surface selectors.
 */
export function applySettings(settings: AppSettings) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;

  // Root font size, not CSS zoom: zoom also scales 100vw and viewport units,
  // which pushed fixed-width mobile layouts past the screen edge.
  html.style.setProperty("--text-scale", TEXT_SCALE_VALUES[settings.textSize] ?? "1");

  if (settings.reduceMotion) html.setAttribute("data-reduce-motion", "true");
  else html.removeAttribute("data-reduce-motion");

  if (settings.highContrast) html.setAttribute("data-high-contrast", "true");
  else html.removeAttribute("data-high-contrast");

  // data-saver is a connection hint, not a stored preference. globals.css uses
  // it to drop backdrop blur, so the attribute is kept in step whenever the
  // browser reports a change.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) html.setAttribute("data-save-data", "true");
  else html.removeAttribute("data-save-data");
}

export function applyBeautyWorld() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const session = readAppSession();
  const world = activeWorld(session);

  if (!world) {
    html.removeAttribute("data-world");
    html.removeAttribute("data-intensity");
    html.removeAttribute("data-beauty-world");
    return;
  }

  html.setAttribute("data-world", world.key);
  html.setAttribute("data-intensity", activeWorldIntensity(session) ?? "balanced");

  if (world.key === "default") {
    html.removeAttribute("data-beauty-world");
  } else {
    html.setAttribute("data-beauty-world", world.key);
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
