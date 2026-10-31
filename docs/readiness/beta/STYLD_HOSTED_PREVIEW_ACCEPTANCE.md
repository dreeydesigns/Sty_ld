# STYLD hosted preview acceptance

Date: 2026-10-30
Branch: `qoder/styld-beta-20261027`
Local HEAD when written: `cb9d34b`. Remote tip and the deployed revision: `683f8c3`.
Statuses used here are the seven the directive allows: VERIFIED COMPLETE, IMPLEMENTED BUT UNVERIFIED,
IN PROGRESS, BLOCKED, DEFERRED, SUPERSEDED, FAILED ACCEPTANCE. A claim of "verified" in this file
always names the environment it was verified in, because hosted and local are not the same
environment.

## The one-line answer

No request from this workspace has ever reached the application on a hosted preview. Every anonymous
request to a preview URL is answered by Vercel's edge with a redirect to its own login, so the hosted
half of the beta gate is BLOCKED, not failed, and nothing about the build is responsible for it.

## The platform record

Read from the GitHub Deployments API for project `sty-ld` on 2026-10-30, not from a terminal scroll:

| Field | Value |
| --- | --- |
| Deployment | `7436081921` |
| Commit built | `683f8c3160334e1ef0040203355a8ce4722785dc` (`683f8c3`), the remote tip |
| Environment | `Preview - sty-ld` |
| Platform status | `success`, three build statuses recorded |
| Per-deployment URLs | `sty-avxpyxv3n` (10:29), `sty-kooa18rsx` (11:12), `sty-8199odmu9` (11:15), each suffixed `-dreeydesigns-3368s-projects.vercel.app` |
| Branch alias | `sty-ld-git-qoder-styld-beta-1691f2-dreeydesigns-3368s-projects.vercel.app` |

The application code in that build is the code of `2fa521d`, because every commit between `2fa521d`
and `683f8c3` edits files under `docs/` only. The build identifier Vercel serves is
`yqwyYPWjOIB73R6FF_Irt`.

## What was measured today, and by what

| Request | Host | Answer |
| --- | --- | --- |
| anonymous `GET /api/health` | the branch alias | `302`, `Location: https://vercel.com/sso-api?url=...` |
| anonymous `GET /api/health` | `sty-avxpyxv3n-...vercel.app` | `302`, same redirect |

DNS resolved and TLS completed in both cases, and each answer carried an `x-vercel-id`, so the request
reached Vercel's edge and Vercel stopped it. No cookie and no bypass value were supplied, because
neither exists in this workspace. `curl -I` produced these readings; they are not the acceptance
suite's own output, and the difference matters when a receipt is quoted.

Earlier runs of the same check against the same kind of host, at `ee52e8c` and `e38eab6`, are recorded
in `live-hosted-acceptance-preview-ee52e8c.json` and
`live-hosted-acceptance-preview-e38eab6.json`. Each of those receipts holds one executed check,
`deployment reachable`, failed on the redirect, with `cookieSupplied false` and `bypassSupplied
false`, and the build-identification grade recorded as never reached because the run never received a
document to read an identifier out of. That is the suite refusing to count checks it could not perform.

## Item by item

| Item | Status | Evidence and what would change it |
| --- | --- | --- |
| A preview deployment of this branch exists and builds | VERIFIED COMPLETE | Deployment `7436081921`, platform status `success`. Nothing here asks for more of the build. |
| The deployed application is reachable by an automated client | BLOCKED (founder item 1) | The 302 table above. Opened by turning Standard Protection off for previews, or by a `STYLD_PREVIEW_BYPASS` secret, or by declaring the preview human-only, in which case this row stays unpassed and is stated as such. |
| The deployed revision is identified by build | BLOCKED, cannot be attempted | `tests/browser/live-hosted-acceptance.cjs` reads the identifier from the two fields Next writes it into and proves it by fetching the versioned asset folder derived from it. The grade is `never reached` in every hosted receipt because there is no document. |
| The hosted acceptance suite exists and is wired | VERIFIED COMPLETE in local mode | `live-hosted-acceptance.json`, 13 of 13 checks plus 1 correctly skipped, against a loopback production build on a disposable cluster. A local pass proves the checks, not the deployment. |
| The preview has its own database | BLOCKED (founder item 2) | Reported state: one `POSTGRES_URL` entry targeting both Production and Preview, no override named for this branch. This workspace holds no credential and has run no migration against any hosted database. |
| Isolation can be proved from the running deployment | IMPLEMENTED BUT UNVERIFIED | `app/api/health/environment/route.ts:24` guards a token-gated, read-only probe that reports `current_database()`, `current_user`, the public table names, the row count of `users` and the applied migration names. It has 6 unit tests (`tests/hosted-environment-probe.cjs`) and has never been called over a network. |
| Hosted sign-in with a real emailed code | BLOCKED (founder item 3) | `RESEND_API_KEY` is reported configured and `RESEND_FROM_EMAIL` not found. `lib/auth-readiness.ts:12` answers false without a sender, so the OTP route refuses rather than pretending. |
| The preview serves the current local code | BLOCKED, needs a push and a rebuild | `cc88599` changed build inputs (the upload refusal and the probe), `cb9d34b` fixed the build-id reading and `5bd494a` fixed the accessibility harness. The receipts were taken on local build `YHmKlFY-FAfZVz0NcHCHD`; the preview still serves `yqwyYPWjOIB73R6FF_Irt`. Pushing is the founder's call and has not been done, so no hosted preview carries this code. |

