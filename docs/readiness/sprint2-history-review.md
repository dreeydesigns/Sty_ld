# Build 1 unpublished history review

Accepted HEAD: 5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12. Test upstream: 65e0b816853ff2c9aa38c47e5fc4c21933325e1b. Exactly 33 commits ahead. The branch has no configured upstream; comparison explicitly names origin/work/pre-mvp-closeout-20261016.

Each row inventories the commit tree changes. Detailed paths and candidate results are in sprint2-history-audit.json. This is source review and local test evidence, not permission to deploy each historical state.

| Commit | Change | Review class | Files | Integration treatment |
| --- | --- | --- | --- | --- |
| bf24cb1c4f92f0ea0e501279be406347fe496364 | Add MVP backlog execution matrix and Sprint 1 audit | documentation, security or data boundary review | 1 | Retain as evidence; no independent runtime release needed. |
| 0fa3fab464d67649dd5226fea868f72975bb85d1 | Add IDEA-003 Save-first social implementation plan | documentation | 1 | Retain as evidence; no independent runtime release needed. |
| 30ad889460b0cccd5f219a8af1fffb326a9c9fce | Add IDEA-003 canonical post persistence decision | documentation | 1 | Retain as evidence; no independent runtime release needed. |
| e05430c7bc897f9deb08910804c2e841a74808a4 | Add canonical social post infrastructure | application, schema artifact, founder application only | 3 | Do not execute schema artifacts automatically; review against target schema. |
| 79e5971f3d2828c6e3e87709c47756326427bdd3 | Add secure private saves for canonical posts | application, security or data boundary review | 4 | Review final combined state and regressions; no individual deployment approval. |
| 79f59cb25074bd2069b4018d8e9b13ea19d8032f | Add Private Saves interface and saved collection | application | 2 | Review final combined state and regressions; no individual deployment approval. |
| 6b2a10e4d48a9c5f5c4b16a7135d0bc0e0cb839d | Add IDEA-003 verification report and regression tests | tests, documentation | 2 | Retain as evidence; no independent runtime release needed. |
| e4cc4bd36d5a10b8828a4be4a806a66fdf99a927 | Finalize IDEA-003 implementation report SHA | documentation | 1 | Retain as evidence; no independent runtime release needed. |
| 96b3d7f38228f5e773e6e89cd839cb7a920c9654 | Preserve canonical post save eligibility and client save helpers | application, security or data boundary review | 2 | Review final combined state and regressions; no individual deployment approval. |
| 324460932dfe204d040bfeb7f8dfa77055617ac3 | Add isolated PostgreSQL integration test harness | tests | 1 | Retain as evidence; no independent runtime release needed. |
| a1a11496f654dbc7eb7a85c61b1481b7129e5798 | Add isolated database integration test script |  | 1 | Retain as evidence; no independent runtime release needed. |
| 3a021dfe1648e503fd17446488d05962df879fa8 | Fix concurrency transaction sequencing in database integration test | tests | 1 | Retain as evidence; no independent runtime release needed. |
| e798172b3564ec4aebbe286556b3f4945fed74fd | Add Better Auth QA schema review migration | documentation, schema artifact, founder application only, security or data boundary review | 2 | Do not execute schema artifacts automatically; review against target schema. |
| 73be237b392a9a797d7e32fac0e2de38b27f8cef | Use auth pool for account and social post routes | application, tests, security or data boundary review | 6 | Review final combined state and regressions; no individual deployment approval. |
| 1f6f18b9a0de8c06d80cc02c617941a35794c54f | Use the auth pool in the remaining database routes | application, tests, security or data boundary review | 15 | Review final combined state and regressions; no individual deployment approval. |
| 053b49293087b40a847c73cbff66c6aa4f3c13e8 | Label the Saved feed tab and drop stale saves copy | application | 1 | Review final combined state and regressions; no individual deployment approval. |
| 64790358f4c6bbbcb95c66ffd4e87e365d8fba3f | Return a retryable 503 for auth failures and map verify errors to plain messages | application, tests, security or data boundary review | 4 | Review final combined state and regressions; no individual deployment approval. |
| 1e54fe0fdb6ee2cdfb33680d53789493a95f4520 | Absorb pool idle connection errors and log database failures without driver details | application, tests, security or data boundary review | 3 | Review final combined state and regressions; no individual deployment approval. |
| 9a8c6c80322f47d7da8e565f1e005d1e8189d7a7 | Restore the app shell and page title on Devices and security | application, security or data boundary review | 2 | Review final combined state and regressions; no individual deployment approval. |
| b631378f3e382da6c58f348c366ffdcdcca41391 | Classify API and library failures in logs instead of logging raw error objects | application, tests, security or data boundary review | 16 | Review final combined state and regressions; no individual deployment approval. |
| f12de72aff46c6d8843f7c3ba5f23796c998e870 | Publish a default document title, normalize metadata punctuation, and add route link integrity tests | application, tests | 10 | Review final combined state and regressions; no individual deployment approval. |
| 4de87d902119035eea66238cf1f93893cc38421c | Add a main landmark to the contact page for screen reader navigation | application | 1 | Review final combined state and regressions; no individual deployment approval. |
| 6ff7a96110edcdd94edf74bcaf778cfc217d8743 | Cover Private Saves routes with mocked session and storage regression tests | tests, security or data boundary review | 1 | Retain as evidence; no independent runtime release needed. |
| c11cbc6553532274786c5bee270ced9ada367876 | Document the overnight stabilization report for the founder | documentation | 1 | Retain as evidence; no independent runtime release needed. |
| a9e88b767d1187a0bada2a7333848cc875c7d567 | Brand the Terms and Conditions page title and guard it with a test | application, tests | 2 | Review final combined state and regressions; no individual deployment approval. |
| 1931a9df874cbf04c412a13506476020de136d8d | Document the release candidate decision review for the founder | documentation | 1 | Retain as evidence; no independent runtime release needed. |
| 8a1f2bd904d27dd4fd855b2560e692f35c2218be | Enforce workspace-owned service references on canonical social posts | application, tests | 4 | Review final combined state and regressions; no individual deployment approval. |
| 9686d9030c02e21f483f8689005e6f22580b1f6b | Add admin moderation review with transactional audit for social posts | application, tests, security or data boundary review | 4 | Review final combined state and regressions; no individual deployment approval. |
| e50471803739cf197b7b142fdf0df8722a1ff8ea | Build 1 Commit 2: Inspire Feed + Look Detail | application, tests | 11 | Review final combined state and regressions; no individual deployment approval. |
| 56fe4d85baff58937d720ece44c2400f3185ae7c | Build 1 Commit 3: Integrate Private Saves across Inspire and Saved | application, tests, security or data boundary review | 10 | Review final combined state and regressions; no individual deployment approval. |
| a65033bf66200d3e427e14c0c5266223dad06eab | Build 1 Commit 4: persist editable client plans and preserve return navigation | application, tests, security or data boundary review | 15 | Review final combined state and regressions; no individual deployment approval. |
| bb87fae7fa096bda577221a5670e19e5f9491e07 | Build 1 Commit 5: connect saved plans to truthful estimates | application, tests, security or data boundary review | 9 | Review final combined state and regressions; no individual deployment approval. |
| 5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12 | Complete Build 1 journey navigation and UX acceptance | application, tests, documentation, security or data boundary review | 16 | Review final combined state and regressions; no individual deployment approval. |

