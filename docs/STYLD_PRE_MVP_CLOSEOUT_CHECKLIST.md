# STYLD pre-MVP closeout checklist

Status key: DONE, PARTIAL, BLOCKED, NOT RUN.

This checklist separates a controlled private beta from a public transactional launch. It records current evidence only. A passing build is not proof of a live journey.

## Current closeout items

| Area | Status | Evidence and next action |
|---|---|---|
| Onboarding walkthrough layout | DONE in code | Responsive layout helper, safest-side desktop placement, mobile bottom sheet, safe area padding, settled remeasurement and missing-target fallback are implemented. Browser viewport QA is NOT RUN. |
| Client walkthrough | DONE in code | Seven truthful steps cover discovery, filters, provider profiles, disabled booking, home and profile. Browser QA at 320x568, 375x667, 390x844, 768x1024, 1024x768 and 1366x768 is NOT RUN. |
| Professional and Salon walkthroughs | DONE in code | Five steps each, with truthful requests and team copy. Browser QA is NOT RUN. |
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

## Private beta gate

- Authentication works in the isolated test environment with one identity and one workspace.
- No payment collection and no booking commitment.
- Sample content is clearly labeled on every surface.
- The client, Professional and Salon walkthroughs pass browser checks at the agreed viewports.
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
