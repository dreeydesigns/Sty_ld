# Disposable PostgreSQL verification

Run from the Sprint 4 worktree:

```powershell
npm.cmd run test:db -- --bin C:/Users/Muti/AppData/Local/STYLD-Sprint4-PostgreSQL-17.11/pgsql/bin
```

The runner requires the separately checksum-verified PostgreSQL 17.11 portable binaries. It does not install a Windows service or change PATH. Runtime acquisition evidence is recorded in this directory's execution ledger.

Each execution creates a new random cluster on an available IPv4 loopback port. Fresh credentials exist only in memory and a temporary initdb password file, removed immediately after initialization. Child processes inherit an OS-only environment whitelist. No application environment files are loaded. Existing application and remote database URLs are not accepted.

The schema reference is tests/fixtures/review-schema.sql, a schema-only export with no user records, content, custom functions or role credentials. The runner verifies all initial application row counts are zero. The owner connection restores schema and creates synthetic fixtures only. Application functions use a separate non-administrative runtime role. Actual Better Auth generates OTPs and creates sessions. Only email transport is mocked, with generated OTPs captured in memory and never printed.

Plan concurrency uses independent PostgreSQL connections and the actual application API and repository. Two same-revision writes must produce one success and one conflict. This is distinct from the serialized PGlite unit harness.

The starting runtime grants intentionally reproduce the previously reported workspace chooser gap. A test proves the missing SELECT permission, applies the minimal grant only to this disposable local runtime role, and exercises the real route again. This is evidence for a proposed remote grant, not authorization to alter Neon.

The runner verifies database, role, server address, port and random cluster identity before fixtures. Cleanup verifies the owned directory marker and server identity again, drops only styld_disposable_test, and stops its server. It exits unsuccessfully if database cleanup or shutdown fails. Filesystem directories remain for founder cleanup because automatic approval review rejected recursive removal with "blocked by policy". No alternate recursive removal is attempted.

The local tests do not prove live Neon grants, Resend deliverability, private Cloudinary delivery or production readiness. They use synthetic identities ending in example.test. No real email or customer record is involved.

The initial committed verification passes 12 PostgreSQL checks with zero skips, 657 full unit tests with zero skips, TypeScript, lint (31 existing warnings) and the production build. postgres-gates.json records command exit codes. postgres-result.json confirms forty initially empty tables, database removal and server shutdown. The standalone four environment/target guards are included in the full unit total. The build emits missing-secret/base-URL diagnostics without deployment credentials; it is not a live authentication readiness check.
