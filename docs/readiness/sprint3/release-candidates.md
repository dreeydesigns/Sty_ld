# Focused local release candidates

No merge, rebase, cherry-pick, push or deployment is authorized. These are review groupings, not automatic integration commands. Every Sprint 3 commit has the verified Sprint 2 history as its Git ancestry. A reviewer must distinguish logical independence from a patch applying cleanly to an older snapshot.

| Candidate | Exact commits | Dependencies and boundary |
| --- | --- | --- |
| Build 1 stability | 3aff91f6c93f0d917d36f3bd9d8fd286f3809f12 | Upload quota failure closes before body/storage. Tests use the existing adapter harness. Review with the inherited same-origin work a5f20b7d5634a696cffe844914bf8599f2d71bbc and Plan restoration cbafb34d08e907d3d7f4c19b1ccb9548e3b6eea4 when selecting a candidate from accepted Build 1 |
| Authentication diagnostics and evidence | Sprint 2: 71a7263f913a79978dd5b7874ca880eaf0c9d097. Sprint 3: 82994d334b7cc57fabab7eb651b3cdaf5395a267 | Sprint 3 adds real local handler/SQL tests, not a new authentication mechanism or policy. Depends on inherited local database fixture/harness work 7087b26294e501b02ba7d5696a52dd76d1ddd8b0 and Sprint 2 error classification |
| Dependency/security remediation | 96da0cd0e03c55e35a2fd04b90c42fc4e274ac62, b8464e68bf6f352df4b2d547f9121a2f50842334, e631dc379437eaafaadc1d66181c32f82975f149, 07d0545c4dbe52f9d8003915453b7275de43ead4 | Ordered package/lock changes. Removal evidence precedes patches. Final override and clean installation belong with this exact lockfile. No major framework upgrade |
| Media/fixture policy and tooling | 957b4016d290b78855502bbabbeaf6b45d305838, e63d4034b18325b891ca2a0836a6066580bc6379, 5c86d383ef83181ccca73b9b5a52a208e7378b20 | Pure models, dry-run builder and original assets only. Asset tests resolve the e63d403 fixture contract. Does not enforce Cloudinary privacy or authorize a seed |
| Experimental Compare | baa4da4ee06435c5428bd59825b9ac423c544648 | Requires the existing Plan V2 client/API, canonical Looks, truthful estimate helpers and local SQL harness in the complete Sprint 2 base. Shared Plan extraction, read projection, UI and regressions are one review unit. Do not split off AppShell imports or publish a stability candidate with partial Compare files |

Sprint 2 documentation commit e515853cd2588618e3576931fd434f99a80bd23f and prior readiness documentation c151deba6e3217d3c5a4b69a31acca937c425412 remain preserved. Prior dry-run fixture commit ebe3761b9af9a6e4da7e73622c8e9dafd8976153 is not a remote seed authorization. The final Sprint 3 report/evidence commit is documentation only and is identified in the final response.

The published sanitized root 702783b427e28980f18d19bea5d3b7d71ccf2f6b has no inherited development history. Do not assume these patches can be mechanically cherry-picked onto it. Prepare and verify an explicit accepted-source release candidate only after founder review.
