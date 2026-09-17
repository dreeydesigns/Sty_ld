# STYLD — Design System & Cognitive Architecture
## Nairobi-First Trusted Beauty Access · Behavioral Specification · Engineering Contract

---

## 1. Executive Summary & Product Thesis

**STYLD is not an Instagram, Airbnb, Sephora, Pinterest, or Uber clone.**  
Styld synthesizes the single highest-performing cognitive pattern from each category leader into an integrated, culturally authentic Kenyan beauty economy platform:

| Benchmark Product | Core Cognitive Pattern Borrowed | Styld Translation & Behavioral Implementation |
| :--- | :--- | :--- |
| **Pinterest** | Visual inspiration when intent cannot be articulated | **The Look** as the primary marketplace object ("I want something like this"). |
| **Airbnb** | Trust and psychological safety between strangers | Hero portfolio photography with provenance, identity verification, and clear booking CTA. |
| **Sephora** | Beauty-specific personalized discovery & repeat routines | Category exploration, hair type/skin tone relevance, and seamless reorder behaviour. |
| **Uber** | Transactional clarity & stateful status visibility | One dominant job per state. Answers: *What is happening? What happens next? Who acts next?* |
| **Spotify** | Human personalization, continuity, and shortcuts | Returning users see familiar context immediately: saved looks, previous stylists, 20-second rebook. |
| **Duolingo** | Ethical progress visibility & low-end performance | Celebrate real milestone progress (first booking, profile verification), highly optimized for mid-range Android. |
| **Etsy** | Seller identity, craft provenance, and collections | Favourites/collections ("Wedding hair", "Birthday nails") bridging inspiration to intention. |
| **Booking.com** | Filter transparency & search persistence | Real decision filters: location, price, verified status, service mode (Studio vs. Mobile). |
| **Stripe** | Density without chaos & progressive instructions | Complex marketplace interactions made obvious through disciplined visual hierarchy. |
| **Notion / Linear** | Progressive simplicity & expert accelerators | Novice simplicity on day one; extreme speed and shortcuts for frequent clients and pros. |

### The Five Psychological Transitions
Every screen and interaction in Styld must support five psychological transitions:
$$\text{SEE} \longrightarrow \text{WANT} \longrightarrow \text{TRUST} \longrightarrow \text{COMMIT} \longrightarrow \text{RETURN}$$

Most marketplaces over-focus on **COMMIT**. Styld wins Nairobi by making **SEE**, **WANT**, and **TRUST** exceptional.

---

## 2. The Twenty Design Commandments

These twenty rules govern all UI, UX, copywriting, state machines, and API designs across the Styld platform:

1. **Work before interface**: Photography and craft lead; chrome and navigation recede.
2. **Trust before conversion**: Provide answers to safety and quality before demanding commitment.
3. **Recognition before recall**: Always display a persistent summary of prior decisions; never force users to remember previous steps.
4. **Show before explain**: Visual evidence of work trumps marketing claims every time.
5. **Progressive disclosure before feature overload**: Expose primary actions immediately; reveal secondary depth as relationships grow.
6. **Real proof before marketing claims**: No fabricated reviews, no artificial follower counts, zero fake metrics.
7. **Guest exploration before commitment**: Allow visitors to browse, inspect work, evaluate prices, and verify legitimacy before asking for authentication.
8. **Transparent price before booking**: Display clear KES pricing ranges and inclusions upfront; no hidden checkout fees.
9. **One dominant action per state**: Every screen must have one unambiguous primary action.
10. **Returning users deserve shortcuts**: Never treat a repeat client like a stranger.
11. **Rebooking must be extremely fast**: A first booking may take 2–3 minutes; a repeat booking must take under 30 seconds.
12. **Mobile first; desktop richer**: Mobile is the behavioral source of truth; desktop expands with persistent side-filters, keyboard accelerators, and side-by-side comparisons.
13. **African beauty is the default**: Knotless braids, sisterlocks, natural 4C hair, silk press, cornrows, and Nairobi skin tones are foundational—never categorized as a "niche."
14. **Performance is part of trust**: 300ms latency feels like unreliability. Progressive image loading, WebP compression, and mid-range Android optimization are mandatory.
15. **Accessibility is not optional**: Contrast ratios must strictly exceed WCAG AA (>= 4.5:1) and AAA (>= 7:1) across light and dark modes. Luxury comes from restraint and typography, never faint illegible text.
16. **Personalization must remain controllable**: User preferences and filters must always be editable, transparent, and dismissible.
17. **Notifications must provide utility**: Deliver transactional certainty and genuine schedule updates—never manipulative guilt-tripping or notification spam.
18. **No fake urgency**: Zero artificial countdown timers, fake "Only 1 left" badges, or manipulative dark patterns.
19. **No fabricated social proof**: Only clients with completed, verified appointments may publish reviews.
20. **Optimize completed relationships, not attention**: Styld measures success in completed appointments and loyal client-stylist relationships, not idle screen time.

