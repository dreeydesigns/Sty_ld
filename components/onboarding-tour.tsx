"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sparkles, ChevronRight, ChevronLeft, X, Loader2, CheckCircle2 } from "lucide-react";
import { APP_SESSION_EVENT } from "@/lib/client-session";
import {
  resolveTourAuthorization,
  type TourAuthorization,
} from "@/lib/onboarding-tour-access";
import {
  computeTourGuideLayout,
  getNextTourStepIndex,
  getPreviousTourStepIndex,
  isFinalTourStep,
  isTourTargetUsable,
  routeMatchesStep,
  type TourGuideLayout,
  type TourTargetRect,
  type TourViewport,
} from "@/lib/onboarding-tour-layout";

export const ONBOARDING_KEY_PREFIX = "styld:onboarding:v2:";
export const ONBOARDING_STEP_PREFIX = "styld:onboarding_step:v2:";
export const ONBOARDING_RESTART_EVENT = "styld:restart-tour";

export function getOnboardingStorageKey(userId: string, scopeKey: string): string {
  return `${ONBOARDING_KEY_PREFIX}${userId}:${scopeKey}`;
}

export function getOnboardingStepKey(userId: string, scopeKey: string): string {
  return `${ONBOARDING_STEP_PREFIX}${userId}:${scopeKey}`;
}

export function isOnboardingDismissed(value: string | null): boolean {
  return value === "completed" || value === "skipped";
}

export function restartOnboardingTour(options?: { resetStep?: boolean }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ONBOARDING_RESTART_EVENT, { detail: options ?? {} })
  );
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
    content: "This tour follows your client account. You will see how discovery, comparison and planning work today, and where live booking is still unavailable.",
    placement: "center",
  },
  {
    id: "discover",
    title: "Discover Nairobi",
    badge: "Explore Directory",
    content: "Browse looks, salons and independent professionals across Nairobi. Use these tabs to switch between what you want to see.",
    route: "/discover",
    targetSelector: '[data-tour="discover-tabs"]',
    placement: "bottom",
  },
  {
    id: "filters",
    title: "Neighbourhood Filters",
    badge: "Refine Search",
    content: "Narrow results by neighbourhood, price and service mode. Filters apply to the category you are viewing.",
    route: "/discover",
    targetSelector: '[data-tour="discover-filters"]',
    placement: "bottom",
  },
  {
    id: "providers",
    title: "Salons and Professionals",
    badge: "Provider Profiles",
    content: "Open a salon or professional profile to see the services and details shown there. Discovery listings currently include sample profiles while the marketplace is prepared.",
    route: "/discover?tab=salons",
    targetSelector: '[data-tour="provider-card"]',
    placement: "bottom",
  },
  {
    id: "compare",
    title: "Compare Services",
    badge: "Side By Side",
    content: "Compare up to four catalogue services by provider, price, duration and description. Values are demonstration data, not live quotes or availability.",
    route: "/service-comparison",
    targetSelector: '[data-tour="comparison-controls"]',
    placement: "bottom",
  },
  {
    id: "plan",
    title: "Plan Before You Commit",
    badge: "Planning Preview",
    content: "Use Plan to review a selected service and provider in one place. This is a planning preview only. Booking requests, appointments, confirmations and payments are not live yet.",
    route: "/book",
    targetSelector: '[data-tour="planning-header"]',
    placement: "bottom",
  },
  {
    id: "home",
    title: "Home and Updates",
    badge: "Stay Informed",
    content: "Home brings discovery and supported account updates together. Appointment history is not shown because live bookings are not available yet.",
    route: "/home",
    targetSelector: '[data-tour="home-nav"]',
    placement: "bottom",
  },
  {
    id: "profile",
    title: "Profile and Preferences",
    badge: "Personalised For You",
    content: "Manage your account details and preferences from Me and Settings. You can replay this client tour from Settings or Help at any time.",
    route: "/profile",
    targetSelector: '[data-tour="profile-nav"]',
    placement: "bottom",
  },
];

