# STYLD reference reconciliation

Reviewed 15 October 2026 against local design/openai-styld-ui-v1 at c0dd5e2, including uncommitted work. This is a reference intake and scope comparison, not a release certification or authorization to implement deferred ideas.

## Source versions

- Both STYLD_Ideation_New_Chat_Handoff files have the same SHA-256 prefix, 3c78e2e12930.
- Both updated UIUX roadmap files have the same prefix, 9392b050901a.
- The master indexes differ. STYLD_Backlog_Master_Index (1).md includes later Chair pricing and v2.1 decision summaries absent from the earlier index. Preserve both as history.
- The visual ZIPs differ. The (1) ZIP adds twelve first-visit screens and PNG exports. Both archives also contain material explicitly labelled archived and not approved. ZIP filenames are not approval evidence.
- The Direction 1 HTML/screenshots are historical journey references. The roadmap calls for reconciliation with Editorial Light A v3 and the official STYLD logo, not wholesale replacement.
- The BILAN images depict another brand's sanitary-pad campaign. They are not STYLD branding, provider records or proof of a product integration. No use in the app has been inferred from their attachment.

## Decisions and contradictions

| Topic | Reconciliation |
|---|---|
| Sign-in | Keep one Better Auth identity and genuine email OTP. Guest browsing stays public. |
| Current workspaces | Preserve separate Client, Professional and Salon access and server ownership. The new terminology does not authorize merging identities or tables. |
| Future Chair model | Person is the identity; Place is the salon organization; Chair is a work offering/context. This is deferred strategy, not a proven current capability. |
| Membership versus offering | Later references separate accepting salon membership from accepting each service. Joining must not require publishing a Chair. |
| Price authority | Later strategy gives salons control of salon-managed service prices and professionals control of independent offerings. Location alone does not determine authority. |
| Portfolio | Later references place ownership with the person, with explicit opt-in for salon cross-display. The original kit's default-on sharing is superseded in the supplied strategy. |
| Multiple salons | v2 calls this a recommendation; the later index records founder confirmation. The referenced v2.1 decision document was not attached, so implementation detail remains incomplete. |
| Booking | Historical screenshots show five booking steps and Check times. The updated roadmap requires truthful Discover / Compare / Plan while commitments remain disabled. |
| Research | The paper sheet is blank and supplies a proposed usability protocol, not evidence that anyone passed it. |
| Backlogs | MVP means a candidate classification. The supplied indexes explicitly distinguish this from implementation approval. |

Referenced but not supplied in this batch: styld-chair-model-v2.1-decisions-confirmed.md, STYLD_IDEA-009_Service_Hours_Permissions_v1.md and STYLD_IDEA-009_Chair_Model_Review.md. Do not manufacture their contents from titles.

## Current code evidence

- components/auth/unified-auth-flow.tsx uses the existing email authority and safe return destination. Newer local commits have added client-interest onboarding; this requires fresh regression review rather than relying on earlier 288-test results.
- lib/auth-readiness.ts and app/api/auth/[...all]/route.ts now return a configuration error before initializing missing auth settings. Those changes were incorporated into 4d81c1d by intervening local work.
- app/api/workspaces/route.ts records authenticated provider applications. This is not a salon invitation, multi-salon membership or Chair offering model.
- components/workspace-management.tsx and app/workspace/application/page.tsx provide application handling. The latter and other pages have uncommitted edits that were preserved during this review.
- components/appointment-planning.tsx explicitly describes planning without slot holds, payments or confirmed appointments.
- docs/phase-5-data-provenance.md classifies discovery/provider catalog content as examples. Historical screenshot names and prices are not verified marketplace records.

## Immediate execution order

1. Complete preview configuration: identify the isolated database, verify its schema and the sender domain, set branch-scoped auth URL/secret and sender settings, and verify a preview before any real OTP test. Do not reuse shared production database settings.
2. Review the intervening Phase 7D-E commits and uncommitted changes without overwriting another tool's work. Run fresh typecheck, lint, tests and build for the exact candidate revision.
3. Validate guest discovery, selected planning context, auth return, session refresh, application status and account isolation. Browser/mobile checks remain distinct from HTTP and unit tests.
4. Reconcile actual visual output with Editorial Light and the four historical journey references. Correct misleading availability or dual-active navigation rather than reproducing reference defects.
5. Keep Chair/team membership as a separately scoped decision. Before implementation, resolve the missing decision references, permissions, consent lifecycles and migration strategy. Do not enable booking, payments, Shop or Delivery through this review.

## Remaining authentication blocker

On 14 October, Vercel runtime logs for deployment dpl_6Gx4vmHNpTmyiBcKjpDPHpnTkTmo showed Better Auth rejecting its default secret during POST /api/auth/email-otp/send-verification-otp. The subsequent environment-name inventory showed no BETTER_AUTH_SECRET, BETTER_AUTH_URL or RESEND_FROM_EMAIL. The only isolated POSTGRES_URL override was scoped to codex/auth-mvp-recovery, not this UI branch. These are configuration findings, not permission to copy production credentials.

The founder identified a resource called styld created two days earlier. Its provider dashboard link and verified sender remain unidentified. The attached product/design documents do not supply that configuration.

No application code, database, external configuration or deployment was changed by this reference review. No fresh test run or visual compliance claim is made for the newer local code.
