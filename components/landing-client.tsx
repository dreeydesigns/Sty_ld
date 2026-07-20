"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Crown,
  Gem,
  Sparkles,
  Menu,
  X,
  ShieldCheck,
  Lock,
  Check,
  Sparkle,
} from "lucide-react";

import { imageAssets } from "@/lib/site-data";

const proofStats = [
  ["4.9★", "rating average"],
  ["1,200+", "verified pros"],
  ["3", "launch cities"],
  ["5 taps", "booking path"],
];

const roleSections = [
  {
    id: "client",
    label: "Clients",
    accent: "#C8284A",
    icon: Sparkles,
    title: "Beauty care, clearly arranged.",
    copy: "See the look, the price, and the slot before you book.",
    highlights: ["Verified first", "Visible prices", "Mobile options"],
    cta: "Find my beauty pro",
    href: "/signup/client",
    image: imageAssets.makeupArtist,
  },
  {
    id: "salon",
    label: "Salons",
    accent: "#BF8C2E",
    icon: Building2,
    title: "A salon page that works while you work.",
    copy: "Show your team, menu, portfolio, and availability in one polished place.",
    highlights: ["Team showcase", "Service menu", "Protected payouts"],
    cta: "List my salon",
    href: "/onboarding/salon",
    image: imageAssets.salonBraiding,
  },
  {
    id: "pro",
    label: "Professionals",
    accent: "#1A7A6B",
    icon: Crown,
    title: "Let your skill speak before you do.",
    copy: "Build a bookable profile with proof, pricing, and trusted ranking.",
    highlights: ["Portfolio first", "No rent barrier", "Verification boost"],
    cta: "Start as professional",
    href: "/onboarding/professional?role=professional",
    image: imageAssets.nails,
  },
];

const steps = [
  { number: "01", title: "Choose", copy: "Salon or pro" },
  { number: "02", title: "Pick", copy: "Service or package" },
  { number: "03", title: "Time", copy: "Real availability" },
  { number: "04", title: "Review", copy: "Price and location" },
  { number: "05", title: "Confirm", copy: "Protected booking" },
];

// Motion Variants for Staggered Blur Fade Up
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const blurFadeUp: any = {
  hidden: { opacity: 0, y: 28, filter: "blur(12px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.12,
      duration: 0.8,
      ease: [0.215, 0.61, 0.355, 1], // easeOutCubic
    },
  }),
};

