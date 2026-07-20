import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Guidelines — Mobile Salon",
  description: "Mobile Salon community standards — what is allowed, what isn't, and how we keep our community safe and respectful.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-[var(--ms-plum)]">{title}</h2>
      <div className="space-y-4 text-[14px] leading-7 text-[var(--ms-charcoal)]">{children}</div>
    </section>
  );
}

function Rule({ emoji, label, children }: { emoji: string; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-5 py-4">
      <p className="mb-1.5 text-[13px] font-bold text-[var(--ms-navy)]">
        <span className="mr-2">{emoji}</span>{label}
      </p>
      <div className="text-[13px] leading-6 text-[var(--ms-mauve)]">{children}</div>
    </div>
  );
}

export default function CommunityGuidelinesPage() {
  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-10 text-[var(--ms-charcoal)]">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-10 overflow-hidden rounded-[32px] bg-[var(--ms-plum)] px-8 py-10 text-white shadow-[0_24px_80px_rgba(58,24,58,0.3)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Standards</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">Community Guidelines</h1>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Effective Date: 1 January 2025 · Last Updated: 23 May 2026
          </p>
          <p className="mt-5 rounded-[18px] bg-white/10 px-5 py-4 text-sm leading-7 text-white/80">
            Mobile Salon is a community built on respect, creativity, and trust. These guidelines apply to every person on the platform — clients, professionals, salons, and delivery providers alike.
          </p>
        </div>

        <div className="rounded-[32px] border border-[var(--ms-border)] bg-white px-8 py-10 shadow-[0_4px_24px_rgba(13,27,42,0.07)]">

          <Section title="1. Be Authentic">
            <p>
              We value real people sharing real experiences. All profiles, reviews, and posts must represent genuine activity. Impersonating another person, creating fake accounts, or posting fabricated reviews violates our standards.
            </p>
            <div className="space-y-2">
              <Rule emoji="✓" label="Allowed">
                Sharing your honest experience of a service or product, even if it was negative — as long as it is truthful and constructive.
              </Rule>
              <Rule emoji="✗" label="Not allowed">
                Creating fake reviews, buying engagement, or impersonating a professional, salon, or another client.
              </Rule>
            </div>
          </Section>

          <Section title="2. Be Respectful">
            <p>
              Treat every person on Mobile Salon with dignity. Harassment, bullying, threats, and hate speech have no place in our community.
            </p>
            <div className="space-y-2">
              <Rule emoji="✓" label="Allowed">
                Constructive criticism, honest feedback, and disagreement expressed respectfully.
              </Rule>
              <Rule emoji="✗" label="Not allowed">
                Harassment, targeted abuse, threats of violence, hate speech based on gender, race, ethnicity, religion, disability, sexual orientation, or any other characteristic.
              </Rule>
            </div>
          </Section>

          <Section title="3. Share Original Content">
            <p>
              Only post content you have the right to share. This includes photos, videos, and any creative work.
            </p>
            <div className="space-y-2">
              <Rule emoji="✓" label="Allowed">
                Your own work, photos you took yourself, and content created with the explicit consent of the person featured.
              </Rule>
              <Rule emoji="✗" label="Not allowed">
                Content copied from other platforms without permission, photos of clients taken without their consent, or watermarked work belonging to another creator.
              </Rule>
            </div>
          </Section>

          <Section title="4. Keep It Safe for Everyone">
            <p>
              Mobile Salon must be safe for all users, including professionals who interact with clients in person.
            </p>
            <div className="space-y-2">
              <Rule emoji="✓" label="Allowed">
                Reporting behaviour that makes you feel unsafe, blocking users who harass you, and using our in-app messaging for appointment logistics.
              </Rule>
              <Rule emoji="✗" label="Not allowed">
                Requesting or soliciting services that are illegal, non-consensual, or outside the scope of beauty and wellness. Sharing personal contact details publicly to bypass platform safety features.
              </Rule>
            </div>
          </Section>

          <Section title="5. Honest Commerce">
            <p>
              All services, products, and prices listed on Mobile Salon must be accurate and fairly represented.
            </p>
            <div className="space-y-2">
              <Rule emoji="✓" label="Allowed">
                Listing accurate service descriptions, fair pricing, and genuine before/after results with appropriate context.
              </Rule>
              <Rule emoji="✗" label="Not allowed">
                Misleading service descriptions, bait-and-switch pricing, selling counterfeit or unsafe products, or using the platform to facilitate fraud.
              </Rule>
            </div>
          </Section>

          <Section title="6. Protect Children">
            <p>
              Mobile Salon is strictly for users aged 18 and above. We have zero tolerance for any content that exploits or endangers minors.
            </p>
            <p>
              Any such content will be removed immediately, the account permanently banned, and the matter referred to relevant authorities.
            </p>
          </Section>

          <Section title="7. Adult Content">
            <p>
              Certain adult wellness and beauty products are available through the Counter feature. These are age-gated (18+) and must be listed only in designated categories. Explicit sexual content is prohibited across all areas of the platform.
            </p>
          </Section>

          <Section title="8. Spam and Misleading Promotion">
            <p>
              Do not flood the feed with repetitive promotional content, use bots or automation to inflate your following, or use misleading hashtags unrelated to your content.
            </p>
          </Section>

          <Section title="9. Enforcement">
            <p>
              When we identify a violation of these guidelines, we may take one or more of the following actions depending on severity and history:
            </p>
            <ul className="ml-4 list-disc space-y-2 text-[14px] leading-7">
              <li>Remove the offending content</li>
              <li>Issue a formal warning</li>
              <li>Temporarily restrict your account</li>
              <li>Permanently ban your account</li>
              <li>Report the activity to law enforcement where required by law</li>
            </ul>
            <p>
              You may appeal any enforcement action by contacting{" "}
              <a href="mailto:appeals@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                appeals@mobilesalon.co.ke
              </a>{" "}
              within 14 days.
            </p>
          </Section>

          <Section title="10. Contact">
            <div className="rounded-[18px] bg-[var(--ms-soft-bg)] px-5 py-5">
              <p className="font-semibold text-[var(--ms-navy)]">Mobile Salon Limited — Trust &amp; Safety</p>
              <p className="mt-1 text-[var(--ms-mauve)]">Nairobi, Kenya</p>
              <div className="mt-3 space-y-1 text-[13px]">
                <p>
                  Safety:{" "}
                  <a href="mailto:safety@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                    safety@mobilesalon.co.ke
                  </a>
                </p>
                <p>
                  Appeals:{" "}
                  <a href="mailto:appeals@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                    appeals@mobilesalon.co.ke
                  </a>
                </p>
                <p>
                  General:{" "}
                  <a href="mailto:hello@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                    hello@mobilesalon.co.ke
                  </a>
                </p>
              </div>
            </div>
          </Section>

        </div>

        {/* Back nav */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ms-mauve)] transition hover:border-[var(--ms-rose)] hover:text-[var(--ms-navy)]"
          >
            ← Back to Settings
          </Link>
          <Link href="/safety" className="text-sm text-[var(--ms-mauve)] underline">
            Safety information
          </Link>
        </div>
      </div>
    </main>
  );
}
