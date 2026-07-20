import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Mobile Salon",
  description: "Mobile Salon — Beauty, softly handled. Built in Kenya for women across Africa.",
};

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "v0.1.0";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-10 text-[var(--ms-charcoal)]">
      <div className="mx-auto max-w-md">

        {/* Logo + wordmark */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div
            className="mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] text-3xl font-black text-white shadow-[0_16px_48px_rgba(132,36,92,0.30)]"
            style={{ background: "linear-gradient(135deg, var(--ms-plum), var(--ms-orchid))" }}
          >
            MS
          </div>
          <h1 className="text-[28px] font-black tracking-[-0.02em] text-[var(--ms-navy)]">
            Mobile Salon
          </h1>
          <p className="mt-1 text-[15px] font-medium italic text-[var(--ms-mauve)]">
            Beauty, softly handled.
          </p>
          <span className="mt-3 rounded-full bg-[var(--ms-petal)] px-3 py-1 text-[11px] font-bold text-[var(--ms-plum)]">
            {APP_VERSION}
          </span>
        </div>

        {/* About card */}
        <div className="rounded-[28px] border border-[var(--ms-border)] bg-white px-6 py-6 shadow-[0_4px_24px_rgba(13,27,42,0.07)]">
          <p className="text-[14px] leading-7 text-[var(--ms-charcoal)]">
            Mobile Salon is a digital beauty marketplace connecting clients with professional
            stylists, salons, and beauty product shops across Kenya — and growing across Africa.
          </p>
          <p className="mt-4 text-[14px] leading-7 text-[var(--ms-charcoal)]">
            We believe beauty is personal, powerful, and worth every moment. Our platform is
            built by women and for women, with care for every detail from booking to delivery.
          </p>
        </div>

        {/* Details */}
        <div className="mt-4 space-y-3">
          <div className="rounded-[20px] border border-[var(--ms-border)] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(13,27,42,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">Company</p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--ms-navy)]">Mobile Salon Limited</p>
            <p className="text-[12px] text-[var(--ms-mauve)]">Nairobi, Kenya</p>
          </div>
          <div className="rounded-[20px] border border-[var(--ms-border)] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(13,27,42,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">Version</p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--ms-navy)]">{APP_VERSION}</p>
            <p className="text-[12px] text-[var(--ms-mauve)]">Last updated: May 2026</p>
          </div>
          <div className="rounded-[20px] border border-[var(--ms-border)] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(13,27,42,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">Contact</p>
            <a
              href="mailto:hello@mobilesalon.co.ke"
              className="mt-1 block text-[14px] font-semibold text-[var(--ms-rose)] hover:text-[var(--ms-plum)]"
            >
              hello@mobilesalon.co.ke
            </a>
          </div>
        </div>

        {/* Legal links */}
        <div className="mt-6 space-y-2">
          <Link
            href="/terms"
            className="flex items-center justify-between rounded-[16px] bg-white px-5 py-4 text-[14px] font-semibold text-[var(--ms-navy)] shadow-[0_1px_4px_rgba(13,27,42,0.06)] transition hover:bg-[var(--ms-soft-bg)]"
          >
            Terms of service
            <span className="text-[var(--ms-border)]">›</span>
          </Link>
          <Link
            href="/privacy"
            className="flex items-center justify-between rounded-[16px] bg-white px-5 py-4 text-[14px] font-semibold text-[var(--ms-navy)] shadow-[0_1px_4px_rgba(13,27,42,0.06)] transition hover:bg-[var(--ms-soft-bg)]"
          >
            Privacy policy
            <span className="text-[var(--ms-border)]">›</span>
          </Link>
          <Link
            href="/community-guidelines"
            className="flex items-center justify-between rounded-[16px] bg-white px-5 py-4 text-[14px] font-semibold text-[var(--ms-navy)] shadow-[0_1px_4px_rgba(13,27,42,0.06)] transition hover:bg-[var(--ms-soft-bg)]"
          >
            Community guidelines
            <span className="text-[var(--ms-border)]">›</span>
          </Link>
          <Link
            href="/licenses"
            className="flex items-center justify-between rounded-[16px] bg-white px-5 py-4 text-[14px] font-semibold text-[var(--ms-navy)] shadow-[0_1px_4px_rgba(13,27,42,0.06)] transition hover:bg-[var(--ms-soft-bg)]"
          >
            Open-source licenses
            <span className="text-[var(--ms-border)]">›</span>
          </Link>
        </div>

        {/* Back */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ms-mauve)] transition hover:border-[var(--ms-rose)] hover:text-[var(--ms-navy)]"
          >
            ← Back to Settings
          </Link>
          <p className="text-[11px] text-[var(--ms-mauve)]">© 2026 Mobile Salon Limited</p>
        </div>
      </div>
    </main>
  );
}
