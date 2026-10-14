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

Styld uses a restrained warm-neutral palette that feels human, secure, and luxurious without the sterility of cold technology tools. The shipped web application is **light mode only**. `app/globals.css` is the source of truth for the active token values; this guide describes those current values, including the extended semantic colors needed for contrast and UI states.

### Core Identity Colors (Logo Book v2.0)
- **Deep Ink** (`#1D1D1B` / `--color-ink`): Primary brand anchor for primary text, primary actions, navigation, and visual grounding.
- **Clay** (`#C0A090` / `--color-clay`): Warm brand accent for highlights, selection, progress, and interactive accents. Use the darker accessible clay text token for text on light surfaces.
- **Sage** (`#909888` / `--color-sage`): Earthy green used for trust indicators and the trust pill; it is also the informational color, not the success token.
- **White** (`#FFFFFF` / `--color-white`): Elevated cards, form surfaces, and crisp contrast.

### Canonical Surfaces

| Token | Shipped value | Usage |
|:------|:-----|:------|
| `--bg-page` / `--bg-canvas` / `--background` | `#FAF8F5` | Warm editorial page canvas. |
| `--bg-surface` / `--surface-card` / `--card-bg` | `#FFFFFF` | Default card, modal, and elevated white surface. |
| `--bg-surface-raised` / `--surface-elevated` | `#F4F1EC` | Raised/grouped controls, secondary panels, and action hover. |
| `--bg-surface-sunken` | `#EFECE6` | Sunken surface and secondary-action hover. |
| `--bg-surface-subtle` | `rgba(29, 29, 27, 0.04)` | Quiet ink-tinted grouping. |
| `--bg-overlay` | `rgba(29, 29, 27, 0.78)` | Dimmed overlay surface. |

### Text Hierarchy

| Token | Shipped value | Usage |
|:------|:-----|:------|
| `--text-primary` | `#1D1D1B` | Primary text and headings. |
| `--text-secondary` | `#4F4B48` | Supporting text and captions; the `--color-secondary` compatibility alias intentionally resolves here. |
| `--text-muted` | `#6E6966` | Tertiary text and placeholders. |
| `--text-disabled` | `#A39E9B` | Disabled text only; do not use for essential content. |
| `--text-inverse` | `#FFFFFF` | Text on ink/dark surfaces. |
| `--text-link` / `--color-clay-text` | `#875945` | Readable clay-toned links and text accents; documented as 4.7:1 against white. |

### Actions and Semantic States

| Token | Shipped value | Usage |
|:------|:-----|:------|
| `--action-primary-bg` / `--color-primary` | `#1D1D1B` | Primary button fill and key action. |
| `--action-primary-text` | `#FFFFFF` | Foreground on the primary action. |
| `--action-primary-hover` / `--color-primary-hover` | `#333330` | Primary action hover. |
| `--action-secondary-bg` | `#FFFFFF` | Secondary action fill. |
| `--action-secondary-text` | `#1D1D1B` | Secondary action foreground. |
| `--action-secondary-hover` | `#F4F1EC` | Secondary action hover. |
| `--action-ghost-text` | `#1D1D1B` | Ghost action foreground. |
| `--action-disabled-bg` | `rgba(29, 29, 27, 0.08)` | Disabled action background. |
| `--action-disabled-text` | `#7A7571` | Disabled action foreground. |
| `--color-success` | `#2E6930` | Success and confirmation states. |
| `--color-warning` | `#B38600` | Warning, attention, and rating-star states. |
| `--color-warning-bg` | `rgba(201, 168, 76, 0.16)` | Soft warning background. |
| `--color-error` | `#BA1A1A` | Error and destructive states. |
| `--color-info` | `var(--color-sage)` (`#909888`) | Informational state. |

`--color-secondary-hover` remains a compatibility token with value `#333330`; for new UI, use the explicit action tokens above rather than ambiguous `color-secondary` names.

### Forms, Navigation, and Borders

