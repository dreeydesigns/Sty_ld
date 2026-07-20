"use client";

import { startTransition, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

import {
  bookingDates,
  bookingTimes,
  getProfessional,
  getSalon,
  getServicesByIds,
  services,
  testimonials,
} from "@/lib/site-data";
import { useBookingStore } from "@/lib/booking-store";
import {
  BookingStepper,
  BreadcrumbTrail,
  CTAButton,
  DateChip,
  NotificationToggle,
  PriceSummary,
  ReviewCard,
  SectionReveal,
  ScrollSection,
  TimePill,
  WhatsAppButton,
} from "@/components/marketplace-ui";
import { PaymentDisclaimer, usePaymentDisclaimer } from "@/components/payment-disclaimer";
import { cn, formatDurationRange, formatPriceRange } from "@/lib/utils";
import { readAppSession, readRegisteredProviders, type BookableProviderProfile } from "@/lib/client-session";
import { writeBooking } from "@/lib/social-store";
import { showToast } from "@/lib/toast";
import { ConfettiBurst, TrustShield, BookingTimeline } from "@/components/wow-ux";
import { openGuestGate } from "@/lib/guest-session";

type ProviderSort = "nearest" | "rating" | "response" | "available" | "booked" | "verified";

const PROVIDER_SORTS: { key: ProviderSort; label: string }[] = [
  { key: "nearest", label: "Nearest first" },
  { key: "rating", label: "Top rated" },
  { key: "response", label: "Fastest response" },
  { key: "available", label: "Soonest available" },
  { key: "booked", label: "Most booked" },
  { key: "verified", label: "Verified only" },
];

// ─── Geo-location utilities ────────────────────────────────────────────────────
// Approximate lat/lng centres for Nairobi neighbourhoods used for distance scoring
const NAIROBI_AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  "westlands":      { lat: -1.2686, lng: 36.8070 },
  "karen":          { lat: -1.3173, lng: 36.7222 },
  "kilimani":       { lat: -1.2915, lng: 36.7840 },
  "lavington":      { lat: -1.2868, lng: 36.7720 },
  "parklands":      { lat: -1.2620, lng: 36.8130 },
  "cbd":            { lat: -1.2833, lng: 36.8167 },
  "kileleshwa":     { lat: -1.2829, lng: 36.7815 },
  "upperhill":      { lat: -1.2971, lng: 36.8105 },
  "spring valley":  { lat: -1.2540, lng: 36.7940 },
  "runda":          { lat: -1.2136, lng: 36.7993 },
  "gigiri":         { lat: -1.2191, lng: 36.8031 },
  "muthaiga":       { lat: -1.2417, lng: 36.8357 },
  "langata":        { lat: -1.3419, lng: 36.7545 },
  "south b":        { lat: -1.3012, lng: 36.8245 },
  "south c":        { lat: -1.3145, lng: 36.8264 },
  "eastleigh":      { lat: -1.2712, lng: 36.8494 },
  "kasarani":       { lat: -1.2257, lng: 36.8967 },
  "ruaka":          { lat: -1.1915, lng: 36.7980 },
  "nairobi":        { lat: -1.2833, lng: 36.8167 },
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getAreaCoords(locationText?: string): { lat: number; lng: number } | null {
  if (!locationText) return null;
  const lower = locationText.toLowerCase();
  for (const [area, coords] of Object.entries(NAIROBI_AREA_COORDS)) {
    if (lower.includes(area)) return coords;
  }
  return null;
}

function providerKmLabel(
  provider: BookableProviderProfile,
  clientCoords: { lat: number; lng: number } | null,
): string | null {
  if (!clientCoords) return null;
  const providerCoords = getAreaCoords(provider.location);
  if (!providerCoords) return null;
  const km = haversineKm(clientCoords.lat, clientCoords.lng, providerCoords.lat, providerCoords.lng);
  if (km < 1) return "< 1 km";
  return `~${km.toFixed(1)} km`;
}

function normalizeArea(value?: string) {
  return (value ?? "").toLowerCase().trim();
}

function providerDistanceScore(provider: BookableProviderProfile, clientArea?: string) {
  const area = normalizeArea(clientArea);
  if (!area) {
    return provider.location ? 1 : 2;
  }

  const providerAreas = [provider.location, ...provider.areasServed].map(normalizeArea);
  if (providerAreas.includes(area)) {
    return 0;
  }

  if (providerAreas.some((item) => item && (item.includes(area) || area.includes(item)))) {
    return 1;
  }

  return 2;
}

function sortProviders(providers: BookableProviderProfile[], sort: ProviderSort, clientArea?: string) {
  const ranked = [...providers];

  if (sort === "verified") {
    return ranked.filter((provider) => provider.verified);
  }

  return ranked.sort((a, b) => {
    if (sort === "rating") {
      return b.rating - a.rating || providerDistanceScore(a, clientArea) - providerDistanceScore(b, clientArea);
    }

    if (sort === "response") {
      return (a.responseSpeedMinutes || 999) - (b.responseSpeedMinutes || 999);
    }

    if (sort === "booked") {
      return b.reviewCount - a.reviewCount;
    }

    if (sort === "available") {
      return a.nextAvailable.localeCompare(b.nextAvailable);
    }

    return providerDistanceScore(a, clientArea) - providerDistanceScore(b, clientArea);
  });
}

function toBookableProvider(
  entity: ReturnType<typeof getSalon> | ReturnType<typeof getProfessional> | null,
  targetType: "salons" | "professionals",
): BookableProviderProfile | null {
  if (!entity) {
    return null;
  }

  return {
    slug: entity.slug,
    name: entity.name,
    role: targetType === "salons" ? "salon" : "professional",
    targetType,
    location: entity.location,
    areasServed: entity.areasServed,
    rating: entity.rating,
    reviewCount: entity.reviewCount,
    responseSpeedMinutes: entity.responseSpeedMinutes,
    nextAvailable: entity.nextAvailable,
    verified: entity.verified,
    serviceIds: entity.serviceIds,
    image: entity.image ? { url: entity.image.url, alt: entity.image.alt } : undefined,
    description: "specialty" in entity ? entity.bio : entity.about,
  };
}

export function BookingExperience() {
  const searchParams = useSearchParams();
  const isRushBooking = searchParams.get("rush") === "true";
  const {
    step,
    targetType,
    targetId,
    selectedServiceIds,
    selectedDate,
    selectedTime,
    contact,
    notifications,
    status,
    nextStep,
    previousStep,
    reset,
    restoreBookingDraft,
    saveBookingDraft,
    setContact,
    setDate,
    setSelectedServices,
    setStatus,
    setStep,
    setTarget,
    setTime,
    toggleNotification,
    toggleService,
  } = useBookingStore();
  const [providerSort, setProviderSort] = useState<ProviderSort>("nearest");
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  // Auto-request location when the provider selection step becomes visible
  useEffect(() => {
    if (step !== 1 || geoStatus !== "idle") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000, maximumAge: 60000 },
    );
  }, [step, geoStatus]);

  useEffect(() => {
    if (searchParams.get("resume") !== "booking") {
      return;
    }

    const restored = restoreBookingDraft();

    if (restored) {
      startTransition(() => {
        setStep(3);
      });
    }
  }, [restoreBookingDraft, searchParams, setStep]);

  useEffect(() => {
    const queryTargetType = searchParams.get("targetType");
    const queryTargetId = searchParams.get("targetId");
    const queryServiceIds = searchParams.get("serviceIds");

    if (queryTargetType === "salons" || queryTargetType === "professionals") {
      startTransition(() => {
        setTarget(queryTargetType, queryTargetId);
      });
    }

    if (queryServiceIds) {
      const ids = queryServiceIds.split(",").filter(Boolean);

      startTransition(() => {
        setSelectedServices(ids);
        if (ids.length) {
          setStep(2);
        }
      });
    }
  }, [searchParams, setSelectedServices, setStep, setTarget]);

  useEffect(() => {
    if (status !== "processing") {
      return;
    }

    const timer = window.setTimeout(() => {
      setStatus("done");
      showToast("Booking confirmed! Check Activity for updates.", "success");
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [setStatus, status]);

  const registeredProviders = readRegisteredProviders(targetType);
  const staticEntity =
    targetType === "salons" ? (targetId ? getSalon(targetId) : null) : targetId ? getProfessional(targetId) : null;
  const targetEntity =
    registeredProviders.find((provider) => provider.slug === targetId) ??
    toBookableProvider(staticEntity, targetType);
  const currentSession = readAppSession();
  const clientArea =
    currentSession?.role === "client" && currentSession.location?.label
      ? currentSession.location.label
      : undefined;
  // When real GPS coords are available + sort is "nearest", use Haversine distance for ordering
  const rankedProviders =
    providerSort === "nearest" && geoCoords
      ? [...sortProviders(registeredProviders, providerSort, clientArea)].sort((a, b) => {
          const aCoords = getAreaCoords(a.location);
          const bCoords = getAreaCoords(b.location);
          if (!aCoords && !bCoords) return 0;
          if (!aCoords) return 1;
          if (!bCoords) return -1;
          const aDist = haversineKm(geoCoords.lat, geoCoords.lng, aCoords.lat, aCoords.lng);
          const bDist = haversineKm(geoCoords.lat, geoCoords.lng, bCoords.lat, bCoords.lng);
          return aDist - bDist;
        })
      : sortProviders(registeredProviders, providerSort, clientArea);
  const targetServices = targetEntity
    ? getServicesByIds(targetEntity.serviceIds).length > 0
      ? getServicesByIds(targetEntity.serviceIds)
      : services.filter((service) => service.popular).slice(0, 6)
    : services.filter((service) => service.popular).concat(services.filter((service) => !service.popular).slice(0, 6));
  const selectedServices = getServicesByIds(selectedServiceIds);
  const totalMin = selectedServices.reduce((sum, service) => sum + service.minPrice, 0);
  const totalMax = selectedServices.reduce((sum, service) => sum + service.maxPrice, 0);
  const durationMin = selectedServices.reduce((sum, service) => sum + service.durationMin, 0);
  const durationMax = selectedServices.reduce((sum, service) => sum + service.durationMax, 0);

  const { accepted: disclaimerAccepted, setAccepted: setDisclaimerAccepted } = usePaymentDisclaimer();

  const canContinue =
    (step === 1 && Boolean(targetType && targetId)) ||
    (step === 2 && selectedServiceIds.length > 0) ||
    (step === 3 && Boolean(selectedDate && selectedTime)) ||
    step === 4 ||
    step === 5;

  async function handleConfirm() {
    if (!disclaimerAccepted) return;

    const session = readAppSession();
    if (!session || session.role === "guest") {
      saveBookingDraft();
      openGuestGate("booking", "/book?resume=booking");
      return;
    }

    if (session.role !== "client" && session.role !== "super_admin") {
      return;
    }

    setStatus("processing");

    if (session && targetType && targetId && selectedServiceIds.length > 0 && selectedDate && selectedTime) {
      const targetName = targetEntity?.name ?? targetId;
      const localId = globalThis.crypto?.randomUUID?.() ?? `bk_${new Date().getTime()}`;

      // 1. Write to localStorage immediately (instant UI update)
      writeBooking({
        id: localId,
        clientId: session.id,
        clientName: session.role === "client" ? session.firstName : "Mobile Salon Admin",
        clientPhone: session.phone,
        clientAvatar: session.role === "client" ? session.profilePhoto : undefined,
        targetType,
        targetSlug: targetId,
        targetName,
        services: selectedServices.map((s) => s.name),
        preferredDate: selectedDate,
        preferredTime: selectedTime,
        totalKES: totalMin,
        notes: contact.note,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Persist to DB (fire-and-forget — localStorage is already written)
      fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localId,
          serviceNames: selectedServices.map((s) => s.name),
          providerSlug: targetId,
          providerName: targetName,
          targetType,
          bookingDate: selectedDate,
          bookingTime: selectedTime,
          totalKES: totalMin,
          notes: contact.note || undefined,
        }),
      }).catch(() => null); // silent — localStorage is source of truth for MVP
    }
  }

  function handleNextStep() {
    nextStep();
  }

  if (status === "done") {
    return (
      <>
        <ConfettiBurst active={true} />
      <SectionReveal className="mx-auto max-w-4xl rounded-[36px] bg-white p-6 shadow-[0_22px_60px_rgba(13,27,42,0.1)] lg:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(200,40,74,0.12),rgba(201,168,76,0.18))]">
            <CheckCircle2 className="h-10 w-10 text-[var(--ms-rose)]" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.24em] text-[var(--ms-mauve)]">Confirmed ✨</p>
          <h1 className="mt-3 text-4xl font-semibold text-[var(--ms-navy)]">Your booking is confirmed!</h1>
          <div className="mt-4 flex justify-center">
            <TrustShield variant="payment" />
          </div>
          <div className="mt-5 flex justify-center">
            <BookingTimeline status="accepted" />
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
            {targetEntity ? `${"name" in targetEntity ? targetEntity.name : "Selected provider"} has your request.` : "Your request has been sent."} The payment is marked as held until service completion is confirmed.
          </p>
          <div className="mt-8 grid gap-4 rounded-[28px] bg-[var(--ms-soft-bg)] p-5 text-left sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Services</p>
              <p className="mt-2 text-sm text-[var(--ms-charcoal)]">
                {selectedServices.map((service) => service.name).join(", ")}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">When</p>
              <p className="mt-2 text-sm text-[var(--ms-charcoal)]">
                {selectedDate} · {selectedTime}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Estimated total</p>
              <p className="mt-2 text-sm text-[var(--ms-charcoal)]">{formatPriceRange(totalMin, totalMax)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Payment status</p>
              <p className="mt-2 text-sm text-[var(--ms-charcoal)]">Funded · pending service completion</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Notifications</p>
              <p className="mt-2 text-sm text-[var(--ms-charcoal)]">
                {[
                  notifications.email ? "Email" : null,
                  notifications.whatsapp ? "WhatsApp" : null,
                  notifications.text ? "Text" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <CTAButton href="/activity" variant="dark">
              View activity
            </CTAButton>
            <CTAButton
              onClick={() => {
                reset();
              }}
              variant="outline"
            >
              Start another booking
            </CTAButton>
          </div>
        </div>
      </SectionReveal>
      </>
    );
  }

  return (
    <>
    <div
      className="grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,0.66fr)_minmax(320px,0.34fr)]"
      style={{ maxWidth: "min(100%, calc(100vw - 2rem))" }}
    >
      <SectionReveal
        className="w-full overflow-hidden rounded-[36px] bg-white p-5 shadow-[0_22px_60px_rgba(13,27,42,0.1)] sm:p-6 lg:p-8"
        style={{ maxWidth: "min(100%, calc(100vw - 2rem))" }}
      >
        <BreadcrumbTrail
          items={[
            { label: "Home", href: "/home" },
            { label: targetType === "salons" ? "Salons" : "Professionals", href: targetType === "salons" ? "/salons" : "/professionals" },
            ...(targetEntity ? [{ label: targetEntity.name, href: `/${targetType}/${targetEntity.slug}` }] : []),
            { label: "Booking" },
          ]}
        />
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ms-mauve)]">Booking</p>
          <h1 className="mt-3 text-4xl font-semibold text-[var(--ms-navy)]">Choose your beauty moment.</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ms-mauve)]">
          Your booking is secured once you pay. The professional only sees it after payment.
        </p>
        {isRushBooking ? (
          <div className="mt-5 rounded-[28px] border border-[var(--ms-rose)]/25 bg-[var(--ms-petal)]/80 p-4">
            <p className="text-sm font-semibold text-[var(--ms-plum)]">Rush mode is on. Pick the closest good option and keep moving.</p>
          </div>
        ) : null}
        <div className="mt-6">
          <BookingStepper step={step} />
        </div>

        <div className="mt-8 space-y-6">
          {step === 1 ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  className={cn(
                    "rounded-[28px] border px-5 py-6 text-left transition",
                    targetType === "salons"
                      ? "border-[var(--ms-navy)] bg-[var(--ms-navy)] text-white"
                      : "border-[var(--ms-border)] bg-[var(--ms-soft-bg)] text-[var(--ms-navy)]",
                  )}
                  onClick={() => setTarget("salons", null)}
                  type="button"
                >
                  <p className="text-xs uppercase tracking-[0.22em] opacity-70">Book a</p>
                  <h2 className="mt-3 text-2xl font-semibold">Salon</h2>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    Best for a salon setting, team support, and a wider menu.
                  </p>
                </button>
                <button
                  className={cn(
                    "rounded-[28px] border px-5 py-6 text-left transition",
                    targetType === "professionals"
                      ? "border-[var(--ms-magenta)] bg-[var(--ms-magenta)] text-white"
                      : "border-[var(--ms-border)] bg-[var(--ms-soft-bg)] text-[var(--ms-navy)]",
                  )}
                  onClick={() => setTarget("professionals", null)}
                  type="button"
                >
                  <p className="text-xs uppercase tracking-[0.22em] opacity-70">Book a</p>
                  <h2 className="mt-3 text-2xl font-semibold">Professional</h2>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    Best for specialist-led mobile or independent service.
                  </p>
                </button>
              </div>

              <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Choose provider</p>
                    <h2 className="mt-1 text-xl font-semibold text-[var(--ms-navy)]">
                      {targetType === "salons" ? "Salons near you" : "Professionals near you"}
                    </h2>
                    {geoStatus === "requesting" && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-[var(--ms-mauve)]">
                        <LoaderCircle className="h-3 w-3 animate-spin" /> Finding your location…
                      </p>
                    )}
                    {geoStatus === "granted" && (
                      <p className="mt-1 text-xs font-semibold text-emerald-600">
                        📍 Sorted by distance from you
                      </p>
                    )}
                    {geoStatus === "denied" && clientArea && (
                      <p className="mt-1 text-xs text-[var(--ms-mauve)]">
                        📍 Based on your saved area: {clientArea}
                      </p>
                    )}
                  </div>
                  <select
                    className="rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2 text-sm font-semibold text-[var(--ms-navy)] outline-none"
                    onChange={(event) => setProviderSort(event.target.value as ProviderSort)}
                    value={providerSort}
                  >
                    {PROVIDER_SORTS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {rankedProviders.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-6 text-center">
                    <p className="text-sm font-semibold text-[var(--ms-navy)]">
                      No {targetType === "salons" ? "salons" : "professionals"} have created an account yet.
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[var(--ms-mauve)]">
                      Once the first real provider signs up, they will appear here and receive booking requests directly.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {rankedProviders.map((provider, idx) => {
                      const active = targetId === provider.slug;
                      const kmLabel = providerKmLabel(provider, geoCoords);
                      const isNearest = idx === 0 && (geoStatus === "granted" || providerSort === "nearest");
                      return (
                        <button
                          className={cn(
                            "flex items-start gap-4 rounded-[24px] border p-4 text-left transition",
                            active
                              ? "border-[var(--ms-rose)] bg-[var(--ms-petal)]"
                              : "border-[var(--ms-border)] bg-white hover:border-[var(--ms-rose)]/40",
                          )}
                          key={provider.slug}
                          onClick={() => setTarget(provider.targetType, provider.slug)}
                          type="button"
                        >
                          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ms-soft-bg)] text-base font-bold text-[var(--ms-plum)]">
                            {provider.image?.url ? (
                              <img src={provider.image.url} alt={provider.image.alt} className="h-full w-full object-cover" />
                            ) : (
                              provider.name.slice(0, 1).toUpperCase()
                            )}
                            {isNearest && (
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ms-rose)] text-[8px] font-black text-white shadow">
                                #1
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">{provider.name}</p>
                              <span className="rounded-full bg-[var(--ms-soft-bg)] px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--ms-mauve)]">
                                {provider.role}
                              </span>
                              {provider.verified ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Verified</span>
                              ) : null}
                              {isNearest && (
                                <span className="rounded-full bg-[var(--ms-petal)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ms-rose)]">
                                  Nearest
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ms-mauve)]">{provider.description}</p>
                            <p className="mt-2 text-xs font-semibold text-[var(--ms-charcoal)]">
                              {provider.location || "Location setup pending"}
                              {kmLabel && (
                                <span className="ml-1.5 font-bold text-[var(--ms-rose)]">· {kmLabel}</span>
                              )}
                              {" · "}{provider.rating ? `${provider.rating.toFixed(1)} ★` : "New"}
                              {" · "}{provider.responseSpeedMinutes ? `${provider.responseSpeedMinutes} min response` : "Response time pending"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="rounded-[28px] bg-[var(--ms-soft-bg)] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Select service</p>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--ms-navy)]">
                  {targetEntity ? `Services available with ${targetEntity.name}` : "Choose what you want done"}
                </h2>
              </div>
              <div className="grid min-w-0 gap-3">
                {targetServices.map((service) => {
                  const active = selectedServiceIds.includes(service.id);

                  return (
                    <button
                      className={cn(
                        "w-full min-w-0 rounded-[24px] border p-4 text-left transition hover:border-[var(--ms-rose)]/35 hover:shadow-[0_14px_34px_rgba(132,36,92,0.09)] active:scale-[0.99]",
                        active
                          ? "border-[var(--ms-magenta)] bg-[var(--ms-magenta)] text-white"
                          : "border-[var(--ms-border)] bg-white text-[var(--ms-charcoal)]",
                      )}
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      type="button"
                    >
                      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-lg font-semibold">{service.name}</p>
                          <p className={cn("mt-2 break-words text-sm leading-6", active ? "text-white/82" : "text-[var(--ms-mauve)]")}>
                            {service.description}
                          </p>
                        </div>
                        <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-semibold", active ? "bg-white/18" : "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]")}>
                          {formatPriceRange(service.minPrice, service.maxPrice)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Choose date</p>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {bookingDates.map((option) => (
                    <DateChip
                      date={option.date}
                      key={option.date}
                      label={option.label}
                      onClick={() => setDate(option.date)}
                      selected={selectedDate === option.date}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Choose time</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {bookingTimes.map((time) => (
                    <TimePill key={time} onClick={() => setTime(time)} selected={selectedTime === time} value={time} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              {/* Pre-filled from session — read-only display */}
              <div className="rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Your details</p>
                <p className="mt-1 text-[10px] text-[var(--ms-mauve)]">Pulled from your account. <button type="button" className="underline hover:no-underline">Edit profile</button></p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Name", value: contact.fullName || "Your name" },
                    { label: "Phone", value: contact.phone || "+254 7XX XXX XXX" },
                    { label: "Email", value: contact.email || "your@email.com" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-[16px] border border-[var(--ms-border)] bg-white px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ms-mauve)]">{label}</p>
                      <p className="mt-1 text-sm font-medium text-[var(--ms-navy)]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Booking mode</p>
                <p className="mt-2 text-sm text-[var(--ms-charcoal)]">
                  {targetType === "salons" ? "Salon booking request" : "Professional booking request"}
                </p>
              </div>
              <label className="block rounded-[24px] border border-[var(--ms-border)] bg-white p-4">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Notes</span>
                <textarea
                  className="mt-3 min-h-28 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
                  onChange={(event) => setContact("note", event.target.value)}
                  placeholder="Add hair length, reference look, preferred setup, or any details that matter."
                  value={contact.note}
                />
              </label>
              <div className="grid gap-3">
                <NotificationToggle
                  checked={notifications.email}
                  hint="Receive booking confirmation and reminder updates."
                  label="Email updates"
                  onToggle={() => toggleNotification("email")}
                />
                <NotificationToggle
                  checked={notifications.whatsapp}
                  hint="Best for quick schedule updates and urgent coordination."
                  label="WhatsApp updates"
                  onToggle={() => toggleNotification("whatsapp")}
                />
                <NotificationToggle
                  checked={notifications.text}
                  hint="Use SMS only when you want a simple appointment alert."
                  label="Text reminder"
                  onToggle={() => toggleNotification("text")}
                />
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              <div className="rounded-[28px] bg-[var(--ms-soft-bg)] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Review</p>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--ms-navy)]">Everything visible before you pay.</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">
                  The next production step opens protected checkout before the provider receives the job.
                </p>
              </div>
              {/* Payment disclaimer — ABOVE the CTA per spec. Checkbox required to enable payment. */}
              <PaymentDisclaimer variant="booking" onAccepted={setDisclaimerAccepted} />
              <div className="grid gap-4 rounded-[28px] border border-[var(--ms-border)] bg-white p-5 md:grid-cols-2">
                <SummaryItem editStep={1} label="Target" onEdit={setStep} value={targetEntity?.name ?? (targetType === "salons" ? "Salon" : "Professional")} />
                <SummaryItem editStep={2} label="Services" onEdit={setStep} value={selectedServices.map((service) => service.name).join(", ")} />
                <SummaryItem editStep={3} label="Date" onEdit={setStep} value={selectedDate} />
                <SummaryItem editStep={3} label="Time" onEdit={setStep} value={selectedTime} />
                <SummaryItem editStep={4} label="Contact" onEdit={setStep} value={`${contact.fullName} · ${contact.phone}`} />
                <SummaryItem label="Payment rule" value="Pay now · funds held until completion" />
                <SummaryItem label="Notifications" value={[
                  notifications.email ? "Email" : null,
                  notifications.whatsapp ? "WhatsApp" : null,
                  notifications.text ? "Text" : null,
                ].filter(Boolean).join(", ")} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-20 mt-8 flex items-center gap-3 rounded-[28px] border border-[var(--ms-border)] bg-white/95 p-4 shadow-[0_18px_50px_rgba(13,27,42,0.08)] backdrop-blur md:bottom-6">
          <CTAButton
            className="min-w-[120px]"
            disabled={step === 1}
            onClick={previousStep}
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </CTAButton>
          {step < 5 ? (
            <CTAButton
              className="ml-auto min-w-[160px]"
              disabled={!canContinue}
              onClick={handleNextStep}
            >
              Next step
              <ChevronRight className="h-4 w-4" />
            </CTAButton>
          ) : (
            <CTAButton
              className="ml-auto min-w-[180px]"
              disabled={!disclaimerAccepted}
              onClick={handleConfirm}
            >
              Pay and confirm
            </CTAButton>
          )}
        </div>
      </SectionReveal>

      <div className="space-y-5">
        <PriceSummary
          durationLabel={
            selectedServices.length
              ? `Estimated duration ${formatDurationRange(durationMin, durationMax)}`
              : "Choose a service to see your total."
          }
          priceTotal={selectedServices.length ? formatPriceRange(totalMin, totalMax) : "Select services"}
          serviceCount={selectedServices.length}
        />
        <SectionReveal className="rounded-[32px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_40px_rgba(13,27,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Selected target</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--ms-navy)]">
            {targetEntity?.name ?? (targetType === "salons" ? "Salon request" : "Professional request")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ms-mauve)]">
            {targetEntity?.description ?? "Browse. Compare. Then book."}
          </p>
          <div className="mt-4 space-y-2 text-sm text-[var(--ms-charcoal)]">
            <p>Target type: {targetType === "salons" ? "Salon booking" : "Professional booking"}</p>
            <p>Best next action: choose the exact services you want completed, then sign in and pay to secure the request.</p>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <CTAButton href={targetType === "salons" ? "/salons" : "/professionals"} variant="outline">
              Find more
            </CTAButton>
            <WhatsAppButton label="booking support" />
          </div>
        </SectionReveal>
      </div>

      {status === "processing" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,27,42,0.72)] px-4">
          <div className="w-full max-w-md rounded-[36px] bg-[linear-gradient(160deg,#0d1b2a_0%,#1f2942_55%,rgba(217,70,239,0.4)_100%)] p-8 text-center text-white shadow-[0_24px_70px_rgba(13,27,42,0.35)]">
            <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-[var(--ms-gold)]" />
            <p className="mt-6 text-xs uppercase tracking-[0.24em] text-white/60">Booking</p>
            <h2 className="mt-3 text-3xl font-semibold">Securing your paid request...</h2>
            <p className="mt-3 text-sm leading-7 text-white/72">
              The professional side sees the service list, time slot, notes, and funded status clearly before accepting.
            </p>
          </div>
        </div>
      ) : null}

    </div>

    {/* Review Snapshots — reassures client mid-booking */}
    <ScrollSection
      eyebrow="Review snapshots"
      href="/guide"
      hrefLabel="Read policy"
      title="What women are saying"
    >
      {testimonials.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </ScrollSection>
    </>
  );
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-[24px] border border-[var(--ms-border)] bg-white px-4 py-4">
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{label}</span>
      <input
        className="mt-3 w-full bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        value={value}
      />
    </label>
  );
}

function SummaryItem({
  label,
  value,
  editStep,
  onEdit,
}: {
  label: string;
  value: string;
  editStep?: number;
  onEdit?: (step: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{label}</p>
        {editStep && onEdit ? (
          <button
            className="rounded-full bg-[var(--ms-soft-bg)] px-3 py-1 text-xs font-semibold text-[var(--ms-plum)] transition hover:bg-[var(--ms-petal)]"
            onClick={() => onEdit(editStep)}
            type="button"
          >
            Edit
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--ms-charcoal)]">{value}</p>
    </div>
  );
}
