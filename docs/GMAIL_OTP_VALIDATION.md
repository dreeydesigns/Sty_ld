# Gmail OTP validation, 18 October 2026

Branch: `design/openai-styld-ui-v1`.

The Gmail delivery adapter preserves Better Auth as the sole authentication
authority. Sender comes from `GMAIL_USER`, never from a caller override. TLS
and bounded connection timeouts are enabled. Remote file and URL attachment
access, SMTP debug output and SMTP error detail logging are disabled. Unknown
transport selections fail closed. No fallback silently changes sender.

## Evidence

- PASS: `npm ci --ignore-scripts`, clean lockfile installation. Initial checks
  against an incomplete local package folder failed on missing dependencies;
  these were rerun after the clean install.
- PASS: `npm test`, 355 tests, zero failures. Includes Gmail missing credentials,
  explicit transport selection, sender spoof prevention, safe error handling,
  credential rejection and an actual local SMTP fixture connection.
- PASS: `npx tsc --noEmit`, zero errors.
- PASS: `npm run lint`, zero errors and 30 existing warnings.
- PASS: `npm run build`, exit 0, 111 static pages generated. Local build has
  no configured auth secret and prints Better Auth default-secret diagnostics
  while collecting route data. This does not verify deployment configuration.
- PASS: `npm run test:auth:integration`, isolated PGlite and captured HTTP mail.
  Covers signup, existing identity, OTP replay, session, logout and failed
  delivery. This test explicitly selects Resend with a local fake endpoint.
- BLOCKED: real Gmail acceptance, inbox arrival and browser OTP sign-in. Founder
  must save a Google App Password directly in Vercel before a controlled test.

Preview branch variables `EMAIL_PROVIDER=gmail` and
`GMAIL_USER=trystyld@gmail.com` are configured. No credential was generated,
read or inserted. No production database or deployment was changed. The Gmail
address does not receive privileged roles merely by being the sender.

The dependency audit still reports 24 advisories (22 high, 2 moderate). No broad
or breaking package upgrades were applied. This change does not make the whole
marketplace public-MVP ready.
