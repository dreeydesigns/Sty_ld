# IDEA-003 Better Auth QA schema review

## Purpose

The IDEA-003 QA database uses Better Auth 1.7.5 with the PostgreSQL adapter. The application migrations 001 through 012 created the core application schema, but they did not create the four Better Auth tables required by the installed authentication configuration.

The missing tables are:

- `auth_sessions`
- `auth_accounts`
- `auth_verifications`
- `auth_limits`

## Generation method

The SQL below was generated from the actual installed Better Auth 1.7.5 configuration using `getMigrations` and `compileMigrations`. The generator was pointed at the disposable QA database `styld-idea003-integration-qa` for read-only schema introspection. No migration was applied.

The generated schema contains only `toBeCreated` entries for the four missing tables. It contains no `toBeAdded`, `toBeAddedIndexes`, `unsafeChanges` or `schemaProblems`.

## Exact SQL

```sql
create table "auth_sessions" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" uuid not null references "users" ("id") on delete cascade);

create table "auth_accounts" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "accountId" text not null, "providerId" text not null, "userId" uuid not null references "users" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "auth_verifications" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "auth_limits" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "auth_sessions_userId_idx" on "auth_sessions" ("userId");

create index "auth_accounts_userId_idx" on "auth_accounts" ("userId");

create index "auth_verifications_identifier_idx" on "auth_verifications" ("identifier");
```

## Migration file

- `sql/migrations/013_better_auth_qa_schema.sql`

This file is prepared locally for founder review. It has not been applied.

## Dependencies

- `users(id)` must exist before applying this migration. Migration 001 and migration 007 create and evolve the users table.
- `identity_workspaces` is not required by the Better Auth tables, but the application authorization flow uses it after sign-in.
- The PostgreSQL driver must support UUID and JSON operations already used by the application.

## Compatibility risks

- The existing `users` table allows nullable `email`, `email_verified`, `created_at` and `updated_at`. Better Auth declares those fields as required, but the generated migration does not alter them. Backfilling and enforcing NOT NULL would be a separate founder-approved change.
- The existing legacy `sessions` and `auth_rate_limits` tables are not interchangeable with `auth_sessions` and `auth_limits`.
- The generated SQL uses quoted camelCase column names for the Better Auth tables. This matches the installed adapter configuration.
- The generated SQL does not use `IF NOT EXISTS`. It should only be applied once to an empty QA database.

## Rollback approach

- The four new tables are additive.
- A rollback would drop `auth_sessions`, `auth_accounts`, `auth_verifications` and `auth_limits` only after founder approval.
- Dropping these tables would remove QA sessions, OTP verification records and rate-limit records. It would not modify application data.

## Verification steps

1. Apply only to `styld-idea003-integration-qa`.
2. Verify the four tables exist.
3. Verify foreign keys reference `users(id)`.
4. Verify UUID generation works.
5. Verify the three indexes exist.
6. Verify existing `users`, `sessions`, `auth_rate_limits` and `identity_workspaces` tables remain unchanged.
7. Restart the local application and retry the email OTP flow.
8. Confirm Resend delivers the OTP.
9. Confirm a genuine authenticated session can be created.
10. Confirm canonical posts and Private Saves work through the authenticated flow.

## Safety notes

- No production database was modified.
- No migration was executed by this review.
- No secrets or connection strings are included.
- No authentication providers or OTP behavior were changed.
