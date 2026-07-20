import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  AvailabilityChips,
  BreadcrumbTrail,
  CTAButton,
  PackageCard,
  PortfolioGrid,
  ReviewCard,
  ScrollSection,
  SecureContactCard,
  ServiceCard,
  SectionReveal,
  VerifiedBadge,
  WhatsAppButton,
} from "@/components/marketplace-ui";
import { getProfessional, getServicesByIds, testimonials } from "@/lib/site-data";
import { buildBookingHref } from "@/lib/utils";

// Preview always shows the first professional (Njeri Kamau) as placeholder data.
// In production this would load the signed-in pro's own profile.
const PREVIEW_SLUG = "njeri-kamau";

export default function ProfessionalPreviewPage() {
  const professional = getProfessional(PREVIEW_SLUG)!;
  const services = getServicesByIds(professional.serviceIds);
  const bookingHref = buildBookingHref({
    targetType: "professionals",
    targetId: professional.slug,
  });

  return (
    <AppShell currentNav="professionals" roleMode="professionals">
      {/* ── Preview banner ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm font-medium text-amber-800">
          <Eye className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Preview mode</strong> — this is exactly what clients see on your public profile.
          </span>
        </div>
        <Link
          href="/dashboard/professional"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
      </div>

      {/* ── Full public profile ───────────────────────────────────────────── */}
      <div className="section-grid">
        <BreadcrumbTrail
          items={[
            { label: "Home", href: "/home" },
            { label: "Professionals", href: "/professionals" },
            { label: professional.name },
          ]}
        />

        {/* Hero */}
        <SectionReveal
          className={`relative overflow-hidden rounded-[40px] bg-gradient-to-br ${professional.heroMood} p-6 text-white shadow-[0_22px_60px_rgba(13,27,42,0.24)] lg:p-8`}
        >
          {professional.image ? (
            <Image
              alt={professional.image.alt}
              className="object-cover"
              fill
              priority
              sizes="100vw"
              src={professional.image.url}
              style={{ objectPosition: professional.image.position ?? "center" }}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,27,42,0.94)_0%,rgba(13,27,42,0.78)_48%,rgba(13,27,42,0.42)_100%)]" />

          <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,0.66fr)_minmax(320px,0.34fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {professional.verified ? <VerifiedBadge /> : null}
                <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold">
                  {professional.location}
                </span>
                <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold">
                  {professional.rating} rating · {professional.reviewCount} reviews
                </span>
              </div>
              <h1 className="mt-5 font-display text-5xl leading-tight">{professional.name}</h1>
              <p className="mt-3 text-base text-white/82">{professional.specialty}</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/74">
                {professional.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <CTAButton
                  className="bg-white text-[var(--ms-navy)] hover:bg-[var(--ms-ivory)]"
                  href={bookingHref}
                >
                  Request booking
                </CTAButton>
                <WhatsAppButton
                  className="border-white/20 bg-white/10 text-white hover:text-white"
                  label={professional.name}
                />
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/62">
                Coverage and availability
              </p>
              <AvailabilityChips items={professional.areasServed} />
              <div className="mt-5 rounded-[24px] bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Next available</p>
                <p className="mt-2 text-lg font-semibold">{professional.nextAvailable}</p>
              </div>
              <div className="mt-4 rounded-[24px] bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Service mode</p>
                <p className="mt-2 text-lg font-semibold">{professional.serviceMode}</p>
                <p className="mt-2 text-sm text-white/74">
                  {professional.salonAffiliation === "Independent"
                    ? "Independent professional with mobile support."
                    : `Also works from ${professional.salonAffiliation}.`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {professional.identityAttributes.map((attr) => (
                    <span
                      key={attr}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/76"
                    >
                      {attr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionReveal>

        {/* Body */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.66fr)_minmax(320px,0.34fr)]">
          <div className="section-grid">
            {/* About */}
            <section className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">About</p>
              <p className="mt-4 text-base leading-8 text-[var(--ms-charcoal)]">{professional.bio}</p>
            </section>

            {/* Services */}
            <ScrollSection
              className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]"
              eyebrow="Services"
              href={bookingHref}
              hrefLabel="Book services"
              title="Prices and inclusions stay visible"
            >
              {services.map((service) => (
                <ServiceCard compact key={service.id} service={service} />
              ))}
            </ScrollSection>

            {/* Packages */}
            {professional.packageOffers.length > 0 && (
              <ScrollSection
                className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]"
                eyebrow="Packages"
                href={bookingHref}
                hrefLabel="Book package"
                title="Bundles that make sense in real life"
              >
                {professional.packageOffers.map((offer) => (
                  <PackageCard key={offer.id} offer={offer} />
                ))}
              </ScrollSection>
            )}

            {/* Portfolio */}
            <section className="section-grid dark-atmosphere rounded-[32px] p-6 text-white shadow-[0_18px_48px_rgba(13,27,42,0.22)]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">Work done</p>
                <h2 className="mt-3 text-3xl font-semibold">Portfolio built for trust</h2>
              </div>
              <PortfolioGrid dark items={professional.gallery} />
            </section>

            {/* Reviews */}
            <ScrollSection
              className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]"
              eyebrow="Reviews"
              href="/help"
              hrefLabel="Read policy"
              title="Structured feedback with specifics"
            >
              {testimonials.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ScrollSection>

            {/* FAQ */}
            <section className="section-grid rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">FAQ</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-navy)]">
                  What clients ask before they commit
                </h2>
              </div>
              <div className="space-y-3">
                {professional.faq.map((item) => (
                  <details
                    key={item.question}
                    className="rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-5"
                  >
                    <summary className="cursor-pointer text-lg font-semibold text-[var(--ms-navy)]">
                      {item.question}
                    </summary>
                    <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <div className="section-grid">
            <SecureContactCard bookingHref={bookingHref} name={professional.name} />
            <aside className="sticky top-44 rounded-[32px] bg-white p-5 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Ready to book</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-navy)]">
                Pay to secure the request.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
                Confirm the target, choose services, sign in, and complete payment before the
                provider receives the request.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <CTAButton href={bookingHref}>Request this professional</CTAButton>
                <WhatsAppButton label={professional.name} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
