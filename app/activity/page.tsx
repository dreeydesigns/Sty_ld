"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CTAButton, SectionReveal } from "@/components/marketplace-ui";
import { ClientRatingFlow } from "@/components/service-session";
import { ErrorBoundary } from "@/components/error-boundary";
import { readAppSession } from "@/lib/client-session";
import {
  getClientBookings,
  writeBooking,
  updateBookingStatus,
  rescheduleBooking,
  SOCIAL_CHANGE_EVENT,
  type BookingRequest,
  type BookingStatus,
} from "@/lib/social-store";
import { signalSessionExpired } from "@/components/session-expiry-modal";
import { BookingTimeline, TrustShield } from "@/components/wow-ux";
import { showToast } from "@/lib/toast";
import { cn, buildWhatsAppLink } from "@/lib/utils";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  X, 
  AlertCircle, 
  ChevronRight, 
  ReceiptText,
  Share2,
  Star,
  Search,
  MessageCircle
} from "lucide-react";

// ── Service Pricing Breakdown Helper ─────────────────────────────────────────

function getServiceBreakdown(services: string[], total: number) {
  if (!services || services.length === 0) return [];
  const baseCount = services.length;
  // Separate a mock "Platform Service Charge" of KES 250 if total is large enough (> KES 1,000)
  const serviceCharge = total > 1000 ? 250 : 0;
  const remaining = total - serviceCharge;
  const perService = Math.round(remaining / baseCount);
  
  const items = services.map((name, idx) => {
    // Last item receives remaining balance to avoid rounding errors
    const price = idx === baseCount - 1 
      ? remaining - (perService * (baseCount - 1))
      : perService;
    return { name, price };
  });
  
  if (serviceCharge > 0) {
    items.push({ name: "Platform Service Charge", price: serviceCharge });
  }
  
  return items;
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_28px_rgba(13,27,42,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-6 w-16 shrink-0" />
      </div>
      <div className="mt-3 flex gap-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-20" />
      </div>
      <div className="skeleton mt-4 h-8 w-full" style={{ borderRadius: "0.75rem" }} />
    </div>
  );
}

// ── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingRequest["status"] }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setPulse(true);
    });
    const t = setTimeout(() => setPulse(false), 3000);
    return () => clearTimeout(t);
  }, [status]);

  const styles: Record<string, { bg: string; dot: string; text: string }> = {
    pending: { bg: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-500", text: "text-amber-500" },
    accepted: { bg: "bg-blue-50 border-blue-200 text-blue-700", dot: "bg-blue-500", text: "text-blue-500" },
    completed: { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500", text: "text-emerald-500" },
    cancelled: { bg: "bg-rose-50 border-rose-200 text-rose-700", dot: "bg-rose-500", text: "text-rose-500" },
  };

  const config = styles[status] || styles.pending;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider transition-all duration-500 relative",
      config.bg,
      pulse ? "scale-105 ring-2 ring-offset-1 ring-current/20 shadow-sm" : "scale-100"
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full shrink-0",
        config.dot,
        pulse && "animate-ping"
      )} />
      {pulse && (
        <span className={cn("h-1.5 w-1.5 rounded-full absolute left-2.5", config.dot)} />
      )}
      <span>{status}</span>
      {pulse && (
        <span className={cn("animate-bounce shrink-0 ml-0.5", config.text)}>
          ✦
        </span>
      )}
    </span>
  );
}

// ── ICS Calendar Generator Helper ─────────────────────────────────────────────

