"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";

import { AppShell } from "@/components/app-shell";

const MUTED_KEY = "ms_muted_accounts";

interface MutedEntry {
  id: string;
  name: string;
  mutedAt: string;
}

function readMuted(): MutedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(MUTED_KEY) ?? "[]") as MutedEntry[];
  } catch {
    return [];
  }
}

function writeMuted(entries: MutedEntry[]) {
  localStorage.setItem(MUTED_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event("ms-muted-change"));
}

export default function MutedAccountsPage() {
  const [muted, setMuted] = useState<MutedEntry[]>([]);

  useEffect(() => {
    setMuted(readMuted());
  }, []);

  function handleUnmute(id: string) {
    const updated = muted.filter((m) => m.id !== id);
    writeMuted(updated);
    setMuted(updated);
  }

  return (
    <AppShell currentNav="profile" showBottomNav>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ms-border)] bg-white text-[var(--ms-mauve)] shadow-sm transition hover:text-[var(--ms-navy)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-[var(--ms-navy)]">Muted accounts</h1>
          <p className="text-[12px] text-[var(--ms-mauve)]">
            {muted.length === 0 ? "No accounts muted" : `${muted.length} account${muted.length !== 1 ? "s" : ""} muted`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-md pb-24">
        {muted.length === 0 ? (
          <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ms-soft-bg)]">
              <VolumeX className="h-7 w-7 text-[var(--ms-mauve)]" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-[var(--ms-navy)]">No muted accounts</p>
            <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
              When you mute someone, their posts won&apos;t appear in your feed.
              They won&apos;t know they&apos;ve been muted. Muted accounts appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
            {muted.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3.5 px-4 py-3.5 ${i < muted.length - 1 ? "border-b border-[var(--ms-border)]/60" : ""}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[15px] font-bold text-[var(--ms-mauve)]">
                  {entry.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[var(--ms-navy)]">{entry.name}</p>
                  <p className="text-[11px] text-[var(--ms-mauve)]">
                    Muted {new Date(entry.mutedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnmute(entry.id)}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--ms-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ms-mauve)] transition hover:border-[var(--ms-plum)] hover:text-[var(--ms-plum)]"
                >
                  <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
                  Unmute
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-[18px] bg-[var(--ms-soft-bg)] px-4 py-4">
          <p className="text-[12px] leading-5 text-[var(--ms-mauve)]">
            <strong className="text-[var(--ms-navy)]">About muting</strong> — Muting hides someone&apos;s posts from your feed without unfollowing them.
            They are not notified when they are muted. You can still see their profile by visiting it directly.
            You can mute someone from any of their posts.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
