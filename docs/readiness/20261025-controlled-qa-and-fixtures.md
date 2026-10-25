# Controlled QA and fixture contract

Status: no live accounts, email, fixtures, services, uploads, moderation or cleanup executed.

## Isolation and identity

Approved target is Neon project `broad-morning-34625938`, review branch `br-steep-violet-b78kgp17`, database `styld_review`, Vercel project `prj_W7UjUPQkUItT6LDjwqwWOoquTDUQ`. A future runner must compare observed remote identities with this allowlist before any write. A developer-supplied environment label is insufficient. It must refuse other projects, branch IDs, production targets, missing identity information and credentials with administrative privileges.

`scripts/pilot-fixture-dry-run.cjs` is a pure validator with no execution, network or database adapter. It accepts an independently observed project/database/Vercel identity, requires exact manifest fields and returns `writes: 0`. It is not a seed command, does not establish that identities are approved, and does not replace live environment verification. Version 1 supports two fictional professionals, two or three services, four to six posts, one client and an optional second client.

Manifest fields:

| Record | Required fields |
| --- | --- |
| Manifest | version, runId UUID, target identity, accounts, services, posts |
| Account intent | unique demo key, role, Demo displayName, opaque founder-approved identity reference |
| Service intent | unique demo key, owner key, Demo name, positive integer demonstration KES price, durationMinutes, category |
| Post intent | unique demo key, owner key, owned service key, caption beginning Demo:, approved synthetic-media reference, pending publication status |

No emails, credentials, session tokens, media URLs or published status are accepted in this dry-run manifest. Demonstration prices must remain clearly labelled demonstration values. The validator is intentionally narrower than all possible application services. It neither creates trustworthy Demo provenance nor marks server records as verified.

## Future creation and provenance

Founder first approves specific test inboxes, permissions and synthetic image rights. Each account signs up through the normal Better Auth email OTP flow. Do not insert users, sessions, verification records or role grants manually. Professional workspaces require normal application review and an authorized MFA administrator. The current review runtime lacks workspace-application and provider-write privileges, so this path requires a separately approved, narrowly scoped grant plan.

After legitimate creation, record server-issued user/workspace IDs in a separate private execution receipt. Service provider_id and workspace_id must come from the server session. Post tags link only a service owned by the same workspace. Submit posts as pending. A normal MFA-authorized moderator independently approves them and records an audit entry. Do not add arbitrary trusted Demo tags from a client manifest. Existing canonical Demo provenance rules must be reviewed and used; if the current server contract cannot attest fixture provenance, stop for an approved contract change rather than invent a badge.

Idempotency design: a run ID plus unique logical keys maps to server-issued IDs in the execution receipt. Before retries, read back ownership and fingerprints. Exact existing records can be reused; changed or missing ownership requires operator review. Do not deduplicate by display name or email guesses. A later execution runner needs durable receipts and concurrency protection; this dry-run validator provides neither and never claims that it does.

## Two-client persistence acceptance, later authorization required

1. Confirm protected deployment, stable auth origin, approved database identity, sender domain and intended recipients. Capture baseline row counts without exposing identities. Keep OTPs out of reports.
2. Client A signs in normally. Verify a real server session, one active Client workspace, no invented provider or verification claims, and a safe logout path.
3. A opens a normally approved Demo Look, saves it, exercises Unsave and Undo, edits Plan date/window/mode/area, then opens Estimate. Record IDs and revisions, not cookies or OTPs.
4. Close the tab. Restore in another tab and independent device via real OTP sign-in. Confirm Saved and Plan come from the server and Estimate recomputes authoritative prices. Do not use localStorage as persistence evidence.
5. Race two edits from separate tabs. The stale revision must receive 409 or 412, retain the user's draft, and require an explicit resolution rather than silently overwriting.
6. Client B signs in through an independently approved inbox. B must not see A's Saved IDs, Plan, workspace profile or cross-tab messages. Attempt A's references through normal route requests, without inventing sessions. A response arriving after account/workspace switching must not enter B's screen.
7. Exercise logout, revoked session, offline save, reconnect, removed service and unpublished Look. Confirm blocked booking, payment, Compare and Request commitments remain blocked.
8. Obtain explicit cleanup approval using the exact execution receipt. Report real test results separately from all mock/in-memory results.

## Cleanup design

Dry-run cleanup lists only receipt-owned IDs, current ownership, fingerprint and dependent records. Stop on any changed owner, foreign dependency or missing provenance. Never use broad name prefixes, email domains or age-based deletion. Unpublish normally first, remove media only after approved retention/cache review, then remove dependent fixture records in FK order and remove accounts through the supported account lifecycle. Re-read by exact receipt IDs and record results. Auth/security audit retention is a separate decision, not something a fixture tool should silently erase. No executable live cleanup exists in this sprint.

## Local database tests

Both previously skipped suites now load the schema-only snapshot into PGlite by default. They never read application connection variables. An optional full PostgreSQL path accepts only an explicit `STYLD_TEST_DATABASE_URL`, `STYLD_ALLOW_LOCAL_DB_TESTS=yes`, loopback host, database `styld_disposable_test`, and no query/fragment connection overrides. It must be provisioned separately and is not used in this sprint. Never point these tests at Neon. The PGlite adapter serializes full transactions because it has one connection; separate network connection contention and server-role enforcement still require controlled PostgreSQL/live tests.
