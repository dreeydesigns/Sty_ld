"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  LockKeyhole,
  Filter,
  Grid3X3,
  Home,
  Inbox,
  LayoutGrid,
  MapPin,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
  MessageCircleMore,
  PhoneCall,
  EyeOff,
  Scissors,
  Paintbrush,
  Crown,
  Heart,
  Waves,
  Hand,
  Eye,
} from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { openGuestGate } from "@/lib/guest-session";
import { APP_SESSION_EVENT, clearAppSession, readAppSession, type AppUserSession } from "@/lib/client-session";
import { getRoleHomeHref, getRolePrimaryAction } from "@/lib/role-permissions";
import { FEATURES } from "@/lib/feature-flags";
import { StyldLockup } from "@/components/styld-logo";

import type {
  NavKey,
  PackageOffer,
  PortfolioItem,
  Professional,
  ReviewSnapshot,
  RoleMode,
  Salon,
  Service,
  VisualAsset,
} from "@/lib/site-data";
import { getServicesByIds, imageAssets } from "@/lib/site-data";
import type { BeautyLook } from "@/lib/looks-data";
import {
  buildBookingHref,
  buildWhatsAppLink,
  cn,
  formatDurationRange,
  formatKES,
  formatPriceRange,
} from "@/lib/utils";

export interface FilterSection {
  label: string;
  options: string[];
}

// â”€â”€â”€ Guest booking gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Intercepts "Book Now" clicks when no session is present.
// Opens the GuestAuthGate with the booking return URL preserved.

function useGuestBookingGate(bookHref: string) {
  return useCallback(
    (e: React.MouseEvent) => {
      if (!readAppSession()) {
        e.preventDefault();
        openGuestGate("booking", bookHref);
      }
      // If session exists, the Link navigates normally â€” no action needed.
    },
    [bookHref],
  );
}

type NavItem = { key: NavKey; label: string; href: string; icon: typeof Home };

/** Client + guest navigation â€” default.
 *  Shop tab is only included when FEATURES.SHOP is enabled (growth phase). */
const clientNavItems: NavItem[] = [
  { key: "home",    label: "Home",    href: "/home",    icon: Home        },
  { key: "explore", label: "Discover",href: "/explore", icon: LayoutGrid  },
  // Shop hidden during MVP beta â€” re-enable by setting FEATURES.SHOP = true in lib/feature-flags.ts
  ...(FEATURES.SHOP ? [{ key: "counter" as NavKey, label: "Shop", href: "/counter", icon: ShoppingBag }] : []),
  { key: "book",    label: "Book",    href: "/book",    icon: CalendarDays },
  { key: "profile", label: "Me",      href: "/profile", icon: UserRound   },
];

/** Professional + Salon navigation â€” no shop, no discover */
const providerNavItems: NavItem[] = [
  { key: "home",     label: "Home",     href: "/home",                 icon: Home             },
  { key: "requests", label: "Requests", href: "/profile?tab=requests", icon: Inbox            },
  { key: "guide",    label: "Guide",    href: "/guide",                icon: BookOpen         },
  { key: "messages", label: "Messages", href: "/profile?tab=messages", icon: MessageCircleMore},
  { key: "profile",  label: "Me",       href: "/profile",              icon: UserRound        },
];

export function SectionReveal({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0.98, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function ScrollSection({
  eyebrow,
  title,
  href,
  hrefLabel = "See all",
  children,
  className,
  id,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      className={cn(
        "section-grid min-w-0 max-w-full overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.06)] sm:rounded-[36px] sm:p-6 lg:p-8",
        className,
      )}
      id={id}
    >
      <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">{eyebrow}</p>
          <h2 className="mt-3 max-w-full text-2xl font-semibold leading-tight text-[var(--color-primary)] sm:text-3xl">
            {title}
          </h2>
          <span className="scroll-affordance mt-3">
            Scroll sideways
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
        {href ? (
          <CTAButton className="hidden sm:inline-flex" href={href} variant="outline">
            {hrefLabel}
          </CTAButton>
        ) : null}
      </div>
      <div className="scroll-row">{children}</div>
      {href ? (
        <CTAButton className="sm:hidden" href={href} variant="outline">
          {hrefLabel}
        </CTAButton>
      ) : null}
    </section>
  );
}

export function DecorativeStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="beauty-card rounded-[28px] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--color-accent)]">
        {icon}
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--color-secondary)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--color-primary)]">{value}</p>
    </div>
  );
}

export function TrustFlowCard() {
  const steps = [
    { icon: <UserRound className="h-5 w-5" />, title: "Sign in", copy: "Use a real account." },
    { icon: <CreditCard className="h-5 w-5" />, title: "Pay", copy: "Secure the slot first." },
    { icon: <LockKeyhole className="h-5 w-5" />, title: "Hold", copy: "Funds stay protected." },
    { icon: <CheckCircle2 className="h-5 w-5" />, title: "Release", copy: "Payout follows confirmation." },
  ];

  return (
    <div className="decorative-orbit min-w-0 max-w-full overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,var(--color-ink),#2A2A28_55%,var(--color-secondary))] p-5 text-white shadow-[0_28px_80px_rgba(0,0,0,0.24)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/62">Protected marketplace</p>
      <h2 className="mt-3 max-w-full text-2xl font-semibold leading-tight sm:text-3xl">
        Pay first. Release after beauty is delivered.
      </h2>
      <p className="mt-3 max-w-full break-words text-sm leading-7 text-white/72">
        Styld holds the money first, then releases payout after service completion is confirmed.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <div className="min-w-0 rounded-[24px] bg-white/10 p-4 backdrop-blur" key={step.title}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/14 text-[var(--surface-elevated)]">
                {step.icon}
              </span>
              <p className="min-w-0 font-semibold">{step.title}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/72">{step.copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CTAButton({
  children,
  href,
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "dark";
  className?: string;
}) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition duration-300",
    "disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:border-transparent disabled:shadow-none disabled:cursor-not-allowed active:scale-[0.98]",
    variant === "primary" &&
      "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] shadow-sm hover:bg-[var(--action-primary-hover)] active:scale-[0.98]",
    variant === "secondary" &&
      "bg-[var(--action-secondary-bg)] text-[var(--action-secondary-text)] border border-[var(--border-default)] hover:border-[var(--color-clay)] hover:bg-[var(--bg-surface-raised)]",
    variant === "outline" &&
      "border-2 border-[var(--action-primary-bg)] bg-transparent text-[var(--action-primary-bg)] hover:bg-[var(--action-primary-bg)] hover:text-[var(--action-primary-text)]",
    variant === "ghost" &&
      "text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] border border-transparent hover:border-[var(--border-subtle)]",
    variant === "dark" &&
      "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] hover:opacity-90",
    className,
  );

  if (href) {
    return (
      <Link className={classes} href={href} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}

export function BreadcrumbTrail({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[var(--color-secondary)]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span className="flex min-w-0 items-center gap-2" key={`${item.label}-${index}`}>
            {item.href && !isLast ? (
              <Link className="beauty-link font-semibold text-[var(--color-primary)]" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className={cn("truncate", isLast ? "font-semibold text-[var(--text-primary)]" : "")}>{item.label}</span>
            )}
            {!isLast ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : null}
          </span>
        );
      })}
    </nav>
  );
}

