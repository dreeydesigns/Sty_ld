# STYLD MVP backlog execution matrix

## Recovered backlog source

- Recovered file: `C:\Users\Muti\Downloads\STYLD_MVP_Backlog.md`
- Recovered master index: `C:\Users\Muti\Downloads\STYLD_Backlog_Master_Index.md`
- Repository search found no `STYLD_MVP_Backlog.md` in the worktree or accessible Git branches.
- Recovered source date: 14 October 2026.
- Recovered source status: provisional MVP candidates for founder review, not authorization to implement.
- IDEA-009 remains deferred pending the six-person paper test.

## Current baseline

- Repository: `dreeydesigns/Sty_ld`
- Branch: `work/pre-mvp-closeout-20261016`
- Latest verified published SHA: `65e0b816853ff2c9aa38c47e5fc4c21933325e1b`
- Working tree before this document: clean.

## Candidate status summary

| ID | Feature | Proposed sprint | Specification status | Existing implementation status | Authorization status |
|---|---|---:|---|---|---|
| IDEA-001 | Multi-person service planning preview | 3 | Recovered as MVP design candidate only | Partial: single-person estimate planning and draft persistence exist; no number-of-people input | Deferred / not approved |
| IDEA-002 | First Visit and unified UI/UX direction | 1 | Recovered as MVP design candidate only; Figma twelve-screen reference unavailable | Substantial: public landing, guest home, unified navigation, role tours, plan and profile flows exist | Deferred / not approved |
| IDEA-003 | Save-first social interactions | 2 | Recovered as conditional MVP candidate | Partial: social surfaces and honest unavailable states exist; live save/comment/share are fail-closed | Deferred / not approved |
| IDEA-005 | Basic creator and portfolio uploads | 4 | Recovered as conditional MVP candidate | Partial: upload route and profile/portfolio surfaces exist; persistent owner-controlled media workflow not verified | Deferred / not approved |
| IDEA-006 | Beauty Careers and basic hiring | 5 | Recovered as conditional MVP candidate | Not implemented: no career or hiring workflow found | Deferred / not approved |
| IDEA-008 | Connected beauty discovery and opportunity journey | 6 | Recovered as philosophy candidate | Partial: role-aware navigation and discovery-to-plan links exist | Deferred / not approved |
| IDEA-009 | Person, Place and Chair onboarding and salon teams | 7 | Recovered as deferred discussion | Deferred by founder decision; no implementation authorized | Deferred / not approved |

## Execution matrix

| ID | Objective | Approved MVP scope, if verified | Dependencies | Required roles | Authorization and data ownership | Database and API implications | UI components affected | Acceptance criteria | Regression tests | Browser QA requirements | Blockers | Proposed sprint | Approval status |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| IDEA-001 | Explore planning for more than one person without claiming live booking | Optional number-of-people input in the non-committal planning preview and a readable visit summary | Existing plan service pool, plan draft persistence, provider context sanitization | Client, guest where supported | Planning inputs must not imply availability, capacity or provider authorization | No new schema; existing plan context and draft storage only | `components/appointment-planning.tsx`, plan draft utilities, discover entry links | Number-of-people input is optional; summary is readable; no live group booking, availability, pricing, staff capacity or child-service authorization is claimed | Plan context sanitization, draft persistence, invalid provider handling, selected service totals | Desktop and mobile planning flow, keyboard and focus | MVP scope is design-only and deferred; no founder approval to implement | 3 | Deferred / not approved |
| IDEA-002 | Evaluate the First Visit visual direction and guest-first flow | Review navigation, scannability and honest preview states; preserve the long-form landing experience | Public landing, guest home, unified navigation, role onboarding tours, plan and profile flows | Guest, client, professional, salon | No authorization change; guest experience must remain honest and non-committal | No database or API change expected | `components/landing-client.tsx`, `components/guest-home.tsx`, `components/marketplace-ui.tsx`, `components/onboarding-tour.tsx`, `app/home/page.tsx`, `app/discover/page.tsx`, `app/book/page.tsx`, `app/profile/page.tsx` | Figma reference is a reference, not replacement approval; no fake listings, confirmation or working OTP assumptions; landing stays long-form | Landing UI integrity, onboarding tour authorization and truthful copy, unified navigation, guest home empty states | Desktop and mobile landing, home, discover, plan and profile | Figma twelve-screen reference unavailable; detailed acceptance criteria unavailable; browser QA not run | 1 | Deferred / not approved |
| IDEA-003 | Define minimal save-first social interactions | Specify Save, Comment and Share with private saved collections; comment Likes only; report and hide safeguards | Secure account-isolated server storage, genuine counts, ownership and moderation | Client, professional, salon where applicable | Account isolation and moderation are prerequisites; no cross-account data leakage | Requires approved storage, ownership and moderation APIs before live use | `components/social-home.tsx`, social APIs, saved collection UI | UI prototypes must be labeled as prototypes until backend storage is approved | Social containment, account switching, report validation | Desktop and mobile feed and saved collections | Backend storage and moderation dependencies are not approved | 2 | Deferred / not approved |
| IDEA-005 | Define basic creator and portfolio uploads | Simple profile photo or cover, bio, portfolio photo or gallery upload with crop, review, consent and failure states | Authorized uploads, persistent owner-controlled media, file validation, privacy, permissions and rights checks | Professional, salon | Upload ownership and consent are required; no full editor or native app promise | Requires approved upload and ownership handling; current upload route exists but scope is unverified | Profile and portfolio surfaces, upload route, media components | Clear review, consent and failure states; no full editor or native app promised | Upload authorization, ownership, validation and containment | Desktop and mobile upload flows | Upload workflow is only partially present and unverified | 4 | Deferred / not approved |
| IDEA-006 | Define minimal Beauty Careers workflow | Minimal salon job listing and professional portfolio-based expression of interest with manual review | Verified posting ownership, applicant privacy, safe data handling, anti-fraud and moderation, applicable legal review | Professional, salon | Verified ownership and applicant privacy are prerequisites; no auto-matching or instant hiring claim | Requires approved hiring data model and moderation workflow | Future career surfaces, provider profiles, portfolio links | Manual review only; no auto-matching or instant hiring promise | Ownership, privacy and moderation tests | Desktop and mobile role-aware flows | No career or hiring workflow found in the repository | 5 | Deferred / not approved |
| IDEA-008 | Connect supported discovery, profile, portfolio and opportunity destinations | Role-aware navigation that links only to genuinely supported destinations | Discovery, planning, profiles, portfolios and any approved opportunity workflows | Guest, client, professional, salon | Links must not imply unsupported transactions or features | No new API expected beyond existing supported routes | `components/marketplace-ui.tsx`, discovery, profile, plan and service surfaces | Bookings, payments, Shop and Delivery remain gated | Navigation integrity and route availability | Desktop and mobile navigation | Depends on verified completion of earlier candidates | 6 | Deferred / not approved |
| IDEA-009 | Deferred salon team and identity model | Deferred concept only | Approved identity and organization data model, secure invites, account isolation, content ownership and permissions | Professional, salon, invited team members | Personal identity, salon business pages and team affiliations must remain distinct; no shared salon login | No schema or API change authorized | Future onboarding, profile, salon workspace and team surfaces | Deferred until six-person paper test; no implementation authorization | Not applicable | Not applicable | Explicitly deferred by founder decision | 7 | Deferred / not approved |

