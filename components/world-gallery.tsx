"use client";

import { Palette, Sparkles, Wand2 } from "lucide-react";

import { WORLD_KEYS, getWorld, worldIntensityLabel, type WorldKey } from "@/lib/beauty-world";

const REPRESENTATIVE_STATES = ["Loading", "Empty", "Preview"];

export function WorldGallery() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 max-w-3xl">
          <p className="bw-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
            Development only
          </p>
          <h1 className="bw-heading mt-4 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
            World Gallery
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Representative interface states for every approved beauty world. Static sample content only.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {WORLD_KEYS.map((worldKey) => {
            const world = getWorld(worldKey);

            return (
              <section
                className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-5"
                data-intensity="balanced"
                data-world={worldKey}
                key={worldKey}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
                      {world.badge}
                    </p>
                    <h2 className="bw-heading mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                      {world.displayName}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {world.personality}
                    </p>
                  </div>
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: world.accentStrong }}
                  >
                    <Palette aria-hidden="true" className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <button
                    className="min-h-11 rounded-full bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-action-primary-text)]"
                    type="button"
                  >
                    Primary
                  </button>
                  <button
                    className="min-h-11 rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
                    type="button"
                  >
                    Secondary
                  </button>
                  <span className="bw-chip inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold">
                    Chip
                  </span>
                </div>

                <div className="world-glass mt-5 rounded-[24px] p-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Glass panel</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {world.copy}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
                      Focus state
                    </p>
                    <button
                      className="mt-3 min-h-11 rounded-[16px] border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ outlineColor: world.focus }}
                      type="button"
                    >
                      Focusable action
                    </button>
                  </div>

                  <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
                      Intensity
                    </p>
                    <p className="mt-3 text-sm text-[var(--text-primary)]">
                      {worldIntensityLabel("balanced")} atmosphere
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {world.ambient === "none" ? "No ambient layer." : `${world.ambient} layer available.`}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-raised)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <Wand2 aria-hidden="true" className="h-4 w-4" />
                    Representative states
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {REPRESENTATIVE_STATES.map((state) => (
                      <span
                        className="rounded-full bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                        key={state}
                      >
                        {state}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs leading-5 text-[var(--text-secondary)]">
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                  {world.feedCopy}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