export function RoleSwitchTabs({
  roleMode,
}: {
  roleMode: RoleMode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 shadow-sm backdrop-blur">
      <Link
        className={cn(
          "min-w-0 whitespace-nowrap rounded-full px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] transition sm:px-3 sm:text-xs sm:tracking-[0.16em]",
          roleMode === "salons"
            ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-sm"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
        href="/salons"
      >
        Salons
      </Link>
      <Link
        className={cn(
          "min-w-0 whitespace-nowrap rounded-full px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] transition sm:px-3 sm:text-xs sm:tracking-[0.16em]",
          roleMode === "professionals"
            ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-sm"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
        href="/professionals"
      >
        Professional
      </Link>
    </div>
  );
}

export function SplitBrandHeader({
  currentNav,
}: {
  currentNav: NavKey;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<AppUserSession | null>(null);

  useEffect(() => {
    function sync() { setSession(readAppSession()); }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(APP_SESSION_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(APP_SESSION_EVENT, sync);
    };
  }, []);

  const roleHomeHref = getRoleHomeHref(session?.role);
  const primaryAction = getRolePrimaryAction(session?.role);

  const displayName = session
    ? session.role === "salon"
      ? (session as Extract<AppUserSession, { role: "salon" }>).salonName
      : session.role === "professional"
        ? (session as Extract<AppUserSession, { role: "professional" }>).displayName
        : session.role === "client"
          ? (session as Extract<AppUserSession, { role: "client" }>).firstName
          : session.role === "shop"
            ? (session as Extract<AppUserSession, { role: "shop" }>).shopName
            : session.role === "delivery" || session.role === "super_admin"
              ? (session as Extract<AppUserSession, { role: "delivery" | "super_admin" }>).displayName
              : "Guest"
    : null;

  function handleSignOut() {
    clearAppSession();
    setMenuOpen(false);
    // Also clear the server-side httpOnly session cookie
    fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
  }

  // Mobile menu links â€” role-aware
  const isProvider = session?.role === "professional" || session?.role === "salon";
  const mobileLinks: [string, string][] = isProvider
    ? [
        ["Home",        "/home"],
        ["Requests",    "/profile?tab=requests"],
        ["Guide",       "/guide"],
        ["Messages",    "/profile?tab=messages"],
        ["Profile",     "/profile"],
        ["Terms & Conditions", "/terms"],
        ["Help",        "/help"],
      ]
    : [
        ["Home",        roleHomeHref],
        ["Discover",    "/explore"],
        // Shop hidden during MVP beta â€” re-enable via FEATURES.SHOP in lib/feature-flags.ts
        ...(FEATURES.SHOP ? [["Shop", "/counter"] as [string, string]] : []),
        ["Guide",       "/guide"],
        ["Book now",    "/book?rush=true"],
        ["Profile",     "/profile"],
        ...(session ? [] : [["Sign in", "/auth/sign-in"] as [string, string]]),
        ...(session ? [] : [["Create account", "/auth/sign-up"] as [string, string]]),
        ["Terms & Conditions", "/terms"],
        ["Help",        "/help"],
      ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--header-border)] bg-[var(--header-bg)] backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--nav-pill-bg)] px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <Link className="flex shrink-0 items-center gap-3" href="/home">
              <StyldLockup size={34} variant="auto" subtitle="Trusted beauty access" />
            </Link>

            <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
              <DesktopNavLink href="/home" current={currentNav === "home"} className="tour-home" dataTour="home-nav">
                Home
              </DesktopNavLink>

              {/* ── Role-aware middle links ────────────────────────────────── */}
              {isProvider ? (
                <>
                  <DesktopNavLink href="/profile?tab=requests" current={currentNav === "requests"} dataTour="pro-requests-view">
                    Requests
                  </DesktopNavLink>
                  <DesktopNavLink href="/guide" current={currentNav === "guide"}>
                    Guide
                  </DesktopNavLink>
                  <DesktopNavLink href="/profile?tab=messages" current={currentNav === "messages"}>
                    Messages
                  </DesktopNavLink>
                </>
              ) : (
                <>
                  <DesktopNavLink href="/explore" current={currentNav === "discover" || currentNav === "explore"} className="tour-explore" dataTour="discover-nav">
                    Discover
                  </DesktopNavLink>
                  {/* Shop: hidden during MVP beta. Set FEATURES.SHOP=true to re-enable for growth phase. */}
                  {FEATURES.SHOP && (
                    <DesktopNavLink href="/counter" current={currentNav === "counter"}>
                      Shop
                    </DesktopNavLink>
                  )}
                  <DesktopNavLink href="/book" current={currentNav === "book"} className="tour-book" dataTour="book-nav">
                    Book
                  </DesktopNavLink>
                </>
              )}

              {/* ── Session-aware right section ────────────────────────────── */}
              {session ? (
                <>
                  <Link
                    href="/profile"
                    data-tour="profile-nav"
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition tour-profile",
                      currentNav === "profile"
                        ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-semibold shadow-sm"
                        : "text-[var(--nav-text-muted)] hover:bg-[var(--bg-surface-raised)] hover:text-[var(--nav-text)]",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-secondary),var(--color-ink))] text-[10px] font-bold text-white">
                      {(displayName ?? "U").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="max-w-[100px] truncate">{displayName}</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--nav-text-muted)] transition hover:border-[var(--color-clay)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="ml-1 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--nav-text-muted)] transition hover:border-[var(--color-clay)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                  >
                    Sign out
                  </button>
                  <CTAButton className="ml-2 min-h-10 px-4 xl:px-6 xl:min-h-12" href={primaryAction.href}>
                    <span className="hidden xl:inline">{primaryAction.label === "Book" ? "Start Booking" : primaryAction.label}</span>
                    <span className="xl:hidden">{primaryAction.label}</span>
                    <ArrowRight className="h-4 w-4" />
                  </CTAButton>
                </>
              ) : (
                <>
                  <DesktopNavLink href="/profile" current={currentNav === "profile"} className="tour-profile" dataTour="profile-nav">
                    Profile
                  </DesktopNavLink>
                  <Link
                    href="/auth/sign-in?returnTo=/home"
                    className="rounded-full px-4 py-2 text-sm font-medium text-[var(--nav-text-muted)] transition hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)]"
                  >
                    Sign in
                  </Link>
                  <CTAButton className="ml-2 min-h-10 px-4 xl:px-6 xl:min-h-12" href={primaryAction.href}>
                    <span className="hidden xl:inline">{primaryAction.label === "Book" ? "Start Booking" : primaryAction.label}</span>
                    <span className="xl:hidden">{primaryAction.label}</span>
                    <ArrowRight className="h-4 w-4" />
                  </CTAButton>
                </>
              )}
            </nav>

            <div className="ml-auto flex items-center gap-2 lg:hidden">
              {/* Session avatar dot on mobile */}
              {session && (
                <Link
                  href="/profile"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-secondary),var(--color-ink))] text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                  title="My account"
                >
                  {(displayName ?? "U").slice(0, 1).toUpperCase()}
                </Link>
              )}
              <button
                aria-controls="mobile-menu"
                aria-expanded={menuOpen}
                aria-label="Open mobile menu"
                className="rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                onClick={() => setMenuOpen(true)}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </button>
              <CTAButton className="hidden px-4 sm:inline-flex" href="/book?rush=true">
                Book
              </CTAButton>
            </div>
          </div>
        </div>
      </header>
      <MobileSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <nav id="mobile-menu" className="grid gap-2">
          {/* Session banner in mobile menu */}
          {session && (
            <div className="mb-1 flex items-center gap-3 rounded-[20px] bg-[linear-gradient(135deg,var(--color-secondary),var(--color-ink))] px-4 py-3 text-white">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {(displayName ?? "U").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="text-[11px] font-medium capitalize text-white/75">{session.role} account</p>
              </div>
            </div>
          )}
          {(session?.role === "professional" || session?.role === "salon") && (
            <Link
              className="rounded-[20px] bg-[var(--action-primary-bg)] px-4 py-3 text-sm font-semibold text-[var(--action-primary-text)]"
              href="/profile?tab=requests"
              onClick={() => setMenuOpen(false)}
            >
              Requests
            </Link>
          )}
          {mobileLinks.map(([label, href]) => (
            <Link
              className="rounded-[20px] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
              href={href}
              key={href}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link
            className="rounded-[20px] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
            href="/settings"
            onClick={() => setMenuOpen(false)}
          >
            Settings
          </Link>
          {session && (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-[20px] bg-[var(--bg-surface)] px-4 py-3 text-left text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--bg-surface-raised)]"
            >
              Sign out
            </button>
          )}
        </nav>
      </MobileSheet>
    </>
  );
}