export const PROFESSIONAL_STEPS: TourStep[] = [
  {
    id: "welcome-pro",
    title: "Welcome to Your Pro Studio",
    badge: "Professional Walkthrough",
    content: "This tour follows your Professional workspace. It covers the dashboard preview, public profile, portfolio and workspace tools available now, and labels anything still in preparation.",
    placement: "center",
  },
  {
    id: "pro-dashboard",
    title: "Professional Dashboard",
    badge: "Planning View",
    content: "Open Dashboard in your profile to review a planning view. Metrics there are sample preview values and do not represent real bookings, earnings or clients.",
    route: "/profile",
    targetSelector: '[data-tour="pro-dashboard-tab"]',
    placement: "bottom",
  },
  {
    id: "pro-workspace",
    title: "Your Professional Workspace",
    badge: "Role Workspace",
    content: "This workspace is separate from the client experience. It shows the identity, service areas and supported tools tied to your Professional account.",
    route: "/workspace/professional",
    targetSelector: '[data-tour="pro-workspace-header"]',
    placement: "bottom",
  },
  {
    id: "pro-services",
    title: "Services and Service Areas",
    badge: "Account Records",
    content: "Review the services and areas recorded for this workspace. Service editing is not available here yet, so use supported profile settings and do not treat this as a live price list.",
    route: "/workspace/professional",
    targetSelector: '[data-tour="pro-services-summary"]',
    placement: "bottom",
  },
  {
    id: "pro-profile",
    title: "Your Public Studio Profile",
    badge: "Client View",
    content: "Your profile is the public studio identity. Keep your bio, specialty, location and photo accurate. Only details saved to your account are shown.",
    route: "/profile",
    targetSelector: '[data-tour="pro-profile-header"]',
    placement: "bottom",
  },
  {
    id: "pro-portfolio",
    title: "Portfolio Posts",
    badge: "Show Your Work",
    content: "Posts is your portfolio area. You can prepare posts here, but public publishing and community engagement are not live yet.",
    route: "/profile",
    targetSelector: '[data-tour="pro-posts-tab"]',
    placement: "bottom",
  },
  {
    id: "pro-requests",
    title: "Client Requests",
    badge: "Enquiries",
    content: "Requests to discuss a Look, a service or a plan arrive here. Accept one to open a discussion. It is not an appointment, and bookings and payments are not live yet.",
    route: "/profile?tab=requests",
    targetSelector: '[data-tour="pro-requests-view"]',
    placement: "bottom",
  },
  {
    id: "pro-settings",
    title: "Workspace Settings",
    badge: "Account Controls",
    content: "Use Settings to review your account and switch between approved workspaces. Switching workspaces starts the matching tour and does not grant access by itself.",
    route: "/settings",
    targetSelector: '[data-tour="settings-workspaces"]',
    placement: "bottom",
  },
];

