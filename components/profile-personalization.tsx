"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Palette, Settings, X } from "lucide-react";

import {
  readClientSession,
  updateClientTheme,
  type ProfileCardPreference,
} from "@/lib/client-session";
import {
  getThemeConfig,
  themeConfigs,
  type ClientUserProfile,
  type ThemeKey,
} from "@/lib/personalization";
import { cn } from "@/lib/utils";

const selectableThemes: ThemeKey[] = ["feminine", "natural", "spiritual", "cultural", "african_nude"];

export function ProfilePersonalizationDialog({
  role,
  cards,
  onToggleCard,
  onRemoveCard,
  onClose,
}: {
  role: "client" | "professional" | "salon";
  cards?: ProfileCardPreference[];
  onToggleCard?: (cardId: string) => void;
  onRemoveCard?: (cardId: string) => void;
  onClose: () => void;
}) {
  const [clientProfile, setClientProfile] = useState<ClientUserProfile | null>(null);

  useEffect(() => {
    setClientProfile(readClientSession());
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const activeTheme = getThemeConfig(clientProfile?.theme);
  const visibleCards = cards ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        aria-labelledby="profile-personalization-title"
        aria-modal="true"
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">Profile</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]" id="profile-personalization-title">
              Profile personalization
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-secondary)]">
              Adjust how your profile appears. Account, security and workspace controls stay in Settings.
            </p>
          </div>
          <button
            aria-label="Close profile personalization"
            className="rounded-full bg-[var(--surface-card)] p-2 text-[var(--color-secondary)] hover:text-[var(--color-accent)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {role === "client" ? (
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Beauty world</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              This only shapes recommendations and the visual mood of your profile. It does not change bookings or payments.
            </p>
            {clientProfile ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectableThemes.map((themeKey) => {
                  const theme = themeConfigs[themeKey];
                  const active = clientProfile.theme === themeKey;

                  return (
                    <button
                      aria-pressed={active}
                      className={cn(
                        "rounded-[24px] border bg-[var(--card-bg)] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.06)]",
                        active ? "border-transparent text-white" : "border-[var(--border-subtle)] text-[var(--text-primary)]",
                      )}
                      key={theme.key}
                      onClick={() => {
                        const next = updateClientTheme(theme.key);
                        setClientProfile(next);
                      }}
                      style={active ? { backgroundColor: theme.accentColor } : undefined}
                      type="button"
                    >
                      <Palette className="h-4 w-4" />
                      <p className="mt-3 text-sm font-semibold">{theme.displayName}</p>
                      <p className={cn("mt-1 text-xs leading-5", active ? "text-white/90" : "text-[var(--text-secondary)]")}>
                        {theme.tribeBadge}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                Your beauty world is currently <span className="font-semibold text-[var(--text-primary)]">{activeTheme.displayName}</span>. Sign in again to change it.
              </p>
            )}
          </section>
        ) : (
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Public page sections</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Turn sections on or off and they update the page visitors see.
            </p>
            {visibleCards.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {visibleCards.map((card) => (
                  <div
                    className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-4"
                    key={card.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{card.label}</p>
                        <p className="mt-1 text-xs text-[var(--color-secondary)]">
                          {card.enabled ? "Visible on page" : "Hidden from page"}
                        </p>
                      </div>
                      <button
                        aria-label={`${card.enabled ? "Hide" : "Show"} ${card.label}`}
                        aria-pressed={card.enabled}
                        className={`flex h-7 w-12 items-center rounded-full p-1 transition ${card.enabled ? "justify-end bg-[var(--color-action-primary)]" : "justify-start bg-[var(--border-subtle)]"}`}
                        onClick={() => onToggleCard?.(card.id)}
                        type="button"
                      >
                        <span className="h-5 w-5 rounded-full bg-white" />
                      </button>
                    </div>
                    {card.removable && onRemoveCard ? (
                      <button
                        className="mt-4 text-sm font-semibold text-[var(--color-accent)]"
                        onClick={() => onRemoveCard(card.id)}
                        type="button"
                      >
                        Remove card
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                No page sections yet. Sections appear here once your profile has content to show.
              </p>
            )}
          </section>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-4 py-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
            href="/settings"
            onClick={onClose}
          >
            <Settings className="h-4 w-4" />
            Open account settings
          </Link>
          <button
            className="rounded-full bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-action-primary-text)] transition hover:brightness-110"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
