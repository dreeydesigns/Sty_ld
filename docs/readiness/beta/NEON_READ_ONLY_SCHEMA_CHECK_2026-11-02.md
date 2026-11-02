# STYLD | Independent read-only Neon schema check

**Date:** 2 November 2026  
**Scope:** Existing test/beta Neon database `styld_beta` in project `styld-qoder-private-beta-20261030`.  
**Method:** Read-only SQL via connected Neon service and read-only comparison with the repository's `docs/readiness/beta/db-inventory-smoke/baseline.json` on `qoder/styld-beta-20261027`.  
**Safety:** No database rows created, updated or removed. No migrations applied. No secret, connection string or row content retrieved for this report.

**Reproduction:** the founder's report as received, copied rather than rewritten. One character changed: the range written with an en dash in "after applying `001` through `016`" is spelled with the word, because `tests/copy-typography.cjs` fails `npm test` on that character anywhere in the repository. Nothing else was touched, including its own reading of what the digests do and do not prove.

## Verified live results

| Measure | Live result |
|---|---:|
| PostgreSQL version | 17.11 |
| Public base tables | 42 |
| Public table names compared with Qoder's chain-built baseline | 42 / 42 match; no missing or unexpected names |
| Columns | 379 |
| Primary-key constraints | 42 |
| Unique constraints | 18 |
| Indexes | 106 |
| All public constraints (all kinds) | 148 |
| RLS-enabled public tables | 0 |
| Public RLS policies | 0 |
| Rows in `public.users` | 1 |
| `public.schema_migrations` | Absent |

**Schema fingerprints calculated on the hosted database:**

- Columns MD5: `19a67766a938dbede735671df433a4d0`
- Indexes MD5: `1c283b9d34896130b75e0ef697d6f910`
- Constraints MD5: `51363f8304841872270e74556afc59c7`

These are diagnostic digests, **not authentication signatures or proof of schema equivalence**. To check them, Qoder should execute the exact SQL below on a fresh disposable PostgreSQL 17.11 database after applying `001` through `016` using its normal approved local workflow. Identical hashes are evidence of matching canonicalized metadata under this query; different hashes require per-object diff. Matching hashes do not prove correct data ownership, row-level authorization, migrations provenance, or runtime environment isolation.

## Reproducible read-only SQL for Qoder

```sql
WITH col_lines AS (
 SELECT table_name, ordinal_position,
        concat_ws('|', table_name, ordinal_position, column_name,
             data_type, udt_name, is_nullable,
             coalesce(column_default, '<null>'),
             coalesce(character_maximum_length::text, '<null>')) AS line
 FROM information_schema.columns WHERE table_schema='public'
), idx_lines AS (
 SELECT tablename, indexname,
        concat_ws('|', tablename, indexname, indexdef) AS line
 FROM pg_indexes WHERE schemaname='public'
), con_lines AS (
 SELECT con.conname, cls.relname,
        concat_ws('|', cls.relname, con.conname, con.contype,
             pg_get_constraintdef(con.oid)) AS line
 FROM pg_constraint con
 JOIN pg_class cls ON cls.oid=con.conrelid
 JOIN pg_namespace ns ON ns.oid=cls.relnamespace
 WHERE ns.nspname='public'
)
SELECT current_setting('server_version') AS pg_version,
 (SELECT count(*) FROM col_lines) AS column_count,
 (SELECT md5(string_agg(line,E'\n' ORDER BY table_name,ordinal_position)) FROM col_lines) AS columns_md5,
 (SELECT count(*) FROM idx_lines) AS index_count,
 (SELECT md5(string_agg(line,E'\n' ORDER BY tablename,indexname)) FROM idx_lines) AS indexes_md5,
 (SELECT count(*) FROM con_lines) AS constraint_count,
 (SELECT md5(string_agg(line,E'\n' ORDER BY relname,conname)) FROM con_lines) AS constraints_md5;
```

## Verification still required

1. Compare fingerprints and, if necessary, perform a **per-column, per-index and per-constraint** schema diff. Counts and table-name matches alone cannot establish equality. The original Qoder inventory tool acknowledges limited verification of PRIMARY KEY/UNIQUE index definitions; that limitation is not resolved by this report.
2. Prove Vercel's **effective deployed** `POSTGRES_URL` and fallbacks connect to this beta database and differ from the production connection. A branch-scoped variable existing in project metadata is not runtime proof. Avoid displaying any credential or decrypted connection string.
3. Resolve why `schema_migrations` is absent and identify the provenance of the one existing user before any approved migration. Take a recoverable database snapshot before any future change.
4. Independently verify guest and cross-account API authorization. There is **no database RLS** in this schema, so the application's authorization boundary is essential.
5. Verify protected beta access and real email OTP before connecting `wearestyld.com` or `beta.wearestyld.com`.

**Domain status when checked:** Vercel account owns and verifies `wearestyld.com`, but the `sty-ld` project domain list still contains only `sty-ld.vercel.app`. The `sty-ld` protection configuration is `all_except_custom_domains`. The additional `styld-auth-test` project has protection set to `all` and does not currently list branch-specific auth/database variable entries for `qoder/styld-beta-20261027` in the inspected project metadata. Neither project has been changed.