export const SALON_STEPS: TourStep[] = [
  {
    id: "welcome-salon",
    title: "Welcome to Salon Hub",
    badge: "Salon Walkthrough",
    content: "This tour follows your Salon workspace. It covers the salon dashboard, public identity, staff area and supported management tools, and labels anything still in preparation.",
    placement: "center",
  },
  {
    id: "salon-workspace",
    title: "Salon Workspace and Identity",
    badge: "Salon Dashboard",
    content: "This is your salon workspace. It shows the business identity and supported account tools for the currently authorized Salon workspace.",
    route: "/workspace/salon",
    targetSelector: '[data-tour="salon-workspace-header"]',
    placement: "bottom",
  },
  {
    id: "salon-services",
    title: "Services and Team Records",
    badge: "Account Records",
    content: "Review the service and team counts linked to this salon record. Live service editing, staffing changes and availability are not available in this workspace yet.",
    route: "/workspace/salon",
    targetSelector: '[data-tour="salon-services-summary"]',
    placement: "bottom",
  },
  {
    id: "salon-tools",
    title: "Business Tools",
    badge: "Management Links",
    content: "Use these links for messages, requests and settings. They open the existing supported routes; they do not enable booking, payments or staff operations.",
    route: "/workspace/salon",
    targetSelector: '[data-tour="salon-business-tools"]',
    placement: "bottom",
  },
  {
    id: "salon-profile",
    title: "Salon Profile",
    badge: "Salon Identity",
    content: "Keep your salon name, location and contact details accurate. Only details saved to the account are shown.",
    route: "/profile",
    targetSelector: '[data-tour="salon-profile-header"]',
    placement: "bottom",
  },
  {
    id: "salon-team",
    title: "Staff Management Area",
    badge: "Team Area",
    content: "Team is the staff management area for this salon. Invitations, commissions and payroll are not live yet, so do not treat this view as an active staff register.",
    route: "/profile",
    targetSelector: '[data-tour="salon-team-tab"]',
    placement: "bottom",
  },
  {
    id: "salon-requests",
    title: "Salon Requests",
    badge: "Enquiries",
    content: "Requests to discuss a Look, a service or a plan arrive here. Accept one to open a discussion. It is not an appointment, and bookings and payments are not live yet.",
    route: "/profile?tab=requests",
    targetSelector: '[data-tour="salon-requests-view"]',
    placement: "bottom",
  },
  {
    id: "salon-settings",
    title: "Workspace Administration",
    badge: "Account Controls",
    content: "Use Settings to review account controls and switch between approved workspaces. Only workspaces authorized on the server can be opened.",
    route: "/settings",
    targetSelector: '[data-tour="settings-workspaces"]',
    placement: "bottom",
  },
];

export const ADMIN_STEPS: TourStep[] = [
  {
    id: "welcome-admin",
    title: "Welcome to the Control Room",
    badge: "Administrator Walkthrough",
    content: "This tour is available only to an authorized administrator session with MFA. It follows the live admin controls for records, approvals and account security.",
    placement: "center",
  },
  {
    id: "admin-header",
    title: "Administration Overview",
    badge: "Control Room",
    content: "The overview shows supported platform records available to administrators. Counts come from current browser records and do not prove production activity.",
    route: "/admin",
    targetSelector: '[data-tour="admin-header"]',
    placement: "bottom",
  },
  {
    id: "admin-tabs",
    title: "Moderation Tabs",
    badge: "Review Areas",
    content: "Use Overview, Bookings, Posts and Messages to review supported records. Verification, reports and role control cards are marked as coming in production.",
    route: "/admin",
    targetSelector: '[data-tour="admin-tabs"]',
    placement: "bottom",
  },
  {
    id: "admin-security-link",
    title: "Account Security",
    badge: "Restricted Tools",
    content: "Open Account security to review provider applications, account status and recent security events. These controls require an administrator session with MFA.",
    route: "/admin",
    targetSelector: '[data-tour="admin-security-link"]',
    placement: "bottom",
  },
  {
    id: "admin-approvals",
    title: "Provider Approvals",
    badge: "Workspace Review",
    content: "Approve or reject provider workspace applications only after the required contact and business review. An approval is not an identity badge.",
    route: "/admin/security",
    targetSelector: '[data-tour="admin-approvals"]',
    placement: "bottom",
  },
  {
    id: "admin-accounts",
    title: "Account Controls",
    badge: "Access Control",
    content: "Search accounts, suspend or restore access, or log out devices. Administrative actions require a recorded reason.",
    route: "/admin/security",
    targetSelector: '[data-tour="admin-accounts"]',
    placement: "bottom",
  },
  {
    id: "admin-events",
    title: "Audit Trail",
    badge: "Security Events",
    content: "Recent security events record sign-ins and administrative actions. Use them for review; they are not a replacement for a full audit system.",
    route: "/admin/security",
    targetSelector: '[data-tour="admin-events"]',
    placement: "bottom",
  },
];

