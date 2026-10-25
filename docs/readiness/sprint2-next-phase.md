# Next-phase implementation proposal

This is a specification and standalone mock layout study, not a Build 1 feature release. `compare-prototype.html` has no API, storage, account or request submission. Its mock prices are labelled study data. No Compare route, tray or request functionality was added to the application.

## Existing contract and required decisions

`lib/plan-v2.ts` already accepts zero to three ordered UUIDs in `shortlistProviderWorkspaceIds`, an optional `leadingChoiceProviderWorkspaceId`, and server revisions/updatedAt. Leading choice must belong to the shortlist. Removing the previous leading provider clears it. Duplicate, fourth and malformed IDs fail validation. `lib/plan-repository.ts` validates active Professional/Salon workspace references and writes only the authenticated Client workspace profile in a transaction with FOR UPDATE. Preserve schemaVersion 2. Never store provider display names, prices, verification or availability as authoritative Plan fields.

`lib/plan-client.ts` serializes edits and rejects stale account responses. Reuse that store and `/api/plan`, including If-Match/revision conflict handling. A tray must not create another localStorage shortlist. Guests can explore a temporary study but persistence requires the existing authenticated Client workspace. Confirm guest shortlist handoff policy before implementation.

## Ranked small commits, each separately authorized

| Order | Files and proposed behavior | Dependencies and acceptance |
| --- | --- | --- |
| 1 | New `lib/shortlist-client.ts` as an adapter over `lib/plan-client.ts`, no separate storage. Ordered add/remove, maximum three, optional leading choice, operation-specific Undo | Tests: three allowed, fourth requires deliberate replacement, duplicate rapid clicks, API rollback, stale Undo cannot overwrite later edits, account A/B/A, workspace switch, revision conflict. Existing Plan tests must pass |
| 2 | New `components/shortlist-tray.tsx`, integrate into the existing authenticated shell after inspecting `components/app-shell.tsx` consumers | Narrow tray above bottom navigation and safe-area inset. Show count and one Compare action only at two or more choices. Removable items have names, 44px targets and announced Undo. Tray must not obscure Save, Plan or keyboard focus at 360px |
| 3 | Add actions to `components/social-home.tsx`, `app/creators/[workspaceId]/page.tsx` and `components/appointment-planning.tsx` only after confirming eligible provider surfaces | Use canonical author workspace IDs, not user IDs or display names. Save remains separate. Card actions stop navigation. Creator profile return preserves feed filters/scroll and shortlist. Unavailable providers remain visibly unavailable with removal recovery |
| 4 | New `app/compare/page.tsx` and `components/provider-comparison.tsx` | Read the current Plan, refresh eligible provider/service facts through a separately reviewed authorized read contract. Comparable rows: same selected service scope, actual listed prices, duration, service mode, location area, provenance. Missing values read Not provided. No guessed aggregate, distance, travel fee, ratings, availability or verification. One leading choice toggle per provider, labelled preference only |
| 5 | Fourth-provider replacement dialog and conflict/Undo recovery | Cancel preserves all choices. Replace preserves order slot, clears replaced leading choice, announces result and restores focus. Undo uses current revision and preserves unrelated Plan edits. Stale or conflicting Undo offers explicit recovery rather than blind overwrite |
| 6 | Decide handoff and end-to-end acceptance | Request remains upcoming until separately approved. No active request CTA or booking/payment side effect. Compare returns to current Estimate/Plan without changing preferences. All six worlds, five widths, keyboard, reduced motion, offline, errors and cross-tab/account tests |

Candidate integration paths above are planning targets, not permission to create them. Current verified files are `components/app-shell.tsx`, `components/social-home.tsx`, `app/creators/[workspaceId]/page.tsx`, `components/appointment-planning.tsx`, `components/plan-estimate.tsx`, `lib/plan-client.ts`, `lib/plan-v2.ts`, `lib/plan-repository.ts` and `app/api/plan/route.ts`.

## Data gaps and release gates

The Plan holds only provider workspace IDs. There is no approved batch comparison read contract for up to three providers and equivalent service scope. Existing Look-linked service IDs belong to one creator; comparing different services without an agreed equivalence rule would imply a false like-for-like comparison. Founder must define category/service matching, treatment of unavailable/deleted shortlist members, and whether a leading choice changes the Plan's selected creator/services (recommend no implicit mutation).

Canonical creator facts do not prove appointment availability, travel fees or final quotations. Do not add these rows until authoritative records and permissions exist. Multi-client live testing still needs a verified sender domain, authorized identities, minimum review grants and media privacy. No persistent schema extension is needed for the shortlist itself.

## Prototype limitations

The study demonstrates count, selection, fourth-provider replacement, leading choice and removal Undo. It has synthetic in-memory choices only. It is not a usability study, cross-device test, final design, or accessible component certification. Provider-profile navigation and app shell integration remain specification acceptance tests. Do not ship the HTML as an application route.