---

## 3. The Three User Archetypes & Lifecycle States

Styld must never design for a generic "user." The interface dynamically adapts across three distinct cognitive states:

```
           ┌──────────────────────────────────────────┐
           │        1. FIRST-TIME / GUEST             │
           │  • "Is this legitimate?"                 │
           │  • "Can I browse without being forced?"   │
           │  • "What does it cost in Nairobi?"       │
           └────────────────────┬─────────────────────┘
                                │ First Booking Completed
                                ▼
           ┌──────────────────────────────────────────┐
           │        2. RETURNING USER                 │
           │  • "Where was I?"                        │
           │  • "Is my stylist available Saturday?"   │
           │  • "Can I rebook in 20 seconds?"         │
           └────────────────────┬─────────────────────┘
                                │ 3+ Completed Bookings
                                ▼
           ┌──────────────────────────────────────────┐
           │        3. PRO / EXPERT CLIENT            │
           │  • "One-tap rebook"                      │
           │  • "Saved addresses & preferred modes"   │
           │  • "Keyboard shortcuts & batch actions"  │
           └──────────────────────────────────────────┘
```

### A. First-Time / Guest Experience
- **Cognitive Need**: Orientation + Trust + Proof + Autonomy.
- **Rules**:
  - Full access to Discover, Looks, Salons, Professionals, and Portfolios without login.
  - Transparent pricing in KES displayed on every card.
  - Clear provenance of work ("From completed appointment" or "Verified provider upload").
  - Explicit reassurance: *"You are not booking yet"* displayed before any final commitment.
  - Login wall is strictly deferred until a user triggers an action requiring identity: **Save Look / Book Appointment / Send Message / Write Review**.

### B. Returning Client Experience
- **Cognitive Need**: Continuity + Speed + Familiarity.
- **Home Surface Adaptations**:
  - Replaces generic hero banner with a personalized **Continuity Strip**:
    - **Active / Upcoming Booking**: Live status pill ("Confirmed for Saturday 10:00 AM").
    - **Rebook Shortcut**: Card showing last stylist, last service, and instant "Book Again" button.
    - **Saved Looks & Favourites**: Quick access to curated collections.
    - **Recently Viewed**: Pick up exploration without re-searching.

### C. Pro / Expert Client Experience
- **Cognitive Need**: Speed + Keyboard Accelerators + Zero Friction.
- **Features**:
  - 1-click repeat with saved client address and payment preferences.
  - Saved filter presets (e.g. "Kilimani + Studio + Saturdays").
  - Keyboard navigation on desktop (`/` to search, `Esc` to close modals, `J/K` to browse looks).

---

## 4. The Core Marketplace Object: "The Look"

Traditional booking systems treat **"The Service"** as the root entity (e.g. *"Knotless Braids Medium 24 Inch"*).  
Beauty decisions are visual and emotional. A client sees a hairstyle or nail set and thinks: **"I want that."**

Styld elevates **The Look** to a primary marketplace object:

```
┌────────────────────────────────────────────────────────┐
│                      THE LOOK CARD                     │
├────────────────────────────────────────────────────────┤
│  [ High-Resolution Visual Portfolio Image ]            │
│                                                        │
│  ✨ Medium Boho Knotless Braids                        │
│  👤 Styled by Wanjiku N. · Kilimani                    │
│  🛡️ Verified Professional · 4.9 ★ (42 reviews)         │
│  🏷️ From KES 4,500 · ⏱️ Approx. 4 hrs                   │
│  📍 Studio & Mobile Available                          │
│  📅 Next opening: Saturday, 10:00 AM                   │
│                                                        │
│  [  Save to Collection  ]   [  Book This Look →  ]     │
└────────────────────────────────────────────────────────┘
```

### Structured Portfolio Metadata
Every Look is stored as a rich, queryable data entity:
- `look_id`
- `image_url` (responsive WebP with blurhash placeholder)
- `title` & `style_category` (e.g. "Protective Styles", "Loc Maintenance", "Nail Art")
- `hair_type` / `skin_tone` tags (e.g. "4C Natural", "Type 3 Curly", "Deep Melanin")
- `service_id` & base price snapshot in KES
- `estimated_duration_minutes`
- `provider_id` & location zone (e.g. "Kilimani", "Westlands", "Kileleshwa")
- `provenance`: `"verified_completed_booking"` | `"provider_portfolio"` | `"client_tagged"`
- `service_mode`: `"studio"` | `"mobile"` | `"both"`

---

## 5. The Provider Trust Stack

Before booking a beauty professional, every client must subconsciously or consciously answer 11 questions in sequence. The provider profile is structured to resolve this hierarchy without friction:

