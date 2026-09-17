import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Styld",
  description: "Styld — The trusted digital beauty economy platform. Booking and commerce, handled beautifully.",
};

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "v0.1.0";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--surface-card)] px-4 py-10 text-[var(--text-secondary)]">
      <div className="mx-auto max-w-md">

        {/* Logo + wordmark */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div
            className="mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] text-3xl font-black text-white shadow-[0_16px_48px_rgba(29,29,27,0.30)]"
            style={{ background: "linear-gradient(135deg, var(--color-ink), var(--color-warning))" }}
          >
            S
          </div>
          <h1 className="text-[28px] font-black tracking-[-0.02em] text-[var(--text-primary)] font-display">
            Styld
          </h1>
          <p className="mt-1 text-[15px] font-medium italic text-[var(--color-secondary)]">
            Trusted beauty access.
          </p>
          <span className="mt-3 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] px-3 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
            {APP_VERSION}
          </span>
        </div>

        {/* About card */}
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-white px-6 py-6 shadow-[0_4px_24px_rgba(13,27,42,0.07)]">
          <p className="text-[14px] leading-7 text-[var(--text-secondary)]">
            Styld is a digital beauty marketplace connecting clients with professional
            stylists, salons, and beauty product shops across Kenya — and growing across Africa.
          </p>
          <p className="mt-4 text-[14px] leading-7 text-[var(--text-secondary)]">
            We believe beauty is personal, powerful, and worth every moment. Our platform is
            built with care for every detail from booking to delivery.
          </p>
        </div>

        {/* Details */}
        <div className="mt-4 space-y-3">
          <div className="rounded-[20px] border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(13,27,42,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-secondary)]">Company</p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">Styld Limited</p>
            <p className="text-[12px] text-[var(--color-secondary)]">Nairobi, Kenya</p>
          </div>
          <div className="rounded-[20px] border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(13,27,42,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-secondary)]">Version</p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">{APP_VERSION}</p>
            <p className="text-[12px] text-[var(--color-secondary)]">Last updated: May 2026</p>
          </div>
          <div className="rounded-[20px] border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(13,27,42,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-secondary)]">Contact</p>
            <a
              href="mailto:hello@styld.co.ke"
              className="mt-1 block text-[14px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-primary)]"
            >
              hello@styld.co.ke
            </a>
          </div>
        </div>

        {/* Legal links */}
        <div className="mt-6 space-y-2">
          <Link
            href="/terms"
            className="flex items-center justify-between rounded-[16px] bg-white px-5 py-4 text-[14px] font-semibold text-[var(--text-primary)] shadow-[0_1px_4px_rgba(13,27,42,0.06)] transition hover:bg-[var(--surface-card)]"
          >
            Terms of service
            <span className="text-\[var\(--color-border\)]">›</span>
          </Link>
          <Link
            href="/privacy"
            className="flex items-center justify-between rounded-[16px] bg-white px-5 py-4 text-[14px] font-semibold text-[var(--text-primary)] shadow-[0_1px_4px_rgba(13,27,42,0.06)] transition hover:bg-[var(--surface-card)]"
          >
            Privacy policy
            <span className="text-[var(--color-border)]">›</span>
          </Link>
          <Link
            href="/community-guidelines"
            className="flex items-center justify-between rounded-[16px] bg-white px-5 py-4 text-[14px] font-semibold text-[var(--text-primary)] shadow-[0_1px_4px_rgba(13,27,42,0.06)] transition hover:bg-[var(--surface-card)]"
          >
            Community guidelines
            <span className="text-[var(--color-border)]">›</span>
          </Link>
          <Link
            href="/licenses"
            className="flex items-center justify-between rounded-[16px] bg-white px-5 py-4 text-[14px] font-semibold text-[var(--text-primary)] shadow-[0_1px_4px_rgba(13,27,42,0.06)] transition hover:bg-[var(--surface-card)]"
          >
            Open-source licenses
            <span className="text-[var(--color-border)]">›</span>
          </Link>
        </div>

        {/* Back */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-secondary)] transition hover:border-[var(--color-warning)] hover:text-[var(--text-primary)]"
          >
            ← Back to Settings
          </Link>
          <p className="text-[11px] text-[var(--color-secondary)]">© 2026 Styld Limited</p>
        </div>
      </div>
    </main>
  );
}
