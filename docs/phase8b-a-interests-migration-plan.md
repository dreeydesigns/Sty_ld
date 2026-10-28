# Phase 8B-A: Interests Storage: Compatibility & Migration Design (READ-ONLY)

**Status:** Design document only. **No migration is authorised or implemented.**
**Audited baseline:** `9c00d7250d5c957d4e7e2ee2116f469fcf52971a`
**Owner decision pending:** adopt `identity_workspaces.profile.interests` as canonical (recommended), or retain `user_settings`.

This document satisfies the Phase 8B-A requirement to *prepare* a migration plan. It does **not**
authorise schema changes, data movement, or execution.

---

## 1. Current state (reconciled)

`interests` is referenced by `app/api/onboarding/client-interests/route.ts`, which is now
**contained** (fails closed with a non-cacheable 503). The storage history is inconsistent:

| Artifact | Line | Creates/alters `interests`? |
|---|---|---|
| `sql/migrations/001_initial_schema.sql` | 179 to 190 | `CREATE TABLE IF NOT EXISTS user_settings (...)`, **no** `interests` |
| `lib/db.ts` (runtime initialiser) | 247 to 261 | `CREATE TABLE IF NOT EXISTS user_settings (... interests JSONB DEFAULT '[]'::jsonb ...)` |
| `sql/migrations/002 to 011` | none | **no** `ALTER TABLE user_settings ADD COLUMN interests` anywhere |
| `lib/better-auth.ts` | 65 | creates client `identity_workspaces` row (`user_id, role='client'`) |

**Consequence:** because `lib/db.ts` uses `CREATE TABLE IF NOT EXISTS` and no additive migration
exists, the live column presence depends on **which statement created the table first**:

- DB initialised only by `lib/db.ts` → `interests` present.
- DB where migration `001` (or a pre-existing table) ran first → `interests` absent → the old API
  would raise `column "interests" does not exist`.

The **deployed column state has not been verified** and must not be assumed either way.

---

## 2. Target model (proposed, not implemented)

Canonical destination: **`identity_workspaces.profile.interests`** (JSONB array), scoped to the
client's active workspace.

- `identity_workspaces.profile` is `jsonb NOT NULL DEFAULT '{}'` (`011_identity_workspaces.sql:6`).
- `lib/workspace-policy.ts:6 to 15` (`workspaceProfile`) spreads `...p`, so a stored `interests` key
  **would** already be surfaced to `/api/me` once written, this is why the target resolves P0-A.
- The write allow-list in `app/api/users/me/route.ts:6,12` currently **rejects** unknown fields, so
  `interests` cannot be written through that path yet; a dedicated, validated write path (or an
  allow-list extension with array validation) is required.

---

## 3. Pre-migration verification checklist (read-only, do NOT run against production)

1. Confirm the live column state without mutating: `SELECT column_name FROM
   information_schema.columns WHERE table_name='user_settings' AND column_name='interests';`
   (read-only; requires separate founder authorisation to connect at all).
2. Count existing rows: `SELECT count(*) FROM user_settings WHERE interests IS NOT NULL AND
   interests <> '[]'::jsonb;` (read-only).
3. Confirm client workspace coverage: are there client `identity_workspaces` rows for every user
   with stored interests? `SELECT count(*) FROM users u LEFT JOIN identity_workspaces w
   ON w.user_id = u.id AND w.role='client' WHERE w.id IS NULL;`
4. Record a production backup/cutover window (founder-governed).

---

## 4. Migration design (proposed: pending approval)

**Direction:** copy, never overwrite.

1. **Schema (only if model B chosen):** none required, `profile` already exists.
   *(If model A chosen:* `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS interests JSONB
   DEFAULT '[]'::jsonb;`*), idempotent.*
2. **Data copy (idempotent, additive):**
   ```sql
   -- For users with client workspaces, copy non-empty user_settings.interests
   -- into identity_workspaces.profile.interests ONLY when absent/empty.
   UPDATE identity_workspaces w
   SET profile = jsonb_set(
         COALESCE(w.profile, '{}'::jsonb),
         '{interests}',
         s.interests,
         true
       )
   FROM user_settings s
   WHERE w.user_id = s.user_id
     AND w.role = 'client'
     AND s.interests IS NOT NULL
     AND s.interests <> '[]'::jsonb
     AND (w.profile->'interests' IS NULL
          OR w.profile->'interests' = '[]'::jsonb);
   ```
3. **Eligibility:** only `role='client'` workspaces receive interests.
4. **Defaults:** absent → `[]` (never `null`).
5. **Duplicates/conflict resolution:** if a user has multiple client workspaces (should be unique by
   `UNIQUE(user_id, role)`), prefer the **active** workspace; if both hold values, retain the
   non-empty existing value and do **not** overwrite (copy only when target is empty).
6. **Backward compatibility:** leave `user_settings.interests` untouched (no drop). Reads move to the
   workspace model; the legacy column is retained for rollback and audit.
7. **Rollback:** re-disable the interests endpoint (already fail-closed) and revert reads to
   `user_settings`. No destructive step, so rollback is safe.
8. **Idempotency:** every statement guarded (`IF NOT EXISTS` / `profile->interests IS NULL`), so
   re-running is a no-op.
9. **Verification after apply:** row counts match, no `null` interests, spot-check a sample of
   client workspaces.

---

## 5. Application changes required alongside the (future) migration

- Extend `app/api/users/me/route.ts` (or add a dedicated route) to accept and **validate**
  `interests` as an array from the allowed list before merging into `profile`.
- Update `app/api/me/route.ts` so the client profile reliably includes `interests` (the resolved
  workspace profile already would, once stored).
- Re-enable the interests endpoint against the approved model.
- Optional: reintroduce an **optional** (non-blocking) interests step, never a gate.

---

## 6. Explicit non-actions

- No migration executed. No schema change. No data moved. No production connection made.
- No existing interests overwritten or discarded.
- The quarantined foreign interests implementation was **not** copied.
