import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Mobile Salon",
  description: "Mobile Salon Privacy Policy — how we collect, use, and protect your personal data under the Kenya Data Protection Act 2019.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-[var(--ms-plum)]">{title}</h2>
      <div className="space-y-4 text-base leading-8 text-[var(--ms-charcoal)]">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-10 text-[var(--ms-charcoal)]">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 overflow-hidden rounded-[32px] bg-[var(--ms-plum)] px-8 py-10 text-white shadow-[0_24px_80px_rgba(58,24,58,0.3)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Legal</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">Privacy Policy</h1>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Effective Date: 1 January 2025
            <br />
            Last Updated: 23 May 2026
          </p>
          <p className="mt-5 rounded-[18px] bg-white/10 px-5 py-4 text-sm leading-7 text-white/80">
            Mobile Salon Limited is committed to protecting your personal data in accordance with the
            Kenya Data Protection Act, 2019 (Act No. 24 of 2019). This Privacy Policy explains what
            data we collect, why we collect it, how we use it, and your rights.
          </p>
        </div>

        {/* Content */}
        <div className="rounded-[32px] border border-[var(--ms-border)] bg-white px-8 py-10 shadow-[0_18px_60px_rgba(13,27,42,0.08)]">

          <Section title="1. Who We Are">
            <p>
              Mobile Salon Limited (&quot;Mobile Salon&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the Mobile Salon
              platform — a digital marketplace connecting clients, beauty professionals, salons,
              product shops, and delivery providers in Kenya.
            </p>
            <p>
              Our registered Data Protection Officer can be reached at{" "}
              <a href="mailto:privacy@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                privacy@mobilesalon.co.ke
              </a>.
            </p>
          </Section>

          <Section title="2. Data We Collect">
            <p>We collect the following categories of personal data:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Account data:</strong> name, phone number, email address, account role, profile photo, and bio.</li>
              <li><strong>Transaction data:</strong> booking details, service records, payment references, and order history.</li>
              <li><strong>Content data:</strong> photos, captions, reviews, and messages you post on the platform.</li>
              <li><strong>Technical data:</strong> device type, browser, IP address, and usage logs.</li>
              <li><strong>Location data:</strong> approximate location used to show nearby services (you may opt out).</li>
              <li><strong>Identity verification data:</strong> date of birth (collected only for 18+ age verification, stored on-device only).</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Data">
            <p>We use your personal data to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>create and manage your account;</li>
              <li>process bookings and payments;</li>
              <li>send you notifications about your bookings, messages, and account activity;</li>
              <li>show you relevant services and products based on your location and preferences;</li>
              <li>detect and prevent fraud, abuse, and policy violations;</li>
              <li>comply with our legal obligations under Kenyan law;</li>
              <li>improve and develop the platform.</li>
            </ul>
          </Section>

          <Section title="4. Legal Basis for Processing">
            <p>
              We process your personal data on the following legal bases under the Kenya Data Protection Act, 2019:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Contract performance:</strong> processing necessary to provide the services you requested.</li>
              <li><strong>Consent:</strong> where you have given explicit consent (e.g., marketing communications, location data).</li>
              <li><strong>Legitimate interests:</strong> fraud detection, platform security, and service improvement.</li>
              <li><strong>Legal obligation:</strong> compliance with Kenyan tax, financial, and regulatory requirements.</li>
            </ul>
          </Section>

          <Section title="5. Data Sharing">
            <p>We do not sell your personal data. We may share it with:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Payment processors:</strong> Safaricom (M-Pesa via Daraja API) and Stripe, for transaction processing.</li>
              <li><strong>Other platform users:</strong> your public profile, posts, and reviews are visible to other users per your privacy settings.</li>
              <li><strong>Service providers:</strong> cloud infrastructure, analytics, and support tools operating under data processing agreements.</li>
              <li><strong>Law enforcement:</strong> where required by a valid court order or legal obligation under Kenyan law.</li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your personal data for as long as your account is active, or as required by law.
              When you delete your account, we begin a 30-day grace period after which your personal data
              is permanently deleted from our systems, except:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>transaction records, which are retained for 7 years per Kenyan tax law;</li>
              <li>reviews, which are anonymised (not deleted) to preserve platform integrity;</li>
              <li>data required by a legal hold or ongoing investigation.</li>
            </ul>
          </Section>

          <Section title="7. Your Rights">
            <p>Under the Kenya Data Protection Act, 2019, you have the right to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Access</strong> your personal data;</li>
              <li><strong>Correct</strong> inaccurate data;</li>
              <li><strong>Delete</strong> your account and personal data (subject to legal retention requirements);</li>
              <li><strong>Object</strong> to processing based on legitimate interests;</li>
              <li><strong>Withdraw consent</strong> where processing is consent-based;</li>
              <li><strong>Data portability</strong> — request a copy of your data in a structured, machine-readable format.</li>
            </ul>
            <p>
              To exercise any of these rights, contact our Data Protection Officer at{" "}
              <a href="mailto:privacy@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                privacy@mobilesalon.co.ke
              </a>. We will respond within 21 days.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We implement appropriate technical and organisational measures to protect your data,
              including encrypted data transmission (HTTPS), access controls, and regular security reviews.
              No system is 100% secure; if we discover a breach that affects your rights, we will notify
              you and the Office of the Data Protection Commissioner (ODPC) within 72 hours as required by law.
            </p>
          </Section>

          <Section title="9. Cookies and Device Storage">
            <p>
              The Mobile Salon platform uses browser localStorage to store your session, settings, and
              preferences on your device. This data does not leave your device except when explicitly
              synced to our servers. We do not use third-party advertising cookies.
            </p>
          </Section>

          <Section title="10. Children">
            <p>
              Mobile Salon is intended for users aged 18 and above. We do not knowingly collect data
              from persons under 18. If we become aware that a minor has created an account, we will
              delete the account and associated data promptly.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              &quot;Last Updated&quot; date and notify you via the app. Continued use of the platform after
              notification constitutes acceptance of the revised policy.
            </p>
          </Section>

          <Section title="12. Contact">
            <div className="rounded-[18px] bg-[var(--ms-soft-bg)] px-5 py-5">
              <p className="font-semibold text-[var(--ms-navy)]">Mobile Salon Limited — Data Protection Officer</p>
              <p className="mt-1 text-[var(--ms-mauve)]">Nairobi, Kenya</p>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  Privacy:{" "}
                  <a href="mailto:privacy@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                    privacy@mobilesalon.co.ke
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
          <Link
            href="/terms"
            className="text-sm text-[var(--ms-mauve)] underline"
          >
            Terms of service
          </Link>
        </div>
      </div>
    </main>
  );
}