function DesktopNavLink({
  children,
  href,
  current,
  className,
  dataTour,
}: {
  children: ReactNode;
  href: string;
  current?: boolean;
  className?: string;
  dataTour?: string;
}) {
  return (
    <Link
      data-tour={dataTour}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition",
        current
          ? "bg-[var(--header-nav-active-bg)] text-[var(--header-nav-active-text)] font-semibold shadow-sm"
          : "text-[var(--header-text-muted)] hover:bg-[var(--bg-surface-raised)] hover:text-[var(--header-text)]",
        className
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

export function BottomMobileNav({ currentNav }: { currentNav: NavKey }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [role, setRole] = useState<string>("guest");

  useEffect(() => {
    function syncUnread() {
      try {
        const session = readAppSession();
        setRole(session?.role ?? "guest");
        if (!session) { setUnreadCount(0); return; }
        const threads: Array<{ participantIds: string[]; messages: Array<{ read: boolean; senderId: string }> }> =
          JSON.parse(localStorage.getItem("ms_messages") ?? "[]");
        const count = threads
          .filter((t) => t.participantIds.includes(session.id))
          .reduce((sum, t) => sum + t.messages.filter((m) => !m.read && m.senderId !== session.id).length, 0);
        setUnreadCount(count);
      } catch { setUnreadCount(0); }
    }
    syncUnread();
    window.addEventListener("ms-social-change", syncUnread);
    window.addEventListener(APP_SESSION_EVENT, syncUnread);
    window.addEventListener("storage", syncUnread);
    return () => {
      window.removeEventListener("ms-social-change", syncUnread);
      window.removeEventListener(APP_SESSION_EVENT, syncUnread);
      window.removeEventListener("storage", syncUnread);
    };
  }, []);

  const isProvider = role === "professional" || role === "salon";
  const navItems = isProvider ? providerNavItems : clientNavItems;

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-3 z-40 overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--color-nav-bg)] px-1.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl lg:hidden"
      style={{ left: "0.5rem", maxWidth: "calc(100vw - 1rem)", right: "0.5rem", width: "auto" }}
    >
      <ul
        className="mobile-bottom-nav-grid grid min-w-0 gap-0.5"
        style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.key === currentNav;
          const isCounter = item.key === "counter";
          const hasNotif = item.key === "profile" && unreadCount > 0;

          return (
            <li className="min-w-0" key={item.key}>
              <Link
                data-tour={item.key === "explore" ? "discover-nav" : `${item.key}-nav`}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium transition-all duration-200",
                  active && !isCounter && "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] font-semibold scale-[1.04] shadow-sm",
                  active && isCounter && "bg-[var(--color-accent)] text-[var(--color-ink)] font-semibold scale-[1.04] shadow-sm",
                  !active && "text-[var(--color-nav-text-muted)] hover:text-[var(--text-primary)] hover:scale-105",
                  `tour-${item.key}`
                )}
                href={item.href}
              >
                <motion.span
                  className="relative"
                  animate={active ? { scale: [1, 1.22, 0.92, 1.05, 1] } : { scale: 1 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                  key={active ? "active" : "inactive"}
                >
                  <Icon className={cn("h-4 w-4", active ? "stroke-[2.5px]" : "stroke-[1.75px]")} />
                  {hasNotif && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-ink)]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </motion.span>
                <span className={cn(active ? "font-semibold" : "")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <Search className="h-4 w-4 text-[var(--text-secondary)]" />
      <input
        className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

export function MobileSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Close panel"
            className="fixed inset-0 z-40 bg-[rgba(13,27,42,0.48)] xl:hidden"
            initial={{ opacity: 0 }}
            onClick={onClose}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(88vh,720px)] flex-col overflow-hidden rounded-t-[32px] bg-[var(--surface-card)] p-5 shadow-[0_-24px_60px_rgba(0,0,0,0.24)] xl:hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--border-subtle)]" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
              <button
                className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto pr-1">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function FilterDrawer({
  open,
  onClose,
  sections,
  selected,
  toggleValue,
}: {
  open: boolean;
  onClose: () => void;
  sections: FilterSection[];
  selected: string[];
  toggleValue: (value: string) => void;
}) {
  return (
    <MobileSheet open={open} onClose={onClose} title="Filters">
      <FilterControls sections={sections} selected={selected} toggleValue={toggleValue} />
    </MobileSheet>
  );
}

