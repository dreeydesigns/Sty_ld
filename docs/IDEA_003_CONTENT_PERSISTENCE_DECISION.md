# IDEA-003 canonical post persistence decision

## Confirmed root issue

Public feed posts and comments are browser-local. They are stored in `localStorage` under `ms_social_posts` and created with client-generated IDs. A saved post reference therefore cannot be retrieved reliably on another device or browser.

Cross-device Private Saves are not possible until post content has a canonical, server-retrievable source.

## Existing post architecture

### Source evidence

- `lib/social-store.ts` stores public posts in `localStorage` under `ms_social_posts`.
- `readPosts()` reads and filters browser-local posts.
- `writePost()` writes a new post to browser-local storage.
- `addComment()` writes comments to browser-local storage.
- `sharePost()` writes a share count to browser-local storage.
- `deletePost()` soft-deletes a post in browser-local storage.
- `publish()` in `components/social-home.tsx` creates a post with `id: post_${Date.now()}`.
- No social post, comment, save or follow API route exists.
- No social post, comment, save or follow table exists in the SQL migrations.
- Existing authorized infrastructure includes `requireAuthenticatedUser`, `identity_workspaces`, workspace profile JSON, and the Cloudinary upload route.

### Answers to required questions

1. All posts are browser-local. No server source exists.
2. Post IDs are generated in the browser with `Date.now()`. They are not globally unique or stable across devices.
3. A second authenticated device cannot retrieve a post by ID.
4. A client can create a browser-local post, but cannot persist a save across devices. Saves fail closed.
5. Deletion is soft-delete by `authorId` in the same browser only. It has no cross-device effect.
6. There is no server retrieval path. Browser storage is origin-shared, so authorization is not enforced server-side for posts.
7. Existing authorized infrastructure can support authenticated post creation and workspace-scoped profile data, but it cannot store canonical public posts without a new table or equivalent approved storage.
8. Concurrent saves are not supported safely. Browser-local updates can overwrite each other, and no transaction or row lock protects them.

## Existing infrastructure that can be reused

- `requireAuthenticatedUser` for authentication.
- `identity_workspaces` for active workspace ownership.
- Workspace profile JSON for account-owned references.
- `PATCH /api/users/me` for scoped profile updates.
- Cloudinary upload route for image storage and secure URLs.
- Existing rate-limit table for upload throttling.

## Minimum safe architecture

### Canonical posts

Create a server-backed post record with a server-generated UUID. The first implementation should store the post metadata and media URLs, not binary image data.

Proposed fields:

- `id uuid primary key`
- `author_user_id uuid not null references users(id)`
- `author_workspace_id uuid not null references identity_workspaces(id)`
- `author_name text not null`
- `author_slug text`
- `author_role text not null check (author_role in ('client','professional','salon'))`
- `post_type text not null`
- `caption text not null`
- `tags text[] not null default '{}'`
- `media_urls text[] not null default '{}'`
- `visibility text not null default 'public' check (visibility in ('public','private'))`
- `created_at timestamptz not null default now()`
- `deleted_at timestamptz`
- `moderation_status text not null default 'visible' check (moderation_status in ('visible','hidden','removed'))`

### Saved references

Use the existing client workspace profile JSON for the first slice:

- Profile key: `savedPostIds`
- Value: array of canonical post UUIDs
- Owner: active client workspace
- Validation: string array, maximum 100 unique IDs
- No separate saved-post table in the first slice

This keeps the account-owned save state server-backed while avoiding a second migration.

### Required API routes

- `GET /api/social/posts` for canonical public post retrieval.
- `POST /api/social/posts` for authorized post creation.
- `GET /api/social/posts/[id]` for canonical post retrieval.
- `DELETE /api/social/posts/[id]` for owner-controlled soft delete.
- `PATCH /api/users/me` extension for `savedPostIds`.

Optional later routes:

- `POST /api/social/posts/[id]/comments`
- `DELETE /api/social/comments/[id]`
- `POST /api/social/reports`

### Ownership policy

- Post creation requires an authenticated user and authorized workspace.
- Post ownership is determined by `author_user_id` and `author_workspace_id`.
- Only the owner may delete their post.
- Saved references belong to the active client workspace.
- A user may only modify saved references for their own active workspace.
- Guests cannot create posts or save posts.
- Professional and salon posting requires role authorization.

