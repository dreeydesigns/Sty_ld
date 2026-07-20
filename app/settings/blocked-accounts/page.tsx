"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, UserCheck, UserX } from "lucide-react";

import { AppShell } from "@/components/app-shell";

const BLOCKED_KEY = "ms_blocked_accounts";

interface BlockedEntry {
  id: string;
  name: string;
  blockedAt: string;
}

function readBlocked(): BlockedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(BLOCKED_KEY) ?? "[]") as BlockedEntry[];
  } catch {
    return [];
  }
}

function writeBlocked(entries: BlockedEntry[]) {
  localStorage.setItem(BLOCKED_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event("ms-blocked-change"));
}

export default function BlockedAccountsPage() {
  const [blocked, setBlocked] = useState<BlockedEntry[]>([]);

  useEffect(() => {
    setBlocked(readBlocked());
  }, []);

  function handleUnblock(id: string) {
    const updated = blocked.filter((b) => b.id !== id);
    writeBlocked(updated);
    setBlocked(updated);
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
          <h1 className="text-[20px] font-bold text-[var(--ms-navy)]">Blocked accounts</h1>
          <p className="text-[12px] text-[var(--ms-mauve)]">
            {blocked.length === 0 ? "No accounts blocked" : `${blocked.length} account${blocked.length !== 1 ? "s" : ""} blocked`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-md pb-24">
        {blocked.length === 0 ? (
          <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ms-soft-bg)]">
              <UserX className="h-7 w-7 text-[var(--ms-mauve)]" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-[var(--ms-navy)]">No blocked accounts</p>
            <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
              When you block someone, they won&apos;t be able to see your profile or interact with you.
              Blocked accounts appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
            {blocked.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3.5 px-4 py-3.5 ${i < blocked.length - 1 ? "border-b border-[var(--ms-border)]/60" : ""}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[15px] font-bold text-[var(--ms-mauve)]">
                  {entry.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[var(--ms-navy)]">{entry.name}</p>
                  <p className="text-[11px] text-[var(--ms-mauve)]">
                    Blocked {new Date(entry.blockedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnblock(entry.id)}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--ms-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ms-mauve)] transition hover:border-[var(--ms-plum)] hover:text-[var(--ms-plum)]"
                >
                  <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-[18px] bg-[var(--ms-soft-bg)] px-4 py-4">
          <p className="text-[12px] leading-5 text-[var(--ms-mauve)]">
            <strong className="text-[var(--ms-navy)]">About blocking</strong> — Blocked accounts cannot view your profile, posts, or contact you.
            Unblocking someone does not automatically restore any follows or connections.
            You can block someone from their profile page.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
