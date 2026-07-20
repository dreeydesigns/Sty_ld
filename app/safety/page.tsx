import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Safety — Mobile Salon",
  description: "Mobile Salon's commitment to user safety, how to report unsafe behaviour, and emergency contacts.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[17px] font-bold text-[var(--ms-plum)]">{title}</h2>
      <div className="space-y-3 text-[14px] leading-7 text-[var(--ms-charcoal)]">{children}</div>
    </section>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ms-plum)] text-[11px] font-bold text-white">
        {number}
      </span>
      <p className="text-[14px] leading-6 text-[var(--ms-charcoal)]">{text}</p>
    </div>
  );
}

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-10 text-[var(--ms-charcoal)]">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-10 overflow-hidden rounded-[32px] bg-[var(--ms-plum)] px-8 py-10 text-white shadow-[0_24px_80px_rgba(58,24,58,0.3)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Safety</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">Your Safety Matters</h1>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Mobile Salon is committed to creating a safe, respectful, and inclusive space for
            every client, professional, and salon on the platform.
          </p>
        </div>

        {/* Emergency box */}
        <div className="mb-8 rounded-[24px] border-2 border-red-200 bg-red-50 px-6 py-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-red-700">Emergency contacts — Kenya</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-[15px] font-black text-white">999</span>
              <p className="text-[14px] font-semibold text-red-700">Kenya Police — emergencies</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-[13px] font-black text-white">112</span>
              <p className="text-[14px] font-semibold text-red-700">Emergency services (all networks)</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-white">GBV</span>
              <p className="text-[14px] font-semibold text-amber-800">GBV Hotline — <strong>1195</strong> (free, 24/7)</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-[32px] border border-[var(--ms-border)] bg-white px-8 py-10 shadow-[0_4px_24px_rgba(13,27,42,0.07)]">

          <Section title="How to Report Unsafe Behaviour">
            <p>
              If you encounter behaviour that makes you feel unsafe, harassed, or uncomfortable on Mobile Salon, please report it immediately using one of these methods:
            </p>
            <div className="space-y-3">
              <Step number={1} text="Tap the three-dot menu (···) on any post, profile, or message." />
              <Step number={2} text='Select "Report" and choose the most relevant category.' />
              <Step number={3} text="Add a description if you can — more detail helps our team respond faster." />
              <Step number={4} text="Submit. You will receive a confirmation. Our safety team reviews all reports within 24 hours." />
            </div>
            <p>
              You can also email us directly at{" "}
              <a href="mailto:safety@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                safety@mobilesalon.co.ke
              </a>{" "}
              for urgent safety concerns.
            </p>
          </Section>

          <Section title="How to Block Someone">
            <p>
              Blocking prevents a user from seeing your profile, contacting you, or interacting with your content.
            </p>
            <div className="space-y-3">
              <Step number={1} text="Go to the person's profile page." />
              <Step number={2} text='Tap the three-dot menu (···) near their name.' />
              <Step number={3} text='"Block this person" — confirm when prompted.' />
            </div>
            <p>
              You can manage your blocked accounts anytime in{" "}
              <Link href="/settings/blocked-accounts" className="text-[var(--ms-rose)] underline">
                Settings → Blocked accounts
              </Link>.
            </p>
          </Section>

          <Section title="Our Safety Commitments">
            <ul className="ml-4 list-disc space-y-2">
              <li>All reports are reviewed by a human safety reviewer within 24 hours.</li>
              <li>Accounts found violating our community guidelines are suspended or permanently banned.</li>
              <li>We do not tolerate harassment, hate speech, threats, or non-consensual content of any kind.</li>
              <li>Professionals and salons are verified before being listed on the platform.</li>
              <li>All payments are processed through regulated payment providers (M-Pesa / Stripe).</li>
              <li>Personal data is protected under the Kenya Data Protection Act, 2019.</li>
            </ul>
          </Section>

          <Section title="Meeting a Professional Safely">
            <p>
              When booking a mobile appointment — a professional coming to your home or you visiting a new salon — we recommend:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Check the professional&apos;s reviews and verification badge before booking.</li>
              <li>Share your appointment details with a trusted friend or family member.</li>
              <li>Meet in a well-lit, accessible location for first-time appointments.</li>
              <li>Trust your instincts — if something feels wrong, cancel and report.</li>
            </ul>
          </Section>

          <Section title="Child Safety">
            <p>
              Mobile Salon is a platform for adults aged 18 and above. We have zero tolerance for any content that endangers or exploits minors. If you suspect a child is at risk, contact the Kenya National Child Helpline at <strong>116</strong> (free, 24/7).
            </p>
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
          <Link href="/community-guidelines" className="text-sm text-[var(--ms-mauve)] underline">
            Community guidelines
          </Link>
        </div>
      </div>
    </main>
  );
}
