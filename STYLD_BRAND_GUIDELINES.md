# STYLD — BRAND GUIDELINES & SPECIFICATION

**Version 2.0** · Nairobi, Kenya · September 2026
*The institutional infrastructure of the social beauty economy. Luxury through subtraction.*

---

## 1. BRAND FOUNDATION & EVOLUTION

### From Mobile Salon to Styld
Styld evolved from the Mobile Salon project. Mobile Salon established a foundation for on-demand beauty services, and **Styld** refines this into a unified, high-end ecosystem built on the principles of trust, dignity, and editorial clarity.

Styld is the **trusted beauty economy platform** that connects:
- **Clients** with reliable, premium services and products.
- **Professionals** with independent, dignified, and structured income.
- **Salons** with modern client acquisition and booking management.
- **Shops** with dedicated sales channels for beauty products.
- **Delivery Partners** with local logistical fulfillment.

We have moved away from the literal "Mobile Salon" name to **Styld**—a name that stands for personal expression, professional craft, and a standardized standard of service.

---

## 2. THE STYLD VALUE SYSTEM

Styld maintains the rock-solid operational core of its predecessor, but frames it in a premium editorial light:

| Core Value | What It Means in Practice |
|:---|:---|
| **Trust is Structural** | Trust is not a feature or a marketing slogan. It is baked into every transactional state. Identity validation, verification badges, escrow mechanisms, and secure communication protect both sides. |
| **Dignified Opportunity** | We don't view beauty professionals as "hustlers" or "freelancers" but as **skilled artisans**. The platform provides tools that respect their labor, schedule, and pricing. |
| **Visual Silence** | We respect our users' attention. There is no decorative clutter, neon gradients, or generic stock beauty illustrations. Whitespace acts as the primary grouping mechanism, presenting content like a curated gallery. |
| **Systematized Simplicity** | Informal, chaotic workflows are streamlined. Booking a premium service or purchasing a curated product is accomplished in a seamless, lightweight 5-step flow. |
| **Local Excellence, Global Scale** | Styld begins with Nairobi's vibrant beauty landscape (optimized for 4C hair, protective styles, and melanin-rich skin) but maintains the structural coherence to scale globally. |

---

## 3. THE VISUAL SYSTEM & COLOR PALETTE

Styld uses a restrained, warm-neutral palette that feels human, secure, and luxurious without the sterility of cold technology tools.

### Core Identity Colors (Logo Book v2.0)
- **Deep Ink** (`#1D1D1B` / `--color-ink`): Primary brand anchor. Used for primary text, deep buttons, navigation, and visual grounding.
- **Clay** (`#C0A090` / `--color-clay`): Warm neutral accent. Used for secondary actions, interactive accents, and subtle highlights.
- **Sage** (`#909888` / `--color-sage`): Earthy green. Used for trust indicators, success states, and the Trust Pill.
- **White** (`#FFFFFF` / `--color-white`): Clean canvas. Used for surfaces, cards, and layout.

### Semantic UI Tokens
All UI colors are derived from the four core identity colors:

| Token | Value | Usage |
|:------|:-----|:------|
| `--color-primary` | `var(--color-ink)` | Primary buttons, key actions |
| `--color-primary-hover` | `#3A3A38` | Hover state for primary actions |
| `--color-secondary` | `var(--color-clay)` | Secondary actions, Clay accents |
| `--color-secondary-hover` | `#A88979` | Hover state for secondary actions |
| `--color-success` | `#4A7C59` | Success states, confirmations |
| `--color-warning` | `#C9A84C` | Warnings, attention states |
| `--color-error` | `#B44A5A` | Errors, destructive actions |
| `--color-info` | `var(--color-sage)` | Informational content |

### Backgrounds & Surfaces

| Token | Light Mode | Dark Mode | Usage |
|:------|:-----------|:---------|:------|
| `--background` | `#FFFFFF` | `#1A1A18` | Page background |
| `--surface-canvas` | `#FFFFFF` | `#1A1A18` | Canvas-level surfaces |
| `--surface-card` | `#FFFFFF` | `#262624` | Card and input backgrounds |
| `--surface-elevated` | `#FAF8F5` | `#2E2E2C` | Elevated surfaces (shadow layers) |

### Text Hierarchy

| Token | Light Mode | Dark Mode | Usage |
|:------|:-----------|:---------|:------|
| `--text-primary` | `var(--color-ink)` | `#FFFFFF` | Primary text |
| `--text-secondary` | `#6B6B6B` | `#B8B8B8` | Secondary text, captions |
| `--text-muted` | `#9A9A9A` | `#7A7A7A` | Muted/disabled text |

### Borders & Dividers

| Token | Light Mode | Dark Mode | Usage |
|:------|:-----------|:---------|:------|
| `--color-border` | `rgba(29, 29, 27, 0.12)` | `rgba(255, 255, 255, 0.1)` | Default borders, subtle dividers |
| `--border-subtle` | `rgba(29, 29, 27, 0.12)` | `rgba(255, 255, 255, 0.1)` | Subtle borders |
| `--border-default` | `rgba(29, 29, 27, 0.2)` | `rgba(255, 255, 255, 0.2)` | Default borders |
| `--border-strong` | `rgba(29, 29, 27, 0.35)` | `rgba(255, 255, 255, 0.35)` | Strong dividers |

### Focus & Accessibility
- `--focus-ring`: `var(--color-clay)` — Focus outline color
- `--focus-ring-offset`: `var(--color-white)` — Focus ring offset

