# STYLD — BRAND GUIDELINES & SPECIFICATION

**Version 2.0** · Nairobi, Kenya · July 2026  
*The institutional infrastructure of the social beauty economy. Luxury through subtraction.*

---

## 1. BRAND FOUNDATION & EVOLUTION

### From Mobile Salon to Styld
Styld is the natural, mature evolution of Mobile Salon. While Mobile Salon established a brilliant foundation for on-demand beauty services, **Styld** elevates this concept into a unified, high-end ecosystem. 

Styld is the **trusted beauty economy platform** that connects:
- **Clients** with reliable, premium services and products.
- **Professionals** with independent, dignified, and structured income.
- **Salons** with modern client acquisition and booking management.
- **Shops** with dedicated sales channels for beauty products.
- **Delivery Partners** with local logistical fulfillment.

We have moved away from the literal and restricted "Mobile Salon" name to **Styld**—a name that stands for personal expression, professional craft, and a standardized standard of service.

---

## 2. THE STYLD VALUE SYSTEM

Styld maintains the rock-solid operational core and trusted parameters of Mobile Salon, but frames them in a premium editorial light:

| Core Value | What It Means in Practice |
|:---|:---|
| **Trust is Structural** | Trust is not a feature or a marketing slogan. It is baked into every transactional state. Identity validation, verification badges, escrow mechanisms, and secure communication protect both sides. |
| **Dignified Opportunity** | We don't view beauty professionals as "hustlers" or "freelancers" but as **skilled artisans**. The platform provides tools that respect their labor, schedule, and pricing. |
| **Visual Silence** | We respect our users' attention. There is no decorative clutter, neon gradients, or generic stock beauty illustrations. Whitespace acts as the primary grouping mechanism, presenting content like a curated gallery. |
| **Systematized Simplicity** | Informal, chaotic workflows are streamlined. Booking a premium service or purchasing a curated product is accomplished in a seamless, lightweight 5-step flow. |
| **Local Excellence, Global Scale** | Styld begins with Nairobi's vibrant beauty landscape (optimized for 4C hair, protective styles, and melanin-rich skin) but maintains the structural coherence to scale globally. |

---

## 3. THE VISUAL SYSTEM & COLOR PALETTE

Styld rejects the sterilizing black-and-white palettes of cold technology tools. Instead, we preserve the **rich, warm, and trustworthy colors** of our original brand guidelines to ensure the platform feels human, secure, and luxurious:

### Primary Brand Colors
- **Editorial Charcoal** (`#1F1F1F` / `--ms-charcoal`): Used for primary text, deep buttons, and visual grounding.
- **Deep Plum** (`#3A183A` / `--ms-plum`): Our primary brand anchor, representing editorial weight, sophistication, and structure.
- **Soft Rose** (`#C8284A` / `--ms-rose`): Our accent of life and energy, used for key actions, status highlights, and active elements.
- **Warm Gold** (`#C9A84C` / `--ms-gold`): Represents quality and value, used for premium badges, ratings, and highlighting verified statuses.

### Ambient & Background Colors
- **Champagne** (`#FBF4EA` / `--ms-champagne`): An ultra-soft, warm ivory used to soften backgrounds and cards.
- **Petal Pink** (`#FFF1F6` / `--ms-petal`): A delicate light rose for verification alerts, feedback tags, and highlighted blocks.
- **Ivory White** (`#FAF6F1` / `--ms-ivory`): Clean, warm canvas tone.
- **Pure Canvas White** (`#FFFFFF`): For cards, inputs, and clean layout surfaces.

### Technical & System Colors
- **Trust Sage** (`#939B8A` / `rgba(163, 177, 138, 1)`): The color of security. Used for the **Trust Pill**, secure escrow notifications, and verified checkmarks.
- **Friction Red** (`#B44A5A` / `--ms-danger`): Subtle, muted red used for errors, cancel alerts, and destructive actions.

---

## 4. TYPOGRAPHY SYSTEM

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

## 5. NEW APPROACH TO LOGO & ICONOGRAPHY

Our new logo is built entirely as a high-fidelity vector (SVG), ensuring sharp presentation across all mobile and web displays. 

### Design Concept
The logo merges the soft, organic flowing curves of beauty (reminiscent of hair locks, cosmetic waves, and flower petals) with a secure, interlocking geometric structure that highlights **systematized trust**.

- **Symbol**: An elegant monogram **S** where the top curve loops like a stylized flower petal and the bottom curve integrates with a subtle shield motif.
- **Palette**: Rendered in a stunning combination of **Deep Plum** (`#3A183A`) and **Warm Gold** (`#C9A84C`).
- **Signature Style**: Beautifully minimal, with balanced line weights and generous negative space around it.

```xml
<!-- SVG Vector Code for Styld Logo Markup -->
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Soft Rose & Gold Interconnected Monogram 'S' -->
  <path d="M24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C33.9411 42 42 33.9411 42 24C42 14.0589 33.9411 6 24 6Z" fill="#FFF1F6" stroke="#3A183A" stroke-width="1.5"/>
  <path d="M21 15.5C21.8284 15.5 22.5 16.1716 22.5 17C22.5 17.8284 21.8284 18.5 21 18.5C20.1716 18.5 19.5 17.8284 19.5 17C19.5 16.1716 20.1716 15.5 21 15.5Z" fill="#C9A84C"/>
  <path d="M27 29.5C27.8284 29.5 28.5 30.1716 28.5 31C28.5 31.8284 27.8284 32.5 27 32.5C26.1716 32.5 25.5 31.8284 25.5 31C25.5 30.1716 26.1716 29.5 27 29.5Z" fill="#C9A84C"/>
  <path d="M19 21.5C19 18.5 21 16.5 24 16.5C27 16.5 29 18.5 29 21.5C29 24.5 26 25.5 24 25.5C22 25.5 19 26.5 19 29.5C19 32.5 21 34.5 24 34.5C27 34.5 29 32.5 29 29.5" stroke="#3A183A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M24 13V15" stroke="#C9A84C" stroke-width="2" stroke-linecap="round"/>
  <path d="M24 33V35" stroke="#C9A84C" stroke-width="2" stroke-linecap="round"/>
</svg>
```

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
