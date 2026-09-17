"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sparkles, ChevronRight, ChevronLeft, X, Loader2, CheckCircle2 } from "lucide-react";
import { readAppSession, type AppUserSession, APP_SESSION_EVENT } from "@/lib/client-session";

export const ONBOARDING_KEY_PREFIX = "styld:onboarding:v1:";
export const ONBOARDING_STEP_PREFIX = "styld:onboarding_step:";
export const ONBOARDING_RESTART_EVENT = "styld:restart-tour";

export function getOnboardingStorageKey(userId: string): string {
  return `${ONBOARDING_KEY_PREFIX}${userId}`;
}

export function getOnboardingStepKey(userId: string): string {
  return `${ONBOARDING_STEP_PREFIX}${userId}`;
}

export function restartOnboardingTour(options?: { resetStep?: boolean }) {
  if (typeof window === "undefined") return;
  const session = readAppSession();
  if (session && session.role !== "guest") {
    try {
      window.localStorage.removeItem(getOnboardingStorageKey(session.id));
      if (options?.resetStep !== false) {
        window.sessionStorage.removeItem(getOnboardingStepKey(session.id));
      }
    } catch {
      // ignore storage access errors
    }
  }
  window.dispatchEvent(new CustomEvent(ONBOARDING_RESTART_EVENT));
}

export interface TourStep {
  id: string;
  title: string;
  badge: string;
  content: string;
  route?: string;
  targetSelector?: string;
  placement?: "bottom" | "top" | "left" | "right" | "center";
}

export const CLIENT_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Styld",
    badge: "Client Walkthrough",
    content: "Nairobi's trusted social beauty platform. Discover verified salons, connect with premier independent stylists, and book appointments with total transparency.",
    placement: "center",
  },
  {
    id: "discover",
    title: "Discover Nairobi's Best",
    badge: "Explore Directory",
    content: "Browse curated categories across Hair, Nails, Make-up, Skincare, and Wellness from vetted specialists near you.",
    route: "/discover",
    targetSelector: '[data-tour="discover-tabs"]',
    placement: "bottom",
  },
  {
    id: "filters",
    title: "Smart Neighborhood Filters",
    badge: "Refine Search",
    content: "Filter instantly by location (Kilimani, Westlands, Karen, South B), verified status, price range, and mobile or salon service mode.",
    route: "/discover",
    targetSelector: '[data-tour="discover-filters"]',
    placement: "bottom",
  },
  {
    id: "providers",
    title: "Verified Providers & Salons",
    badge: "Trusted Profiles",
    content: "Explore transparent profiles showing authentic client ratings, verified credentials, location tags, and clear starting prices.",
    route: "/discover",
    targetSelector: '[data-tour="provider-card"]',
    placement: "bottom",
  },
  {
    id: "booking",
    title: "Direct & Honest Booking",
    badge: "Transparent Pricing",
    content: "No hidden charges or surprise fees. Choose your preferred service, select your time slot, and confirm directly with the provider.",
    route: "/discover",
    targetSelector: '[data-tour="book-service"]',
    placement: "top",
  },
  {
    id: "activity",
    title: "Appointments & Activity",
    badge: "Stay Organized",
    content: "Track your upcoming appointments, rescheduling updates, and service history all from your Styld Home feed.",
    route: "/home",
    targetSelector: '[data-tour="home-nav"]',
    placement: "bottom",
  },
  {
    id: "profile",
    title: "Your Beauty Profile & Settings",
    badge: "Personalized For You",
    content: "Manage your profile, saves, and preferences anytime. You can replay this interactive tour anytime from Settings or Help!",
    route: "/home",
    targetSelector: '[data-tour="profile-nav"]',
    placement: "bottom",
  },
];