## What the live suites were re-run on

The first version of this section said no PostgreSQL 17.11 binaries existed on this machine and that
the browser receipts could not be re-measured. That was wrong. PostgreSQL 17.11 is installed at
`C:\Users\Muti\AppData\Local\STYLD-Sprint4-PostgreSQL-17.11\pgsql\bin`, and on 2026-10-31 every local
harness was re-run, one at a time, against the artifact then in `.next`, build
`YHmKlFY-FAfZVz0NcHCHD` (the build `cc88599` produced; `5bd494a` edits tests and docs only). The later
gate build reports `xsIdSgdtr9XptiCR2L-t4`, since Next assigns a new random id per build, and the static
first-render receipt was regenerated against that artifact; the application code is the same:

| Harness | Result | Receipt |
| --- | --- | --- |
| `scripts/run-browser-qa-mock.cjs` | 14 of 14 suites clean, 255 PASS lines | `mock-browser-suites.json`, `commit cb9d34b` |
| `tests/browser/live-auth-journey.cjs` | 14 of 14 steps | `live-auth-journey.json`, `commit cb9d34b` |
| `tests/browser/live-hosted-acceptance.cjs` (local mode) | 13 pass, 0 fail, 1 skipped by design | `live-hosted-acceptance.json` |
| `npm run test:db -- --bin ...` | 28 of 28, 0 initial rows, cluster dropped and stopped | `docs/readiness/sprint4/postgres-result.json` |
| `tests/browser/live-first-render.cjs` | 8 first paints, 2 throttled journeys, `failures []` | `live-first-render.json`, `commit cb9d34b` |
| `tests/browser/live-accessibility-audit.cjs` | 44 scans, 0 content violations after the splash wait below | `live-accessibility-audit.json` |

Two readings from that round belong beside the pass lines. The first combined board run returned 13
of 14 because `plan-v2.cjs` timed out 30s clicking "See my estimate" mid-suite; the same suite run
alone immediately after printed 50 of 50 PASS lines and the next full board run was clean, so it is
recorded as a transient stall, not a product finding. The first accessibility run produced one
`color-contrast` violation on the landing page, and the node was the `aria-hidden` signature splash
sampled while it faded: #1D1D1B at partial opacity, reported as #e8e6e3 on #faf8f5, 1.17:1. The scan
now waits, bounded, for the splash element to leave the document, so it measures the page a visitor
settles into instead of a 260ms transition of decoration the page hides from assistive technology.
That wait is in `tests/browser/live-accessibility-audit.cjs` at the scan site, and the finding itself
was left in the record rather than deleted.

None of this changes the hosted answer. A local pass proves the checks; it does not prove the
deployment, which still answers every anonymous request with Vercel's login.

## What a completed hosted run looks like

One command, once a bypass or open previews exist, with the branch alias as the target so the origin
matches `BETTER_AUTH_URL` (`lib/api-security.ts:6` answers 403 for a write whose origin does not
match that variable, and a per-deployment hostname changes on every rebuild):

```
STYLD_TARGET_URL=https://<preview>.vercel.app STYLD_PREVIEW_BYPASS=<secret> \
  node tests/browser/live-hosted-acceptance.cjs
```

It records health, the landing document, Discover, sign-in, Plan, Compare, Saved, moderation and the
media refusal on the deployed revision, identifies the served build from the document fields, and
writes `docs/readiness/beta/live-hosted-acceptance.json`. That last sentence is a warning: local mode
and hosted mode write the same filename, so run the hosted pass with the local receipt copied aside,
or the proof of the local run is replaced by the proof of the hosted one.

## What this file does not claim

It does not claim the preview is broken, that the redirect was an application answer, or that any
hosted check passed. It does not treat the local-mode 13 of 13 as hosted evidence. It does not quote a
preview URL that the platform record does not hold.
