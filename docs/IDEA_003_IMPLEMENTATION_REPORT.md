# IDEA-003 implementation report

## Final canonical post schema

Table: `social_posts`

- `id uuid primary key default gen_random_uuid()`
- `author_user_id uuid not null references users(id) on delete cascade`
- `author_workspace_id uuid not null references identity_workspaces(id) on delete cascade`
- `author_name text not null`
- `author_slug text`
- `author_role text not null check (author_role in ('client', 'professional', 'salon'))`
- `post_type text not null check (post_type in ('before_after', 'inspo', 'tip', 'portfolio', 'promotion'))`
- `caption text not null`
- `tags text[] not null default '{}'`
- `media_urls text[] not null default '{}'`
- `visibility text not null default 'public' check (visibility in ('public', 'private'))`
- `publication_status text not null default 'pending' check (publication_status in ('pending', 'published', 'rejected'))`
- `moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'removed'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`
- Tag limit: 10
- Media limit: 4

Indexes:

- public created index for non-deleted, public, published, visible posts
- author workspace index
- author user index

## Migration file and migration safety

- Migration file: `sql/migrations/012_social_posts.sql`
- The migration is additive and uses `CREATE TABLE IF NOT EXISTS`.
- It was not executed against a shared database.
- No existing table was altered.
- No data was imported from browser-local storage.

## API contracts

Post routes:

- `GET /api/social/posts?limit=&offset=` returns published, visible, non-deleted public posts.
- `GET /api/social/posts?ids=` returns eligible posts by ID.
- `POST /api/social/posts` creates a canonical post for an authorized creator workspace. New posts default to `pending`.
- `GET /api/social/posts/[id]` returns an eligible public post, or an owner's own post.
- `DELETE /api/social/posts/[id]` soft-deletes an owner's post.

Save routes:

- `GET /api/social/saves` returns the current client workspace saved post IDs.
- `POST /api/social/saves` saves one eligible or owned post.
- `DELETE /api/social/saves/[postId]` removes one saved reference.

## Ownership and role policy

- Author identity is derived from `requireAuthenticatedUser`.
- Post creation is limited to client, professional and salon workspaces.
- Editing is not implemented.
- Deletion requires matching `author_user_id` and `author_workspace_id`.
- Private Saves are limited to client workspaces.
- Guests, professional, salon and admin workspaces cannot use Private Saves.

## Media reference policy

- Only Cloudinary HTTPS URLs under the configured cloud name are accepted.
- Maximum of 4 media references per post.
- Maximum caption length is 2000 characters.
- Maximum of 10 tags, each 40 characters or fewer.

## Publication gate

- New canonical posts default to `pending`.
- Public endpoints return only `published`, `public`, `visible`, non-deleted posts.
- Owners can retrieve their own pending posts.
- No unrestricted public user-generated publishing is active.

## Private Saves and concurrency strategy

- Saved references are stored in the existing client workspace profile JSON under `savedPostIds`.
- Save and unsave use database transactions with `FOR UPDATE`.
- Duplicate IDs are removed before writing.
- The maximum is 100 saved posts.
- The complete array is not overwritten from an outdated browser session.
- Failed saves roll back the optimistic client state.

## Saved collection behavior

- The Saved tab loads canonical posts by saved ID.
- Deleted or unavailable posts show an honest unavailable state.
- Save and unsave update the UI only after server confirmation.
- No saved count is fabricated.

## Legacy browser-local compatibility

- Existing browser-local posts remain available as demonstration content.
- No browser-local posts are imported into the shared database.
- New canonical posts can coexist with legacy posts.
- Private Saves reference canonical post IDs only.

## Testing results

- `npm.cmd test`: 475/475 PASS
- `npx.cmd tsc --noEmit`: PASS
- `npm.cmd run lint`: PASS, 0 errors, 31 pre-existing warnings
- `npm.cmd run build`: PASS
- `npm.cmd run theme:audit`: PASS
- `git diff --check`: PASS

## Deployment dependencies

- Founder approval to apply the additive migration to a shared database.
- Cloudinary configuration for media uploads.
- Existing authentication and workspace infrastructure.

## Moderation prerequisites

- Public publishing remains gated.
- Report, hide and block are not implemented.
- Comments and comment likes remain deferred.
- Feed-post likes remain unavailable.

## Rollback procedure

- Revert the application commits.
- Leave the additive `social_posts` table unused.
- No schema rollback is required.
- Saved references fail closed if the feature is disabled.

## Remaining risks

- Canonical posts are pending by default, so public UGC is not yet visible.
- Saved references to pending or deleted posts are handled honestly but may produce unavailable items.
- Comment and moderation infrastructure is not implemented.
- Authenticated and cross-device browser QA remains unverified.

## Commit SHAs

- Commit A, canonical post infrastructure: `e05430c7bc897f9deb08910804c2e841a74808a4`
- Commit B, secure private saves: `79e5971f3d2828c6e3e87709c47756326427bdd3`
- Commit C, Private Saves interface and saved collection: `79f59cb25074bd2069b4018d8e9b13ea19d8032f`
- Commit D, verification and report: recorded after this commit is created
