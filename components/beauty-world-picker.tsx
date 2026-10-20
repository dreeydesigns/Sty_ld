"use client";

import { useEffect, useState } from "react";
import { Circle, Flower2, Gem, Leaf, MoonStar } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BEAUTY_WORLD_KEYS, type BeautyWorldKey } from "@/lib/beauty-world";
import {
  APP_SESSION_EVENT,
  readClientSession,
  saveClientBeautyWorld,
  type BeautyWorldSaveResult,
} from "@/lib/client-session";
import { themeConfigs, type ClientUserProfile, type ThemeKey } from "@/lib/personalization";
import { cn } from "@/lib/utils";

const THEME_ICONS: Record<BeautyWorldKey, LucideIcon> = {
  feminine: Flower2,
  natural: Leaf,
  spiritual: MoonStar,
  cultural: Gem,
  african_nude: Circle,
};

export function BeautyWorldPicker({
  profile,
  columns = "two",
  onProfileChange,
}: {
  profile: ClientUserProfile;
  columns?: "two" | "five";
  onProfileChange?: (profile: ClientUserProfile | null) => void;
}) {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>(profile.theme);
  const [pendingTheme, setPendingTheme] = useState<ThemeKey | null>(null);
  const [savedTheme, setSavedTheme] = useState<ThemeKey | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setActiveTheme(profile.theme);
  }, [profile.theme]);

  useEffect(() => {
    function sync() {
      const session = readClientSession();
      if (session) {
        setActiveTheme(session.theme);
      }
    }

    window.addEventListener(APP_SESSION_EVENT, sync);

    return () => window.removeEventListener(APP_SESSION_EVENT, sync);
  }, []);

  async function choose(theme: BeautyWorldKey) {
    if (pendingTheme) {
      return;
    }

    setPendingTheme(theme);
    setSavedTheme(null);
    setError("");
    setActiveTheme(theme);

    const result: BeautyWorldSaveResult = await saveClientBeautyWorld(theme);
    setPendingTheme(null);

    if (result.ok) {
      setActiveTheme(theme);
      setSavedTheme(theme);
      onProfileChange?.(result.profile);
      return;
    }

    const latest = readClientSession();
    setActiveTheme(latest?.theme ?? profile.theme);
    setError(result.error);
  }

  const activeConfig = themeConfigs[activeTheme];

  return (
    <div className="min-w-0">
      <div
        className={cn(
          "grid min-w-0 gap-2.5",
          columns === "five" ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2",
        )}
      >
        {BEAUTY_WORLD_KEYS.map((themeKey) => {
          const theme = themeConfigs[themeKey];
          const active = activeTheme === themeKey;
          const pending = pendingTheme === themeKey;
          const Icon = THEME_ICONS[themeKey];

          return (
            <button
              aria-busy={pending}
              aria-pressed={active}
              className={cn(
                "bw-theme-option min-w-0 rounded-[22px] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.06)] disabled:cursor-wait disabled:opacity-80",
                active ? "text-white" : "text-[var(--text-primary)]",
              )}
              data-bw-theme-option={themeKey}
              disabled={Boolean(pendingTheme)}
              key={themeKey}
              onClick={() => void choose(themeKey)}
              style={{
                backgroundColor: active ? theme.darkColor : theme.softColor,
                borderColor: active ? theme.darkColor : theme.accentColor,
              }}
              type="button"
            >
              <span className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span
                  aria-hidden="true"
                  className="h-1.5 w-8 shrink-0 rounded-full"
                  style={{ backgroundColor: theme.accentColor }}
                />
              </span>
              <span className="mt-2 block break-words text-sm font-semibold">{theme.displayName}</span>
              <span
                className={cn(
                  "mt-1 block break-words text-xs leading-5",
                  active ? "text-white/90" : "text-[var(--text-secondary)]",
                )}
              >
                {theme.tribeBadge}
              </span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="mt-3 min-h-5 text-xs leading-5">
        {pendingTheme ? (
          <p className="text-[var(--text-secondary)]">Saving your {themeConfigs[pendingTheme].displayName} world.</p>
        ) : savedTheme ? (
          <p className="font-semibold text-[var(--color-success)]">
            Saved. {themeConfigs[savedTheme].displayName} is now your beauty world.
          </p>
        ) : activeConfig.key !== "not_set" ? (
          <p className="text-[var(--text-secondary)]">
            {activeConfig.displayName} is active. It shapes recommendations and the mood of your profile only.
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          className="mt-2 rounded-[16px] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2 text-xs leading-5 text-[var(--color-error)]"
          role="alert"
        >
          {error} Nothing was saved.
        </p>
      ) : null}
    </div>
  );
}