export function DesktopSidebar({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] lg:block">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">
        {title}
      </p>
      {children}
    </aside>
  );
}

function FilterControls({
  sections,
  selected,
  toggleValue,
}: {
  sections: FilterSection[];
  selected: string[];
  toggleValue: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{section.label}</p>
          <div className="flex flex-wrap gap-2">
            {section.options.map((option) => {
              const active = selected.includes(option);

              return (
                <button
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm transition",
                    active
                      ? "border-[var(--color-ink)] bg-[var(--surface-elevated)] text-white"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--color-secondary)] hover:text-[var(--text-primary)]",
                  )}
                  key={option}
                  onClick={() => toggleValue(option)}
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CategoryCircle({
  name,
  detail,
  color,
  image,
}: {
  name: string;
  detail: string;
  color: string;
  image?: VisualAsset;
}) {
  return (
    <div className="group flex flex-col items-center gap-3 text-center">
      <div
        className={cn(
          "relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-gradient-to-br text-lg font-semibold text-[var(--text-primary)] shadow-[0_16px_34px_rgba(13,27,42,0.12)] transition duration-300 group-hover:-translate-y-1",
          color,
        )}
      >
        {image ? (
          <>
            <ImageLayer asset={image} />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,27,42,0.05),rgba(13,27,42,0.62))]" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/18 text-white backdrop-blur">
              {renderCategoryIcon(name, "h-6 w-6")}
            </span>
          </>
        ) : (
          renderCategoryIcon(name, "h-6 w-6")
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{name}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-secondary)]">{detail}</p>
      </div>
    </div>
  );
}

function renderCategoryIcon(name: string, className: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("braid") || normalized.includes("hair")) {
    return <Waves className={className} />;
  }

  if (normalized.includes("nail")) {
    return <Hand className={className} />;
  }

  if (normalized.includes("make")) {
    return <Paintbrush className={className} />;
  }

  if (normalized.includes("lash")) {
    return <Eye className={className} />;
  }

  if (normalized.includes("short") || normalized.includes("shave")) {
    return <Scissors className={className} />;
  }

  if (normalized.includes("bridal")) {
    return <Crown className={className} />;
  }

  if (normalized.includes("self")) {
    return <Heart className={className} />;
  }

  return <Sparkles className={className} />;
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-card)]/95 border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-sm backdrop-blur-sm">
      <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-sage)]" />
      Verified
    </span>
  );
}

function ImageLayer({
  asset,
  className,
  priority,
  sizes,
}: {
  asset?: VisualAsset;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (!asset) {
    return null;
  }

  return (
    <Image
      alt={asset.alt}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      fill
      priority={priority}
      sizes={sizes ?? "(min-width: 1280px) 42vw, (min-width: 768px) 50vw, 100vw"}
      src={asset.url}
      style={{ objectPosition: asset.position ?? "center" }}
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzQTE4M0EiLz48L3N2Zz4="
      referrerPolicy="no-referrer"
    />
  );
}

function serviceImage(service: Service) {
  if (service.image) {
    return service.image;
  }

  if (service.category === "Nails") {
    return imageAssets.nails;
  }

  if (service.category === "Make-Up" || service.category === "Bridal & Events") {
    return imageAssets.makeupArtist;
  }

  if (service.category === "Lashes / Brows") {
    return imageAssets.lashesTools;
  }

  if (service.category === "Short Hair & Shave") {
    return imageAssets.barber;
  }

  if (service.category === "Care / Skin") {
    return imageAssets.skincareHands;
  }

  if (service.category === "Self-Care / Beauty") {
    return imageAssets.spaCare;
  }

  return imageAssets.braidsPortrait;
}

function portfolioImage(title: string) {
  const lower = title.toLowerCase();

  if (lower.includes("nail") || lower.includes("chrome") || lower.includes("gel") || lower.includes("pedicure")) {
    return imageAssets.nails;
  }

  if (lower.includes("lash") || lower.includes("brow")) {
    return imageAssets.lashesTools;
  }

  if (lower.includes("fade") || lower.includes("beard") || lower.includes("groom") || lower.includes("low cut") || lower.includes("undercut")) {
    return imageAssets.beardCare;
  }

  if (lower.includes("spa") || lower.includes("massage") || lower.includes("polish") || lower.includes("facial")) {
    return imageAssets.spaCare;
  }

  if (lower.includes("bride") || lower.includes("glam") || lower.includes("makeup") || lower.includes("ceremony")) {
    return imageAssets.makeupArtist;
  }

  if (lower.includes("loc") || lower.includes("twist") || lower.includes("wash") || lower.includes("silk")) {
    return imageAssets.naturalHair;
  }

  return imageAssets.braidsPortrait;
}

export function WhatsAppButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const session = readAppSession();
  const [showDrawer, setShowDrawer] = useState(false);
  // router removed, using Link or window.location
  
  const handlePress = () => {
    if (session) {
      window.open(buildWhatsAppLink(label), '_blank');
    } else {
      setShowDrawer(true);
    }
  };

  return (
    <>
      <CTAButton className={className} onClick={handlePress} variant="outline" type="button">
        <MessageCircleMore className="h-4 w-4" />
        WhatsApp
      </CTAButton>
      <MobileSheet open={showDrawer} onClose={() => setShowDrawer(false)} title="Contact via WhatsApp">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            How would you like to continue?
          </p>
          <CTAButton onClick={() => window.open(buildWhatsAppLink(label), '_blank')} variant="outline">
            Message as guest
          </CTAButton>
          <CTAButton onClick={() => window.location.href = '/auth/signup'}>
            Sign up to keep track of conversations
          </CTAButton>
        </div>
      </MobileSheet>
    </>
  );
}

