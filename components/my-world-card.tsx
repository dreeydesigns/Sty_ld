"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

import { BeautyWorldPicker } from "@/components/beauty-world-picker";
import {
  DEFAULT_WORLD_INTENSITY,
  getWorld,
  worldIntensityLabel,
} from "@/lib/beauty-world";
import { APP_SESSION_EVENT, readClientSession } from "@/lib/client-session";
import type { ClientUserProfile } from "@/lib/personalization";

export function MyWorldCard() {
  const [profile, setProfile] = useState<ClientUserProfile | null>(null);

  useEffect(() => {
    function syncProfile() {
      setProfile(readClientSession());
    }

    syncProfile();
    window.addEventListener("storage", syncProfile);
    window.addEventListener(APP_SESSION_EVENT, syncProfile);

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener(APP_SESSION_EVENT, syncProfile);
    };
  }, []);

  if (!profile) {
    return null;
  }

  const currentWorld = getWorld(profile.theme);
  const currentIntensity = worldIntensityLabel(profile.worldIntensity ?? DEFAULT_WORLD_INTENSITY);

  return (
    <section className="beauty-card bw-surface overflow-hidden rounded-[32px] p-6">
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: currentWorld.accentStrong }}
        >
          <Palette aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="bw-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
            My world
          </p>
          <h2 className="bw-heading mt-3 break-words text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
            {profile.theme === "not_set"
              ? "Choose a beauty style only when you want to."
              : `${currentWorld.displayName} is your beauty world.`}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            {profile.theme === "not_set"
              ? "Pure stays minimal. Choose a world to shape recommendations and visual mood."
              : `${currentIntensity} intensity is active. Change it any time, and only when you want to.`}
          </p>
          <div className="mt-5">
            <BeautyWorldPicker
              columns="six"
              onProfileChange={setProfile}
              profile={profile}
            />
          </div>
          <div className="mt-5 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
            This is only for discovery. It does not change bookings or payments.
          </div>
        </div>
      </div>
    </section>
  );
}
