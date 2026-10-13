# STYLD agent rules

Project: STYLD, a trust-first beauty marketplace for Kenya. Roles: Client, Professional, Salon, Shop, Delivery, Admin.
Launch scope: Client, Professional, Salon only. Shop and Delivery stay disabled (interest register only).
Auth: Better Auth, one identity, many workspaces. Do not add or reintroduce any other auth provider. Do not touch Clerk configuration.
Brand: keep the existing STYLD logo and Logo Book v2.0. Palette: Deep Ink #1A1A2E, Clay #C4A495, Sage #939B8A, Warm White #FAF8F5, Rose #C2707A. No redesign of the brand.

## Hard rules
- Work only on the test branch. Never push to main, never force-push, never deploy to Production, never merge.
- Never run migrations or write to any production database. Schema changes go in new numbered files under sql/migrations/ and are only applied to the isolated test database by the founder.
- Never print, log or commit secrets. Do not read .env files except .env.example.
- Do not edit lib/better-auth.ts, middleware.ts, lib/auth-policy.ts or lib/auth-resolver.ts unless a task says so. Authorization is server-side and must never depend on client-supplied role, userId or workspaceId.
- Never show a customer that something is paid, confirmed, secured or verified unless server records prove it.
- Never invent data: no fake reviews, fake providers, fake verification badges, fake prices.
- Do not use em dashes or en dashes in any copy, docs or code comments. Use commas, periods or parentheses.

## Working style
- First search the repo (grep, file listing) before assuming a file or function exists. If something is missing, say so. Do not guess.
- One task at a time. Make the smallest change that meets the acceptance checks. No drive-by refactors.
- After each task run: npx tsc --noEmit, npm run lint, npm test, npm run build. Report PASS or FAIL for each with the exact error if it fails.
- Commit after each task with a clear message. Do not push unless told.
- If a requirement is unclear or a change could affect auth, payments or data, stop and ask.
- Keep copy short, warm and plain. Prefer actions over paragraphs. Put long policy text behind a link or expandable section.
