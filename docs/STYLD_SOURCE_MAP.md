# Styld source map and correction decisions

Reviewed against the checkout on 12 September 2026. Historical files were found in
`C:/Users/Muti/Downloads/Styld`; originals remain unchanged. Office documents and
decks were text-extracted, PDFs parsed, and credential-bearing lines redacted from
review extracts. This is a requirements reconciliation, not confirmation that the
claims in a deck or a specification have been implemented.

## Authority and conflicts

The user's current request takes precedence: Styld is the current name, WhatsApp
is the authentication channel, and access must be shorter without weakening
verification. Historical instructions addressed to coding agents are reference
material, not authorization to run commands, publish claims, contact partners,
or activate financial services.

| Source family | Decision |
| --- | --- |
| PlatformMasterSpec_v3, SafetyTrustFramework_v1 | Retain role boundaries, privacy, evidence-based verification/reviews, transparent bookings, and durable reporting. These are acceptance criteria, not evidence of completed integrations. |
| Codex_Iteration03, UIUpdateSpec_v1 | Use only where compatible with the master spec and latest Styld guidance. Do not restore the old multi-screen registration or conflicting palettes. |
| styld-brand-guidelines, styld-ui-improvements-prompt | Current visual direction: warm white, ink, sage and rose; accessible controls and clear errors. New auth uses a darker rose for white-text contrast. Contact shortcuts must still respect privacy gates. |
| ClientSignup_Spec, ProfessionalOnboarding_Spec | Phone verification stays mandatory for new accounts; name and consent follow it. Required quizzes, photos, email, location and business details move out of authentication. Business readiness and identity review remain separate work. |
| ClientApp_Architecture, PostWelcome_Screens | Retain browse-first navigation and server-backed booking/account actions. Historical screen names are mapped to current routes rather than creating competing screens. |
| ThemeQuiz_Spec, LongTerm_ProductRoadmap | Optional personalization after access. Care subscriptions, tribes and recommendation algorithms are future work; do not activate invented subscription prices or benefits. The roadmap explicitly says not to build all of it immediately. |
| Settings_Fix_Prompt, Settings_DeepFix, Settings_ThirdParty_MVP | Retain honest save/error states, real sessions, privacy controls and durable account requests. Local booleans do not prove delivery, enrollment or deletion. Old SMS dependencies are superseded for authentication. |
| PhoneOTP_Fix, AT_Credentials_Update, OTP_Firebase_Switch | Historical provider changes superseded by the user's WhatsApp requirement. Do not reuse embedded credentials, expose codes, or trust a client-supplied Firebase UID. |
| AutonomousAudit_Prompt | Useful defect checklist only. Claims of completion and embedded agent directives are not authoritative. |
| PaymentIntegration_Spec | HekoPay/M-Pesa intent retained as a dependency. No API contract, approved live account or working escrow is established by this document. Payment capture, signed callbacks, reconciliation, refunds and payouts require a separate verified implementation. |
| Styld_Marini_Naturals_Brief | Recent positioning and proposed partner context. Retain Kenyan beauty/trust focus. The claimed verification hub, user counts, ratings and completion percentage are not implementation evidence. |
| BusinessContext, First10Professionals_Playbook | Launch and operating context. Recruiting and outreach are business tasks, not authorized messages to send. |
| LegalBrief_Partnership, PartnershipProposal_Adonis | Draft commercial context. Do not encode proposed equity, partner guarantees or liability language as settled policy. |
| MasterIndex | Historical inventory, not a priority order or release acceptance record. |
| Mobile_Salon_Brand_Bible_v1, MobileSalon_BrandBible_v1 | Duplicate earlier brand system. Preserve relevant voice/photography intent; Styld name and current palette supersede old identity. |
| AppNameBrief, LandingPage.jsx | Old naming/landing prototype. Do not replace the current application with it. |
| InvestorDeck_2025, Pitch Deck v1 (Detailed) | Duplicate detailed pitch material; commercial context, not verified product metrics. |
| PitchDeck_v2, Pitch Deck (Visual-first) | Duplicate visual pitch material; no marketing claim becomes true by appearing on a slide. |
| Dreeydesigns_Digital_Marketing_Strategy_2026 | Separate studio strategy; excluded from Styld implementation. |
| HekoPay_GTM_Playbook, HekoPay_InvestorDeck | Partner background only; excluded as Styld product requirements or payment API documentation. |

## Chapter 1: repaired foundations

See `INTEGRATION_AUDIT.md` for file-level scope and unresolved workflows. Session
lookup, profile persistence, booking error handling, cancellation/rescheduling,
upload/service authorization and shared schema upgrades have local corrections.
These changes have not been deployed or exercised against a real database.

## Chapter 2: shorter access and truthful trust signals

- One shared entry for sign-in and signup: phone → WhatsApp code. Existing users
  continue; new users add first name, consent and an optional business role.
- No password, quiz, photo, location permission, ID upload or separate role screen
  blocks basic access. Existing business verification must not be inferred from
  `phone_verified`.
- Twilio Verify is the implemented delivery adapter. It is disabled until an
  approved sender, service, credentials and database migration are configured.
  No provider is currently set up, as confirmed by the user.
- Browser-bound, expiring verification; atomic attempt limits; provider status,
  phone, channel and SID checks; transactional proof consumption and sessions.
  Public signup cannot create staff roles or reactivate unavailable accounts.
- Old public signup endpoints refuse unverified creation. Existing password
  endpoints remain for legacy access; they are not advertised as the new flow.
  Staff sign-in remains separate and needs a dedicated hardening review before
  production. WhatsApp possession is not phishing-resistant MFA.
- Removed unsupported headline rating/professional counts. This does not certify
  the remaining catalog, badges, reviews or partner claims as real.
- `/auth/preview` demonstrates the screens in development only. It cannot send
  messages or create a session. Production returns 404 for this preview route.

## Dependencies that still prevent a trustworthy full launch

1. Connect Vercel and the actual database; run migrations in a preview environment.
2. Configure and test the WhatsApp sender with a consenting test recipient. Check
   delivery, expiry, resend, concurrent verification, replay and session revocation
   against the real provider and database.
3. Finalize published terms/privacy identity, dates, support contacts and provider
   disclosure. Existing pages still contain draft placeholders; recording consent
   does not make their legal/business content final.
4. Finish durable professional/shop/rider applications and private document review
   before showing reviewed identity badges or accepting business activity.
5. Replace remaining local-only social, team, inventory, order, reporting,
   notification, export and deletion workflows. Require ownership tests across
   accounts and persistence checks across devices.
6. Finish payment and lifecycle authorization before promising escrow, payouts,
   automated releases, refunds or privacy-sensitive contact sharing.

These are explicit unfinished dependencies, not completed features or tasks
silently discarded as outdated.