export function SecureContactCard({
  name,
  bookingHref,
  confirmed = false,
}: {
  name: string;
  bookingHref: string;
  confirmed?: boolean;
}) {
  return (
    <article className="beauty-card rounded-[32px] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--color-accent)]">
          <EyeOff className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-secondary)]">Private contact</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--color-primary)]">
            Contact unlocks after a confirmed paid booking.
          </h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-secondary)]">
            Before payment, Styld keeps phone details protected. You can request a call, send a secure message, or use support without exposing either side too early.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <CTAButton href={bookingHref}>
          <PhoneCall className="h-4 w-4" />
          Request call safely
        </CTAButton>
        <CTAButton href={bookingHref} variant="outline">
          <MessageCircleMore className="h-4 w-4" />
          Send secure request
        </CTAButton>
        {confirmed ? (
          <div className="rounded-[24px] bg-[var(--surface-card)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-secondary)]">Confirmed booking</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Direct communication with {name} is available for this appointment.
            </p>
          </div>
        ) : (
          <WhatsAppButton label={`${name} secure contact support`} />
        )}
      </div>
    </article>
  );
}

// â”€â”€â”€ SaveHeart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Floating bookmark heart for cards â€” top-right corner overlay.

function SaveHeart({ slug, type }: { slug: string; type: "salon" | "professional" | "look" }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const saves = JSON.parse(localStorage.getItem("ms_saves_v2") ?? "{}") as Record<string, boolean>;
      setTimeout(() => {
        setSaved(!!saves[`${type}:${slug}`]);
      }, 0);
    } catch { /* ignore */ }
  }, [slug, type]);

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const key = `${type}:${slug}`;
    try {
      const saves = JSON.parse(localStorage.getItem("ms_saves_v2") ?? "{}") as Record<string, boolean>;
      if (saves[key]) { delete saves[key]; setSaved(false); }
      else { saves[key] = true; setSaved(true); }
      localStorage.setItem("ms_saves_v2", JSON.stringify(saves));
    } catch { /* ignore */ }
  }

  return (
    <motion.button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save"}
      onClick={handleSave}
      whileTap={{ scale: 0.85 }}
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-card)]/90 border border-[var(--border-subtle)] shadow-sm backdrop-blur-sm"
    >
      <motion.div
        animate={saved ? { scale: [1, 1.35, 0.9, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-colors duration-200",
            saved ? "fill-[var(--color-clay)] text-[var(--color-clay)]" : "text-[var(--text-secondary)]",
          )}
        />
      </motion.div>
    </motion.button>
  );
}

export function SalonCard({ salon, listView }: { salon: Salon; listView?: boolean }) {
  const bookHref = buildBookingHref({ targetType: "salons", targetId: salon.slug });
  const salonHref = `/salons/${salon.slug}`;
  const interceptBook = useGuestBookingGate(bookHref);

  if (listView) {
    return (
      <article data-tour="provider-card" className="flex min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
        {/* Thumbnail — clicking goes to salon detail */}
        <Link href={salonHref} className="group/img relative min-h-[140px] w-36 shrink-0 self-stretch overflow-hidden sm:w-48">
          <ImageLayer asset={salon.image} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(0,0,0,0.4)_100%)]" />
          {/* "See their work" on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0)] transition-all duration-200 group-hover/img:bg-[rgba(0,0,0,0.38)]">
            <span className="scale-90 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] opacity-0 transition-all duration-200 group-hover/img:scale-100 group-hover/img:opacity-100 shadow-md">
              See their work
            </span>
          </div>
          {salon.verified && (
            <span className="absolute bottom-2 left-2">
              <VerifiedBadge />
            </span>
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                <MapPin className="h-3 w-3" />{salon.location}
              </span>
            </div>
            <p className="mt-1.5 truncate text-lg font-semibold text-[var(--text-primary)]">{salon.name}</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-secondary)] font-medium">
              <Star className="h-3.5 w-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
              {salon.rating} ({salon.reviewCount} reviews)
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">From</p>
              <p className="text-base font-bold text-[var(--text-primary)]">{formatKES(salon.startingPrice)}</p>
            </div>
            <CTAButton data-tour="book-service" className="shrink-0 px-5" href={bookHref} onClick={interceptBook}>Book Now</CTAButton>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Link href={salonHref} className="group block min-w-0">
      <article data-tour="provider-card" className="card-lift overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-[0_4px_14px_rgba(0,0,0,0.07)]">
        {/* Photo */}
        <div className={cn("relative h-[180px] w-full overflow-hidden bg-gradient-to-br", salon.heroMood)}>
          <ImageLayer asset={salon.image} priority sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 90vw" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.0)_40%,rgba(0,0,0,0.52)_100%)]" />
          {/* Overlaid pills */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {salon.verified && <span className="verified-glow inline-flex"><VerifiedBadge /></span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--card-bg)]/90 border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] backdrop-blur-sm shadow-sm">
              <MapPin className="h-3 w-3" />
              {salon.location.length > 14 ? salon.location.slice(0, 14) + "…" : salon.location}
            </span>
          </div>
          {/* "See their work" hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.0)] transition-all duration-200 group-hover:bg-[rgba(0,0,0,0.38)]">
            <span className="scale-90 rounded-full bg-[var(--card-bg)] border border-[var(--border-subtle)] px-5 py-2 text-sm font-semibold text-[var(--text-primary)] opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 shadow-md">
              See their work →
            </span>
          </div>
          {/* Bookmark heart — top right */}
          <SaveHeart slug={salon.slug} type="salon" />
        </div>
        {/* Info */}
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">From</p>
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <p className="truncate text-[18px] font-semibold text-[var(--text-primary)]">{salon.name}</p>
            <p className="shrink-0 text-[18px] font-bold text-[var(--text-primary)]">{formatKES(salon.startingPrice)}</p>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-[var(--text-secondary)] font-medium">
            <Star className="h-3.5 w-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            {salon.rating} ({salon.reviewCount} reviews)
          </div>
          {/* Book Now — intercepted for guests */}
          <CTAButton
            data-tour="book-service"
            className="btn-press mt-4 w-full"
            href={bookHref}
            onClick={(e: React.MouseEvent) => {
              interceptBook(e);
            }}
          >
            Book Now
          </CTAButton>
        </div>
      </article>
    </Link>
  );
}