export const PROFESSIONAL_STEPS: TourStep[] = [
  {
    id: "welcome-pro",
    title: "Welcome to your Pro Studio",
    badge: "Professional Studio",
    content: "Your all-in-one studio to showcase your craft, schedule appointments, and grow your client base across Nairobi.",
    placement: "center",
  },
  {
    id: "pro-profile",
    title: "Your Public Studio Profile",
    badge: "Client Front",
    content: "Customize your bio, specialty tags, service mode (mobile, in-salon, or both), and service areas to attract high-intent clients.",
    route: "/profile",
    targetSelector: '[data-tour="pro-profile-header"]',
    placement: "bottom",
  },
  {
    id: "pro-portfolio",
    title: "Portfolio & Social Feed",
    badge: "Showcase Your Work",
    content: "Post before-and-after work directly to the Styld community feed so clients can discover and book your services directly.",
    route: "/profile",
    targetSelector: '[data-tour="pro-posts-tab"]',
    placement: "bottom",
  },
  {
    id: "pro-requests",
    title: "Client Bookings & Requests",
    badge: "Manage Appointments",
    content: "Review incoming appointment requests, confirm times, manage scheduling, and chat directly with your clients.",
    route: "/profile?tab=requests",
    targetSelector: '[data-tour="pro-requests-view"]',
    placement: "bottom",
  },
  {
    id: "pro-navigation",
    title: "Workspace & Replay Anytime",
    badge: "You're All Set",
    content: "Switch between your social feed, appointment requests, and settings from the navigation bar. Replay this walkthrough anytime in Settings.",
    targetSelector: '[data-tour="profile-nav"]',
    placement: "bottom",
  },
];

export const SALON_STEPS: TourStep[] = [
  {
    id: "welcome-salon",
    title: "Welcome to Salon Hub",
    badge: "Salon Management",
    content: "Coordinate your salon staff, manage chair schedules, showcase group portfolios, and grow appointment bookings effortlessly.",
    placement: "center",
  },
  {
    id: "salon-profile",
    title: "Salon Brand & Atmosphere",
    badge: "Salon Identity",
    content: "Manage your salon branding, working hours, neighborhood location, and verified badges to build client confidence.",
    route: "/profile",
    targetSelector: '[data-tour="salon-profile-header"]',
    placement: "bottom",
  },
  {
    id: "salon-team",
    title: "Stylists & Team Members",
    badge: "Team Coordination",
    content: "Invite stylists to your salon roster, assign individual specialties, and manage team commission rates seamlessly.",
    route: "/profile",
    targetSelector: '[data-tour="salon-team-tab"]',
    placement: "bottom",
  },
  {
    id: "salon-requests",
    title: "Salon Bookings & Schedule",
    badge: "Chair Management",
    content: "Oversee incoming client requests, assign bookings to specific team members, and monitor upcoming appointments.",
    route: "/profile?tab=requests",
    targetSelector: '[data-tour="salon-requests-view"]',
    placement: "bottom",
  },
  {
    id: "salon-finish",
    title: "Hub Ready & Support",
    badge: "Ready for Business",
    content: "Your salon is primed for bookings. Access analytics, manage settings, and retake this walkthrough anytime from Settings.",
    targetSelector: '[data-tour="profile-nav"]',
    placement: "bottom",
  },
];

