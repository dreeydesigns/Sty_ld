# STYLD — Nairobi-First Trusted Beauty Marketplace

[![Node Test Suite](https://img.shields.io/badge/Tests-67%20Passed-brightgreen)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%20Strict-blue)](tsconfig.json)
[![ESLint](https://img.shields.io/badge/ESLint-Clean-success)](.eslintrc.json)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black)](next.config.mjs)

STYLD is a Nairobi-first trusted beauty economy platform connecting clients with verified beauty professionals and selected salons.

- **Repository**: [https://github.com/dreeydesigns/Sty_ld](https://github.com/dreeydesigns/Sty_ld)
- **Staging / Test Environment**: [https://sty-ld.vercel.app/](https://sty-ld.vercel.app/)

---

## Authoritative Visual Identity

Governance: **STYLD Logo Book v2.0**

- **Deep Ink** (`#1D1D1B`): Primary typography, contrast anchors, dark mode foundation.
- **Clay** (`#C0A090`): Primary accent, brand warmth, highlights.
- **Sage** (`#909888`): Trust badge indicator, natural elegance.
- **White** (`#FFFFFF`): Crisp elevated surfaces, cards.
- **Warm Editorial Canvas** (`#FAF8F5`): Semantic light background.

All active user-facing UI surfaces conform to WCAG AA contrast standards across light and dark themes.

---

## Architecture & Subsystems

1. **Authentication & Identity**:
   - Primary: **Twilio Verify v2** delivering official Meta WhatsApp authentication templates with native "Copy code" buttons.
   - Fallback: Development sandbox mode (`WHATSAPP_DEV_MODE=true` with mock OTP `123456`) and legacy password authentication.
2. **Server-Authoritative Booking Engine**:
   - 9-state lifecycle: `draft` → `requested` → `accepted` / `declined` → `scheduled` → `in_progress` → `completed` → `disputed`.
   - Role-based transition validation and idempotency key locking.
3. **Trust & Safety**:
   - Authentic review gating: Reviews permitted strictly after service completion by the verified booking client (zero fabricated counts).
   - User reporting and user-to-user blocking endpoints.
4. **Feature Gating**:
   - 30-Day Beta surfaces: Client discovery, provider portfolios, booking, reviews, and admin moderation.
   - Retail Counter (`/counter`), Shop (`/shop`), and Delivery (`/delivery`) are gated at the middleware layer.
5. **Analytics & Data Science**:
   - Standardized event taxonomy (`AUTH`, `DISCOVERY`, `BOOKING`, `TRUST`, `ONBOARDING`).
   - Deep PII and credential sanitization before logging or persistence.

---

## Local Development Setup

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL database (local or Neon branch)

### Quick Start

```powershell
# 1. Clone repository
git clone https://github.com/dreeydesigns/Sty_ld.git
cd Sty_ld

# 2. Configure environment
Copy-Item .env.example .env.local

# 3. Run test suite
node --test tests/*.cjs

# 4. Run TypeScript check
node node_modules/typescript/bin/tsc --noEmit

# 5. Start dev server
npm run dev
```

---

## Quality & Release Gates

All quality gates must pass cleanly before any code reaches production:

| Gate | Execution Command | Standard |
| :--- | :--- | :--- |
| **Unit & Regression Tests** | `node --test tests/*.cjs` | 100% passing (67/67 green) |
| **TypeScript Validation** | `node node_modules/typescript/bin/tsc --noEmit` | Exit code 0 |
| **ESLint Check** | `node node_modules/eslint/bin/eslint.js app components lib middleware.ts --ext .ts,.tsx` | 0 errors |
| **Next.js Production Build** | `node node_modules/next/dist/bin/next build` | Exit code 0 (`.next/BUILD_ID`) |

---

## Documentation Library

- [Architecture & Trust Boundaries](docs/ARCHITECTURE.md)
- [REST API Contracts](docs/API_CONTRACTS.md)
- [Environment Variable Matrix](docs/ENV_MATRIX.md)
- [Product Conflict Register](docs/PRODUCT_CONFLICTS.md)
- [Production Release Risk Register](docs/RELEASE_RISKS.md)
- [WhatsApp Setup Guide](docs/WHATSAPP_SETUP.md)