export default function LandingClient() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashCount, setSplashCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSafetyTab, setActiveSafetyTab] = useState<"verification" | "privacy" | "payments">("verification");

  // Splash Screen Counter effect
  useEffect(() => {
    if (!showSplash) return;
    const start = performance.now();
    const duration = 1600; // 1.6s

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Beautiful easeOutQuad
      const eased = progress * (2 - progress);
      setSplashCount(Math.round(eased * 100));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setShowSplash(false);
        }, 200);
      }
    }

    requestAnimationFrame(animate);
  }, [showSplash]);

  return (
    <div className="relative min-h-screen bg-[#070406] text-[#FDF7F2] font-sans selection:bg-[#C8284A]/30 select-none">
      
      {/* 1. HIGH-FASHION SPLASH SCREEN */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#0F0A0D] p-8 md:p-12"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }}
            transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
          >
            {/* Top accent */}
            <div className="w-full flex justify-between items-center text-xs tracking-[0.24em] text-white/40 uppercase font-mono">
              <span>Styld Platform</span>
              <span>Nairobi, Kenya</span>
            </div>

            {/* Mid logo */}
            <div className="text-center">
              <motion.h1 
                className="font-display text-6xl md:text-8xl font-bold tracking-tight text-[#FDF7F2]"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-[#C9A84C]">Sty</span>ld
              </motion.h1>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A84C]/80">
                Trusted Beauty Access
              </p>
            </div>

            {/* Bottom Counter */}
            <div className="w-full flex justify-between items-end">
              <div className="text-left font-mono">
                <span className="text-xs text-white/30 block uppercase tracking-widest">Initialising</span>
                <span className="text-xs font-semibold text-[#BF8C2E]/80">Curating safe beauty...</span>
              </div>
              <div className="font-display text-7xl md:text-9xl font-bold tracking-tighter text-[#FDF7F2] tabular-nums">
                {splashCount.toString().padStart(2, "0")}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN HEADER & HERO NAVIGATION (Liquid Glass Styled Navbar) */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0F0A0D]/70 backdrop-blur-2xl transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <Link className="font-display text-2xl font-bold text-[#FDF7F2] tracking-tight hover:opacity-90" href="/">
            <span className="text-[#C9A84C]">Sty</span>ld
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#how-it-works" className="text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white transition">How it works</a>
            <a href="#trust-hub" className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] hover:text-[#e4be5b] transition">Verification Hub</a>
            <a href="#join-role" className="text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white transition">Partner Roles</a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              className="hidden rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              href="/auth/sign-in?returnTo=/home"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C8284A] px-5 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_12px_32px_rgba(200,40,74,0.24)] transition hover:bg-[#E03460] hover:scale-105 active:scale-95 btn-press"
              href="/auth/sign-up"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-white hover:bg-white/5 rounded-full lg:hidden transition"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 border-b border-white/10 bg-[#0F0A0D]/95 backdrop-blur-2xl p-6 lg:hidden flex flex-col gap-4 shadow-2xl"
            >
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-sm font-medium tracking-wide text-white/80 border-b border-white/5 hover:text-white">How It Works</a>
              <a href="#trust-hub" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-sm font-medium tracking-wide text-[#C9A84C] border-b border-white/5">Verification Hub</a>
              <a href="#join-role" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-sm font-medium tracking-wide text-white/80 border-b border-white/5">Partner Roles</a>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-sm font-medium tracking-wide text-white/80 border-b border-white/5" href="/auth/sign-in?returnTo=/home">Sign In</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="mt-2 py-3 rounded-full bg-[#C8284A] text-center text-sm font-bold text-white shadow-xl" href="/auth/sign-up">Get Started</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* 3. CINEMATIC VIDEO BACKGROUND HERO SECTION */}
      <section className="relative min-h-[calc(100vh-76px)] overflow-hidden flex items-center">
        {/* Full Viewport Cinematic Background Video */}
        <div className="absolute inset-0 z-0 w-full h-full">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_094145_4a271a6c-3869-4f1c-8aa7-aeb0cb227994.mp4"
          />
          {/* Ambient tint overlay to make typography pop perfectly */}
          <div className="absolute inset-0 bg-[#0F0A0D]/35 z-0" />
        </div>

        {/* Bottom fading blur mask (Backdrop Blur Over Video) */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            maskImage: "linear-gradient(to top, black 0%, transparent 45%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 45%)",
          }}
        />

        {/* Hero Content */}
        <div className="relative z-20 mx-auto max-w-7xl w-full px-4 py-20 lg:px-8">
          <div className="max-w-3xl">
            <motion.div
              custom={0}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={blurFadeUp}
            >
              <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#C9A84C]">
                Kenyan beauty marketplace
              </p>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={blurFadeUp}
              className="mt-6 font-display text-5xl font-bold leading-[0.9] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl"
            >
              Beauty, booked
              <span className="block italic text-[#C9A84C] font-normal">beautifully.</span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={blurFadeUp}
              className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg"
            >
              For clients, salons, and professionals who want premium beauty experiences to feel completely clear, verified, and trusted.
            </motion.p>

            {/* Liquid Glass and Accent Action Buttons */}
            <motion.div
              custom={3}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={blurFadeUp}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#C8284A] px-8 text-sm font-semibold uppercase tracking-wider text-white shadow-[0_20px_54px_rgba(200,40,74,0.35)] transition hover:bg-[#E03460] hover:scale-[1.03] btn-press"
                href="/auth/sign-up"
              >
                Create my account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 text-sm font-semibold uppercase tracking-wider text-white/90 backdrop-blur-md transition hover:bg-white/10 hover:border-white/25 hover:scale-[1.03] btn-press"
                href="/auth/sign-in?returnTo=/home"
              >
                Already have an account
              </Link>
            </motion.div>

            {/* Roles Shortcuts */}
            <motion.div
              custom={4}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={blurFadeUp}
              className="mt-10 flex flex-wrap gap-2.5"
            >
              {roleSections.map((role) => (
                <Link
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/5 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10 hover:border-white/15"
                  href={role.href}
                  key={role.label}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: role.accent }} />
                  {role.label}
                </Link>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. SOLID STATS PROOF STRIP */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {proofStats.map(([value, label], idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="rounded-[24px] border border-white/5 bg-[#120B0F]/70 p-6 flex flex-col justify-center items-center text-center backdrop-blur-sm"
            >
              <p className="font-display text-4xl font-bold text-[#FDF7F2] tracking-tight">{value}</p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]/80">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. INTERACTIVE TRUST AND VERIFICATION ZONE (Verified Trust Hub) */}
      <section id="trust-hub" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#BF8C2E]">Verified for your peace of mind</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold leading-tight text-white tracking-tight">
            Safety, verification & <span className="block italic text-[#C8284A] font-normal">absolute trust.</span>
          </h2>
          <p className="mt-4 text-white/70 text-sm">
            We understand that inviting beauty artists to your home or walking into private salons requires absolute security. Click the tabs below to explore how we protect you.
          </p>
        </div>

        {/* Tab Interface */}
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] items-start">
          {/* Tab buttons */}
          <div className="flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveSafetyTab("verification")}
              className={`flex items-center gap-3 shrink-0 rounded-2xl px-5 py-4 text-left transition ${
                activeSafetyTab === "verification"
                  ? "bg-[#C8284A] text-white shadow-lg"
                  : "bg-white/[0.04] border border-white/5 text-white/72 hover:bg-white/[0.08]"
              }`}
            >
              <BadgeCheck className="h-5 w-5 text-current" />
              <div className="text-sm font-semibold tracking-wide">Vetted Artists First</div>
            </button>
            <button
              onClick={() => setActiveSafetyTab("privacy")}
              className={`flex items-center gap-3 shrink-0 rounded-2xl px-5 py-4 text-left transition ${
                activeSafetyTab === "privacy"
                  ? "bg-[#C8284A] text-white shadow-lg"
                  : "bg-white/[0.04] border border-white/5 text-white/72 hover:bg-white/[0.08]"
              }`}
            >
              <Lock className="h-5 w-5 text-current" />
              <div className="text-sm font-semibold tracking-wide">Private by Default</div>
            </button>
            <button
              onClick={() => setActiveSafetyTab("payments")}
              className={`flex items-center gap-3 shrink-0 rounded-2xl px-5 py-4 text-left transition ${
                activeSafetyTab === "payments"
                  ? "bg-[#C8284A] text-white shadow-lg"
                  : "bg-white/[0.04] border border-white/5 text-white/72 hover:bg-white/[0.08]"
              }`}
            >
              <ShieldCheck className="h-5 w-5 text-current" />
              <div className="text-sm font-semibold tracking-wide">Protected Payments</div>
            </button>
          </div>

          {/* Interactive display area with Liquid Glass background */}
          <div className="rounded-[32px] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden min-h-[400px] flex flex-col justify-between">
            {/* Ambient gold glow in top right */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#C9A84C]/10 blur-3xl" />
            
            <AnimatePresence mode="wait">
              {activeSafetyTab === "verification" && (
                <motion.div
                  key="verification"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="grid gap-8 md:grid-cols-[1fr_260px] items-center"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#BF8C2E]/80">Identity & Skill Audits</span>
                    <h3 className="mt-2 text-2xl font-bold text-white font-display">Background checks and portfolio audits.</h3>
                    <p className="mt-4 text-white/70 text-sm leading-relaxed">
                      Every professional listed on Styld goes through an identity verification process. We physically review portfolios and verify qualifications before they can accept bookings. High completion rates and reviews determine their search rank.
                    </p>
                    <ul className="mt-6 flex flex-col gap-3">
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Police Clearance Certificate Verified
                      </li>
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Skills & Portfolio Verification Done
                      </li>
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Host verification & Location Verified
                      </li>
                    </ul>
                  </div>

                  {/* Interactive Visual mock element */}
                  <div className="bg-[#1C1318] border border-white/10 rounded-[24px] p-5 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#C9A84C]">
                        <Image
                          src={imageAssets.braidsPortrait.url}
                          alt="Verified Professional"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          Amina Mwangi
                          <BadgeCheck className="h-3.5 w-3.5 text-[#C9A84C] fill-white/10" />
                        </div>
                        <div className="text-[10px] text-white/50 uppercase tracking-wider">Lash Specialist</div>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-white/5 pt-3 flex justify-between items-center text-[10px] font-semibold text-white/80 uppercase font-mono">
                      <span>Verified Status</span>
                      <span className="text-[#10b981] flex items-center gap-1">
                        ● ACTIVE
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSafetyTab === "privacy" && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="grid gap-8 md:grid-cols-[1fr_260px] items-center"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#BF8C2E]/80">Zero Data Leaks</span>
                    <h3 className="mt-2 text-2xl font-bold text-white font-display">Private communication by default.</h3>
                    <p className="mt-4 text-white/70 text-sm leading-relaxed">
                      Your phone number and exact residence details are masked. We only share approximate locations until a booking is fully accepted. Message securely in our application chat so you never have to hand out personal contacts early.
                    </p>
                    <ul className="mt-6 flex flex-col gap-3">
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Hidden phone contacts
                      </li>
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Encrypted app chat integration
                      </li>
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Shared live location tracking
                      </li>
                    </ul>
                  </div>

                  {/* Interactive Visual mock element */}
                  <div className="bg-[#1C1318] border border-white/10 rounded-[24px] p-5 shadow-2xl">
                    <div className="text-xs font-bold text-white/90 mb-3 font-mono border-b border-white/5 pb-2">Privacy Shield</div>
                    <div className="space-y-3">
                      <div className="bg-white/5 p-2 rounded-xl text-[10px] text-white/70 font-mono">
                        Phone: <span className="text-white font-bold">●●●-●●●-842</span>
                      </div>
                      <div className="bg-[#C8284A]/10 p-3 rounded-xl border border-[#C8284A]/30 flex items-start gap-2.5">
                        <Lock className="h-3.5 w-3.5 text-[#C8284A] shrink-0 mt-0.5" />
                        <span className="text-[9px] text-white/80 leading-relaxed font-sans">Contact details remain hidden until booking confirmation.</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSafetyTab === "payments" && (
                <motion.div
                  key="payments"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="grid gap-8 md:grid-cols-[1fr_260px] items-center"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#BF8C2E]/80">Protected Escrow</span>
                    <h3 className="mt-2 text-2xl font-bold text-white font-display">Pay securely. Pay after completion.</h3>
                    <p className="mt-4 text-white/70 text-sm leading-relaxed">
                      Funds are charged at booking, but securely held. They are only released to the professional after the service is marked as complete and approved by you. If something goes wrong, our dispute support protects you instantly.
                    </p>
                    <ul className="mt-6 flex flex-col gap-3">
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Secure Mobile Money (M-Pesa) integration
                      </li>
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Refund guarantee on cancellations
                      </li>
                      <li className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
                        <Check className="h-4 w-4 text-[#C9A84C]" /> Zero cash-handling worries
                      </li>
                    </ul>
                  </div>

                  {/* Interactive Visual mock element */}
                  <div className="bg-[#1C1318] border border-white/10 rounded-[24px] p-5 shadow-2xl text-center">
                    <ShieldCheck className="h-10 w-10 text-[#C9A84C] mx-auto" />
                    <div className="text-xs font-bold text-white mt-2">M-Pesa Holding Shield</div>
                    <div className="text-[9px] text-white/50 uppercase tracking-widest mt-1">Status: SECURE</div>
                    <div className="mt-4 bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/25 py-2 px-3 rounded-lg text-[10px] font-bold font-mono">
                      KES 4,500 HELD SAFELY
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 6. PARTNER ROLE CARD SHAPE CAROUSEL / HIGHLIGHT GRID */}
      <section id="join-role" className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C9A84C]">Select Your Journey</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-white tracking-tight">
            Designed for <span className="italic text-[#BF8C2E] font-normal">every player</span> in beauty.
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {roleSections.map((role, idx) => {
            const Icon = role.icon;
            return (
              <motion.article
                key={role.label}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.6 }}
                className="group relative overflow-hidden rounded-[36px] border border-white/5 bg-[#120B0F] p-6 sm:p-8 flex flex-col justify-between min-h-[500px] transition hover:border-[#C9A84C]/40 hover:translate-y-[-4px]"
              >
                {/* Image card wrapper */}
                <div className="relative h-48 w-full rounded-2xl overflow-hidden mb-6">
                  <Image
                    alt={role.image.alt}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    fill
                    src={role.image.url}
                    style={{ objectPosition: role.image.position }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#120B0F]/90 via-[#120B0F]/20 to-transparent" />
                  
                  {/* Category icon */}
                  <span
                    className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full text-white backdrop-blur shadow-lg"
                    style={{ backgroundColor: role.accent }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                </div>

                {/* Typography and copy */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: role.accent }}>{role.label}</p>
                    <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-white group-hover:text-[#C9A84C] transition">
                      {role.title}
                    </h3>
                    <p className="mt-3 text-white/70 text-xs leading-relaxed">{role.copy}</p>

                    {/* Check badges */}
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {role.highlights.map((highlight) => (
                        <span
                          className="rounded-full border border-white/5 bg-white/[0.04] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white/60"
                          key={highlight}
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Call to action */}
                  <Link
                    className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 text-xs font-bold uppercase tracking-wider text-white transition hover:brightness-110 hover:scale-102 active:scale-98"
                    href={role.href}
                    style={{ backgroundColor: role.accent }}
                  >
                    {role.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* 7. HOW IT WORKS FLOW STEP DISPLAY */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
        <div className="rounded-[40px] border border-white/5 bg-[#120B0F]/60 backdrop-blur-md p-8 text-[#FDF7F2] sm:p-12">
          <div className="grid gap-12 lg:grid-cols-[280px_1fr] items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A84C]">The Journey</p>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl font-bold leading-tight">
                A calm, five-tap path.
              </h2>
              <p className="mt-4 text-white/60 text-xs leading-relaxed">
                Booking premium beauty shouldn&apos;t feel stressful. We&apos;ve designed our process to keep you protected from your very first tap to appointment completion.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map((step, index) => (
                <motion.div
                  className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5 shadow-[0_12px_24px_rgba(0,0,0,0.18)] flex flex-col justify-between"
                  key={step.number}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                      index === steps.length - 1 ? "bg-[#C8284A] text-white" : "border border-[#C9A84C]/40 text-[#C9A84C]"
                    }`}
                  >
                    {step.number}
                  </span>
                  <div className="mt-6">
                    <p className="text-sm font-bold leading-6 text-white">{step.title}</p>
                    <p className="mt-1 text-xs text-[#BF8C2E] font-medium uppercase tracking-wider">{step.copy}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION DEEP PINK/ACCENT CARD */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center lg:px-8">
        <div className="rounded-[44px] border border-white/5 bg-[linear-gradient(135deg,#120B0F,#26121C_52%,#070406)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.4)] sm:p-14 relative overflow-hidden">
          
          {/* Subtle star particle detail */}
          <Sparkle className="absolute top-10 left-10 text-[#BF8C2E]/25 h-12 w-12 animate-pulse" />
          <Sparkle className="absolute bottom-10 right-10 text-[#BF8C2E]/25 h-12 w-12 animate-pulse" />

          <Gem className="mx-auto h-10 w-10 text-[#C9A84C] mb-6" />
          <h2 className="font-display text-4xl sm:text-6xl font-bold leading-tight text-white tracking-tight">
            Ready to step in?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/72">
            Book trusted beauty professionals, list your premium salon, or build your independent reputation.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C8284A] px-8 text-xs font-bold uppercase tracking-wider text-white shadow-[0_12px_28px_rgba(200,40,74,0.3)] transition hover:bg-[#E03460] hover:scale-105 active:scale-95 btn-press"
              href="/auth/sign-up"
            >
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 btn-press"
              href="/auth/sign-in?returnTo=/home"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FOOTER SECTION */}
      <footer className="border-t border-white/5 bg-[#0F0A0D]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 text-xs text-white/50 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="font-display text-2xl text-white font-bold tracking-tight">
            <span className="text-[#C9A84C]">Sty</span>ld
          </p>
          <div className="flex flex-wrap gap-6 font-semibold uppercase tracking-wider">
            <Link className="hover:text-white transition" href="/privacy">Privacy</Link>
            <Link className="hover:text-white transition" href="/terms">Terms</Link>
            <Link className="hover:text-white transition" href="/help">Contact</Link>
            <Link className="hover:text-white transition" href="/help">Help</Link>
          </div>
          <p className="font-mono text-[10px]">© 2026 Styld. Kenya&apos;s Trusted Beauty Access.</p>
        </div>
      </footer>
    </div>
  );
}
