"use client";

/**
 * wow-ux.tsx — Delight, trust, and reward components for Mobile Salon.
 *
 * Exports:
 *  · ProfileCompletionMeter — circular SVG progress with encouraging copy
 *  · ConfettiBurst          — CSS confetti explosion (e.g. on booking done)
 *  · GreetingBanner         — time-aware "Good morning, Amina ✨" card
 *  · TrustShield            — "Secure booking · Pay after service" strip
 *  · BookingTimeline        — animated status dots (requested → confirmed → done)
 *  · StreakBadge            — loyalty / streak indicator
 *  · PrivacyLabel           — "🔒 Only you can see this" inline label
 *  · RewardBadge            — "Top Reviewer" / "Loyal Client" badges
 *  · DailyCheckIn           — "Welcome back — here's what's new" prompt
 *  · AnimatedCounter        — counts up to a number on mount
 *  · HeartLikeButton        — heart that pops on tap (replaces inline hearts)
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Lock, Star, Flame, Trophy, Zap, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { readAppSession } from "@/lib/client-session";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function localStorageGet<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}

// ─── ProfileCompletionMeter ───────────────────────────────────────────────────

interface CompletionField { label: string; done: boolean }

function getCompletionFields(): CompletionField[] {
  const session = readAppSession?.();
  if (!session || session.role === "guest") return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = session as any;
  const fields: CompletionField[] = [
    { label: "Name",          done: Boolean(s.firstName ?? s.displayName ?? s.salonName) },
    { label: "Phone",         done: Boolean(s.phone) },
    { label: "Profile photo", done: Boolean(s.profileImageUrl) },
    { label: "Location",      done: Boolean(s.location) },
    { label: "Bio",           done: Boolean(s.bio) },
  ];

  return fields;
}

const METER_MESSAGES = [
  { min: 0,  max: 20,  msg: "Let's get started! Add your name first." },
  { min: 20, max: 40,  msg: "Great start! A photo helps clients trust you." },
  { min: 40, max: 60,  msg: "You're halfway there — add your location next." },
  { min: 60, max: 80,  msg: "Looking good! Just a couple more steps." },
  { min: 80, max: 99,  msg: "Almost perfect — add a bio to stand out! ✨" },
  { min: 99, max: 101, msg: "Profile complete! You're ready to shine. 🌟" },
];

export function ProfileCompletionMeter({ className }: { className?: string }) {
  const [fields, setFields] = useState<CompletionField[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFields(getCompletionFields());
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || fields.length === 0) return null;

  const done    = fields.filter((f) => f.done).length;
  const total   = fields.length;
  const pct     = Math.round((done / total) * 100);
  const msg     = METER_MESSAGES.find((m) => pct >= m.min && pct < m.max)?.msg ?? "";

  // SVG ring params
  const r     = 54;
  const circ  = 2 * Math.PI * r;  // ≈ 339.3
  const dash  = (pct / 100) * circ;

  if (pct === 100) return null; // hide when complete

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-5 rounded-[24px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_8px_28px_rgba(13,27,42,0.07)]",
        className,
      )}
    >
      {/* SVG ring */}
      <div className="relative shrink-0">
        <svg width={72} height={72} viewBox="0 0 120 120">
          {/* Track */}
          <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(13,27,42,0.07)" strokeWidth={10} />
          {/* Progress */}
          <circle
            cx={60} cy={60} r={r}
            fill="none"
            stroke="url(#meter-grad)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ * 0.25}  /* start at top */
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
          <defs>
            <linearGradient id="meter-grad" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="var(--ms-rose)" />
              <stop offset="1" stopColor="var(--ms-gold)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-[var(--ms-navy)]">{pct}%</span>
        </div>
      </div>

      {/* Copy */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ms-rose)]">Profile</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-[var(--ms-navy)]">{msg}</p>
        {/* Incomplete fields */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fields.filter((f) => !f.done).map((f) => (
            <span key={f.label} className="rounded-full bg-[var(--ms-soft-bg)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--ms-mauve)]">
              + {f.label}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── ConfettiBurst ────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#C8284A", "#c9a84c", "#8b5cf6", "#10b981",
  "#f59e0b", "#ec4899", "#3a183a", "#a3b18a",
];

const CONFETTI_PIECES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 7 + (i % 5),
  round: i % 3 === 0,
  animIdx: (i % 8) + 1,
  delay: (i * 60) % 500,
  duration: 900 + (i * 80) % 600,
}));

