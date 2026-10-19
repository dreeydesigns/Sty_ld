# STYLD pre-MVP closeout checklist

Status key: DONE, PARTIAL, BLOCKED, NOT RUN.

This checklist separates a controlled private beta from a public transactional launch. It records current evidence only. A passing build is not proof of a live journey.

## Current closeout items

| Area | Status | Evidence and next action |
|---|---|---|
| Onboarding walkthrough layout | DONE in code | Responsive layout helper, safest-side desktop placement, mobile bottom sheet, safe area padding, settled remeasurement and missing-target fallback are implemented. Browser viewport QA is NOT RUN. |
| Role-specific onboarding tours | DONE in code | Client 8, Professional 8, Salon 8 and Admin 7 steps. Authorization comes from the server session, unsupported roles receive no tour, and completion is scoped by user and workspace or role. See the role-specific tour matrix below. Browser QA is NOT RUN. |
| Plan page and auth navigation | DONE in code | The Plan page no longer links to the development-only /auth/preview route. One optional sign-in uses /auth/sign-in with an internal returnTo of /book. Browsing /book needs no account. The page is a three step preview with one short disclaimer. Browser QA for the sign-in return is NOT RUN. |
| Settings navigation ownership | DONE in code | /settings and nested settings routes map to a settings destination, so the Profile or Me tab never highlights there. The desktop gear has its own active state, an accessible label and aria-current. Returning to /profile restores Me. Bottom navigation emits aria-current and highlights at most one destination. Browser QA is NOT RUN. |
| Profile personalization | DONE in code | The profile gear opens a labelled Profile personalization dialog, separate from Edit Profile and from general Settings. Clients adjust their beauty world theme through the existing local preference. Providers toggle or remove public page sections through the existing workspace save. Account, security and workspace controls stay in Settings. Further preference groups are deferred until server backed storage exists. Browser QA is NOT RUN. |
| Emoji-free interface policy | DONE in code | Application owned source (app, components, lib) contains no emoji or emoji-style pictographs and is enforced by tests/no-emoji-ui.cjs. Interface symbols come from the icon library. Typographic arrows, bullets and dashes stay allowed as plain text. Country flag glyphs were removed from phone inputs for the same reason. |
| Sign-in origin configuration | BLOCKED | The isolated build runs without BETTER_AUTH_URL, so Better Auth derives the origin from the incoming request. Code and environment stay unchanged. The founder must confirm the base URL or allowed hosts on the deployed test host before the sign-in return can be proven there. |
| Mobile authenticated journeys | NOT RUN | Complete login, discovery, profile, settings, replay, refresh, back and deep-link checks on a real mobile browser. |
| Professional and Salon role review | PARTIAL | Role workspaces exist. Complete an end to end review of profile, posts, team visibility and request access with real test accounts. |
| Provider booking ownership integrity | PARTIAL | Server checks exist. Prove provider ownership and tenant isolation for every read and write before enabling commitments. |
| Sample data labeling | PARTIAL | Sample providers and preview states exist. Verify every surface labels sample content and never presents it as a real transaction. |
| Client interests persistence | BLOCKED | Founder decision required before a real interest register is launched. |
| Dependency security audit | BLOCKED | 24 advisories were previously reported. Review affected runtime paths and compatible updates. |
| Legacy account recovery | BLOCKED | Founder must approve a recovery process for accounts without email before production work. |
| Stale documentation review | PARTIAL | Old Clerk and release documents remain. Correct or archive them before founder sign-off. |
| Email delivery | BLOCKED | A verified sender domain and an approved real delivery test are still required. |
| Shop and Delivery gating | DONE in code | Keep both disabled. Interest register only. Recheck redirects before every deployment. |
| Payments and booking commitments | BLOCKED | Keep disabled. No public claim of confirmed bookings, payment, escrow or settlement. |

## Role-specific tour matrix

| Role | Status | Steps | Coverage | Browser QA |
|---|---|---|---|---|
| Client | DONE in code | 8 | Discover tabs, filters, provider profiles, service comparison, planning preview, home, profile. States that booking, appointments, confirmations and payments are not live yet. | NOT RUN |
| Professional | DONE in code | 8 | Dashboard preview, professional workspace, services and service areas, public profile, portfolio posts, requests, settings. Labels sample preview values and unpublished portfolio state. | NOT RUN |
| Salon | DONE in code | 8 | Salon workspace identity, services and team records, business tools, public profile, staff area, requests, settings. Labels staffing, availability and booking as not live. | NOT RUN |
| Admin | DONE in code | 7 | Admin overview, moderation tabs, account security link, provider approvals, account controls, security events. Requires an authorized admin session with MFA. | NOT RUN |
| Shop | Disabled | 0 | No tour. Interest register only. | NOT APPLICABLE |
| Delivery | Disabled | 0 | No tour. Interest register only. | NOT APPLICABLE |
| Team member | Disabled | 0 | No tour. No independent workspace authorization. | NOT APPLICABLE |
| Multi-workspace switching | DONE in code | N/A | Server session resolves the active workspace. Completion and replay state stay separate per user and workspace or role. | NOT RUN |

## Private beta gate

- Authentication works in the isolated test environment with one identity and one workspace.
- No payment collection and no booking commitment.
- Sample content is clearly labeled on every surface.
- The Client, Professional, Salon and authorized Admin walkthroughs pass browser checks at the agreed viewports.
- Mobile login, discovery, profile, replay, refresh, back and deep-link journeys pass.
- Dependency advisories are reviewed and documented, with no unreviewed major upgrade.
- Error monitoring and recovery steps are written down.
- Shop and Delivery remain gated.
- Test deployment SHA is recorded and checked.

## Public transactional launch gate

- Client, Professional and Salon booking journeys are proven with authoritative price, provider and availability data.
- Payment collection, reconciliation, refunds and failure states are proven, or payments remain disabled.
- Verification badges and ratings come from server records, never sample or client supplied state.
- Professional and Salon permissions and tenant isolation are tested for every private read and write.
- Legacy account recovery is approved and tested.
- Real email delivery is approved with a verified sender domain.
- Sample providers, reviews and prices are removed from public surfaces.
- Schema changes are applied through reviewed numbered migrations with founder approval.
- The public deployment SHA, environment variables and rollback steps are verified.

## Next action

1. Run the walkthrough browser checks and record PASS or NOT RUN per viewport.
2. Complete mobile authenticated journey testing with real isolated test accounts.
3. Review Professional and Salon request ownership with server evidence.
4. Resolve the client interests and legacy recovery decisions.
5. Review dependency advisories before any public release.
6. Run the /book sign-in return check on the deployed test host once the founder confirms the base URL or allowed hosts.
