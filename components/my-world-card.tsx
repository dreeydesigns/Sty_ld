"use client";

import { useEffect, useState } from "react";
import { Palette, Sparkles } from "lucide-react";

import { readClientSession, updateClientTheme } from "@/lib/client-session";
import {
  getThemeConfig,
  themeConfigs,
  type ClientUserProfile,
  type ThemeKey,
} from "@/lib/personalization";
import { cn } from "@/lib/utils";

const selectableThemes: ThemeKey[] = ["feminine", "natural", "spiritual", "cultural", "african_nude"];

export function MyWorldCard() {
  const [profile, setProfile] = useState<ClientUserProfile | null>(null);

  useEffect(() => {
    function syncProfile() {
      setProfile(readClientSession());
    }

    syncProfile();
    window.addEventListener("storage", syncProfile);
    window.addEventListener("mobile-salon.client-session-change", syncProfile);

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("mobile-salon.client-session-change", syncProfile);
    };
  }, []);

  if (!profile) {
    return null;
  }

  const currentTheme = getThemeConfig(profile.theme);

  return (
    <section
      className="beauty-card overflow-hidden rounded-[32px] p-6"
      style={{ background: `linear-gradient(135deg, ${currentTheme.softColor}, #ffffff 70%)` }}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: currentTheme.accentColor }}
        >
          <Palette className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">My World</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">
            {profile.theme === "not_set"
              ? "Choose a beauty style only when you want to."
              : `Your ${currentTheme.displayName} world shapes your feed.`}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
            Change this any time. It only affects recommendations and visual mood.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {selectableThemes.map((themeKey) => {
              const theme = themeConfigs[themeKey];
              const active = profile.theme === themeKey;

              return (
                <button
                  className={cn(
                    "rounded-[24px] border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(13,27,42,0.08)]",
                    active ? "border-transparent text-white" : "border-[var(--ms-border)] text-[var(--ms-plum)]",
                  )}
                  key={theme.key}
                  onClick={() => {
                    const next = updateClientTheme(theme.key);
                    setProfile(next);
                  }}
                  style={active ? { backgroundColor: theme.accentColor } : undefined}
                  type="button"
                >
                  <Sparkles className="h-4 w-4" />
                  <p className="mt-3 text-sm font-semibold">{theme.displayName}</p>
                  <p className={cn("mt-1 text-xs leading-5", active ? "text-white/78" : "text-[var(--ms-mauve)]")}>
                    {theme.tribeBadge}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-[24px] bg-white/80 p-4 text-sm leading-6 text-[var(--ms-charcoal)]">
            This is only for discovery. It does not change bookings or payments.
          </div>
        </div>
      </div>
    </section>
  );
}