| Token | Shipped value | Usage |
|:------|:-----|:------|
| `--input-bg` | `#F4F1EC` | Input background. |
| `--input-text` | `#1D1D1B` | Input text. |
| `--input-placeholder` | `#6E6966` | Placeholder text. |
| `--input-border` | `rgba(29, 29, 27, 0.20)` | Default input border. |
| `--input-border-focus` | `var(--color-clay)` | Input focus border. |
| `--header-bg` / `--nav-bg` | `rgba(250, 248, 245, 0.94)` | Translucent warm header and nav backing. |
| `--nav-pill-bg` | `#FFFFFF` | Floating navigation pill. |
| `--nav-text-muted` | `#5C5855` | Muted navigation label. |
| `--header-nav-active-bg` / `--nav-active-bg` | `#1D1D1B` | Active navigation item. |
| `--header-nav-active-text` / `--nav-active-text` | `#FFFFFF` | Active navigation foreground. |
| `--border-subtle` | `rgba(29, 29, 27, 0.12)` | Subtle card, header, and divider border. |
| `--border-default` | `rgba(29, 29, 27, 0.22)` | Default border and divider. |
| `--border-strong` | `rgba(29, 29, 27, 0.38)` | Strong divider and hover border. |
| `--color-border` | `var(--border-default)` | Compatibility alias for the default border. |

### Focus & Accessibility
- In the normal light theme, `--focus-ring` resolves to `var(--color-clay)` (`#C0A090`) and `--focus-ring-offset` resolves to `var(--bg-page)` (`#FAF8F5`). `:focus-visible` uses a 2px solid outline with a 2px offset.
- The high-contrast setting darkens secondary/muted text and borders. **Known implementation conflict:** its `html[data-high-contrast="true"]` rule currently assigns a complete box-shadow value to `--focus-ring`, but `:focus-visible` consumes that variable as an outline color. The outline becomes invalid and disappears in high-contrast mode. Keep this documented as a defect until the code separates the ring color from any shadow token.
- The app pins native controls to `color-scheme: light`; it does not support a dark theme or follow the operating system's dark-mode setting.

### Special Surfaces (Footers & Trust Elements)
- `--footer-bg`: `var(--color-ink)` (`#1D1D1B`); `--footer-text`: `#FAF8F5`.
- `--trust-pill-bg`: `var(--color-sage)` (`#909888`); `--trust-pill-text`: `var(--color-white)` (`#FFFFFF`).

### Typography
- `--font-sans`: "DM Sans", "Aptos", "Segoe UI", sans-serif — body and UI text. DM Sans is loaded at weights 400–700.
- `--font-display`: "Playfair Display", "Cormorant Garamond", Georgia, serif — headings and editorial display text. Playfair Display is loaded at weights 400, 600, and 700, including the declared italic styles.
- `--font-script`: "Great Vibes", "Dancing Script", "Segoe Script", cursive — decorative accents only. Great Vibes is loaded from Google Fonts.

---

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

Typography is the most critical driver of Styld's premium editorial look. The shipped UI pairs a timeless serif with a modern sans-serif to balance sophistication with legibility:

### Display Typography: Playfair Display
- **Typeface**: Playfair Display, with Cormorant Garamond or Georgia as fallbacks.
- **Weight**: Regular through bold; use medium or semi-bold for display hierarchy.
- **Character**: Timeless, high-fashion, confident, and structured.
- **Usage**: Large section headings, prices, provider titles, and product headings.
- **Tailwind class**: `.font-display`.

### UI Typography: DM Sans
- **Typeface**: DM Sans, with Aptos, Segoe UI, and generic sans-serif fallbacks.
- **Weight**: Regular, medium, and semi-bold; the shipped font import also includes 700.
- **Character**: Hyper-legible, balanced, neutral, and clean.
- **Usage**: Body text, inputs, buttons, metadata, labels, and microcopy.
- **Tailwind class**: the base sans-serif family.

### Script Accent: Great Vibes
- Use sparingly for decorative accents only; it is not a UI or body-text face.
- **Tailwind class**: `.font-script`.

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
