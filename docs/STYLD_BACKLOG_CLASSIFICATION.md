# STYLD backlog classification for the private-beta branch

Branch: `qoder/styld-beta-20261027`. Evidence pass date: 27 October 2026.
Classification vocabulary required by the autonomous MVP directive: DONE (with evidence),
DEFERRED (with reason), BLOCKED (with the exact prerequisite) or NOT APPLICABLE (with rationale).

Scope guard that applies to every row: launch roles are Client, Professional and Salon.
`lib/feature-flags.ts` carries `BOOKING_COMMITMENTS=false`, `PAYMENTS_LIVE=false`, `SHOP=false`
and `DELIVERY=false`, and `middleware.ts` enforces `ROUTE_FEATURE_GATES`, tested by
`tests/feature-gates.cjs` and `tests/shop-delivery-containment.cjs`.

## MVP backlog (C:/Users/Muti/Downloads/STYLD_MVP_Backlog.md)

| ID | MVP-sized scope | Class | Evidence or exact prerequisite |
|---|---|---|---|
| IDEA-001/MVP | Optional number-of-people input in the planning preview plus a readable visit summary | DEFERRED | No `numberOfPeople`, `partySize` or `groupSize` field exists anywhere in the repo. Single-person planning is real and tested (`lib/plan-repository.ts`, `app/api/plan/route.ts`, `tests/plan-v2.cjs`, `tests/postgres/shortlist-ownership.cjs`). The backlog itself records this slice as "Deferred / not approved", so no authorization exists to build it. |
| IDEA-002/MVP | Twelve-screen First Visit visual direction and guest-first flow review | BLOCKED | Prerequisite: the founder's Figma First Visit reference, because the repo holds no copy of those twelve screens. Guest-first navigation itself is implemented and now browser-tested (`components/guest-home.tsx`, `components/landing-client.tsx`, `tests/phase3-guest-home.cjs`, `tests/browser/live-auth-journey.cjs` guest step). The long-form editorial landing is preserved. |
| IDEA-003/MVP | Save, Comment, Share with private saved collections and report/hide safeguards | DONE for the authorized slice | Private saves are server-side on the caller's own workspace row (`lib/social-saves.ts`, `app/api/social/saves/route.ts`) and are proven in a real signed-in browser (`tests/browser/live-auth-journey.cjs`). Safeguards: `app/api/reports/route.ts`, `app/api/blocks/route.ts`, `app/api/admin/moderation/route.ts`, `lib/moderation.ts`, tested by `tests/moderation-workflow.cjs` and `tests/postgres/moderation.cjs`. Comment Likes and share counts remain browser-store demonstration data and the interface says so plainly (`components/social-home.tsx:1061`), which is the honest prototype label the backlog requires. |
| IDEA-005/MVP | Profile photo or cover, bio, portfolio upload and crop with review, consent and failure states | DONE for the authorized slice, with one named gap | Upload path is authenticated and rate limited (`app/api/upload/route.ts`), crop and compression are in `components/image-upload-editor.tsx`, bio and profile edits go through `app/api/users/me/route.ts`, and review states use real `pending` publication rows (`sql/migrations/012_social_posts.sql`, `tests/pending-media-policy.cjs`, `tests/protected-media-contract.cjs`). Gap: `lib/pending-media-policy.cjs` states in its own header that the upload route does not yet use restricted delivery, so owner-controlled media delivery is policy-tested but not wired. That is a founder decision for the next phase, not a beta blocker, because pending media is not publicly listed. |
| IDEA-006/MVP | Salon job listings with portfolio-based expression of interest | DEFERRED | No job, vacancy or hiring workflow exists in the code. Prerequisites named in the backlog (verified posting ownership, applicant privacy, anti-fraud handling, Kenyan legal review) are unmet, and the slice is marked "Deferred / not approved". |
| IDEA-008/MVP | Content to profile to work samples to service interest navigation | DONE | `app/looks/[postId]/page.tsx` to `app/creators/[workspaceId]/page.tsx` with a whitelisted navigator (`lib/look-navigation.ts`, `lib/look-contract.ts`) and a server-authorized look to plan handoff (`lib/plan-repository.ts`, `app/api/plan/route.ts`). Tested by `tests/look-contract.cjs`, `tests/route-link-integrity.cjs`, `tests/inspire-feed-look-detail.cjs` and the live browser journeys. Bookings, payments, Shop and Delivery stay gated, as the philosophy row requires. |
| IDEA-009/MVP | Personal-first identity, optional Professional profile, Salon workspace, team invites and roles | DEFERRED by founder decision | Not implemented and not authorized. The validation gate is a six-person paper test that has not been run. Related infrastructure that predates the idea and is used by authentication (not evidence of IDEA-009): `sql/migrations/011_identity_workspaces.sql`, `lib/auth-resolver.ts`. |
| IDEA-009 Chair model and hours | Salon-managed versus independently operated Chair pricing authority, honest hours | DEFERRED | Strategy decision recorded in the backlog and in `STYLD_IDEA-009_Service_Hours_Permissions_v1.md`; no chair model exists in the code. |
| IDEA-004 (read only) | Save-led recommendations and niche discovery | NOT APPLICABLE | Founder instruction for this branch is read and triage only. The repo deliberately has no recommender: `lib/content-relevance.ts` and `lib/discovery-ranking.ts` apply deterministic ordering to existing data and are documented as such. |
| IDEA-007 (read only) | STYLD Promote, paid boosts | NOT APPLICABLE | Read and triage only, funding-dependent, and no promotion code exists. |

## Post-MVP backlog (C:/Users/Muti/Downloads/STYLD_Post_MVP_Backlog.md)

Every line in this file is DEFERRED. Each one names a dependency that is not ready on this
branch: server-backed interaction counts and event records for IDEA-003 depth, verified
employer records and Kenyan legal review for IDEA-006 depth, persistent media ownership for
IDEA-005 depth, and the approved identity and organization data model plus the IDEA-009 paper
test for all affiliation depth rows. `docs/STYLD_MVP_READINESS.md` lists the same open P1 items.

## Master index and future ideas

`C:/Users/Muti/Downloads/STYLD_Backlog_Master_Index.md` is an index, so it inherits the
classifications above and adds nothing new to build.
`C:/Users/Muti/Downloads/STYLD_Future_Ideas_Backlog.md` instructs "Do not design or implement
now", so every row is DEFERRED with no code evidence expected or found.

## Open over-promise risks found during this pass

1. Salon team membership is a browser-local prototype that is reachable in the product.
   `lib/team-store.ts` keeps invites, slots and commission splits in the localStorage key
   `ms_team_members.v1` and asserts an invented ownership rule, while
   `components/salon-team-ui.tsx` and `components/salon-live-team.tsx` present it as usable and
   `app/join-team/page.tsx` is publicly routable. No feature flag covers it. This is exactly the
   IDEA-009 scope that must stay behind the paper test, so it is now labelled as a prototype and
   recorded as a beta blocker for the founder to decide: label, gate, or remove before real
   salons are invited.
2. `components/super-admin-panel.tsx` previously claimed the reviewer can "view and override any
   booking, post, message thread, user, and verification record in the platform", which no server
   record supports. Its counts come from the browser store. The claim is corrected on this branch
   and a real server-backed queue was added at `components/admin-review-queue.tsx`.
3. `components/landing-client.tsx:115` already states that verified badges are not available yet,
   and `tests/trust-copy-public.cjs` forbids escrow, refund and blanket verification claims. No
   offending copy was found in the files opened for this pass.
