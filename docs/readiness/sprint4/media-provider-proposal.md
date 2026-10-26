# Pending media protection proposal

## Current exposure

The current upload route sends an image to Cloudinary without a restricted delivery type and returns secure_url and public_id to the browser before a post is moderated. The folder is user-scoped, but a folder name is not access control. There is no durable trusted asset manifest tying provider asset identity, workspace ownership, post moderation and revocation together. A failed post creation can leave an orphaned uploaded asset. Existing upload failure handling does not solve this confidentiality problem.

Cloudinary documents that authenticated delivery protects original and derived assets. Private delivery alone protects the original while derived delivery has different rules. Ordinary URL signing must not be described as a short-lived authorization token. Use an explicitly expiring provider-supported mechanism only after verifying its account availability and semantics. See [media access controls](https://cloudinary.com/documentation/control_access_to_media).

Previously delivered media can remain cached after storage deletion. Provider invalidation does not remove copies already downloaded or held in external caches. See [cache invalidation](https://cloudinary.com/documentation/invalidate_cached_media_assets_on_the_cdn) and [asset deletion](https://cloudinary.com/documentation/delete_assets).

## Proposed smallest rollout

1. Founder approves a dedicated isolated review media environment or verified account boundary and authenticated storage for new pending originals and all transformations. Do not change live settings in Sprint 4.
2. Use only a synthetic geometric test asset. Verify that unsigned original URLs, derived transformations, alternate formats, versioned and unversioned paths, and any previously issued public paths deny unauthenticated access. Verify that no anonymous/public access window overrides token protection. Confirm effective settings rather than inferring security from an upload response.
3. Approve a durable server-owned manifest design. Bind immutable provider asset ID, provider account, resource/delivery type, folder-aware public ID, provider version, owner workspace, post reference, application version, state, expiry and revocation. Ordinary client captions, tags, URL strings and folder fields cannot establish ownership or privacy.
4. Wire a protected server handler only after the manifest and provider checks exist. Resolve the actual authenticated actor and fresh ownership server-side, constrain signed upstream destinations, enforce bounded access and byte sizes, and recheck state after asynchronous work. Never return the upstream signing URL to the client or put pending media through public image optimization caches.
5. Keep pending assets restricted during approval. Publication requires a current eligible post/service and an explicitly approved public derivative of the reviewed version. Audit the database transition, then perform provider work through a retryable reconciliation operation. There is no cross-system database/Cloudinary transaction. Fail closed if either side is incomplete.
6. Rejection, deletion, ownership change and re-review revoke handler access immediately and queue provider deletion/invalidation with recorded receipts. Verify every original/derived URL variant and document cache propagation. Unknown or already public legacy assets remain blocked for real photographs until reviewed individually.
7. Define owner-scoped orphan retention and cleanup using verified asset manifests. Do not delete assets based only on a caption, a user-provided public ID or a broad folder prefix. Require a founder-approved cleanup scope and refusal on unrelated assets.

## Compatibility and approval gate

Existing image consumers expect public secure_url strings, including Next image optimization. Authenticated URLs and a session-protected media endpoint cannot be silently substituted into that cache path. Cloudinary public IDs may contain folder separators; the local policy's opaque asset ID must not be confused with that provider public ID. A trusted mapping is required.

Approval is needed for provider configuration, synthetic upload and unauthenticated delivery probes, the durable manifest contract, any necessary schema migration, an application adapter/route rollout and scoped legacy cleanup. Keep genuine professional photographs blocked until those checks pass. The local media contract and mocked signing tests are implementation evidence, not proof of provider-level confidentiality.