### Save and unsave behavior

- Save stores the canonical post ID in the active client workspace profile.
- Unsave removes the ID from that profile.
- Missing or deleted posts return an honest unavailable state.
- No saved count is fabricated.
- No cross-account access is permitted.
- Duplicate save and unsave actions are idempotent.

### Private saved collection behavior

- Saved collection is scoped to the authenticated account and active workspace.
- Collection items are resolved from canonical post IDs.
- Unresolved references are shown honestly and may be removed by the user.
- No fake engagement metrics are shown.

### Deleted post behavior

- Post deletion is soft delete using `deleted_at`.
- Saved references to deleted posts resolve to an unavailable state.
- The saved collection does not silently remove references unless the user unsaves them.
- Public feeds exclude soft-deleted posts.
- Audit and moderation records remain available to authorized administrators.

## Storage option comparison

### Option A: Existing authorized database and JSON storage without schema changes

- Changes required: reuse `identity_workspaces.profile` JSON for post-like records and saved references.
- Security implications: poor. Public posts need cross-author retrieval and authorization boundaries that profile JSON cannot provide safely.
- Cross-device reliability: low for public posts.
- Concurrency behavior: poor for shared content.
- Scalability limitations: high.
- Moderation readiness: low.
- Implementation complexity: low for saved references only, high for public posts.
- Migration requirements: none, but not viable for canonical posts.

### Option B: Minimal server-backed post record with saved references in existing Client workspace profile JSON

- Changes required: one migration for `social_posts`, new authorized API routes, profile field allowlisting, client helpers and tests.
- Security implications: good if ownership and authorization are enforced server-side.
- Cross-device reliability: good.
- Concurrency behavior: acceptable for saved references with transactional row locking; public post writes are independent records.
- Scalability limitations: moderate; suitable for MVP.
- Moderation readiness: basic; visibility and moderation status can be added now.
- Implementation complexity: moderate.
- Migration requirements: one additive migration.

### Option C: Dedicated canonical posts and saved-post records

- Changes required: `social_posts` table plus `saved_posts` table with unique user or workspace and post constraints.
- Security implications: strongest.
- Cross-device reliability: good.
- Concurrency behavior: strongest; unique constraints prevent duplicate saves.
- Scalability limitations: low for MVP.
- Moderation readiness: strongest.
- Implementation complexity: higher.
- Migration requirements: two additive migrations.

## Recommendation

Recommend Option B for the first implementation, with Option C held as the next step if concurrency, moderation or audit requirements increase.

Option B is the smallest architecture that provides canonical, server-retrievable posts and account-owned saved references. It reuses the existing workspace profile JSON for saved references and requires one additive migration for posts. It does not require changing authentication or environment settings.

Option C should be adopted before comments, likes, report, hide or block become operational because those features need transactional integrity and stronger moderation support.

## Required founder approvals

- Approve the additive `social_posts` migration.
- Approve canonical public post storage in the production database.
- Approve media reference handling through Cloudinary URLs.
- Approve maximum saved post count and validation rules.
- Approve whether Professional and salon accounts may create posts in the first slice.
- Approve whether saved collections are exposed in Profile or remain feed-only.
- Approve the future migration to dedicated saved-post records before comments or moderation are activated.

## Incremental implementation sequence

1. Founder approval of Option B.
2. Add the additive `social_posts` migration.
3. Implement authorized post creation and retrieval.
4. Implement owner-controlled soft delete.
5. Implement `savedPostIds` in workspace profile JSON.
6. Add save and unsave helpers.
7. Hydrate saved state from the verified session.
8. Update post card UI and saved collection view.
9. Add regression tests.
10. Run TypeScript, lint, tests, build and theme audit.
11. Perform desktop and mobile browser QA.
12. Create a local commit and stop for review.

Comments, likes, sharing improvements, report, hide and block remain separate future proposals.

## Rollback approach

- The migration is additive and can be left unused if rolled back.
- Application changes can be reverted without schema rollback.
- Public posts can remain browser-local until the server-backed routes are activated.
- Saved references fail closed if the feature is disabled.

## Verification

- No code changes were made in this investigation.
- No database migration was run.
- No authentication settings were changed.
- No booking or payment capability was activated.
- Documentation only.