export function ProfessionalCard({ professional, listView }: { professional: Professional; listView?: boolean }) {
  const bookHref = buildBookingHref({ targetType: "professionals", targetId: professional.slug });
  const isOnline = professional.nextAvailable?.toLowerCase().includes("today") ?? false;
  const desc = professional.description?.slice(0, 80) ?? professional.specialty;
  const interceptBook = useGuestBookingGate(bookHref);

  if (listView) {
    return (
      <article data-tour="provider-card" className="flex min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
        <div className="relative min-h-[140px] w-36 shrink-0 self-stretch overflow-hidden sm:w-48">
          <ImageLayer asset={professional.image} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(0,0,0,0.4)_100%)]" />
          {professional.verified && (
            <span className="absolute bottom-2 left-2"><VerifiedBadge /></span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-[var(--text-primary)]">{professional.name}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">{desc}</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-secondary)] font-medium">
              <Star className="h-3.5 w-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
              {professional.rating} ({professional.reviewCount} reviews)
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Starts at</p>
              <p className="text-base font-bold text-[var(--text-primary)]">{formatKES(professional.startingPrice)}</p>
            </div>
            <CTAButton data-tour="book-service" className="shrink-0 px-5" href={bookHref} onClick={interceptBook}>Book Now</CTAButton>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Link href={`/professionals/${professional.slug}`} className="group block min-w-0">
      <article className="card-lift overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-[0_4px_14px_rgba(0,0,0,0.07)]">
        {/* Photo — 180px desktop, 160px mobile */}
        <div className={cn("relative h-[160px] overflow-hidden bg-gradient-to-br sm:h-[180px]", professional.heroMood)}>
          <ImageLayer asset={professional.image} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.0)_40%,rgba(0,0,0,0.48)_100%)]" />
          {/* Overlaid pills */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {professional.verified && <span className="verified-glow inline-flex"><VerifiedBadge /></span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--card-bg)]/90 border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] backdrop-blur-sm shadow-sm">
              <MapPin className="h-3 w-3" />
              {professional.location.length > 12 ? professional.location.slice(0, 12) + "…" : professional.location}
            </span>
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.0)] transition-all duration-200 group-hover:bg-[rgba(0,0,0,0.38)]">
            <span className="scale-90 rounded-full bg-[var(--card-bg)] border border-[var(--border-subtle)] px-5 py-2 text-sm font-semibold text-[var(--text-primary)] opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 shadow-md">
              See their work →
            </span>
          </div>
          {/* Save heart */}
          <SaveHeart slug={professional.slug} type="professional" />
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Starts at</p>
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <p className="truncate text-[18px] font-semibold text-[var(--text-primary)]">{professional.name}</p>
            <p className="shrink-0 text-[17px] font-bold text-[var(--text-primary)]">{formatKES(professional.startingPrice)}</p>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[13px] text-[var(--text-secondary)] font-medium">
            <Star className="h-3.5 w-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            {professional.rating} ({professional.reviewCount} reviews)
          </div>
          <p className="mt-1.5 truncate text-[13px] text-[var(--text-secondary)]">{desc}</p>

          {/* Service tags — max 3 */}
          {professional.identityAttributes?.length > 0 && (
            <div className="mt-2 flex max-w-full gap-1.5 overflow-hidden">
              {professional.identityAttributes.slice(0, 3).map((tag) => (
                <span key={tag} className="shrink-0 rounded-full bg-[var(--bg-surface-raised)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Replies / completion */}
          <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              ~{professional.responseSpeedMinutes} min
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {professional.completionRate}% completed
            </span>
          </div>

          {/* Status pill */}
          <div
            className="mt-2 flex w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={
              isOnline
                ? { backgroundColor: "rgba(58,92,65,0.10)", color: "#1A7A6B" }
                : { backgroundColor: "rgba(140,114,128,0.10)", color: "#8c7280" }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: isOnline ? "#1A7A6B" : "#8c7280" }}
            />
            {isOnline ? `ONLINE \u00B7 ${professional.nextAvailable ?? "Today"}` : `Offline \u00B7 ${professional.nextAvailable ?? "Check availability"}`}
          </div>
        </div>
      </article>
    </Link>
  );
}

function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-full bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-secondary)]">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{label}</span>
    </div>
  );
}

