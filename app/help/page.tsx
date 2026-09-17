"use client";

import { AppShell } from "@/components/app-shell";
import { CTAButton, SectionReveal, WhatsAppButton } from "@/components/marketplace-ui";
import { platformRevenueRules } from "@/lib/business-model";
import { supportFaq } from "@/lib/site-data";
import { restartOnboardingTour } from "@/components/onboarding-tour";
import { Sparkles } from "lucide-react";

export default function HelpPage() {
  return (
    <AppShell currentNav="profile" roleMode="salons">
      <div className="section-grid">
        <SectionReveal className="rounded-[36px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.06)] lg:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">Help, policy, and support</p>
          <h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">Clear answers before things feel uncertain.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            Booking policy, rescheduling expectations, support channels, and WhatsApp fallback live together here so clients and professionals do not have to guess.
          </p>
        </SectionReveal>

        <section className="section-grid rounded-[32px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.06)]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">Frequently asked questions</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">What people ask most</h2>
          </div>
          <div className="space-y-3">
            {supportFaq.map((faq) => (
              <details className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-5" key={faq.question}>
                <summary className="cursor-pointer text-lg font-semibold text-[var(--text-primary)]">{faq.question}</summary>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <SectionReveal className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.06)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">Policy snapshot</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
            {platformRevenueRules.map((rule) => (
              <p className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-4 py-3" key={rule}>
                {rule}
              </p>
            ))}
          </div>
        </SectionReveal>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionReveal className="rounded-[32px] bg-[var(--color-ink)] p-6 text-white shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
            <p className="text-xs uppercase tracking-[0.22em] text-white/80 font-semibold">Contact support</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Need direct help?</h2>
            <p className="mt-4 text-sm leading-7 text-white/90">
              WhatsApp remains available for urgent rebooking, onboarding questions, and support while keeping the main product experience clean.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <WhatsAppButton className="border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white" label="support" />
              <CTAButton href="/book" variant="ghost" className="text-white hover:bg-white/15">
                Return to booking
              </CTAButton>
            </div>
          </SectionReveal>

          <SectionReveal className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.06)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">Guided tour</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Take the Styld walkthrough</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Need a quick refresher on how Styld works? Replay the interactive tour to explore booking, discovery, and account tools.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => restartOnboardingTour()}
                className="inline-flex items-center gap-2 rounded-full bg-[#C0A090] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#1D1D1B] transition hover:bg-[#b09080] active:scale-95 shadow-md"
              >
                <Sparkles className="h-4 w-4" />
                Start walkthrough
              </button>
            </div>
          </SectionReveal>
        </div>
      </div>
    </AppShell>
  );
}