export function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      {CONFETTI_PIECES.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            top: "45%",
            left: `${20 + (p.id * 3.1) % 60}%`,
            width:  p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? "50%" : 2,
            backgroundColor: p.color,
            animationName: `confetti-fall-${p.animIdx}`,
            animationDuration: `${p.duration}ms`,
            animationDelay: `${p.delay}ms`,
            animationTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
            animationFillMode: "both",
          }}
        />
      ))}
    </div>
  );
}

// ─── GreetingBanner ───────────────────────────────────────────────────────────

export function GreetingBanner({ className }: { className?: string }) {
  const [name, setName]       = useState("");
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak]   = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const session = readAppSession?.();
      let resolvedName = "";
      if (session && session.role !== "guest") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = session as any;
        const n: string = s.firstName ?? s.displayName ?? s.salonName ?? "";
        resolvedName = n.split(" ")[0] ?? "";
        setName(resolvedName);
      }

      // Streak calculation
      const key      = "ms-checkin-streak";
      const today    = new Date().toISOString().slice(0, 10);
      const stored   = localStorageGet<{ date: string; count: number }>(key, { date: "", count: 0 });
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      let count = 1;
      if (stored.date === today) {
        count = stored.count;
      } else if (stored.date === yesterday) {
        count = stored.count + 1;
        localStorage.setItem(key, JSON.stringify({ date: today, count }));
      } else {
        localStorage.setItem(key, JSON.stringify({ date: today, count: 1 }));
      }
      setStreak(count);
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || !name) return null;

  const greet  = timeGreeting();
  const isStreak = streak >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,var(--ms-plum),#6d2060_55%,var(--ms-rose))] p-5 text-white shadow-[0_16px_48px_rgba(58,24,58,0.28)]",
        className,
      )}
    >
      {/* Decorative blur orb */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            {greet}
          </p>
          <h2 className="mt-1 text-2xl font-semibold">
            {name} ✨
          </h2>
          <p className="mt-1.5 text-sm text-white/70">
            {isStreak
              ? `${streak}-day streak — you're on fire! 🔥`
              : "Welcome back. Ready to glow today?"}
          </p>
        </div>

        {/* Streak badge */}
        {isStreak && (
          <div className="flex shrink-0 flex-col items-center rounded-[16px] bg-white/14 px-3 py-2.5 backdrop-blur-sm">
            <Flame className="h-5 w-5 text-amber-300" />
            <span className="mt-1 text-lg font-bold leading-none">{streak}</span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">streak</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── TrustShield ──────────────────────────────────────────────────────────────

export function TrustShield({
  variant = "booking",
  className,
}: {
  variant?: "booking" | "payment" | "data";
  className?: string;
}) {
  const content = {
    booking: { icon: <ShieldCheck className="h-4 w-4" />, text: "Secure booking · Pay only after your service" },
    payment: { icon: <Lock className="h-4 w-4" />,         text: "Funds held securely · Released after completion" },
    data:    { icon: <Lock className="h-4 w-4" />,         text: "Your data is private and never shared without consent" },
  }[variant];

  return (
    <div className={cn("trust-pill", className)}>
      <span className="text-[#4a6741]">{content.icon}</span>
      {content.text}
    </div>
  );
}

// ─── BookingTimeline ──────────────────────────────────────────────────────────

type BookingStatus = "pending" | "accepted" | "completed" | "cancelled" | "declined" | "reschedule_requested" | "draft";

const TIMELINE_STEPS: Array<{ key: BookingStatus | "_"; label: string }> = [
  { key: "pending",   label: "Requested" },
  { key: "accepted",  label: "Confirmed" },
  { key: "completed", label: "Done" },
];

function statusToStep(status: BookingStatus): number {
  if (status === "completed")   return 2;
  if (status === "accepted")    return 1;
  if (status === "pending")     return 0;
  return -1; // cancelled / declined
}

export function BookingTimeline({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const cancelled = status === "cancelled" || status === "declined";
  const step      = statusToStep(status);

  if (cancelled) {
    return (
      <div className={cn("flex items-center gap-2 text-xs font-semibold text-red-500", className)}>
        <span className="h-2 w-2 rounded-full bg-red-400" />
        {status === "declined" ? "Booking declined" : "Booking cancelled"}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-0", className)}>
      {TIMELINE_STEPS.map((s, i) => {
        const done    = i <= step;
        const current = i === step;

        return (
          <div key={s.key} className="flex items-center">
            {/* Dot */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.12, type: "spring", stiffness: 400 }}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                  done && !current ? "border-[var(--ms-rose)] bg-[var(--ms-rose)]" : "",
                  current         ? "border-[var(--ms-rose)] bg-white shadow-[0_0_0_3px_rgba(200,40,74,0.18)]" : "",
                  !done           ? "border-[var(--ms-border)] bg-white" : "",
                )}
              >
                {done && !current && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                {current && (
                  <span className="h-2 w-2 rounded-full bg-[var(--ms-rose)]" />
                )}
              </motion.div>
              <span className={cn(
                "mt-1 whitespace-nowrap text-[9px] font-semibold",
                done ? "text-[var(--ms-rose)]" : "text-[var(--ms-mauve)]",
              )}>
                {s.label}
              </span>
            </div>
            {/* Connector */}
            {i < TIMELINE_STEPS.length - 1 && (
              <div className="mx-1 mb-4 h-px w-8 bg-[var(--ms-border)] sm:w-12">
                {i < step && (
                  <motion.div
                    className="h-px bg-[var(--ms-rose)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.12 + 0.1, duration: 0.35 }}
                    style={{ transformOrigin: "left" }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── StreakBadge ──────────────────────────────────────────────────────────────

type BadgeType = "loyal_client" | "top_reviewer" | "helped_friends" | "early_adopter" | "streak";

const BADGE_CONFIG: Record<BadgeType, { label: string; icon: typeof Star; color: string }> = {
  loyal_client:   { label: "Loyal Client",   icon: Star,    color: "#c9a84c" },
  top_reviewer:   { label: "Top Reviewer",   icon: Trophy,  color: "#8b5cf6" },
  helped_friends: { label: "Community Star", icon: Zap,     color: "#10b981" },
  early_adopter:  { label: "Early Adopter",  icon: Flame,   color: "#ef4444" },
  streak:         { label: "On Fire",        icon: Flame,   color: "#f59e0b" },
};

export function RewardBadge({
  type,
  size = "md",
  className,
}: {
  type: BadgeType;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const cfg  = BADGE_CONFIG[type];
  const Icon = cfg.icon;

  const sizeClasses = {
    sm: "gap-1 rounded-full px-2 py-0.5 text-[10px]",
    md: "gap-1.5 rounded-full px-3 py-1 text-xs",
    lg: "gap-2 rounded-[14px] px-4 py-2 text-sm",
  }[size];

  return (
    <motion.span
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className={cn(
        "inline-flex items-center font-semibold text-white",
        sizeClasses,
        className,
      )}
      style={{ backgroundColor: cfg.color }}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {cfg.label}
    </motion.span>
  );
}

export function StreakBadge({ count, className }: { count: number; className?: string }) {
  if (count < 3) return null;
  return (
    <RewardBadge type="streak" className={cn("badge-shine", className)} />
  );
}

// ─── PrivacyLabel ─────────────────────────────────────────────────────────────

export function PrivacyLabel({ text = "Only you can see this", className }: { text?: string; className?: string }) {
  return (
    <span className={cn("privacy-label", className)}>
      <Lock className="h-3 w-3 shrink-0" />
      {text}
    </span>
  );
}

// ─── DailyCheckIn ─────────────────────────────────────────────────────────────

export function DailyCheckIn({ className }: { className?: string }) {
  const [visible, setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const key   = "ms-checkin-shown";
      const today = new Date().toISOString().slice(0, 10);
      const last  = localStorage.getItem(key);
      if (last !== today) {
        setVisible(true);
        localStorage.setItem(key, today);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={cn(
          "overflow-hidden rounded-[20px] bg-[var(--ms-champagne)] px-4 py-3",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--ms-navy)]">
            ✨ Welcome back — here&apos;s what&apos;s new today
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-full p-1 text-[var(--ms-mauve)] hover:bg-white/60"
            aria-label="Dismiss"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────

export function AnimatedCounter({
  target,
  duration = 1200,
  prefix = "",
  suffix = "",
  className,
}: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) { frameRef.current = requestAnimationFrame(step); }
    }
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return (
    <span className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── HeartLikeButton ──────────────────────────────────────────────────────────

export function HeartLikeButton({
  liked,
  count,
  onToggle,
  className,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  className?: string;
}) {
  const [popping, setPopping] = useState(false);

  function handleClick() {
    if (!liked) {
      setPopping(true);
      setTimeout(() => setPopping(false), 500);
    }
    onToggle();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn("flex items-center gap-1.5 transition", className)}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <motion.div
        animate={liked ? { scale: [1, 1.4, 0.9, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, times: [0, 0.25, 0.5, 0.75, 1] }}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-colors duration-200",
            liked
              ? "fill-[var(--ms-rose)] text-[var(--ms-rose)]"
              : "text-[var(--ms-mauve)]",
            popping && "heart-pop",
          )}
        />
      </motion.div>
      <span className={cn(
        "text-xs font-semibold transition-colors",
        liked ? "text-[var(--ms-rose)]" : "text-[var(--ms-mauve)]",
      )}>
        {count > 0 ? count : ""}
      </span>

      {/* Heart burst particles */}
      <AnimatePresence>
        {popping && (
          <div className="pointer-events-none absolute" aria-hidden>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <motion.div
                key={deg}
                className="absolute h-2 w-2 rounded-full bg-[var(--ms-rose)]"
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale:   [0, 1, 0],
                  x:       Math.cos((deg * Math.PI) / 180) * 18,
                  y:       Math.sin((deg * Math.PI) / 180) * 18,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ left: "50%", top: "50%", translateX: "-50%", translateY: "-50%" }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </button>
  );
}

// ─── ComputedBadges ───────────────────────────────────────────────────────────

/** Compute which reward badges a user has earned from local data */
export function useRewardBadges(): BadgeType[] {
  const [badges, setBadges] = useState<BadgeType[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const earned: BadgeType[] = [];

      try {
        // Check booking count → Loyal Client (3+)
        const session = readAppSession?.();
        if (session && session.role !== "guest") {
          const bookings: unknown[] = JSON.parse(localStorage.getItem(`ms_bookings_${session.id}`) ?? "[]");
          if (bookings.length >= 3) earned.push("loyal_client");

          // Check post count → Top Reviewer (5+ posts)
          const posts: unknown[] = JSON.parse(localStorage.getItem("ms_posts") ?? "[]");
          const myPosts = (posts as Array<{ authorId: string }>).filter((p) => p.authorId === session.id);
          if (myPosts.length >= 5) earned.push("top_reviewer");

          // Streak → On Fire (3+)
          const streakData = localStorageGet<{ count: number }>("ms-checkin-streak", { count: 0 });
          if (streakData.count >= 3) earned.push("streak");
        }
      } catch { /* localStorage not available */ }

      setBadges(earned);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return badges;
}
