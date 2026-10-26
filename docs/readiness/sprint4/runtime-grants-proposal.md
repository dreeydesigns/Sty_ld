# Review runtime compatibility proposal

This is a proposal, not an applied Neon change. Sprint 4 makes no remote database writes or permission changes.

The disposable PostgreSQL runtime reconstructs the previously reported isolated review grants. Its real authenticated workspace chooser returns 500 when SELECT on workspace_applications is absent. The same route returns 200 after the disposable owner grants only SELECT on that table. An unauthenticated request still returns 401. This reproduces a permission dependency, not a fresh attestation of current Neon grants.

After founder approval, an authorized database owner should first verify the exact isolated review project, branch, database and runtime role. Inspect the role's existing grants and confirm that application authorization remains server-side. If the gap still exists, the smallest proposed change is:

```sql
GRANT SELECT ON public.workspace_applications TO styld_review_runtime;
```

Do not run this against the integration QA source or production. No ownership, superuser, role-management, schema-creation or global table grants are required for this route. Rollback is REVOKE SELECT on this table from the same role, after checking no independently approved grant would be removed.

Other capabilities, including an authorized moderation operation and a remote Demo fixture lifecycle, require independent grant review. Local fixture creation and cleanup run under an owner confined to the fresh disposable cluster. They do not prove the review runtime can or should seed or delete remote records.

Better Auth signup, sessions, Private Saves and Plan reads/writes are exercised through actual application functions using the restricted local runtime. Those tests establish SQL compatibility with the schema reference and tested grants, not email delivery or live infrastructure readiness.
