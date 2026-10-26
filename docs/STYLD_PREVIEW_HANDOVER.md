# STYLD preview handover

Date: 26 October 2026. Prepared by Qoder.

## What is deployed

- Branch: `qoder/styld-preview-closeout`, head `49239eaa80eeb9bae13fb3d40e403b4edfb82fbe`
- Pushed to `https://github.com/dreeydesigns/Sty_ld` as a new isolated branch. Nothing
  was merged and `main` was not touched.
- Vercel built two non-production preview deployments from that commit and both reported
  `success / Deployment has completed` in the GitHub deployment records.

| Vercel project | Preview URL | State |
| :--- | :--- | :--- |
| sty-ld (the app) | https://sty-f0914j7hj-dreeydesigns-3368s-projects.vercel.app | built and serving |
| styld-auth-test | https://styld-auth-test-6oify5x7z-dreeydesigns-3368s-projects.vercel.app | built and serving |

Production `https://sty-ld.vercel.app` still returns 200 and was not part of this work.

Every later push creates a new preview hostname. To read the current one, ask GitHub for
the deployment status of the branch head, which is how these two URLs were found:

```bash
SHA=$(git rev-parse HEAD)
ID=$(curl -s "https://api.github.com/repos/dreeydesigns/Sty_ld/deployments?per_page=5" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).find(x=>x.environment.startsWith('Preview')&&x.environment.endsWith('sty-ld')).id))")
curl -s "https://api.github.com/repos/dreeydesigns/Sty_ld/deployments/$ID/statuses" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d)[0].environment_url))"
```

## Verified on the preview host

- The commit built successfully on Vercel and the edge serves the deployment, so the
  host is real and reachable.
- Every path, including `/`, `/book`, `/discover` and `/api/me`, returns a 302 to Vercel
  SSO. That is Vercel Deployment Protection, not an application error. No anonymous
  request reached the Next.js app, so this handover does not claim that the app renders
  on that host. It claims only that the build and the deployment are healthy.

## Open the preview

Do one of these, then the app is browsable:

1. Open the URL while logged in to the Vercel account for
   `dreeydesigns-3368s-projects`, or
2. In Vercel, Settings, Deployment Protection, turn protection off for Preview
   deployments, or add a bypass protection secret and share only the secret value with
   the tester, never in a commit.

## Set the environment for a working sign-in

These belong to the Preview environment scope only. Do not set them in Production.

| Variable | Value |
| :--- | :--- |
| `BETTER_AUTH_SECRET` | A new 32 or 64 character secret, generated once |
| `BETTER_AUTH_URL` | Exactly `https://sty-f0914j7hj-dreeydesigns-3368s-projects.vercel.app`, no trailing slash |
| `POSTGRES_URL` and `DATABASE_URL` | The isolated QA database only, never the production URL |
| `EMAIL_PROVIDER` | `resend` or `gmail` |
| `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, or `GMAIL_USER` and `GMAIL_APP_PASSWORD` | The sender you want to test with |

`BETTER_AUTH_URL` matters. Each new push creates a new preview hostname, so either set it
per deployment or use a stable branch preview origin. Without both auth variables the app
shows the explicit not-configured guard instead of a broken form. See
`docs/ENV_MATRIX.md` and `docs/AUTH_PREVIEW_CONFIGURATION_2026-10-18.md`.

## Manual acceptance once it opens

- `/` and `/discover` load with no hydration error in the console.
- `/book` works without an account. A sign-in is offered but never required.
- `/activity` sends a guest to `/auth/sign-in?returnTo=%2Factivity`, and the return works.
- A one time code arrives at a real inbox, or the page states plainly that delivery is
  not configured. It must never claim a code was sent when it was not.
- Plan, Estimate, Compare and Shortlist keep the selection across reload in one tab.
- No surface says paid, confirmed, secured, verified or booked.

## What is already proven, and where

The automated browser suites intercept every API and image request, so they run against
a local production build and cannot run against this host unchanged. Recorded in
`docs/STYLD_QODER_DELIVERY_LEDGER.md`: 49 Plan scenarios, 33 Build 1 journey scenarios,
50 Compare scenarios, 30 shortlist and Saves scenarios, 32 private-saves scenarios, 10
email failure scenarios, 6 session state scenarios and the measurement passes, at 360,
375, 390, 768, 1366 and 1440 px. Gates: typecheck clean, lint zero errors, 660 of 660
tests, build exit 0, zero advisories.

## Rollback

Preview deployments are disposable. Delete the deployment or the branch and nothing in
production changes. No migration was run and no database outside the local test fixture
was written.