export function getStepsForRole(role?: string): TourStep[] {
  if (role === "professional") return PROFESSIONAL_STEPS;
  if (role === "salon") return SALON_STEPS;
  return CLIENT_STEPS;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<AppUserSession | null>(null);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetNotFound, setTargetNotFound] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });

  const currentStepRef = useRef<number>(0);
  currentStepRef.current = stepIndex;

  // 1. Sync session and check eligibility
  const checkTourEligibility = useCallback((currentSession: AppUserSession | null) => {
    if (!currentSession || currentSession.role === "guest") {
      setActive(false);
      return false;
    }

    try {
      const completed = window.localStorage.getItem(getOnboardingStorageKey(currentSession.id));
      if (completed === "completed") {
        setActive(false);
        return false;
      }

      // Read saved step from session
      const savedStep = window.sessionStorage.getItem(getOnboardingStepKey(currentSession.id));
      if (savedStep) {
        const parsed = parseInt(savedStep, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          setStepIndex(parsed);
        }
      }

      setActive(true);
      return true;
    } catch {
      setActive(false);
      return false;
    }
  }, []);

  useEffect(() => {
    function handleSync() {
      const sess = readAppSession();
      setSession(sess);
      checkTourEligibility(sess);
    }

    handleSync();

    function handleRestart() {
      const sess = readAppSession();
      setSession(sess);
      if (sess && sess.role !== "guest") {
        setStepIndex(0);
        setActive(true);
      }
    }

    window.addEventListener(APP_SESSION_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener(ONBOARDING_RESTART_EVENT, handleRestart);

    return () => {
      window.removeEventListener(APP_SESSION_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(ONBOARDING_RESTART_EVENT, handleRestart);
    };
  }, [checkTourEligibility]);

  // Track window size for layout calculations
  useEffect(() => {
    if (typeof window === "undefined") return;
    function updateSize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const steps = getStepsForRole(session?.role);
  const currentStep: TourStep | undefined = steps[stepIndex];

  // 2. Measure target element position
  const measureTarget = useCallback(() => {
    if (!active || !currentStep || currentStep.placement === "center" || !currentStep.targetSelector) {
      setTargetRect(null);
      setTargetNotFound(false);
      return;
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
        setTargetNotFound(false);
        return;
      }
    }
  }, [active, currentStep]);

  // Keep target rect updated on scroll and resize
  useEffect(() => {
    if (!active) return;
    measureTarget();
    window.addEventListener("scroll", measureTarget, { passive: true });
    window.addEventListener("resize", measureTarget);
    return () => {
      window.removeEventListener("scroll", measureTarget);
      window.removeEventListener("resize", measureTarget);
    };
  }, [active, measureTarget]);

  // 3. Handle step changes & cross-route navigation
  useEffect(() => {
    if (!active || !currentStep) return;

    // Check if step requires a different route
    const requiredRoute = currentStep.route;
    if (requiredRoute && pathname) {
      const targetBase = requiredRoute.split("?")[0];
      const currentBase = pathname.split("?")[0];

      if (currentBase !== targetBase) {
        setIsNavigating(true);
        router.push(requiredRoute);
      }
    }

    // Attempt to locate target element with timeout polling
    if (currentStep.targetSelector && currentStep.placement !== "center") {
      let cancelled = false;
      const startTime = Date.now();
      const timeoutMs = 3500;

      const pollForTarget = () => {
        if (cancelled) return;
        const el = document.querySelector(currentStep.targetSelector!);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            // Found target element! Scroll into view smoothly if needed
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
            const freshRect = el.getBoundingClientRect();
            setTargetRect({
              top: freshRect.top,
              left: freshRect.left,
              width: freshRect.width,
              height: freshRect.height,
              bottom: freshRect.bottom,
              right: freshRect.right,
            });
            setIsNavigating(false);
            setTargetNotFound(false);
            return;
          }
        }

        if (Date.now() - startTime > timeoutMs) {
          // Graceful fallback to centered card if element not found
          setIsNavigating(false);
          setTargetRect(null);
          setTargetNotFound(true);
          return;
        }

        requestAnimationFrame(pollForTarget);
      };

      const timer = setTimeout(pollForTarget, 200);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    } else {
      setTargetRect(null);
      setIsNavigating(false);
      setTargetNotFound(false);
    }
  }, [active, stepIndex, currentStep, pathname, router]);

  // 4. Keyboard navigation
  useEffect(() => {
    if (!active) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleFinish("skipped");
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (stepIndex < steps.length - 1) {
          handleNext();
        } else {
          handleFinish("completed");
        }
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        handlePrev();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      if (session) {
        try {
          window.sessionStorage.setItem(getOnboardingStepKey(session.id), nextIndex.toString());
        } catch {
          // ignore
        }
      }
    } else {
      handleFinish("completed");
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      const prevIndex = stepIndex - 1;
      setStepIndex(prevIndex);
      if (session) {
        try {
          window.sessionStorage.setItem(getOnboardingStepKey(session.id), prevIndex.toString());
        } catch {
          // ignore
        }
      }
    }
  };

  const handleFinish = (status: "completed" | "skipped") => {
    setActive(false);
    if (session) {
      try {
        window.localStorage.setItem(getOnboardingStorageKey(session.id), status);
        window.sessionStorage.removeItem(getOnboardingStepKey(session.id));
      } catch {
        // ignore
      }
    }
  };

  if (!active || !session || session.role === "guest" || !currentStep) {
    return null;
  }

  // Calculate Card Position
  const padding = 8;
  const radius = 16;
  const isMobile = windowSize.width < 768;

  let cardStyle: React.CSSProperties = {};
  if (currentStep.placement === "center" || !targetRect || isMobile) {
    if (isMobile) {
      cardStyle = {
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        maxWidth: "440px",
        margin: "0 auto",
        zIndex: 10000,
      };
    } else {
      cardStyle = {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10000,
        maxWidth: "460px",
        width: "92vw",
      };
    }
  } else {
    // Desktop smart placement relative to target
    const cardWidth = 420;
    const cardHeight = 260;
    const gap = 16;

    let top = 0;
    let left = targetRect.left + (targetRect.width - cardWidth) / 2;

    if (currentStep.placement === "top") {
      top = targetRect.top - cardHeight - gap;
      if (top < 20) {
        top = targetRect.bottom + gap;
      }
    } else {
      // Default: bottom
      top = targetRect.bottom + gap;
      if (top + cardHeight > windowSize.height - 20) {
        top = targetRect.top - cardHeight - gap;
      }
    }

    // Clamp left within viewport boundaries
    left = Math.max(16, Math.min(left, windowSize.width - cardWidth - 16));
    top = Math.max(20, Math.min(top, windowSize.height - cardHeight - 20));

    cardStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      zIndex: 10000,
    };
  }

  return (
    <>
      {/* ── Spotlight Overlay (SVG Mask) ─────────────────────────────────── */}
      <svg
        className="pointer-events-auto fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{ width: "100vw", height: "100vh" }}
        onClick={() => {
          // Clicking overlay doesn't abruptly cancel to prevent accidental taps
        }}
      >
        <defs>
          <mask id="styld-spotlight-mask">
            {/* White covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout makes target area clear */}
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={radius}
                ry={radius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(29, 29, 27, 0.78)"
          mask="url(#styld-spotlight-mask)"
        />
      </svg>

      {/* ── Highlight Border around target ──────────────────────────────── */}
      {targetRect && (
        <div
          className="pointer-events-none fixed z-[9999] rounded-[16px] border-2 border-[#C0A090] shadow-[0_0_24px_rgba(192,160,144,0.45)] transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
        />
      )}

      {/* ── Styld Guide Card ────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        style={cardStyle}
        className="rounded-[28px] border border-[#C0A090]/40 bg-[#1D1D1B] p-6 text-white shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header: Role Badge + Step count + Close */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#909888]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#909888]">
              <Sparkles className="h-3 w-3" />
              {currentStep.badge}
            </span>
            <span className="text-xs font-semibold text-white/50">
              {stepIndex + 1} of {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleFinish("skipped")}
            className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
            title="Skip tour (Esc)"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Loading / Route Navigation Indicator */}
        {isNavigating && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-[#C0A090]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Navigating to {currentStep.route}...</span>
          </div>
        )}

        {/* Target Fallback Warning (if element was not found) */}
        {targetNotFound && !isNavigating && (
          <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
            <span>Guide card view (target element not in current viewport)</span>
          </div>
        )}

        {/* Content */}
        <div className="mt-4">
          <h2 id="tour-step-title" className="text-lg font-bold text-white tracking-tight">
            {currentStep.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            {currentStep.content}
          </p>
        </div>

        {/* Step Progress Dots */}
        <div className="mt-5 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? "w-6 bg-[#C0A090]"
                  : i < stepIndex
                  ? "w-1.5 bg-[#909888]"
                  : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Controls: Skip, Back, Next / Finish */}
        <div className="mt-6 flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => handleFinish("skipped")}
            className="text-xs font-semibold text-white/50 transition hover:text-white/80 underline-offset-4 hover:underline"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isNavigating}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isNavigating}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C0A090] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#1D1D1B] transition hover:bg-[#b09080] active:scale-95 disabled:opacity-50 shadow-md"
            >
              {stepIndex === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Got it
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

