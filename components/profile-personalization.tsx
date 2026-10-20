"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, X } from "lucide-react";

import { BeautyWorldPicker } from "@/components/beauty-world-picker";
import { getWorld } from "@/lib/beauty-world";
import {
  APP_SESSION_EVENT,
  readClientSession,
  type ProfileCardPreference,
} from "@/lib/client-session";
import type { ClientUserProfile } from "@/lib/personalization";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function syncProfile() {
      setClientProfile(readClientSession());
    }

    syncProfile();
    window.addEventListener(APP_SESSION_EVENT, syncProfile);

    return () => window.removeEventListener(APP_SESSION_EVENT, syncProfile);
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  const activeWorld = getWorld(clientProfile?.theme);
  const visibleCards = cards ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        aria-describedby="profile-personalization-description"
        aria-labelledby="profile-personalization-title"
        aria-modal="true"
        className="world-glass flex max-h-[calc(100dvh-0.25rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-[var(--world-glass-border)] sm:max-h-[min(88vh,calc(100dvh-2rem))] sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-clay-text)]">
                Profile
              </p>
              <h2
                className="bw-heading mt-1 break-words text-lg font-bold text-[var(--text-primary)]"
                id="profile-personalization-title"
              >
                Profile personalization
              </h2>
              <p
                className="mt-1 text-xs leading-5 text-[var(--color-secondary)]"
                id="profile-personalization-description"
              >
                Adjust how your profile appears. Account, security and workspace controls stay in Settings.
              </p>
            </div>
            <button
              aria-label="Close profile personalization"
              className="shrink-0 rounded-full bg-[var(--surface-card)] p-2 text-[var(--color-secondary)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {role === "client" ? (
            <section className="bw-surface rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
                Beauty world
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Preview each world, then select one. Your choice shapes recommendations and visual mood across the app. It does not change bookings or payments.
              </p>
              {clientProfile ? (
                <div className="mt-4">
                  <BeautyWorldPicker
                    columns="six"
                    onProfileChange={setClientProfile}
                    profile={clientProfile}
                  />
                </div>
              ) : (
                <p className="mt-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Your beauty world is currently{" "}
                  <span className="font-semibold text-[var(--text-primary)]">{activeWorld.displayName}</span>. Sign in again to change it.
                </p>
              )}
            </section>
          ) : (
            <section className="bw-surface rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
                Public page sections
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Turn sections on or off and they update the page visitors see.
              </p>
              {visibleCards.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {visibleCards.map((card) => (
                    <div
                      className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-4"
                      key={card.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-[var(--text-primary)]">{card.label}</p>
                          <p className="mt-1 text-xs text-[var(--color-secondary)]">
                            {card.enabled ? "Visible on page" : "Hidden from page"}
                          </p>
                        </div>
                        <button
                          aria-label={`${card.enabled ? "Hide" : "Show"} ${card.label}`}
                          aria-pressed={card.enabled}
                          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${card.enabled ? "justify-end bg-[var(--color-action-primary)]" : "justify-start bg-[var(--border-subtle)]"}`}
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
        </div>

        <div className="shrink-0 border-t border-[var(--border-subtle)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              href="/settings"
              onClick={onClose}
            >
              <Settings className="h-4 w-4" />
              Open account settings
            </Link>
            <button
              className="min-h-11 rounded-full bg-[var(--color-action-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-action-primary-text)] transition hover:brightness-110"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
