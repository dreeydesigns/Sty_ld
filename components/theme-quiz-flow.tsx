"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft, RotateCcw, Sparkles } from "lucide-react";

import {
  applyThemeQuizResult,
  readClientSession,
  writeQuizTheme,
  writeSignupDraft,
} from "@/lib/client-session";
import {
  getThemeConfig,
  scoreThemeQuiz,
  themeQuizQuestions,
  type ThemeKey,
  type ThemeQuizResult,
} from "@/lib/personalization";
import { cn } from "@/lib/utils";

type Phase = "intro" | "quiz" | "result";

export function ThemeQuizFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/signup/client";

  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ThemeKey[]>([]);
  const [result, setResult] = useState<ThemeQuizResult | null>(null);

  const question = themeQuizQuestions[step];
  const progress = ((step + 1) / themeQuizQuestions.length) * 100;

  function startQuiz() {
    setStep(0);
    setAnswers([]);
    setPhase("quiz");
  }

  function selectAnswer(theme: ThemeKey) {
    const nextAnswers = [...answers];
    nextAnswers[step] = theme;
    setAnswers(nextAnswers);

    if (step < themeQuizQuestions.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    // All answered â€” score and show result
    const quizResult = scoreThemeQuiz(nextAnswers);
    const themeConfig = getThemeConfig(quizResult.theme);

    writeQuizTheme(quizResult.theme);
    writeSignupDraft({
      theme: quizResult.theme,
      tribeBadge: themeConfig.tribeBadge,
      quiz: quizResult,
    });

    setResult(quizResult);
    setPhase("result");
  }

  function handleEnterMyWorld() {
    if (!result) return;

    if (readClientSession()) {
      applyThemeQuizResult(result);
      router.push(returnTo?.startsWith("/") ? returnTo : "/home");
      return;
    }

    router.push(safeReturnTo);
  }

  // â”€â”€ INTRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (phase === "intro") {
    return (
      <main className="min-h-screen bg-[var(--surface-card)] px-4 py-8 text-[var(--text-secondary)]">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-lg content-center">
          <div className="overflow-hidden rounded-[38px] border border-[var(--border-subtle)] bg-white shadow-[0_24px_80px_rgba(13,27,42,0.1)]">
            {/* Header */}
            <div className="bg-[var(--color-primary)] p-7 text-white">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-[var(--surface-elevated)]">
                <Sparkles className="h-6 w-6" />
              </span>
              <h1 className="mt-5 font-display text-4xl leading-tight">
                Let us find your world.
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/76">
                10 small questions. A personalised feed, aesthetic, and community â€” built entirely around you. Takes about 90 seconds.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3 p-6">
              {[
                { icon: "âœ¦", title: "Your feed becomes yours", copy: "Professionals and salons matched to your exact taste from day one." },
                { icon: "âœ¦", title: "Find your tribe", copy: "Connect with women who share your aesthetic and your world." },
                { icon: "âœ¦", title: "You can always change it", copy: "Settings â†’ My World. No lock-in, ever." },
              ].map((row) => (
                <div
                  key={row.title}
                  className="flex items-start gap-4 rounded-[22px] bg-[var(--surface-card)] px-4 py-4"
                >
                  <span className="mt-0.5 text-base font-bold text-[var(--color-accent)]">{row.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{row.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-secondary)]">{row.copy}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="space-y-3 px-6 pb-7">
              <button
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition hover:brightness-110"
                onClick={startQuiz}
                type="button"
              >
                Yes, personalise my world
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href={safeReturnTo}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-[var(--border-subtle)] px-6 text-sm font-semibold text-[var(--color-secondary)] transition hover:border-[var(--color-secondary)] hover:text-[var(--text-primary)]"
              >
                Skip for now
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // â”€â”€ RESULT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (phase === "result" && result) {
    const theme = getThemeConfig(result.theme);

    return (
      <main
        className="min-h-screen px-4 py-8 text-[var(--text-secondary)]"
        style={{ background: `linear-gradient(135deg, ${theme.softColor}, #ffffff 60%, #FDF7F2)` }}
      >
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-lg content-center">
          <div className="overflow-hidden rounded-[38px] border border-[var(--border-subtle)] bg-white shadow-[0_24px_80px_rgba(13,27,42,0.12)]">
            {/* Coloured header */}
            <div
              className="p-7 text-white"
              style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.darkColor})` }}
            >
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
              >
                âœ¦ {theme.tribeBadge}
              </span>
              <h1 className="mt-5 font-display text-4xl leading-tight">
                You are {theme.tribeBadge}.
              </h1>
              <p className="mt-3 font-display text-xl italic leading-snug text-white/82">
                {theme.copy}
              </p>
            </div>

            {/* Description */}
            <div className="p-6">
              <p className="text-sm leading-7 text-[var(--color-secondary)]">
                {theme.feedCopy}
              </p>
              <p className="mt-4 rounded-[18px] bg-[var(--surface-card)] px-4 py-3 text-xs leading-6 text-[var(--color-secondary)]">
                Your feed, search results, and discovery page will now reflect your world. You can change your theme anytime in <span className="font-semibold text-[var(--text-primary)]">Settings â†’ My World</span>.
              </p>
            </div>

            {/* CTAs */}
            <div className="space-y-3 px-6 pb-7">
              <button
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition hover:brightness-110"
                onClick={handleEnterMyWorld}
                style={{ backgroundColor: theme.accentColor }}
                type="button"
              >
                Enter my world
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-6 text-sm font-semibold text-[var(--color-secondary)] transition hover:border-[var(--color-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => {
                  setAnswers([]);
                  setStep(0);
                  setResult(null);
                  setPhase("quiz");
                }}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                Retake the quiz
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // â”€â”€ QUIZ QUESTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <main className="min-h-screen bg-white px-4 py-5 text-[var(--text-secondary)]">
      <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-3xl content-center">
        <div className="overflow-hidden rounded-[38px] border border-[var(--border-subtle)] bg-white shadow-[0_24px_80px_rgba(13,27,42,0.1)]">
          {/* Question header */}
          <div className="bg-[var(--color-primary)] p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-[var(--surface-elevated)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="flex items-center gap-2">
                <Link
                  className="inline-flex min-h-10 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white"
                  href={safeReturnTo}
                >
                  Skip for now
                </Link>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white disabled:opacity-40"
                  disabled={step === 0}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: "var(--color-secondary)",
                }}
              />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/58">
              {question.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight">
              {question.question}
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Optional. Ten quick taps to shape your feed.
            </p>
          </div>

          {/* Answer options */}
          <div className="grid gap-3 p-4 sm:p-5">
            {question.answers.map((option) => {
              const optTheme = getThemeConfig(option.theme);
              const active = answers[step] === option.theme;

              return (
                <button
                  className={cn(
                    "group min-h-20 rounded-[26px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(13,27,42,0.08)]",
                    active
                      ? "border-transparent text-white"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)]",
                  )}
                  key={option.id}
                  onClick={() => selectAnswer(option.theme)}
                  style={active ? { backgroundColor: optTheme.accentColor } : undefined}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-semibold">{option.label}</span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-sm leading-6",
                      active ? "text-white/78" : "text-[var(--color-secondary)]",
                    )}
                  >
                    {option.copy}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
