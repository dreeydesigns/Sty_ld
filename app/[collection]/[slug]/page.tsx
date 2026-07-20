import { notFound } from "next/navigation";
import Image from "next/image";

import { AppShell } from "@/components/app-shell";
import {
  AvailabilityChips,
  BreadcrumbTrail,
  CTAButton,
  PackageCard,
  PortfolioGrid,
  ProfessionalCard,
  ReviewCard,
  SectionReveal,
  ScrollSection,
  ServiceCard,
  SecureContactCard,
  VerifiedBadge,
  WhatsAppButton,
} from "@/components/marketplace-ui";
import {
  getProfessional,
  getProfessionalsForSalon,
  getSalon,
  getServicesByIds,
  testimonials,
} from "@/lib/site-data";
import { buildBookingHref } from "@/lib/utils";
import { FollowButton } from "@/components/follow-button";
import { MessageButton } from "@/components/message-button";
import { SalonLiveTeamSection } from "@/components/salon-live-team";

export default async function DetailPage({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  const { collection, slug } = await params;

  if (collection !== "salons" && collection !== "professionals") {
    notFound();
  }

  const item = collection === "salons" ? getSalon(slug) : getProfessional(slug);

  if (!item) {
    notFound();
  }

  const services = getServicesByIds(item.serviceIds);
  const relatedProfessionals =
    collection === "salons" ? getProfessionalsForSalon(item.slug) : [];
  const bookingHref = buildBookingHref({ targetType: collection, targetId: item.slug });

  return (
    <AppShell currentNav={collection} roleMode={collection} requireSession>
      <div className="section-grid">
        <BreadcrumbTrail
          items={[
            { label: "Home", href: "/home" },
            { label: collection === "salons" ? "Salons" : "Professionals", href: `/${collection}` },
            { label: item.name },
          ]}
        />
        <SectionReveal className={`relative overflow-hidden rounded-[40px] bg-gradient-to-br ${item.heroMood} p-6 text-white shadow-[0_22px_60px_rgba(13,27,42,0.24)] lg:p-8`}>
          {item.image ? (
            <Image
              alt={item.image.alt}
              className="object-cover"
              fill
              priority
              sizes="100vw"
              src={item.image.url}
              style={{ objectPosition: item.image.position ?? "center" }}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,27,42,0.94)_0%,rgba(13,27,42,0.78)_48%,rgba(13,27,42,0.42)_100%)]" />
          <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,0.66fr)_minmax(320px,0.34fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {item.verified ? <VerifiedBadge /> : null}
                <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold">{item.location}</span>
                <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold">
                  {item.rating} rating · {item.reviewCount} reviews
                </span>
              </div>
              <h1 className="mt-5 font-display text-5xl leading-tight">{item.name}</h1>
              {"specialty" in item ? (
                <p className="mt-3 text-base text-white/82">{item.specialty}</p>
              ) : (
                <p className="mt-3 text-base text-white/82">{item.tagline}</p>
              )}
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/74">{item.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <CTAButton className="bg-white text-[var(--ms-navy)] hover:bg-[var(--ms-ivory)]" href={bookingHref}>
                  {collection === "salons" ? "Book this salon" : "Request booking"}
                </CTAButton>
                <FollowButton type={collection} slug={item.slug} />
                <MessageButton targetId={item.slug} targetName={item.name} />
                <WhatsAppButton className="border-white/20 bg-white/10 text-white hover:text-white" label={item.name} />
              </div>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/62">Coverage and availability</p>
              <AvailabilityChips items={item.areasServed} />
              <div className="mt-5 rounded-[24px] bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Next available</p>
                <p className="mt-2 text-lg font-semibold">{item.nextAvailable}</p>
              </div>
              {"serviceMode" in item ? (
                <div className="mt-4 rounded-[24px] bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Service mode</p>
                  <p className="mt-2 text-lg font-semibold">{item.serviceMode}</p>
                  <p className="mt-2 text-sm text-white/74">
                    {item.salonAffiliation === "Independent"
                      ? "Independent professional with mobile support."
                      : `Also works from ${item.salonAffiliation}.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.identityAttributes.map((attribute) => (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/76" key={attribute}>
                        {attribute}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Service model</p>
                  <p className="mt-2 text-lg font-semibold">
                    {item.mobileService ? "In-salon and mobile" : "In-salon focus"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </SectionReveal>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.66fr)_minmax(320px,0.34fr)]">
          <div className="section-grid">
            <section className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">About</p>
              <p className="mt-4 text-base leading-8 text-[var(--ms-charcoal)]">
                {"about" in item ? item.about : item.bio}
              </p>
            </section>

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

            {item.packageOffers.length ? (
              <ScrollSection
                className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]"
                eyebrow="Packages"
                href={bookingHref}
                hrefLabel="Book package"
                title="Bundles that make sense in real life"
              >
                  {item.packageOffers.map((offer) => (
                    <PackageCard key={offer.id} offer={offer} />
                  ))}
              </ScrollSection>
            ) : null}

            {"specialty" in item ? null : relatedProfessionals.length ? (
              <ScrollSection
                className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]"
                eyebrow="Available professionals"
                href="/home"
                hrefLabel="See all professionals"
                title="The team behind this salon"
              >
                  {relatedProfessionals.map((professional) => (
                    <ProfessionalCard key={professional.slug} professional={professional} />
                  ))}
              </ScrollSection>
            ) : null}

            {/* Live team members registered through the platform */}
            {"specialty" in item ? null : (
              <SalonLiveTeamSection salonSlug={item.slug} />
            )}

            <section className="section-grid dark-atmosphere rounded-[32px] p-6 text-white shadow-[0_18px_48px_rgba(13,27,42,0.22)]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">Work done</p>
                <h2 className="mt-3 text-3xl font-semibold">Portfolio built for trust</h2>
              </div>
              <PortfolioGrid dark items={item.gallery} />
            </section>

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

            <section className="section-grid rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">FAQ</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-navy)]">What clients ask before they commit</h2>
              </div>
              <div className="space-y-3">
                {item.faq.map((faq) => (
                  <details className="rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-5" key={faq.question}>
                    <summary className="cursor-pointer text-lg font-semibold text-[var(--ms-navy)]">{faq.question}</summary>
                    <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <div className="section-grid">
            <SecureContactCard bookingHref={bookingHref} name={item.name} />
            <aside className="sticky top-44 rounded-[32px] bg-white p-5 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Ready to book</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-navy)]">Pay to secure the request.</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
                Confirm the target, choose services, sign in, and complete payment before the provider receives the request.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <CTAButton href={bookingHref}>
                  {collection === "salons" ? "Book this salon" : "Request this professional"}
                </CTAButton>
                <WhatsAppButton label={item.name} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
