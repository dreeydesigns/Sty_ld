"use client";
/**
 * service-session.tsx
 *
 * Shared real-time session layer between professional/salon and client.
 * Uses localStorage as the demo transport (same browser = shared state).
 *
 * Exports
 *  - ServiceTimerCard   → professional / salon dashboard
 *  - ClientRatingFlow   → client home / activity page
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  ImagePlus,
  Shield,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ServiceStatus =
  | "idle"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "rated";

export type BookingService = { id: string; name: string; price: number };

export type ActiveSession = {
  bookingId: string;
  proName: string;
  clientName: string;
  services: BookingService[];
  status: ServiceStatus;
  arrivedAt?: number;
  startedAt?: number;
  completedAt?: number;
  totalDuration?: number; // seconds
};

export type ServiceRating = {
  serviceId: string;
  serviceName: string;
  stars: number;
  comment?: string;
};

export type SessionRating = {
  bookingId: string;
  serviceRatings: ServiceRating[];
  generalStars: number;
  agreedToPhotos: boolean;
  submitted: boolean;
  timestamp: number;
};

// ─── localStorage helpers ───────────────────────────────────────────────────

const SESSION_KEY = "ms_active_session";
const RATING_KEY  = "ms_session_rating";

function readSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); }
  catch { return null; }
}

function writeSession(s: ActiveSession | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else   localStorage.removeItem(SESSION_KEY);
  // notify other components in the same tab
  window.dispatchEvent(new Event("ms-session-change"));
}

function readRating(): SessionRating | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(RATING_KEY) ?? "null"); }
  catch { return null; }
}

function writeRating(r: SessionRating | null) {
  if (typeof window === "undefined") return;
  if (r) localStorage.setItem(RATING_KEY, JSON.stringify(r));
  else   localStorage.removeItem(RATING_KEY);
  window.dispatchEvent(new Event("ms-session-change"));
}

// ─── Sync hook ──────────────────────────────────────────────────────────────

function useSessionSync() {
  const [session, setSession] = useState<ActiveSession | null>(readSession);
  const [rating,  setRating]  = useState<SessionRating  | null>(readRating);

  useEffect(() => {
    function sync() {
      setSession(readSession());
      setRating(readRating());
    }
    window.addEventListener("ms-session-change", sync);
    window.addEventListener("storage", sync); // cross-tab
    const id = setInterval(sync, 1500);       // fallback poll
    return () => {
      window.removeEventListener("ms-session-change", sync);
      window.removeEventListener("storage", sync);
      clearInterval(id);
    };
  }, []);

  return { session, rating };
}

// ─── Elapsed-time timer ──────────────────────────────────────────────────────

function useTimer(startedAt: number | undefined, active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!active || !startedAt) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const display = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return { elapsed, display };
}

// ─── StarPicker ──────────────────────────────────────────────────────────────

function StarPicker({
  value, onChange, size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const dim = size === "lg" ? "h-10 w-10" : size === "md" ? "h-8 w-8" : "h-6 w-6";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform active:scale-110"
        >
          <Star
            className={cn(
              dim,
              (hovered ? n <= hovered : n <= value)
                ? "fill-[var(--ms-gold)] text-[var(--ms-gold)]"
                : "fill-transparent text-[var(--ms-border)]",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── AvatarRing ──────────────────────────────────────────────────────────────

function AvatarRing({ initials, gradient }: { initials: string; gradient?: string }) {
  return (
    <span
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
      style={{ background: gradient ?? "linear-gradient(135deg,#C8284A,#3A183A)" }}
    >
      {initials}
    </span>
  );
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function avgStars(ratings: ServiceRating[]) {
  if (!ratings.length) return 0;
  return ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── ServiceTimerCard  (professional / salon side) ────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export function ServiceTimerCard() {
  const { session: stored, rating } = useSessionSync();

  // Local copy so mutations are instant before localStorage propagates
  const [session, setSessionLocal] = useState<ActiveSession | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [photos, setPhotos]         = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existing = readSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionLocal(existing);
  }, []);

  // Stay in sync with external changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setSessionLocal(stored);
  }, [stored]);

  const { display: timerDisplay } = useTimer(
    session?.startedAt,
    session?.status === "in_progress",
  );

  function update(patch: Partial<ActiveSession>) {
    if (!session) return;
    const next = { ...session, ...patch };
    writeSession(next);
    setSessionLocal(next);
  }

  function handleArrive()   { update({ status: "arrived",     arrivedAt: Date.now() }); }
  function handleStart()    { update({ status: "in_progress", startedAt: Date.now() }); }
  function handleComplete() {
    const dur = session?.startedAt
      ? Math.floor((Date.now() - session.startedAt) / 1000)
      : undefined;
    update({ status: "completed", completedAt: Date.now(), totalDuration: dur });
  }
  function handleDismiss() {
    writeSession(null);
    writeRating(null);
    setSessionLocal(null);
    setPhotos([]);
  }
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const urls = Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f));
    setPhotos((p) => [...p, ...urls]);
  }
  function handlePhotoDone() {
    update({ status: "rated" });
    writeRating(null);
    setShowUpload(false);
  }
  function handleDeclinePhotos() {
    update({ status: "rated" });
    writeRating(null);
  }

  if (!session) return null;

  const { status, clientName, services } = session;
  const photoRequested  = rating?.submitted && rating.agreedToPhotos  && status !== "rated";
  const ratingReceived  = rating?.submitted && !rating.agreedToPhotos && status !== "rated";

  // ── 1. Photo upload panel ────────────────────────────────────────────────
  if (showUpload) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-[var(--ms-rose)]/20 bg-white shadow-[0_18px_48px_rgba(13,27,42,0.12)]">
        <div className="flex items-center justify-between bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Portfolio upload</p>
            <p className="mt-0.5 text-lg font-semibold">{clientName}&rsquo;s look</p>
          </div>
          <button onClick={() => setShowUpload(false)} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {rating && (
            <div className="flex flex-wrap gap-2">
              {rating.serviceRatings.map((r) => (
                <span key={r.serviceId} className="rounded-full bg-[var(--ms-soft-bg)] px-3 py-1 text-xs font-medium text-[var(--ms-navy)]">
                  {r.serviceName} {"★".repeat(r.stars)}
                </span>
              ))}
            </div>
          )}

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-[12px] bg-[var(--ms-soft-bg)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-5 py-6 transition hover:border-[var(--ms-rose)]/40"
          >
            <ImagePlus className="h-8 w-8 text-[var(--ms-mauve)]" />
            <p className="text-sm font-semibold text-[var(--ms-charcoal)]">Tap to add photos</p>
            <p className="text-xs text-[var(--ms-mauve)]">Saved with the client&rsquo;s rating to your portfolio</p>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handlePhotoChange} />

          <button
            onClick={handlePhotoDone}
            disabled={photos.length === 0}
            className="w-full rounded-[16px] bg-[var(--ms-rose)] py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {photos.length > 0
              ? `Save ${photos.length} photo${photos.length !== 1 ? "s" : ""} to portfolio`
              : "Add at least one photo"}
          </button>
          <button onClick={handlePhotoDone} className="w-full text-center text-xs text-[var(--ms-mauve)] hover:underline">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── 2. Photo request popup (client agreed) ───────────────────────────────
  if (photoRequested) {
    const avg = rating.serviceRatings.length
      ? avgStars(rating.serviceRatings).toFixed(1)
      : String(rating.generalStars);

    return (
      <div className="overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_18px_48px_rgba(13,27,42,0.12)]">
        <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#1A7A6B,#0d4a43)] px-5 py-4 text-white">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Portfolio opportunity</p>
            <p className="mt-0.5 text-lg font-semibold">{clientName} rated you ★{avg}</p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm leading-6 text-[var(--ms-charcoal)]">
            <strong>{clientName}</strong> agreed to let you use photos of her look. Take the photos now and upload them to your portfolio.
          </p>
          {rating.serviceRatings.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {rating.serviceRatings.map((r) => (
                <span key={r.serviceId} className="rounded-full bg-[var(--ms-soft-bg)] px-3 py-1 text-xs font-medium text-[var(--ms-navy)]">
                  {r.serviceName} {"★".repeat(r.stars)}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#1A7A6B] py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Camera className="h-4 w-4" />
              Take &amp; upload photos
            </button>
            <button
              onClick={handleDeclinePhotos}
              className="rounded-[14px] border border-[var(--ms-border)] px-4 py-3 text-sm font-medium text-[var(--ms-mauve)] transition hover:border-[var(--ms-rose)]"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. Rating received — no photos ───────────────────────────────────────
  if (ratingReceived) {
    const avg = rating.serviceRatings.length
      ? avgStars(rating.serviceRatings).toFixed(1)
      : String(rating.generalStars);
    return (
      <div className="flex items-center gap-3 overflow-hidden rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_4px_16px_rgba(13,27,42,0.06)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--ms-navy)]">{clientName} rated you ★{avg}</p>
          <p className="text-xs text-[var(--ms-mauve)]">No portfolio photos — rating saved</p>
        </div>
        <button onClick={handleDeclinePhotos} className="text-[var(--ms-mauve)] hover:text-[var(--ms-rose)]">
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  // ── 4. Completed — awaiting rating ───────────────────────────────────────
  if (status === "completed") {
    const dur = session.totalDuration;
    const h = dur ? Math.floor(dur / 3600) : 0;
    const m = dur ? Math.floor((dur % 3600) / 60) : 0;
    const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return (
      <div className="overflow-hidden rounded-[28px] border border-[var(--ms-border)] bg-white shadow-[0_8px_24px_rgba(13,27,42,0.08)]">
        <div className="bg-[var(--ms-soft-bg)] px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Session complete</p>
            {dur && <span className="text-xs text-[var(--ms-mauve)]">Duration: {durStr}</span>}
          </div>
          <p className="mt-1 text-base font-semibold text-[var(--ms-navy)]">{clientName}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span key={s.id} className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[var(--ms-mauve)]">
                {s.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Star className="h-5 w-5 animate-pulse text-[var(--ms-gold)]" />
          <p className="text-sm text-[var(--ms-charcoal)]">
            Waiting for {clientName} to rate the service…
          </p>
        </div>
      </div>
    );
  }

  // ── 5. Rated / done ──────────────────────────────────────────────────────
  if (status === "rated") {
    return (
      <div className="flex items-center gap-3 rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_4px_12px_rgba(13,27,42,0.05)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--ms-navy)]">Session closed · {clientName}</p>
          <p className="text-xs text-[var(--ms-mauve)]">Rating and portfolio saved</p>
        </div>
        <button onClick={handleDismiss} className="text-xs font-medium text-[var(--ms-mauve)] hover:text-[var(--ms-rose)]">
          Dismiss
        </button>
      </div>
    );
  }

  // ── 6. Main timer card (idle / en_route / arrived / in_progress) ─────────
  const meta: Record<ServiceStatus, { label: string; dotCls: string; textCls: string }> = {
    idle:        { label: "Upcoming",           dotCls: "bg-[var(--ms-mauve)]",  textCls: "text-[var(--ms-mauve)]" },
    en_route:    { label: "En route to client", dotCls: "bg-[#BF8C2E]",         textCls: "text-[#BF8C2E]" },
    arrived:     { label: "Arrived ✓",          dotCls: "bg-[#1A7A6B]",         textCls: "text-[#1A7A6B]" },
    in_progress: { label: "Service in progress",dotCls: "bg-[var(--ms-rose)]",  textCls: "text-[var(--ms-rose)]" },
    completed:   { label: "Complete",           dotCls: "bg-emerald-500",        textCls: "text-emerald-600" },
    rated:       { label: "Rated",              dotCls: "bg-emerald-500",        textCls: "text-emerald-600" },
  };
  const { label, dotCls, textCls } = meta[status];

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--ms-border)] bg-white shadow-[0_8px_32px_rgba(13,27,42,0.10)]">
      {/* Header row */}
      <div className="flex items-center gap-3 border-b border-[var(--ms-border)] px-5 py-4">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotCls, status === "in_progress" && "animate-pulse")} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", textCls)}>{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[var(--ms-navy)]">{clientName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-[var(--ms-mauve)]">Services</p>
          <p className="max-w-[140px] truncate text-xs font-medium text-[var(--ms-charcoal)]">
            {services.map((s) => s.name).join(", ")}
          </p>
        </div>
      </div>

      {/* Timer face — in_progress only */}
      {status === "in_progress" && (
        <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-[var(--ms-plum)]/5 to-[var(--ms-rose)]/5 px-5 py-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--ms-mauve)]">
            Time elapsed
          </p>
          <p className="font-mono text-5xl font-bold tracking-tight text-[var(--ms-navy)]">
            {timerDisplay}
          </p>
          <p className="text-xs text-[var(--ms-mauve)]">{services.map((s) => s.name).join(" · ")}</p>
        </div>
      )}

      {/* Arrived banner */}
      {status === "arrived" && (
        <div className="flex items-center gap-4 bg-[#1A7A6B]/8 px-5 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1A7A6B]">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A7A6B]">Arrival confirmed</p>
            <p className="text-xs text-[var(--ms-mauve)]">{clientName} has been notified you&rsquo;re here</p>
          </div>
        </div>
      )}

      {/* CTA buttons */}
      <div className="space-y-2 p-4">
        {status === "idle" && (
          <button
            onClick={() => update({ status: "en_route" })}
            className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--ms-navy)] py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            I&rsquo;m on my way
          </button>
        )}
        {status === "en_route" && (
          <button
            onClick={handleArrive}
            className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#1A7A6B] py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <CheckCircle2 className="h-4 w-4" />
            I&rsquo;ve arrived at the location
          </button>
        )}
        {status === "arrived" && (
          <button
            onClick={handleStart}
            className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Clock className="h-4 w-4" />
            Start service timer
          </button>
        )}
        {status === "in_progress" && (
          <button
            onClick={handleComplete}
            className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--ms-navy)] py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark service as complete
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── ClientRatingFlow  (client side) ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