export function ServiceCard({
  service,
  compact,
}: {
  service: Service;
  compact?: boolean;
}) {
  const visual = serviceImage(service);

  return (
    <article className="beauty-card min-w-0 max-w-full overflow-hidden rounded-[28px]">
      <div className="relative min-h-[150px] p-5 text-white">
        <ImageLayer asset={visual} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,27,42,0.12)_0%,rgba(13,27,42,0.72)_70%,rgba(13,27,42,0.92)_100%)]" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/72">{service.category}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{service.name}</h3>
          </div>
          {service.popular ? (
            <span className="rounded-full bg-[var(--color-highlight)] px-3 py-1 text-xs font-semibold text-white">
              Popular
            </span>
          ) : null}
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{service.description}</p>
        <p className="mt-3 text-sm text-[var(--color-secondary)]">{service.inclusions}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-[var(--surface-card)] px-3 py-2 text-[var(--text-primary)]">
            {formatPriceRange(service.minPrice, service.maxPrice)}
          </span>
          <span className="rounded-full bg-[var(--surface-card)] px-3 py-2 text-[var(--color-secondary)]">
            {formatDurationRange(service.durationMin, service.durationMax)}
          </span>
        </div>
        {!compact ? (
          <div className="mt-5">
            <CTAButton href={buildBookingHref({ targetType: "salons", serviceIds: [service.id] })}>
              Select Service
            </CTAButton>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function PackageCard({ offer }: { offer: PackageOffer }) {
  return (
    <article className="decorative-orbit min-h-[310px] min-w-0 max-w-full overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,var(--color-ink),#2C2825_54%,var(--color-ink))] p-5 text-white shadow-[0_22px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-white/65">{offer.badge}</p>
        {offer.trending ? (
          <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-[var(--surface-elevated)]">
            Trending
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 font-display text-3xl leading-tight">{offer.name}</h3>
      <p className="mt-3 text-sm leading-6 text-white/78">{offer.description}</p>
      {offer.bestFor ? (
        <p className="mt-3 rounded-[20px] bg-white/10 px-4 py-3 text-sm leading-6 text-white/76">
          Best for: {offer.bestFor}
        </p>
      ) : null}
      {offer.includedServices?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {offer.includedServices.slice(0, 4).map((service) => (
            <span className="rounded-full border border-white/18 px-3 py-1 text-xs text-white/78" key={service}>
              {service}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Starts from</p>
          <p className="mt-1 text-xl font-semibold text-[var(--color-warning)]">{formatKES(offer.price)}</p>
        </div>
        <CTAButton
          variant="primary"
          href={buildBookingHref({ targetType: "salons", serviceIds: offer.serviceIds })}
        >
          Add
        </CTAButton>
      </div>
    </article>
  );
}

export function ReviewCard({ review }: { review: ReviewSnapshot }) {
  return (
    <article className="beauty-card rounded-[28px] p-5">
      <div className="flex items-center gap-1 text-[var(--color-warning)]">
        {Array.from({ length: review.rating }).map((_, index) => (
          <Star className="h-4 w-4 fill-current" key={`${review.id}-${index}`} />
        ))}
      </div>
      <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">{review.body}</p>
      <div className="mt-5">
        <p className="font-semibold text-[var(--text-primary)]">{review.name}</p>
        <p className="text-sm text-[var(--text-secondary)]">
          {review.title} {"\u00B7"} {review.serviceLabel}
        </p>
      </div>
    </article>
  );
}

export function AvailabilityChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span className="rounded-full bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--color-secondary)]" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function BookingStepper({ step }: { step: number }) {
  const steps = ["Target", "Service", "Time", "Details", "Review"];

  return (
    <div
      className="grid min-w-0 gap-1.5 sm:gap-2"
      style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
    >
      {steps.map((label, index) => {
        const itemStep = index + 1;
        const active = itemStep <= step;

        return (
          <div className="min-w-0 space-y-2" key={label}>
            <div className={cn("h-1.5 rounded-full", active ? "bg-[var(--surface-elevated)]" : "bg-[var(--border-subtle)]")} />
            <p className={cn("truncate text-[10px] sm:text-xs", active ? "text-[var(--text-primary)]" : "text-[var(--color-secondary)]")}>{label}</p>
          </div>
        );
      })}
    </div>
  );
}

export function DateChip({
  label,
  date,
  selected,
  onClick,
}: {
  label: string;
  date: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "min-w-[88px] rounded-[22px] border px-4 py-3 text-left transition active:scale-[0.98]",
        selected
          ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] font-semibold shadow-sm"
          : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--color-clay)] hover:text-[var(--text-primary)]",
      )}
      onClick={onClick}
      type="button"
    >
      <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-1 font-semibold">{date}</p>
    </button>
  );
}

export function TimePill({
  value,
  selected,
  onClick,
}: {
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.98]",
        selected
          ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] font-semibold shadow-sm"
          : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--color-clay)] hover:text-[var(--text-primary)]",
      )}
      onClick={onClick}
      type="button"
    >
      {value}
    </button>
  );
}

export function PriceSummary({
  serviceCount,
  priceTotal,
  durationLabel,
}: {
  serviceCount: number;
  priceTotal: string;
  durationLabel: string;
}) {
  return (
    <div className="rounded-[28px] bg-[var(--color-ink)] p-5 text-white shadow-[0_20px_50px_rgba(13,27,42,0.24)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/60">Selected services</p>
          <p className="mt-1 text-lg font-semibold">{serviceCount} chosen</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.22em] text-white/60">Estimated total</p>
          <p className="mt-1 text-xl font-semibold text-[var(--color-warning)]">{priceTotal}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/72">{durationLabel}</p>
    </div>
  );
}

export function NotificationToggle({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-4 text-left transition hover:border-[var(--color-clay)]/30 hover:shadow-sm active:scale-[0.99]"
      onClick={onToggle}
      type="button"
    >
      <div>
        <p className="font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{hint}</p>
      </div>
      <span
        className={cn(
          "flex h-7 w-12 items-center rounded-full p-1 transition",
          checked ? "justify-end bg-[var(--color-clay)]" : "justify-start bg-[var(--border-subtle)]",
        )}
      >
        <span className="h-5 w-5 rounded-full bg-[var(--color-white)] shadow-sm" />
      </span>
    </button>
  );
}

// â”€â”€â”€ Portfolio Lightbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PortfolioLightbox({
  items,
  startIndex,
  onClose,
}: {
  items: PortfolioItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrent((i) => (i + 1) % items.length);
      if (e.key === "ArrowLeft") setCurrent((i) => (i - 1 + items.length) % items.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, onClose]);

  const item = items[current];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[rgba(0,0,0,0.88)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
      >
        {/* Close */}
        <button
          type="button"
          aria-label="Close"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/14 text-white transition hover:bg-white/24"
          onClick={onClose}
        >
          <span className="text-xl font-light leading-none">âœ•</span>
        </button>

        {/* Content */}
        <motion.div
          className="flex max-h-[90dvh] w-full max-w-[90vw] flex-col items-center gap-4"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.22 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className="relative max-h-[70dvh] w-full overflow-hidden rounded-lg">
            <img
              src={item.image?.url ?? portfolioImage(item.title).url}
              alt={item.title}
              className="mx-auto max-h-[70dvh] max-w-full rounded-lg object-contain"
            />
          </div>
          <div className="max-h-[20dvh] overflow-y-auto px-4 text-center">
            <p className="text-[20px] font-bold text-white">{item.title}</p>
            <p className="mt-1 text-[16px] text-white/70">{item.note}</p>
          </div>
          <p className="text-[13px] text-white/50">{current + 1} / {items.length}</p>
        </motion.div>

        {/* Arrows */}
        <button
          type="button"
          aria-label="Previous"
          className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/14 text-white transition hover:bg-white/24"
          onClick={(e) => { e.stopPropagation(); setCurrent((i) => (i - 1 + items.length) % items.length); }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/14 text-white transition hover:bg-white/24"
          onClick={(e) => { e.stopPropagation(); setCurrent((i) => (i + 1) % items.length); }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export function PortfolioGrid({
  items,
  dark,
}: {
  items: PortfolioItem[];
  dark?: boolean;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="scroll-row sm:grid sm:grid-flow-row sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, idx) => (
          <div
            className={cn(
              "overflow-hidden rounded-[28px] border p-4",
              dark
                ? "border-white/10 bg-white/5"
                : "border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_12px_30px_rgba(0,0,0,0.06)]",
            )}
            key={item.id}
          >
            {/* Photo with hover overlay */}
            <button
              type="button"
              className="group relative block h-40 w-full cursor-pointer overflow-hidden rounded-[22px]"
              onClick={() => setLightboxIndex(idx)}
              aria-label={`View ${item.title}`}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br", item.tint)}>
                <ImageLayer asset={item.image ?? portfolioImage(item.title)} />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.34))]" />
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0)] transition-all duration-200 group-hover:bg-[rgba(0,0,0,0.42)]">
                <Search className="h-6 w-6 scale-75 text-white opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
              </div>
            </button>
            {/* Caption — clickable */}
            <button
              type="button"
              className="mt-4 block w-full cursor-pointer text-left"
              onClick={() => setLightboxIndex(idx)}
            >
              <h3 className={cn("text-lg font-semibold underline-offset-2 hover:underline", dark ? "text-white" : "text-[var(--text-primary)]")}>
                {item.title}
              </h3>
            </button>
            <p className={cn("mt-2 text-sm leading-6", dark ? "text-white/80" : "text-[var(--text-secondary)]")}>
              {item.note}
            </p>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <PortfolioLightbox
          items={items}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