function handleDownloadIcs(booking: BookingRequest) {
  try {
    const title = `Appointment with ${booking.targetName}`;
    const desc = `Services: ${booking.services.join(", ")}\nTotal Investment: KES ${booking.totalKES}`;
    const locationStr = booking.location || "Styld (travels to your location)";

    // Clean dates
    const dateParts = booking.preferredDate.split("-"); // "YYYY-MM-DD"
    let startHour = 9;
    let startMin = 0;
    let endHour = 11;
    let endMin = 0;

    if (booking.preferredTime) {
      const parts = booking.preferredTime.split("-");
      if (parts[0]) {
        const startStr = parts[0].trim();
        const timeMatch = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3].toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          startHour = h;
          startMin = m;
        }
      }
      if (parts[1]) {
        const endStr = parts[1].trim();
        const timeMatch = endStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3].toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          endHour = h;
          endMin = m;
        }
      } else {
        endHour = startHour + 1;
        endMin = startMin;
      }
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = dateParts[0] || "2026";
    const mm = dateParts[1] || "07";
    const dd = dateParts[2] || "19";

    const startFormatted = `${yyyy}${mm}${dd}T${pad(startHour)}${pad(startMin)}00`;
    const endFormatted = `${yyyy}${mm}${dd}T${pad(endHour)}${pad(endMin)}00`;

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Styld//Appointment Calendar//EN",
      "BEGIN:VEVENT",
      `UID:${booking.id}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc.replace(/\n/g, "\\n")}`,
      `LOCATION:${locationStr}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ];

    const icsString = icsLines.join("\r\n");
    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointment_${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to generate ICS file:", error);
    alert("Could not generate the calendar export at this moment.");
  }
}

function handleGoogleCalendarSync(booking: BookingRequest) {
  try {
    const title = `Appointment with ${booking.targetName}`;
    const desc = `Services: ${booking.services.join(", ")}\nTotal Investment: KES ${booking.totalKES}`;
    const locationStr = booking.location || "Styld (travels to your location)";

    const dateParts = booking.preferredDate.split("-"); // "YYYY-MM-DD"
    let startHour = 9;
    let startMin = 0;
    let endHour = 11;
    let endMin = 0;

    if (booking.preferredTime) {
      const parts = booking.preferredTime.split("-");
      if (parts[0]) {
        const startStr = parts[0].trim();
        const timeMatch = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3].toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          startHour = h;
          startMin = m;
        }
      }
      if (parts[1]) {
        const endStr = parts[1].trim();
        const timeMatch = endStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3].toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          endHour = h;
          endMin = m;
        }
      } else {
        endHour = startHour + 1;
        endMin = startMin;
      }
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = dateParts[0] || "2026";
    const mm = dateParts[1] || "07";
    const dd = dateParts[2] || "19";

    const startFormatted = `${yyyy}${mm}${dd}T${pad(startHour)}${pad(startMin)}00`;
    const endFormatted = `${yyyy}${mm}${dd}T${pad(endHour)}${pad(endMin)}00`;

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.append("action", "TEMPLATE");
    url.searchParams.append("text", title);
    url.searchParams.append("dates", `${startFormatted}/${endFormatted}`);
    url.searchParams.append("details", desc);
    url.searchParams.append("location", locationStr);

    window.open(url.toString(), "_blank");
  } catch (err) {
    console.error("Error generating Google Calendar link", err);
  }
}


// ── Booking Card ──────────────────────────────────────────────────────────────

// ── Booking Card ──────────────────────────────────────────────────────────────

function checkIsRushBooking(booking: BookingRequest) {
  try {
    if (!booking.createdAt) return false;
    const created = new Date(booking.createdAt).getTime();
    let startHour = 12;
    if (booking.preferredTime) {
      const parts = booking.preferredTime.split("-");
      const timeMatch = parts[0]?.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const ampm = timeMatch[3].toUpperCase();
        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        startHour = h;
      }
    }
    const appointmentTime = new Date(`${booking.preferredDate}T${String(startHour).padStart(2, "0")}:00:00`).getTime();
    const diffHrs = (appointmentTime - created) / (1000 * 60 * 60);
    return diffHrs >= 0 && diffHrs <= 24;
  } catch { return false; }
}

interface BookingCardProps {
  booking: BookingRequest;
  onSelect: (booking: BookingRequest) => void;
  onCancel: (e: React.MouseEvent, id: string, name: string) => void;
  onReschedule: (e: React.MouseEvent, booking: BookingRequest) => void;
  onDownloadIcs: (e: React.MouseEvent, booking: BookingRequest) => void;
  onGoogleCalendarSync: (e: React.MouseEvent, booking: BookingRequest) => void;
  onShareBooking: (e: React.MouseEvent, booking: BookingRequest) => void;
  onRateBooking?: (e: React.MouseEvent, booking: BookingRequest) => void;
}

function BookingCard({ 
  booking, 
  onSelect, 
  onCancel, 
  onReschedule, 
  onDownloadIcs,
  onGoogleCalendarSync,
  onShareBooking,
  onRateBooking
}: BookingCardProps) {
  const dateStr = (() => {
    try {
      return new Date(booking.preferredDate).toLocaleDateString("en-KE", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      });
    } catch { return booking.preferredDate; }
  })();

  const isRushBooking = checkIsRushBooking(booking);

  const isCancellable = booking.status === "pending" || booking.status === "accepted";

  return (
    <div 
      onClick={() => onSelect(booking)}
      className="card-lift group rounded-[24px] bg-white p-5 shadow-[0_8px_28px_rgba(13,27,42,0.07)] cursor-pointer hover:shadow-[0_12px_36px_rgba(13,27,42,0.11)] transition-all border border-[var(--border-subtle)]/50 hover:border-\[var\(--color-warning\)]/20 relative"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
              {booking.targetName}
            </p>
            <ChevronRight className="h-3 w-3 text-\[var\(--color-secondary\)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all" />
          </div>
          {/* Service list with hover tooltip */}
          <div className="relative group/tooltip mt-1 max-w-fit">
            <p className="truncate text-xs text-\[var\(--color-secondary\)] max-w-[200px] sm:max-w-[300px]">
              {booking.services.join(", ")}
            </p>
            {booking.services.join(", ").length > 25 && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block bg-[var(--color-ink)] text-white text-[11px] font-medium py-1.5 px-3 rounded-xl shadow-lg z-20 whitespace-normal min-w-[200px] max-w-xs transition-all duration-200">
                <p className="font-semibold text-white/60 text-[9px] uppercase tracking-wider mb-0.5">Services booked</p>
                {booking.services.join(", ")}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 animate-fade-in">
          <span className="text-base font-bold text-[var(--text-primary)]">
            KES {booking.totalKES.toLocaleString()}
          </span>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-\[var\(--color-secondary\)]">
        <span className="font-medium">{dateStr}</span>
        <span className="text-gray-300">·</span>
        <span className="font-medium">{booking.preferredTime}</span>
        {booking.location && (
          <>
            <span className="text-gray-300">·</span>
            <span className="truncate max-w-[120px] sm:max-w-[180px]">{booking.location}</span>
          </>
        )}
        {isRushBooking && (
          <>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1 rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
              <Clock className="h-3 w-3" /> Rush Service
            </span>
          </>
        )}
      </div>

      {/* Animated timeline */}
      <div className="mt-4">
        <BookingTimeline status={booking.status as Parameters<typeof BookingTimeline>[0]["status"]} />
      </div>

      {/* Actions and Trust Shield */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2.5 items-center justify-between border-t border-gray-50 pt-3.5">
        {isCancellable ? (
          <>
            <div className="w-full sm:w-auto">
              <TrustShield variant="payment" />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={(e) => onShareBooking(e, booking)}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--color-border)] border border-[var(--border-subtle)] transition-colors inline-flex items-center gap-1 shrink-0"
              >
                <Share2 className="h-3.5 w-3.5 text-[var(--color-secondary)]" />
                Share
              </button>
              {booking.status === "accepted" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(buildWhatsAppLink(`booking support for ${booking.targetName}`));
                  }}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors inline-flex items-center gap-1 shrink-0"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              )}
              {booking.status === "accepted" && (
                <>
                  <button
                    type="button"
                    onClick={(e) => onGoogleCalendarSync(e, booking)}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Google Calendar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onDownloadIcs(e, booking)}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Apple Calendar
                  </button>
                </>
              )}
              {booking.status === "pending" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReschedule(e, booking);
                  }}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                  Reschedule
                </button>
              )}
              <button
                type="button"
                onClick={(e) => onCancel(e, booking.id, booking.targetName)}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 shrink-0 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                booking.status === "completed" ? "bg-emerald-400" : "bg-red-400"
              )} />
              <span className="text-[11px] font-bold text-\[var\(--color-secondary\)] uppercase tracking-wider">{booking.status}</span>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              {booking.status === "completed" && onRateBooking && (
                <button
                  type="button"
                  onClick={(e) => onRateBooking(e, booking)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors inline-flex items-center gap-1 shrink-0"
                >
                  <Star className="h-3.5 w-3.5 fill-emerald-700 text-emerald-700 animate-pulse" />
                  Rate
                </button>
              )}
              <button
                type="button"
                onClick={(e) => onShareBooking(e, booking)}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--color-border)] border border-[var(--border-subtle)] transition-colors inline-flex items-center gap-1 shrink-0"
              >
                <Share2 className="h-3.5 w-3.5 text-[var(--color-secondary)]" />
                Share
              </button>
              {booking.status === "completed" && (
                <>
                  <button
                    type="button"
                    onClick={(e) => onGoogleCalendarSync(e, booking)}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Google Calendar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onDownloadIcs(e, booking)}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Apple Calendar
                  </button>
                </>
              )}
              {booking.status === "completed" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(buildWhatsAppLink(`booking support for ${booking.targetName}`));
                  }}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors inline-flex items-center gap-1 shrink-0"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function ActivityPage() {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRequest | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterBookingType, setFilterBookingType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // ── Toast Notification System State & Actions ──────────────────────────────
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "warning" | "error" | "info" }>>([]);

  const addToast = (message: string, statusType: string = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    let type: "success" | "warning" | "error" | "info" = "info";
    if (statusType === "accepted" || statusType === "completed" || statusType === "success") {
      type = "success";
    } else if (statusType === "cancelled" || statusType === "error") {
      type = "error";
    } else if (statusType === "pending" || statusType === "warning") {
      type = "warning";
    }
    
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // ── Export History Functions ────────────────────────────────────────────────
  const exportToCSV = (items: BookingRequest[]) => {
    if (items.length === 0) {
      addToast("No bookings to export!", "warning");
      return;
    }
    const headers = ["Booking ID", "Provider", "Type", "Services", "Date", "Time", "Total (KES)", "Status", "Notes", "Created At"];
    const rows = items.map((b) => [
      b.id,
      b.targetName,
      b.targetType,
      b.services.join("; "),
      b.preferredDate,
      b.preferredTime,
      b.totalKES,
      b.status,
      b.notes || "",
      b.createdAt,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `booking_history_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Booking history exported to CSV successfully!", "success");
  };

  const exportToPDF = (items: BookingRequest[]) => {
    if (items.length === 0) {
      addToast("No bookings to export!", "warning");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast("Please allow popups to export PDF.", "warning");
      return;
    }

    const rowsHtml = items.map((b, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 12px 8px; font-size: 12px;">
          <strong style="color: #0f172a;">${b.targetName}</strong><br/>
          <span style="color: #64748b; font-size: 11px;">${b.targetType}</span>
        </td>
        <td style="padding: 12px 8px; font-size: 12px; color: #475569;">${b.services.join(", ")}</td>
        <td style="padding: 12px 8px; font-size: 12px; color: #475569;">${b.preferredDate}<br/><span style="color: #64748b; font-size: 11px;">${b.preferredTime}</span></td>
        <td style="padding: 12px 8px; font-size: 12px; font-weight: bold; color: #0f172a;">KES ${b.totalKES.toLocaleString()}</td>
        <td style="padding: 12px 8px; font-size: 12px;">
          <span style="
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            ${b.status === "accepted" ? "background: #dbeafe; color: #1e40af;" : ""}
            ${b.status === "completed" ? "background: #d1fae5; color: #065f46;" : ""}
            ${b.status === "pending" ? "background: #fef3c7; color: #92400e;" : ""}
            ${b.status === "cancelled" ? "background: #fee2e2; color: #991b1b;" : ""}
          ">${b.status}</span>
        </td>
      </tr>
    `).join("");

    const totalSpent = items.reduce((sum, b) => sum + b.totalKES, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Booking History Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5; padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #C0A090; text-transform: uppercase; letter-spacing: 1px; }
            .title { font-size: 18px; font-weight: 700; color: #0f172a; text-align: right; }
            .meta { font-size: 12px; color: #64748b; margin-top: 4px; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8fafc; text-align: left; padding: 12px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #cbd5e1; }
            .summary-box { display: flex; justify-content: flex-end; margin-top: 20px; }
            .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; width: 280px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .summary-row:last-child { margin-bottom: 0; padding-top: 8px; border-top: 1px solid #e2e8f0; }
            .footer { text-align: center; margin-top: 60px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo" style="display: flex; align-items: center; gap: 8px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                Styld
              </div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Premium On-Demand Beauty Marketplace</div>
            </div>
            <div>
              <div class="title">Booking History Report</div>
              <div class="meta">Generated on: ${new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}</div>
              <div class="meta">Records: ${items.length} appointments</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 25%">Service Provider</th>
                <th style="width: 25%">Services</th>
                <th style="width: 20%">Schedule</th>
                <th style="width: 13%">Amount</th>
                <th style="width: 12%">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-card">
              <div class="summary-row">
                <span style="color: #64748b;">Total Bookings:</span>
                <strong style="color: #0f172a;">${items.length}</strong>
              </div>
              <div class="summary-row">
                <span style="color: #64748b;">Completed/Accepted:</span>
                <strong style="color: #0f172a;">${items.filter(b => b.status === "completed" || b.status === "accepted").length}</strong>
              </div>
              <div class="summary-row" style="border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 8px; font-size: 14px;">
                <span style="font-weight: bold; color: #0f172a;">Total Investment:</span>
                <strong style="color: #C0A090; font-size: 16px;">KES ${totalSpent.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div class="footer">
            Thank you for choosing Styld. Your trusted partner for professional home beauty services.<br/>
            &copy; 2026 Styld Kenya. All rights reserved.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    addToast("Booking history report exported to PDF successfully!", "success");
  };

  // ── Simulator for Status Change (Demo Toast Notification System) ────────────
  const handleSimulateStatusChange = () => {
    if (bookings.length === 0) {
      addToast("No bookings available to simulate change.", "warning");
      return;
    }
    const randomIndex = Math.floor(Math.random() * bookings.length);
    const target = bookings[randomIndex];
    const statuses: BookingRequest["status"][] = ["pending", "accepted", "completed", "cancelled"];
    const currentStatusIndex = statuses.indexOf(target.status);
    const nextStatus = statuses[(currentStatusIndex + 1) % statuses.length];
    
    // Trigger toast
    addToast(`Booking with ${target.targetName} updated to ${nextStatus.toUpperCase()}!`, nextStatus);
    
    // Update local state and trigger side-effect in localStorage
    updateBookingStatus(target.id, nextStatus);
  };

  async function loadBookings() {
    const session = readAppSession();
    if (!session || session.role === "guest") { setLoading(false); return; }

    // Load from localStorage immediately
    const local = getClientBookings(session.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setBookings(local);
    setLoading(false);

    // Then try DB and merge (DB is source of truth for status)
    try {
      const res = await fetch("/api/bookings", { credentials: "include" });
      if (res.status === 401) { signalSessionExpired(); return; }
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; bookings?: Array<{
        local_id?: string; id: string; service_names?: string[];
        provider_name?: string; provider_slug?: string; target_type?: string;
        booking_date: string; booking_time: string; total_kes?: number;
        notes?: string; status: string; created_at: string; updated_at: string;
      }> };
      if (!data.ok || !data.bookings) return;

      let hasChanges = false;
      // Merge: write any DB bookings not yet in localStorage or update their status if changed!
      for (const dbB of data.bookings) {
        const localId = dbB.local_id ?? dbB.id;
        const localBooking = local.find((b) => b.id === localId || b.id === dbB.id);
        if (!localBooking) {
          const mapped: BookingRequest = {
            id: localId,
            clientId: session.id,
            clientName: session.role === "client" ? (session as { firstName: string }).firstName : "User",
            targetType: (dbB.target_type ?? "professionals") as "salons" | "professionals",
            targetSlug: dbB.provider_slug ?? "",
            targetName: dbB.provider_name ?? "Provider",
            services: dbB.service_names ?? [],
            preferredDate: dbB.booking_date,
            preferredTime: dbB.booking_time,
            totalKES: dbB.total_kes ?? 0,
            notes: dbB.notes ?? undefined,
            status: dbB.status as BookingRequest["status"],
            createdAt: dbB.created_at,
            updatedAt: dbB.updated_at,
          };
          writeBooking(mapped);
          hasChanges = true;
        } else if (localBooking.status !== dbB.status) {
          // Status changed! Let's toast the user
          addToast(`Your booking with ${dbB.provider_name} was updated to ${dbB.status.toUpperCase()}!`, dbB.status);
          updateBookingStatus(localBooking.id, dbB.status as BookingStatus);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const merged = getClientBookings(session.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookings(merged);
      }
    } catch { /* stay with localStorage */ }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadBookings();
    });

    function onStorageChange() {
      const session = readAppSession();
      if (!session) return;
      const local = getClientBookings(session.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(local);

      // Keep open modal data in sync
      setSelectedBooking((current) => {
        if (!current) return null;
        const updated = local.find((b) => b.id === current.id);
        return updated || current;
      });
    }

    window.addEventListener(SOCIAL_CHANGE_EVENT, onStorageChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, onStorageChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  const handleShareBooking = (e: React.MouseEvent, booking: BookingRequest) => {
    if (e) e.stopPropagation();
    const shareText = `Appointment details with ${booking.targetName}:
💅 Services: ${booking.services.join(", ")}
📅 Date: ${booking.preferredDate}
⏰ Time: ${booking.preferredTime}
💰 Total: KES ${booking.totalKES.toLocaleString()}
📍 Location: ${booking.location || "Styld"}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `Appointment with ${booking.targetName}`,
        text: shareText,
      }).catch((err) => {
        console.warn("Native share failed:", err);
      });
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      addToast("Booking details copied to clipboard!", "success");
    } else {
      addToast("Sharing is not supported on this browser.", "warning");
    }
  };

  const handleCancelBooking = async (e: React.MouseEvent, bookingId: string, targetName: string) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to cancel your booking with ${targetName}?`)) {
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status: "cancelled" }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Cancellation failed.");
    // 1. Update localStorage status (triggers SOCIAL_CHANGE_EVENT)
    updateBookingStatus(bookingId, "cancelled");

    // 2. Alert salon and show toast
    addToast(`Booking with ${targetName} cancelled.`, "cancelled");

    // 3. Keep modal in sync
    setSelectedBooking((current) => {
      if (current?.id === bookingId) {
        return { ...current, status: "cancelled" };
      }
      return current;
    });


    } catch (error) {
      showToast(error instanceof Error ? error.message : "Cancellation failed. Please try again.", "error");
    }
  };

  // Status counters for Filter component
  const getCount = (status: string) => {
    let list = bookings;
    if (filterMonth !== "all") {
      list = bookings.filter((b) => {
        try {
          const d = new Date(b.preferredDate);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === filterMonth;
        } catch { return false; }
      });
    }
    if (status === "all") return list.length;
    return list.filter((b) => b.status === status).length;
  };

  const availableMonths = Array.from(
    new Set(
      bookings.map((b) => {
        try {
          const d = new Date(b.preferredDate);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        } catch {
          return "";
        }
      }).filter(Boolean)
    )
  ).sort().reverse();

  const filteredBookings = bookings.filter((b) => {
    let matchStatus = true;
    if (filterStatus !== "all") {
      matchStatus = b.status === filterStatus;
    }
    let matchMonth = true;
    if (filterMonth !== "all") {
      try {
        const d = new Date(b.preferredDate);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        matchMonth = m === filterMonth;
      } catch {
        matchMonth = false;
      }
    }
    let matchSearch = true;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      matchSearch = b.targetName.toLowerCase().includes(q) || b.services.some(s => s.toLowerCase().includes(q));
    }
    let matchBookingType = true;
    if (filterBookingType === "rush") {
      matchBookingType = checkIsRushBooking(b);
    }
    return matchStatus && matchMonth && matchSearch && matchBookingType;
  });

  return (
    <AppShell currentNav="activity" requireSession>
      <ClientRatingFlow />
      <ErrorBoundary>
        <div className="section-grid">
          <SectionReveal className="rounded-[36px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)] lg:p-8">
            <p className="text-xs uppercase tracking-[0.22em] text-\[var\(--color-secondary\)]">Activity</p>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">
              Your bookings, saves, and follow-ups — in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-\[var\(--color-secondary\)]">
              Upcoming appointments, recent requests, and status updates stay organised here.
            </p>

            {bookings.length > 0 && (
              <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4">
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)]">Pending</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600">{getCount("pending")}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)]">Accepted</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{getCount("accepted")}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)]">Completed</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600">{getCount("completed")}</p>
                  </div>
                </div>

                <div className="flex w-full max-w-lg gap-3">
                  <select
                    value={filterBookingType}
                    onChange={(e) => setFilterBookingType(e.target.value)}
                    className="h-12 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-\[var\(--color-warning\)] focus:bg-white"
                  >
                    <option value="all">All</option>
                    <option value="accepted">Accepted</option>
                    <option value="pending">Pending</option>
                    <option value="rush">Rush Service</option>
                  </select>
                  <div className="relative w-full">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Search className="h-5 w-5 text-\[var\(--color-secondary\)]" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by provider or service..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] pl-11 pr-4 text-sm font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-\[var\(--color-warning\)] focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </SectionReveal>

          {/* Status Filter Component & Exports / Actions */}
          {bookings.length > 0 && (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              

              <SectionReveal className="flex flex-wrap items-center gap-2">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="rounded-full border border-[var(--border-subtle)] bg-white px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:border-\[var\(--color-warning\)] hover:text-[var(--color-accent)] focus:border-\[var\(--color-warning\)] focus:outline-none transition-colors"
                >
                  <option value="all">All Dates</option>
                  {availableMonths.map((m) => {
                    const [year, month] = m.split("-");
                    const date = new Date(parseInt(year), parseInt(month) - 1);
                    return (
                      <option key={m} value={m}>
                        {date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={() => exportToCSV(filteredBookings)}
                  title="Export filtered booking history to CSV file"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-[var(--border-subtle)] hover:border-gray-300 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-all shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5 text-\[var\(--color-secondary\)]" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportToPDF(filteredBookings)}
                  title="Export filtered booking history as a PDF report"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-[var(--border-subtle)] hover:border-gray-300 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-all shadow-sm"
                >
                  <ReceiptText className="h-3.5 w-3.5 text-\[var\(--color-secondary\)]" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulateStatusChange}
                  title="Simulate random appointment status change to trigger Toast Notification alert"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-100 hover:border-rose-200 text-xs font-bold text-[var(--color-accent)] hover:bg-rose-100/50 transition-all shadow-sm"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Simulate Status Change</span>
                </button>
              </SectionReveal>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
            </div>
          ) : bookings.length === 0 ? (
            <SectionReveal className="rounded-[28px] bg-white p-10 text-center shadow-[0_12px_40px_rgba(13,27,42,0.08)]">
              {/* Cozy minimalist beauty salon illustration from generate_image tool */}
              <div className="mx-auto mb-6 max-w-xs overflow-hidden rounded-3xl border border-[var(--border-subtle)] shadow-sm">
                <img 
                  src="/images/empty_bookings.jpg" 
                  alt="Cozy aesthetic beauty salon illustration" 
                  className="h-auto w-full object-cover"
                />
              </div>
              <p className="text-3xl font-semibold text-[var(--text-primary)]">No bookings yet</p>
              <p className="mt-3 text-sm leading-7 text-\[var\(--color-secondary\)]">
                When you book a service, it will appear here so you can track its status.
              </p>
              <Link
                href="/discover"
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-7 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(212,83,126,0.22)] transition hover:brightness-110"
              >
                Browse services
              </Link>
            </SectionReveal>
          ) : filteredBookings.length === 0 ? (
            <SectionReveal className="rounded-[28px] bg-white p-10 text-center shadow-[0_12px_40px_rgba(13,27,42,0.08)]">
              <p className="text-2xl font-semibold text-[var(--text-primary)]">No {filterStatus} bookings found</p>
              <p className="mt-2.5 text-sm text-\[var\(--color-secondary\)]">
                {`You don't have any requests or appointments marked as "${filterStatus}" right now.`}
              </p>
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className="mt-4 inline-flex px-5 py-2 rounded-full border border-[var(--border-subtle)] text-xs font-semibold text-\[var\(--color-secondary\)] hover:bg-[var(--surface-card)] transition"
              >
                Show all bookings
              </button>
            </SectionReveal>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredBookings.map((b) => (
                <BookingCard 
                  key={b.id} 
                  booking={b} 
                  onSelect={setSelectedBooking} 
                  onCancel={handleCancelBooking} 
                  onReschedule={(e, bItem) => {
                    e.stopPropagation();
                    setReschedulingBooking(bItem);
                    setRescheduleDate(bItem.preferredDate);
                    setRescheduleTime(bItem.preferredTime);
                  }}
                  onDownloadIcs={(e, bItem) => {
                    e.stopPropagation();
                    handleDownloadIcs(bItem);
                  }}
                  onGoogleCalendarSync={(e, bItem) => {
                    e.stopPropagation();
                    handleGoogleCalendarSync(bItem);
                  }}
                  onShareBooking={(e, bItem) => {
                    handleShareBooking(e, bItem);
                  }}
                  onRateBooking={(e, bItem) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent("ms-rate-booking", { detail: bItem }));
                  }}
                />
              ))}
            </div>
          )}

          <SectionReveal className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-\[var\(--color-secondary\)]">Need a fresh request?</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
                  Jump back into booking without losing context.
                </h2>
              </div>
              <CTAButton href="/book">Book again</CTAButton>
            </div>
          </SectionReveal>
        </div>
      </ErrorBoundary>

      {/* Booking Details Modal */}
      {selectedBooking && (() => {
        const fullDateStr = (() => {
          try {
            return new Date(selectedBooking.preferredDate).toLocaleDateString("en-KE", {
              weekday: "long", day: "numeric", month: "long", year: "numeric"
            });
          } catch { return selectedBooking.preferredDate; }
        })();

        const items = getServiceBreakdown(selectedBooking.services, selectedBooking.totalKES);
        const isCancellable = selectedBooking.status === "pending" || selectedBooking.status === "accepted";

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-\[var\(--color-border\)]0 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setSelectedBooking(null)}
          >
            <div 
              className="w-full max-w-lg rounded-[32px] bg-white p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="absolute right-6 top-6 p-2 rounded-full hover:bg-\[var\(--color-border\)] text-\[var\(--color-secondary\)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title Header */}
              <div className="mb-5 pr-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent)] mb-1">
                  {selectedBooking.targetType === "salons" ? "Salon Appointment" : "Stylist Appointment"}
                </p>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                  {selectedBooking.targetName}
                </h3>
              </div>

              {/* Scrollable details wrapper */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-2">
                {/* Map Section */}
                <div className="bg-[var(--surface-card)] rounded-2xl p-4.5 border border-[var(--border-subtle)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-\[var\(--color-secondary\)] mb-2">Provider Location</p>
                  <div className="w-full h-40 rounded-[12px] bg-\[var\(--color-border\)] overflow-hidden relative border border-[var(--border-subtle)] shrink-0">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps?q=${encodeURIComponent(selectedBooking.targetName + " Kenya")}&output=embed`}
                      allowFullScreen
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur rounded-[10px] p-2 text-[11px] font-semibold text-[var(--text-primary)] shadow-sm text-center border border-[var(--border-subtle)] pointer-events-none">
                      📍 {selectedBooking.targetName}
                    </div>
                  </div>
                </div>
                {/* Visual status board */}
                <div className="bg-[var(--surface-card)] rounded-2xl p-4.5 border border-[var(--border-subtle)]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-\[var\(--color-secondary\)] mb-2">Booking Status</p>
                  <BookingTimeline status={selectedBooking.status as Parameters<typeof BookingTimeline>[0]["status"]} />
                </div>

                {/* Info specifications list */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--color-accent)]">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)]">Date</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{fullDateStr}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--color-accent)]">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)]">Time Window</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{selectedBooking.preferredTime}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--color-accent)]">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)]">Location Address</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] mb-3">
                        {selectedBooking.location || "Styld service (Stylist travels to your location)"}
                      </p>
                      <div className="w-full h-40 rounded-xl overflow-hidden border border-[var(--border-subtle)]">
                        <iframe 
                          width="100%" 
                          height="100%" 
                          frameBorder="0" 
                          style={{ border: 0 }}
                          src={`https://www.google.com/maps?q=${encodeURIComponent(selectedBooking.location || "Nairobi CBD, Kenya")}&output=embed`}
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </div>

                  {selectedBooking.notes && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--color-accent)]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)]">Booking Instructions / Notes</p>
                        <p className="mt-0.5 text-sm italic text-\[var\(--color-secondary\)] leading-6">{`"${selectedBooking.notes}"`}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipt-style cost breakdown */}
                <div className="border-t border-dashed border-[var(--border-subtle)] pt-5">
                  <div className="flex items-center gap-1.5 mb-3 text-[11px] font-bold uppercase tracking-wider text-\[var\(--color-secondary\)]">
                    <ReceiptText className="h-3.5 w-3.5 text-\[var\(--color-secondary\)]" />
                    <span>Price breakdown</span>
                  </div>
                  <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-4.5 space-y-3 font-sans">
                    {items.map((item, idx) => {
                      const isFee = item.name.includes("Service Charge");
                      return (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className={cn(
                            "font-medium",
                            isFee ? "text-\[var\(--color-secondary\)] text-xs italic" : "text-\[var\(--color-secondary\)]"
                          )}>
                            {item.name}
                          </span>
                          <span className={cn(
                            "font-bold",
                            isFee ? "text-\[var\(--color-secondary\)] text-xs" : "text-[var(--text-primary)]"
                          )}>
                            KES {item.price.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t border-[var(--border-subtle)] pt-3 mt-3 flex justify-between items-baseline">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">Grand Total</span>
                      <span className="text-lg font-extrabold text-[var(--color-accent)]">
                        KES {selectedBooking.totalKES.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="mt-6 flex flex-col sm:flex-row gap-2 border-t border-[var(--border-subtle)] pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="flex-1 min-h-12 inline-flex items-center justify-center rounded-full border border-[var(--border-subtle)] text-sm font-semibold text-\[var\(--color-secondary\)] hover:bg-[var(--surface-card)] transition-colors"
                >
                  Close
                </button>
                {(selectedBooking.status === "accepted" || selectedBooking.status === "completed") && (
                  <button
                    type="button"
                    onClick={() => handleDownloadIcs(selectedBooking)}
                    className="flex-1 min-h-12 inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 text-sm font-bold transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Add to Calendar</span>
                  </button>
                )}
                {isCancellable && (
                  <button
                    type="button"
                    onClick={(e) => handleCancelBooking(e, selectedBooking.id, selectedBooking.targetName)}
                    className="flex-1 min-h-12 inline-flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 text-sm font-bold transition-colors"
                  >
                    Cancel appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reschedule Modal */}
      {reschedulingBooking && (() => {
        // Standard pre-defined stylish time options
        const timeOptions = [
          "09:00 AM - 11:00 AM",
          "11:00 AM - 01:00 PM",
          "01:00 PM - 03:00 PM",
          "03:00 PM - 05:00 PM",
          "05:00 PM - 07:00 PM",
        ];

        const handleConfirmReschedule = async () => {
          if (!rescheduleDate) {
            alert("Please select a preferred date.");
            return;
          }
          if (!rescheduleTime) {
            alert("Please select a time slot.");
            return;
          }

          setRescheduleSubmitting(true);
          try {
            // 2. Update database record via PATCH /api/bookings
            const res = await fetch("/api/bookings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: reschedulingBooking.id,
                bookingDate: rescheduleDate,
                bookingTime: rescheduleTime,
              }),
            });

            const result = await res.json();
            if (!res.ok || !result.ok) throw new Error(result.error || "Reschedule failed.");
            rescheduleBooking(reschedulingBooking.id, rescheduleDate, rescheduleTime);
            addToast(`Rescheduled booking with ${reschedulingBooking.targetName} to ${rescheduleDate} at ${rescheduleTime}!`, "pending");

            // Reset states & close modal
            setReschedulingBooking(null);
            setRescheduleDate("");
            setRescheduleTime("");
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Reschedule failed. Please try again.", "error");
          } finally {
            setRescheduleSubmitting(false);
          }
        };

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-\[var\(--color-border\)]0 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setReschedulingBooking(null)}
          >
            <div 
              className="w-full max-w-md rounded-[32px] bg-white p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setReschedulingBooking(null)}
                className="absolute right-6 top-6 p-2 rounded-full hover:bg-\[var\(--color-border\)] text-\[var\(--color-secondary\)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-5 pr-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent)] mb-1">
                  Reschedule Appointment
                </p>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {reschedulingBooking.targetName}
                </h3>
                <p className="text-xs text-\[var\(--color-secondary\)] mt-1">
                  Select a new date and time for your pending booking.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-2">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)] mb-2">
                    Select New Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-subtle)] outline-none focus:border-\[var\(--color-warning\)] transition text-sm font-medium text-[var(--text-primary)]"
                  />
                </div>

                {/* Time Slot Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-\[var\(--color-secondary\)] mb-2">
                    Select Time Slot
                  </label>
                  <div className="grid gap-2">
                    {timeOptions.map((time) => {
                      const isSelected = rescheduleTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setRescheduleTime(time)}
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl text-xs font-bold border transition text-left",
                            isSelected
                              ? "bg-[var(--color-accent)] border-\[var\(--color-warning\)] text-white shadow-md shadow-[var(--color-warning)]/12"
                              : "bg-[var(--surface-card)] border-[var(--border-subtle)] text-\[var\(--color-secondary\)] hover:text-[var(--text-primary)] hover:bg-\[var\(--color-border\)]"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="mt-6 flex flex-col sm:flex-row gap-2 border-t border-[var(--border-subtle)] pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setReschedulingBooking(null)}
                  className="flex-1 min-h-12 inline-flex items-center justify-center rounded-full border border-[var(--border-subtle)] text-sm font-semibold text-\[var\(--color-secondary\)] hover:bg-[var(--surface-card)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rescheduleSubmitting}
                  onClick={handleConfirmReschedule}
                  className={cn(
                    "flex-1 min-h-12 inline-flex items-center justify-center rounded-full text-sm font-bold transition-colors",
                    rescheduleSubmitting
                      ? "bg-[var(--surface-card)] text-\[var\(--color-secondary\)] cursor-not-allowed"
                      : "bg-[var(--color-accent)] text-white hover:brightness-110 shadow-lg shadow-[var(--color-warning)]/15"
                  )}
                >
                  {rescheduleSubmitting ? "Updating..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notification Floating Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 border transition-all duration-300 pointer-events-auto animate-slide-up",
              toast.type === "success" && "bg-emerald-50 border-emerald-100 text-emerald-800",
              toast.type === "error" && "bg-rose-50 border-rose-100 text-rose-800",
              toast.type === "warning" && "bg-amber-50 border-amber-100 text-amber-800",
              toast.type === "info" && "bg-blue-50 border-blue-100 text-blue-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className={cn(
                "h-2 w-2 rounded-full shrink-0",
                toast.type === "success" && "bg-emerald-500",
                toast.type === "error" && "bg-rose-500",
                toast.type === "warning" && "bg-amber-500",
                toast.type === "info" && "bg-blue-500"
              )} />
              <p className="text-xs font-semibold">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 rounded-full hover:bg-\[var\(--color-border\)] text-\[var\(--color-secondary\)] transition-colors shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