export function getStepsForRole(role?: string): TourStep[] {
  if (role === "client") return CLIENT_STEPS;
  if (role === "professional") return PROFESSIONAL_STEPS;
  if (role === "salon") return SALON_STEPS;
  if (role === "super_admin") return ADMIN_STEPS;
  return [];
}

interface TargetCandidate {
  element: HTMLElement;
  rect: TourTargetRect;
  usable: boolean;
}

function toTourRect(rect: DOMRect): TourTargetRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
  };
}

function sameTourRect(a: TourTargetRect, b: TourTargetRect): boolean {
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

export type TourStatus =
  | "not_started"
  | "running"
  | "waiting_for_route"
  | "waiting_for_target"
  | "completed"
  | "skipped";

export function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();

  const [authorization, setAuthorization] = useState<TourAuthorization | null>(null);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<TourStatus>("not_started");
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetMissing, setTargetMissing] = useState(false);
  const [viewport, setViewport] = useState<TourViewport>(() => {
    if (typeof window === "undefined") return { width: 1200, height: 800 };
    return {
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
    };
  });
  const [cardSize, setCardSize] = useState({ width: 420, height: 320 });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef(viewport);
  const routeAttemptRef = useRef("");
  const activeRef = useRef(false);
  const authorizationRef = useRef<TourAuthorization | null>(null);
  const pendingRestartRef = useRef(false);
  const authRequestRef = useRef(0);
  viewportRef.current = viewport;
  activeRef.current = active;

  const checkTourEligibility = useCallback((access: TourAuthorization | null) => {
    if (!access) {
      setActive(false);
      return false;
    }

    try {
      const completed = window.localStorage.getItem(
        getOnboardingStorageKey(access.userId, access.scopeKey)
      );
      if (isOnboardingDismissed(completed)) {
        setActive(false);
        return false;
      }

      routeAttemptRef.current = "";

      const savedStep = window.sessionStorage.getItem(
        getOnboardingStepKey(access.userId, access.scopeKey)
      );
      const parsed = savedStep ? parseInt(savedStep, 10) : 0;
      setStepIndex(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
      setStatus("running");
      setActive(true);
      return true;
    } catch {
      setActive(false);
      return false;
    }
  }, []);

  const applyAuthorization = useCallback(
    (access: TourAuthorization | null) => {
      const previous = authorizationRef.current;
      const scopeChanged = previous?.scopeKey !== access?.scopeKey;
      authorizationRef.current = access;
      setAuthorization(access);

      if (!access) {
        setActive(false);
        return;
      }

      if (pendingRestartRef.current) {
        pendingRestartRef.current = false;
        try {
          window.localStorage.removeItem(
            getOnboardingStorageKey(access.userId, access.scopeKey)
          );
          window.sessionStorage.removeItem(
            getOnboardingStepKey(access.userId, access.scopeKey)
          );
        } catch {
          // ignore storage access errors
        }
        routeAttemptRef.current = "";
        setStepIndex(0);
        setStatus("running");
        setActive(true);
        return;
      }

      if (scopeChanged) {
        setActive(false);
        checkTourEligibility(access);
        return;
      }

      if (!activeRef.current) checkTourEligibility(access);
    },
    [checkTourEligibility]
  );

  const syncAuthorization = useCallback(async () => {
    const requestId = authRequestRef.current + 1;
    authRequestRef.current = requestId;

    try {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        if (authRequestRef.current === requestId) applyAuthorization(null);
        return;
      }
      const data = await response.json();
      if (authRequestRef.current !== requestId) return;
      applyAuthorization(resolveTourAuthorization(data?.session));
    } catch {
      if (authRequestRef.current === requestId) applyAuthorization(null);
    }
  }, [applyAuthorization]);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (!cancelled) void syncAuthorization();
    };

    sync();

    function handleSessionChange() {
      sync();
    }

    function handleRestart() {
      pendingRestartRef.current = true;
      const access = authorizationRef.current;
      if (access) applyAuthorization(access);
    }

    window.addEventListener(APP_SESSION_EVENT, handleSessionChange);
    window.addEventListener("storage", handleSessionChange);
    window.addEventListener(ONBOARDING_RESTART_EVENT, handleRestart);

    return () => {
      cancelled = true;
      window.removeEventListener(APP_SESSION_EVENT, handleSessionChange);
      window.removeEventListener("storage", handleSessionChange);
      window.removeEventListener(ONBOARDING_RESTART_EVENT, handleRestart);
    };
  }, [applyAuthorization, syncAuthorization]);

  const steps = getStepsForRole(authorization?.role);
  const safeStepIndex = Math.min(Math.max(stepIndex, 0), Math.max(steps.length - 1, 0));
  const currentStep: TourStep | undefined = steps[safeStepIndex];

  const updateViewport = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = {
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
    };
    setViewport((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next
    );
  }, []);

  useEffect(() => {
    updateViewport();
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, [updateViewport]);

  const findTarget = useCallback((selector: string): TargetCandidate | null => {
    if (typeof document === "undefined") return null;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    let best: TargetCandidate | null = null;
    let bestArea = 0;

    for (const element of nodes) {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      const area = rect.width * rect.height;
      if (area <= bestArea) continue;

      const tourRect = toTourRect(rect);
      best = {
        element,
        rect: tourRect,
        usable: isTourTargetUsable(tourRect, viewportRef.current),
      };
      bestArea = area;
    }

    return best;
  }, []);

  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof window === "undefined") return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (!(rect.width > 0) || !(rect.height > 0)) return;
      const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
      setCardSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (!active || !currentStep?.route || typeof window === "undefined") return;
    const matches = routeMatchesStep(
      currentStep.route,
      pathname ?? window.location.pathname,
      window.location.search
    );
    if (matches) return;

    const attemptKey = `${safeStepIndex}:${currentStep.route}`;
    if (routeAttemptRef.current === attemptKey) return;
    routeAttemptRef.current = attemptKey;
    setStatus("waiting_for_route");
    setIsNavigating(true);
    router.push(currentStep.route);
  }, [active, safeStepIndex, currentStep, pathname, router]);

  useEffect(() => {
    if (!active || !currentStep || typeof window === "undefined") return;

    const selector = currentStep.targetSelector;
    if (currentStep.placement === "center" || !selector) {
      setTargetRect(null);
      setTargetMissing(false);
      setIsNavigating(false);
      setStatus("running");
      return;
    }

    let cancelled = false;
    let frame = 0;
    let scrolled = false;
    const startedAt = Date.now();
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    setTargetRect(null);
    setTargetMissing(false);
    setStatus("waiting_for_target");

    const findAndMeasure = () => {
      if (cancelled) return;

      if (
        currentStep.route &&
        !routeMatchesStep(currentStep.route, window.location.pathname, window.location.search)
      ) {
        setStatus("waiting_for_route");
        setIsNavigating(true);
        if (Date.now() - startedAt > 5000) {
          setIsNavigating(false);
          setTargetMissing(true);
          setStatus("running");
          return;
        }
        frame = requestAnimationFrame(findAndMeasure);
        return;
      }

      const candidate = findTarget(selector);
      if (candidate) {
        if (candidate.usable) {
          setTargetRect((prev) =>
            prev && sameTourRect(prev, candidate.rect) ? prev : candidate.rect
          );
          setIsNavigating(false);
          setTargetMissing(false);
          setStatus("running");
          return;
        }

        if (!scrolled) {
          scrolled = true;
          candidate.element.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }

      if (Date.now() - startedAt > 4500) {
        setIsNavigating(false);
        setTargetRect(null);
        setTargetMissing(true);
        setStatus("running");
        return;
      }

      frame = requestAnimationFrame(findAndMeasure);
    };

    frame = requestAnimationFrame(findAndMeasure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, safeStepIndex, currentStep, pathname, findTarget]);

  useEffect(() => {
    if (!active || !currentStep?.targetSelector || currentStep.placement === "center") {
      return;
    }
    if (typeof window === "undefined") return;

    const selector = currentStep.targetSelector;
    let observer: ResizeObserver | undefined;
    let refreshFrame = 0;

    const refresh = () => {
      if (
        currentStep.route &&
        !routeMatchesStep(currentStep.route, window.location.pathname, window.location.search)
      ) {
        return;
      }
      const candidate = findTarget(selector);
      if (!candidate) return;
      if (isTourTargetUsable(candidate.rect, viewportRef.current)) {
        setTargetRect((prev) =>
          prev && sameTourRect(prev, candidate.rect) ? prev : candidate.rect
        );
        setTargetMissing(false);
        setStatus((prev) => (prev === "waiting_for_route" ? prev : "running"));
      } else {
        setTargetRect(null);
      }
    };

    const scheduleRefresh = () => {
      if (refreshFrame) return;
      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = 0;
        refresh();
      });
    };

    const startTimer = window.setTimeout(() => {
      refresh();
      const candidate = findTarget(selector);
      if (candidate && typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(scheduleRefresh);
        observer.observe(candidate.element);
      }
    }, 600);
    const interval = window.setInterval(scheduleRefresh, 600);
    const visualViewport = window.visualViewport;

    window.addEventListener("scroll", scheduleRefresh, true);
    window.addEventListener("resize", scheduleRefresh);
    window.addEventListener("orientationchange", scheduleRefresh);
    visualViewport?.addEventListener("resize", scheduleRefresh);
    visualViewport?.addEventListener("scroll", scheduleRefresh);

    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
      window.cancelAnimationFrame(refreshFrame);
      observer?.disconnect();
      window.removeEventListener("scroll", scheduleRefresh, true);
      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener("orientationchange", scheduleRefresh);
      visualViewport?.removeEventListener("resize", scheduleRefresh);
      visualViewport?.removeEventListener("scroll", scheduleRefresh);
    };
  }, [active, safeStepIndex, currentStep, findTarget]);

  const handleFinish = useCallback(
    (finalStatus: "completed" | "skipped") => {
      setActive(false);
      setStatus(finalStatus);
      if (!authorization) return;
      try {
        window.localStorage.setItem(
          getOnboardingStorageKey(authorization.userId, authorization.scopeKey),
          finalStatus
        );
        window.sessionStorage.removeItem(
          getOnboardingStepKey(authorization.userId, authorization.scopeKey)
        );
      } catch {
        // ignore storage access errors
      }
    },
    [authorization]
  );

  const handleNext = useCallback(() => {
    if (isFinalTourStep(safeStepIndex, steps.length)) {
      handleFinish("completed");
      return;
    }

    const nextIndex = getNextTourStepIndex(safeStepIndex, steps.length);
    setStepIndex(nextIndex);
    setStatus("running");
    if (!authorization) return;
    try {
      window.sessionStorage.setItem(
        getOnboardingStepKey(authorization.userId, authorization.scopeKey),
        nextIndex.toString()
      );
    } catch {
      // ignore storage access errors
    }
  }, [authorization, handleFinish, safeStepIndex, steps.length]);

  const handlePrev = useCallback(() => {
    const prevIndex = getPreviousTourStepIndex(safeStepIndex);
    if (prevIndex === safeStepIndex) return;

    setStepIndex(prevIndex);
    setStatus("running");
    if (!authorization) return;
    try {
      window.sessionStorage.setItem(
        getOnboardingStepKey(authorization.userId, authorization.scopeKey),
        prevIndex.toString()
      );
    } catch {
      // ignore storage access errors
    }
  }, [authorization, safeStepIndex]);

  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    cardRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleFinish("skipped");
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      if (event.key === "Tab") {
        const card = cardRef.current;
        if (!card) return;
        const focusable = Array.from(
          card.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          )
        ).filter((element) => element.offsetParent !== null);
        if (focusable.length === 0) {
          event.preventDefault();
          card.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!card.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, handleFinish, handleNext, handlePrev]);


  if (!active || !authorization || !currentStep) {
    return null;
  }

  const padding = 8;
  const radius = 16;
  const guideLayout: TourGuideLayout = computeTourGuideLayout({
    targetRect,
    viewport,
    cardWidth: Math.min(cardSize.width || 420, 420),
    cardHeight: cardSize.height || 320,
    preferredPlacement: currentStep.placement ?? "bottom",
  });
  const showSpotlight = guideLayout.spotlight && !!targetRect;
  const cardStyle: React.CSSProperties = {
    ...guideLayout.style,
    zIndex: 10000,
    paddingBottom: "max(20px, env(safe-area-inset-bottom))",
  };

  return (
    <>
      {/* ── Spotlight Overlay (SVG Mask) ─────────────────────────────────── */}
      <svg
        aria-hidden="true"
        className="pointer-events-auto fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{ width: "100vw", height: "100vh" }}
        onClick={() => {
          cardRef.current?.focus({ preventScroll: true });
        }}
      >
        <defs>
          <mask id="styld-spotlight-mask">
            {/* White covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout makes target area clear */}
            {showSpotlight && targetRect && (
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
      {showSpotlight && targetRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[9999] rounded-[16px] border-2 border-[#C0A090] shadow-[0_0_24px_rgba(192,160,144,0.45)] transition-opacity duration-300"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
        />
      )}

      {/* Styld Guide Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-content"
        ref={cardRef}
        tabIndex={-1}
        data-tour-mode={guideLayout.mode}
        data-tour-status={status}
        style={cardStyle}
        className="flex flex-col overflow-hidden rounded-[28px] border border-[#C0A090]/40 bg-[#1D1D1B] text-white shadow-[0_24px_64px_rgba(0,0,0,0.55)] outline-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#909888]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#909888]">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="truncate">{currentStep.badge}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-white/50">
              {safeStepIndex + 1} of {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleFinish("skipped")}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C0A090]"
            title="Skip tour (Esc)"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 sm:px-6">
          {isNavigating && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-[#C0A090]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Opening this page...</span>
            </div>
          )}

          {targetMissing && !isNavigating && (
            <p className="mb-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/60">
              This section is not on this screen. You can continue.
            </p>
          )}

          <div className="mt-1" aria-live="polite">
            <h2 id="tour-step-title" className="text-lg font-bold tracking-tight text-white">
              {currentStep.title}
            </h2>
            <p id="tour-step-content" className="mt-2 text-sm leading-relaxed text-white/85">
              {currentStep.content}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-1.5 pb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === safeStepIndex
                    ? "w-6 bg-[#C0A090]"
                    : i < safeStepIndex
                    ? "w-1.5 bg-[#909888]"
                    : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 px-5 pt-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleFinish("skipped")}
              aria-label="Skip walkthrough"
              title="Skip tour (Esc)"
              style={{
                backgroundColor: "transparent",
                color: "rgba(255, 255, 255, 0.7)",
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
              className="inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-xs font-semibold transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C0A090]"
            >
              Skip
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={safeStepIndex === 0}
                aria-label="Previous step"
                title="Back"
                style={{
                  backgroundColor:
                    safeStepIndex === 0
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(255, 255, 255, 0.12)",
                  color: safeStepIndex === 0 ? "rgba(255, 255, 255, 0.35)" : "#FFFFFF",
                  borderColor:
                    safeStepIndex === 0
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(255, 255, 255, 0.25)",
                }}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full border px-3 text-xs font-semibold transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C0A090] disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-white/35"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Back</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label={
                  isFinalTourStep(safeStepIndex, steps.length) ? "Finish tour" : "Next step"
                }
                title={isFinalTourStep(safeStepIndex, steps.length) ? "Finish" : "Next"}
                style={{
                  backgroundColor: "#C0A090",
                  color: "#1D1D1B",
                  borderColor: "#D4B5A6",
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-xs font-bold uppercase tracking-wider shadow-md transition hover:bg-[#b09080] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
              >
                {isFinalTourStep(safeStepIndex, steps.length) ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Done
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

