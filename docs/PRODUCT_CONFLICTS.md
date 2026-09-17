# STYLD — Product Conflict Register

This document registers and resolves architectural, business, and branding discrepancies discovered across historical Mobile Salon files, legacy AI transcripts, outdated design mockups, and the authoritative production strategy.

---

## 1. Brand Identity & Visual System

| Dimension | Historical / Legacy Claims | Authoritative STYLD Reality | Resolution / Status |
| :--- | :--- | :--- | :--- |
| **Brand Name** | "Mobile Salon", "Mobile Salon Escrow", "MobileSalon" | **STYLD** (Nairobi-first trusted beauty marketplace) | **Resolved**. All active user-facing UI, metadata, and communications use STYLD. "Mobile Salon" is retained only in non-active legacy Android code as historical reference. |
| **Color Palette** | Navy `#0A192F`, Magenta `#FF007F`, Purple/Lilac accents, Mauve/Gold gradients | **STYLD Logo Book v2.0**: Deep Ink `#1D1D1B`, Clay `#C0A090`, Sage `#909888`, Pure White `#FFFFFF` | **Resolved**. Authoritative semantic tokens defined in `app/globals.css`. Contrast meets WCAG AA standards. |
| **Logo Artwork** | Programmatic text renderings, emoji icons, CSS approximations | Exported vector mark and logotype directly from Logo Book v2.0 | **Resolved**. Reconstructed text logos deprecated in favor of official brand vector assets. |

---

## 2. Payments & Financial Architecture

| Dimension | Historical / Legacy Claims | Authoritative STYLD Reality | Resolution / Status |
| :--- | :--- | :--- | :--- |
| **Escrow & Wallet** | "Funds held safely in Mobile Salon Escrow and released after client verification" | **No Live Escrow Rails**. Primary market direction is M-Pesa. Client pays provider directly or via M-Pesa STK push when live payment rail is activated. | **Resolved**. Deceptive "escrow protected" and "wallet release" claims completely removed from onboarding and checkout UI. |
| **Commission Model** | Hardcoded 15% / 20% platform commission with KES 250 fee | Business commission policy is founder/commercial territory and not finalized for beta. | **Resolved**. Hardcoded speculative commission math removed from client calculations. Booking totals reflect provider listed price. |
| **Payment Gateways** | Multi-currency credit card checkout simulation | Nairobi-first M-Pesa integration architecture. Card/Stripe planned for future pan-African expansion. | **Resolved**. Payments gated behind `FEATURES.PAYMENTS_LIVE = false` until commercial licensing and M-Pesa Daraja production credentials are approved. |

---

## 3. Roles, Verification & Onboarding

| Dimension | Historical / Legacy Claims | Authoritative STYLD Reality | Resolution / Status |
| :--- | :--- | :--- | :--- |
| **User Sign-up Flow** | Required role selection (Client vs Stylist) *before* phone verification | Phone verification happens first (WhatsApp OTP). All accounts default to `client`. Business roles ("Joining Styld for business?") selected post-verification. | **Resolved**. Flow: Phone → WhatsApp Code → Verify → First Name → Client Home. In-app entry points allow requesting Professional or Salon profile upgrade. |
| **Verification Semantics**| Single overloaded `is_verified: boolean` flag | Multi-dimensional verification: `phone_verified`, `identity_verified`, `provider_verified`, `salon_verified`, with lifecycle status (`not_started`, `pending`, `needs_action`, `approved`, `rejected`, `suspended`). | **Resolved**. Schema migration `002_trust_and_safety.sql` establishes explicit verification fields. Badges only render upon legitimate approval. |
| **Surface Scope** | Simultaneous launch of Client booking, Retail Shop ("Counter"), and Courier Delivery | Focused 30-Day Nairobi Beta: Discovery, verified profiles, booking request/accept/complete, reviews, and admin moderation. | **Resolved**. Shop, Delivery, and Counter are feature-gated (`FEATURES.SHOP = false`, `FEATURES.DELIVERY = false`, `FEATURES.COUNTER = false`) with middleware interception. |

---

## 4. Reviews & Reputation

| Dimension | Historical / Legacy Claims | Authoritative STYLD Reality | Resolution / Status |
| :--- | :--- | :--- | :--- |
| **Review Eligibility** | Arbitrary review submission or simulated ratings | Strict review eligibility: Authenticated client session + verified completed booking belonging to that client + max 1 review per booking. | **Resolved**. Implemented in `app/api/reviews/route.ts`. Zero fabricated ratings or review counts in production. |
