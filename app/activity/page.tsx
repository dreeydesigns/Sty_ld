"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionReveal } from "@/components/marketplace-ui";
import { ErrorBoundary } from "@/components/error-boundary";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  FileText,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";

type ActivityRecord = {
  id: string;
  targetName: string;
  targetType: string;
  services: string[];
  preferredDate: string;
  preferredTime: string;
  totalKES: number;
  status: string;
  notes?: string;
  createdAt: string;
};

type BookingRow = {
  id: string;
  provider_name?: string | null;
  target_type?: string | null;
  service_names?: string[] | string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  total_kes?: number | string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

function toActivityRecord(row: BookingRow): ActivityRecord {
  const services = Array.isArray(row.service_names)
    ? row.service_names.map((service) => String(service))
    : row.service_names
      ? [String(row.service_names)]
      : [];

  return {
    id: String(row.id),
    targetName: row.provider_name ?? "Your provider",
    targetType: row.target_type ?? "",
    services,
    preferredDate: row.booking_date ?? "",
    preferredTime: row.booking_time ?? "",
    totalKES: Number(row.total_kes ?? 0),
    status: row.status ?? "pending",
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? "",
  };
}

// ── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; dot: string }> = {
    pending: { bg: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-500" },
    accepted: { bg: "bg-blue-50 border-blue-200 text-blue-700", dot: "bg-blue-500" },
    completed: { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
    cancelled: { bg: "bg-rose-50 border-rose-200 text-rose-700", dot: "bg-rose-500" },
  };

  const config = styles[status] ?? styles.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider",
        config.bg
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dot)} />
      {status || "Pending"}
    </span>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function ActivityPage() {
  const [bookings, setBookings] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Session state is decided by the server response, never by a value read
  // during render, so the first client render always matches the SSR markup.
  const [isGuest, setIsGuest] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);

    try {
      const res = await fetch("/api/bookings", { credentials: "include", cache: "no-store" });

      if (res.status === 401) {
        setIsGuest(true);
        setBookings([]);
        setLoadFailed(false);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error("Unable to load activity.");
      setIsGuest(false);

      const payload = (await res.json()) as { ok?: boolean; bookings?: BookingRow[] };

      if (!payload || payload.ok !== true || !Array.isArray(payload.bookings)) {
        throw new Error("Unexpected activity response.");
      }

      // The bookings API is already scoped server-side to the signed-in account.
      const own = payload.bookings
        .filter((row) => row && typeof row.id === "string")
        .map(toActivityRecord);
      setBookings(own);
      setLoadFailed(false);
    } catch {
      // An API failure is not the same as having no activity.
      setLoadFailed(true);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  async function handleCancelBooking(bookingId: string, targetName: string) {
    if (typeof window !== "undefined" && !window.confirm(`Are you sure you want to cancel your booking with ${targetName}?`)) {
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId, status: "cancelled" }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Cancellation failed.");

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? { ...booking, status: "cancelled" } : booking
        )
      );
      showToast(`Booking with ${targetName} cancelled.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Cancellation failed. Please try again.", "error");
    }
  }

  function exportToCSV(items: ActivityRecord[]) {
    if (items.length === 0) return;

    const headers = ["Booking ID", "Provider", "Services", "Date", "Time", "Total (KES)", "Status"];
    const rows = items.map((record) => [
      record.id,
      record.targetName,
      record.services.join("; "),
      record.preferredDate,
      record.preferredTime,
      record.totalKES,
      record.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const filteredBookings = bookings.filter((record) => {
    if (filterStatus !== "all" && record.status !== filterStatus) return false;
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      return (
        record.targetName.toLowerCase().includes(query) ||
        record.services.some((service) => service.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const countByStatus = (status: string) => bookings.filter((record) => record.status === status).length;

  return (
    <AppShell currentNav="activity" requireSession>
      <ErrorBoundary>
        <div className="section-grid">
          <SectionReveal className="rounded-[36px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm lg:p-8">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-secondary)]">Activity</p>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">
              Your bookings and appointment updates, in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
              Track the status of your service requests and appointments here.
            </p>

            {isGuest ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-8 text-center">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">Sign in to see your activity</p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
                  Your bookings and appointment updates are private to your account.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/auth/sign-in?returnTo=/activity"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-ink)] px-6 text-sm font-semibold text-white"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/discover"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--border-subtle)] px-6 text-sm font-semibold text-[var(--text-primary)]"
                  >
                    Discover services
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {(["all", "pending", "accepted", "completed", "cancelled"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFilterStatus(status)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-xs font-bold capitalize transition-colors",
                        filterStatus === status
                          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                          : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      {status}
                      {status !== "all" && (
                        <span className={cn("ml-2", filterStatus === status ? "text-white/70" : "text-[var(--color-secondary)]")}>
                          {countByStatus(status)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Search className="h-5 w-5 text-[var(--color-secondary)]" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by provider or service..."
                      aria-label="Search activity"
                      className="h-12 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] pl-11 pr-4 text-sm font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--color-warning)] focus:bg-white"
                    />
                  </div>
                  {bookings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exportToCSV(filteredBookings)}
                      className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 text-xs font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-elevated)]"
                    >
                      <FileText className="h-4 w-4 text-[var(--color-secondary)]" />
                      Export CSV
                    </button>
                  )}
                </div>
              </>
            )}
          </SectionReveal>

          {!isGuest && (
            <SectionReveal className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm">
              {loading ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {[1, 2, 3].map((skeleton) => (
                    <div
                      key={skeleton}
                      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm"
                    >
                      <div className="skeleton h-4 w-2/3" />
                      <div className="skeleton mt-3 h-3 w-1/2" />
                      <div className="skeleton mt-4 h-8 w-full" style={{ borderRadius: "0.75rem" }} />
                    </div>
                  ))}
                </div>
              ) : loadFailed ? (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-8 text-center">
                  <TriangleAlert className="mx-auto h-10 w-10 text-rose-500" />
                  <p className="mt-4 text-xl font-semibold text-rose-800">We couldn&apos;t load your activity</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700">
                    Something went wrong while reaching the server. This does not mean you have no activity.
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadBookings()}
                    className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </button>
                </div>
              ) : bookings.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-10 text-center">
                  <Calendar className="mx-auto h-10 w-10 text-[var(--color-secondary)] opacity-50" />
                  <p className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">No bookings yet</p>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--color-secondary)]">
                    When you book a service, your requests and their status will appear here.
                  </p>
                  <Link
                    href="/book"
                    className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-ink)] px-6 text-sm font-semibold text-white"
                  >
                    Browse services
                  </Link>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-10 text-center">
                  <p className="text-xl font-semibold text-[var(--text-primary)]">No matching activity</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
                    No records match your current filter or search.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("all");
                      setSearchQuery("");
                    }}
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredBookings.map((record) => {
                    const cancellable = record.status === "pending" || record.status === "accepted";
                    const formattedDate = (() => {
                      try {
                        return new Date(record.preferredDate).toLocaleDateString("en-KE", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        });
                      } catch {
                        return record.preferredDate;
                      }
                    })();

                    return (
                      <article
                        key={record.id}
                        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {record.targetName}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-secondary)]">
                              {record.services.join(", ")}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className="text-base font-bold text-[var(--text-primary)]">
                              KES {record.totalKES.toLocaleString()}
                            </span>
                            <StatusBadge status={record.status} />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-secondary)]">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formattedDate}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {record.preferredTime}
                          </span>
                        </div>

                        {record.notes && (
                          <p className="mt-3 rounded-xl bg-[var(--surface-elevated)] px-4 py-3 text-xs leading-5 text-[var(--color-secondary)]">
                            {record.notes}
                          </p>
                        )}

                        {cancellable && (
                          <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                            <button
                              type="button"
                              onClick={() => void handleCancelBooking(record.id, record.targetName)}
                              className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"
                            >
                              Cancel request
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </SectionReveal>
          )}
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
