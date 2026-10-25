# Pending media privacy, proposed remediation

Status: design only. No Cloudinary, upload, schema, environment or moderation changes were made.

## Confirmed exposure

`app/api/upload/route.ts` uploads images with a folder and transformation but no restricted delivery type, then returns `secure_url` directly. HTTPS protects transport, not authorization. `lib/cloudinary.ts` also omits a restricted delivery type. Post publication checks in `app/api/social/posts` cannot revoke a URL obtained at upload time. A folder containing the user's ID is not an access control.

The upload limiter currently catches a database error and continues. Record this as a separate cost/abuse risk for the approved upload-hardening slice. This sprint deliberately leaves upload behavior unchanged.

## Recommended design

Use a dedicated review media product environment first. Keep pending originals and derivatives under authenticated delivery, not merely private delivery. Cloudinary documents that private derivatives can remain public, while authenticated originals and derivatives require authorization. A signed delivery URL alone does not provide an expiry or prevent sharing. [Cloudinary access controls](https://cloudinary.com/documentation/control_access_to_media).

Application flow proposed for separate approval:

1. Resolve the current server session and active Professional or Salon workspace. Enforce same-origin checks, fail-closed quotas, bounded image bytes and approved image formats before upload. Generate opaque asset IDs on the server. Never accept an arbitrary remote fetch URL.
2. Upload into authenticated delivery. Generate only approved derivative sizes eagerly. Store asset ID, public ID, version, delivery type, owner workspace, resource type and moderation state. Do not persist a signed URL as the canonical asset identifier.
3. Keep pending media out of public post and creator serializers. An owner or MFA-authorized moderator can request a small derivative through a dedicated server authorization boundary. Recheck post ownership or moderation authority for every access.
4. Prefer a same-origin authenticated media proxy for the pilot. Fetch approved derivatives server-side, return `Cache-Control: private, no-store`, avoid redirects exposing durable signatures, and reject arbitrary transformation strings. This avoids depending on paid token delivery. If choosing CDN delivery later, first verify token-access entitlement, configure a narrowly scoped path and short expiry, then test expiration and revocation. Do not assume the existing account supports it.
5. Approval locks the pending post and checks service ownership. Prepare a separate sanitized public derivative with a new public ID, then commit the public mapping and audited publication state together. Cloudinary and PostgreSQL cannot share a transaction, so use explicit pending/ready/failure transitions and an idempotent retry design. A failed publication must leave the post unpublished. This needs a separately approved media manifest schema or equivalent durable server storage.
6. Retain the restricted original. Public APIs expose only the approved derivative. Rejection removes access through the application immediately; an approved cleanup worker deletes restricted assets only after a retention decision.
7. Unpublishing removes the mapping before deleting the public derivative and requesting CDN invalidation. Cached or already downloaded public images cannot be recalled reliably. Disclose that limit rather than promising immediate global erasure. Avoid public URLs for material that must remain revocable.

## Migration and verification

Inventory existing asset IDs and owners without downloading personal media. Classify published, pending, rejected, orphaned and unknown ownership separately. Existing public pending URLs require restricted re-ingestion or a delivery-type transition plus invalidation; changing a database URL alone is insufficient. Quarantine unknown ownership, do not mass-delete. Maintain an approved migration manifest, checksums and rollback references. Do not run this against production without a separately reviewed plan.

Required approval covers upload behavior, media manifest storage/schema, review Cloudinary environment/credentials, proxy or token delivery, eager transformations, retention and legacy migration. No values belong in source or logs. Keep Cloudinary API secrets server-only. Remove signed URLs from analytics and error payloads.

Acceptance must test anonymous denial of pending originals and every derivative, owner and moderator access, wrong-workspace denial, expired/replayed access, rejected content, publication failure recovery, idempotent retries, unpublish invalidation and cache behavior. Use synthetic images only. Real portfolio uploads remain blocked until these pass.