## Review snapshot reconciliation

The existing local publication repository is clean at 702783b427e28980f18d19bea5d3b7d71ccf2f6b, with one root commit and 482 files under source/. Blob comparisons establish identical content for every common source file except the declared Firebase substitution. No Git history was inherited.

Excluded source paths:

- .env.example
- QUICK_REFERENCE.md
- SECURITY_REMEDIATION_REPORT.md
- docs/API_CONTRACTS.md
- docs/archive/ADMIN_ACCOUNT_SETUP.md
- docs/archive/IMPLEMENTATION_QUICK_START.md
- docs/archive/SETUP_COMPLETE_SUMMARY.md
- firebase-blueprint.json

Changed source paths:

- firebase-applet-config.json

Extra source paths: 0. No workflow was present in the accepted source tree. The snapshot's eight exclusions and one substitution match its manifest. IDEA.md was never tracked and is not part of either source tree. Generated output, node_modules and live environment files are absent from the accepted tracked tree.

## Security disposition and integration proposal

The heuristic scan found a credential-shaped URL only in tests/error-disclosure-regression.cjs, used as synthetic redaction input. No real credential was validated, and no whole-history secret clearance is claimed. Source and snapshot can still contain sensitive business logic and should remain private. A dedicated secret scanner with redacted output is still a release gate; gitleaks was not available.

Do not deploy historical intermediate states. Early save/database fixtures and schema-review artifacts were superseded by later combined fixes. e798172 is a schema-review migration artifact, not authorization to apply it. Documentation and test-only commits do not require runtime rollout. No commit is recommended for automatic discard, rewrite or publication.

Keep the accepted branch and overnight branch intact. After founder authorization, create an isolated release candidate from the reviewed sanitized snapshot or another explicitly selected baseline, then apply a separately reviewed patch series for the approved local fixes. This is a proposal only: no release branch, cherry-pick, squash, rebase or merge was performed. Do not import the 33-commit history into the public repository by default.

Review the final combined source and exact allowlist of source files, preserve the Firebase sanitization and exclusions, run fresh secret/dependency scans and clean-install Linux gates, inspect the final staged diff, and record its tree/commit hashes. Use one approved protected Preview target with no inherited production credentials or automatic production workflow. Separately authorize live database/identity/fixture tests. Record prior deployment and rollback compatibility before any publication.

Commercial flag inspection: SHOP=false, DELIVERY=false, PAYMENTS_LIVE=false, BOOKING_COMMITMENTS=false. Inherited COUNTER=true and BOOKINGS=true expose surfaces, not permission to transact. None of the 33 commits modifies lib/feature-flags.ts. Existing tests assert these inherited settings. Founder must decide Counter scope before release; no flag was silently changed.
