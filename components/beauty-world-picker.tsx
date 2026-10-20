"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Circle, Flower2, Gem, Leaf, MoonStar, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  DEFAULT_WORLD_INTENSITY,
  WORLD_INTENSITIES,
  WORLD_KEYS,
  getWorld,
  themeKeyForWorld,
  worldIntensityLabel,
  worldKeyFromTheme,
  worldPreviewDetails,
  type WorldIntensity,
  type WorldKey,
} from "@/lib/beauty-world";
import {
  APP_SESSION_EVENT,
  readClientSession,
  saveClientBeautyWorld,
  saveClientWorldIntensity,
  type BeautyWorldSaveResult,
} from "@/lib/client-session";
import type { ClientUserProfile, ThemeKey } from "@/lib/personalization";
import { cn } from "@/lib/utils";

const THEME_ICONS: Record<WorldKey, LucideIcon> = {
  default: Sparkles,
  feminine: Flower2,
  natural: Leaf,
  spiritual: MoonStar,
  cultural: Gem,
  african_nude: Circle,
};

const INTENSITY_COPY: Record<WorldIntensity, string> = {
  calm: "Quiet colour and still surfaces.",
  balanced: "A gentle amount of motion.",
  immersive: "Full atmosphere and depth.",
};

export function BeautyWorldPicker({
  profile,
  columns = "two",
  onProfileChange,
}: {
  profile: ClientUserProfile;
  columns?: "two" | "six";
  onProfileChange?: (profile: ClientUserProfile | null) => void;
}) {
  const previewId = useId();
  const [activeTheme, setActiveTheme] = useState<ThemeKey>(profile.theme);
  const [activeIntensity, setActiveIntensity] = useState<WorldIntensity>(
    profile.worldIntensity ?? DEFAULT_WORLD_INTENSITY,
  );
  const [previewWorld, setPreviewWorld] = useState<WorldKey>(worldKeyFromTheme(profile.theme));
  const [pendingTheme, setPendingTheme] = useState<ThemeKey | null>(null);
  const [savedTheme, setSavedTheme] = useState<ThemeKey | null>(null);
  const [error, setError] = useState("");
  const [intensityPending, setIntensityPending] = useState<WorldIntensity | null>(null);
  const [savedIntensity, setSavedIntensity] = useState<WorldIntensity | null>(null);
  const [intensityError, setIntensityError] = useState("");
  const optionRefs = useRef<Partial<Record<WorldKey, HTMLButtonElement | null>>>({});

  useEffect(() => {
    setActiveTheme(profile.theme);
  }, [profile.theme]);

  useEffect(() => {
    setActiveIntensity(profile.worldIntensity ?? DEFAULT_WORLD_INTENSITY);
  }, [profile.worldIntensity]);

  useEffect(() => {
    setPreviewWorld(worldKeyFromTheme(activeTheme));
  }, [activeTheme]);

  useEffect(() => {
    function sync() {
      const session = readClientSession();

      if (session) {
        setActiveTheme(session.theme);
        setActiveIntensity(session.worldIntensity ?? DEFAULT_WORLD_INTENSITY);
      }
    }

    window.addEventListener(APP_SESSION_EVENT, sync);

    return () => window.removeEventListener(APP_SESSION_EVENT, sync);
  }, []);

  async function selectWorld(world: WorldKey) {
    if (pendingTheme) {
      return;
    }

    const theme = themeKeyForWorld(world);

    if (worldKeyFromTheme(activeTheme) === world) {
      return;
    }

    setPendingTheme(theme);
    setSavedTheme(null);
    setError("");
    setActiveTheme(theme);
    setPreviewWorld(world);

    const result: BeautyWorldSaveResult = await saveClientBeautyWorld(theme);
    setPendingTheme(null);

    if (result.ok) {
      setActiveTheme(result.profile?.theme ?? theme);
      setSavedTheme(theme);
      onProfileChange?.(result.profile);
      requestAnimationFrame(() => optionRefs.current[world]?.focus());
      return;
    }

    const latest = readClientSession();
    setActiveTheme(latest?.theme ?? profile.theme);
    setError(result.error);
  }

  async function chooseIntensity(intensity: WorldIntensity) {
    if (intensityPending || intensity === activeIntensity) {
      return;
    }

    setIntensityPending(intensity);
    setSavedIntensity(null);
    setIntensityError("");

    const result = await saveClientWorldIntensity(intensity);
    setIntensityPending(null);

    if (result.ok) {
      setActiveIntensity(intensity);
      setSavedIntensity(intensity);
      onProfileChange?.(result.profile);
      return;
    }

    const latest = readClientSession();
    setActiveIntensity(latest?.worldIntensity ?? activeIntensity);
    setIntensityError(result.error);
  }

  const activeWorld = getWorld(activeTheme);
  const previewedWorld = getWorld(previewWorld);
  const preview = worldPreviewDetails(previewWorld);
  const previewedIsActive = worldKeyFromTheme(activeTheme) === previewWorld;

  return (
    <div className="min-w-0">
      <div
        className={cn(
          "grid min-w-0 gap-2.5",
          columns === "six" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 min-[380px]:grid-cols-2",
        )}
      >
        {WORLD_KEYS.map((worldKey) => {
          const world = getWorld(worldKey);
          const active = previewWorld === worldKey;
          const saved = worldKeyFromTheme(activeTheme) === worldKey;
          const pending = pendingTheme === themeKeyForWorld(worldKey);
          const Icon = THEME_ICONS[worldKey];

          return (
            <button
              aria-busy={pending}
              aria-controls={previewId}
              aria-label={`Preview ${world.displayName}`}
              aria-pressed={active}
              className={cn(
                "bw-theme-option group relative min-h-[108px] min-w-0 rounded-[22px] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.06)] disabled:cursor-wait disabled:opacity-80",
                active ? "shadow-[0_12px_26px_rgba(0,0,0,0.06)]" : "",
              )}
              data-bw-theme-option={worldKey}
              disabled={Boolean(pendingTheme)}
              key={worldKey}
              onClick={() => setPreviewWorld(worldKey)}
              onFocus={() => setPreviewWorld(worldKey)}
              onMouseEnter={() => setPreviewWorld(worldKey)}
              ref={(node) => {
                optionRefs.current[worldKey] = node;
              }}
              style={{
                backgroundColor: active ? world.accentSoft : "var(--surface-card)",
                borderColor: active ? world.accentStrong : "var(--border-subtle)",
              }}
              type="button"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    style={{ color: world.accentStrong }}
                  />
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-7 shrink-0 rounded-full"
                    style={{ backgroundColor: world.accent }}
                  />
                </span>
                {saved ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: world.accentStrong }}
                  >
                    <Check aria-hidden="true" className="h-3 w-3" />
                    Selected
                  </span>
                ) : null}
              </span>
              <span className="mt-2 block break-words text-sm font-semibold leading-5 text-[var(--text-primary)]">
                {world.displayName}
              </span>
              <span className="mt-1 block break-words text-xs leading-5 text-[var(--text-secondary)]">
                {world.personality}
              </span>
            </button>
          );
        })}
      </div>

      <section
        aria-labelledby={`${previewId}-title`}
        className="mt-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
        id={previewId}
      >
        <p aria-live="polite" className="sr-only">
          Previewing {previewedWorld.displayName}. {previewedWorld.personality}.
        </p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">
              Preview
            </p>
            <h3
              className="bw-heading mt-1 break-words text-lg font-semibold text-[var(--text-primary)]"
              id={`${previewId}-title`}
            >
              {previewedWorld.displayName}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {previewedWorld.personality}
            </p>
          </div>
          <div aria-hidden="true" className="flex shrink-0 items-center gap-1.5 pt-1">
            {[previewedWorld.accent, previewedWorld.page, previewedWorld.ink].map((colour) => (
              <span
                className="h-7 w-7 rounded-full border border-black/10"
                key={colour}
                style={{ backgroundColor: colour }}
              />
            ))}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-xs leading-5 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--text-primary)]">Colours</dt>
            <dd className="text-[var(--text-secondary)]">{preview.colours}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text-primary)]">Buttons</dt>
            <dd className="text-[var(--text-secondary)]">{preview.buttons}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text-primary)]">Glass</dt>
            <dd className="text-[var(--text-secondary)]">{preview.glass}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text-primary)]">Atmosphere</dt>
            <dd className="text-[var(--text-secondary)]">{preview.atmosphere}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text-primary)]">Interaction</dt>
            <dd className="text-[var(--text-secondary)]">{preview.interaction}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text-primary)]">Recommendations</dt>
            <dd className="text-[var(--text-secondary)]">{preview.recommendations}</dd>
          </div>
        </dl>

        <p className="mt-3 rounded-[16px] bg-[var(--bg-surface-raised)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
          {preview.unchanged}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            Preview only. Nothing changes until you select this world.
          </p>
          <button
            aria-label={
              previewedIsActive
                ? `${previewedWorld.displayName} is selected`
                : `Select ${previewedWorld.displayName}`
            }
            className="min-h-11 rounded-full bg-[var(--color-action-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-action-primary-text)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={previewedIsActive || Boolean(pendingTheme)}
            onClick={() => void selectWorld(previewWorld)}
            type="button"
          >
            {pendingTheme === themeKeyForWorld(previewWorld)
              ? "Saving..."
              : previewedIsActive
                ? "This is your world"
                : "Select this world"}
          </button>
        </div>
      </section>

      <section
        aria-labelledby={`${previewId}-intensity`}
        className="mt-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]"
              id={`${previewId}-intensity`}
            >
              Intensity
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Set the mood for your current world.
            </p>
          </div>
          <span className="rounded-full bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
            {worldIntensityLabel(activeIntensity)}
          </span>
        </div>

        {activeWorld.key === "default" ? (
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            Pure stays minimal. Choose a world to use Calm, Balanced or Immersive.
          </p>
        ) : (
          <div aria-labelledby={`${previewId}-intensity`} className="mt-3 grid gap-2 sm:grid-cols-3" role="group">
            {WORLD_INTENSITIES.map((intensity) => {
              const selected = activeIntensity === intensity;
              const pending = intensityPending === intensity;

              return (
                <button
                  aria-busy={pending}
                  aria-disabled={Boolean(intensityPending)}
                  aria-pressed={selected}
                  className={cn(
                    "min-h-16 rounded-[18px] border px-3 py-2 text-left transition",
                    selected
                      ? "world-selected"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:border-[var(--border-strong)]",
                    intensityPending ? "opacity-70" : "",
                  )}
                  data-world-intensity-option={intensity}
                  key={intensity}
                  onClick={() => void chooseIntensity(intensity)}
                  type="button"
                >
                  <span className="block text-sm font-semibold">{worldIntensityLabel(intensity)}</span>
                  <span className="mt-0.5 block text-xs leading-5 opacity-80">{INTENSITY_COPY[intensity]}</span>
                </button>
              );
            })}
          </div>
        )}

        <p aria-live="polite" className="mt-2 min-h-5 text-xs leading-5 text-[var(--text-secondary)]">
          {intensityPending
            ? `Saving ${worldIntensityLabel(intensityPending)}.`
            : savedIntensity
              ? `${worldIntensityLabel(savedIntensity)} intensity saved.`
              : ""}
        </p>

        {intensityError ? (
          <p
            className="mt-2 rounded-[16px] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2 text-xs leading-5 text-[var(--color-error)]"
            role="alert"
          >
            {intensityError} Nothing was saved.
          </p>
        ) : null}
      </section>

      <div aria-live="polite" className="mt-3 min-h-5 text-xs leading-5">
        {pendingTheme ? (
          <p className="text-[var(--text-secondary)]">
            Saving your {getWorld(pendingTheme).displayName} world.
          </p>
        ) : savedTheme ? (
          <p className="font-semibold text-[var(--color-success)]">
            Saved. {getWorld(savedTheme).displayName} is now your beauty world.
          </p>
        ) : activeWorld.key !== "default" ? (
          <p className="text-[var(--text-secondary)]">
            {activeWorld.displayName} is active. It shapes recommendations and the mood of your profile only.
          </p>
        ) : (
          <p className="text-[var(--text-secondary)]">
            Pure is active. The original Styld canvas stays unchanged.
          </p>
        )}
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