type RatingStep = "services" | "safety" | "done";

const SAFETY_LABELS = ["", "I felt unsafe", "Uncomfortable", "Neutral", "Comfortable", "Completely safe"];
const SERVICE_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export function ClientRatingFlow() {
  const { session: stored } = useSessionSync();
  const [session, setSession] = useState<ActiveSession | null>(null);

  const [visible,        setVisible]        = useState(false);
  const [step,           setStep]           = useState<RatingStep>("services");
  const [serviceRatings, setServiceRatings] = useState<ServiceRating[]>([]);
  const [generalStars,   setGeneralStars]   = useState(0);
  const [comment,        setComment]        = useState("");
  const [agreedPhotos,   setAgreedPhotos]   = useState(false);
  const [submitted,      setSubmitted]      = useState(false);

  // Show rating flow when session moves to "completed"
  useEffect(() => {
    if (stored?.status === "completed" && !readRating()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(stored);
      setVisible(true);
      setStep("services");
      setServiceRatings(
        stored.services.map((sv) => ({ serviceId: sv.id, serviceName: sv.name, stars: 0 })),
      );
      setGeneralStars(0);
      setComment("");
      setAgreedPhotos(false);
      setSubmitted(false);
    }
  }, [stored]);

  // Listen for manual rating triggers from components (e.g. Activity page)
  useEffect(() => {
    function handleManualRating(e: Event) {
      const customEvent = e as CustomEvent<any>;
      const booking = customEvent?.detail;
      if (!booking) return;

      const servicesMapped: BookingService[] = (booking.services || []).map((name: string, i: number) => ({
        id: `srv-${i}`,
        name,
        price: 0,
      }));

      const manualSession: ActiveSession = {
        bookingId: booking.id,
        proName: booking.targetName,
        clientName: booking.clientName || "User",
        services: servicesMapped,
        status: "completed",
      };

      setSession(manualSession);
      setVisible(true);
      setStep("services");
      setServiceRatings(
        servicesMapped.map((sv) => ({ serviceId: sv.id, serviceName: sv.name, stars: 0 })),
      );
      setGeneralStars(0);
      setComment("");
      setAgreedPhotos(false);
      setSubmitted(false);
    }

    window.addEventListener("ms-rate-booking", handleManualRating);
    return () => {
      window.removeEventListener("ms-rate-booking", handleManualRating);
    };
  }, []);

  const handleClose = useCallback(() => {
    // Closed without rating → no photo request on pro side
    if (session) {
      writeRating({
        bookingId: session.bookingId,
        serviceRatings: [],
        generalStars: 0,
        agreedToPhotos: false,
        submitted: false,
        timestamp: Date.now(),
      });
    }
    setVisible(false);
  }, [session]);

  function setServiceStar(idx: number, stars: number) {
    setServiceRatings((prev) => prev.map((r, i) => (i === idx ? { ...r, stars } : r)));
  }
  function setServiceComment(idx: number, comment: string) {
    setServiceRatings((prev) => prev.map((r, i) => (i === idx ? { ...r, comment } : r)));
  }

  const allServicesRated = serviceRatings.every((r) => r.stars > 0);

  function handleSubmit() {
    if (!session || generalStars === 0) return;
    writeRating({
      bookingId: session.bookingId,
      serviceRatings,
      generalStars,
      agreedToPhotos: agreedPhotos,
      submitted: true,
      timestamp: Date.now(),
    });
    setSubmitted(true);
    setTimeout(() => setVisible(false), 2800);
  }

  if (!visible || !session) return null;

  // ── Submitted confirmation ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-md rounded-t-[32px] bg-white p-8 text-center sm:rounded-[32px]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <p className="mt-4 text-xl font-semibold text-[var(--ms-navy)]">
            Thank you, {session.clientName.split(" ")[0]}!
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">
            Your rating has been submitted.
            {agreedPhotos && " The professional will be in touch about portfolio photos."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[36px] bg-white sm:rounded-[36px]">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[var(--ms-border)]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pb-3 pt-4">
          <div className="flex items-center gap-4">
            <AvatarRing initials={getInitials(session.proName)} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">
                {step === "services" ? "Rate your services" : "Final question"}
              </p>
              <h2 className="mt-0.5 text-xl font-semibold text-[var(--ms-navy)]">
                {step === "services"
                  ? `Session with ${session.proName.split(" ")[0]}`
                  : "How was the experience?"}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)] transition hover:bg-[var(--ms-border)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-3">

          {/* ── Step 1: Rate each service ── */}
          {step === "services" && (
            <>
              <p className="text-xs text-[var(--ms-mauve)]">
                Rate every service before continuing — all ratings are required.
              </p>

              {serviceRatings.map((r, idx) => (
                <div
                  key={r.serviceId}
                  className="rounded-[22px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">
                        {r.serviceName}
                      </p>
                      <p className="text-xs text-[var(--ms-mauve)]">
                        {r.stars === 0 ? "Tap a star to rate" : SERVICE_LABELS[r.stars]}
                      </p>
                    </div>
                    <StarPicker value={r.stars} onChange={(n) => setServiceStar(idx, n)} />
                  </div>
                  {r.stars > 0 && (
                    <textarea
                      value={r.comment ?? ""}
                      onChange={(e) => setServiceComment(idx, e.target.value)}
                      placeholder="What stood out? (optional)"
                      rows={2}
                      className="mt-3 w-full resize-none rounded-[12px] border border-[var(--ms-border)] bg-white px-3 py-2 text-xs text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-border)] focus:border-[var(--ms-rose)]/50"
                    />
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── Step 2: Safety + photos ── */}
          {step === "safety" && (
            <>
              {/* Safety star rating */}
              <div className="rounded-[22px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ms-rose)]/10">
                    <Shield className="h-5 w-5 text-[var(--ms-rose)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ms-navy)]">How safe did you feel?</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">
                      This rating is private. It helps us protect every woman on this platform — you can answer honestly.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col items-center gap-2">
                  <StarPicker value={generalStars} onChange={setGeneralStars} size="lg" />
                  {generalStars > 0 && (
                    <p className="text-xs font-medium text-[var(--ms-mauve)]">{SAFETY_LABELS[generalStars]}</p>
                  )}
                </div>
              </div>

              {/* Overall comment */}
              <div className="rounded-[22px] border border-[var(--ms-border)] bg-white p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                  Anything else? (optional)
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about the full experience…"
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-border)]"
                />
              </div>

              {/* Photo consent */}
              <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-[var(--ms-border)] bg-white p-4 transition hover:border-[var(--ms-rose)]/30">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
                    agreedPhotos
                      ? "border-[var(--ms-rose)] bg-[var(--ms-rose)] text-white"
                      : "border-[var(--ms-border)] bg-white",
                  )}
                >
                  {agreedPhotos && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={agreedPhotos}
                  onChange={(e) => setAgreedPhotos(e.target.checked)}
                  className="sr-only"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--ms-navy)]">
                    <span className="mr-1.5">📸</span>
                    Let {session.proName.split(" ")[0]} use photos of my look
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">
                    They can add your finished look to their portfolio. You can withdraw consent at any time.
                  </p>
                </div>
              </label>
            </>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="space-y-2 border-t border-[var(--ms-border)] px-6 py-4">
          {step === "services" && (
            <button
              onClick={() => setStep("safety")}
              disabled={!allServicesRated}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === "safety" && (
            <>
              <button
                onClick={handleSubmit}
                disabled={generalStars === 0}
                className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit rating
              </button>
              <button
                onClick={() => setStep("services")}
                className="w-full text-center text-xs text-[var(--ms-mauve)] hover:underline"
              >
                ← Back to service ratings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