### Special Surfaces (Footers & Trust Elements)
- `--footer-bg`: `var(--color-ink)` (light) / `var(--color-white)` (dark)
- `--footer-text`: `var(--color-white)` (light) / `var(--color-ink)` (dark)
- `--trust-pill-bg`: `var(--color-sage)`
- `--trust-pill-text`: `var(--color-white)` (light) / `var(--color-ink)` (dark)

### Typography
- `--font-sans`: "DM Sans", "Aptos", "Segoe UI", sans-serif — Body and UI text
- `--font-display`: "Playfair Display", "Cormorant Garamond", Georgia, serif — Headings
- `--font-script`: "Great Vibes", "Dancing Script", "Segoe Script", cursive — Accents

---

## 4. LOGO & VISUAL IDENTITY

## 4. LOGO & VISUAL IDENTITY

### Logo Book v2.0
The Styld logo is built entirely as a high-fidelity vector (SVG), ensuring sharp presentation across all mobile and web displays.

### Design Concept
The logo is rendered using the four core identity colors from Logo Book v2.0:

- **Symbol**: An elegant monogram **S** where the top curve loops like a stylized flower petal and the bottom curve integrates with a subtle shield motif.
- **Palette**: **Deep Ink** (`#1D1D1B`) as the primary anchor, **Clay** (`#C0A090`) as the warm accent, and **Sage** (`#909888`) for trust elements.
- **Signature Style**: Beautifully minimal, with balanced line weights and generous negative space around it.

```xml
<!-- SVG Vector Code for Styld Logo Markup (Logo Book v2.0) -->
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Deep Ink circle with Sage inner ring -->
  <path d="M24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C33.9411 42 42 33.9411 42 24C42 14.0589 33.9411 6 24 6Z" fill="#FFFFFF" stroke="#1D1D1B" stroke-width="1.5"/>
  <path d="M21 15.5C21.8284 15.5 22.5 16.1716 22.5 17C22.5 17.8284 21.8284 18.5 21 18.5C20.1716 18.5 19.5 17.8284 19.5 17C19.5 16.1716 20.1716 15.5 21 15.5Z" fill="#909888"/>
  <path d="M27 29.5C27.8284 29.5 28.5 30.1716 28.5 31C28.5 31.8284 27.8284 32.5 27 32.5C26.1716 32.5 25.5 31.8284 25.5 31C25.5 30.1716 26.1716 29.5 27 29.5Z" fill="#909888"/>
  <path d="M19 21.5C19 18.5 21 16.5 24 16.5C27 16.5 29 18.5 29 21.5C29 24.5 26 25.5 24 25.5C22 25.5 19 26.5 19 29.5C19 32.5 21 34.5 24 34.5C27 34.5 29 32.5 29 29.5" stroke="#1D1D1B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M24 13V15" stroke="#909888" stroke-width="2" stroke-linecap="round"/>
  <path d="M24 33V35" stroke="#909888" stroke-width="2" stroke-linecap="round"/>
</svg>
```

---

## 5. TYPOGRAPHY SYSTEM

Typography is the most critical driver of Styld's premium editorial look. We pair a timeless serif with a modern geometric sans-serif to create rhythm and sophistication:

### Display Typography: Playfair Display
- **Typeface**: Playfair Display (or Cormorant Garamond / Georgia)
- **Weight**: Medium or Semi-Bold
- **Character**: Timeless, high-fashion, confident, and structured.
- **Usage**: Large section headers, prices, provider titles, and product headings.
- **Tailwind Class**: `.font-display`

### UI Typography: Inter / DM Sans
- **Typeface**: Inter or DM Sans (or SF Pro / System Sans)
- **Weight**: Regular, Medium, and Semi-Bold
- **Character**: Hyper-legible, balanced, neutral, and clean.
- **Usage**: Body text, inputs, buttons, metadata, labels, and micro-copy.
- **Tailwind Class**: `.font-sans`

---

## 6. VOICE, TONE, & MESSAGING

Our voice is direct, calm, and professional. We never use hype, false urgency, or excessive exclamation points.

- **Bad**: *"OMG!! Grab the hottest braid stylist in Nairobi right now before slots sell out!!! 🏃‍♀️🔥"*
- **Good**: *"Choose a verified styling professional near you. Review availability and secure your booking with platform escrow protection."*

### Brand Dictionary

| Preferred Term | Avoid | Reason |
|:---|:---|:---|
| **Professional / Specialist** | Hustler / Freelancer | Respects the dignity and expertise of the craft. |
| **Secure Escrow / Trust Flow** | Hold / Block | Framed around protection and clarity, not restrictions. |
| **Curated Catalog** | Deals / Promos / Offers | Reinforces quality and high-end curation. |
| **Client Workspace** | Feed / Board | Evokes a premium, organized, personalized application. |

---

## 7. THE FIVE LAWS OF CODE COMPLIANCE

Every developer, designer, and content creator working on the Styld platform is legally bound to enforce these Five Laws:

1. **Law 1: Every button must do exactly what its label says.** No silent clicks. No mock buttons. If it says "Save," it must commit to the database.
2. **Law 2: Every link must resolve to a real page.** No dead anchor tags, `href="#"`, or `javascript:void(0)`.
3. **Law 3: Every form must talk to the backend.** Forms must submit real inputs, validate gracefully, and persist records securely in our Postgres database.
4. **Law 4: Every error must be handled gracefully.** Provide clean, human-readable notifications with recovery options. No raw SQL or stack-trace alerts.
5. **Law 5: Every change must persist.** Session states, user profiles, theme toggles, and bookings must survive refreshes and logins.

---

*Styld.com — Safe beauty access. Real economic opportunity.*
