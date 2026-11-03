"use client";

import { AppShell } from "@/components/app-shell";
import { CTAButton, SectionReveal } from "@/components/marketplace-ui";
import { platformRevenueRules } from "@/lib/business-model";
import { supportFaq } from "@/lib/site-data";
import { restartOnboardingTour } from "@/components/onboarding-tour";
import { Sparkles } from "lucide-react";

export default function HelpPage() {
  return (
    <AppShell currentNav="profile" roleMode="salons">
      <div className="section-grid">
        <SectionReveal className="rounded-[36px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.06)] lg:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">Help and support</p>
          <h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">Clear answers before things feel uncertain.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            Get help with your account, explore the planning tools, or replay the walkthrough. Live booking and payments are not available yet.
          </p>
        </SectionReveal>

        <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6">
          <h2 className="text-2xl font-semibold">Having trouble signing in?</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Find a missing code, restore access to your email, or ask STYLD to review an account recovery request.</p>
          <CTAButton href="/auth/recovery" className="mt-4">Recover account access</CTAButton>
        </section>

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
              Email trystyld@gmail.com for help using STYLD. If you cannot sign in, use the account recovery steps so we can review your request safely. Never send a password or verification code.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <CTAButton href="mailto:trystyld@gmail.com" className="border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white" variant="outline">Email support</CTAButton>
              <CTAButton href="/auth/recovery" variant="ghost" className="text-white hover:bg-white/15">
                Account access help
              </CTAButton>
            </div>
          </SectionReveal>

          <SectionReveal className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.06)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay-text)] font-semibold">Guided tour</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Take the Styld walkthrough</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Need a quick refresher on how Styld works? Replay the interactive tour to explore planning, discovery, and account tools.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => restartOnboardingTour()}
                className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full bg-[#C0A090] px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-[#1D1D1B] transition hover:bg-[#b09080] active:scale-95 shadow-md"
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