## Sprint 1 audit: IDEA-002

### Recovered acceptance criteria

IDEA-002 is classified as `MVP-DESIGN` in the recovered backlog. Its recovered scope is to evaluate the twelve-screen First Visit visual direction and guest-first flow for clear navigation, scannability and honest preview states, while preserving the long-form landing experience. Figma is a reference, not replacement approval. The recovered backlog also requires avoiding fake listings, confirmation or working OTP assumptions.

### Current implementation audit

- `app/page.tsx` renders `LandingClient`, providing the public long-form landing experience.
- `components/landing-client.tsx` uses the official logo, shared Button, honest sample-data labels, explicit not-live booking and payment copy, and real routes.
- `app/home/page.tsx` separates guest and authenticated experiences through `GuestHome` and `SocialHome`.
- `components/guest-home.tsx` uses honest empty states and safe discovery CTAs.
- `components/marketplace-ui.tsx` provides unified client navigation: Home, Discover, Plan and Me.
- Guest navigation routes Me to sign-in.
- `components/onboarding-tour.tsx` provides role-specific, server-authorized tours with truthful copy about unavailable booking and payment features.
- Beauty World personalization is integrated through semantic tokens and the atmosphere layer.

### Genuine gaps identified

- The Figma twelve-screen First Visit reference is not available in the repository, so the visual direction cannot be compared against the original design source.
- Detailed acceptance criteria for First Visit navigation and scannability are not recovered; only the backlog summary is available.
- Browser QA for landing, guest home, onboarding and responsive navigation is not recorded as completed.
- No separate implementation authorization exists for IDEA-002; its backlog classification is design evaluation, not approved feature work.

### Audit conclusion

IDEA-002 is substantially represented by the existing landing, guest home, unified navigation and role onboarding implementation. No genuine missing feature was identified that can be implemented safely from recovered source material. The remaining work is design-source comparison, browser QA and founder approval.

No code changes were made for Sprint 1.

## Sprint 1 decision

- Backlog source recovered: yes.
- IDEA-002 specification sufficiently verified for implementation: no.
- Implementation performed: no.
- Reason: IDEA-002 is a design evaluation candidate and its detailed acceptance criteria and Figma reference are unavailable. Implementing a replacement or expanded onboarding flow would risk scope creep and conflict with the existing approved implementation.
- Next required action: founder review of this matrix and either provide the original First Visit acceptance criteria or authorize the next sprint.

## Outstanding blockers

- Original backlog acceptance criteria are only partially recovered.
- Figma First Visit reference is unavailable.
- Browser and responsive QA remain unverified.
- IDEA-003 requires approved account-isolated server storage and moderation.
- IDEA-005 requires verified upload ownership, validation and privacy handling.
- IDEA-006 requires legal and moderation review.
- IDEA-009 remains deferred pending the six-person paper test.

## Verification

- No code changes were made in this sprint.
- Documentation change only.
- Run `git diff --check` after saving this file.