| Order | Question | Profile Surface Component |
| :---: | :--- | :--- |
| **1** | *Is her work good?* | **Hero Portfolio Grid**: High-resolution gallery with zoom and category filters. |
| **2** | *Is it relevant to me?* | **Look Attributes**: Hair types, lengths, and style tags matched to Kenyan hair & beauty. |
| **3** | *Is this really her work?* | **Provenance Badges**: "Verified Styld Appointment" vs "Provider Upload". |
| **4** | *Is she credible & safe?* | **Identity Verification**: Multi-factor verified badge (Phone, ID, Studio). |
| **5** | *What do other women say?* | **Verified Reviews**: 100% verified completed bookings only with client feedback. |
| **6** | *How much does it cost?* | **Transparent Pricing**: Clear KES prices, package options, no unexpected add-ons. |
| **7** | *How long will it take?* | **Duration Clarity**: Expected time commitment (e.g. "3.5 - 4 hours"). |
| **8** | *Where is she?* | **Location & Studio Details**: Landmark-level zone (Kilimani, Westlands) without exposing private addresses. |
| **9** | *Can she come to my house?* | **Service Mode Pill**: "Studio Only", "Mobile Available", or "Both". |
| **10** | *When is she free?* | **Real-Time Availability**: Next open date/time slots clearly surfaced. |
| **11** | *What if something goes wrong?* | **Safety & Policy Strip**: Cancellation rules, support contact, and incident reporting. |

---

## 6. The Five-Step Booking Engine

The booking funnel guarantees cognitive clarity through **recognition over recall**:

1. **Step 1: Service / Look Selection**:
   - Confirm selected style, length, or add-ons with immediate price update.
2. **Step 2: Professional & Location**:
   - Choose Studio appointment or Mobile home service (with travel fee if applicable).
3. **Step 3: Date & Time**:
   - Select date and time slot from actual live provider availability.
4. **Step 4: Contact & Arrival Details**:
   - Client phone number, address/landmark for mobile appointments, special notes.
5. **Step 5: Review & Request Confirmation**:
   - High-contrast summary card showing: Look, Provider, Date/Time, Location, Price in KES, Cancellation Policy.
   - Action: **"Send Booking Request"** (truthful wording; zero simulated payment/escrow claims).

---

## 7. Ethical Habit Loops vs. Dark Patterns

```
      ┌─────────────────────────────────────────────────────────┐
      │                    1. REAL-WORLD TRIGGER                │
      │  Hair needs redoing, wedding coming up, nails grown out │
      └────────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │                    2. FRICTIONLESS ACTION               │
      │  Open Styld → 20-second Rebook or Look Discovery        │
      └────────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │                    3. GENUINE REWARD                    │
      │  Certainty, transparent pricing, verified stylist       │
      └────────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │                    4. ACCRUED INVESTMENT                │
      │  Saved look collection, verified review, saved address  │
      └─────────────────────────────────────────────────────────┘
```

### Dark Patterns Strictly Banned by Policy:
- ❌ Fake countdown timers ("Book in the next 4 minutes!").
- ❌ Fabricated demand warnings ("37 people are viewing this stylist right now").
- ❌ Guilt-trip retention notifications ("We miss you! You're breaking your beauty streak!").
- ❌ Hidden fees or undisclosed mobile service charges at final checkout.
- ❌ Forced account creation before exploring marketplace value.

---

## 8. Implementation Roadmap (Phases 1–7)

- [x] **Phase 1 — Remove Distrust** *(Completed)*:
  - Fixed root theme contract (34 canonical tokens in `app/globals.css`, zero dark-on-dark text).
  - Fixed interactive onboarding walkthrough (role-based steps, explicit controls).
  - Replaced ad-hoc SMS with real Twilio Verify WhatsApp OTP authentication.
  - Eliminated simulated reviews, fake escrow wording, and fabricated metrics.
  - Passed 72/72 automated regression tests, Next.js build, and typecheck.
- [ ] **Phase 2 — Discovery Clarity & "The Look" Model**:
  - Introduce first-class "Looks" browsing in `app/discover/page.tsx` and home feed.
  - Standardize `LookCard` component with direct "Book this look" action.
  - Connect style tags, hair types, and Nairobi location filters.
- [ ] **Phase 3 — Exceptional Provider Profiles**:
  - Re-architect provider profile around the 11-step Trust Stack.
  - Structured portfolio gallery with provenance markers.
- [ ] **Phase 4 — Frictionless Booking Recap**:
  - Unify the 5-step booking drawer/flow with persistent decision summary.
  - Real-time price breakdown and transparent cancellation terms.
- [ ] **Phase 5 — Continuity & Ethical Retention**:
  - "Book Again" 20-second rebooking card on Home for returning users.
  - Saved Looks collections ("Wedding Hair", "Nails to Try", "Protective Styles").
- [ ] **Phase 6 — Organic Growth Loops**:
  - Shareable Look Cards ("Styled by [Provider] on Styld").
  - Provider portfolio sharing links for WhatsApp status and Instagram bios.
- [ ] **Phase 7 — Telemetry & Psychology Metrics**:
  - Instrument uncertainty metrics: drop-off per booking step, filter reformulations, portfolio view depth.
