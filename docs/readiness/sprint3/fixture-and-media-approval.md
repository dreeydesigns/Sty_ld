# Fixture and media operation proposal

No remote executor is included. fixture-dry-run.json is an actual local builder result, not a database receipt.

## Fixture contract

The example run contains four fictional workspaces (one professional, one salon, two clients), three services and six pending Looks. Each record has a deterministic UUID derived from its run ID and logical key. Services point to provider workspace IDs. Each Look points to that same provider and exactly one canonical svc:<service UUID> tag. Captions are explicitly Demo. The reserved qa:demo marker is valid only within this founder-authorized operation model. Ordinary user captions and tags do not authorize Demo provenance. Existing user-facing APIs must continue rejecting reserved markers.

Workspace fields: key, id, role, status, displayName. Service fields: key, id, workspaceId, isActive, name, price. Look fields: key, id, workspaceId, tags, caption, publicationStatus, moderationStatus, mediaRef. The manifest contains version, runId, exact target identity, provenance and checksum. Explicit fictional prices are demonstration inputs, not real provider offers. No ratings, completed appointments, verification, customer emails or claimed availability are generated.

The six mediaRef values resolve to original locally generated geometric PNGs under tests/fixtures/demo-assets. Each image visibly says DEMO and contains no people or third-party photo. manifest.json records provenance, intended review-only use, dimensions and SHA-256. scripts/demo-assets.cjs regenerates the same files and validates exact references, paths, provenance and checksums. Tampered files and traversal paths are rejected. The historical synthetic-approved names do not imply founder approval for remote upload or publication. No genuine woman's image or customer record is used. This package does not upload those files.

## First controlled seed approval

1. Founder approves the exact isolated project, branch, database, runtime privileges, run manifest and bounded cleanup scope. Tooling must verify actual observed target identity, not trust a caller's environment label.
2. Authorized testers complete real OTP onboarding. Resolve real user/workspace IDs and role ownership from server records. Rebuild and review the manifest with those IDs. Local deterministic workspace IDs are simulation IDs, not proof that auth-created workspaces exist.
3. Implement and approve a restricted server executor that rechecks ownership, authorization and manifest integrity before every operation. A checksum is not a permission token. Do not grant ordinary users the ability to set qa:demo.
4. Create/reuse only manifest-owned active services, then privately uploaded synthetic media, then pending Looks using the normal APIs and canonical ownership checks. An independently authenticated MFA reviewer performs normal moderation; the author cannot self-approve. Publication is never automatic.
5. Record only actually created record IDs and asset IDs in an authenticated receipt. Matching existing records are reused and excluded from deletion. A mismatch aborts rather than overwriting.
6. Partial failure produces reverse-order rollback planning. Any actual deletion requires the approved receipt, current ownership and relationship checks, and confirmation that no unrelated dependant records were created. Cleanup must not cascade into genuine users, Saves, Plans or other content. Retain an audit trail.

Local tests cover wrong/production target, malformed identity, cross-provider service references, duplicates, inactive or missing provider/service, invalid publication state, forged marker/provenance, checksum/receipt tampering, unrelated cleanup and partial failure. Dry-run idempotency means the same manifest yields the same plan, not that a remote seed has succeeded.

## Media policy versus enforcement

lib/pending-media-policy.cjs models authorization, MFA review, short expiry, private no-store delivery, version-bound publication, revocation and cleanup ordering. It refuses public pending delivery and unverified storage restrictions. It is deliberately not wired into the running upload path.

A real privacy release still needs approved Cloudinary restriction/private-delivery configuration, a durable server-owned asset-to-workspace manifest, reviewed access endpoints, authenticated derivative publication, cache invalidation and safe orphan retention/cleanup. SQL publication and provider storage updates cannot be assumed to be one atomic transaction. Use audited intent/outcome states with compensating cleanup and do not claim success before both systems confirm it. Those provider and schema/permission decisions need separate authorization.