export function EmptyState({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-12 text-center">
      <Sparkles className="mx-auto h-6 w-6 text-[var(--color-clay)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
    </div>
  );
}

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
      <div className="silk-panel rounded-[32px] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-clay-text)] font-semibold">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="hidden md:block rounded-[32px] bg-[linear-gradient(160deg,var(--color-ink)_0%,#2D2825_52%,#3D3530_100%)] p-6 text-white shadow-[0_22px_60px_rgba(0,0,0,0.25)]">
        <p className="text-xs uppercase tracking-[0.24em] text-white/62">Why Styld</p>
        <h2 className="mt-3 font-display text-4xl leading-tight">Saved choices. Softer booking.</h2>
        <p className="mt-4 text-sm leading-7 text-white/76">
          Your selected service stays ready while your account keeps bookings, reminders, and favourites together.
        </p>
        <div className="mt-6 space-y-3">
          <InfoBullet text="Visible prices, timings, and availability before confirmation" />
          <InfoBullet text="Professional onboarding, portfolio setup, and service management" />
          <InfoBullet text="WhatsApp support without breaking the protected booking flow" />
        </div>
        {aside ? <div className="mt-6">{aside}</div> : null}
      </div>
    </div>
  );
}

function InfoBullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] bg-white/8 px-4 py-3">
      <Check className="mt-1 h-4 w-4 text-[var(--color-warning)]" />
      <p className="text-sm leading-6 text-white/76">{text}</p>
    </div>
  );
}

export function ProfileCompletionCard({
  progress,
  tasks,
}: {
  progress: number;
  tasks: string[];
}) {
  return (
    <article className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">Profile completion</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{progress}% ready</h3>
        </div>
        <div className="rounded-full bg-[var(--surface-elevated)] p-3">
          <ChevronRight className="h-5 w-5 text-[var(--text-primary)]" />
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-[var(--border-subtle)]">
        <div className="h-2 rounded-full bg-[var(--color-clay)]" style={{ width: `${progress}%` }} />
      </div>
      <ul className="mt-5 space-y-3">
        {tasks.map((task) => (
          <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)]" key={task}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-elevated)]">
              <Check className="h-3.5 w-3.5 text-[var(--color-clay-text)]" />
            </span>
            {task}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function FilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_24px_rgba(0,0,0,0.06)] lg:hidden hover:border-[var(--color-clay)]"
      onClick={onClick}
      type="button"
    >
      <Filter className="h-4 w-4" />
      Filters
    </button>
  );
}

export function LookCard({ look }: { look: BeautyLook }) {
  const bookHref = `${buildBookingHref({
    targetType: look.providerType,
    targetId: look.providerSlug,
  })}&serviceId=${look.serviceId}&lookTitle=${encodeURIComponent(look.title)}`;

  const interceptBook = useGuestBookingGate(bookHref);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[22px] border border-[var(--border-subtle)] bg-[var(--card-bg)] text-[var(--card-text)] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
      {/* Visual Look Hero (4:5 Editorial Portrait) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--bg-surface-raised)]">
        <ImageLayer asset={look.image} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

        {/* Provenance Badge */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {look.provenance === "completed_appointment" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/85 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-sm">
              <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
              Verified Client Look
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md shadow-sm">
              Verified Stylist Work
            </span>
          )}
        </div>

        {/* Save to Collection / Bookmark */}
        <div className="absolute top-3 right-3 z-10">
          <SaveHeart slug={`look-${look.id}`} type="look" />
        </div>

        {/* Floating details over image bottom */}
        <div className="absolute bottom-3 left-3 right-3 z-10 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C0A090]">
            {look.category}
          </p>
          <h3 className="text-base font-bold leading-snug drop-shadow-sm line-clamp-1 text-white">
            {look.title}
          </h3>
          <div className="mt-1 flex items-center justify-between text-xs text-white/90">
            <span className="font-medium truncate max-w-[65%]">
              {look.providerName} {"\u00B7"} {look.location}
            </span>
            <span className="shrink-0 font-bold text-[#FAF8F5]">
              From {formatKES(look.startingPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Trust & Booking Action Strip */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        {/* Hair type, duration & service mode */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
          {look.hairType && (
            <span className="rounded-full bg-[var(--bg-surface-raised)] px-2.5 py-0.5 font-medium border border-[var(--border-subtle)]">
              {look.hairType}
            </span>
          )}
          <span className="rounded-full bg-[var(--bg-surface-raised)] px-2.5 py-0.5 font-medium border border-[var(--border-subtle)]">
            ~{look.estimatedDuration}
          </span>
          <span className="rounded-full bg-[var(--bg-surface-raised)] px-2.5 py-0.5 font-medium border border-[var(--border-subtle)]">
            {look.serviceMode}
          </span>
        </div>

        {/* Next Opening & Review score */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-2.5">
          <div className="flex items-center gap-1 font-medium">
            <Star className="h-3.5 w-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            <span className="font-bold text-[var(--text-primary)]">{look.rating}</span>
            <span>({look.verifiedClientReviewsCount} reviews)</span>
          </div>
          <span className="text-[11px] text-[var(--color-clay-text)] font-semibold">
            {look.nextAvailable}
          </span>
        </div>

        {/* Primary CTA: Book This Look */}
        <CTAButton
          data-tour="book-service"
          href={bookHref}
          onClick={interceptBook}
          className="w-full justify-center py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          Book this look
        </CTAButton>
      </div>
    </article>
  );
}
