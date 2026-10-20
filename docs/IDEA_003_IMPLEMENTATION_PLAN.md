# IDEA-003 Save-first social interactions implementation plan

## Source recovery

- Primary source: `STYLD_MVP_Backlog.md`, IDEA-003/MVP.
- Supporting source: `STYLD_Backlog_Master_Index.md`.
- Execution matrix: `docs/STYLD_MVP_BACKLOG_EXECUTION.md`.
- IDEA-003 recovered scope: specify a minimal Save, Comment and Share post interaction with private saved collections; Comment Likes only; no feed-post Like button; basic report and hide safeguards.
- Recovered prerequisites: secure account-isolated server storage, genuine counts, ownership and moderation before real multi-user use. UI prototypes must be labeled as prototypes.
- Status: MVP candidate, deferred and not approved for implementation.

## Verified current implementation

### Existing functionality

- `components/social-home.tsx` renders a media-first social feed with For You and Following tabs.
- Public feed posts are stored in browser localStorage under `ms_social_posts`.
- Public comments can be added to public posts.
- Sharing increments a public share count and uses the Web Share API or clipboard fallback.
- Post deletion is ownership-checked by `authorId`.
- Honest empty states and sample-data labels are present.
- Guest and authenticated experiences are separated.
- Beauty World ranking uses existing post and provider metadata only.

### Fail-closed functionality

- `lib/social-store.ts` returns empty saves, follows and followed authors.
- `isSaved`, `toggleSave` and `getSaveCount` return false or zero.
- `likePost`, `repostPost`, `bookmarkPost` and `archivePost` do not write shared storage.
- `readFollowedAuthors` and `toggleFollowAuthor` return empty or false.
- Private messages and bookings are disabled for browser-local containment.
- `components/social-home.tsx` shows "Likes aren't available yet.", "Reposts aren't available yet.", "Saving posts isn't available yet." and "Archiving posts isn't available yet."

### Existing tests

- `tests/phase8ba-containment.cjs` verifies that saves, follows, likes, bookmarks, reposts and archive fail closed and do not touch shared storage.
- The same file verifies that public posts, comments, shares and ownership-checked deletes remain available.
- The containment tests verify account switching does not expose another account's saves or follows.

### Missing or inactive functionality

- No account-owned saved posts.
- No saved collection view.
- No report workflow.
- No hide workflow.
- No block workflow.
- No moderation queue or moderation outcome handling.
- No rate limiting for comments or reports.
- No server-backed social API.
- No social database tables or migrations.
- No account-owned comment deletion endpoint.
- No canonical public content identity beyond browser-local post IDs.

## Recommended first vertical slice

### Private Saves only

Private Saves is the smallest safe slice of IDEA-003. It should be implemented only after founder approval.

Proposed scope:

- An authenticated client can save a public post.
- The same authenticated client can unsave a public post.
- Saved state persists across reload and sign-in for that account.
- Saved state is not visible to another account.
- Duplicate save and unsave actions are protected.
- Missing or deleted posts are shown honestly.
- No saved count is fabricated.
- No feed-post Like button is added.
- No moderation or report workflow is activated in this slice.

## Persistence and authorization findings

### Existing infrastructure

- `requireAuthenticatedUser` resolves the authenticated user and active workspace.
- `identity_workspaces` stores a JSON profile for the active workspace.
- `PATCH /api/users/me` already updates selected profile fields without a schema migration.
- Workspace profile updates are scoped to `id`, `user_id` and active status.
- Client session hydration uses `GET /api/me`.

### Proposed bounded persistence approach

The first slice can use the existing workspace profile JSON to store a `savedPostIds` array for the active client workspace. This avoids a new table or migration, but it still requires explicit API allowlisting and validation.

Required API changes for a future implementation:

- Allow `savedPostIds` in `PATCH /api/users/me`.
- Validate that the value is an array of strings.
- Enforce a maximum number of saved posts.
- Restrict the field to client workspaces.
- Return the updated profile through the existing response.
- Add client helpers to save and unsave a post.
- Hydrate saved state from the verified session.

### Authorization model

- Only an authenticated user with an active client workspace may save or unsave.
- The acting user may only modify their own active workspace profile.
- Guests cannot save.
- Professional and salon accounts are out of scope for the first slice unless explicitly approved.
- Account and workspace switches must clear or reload saved state.
- The server must remain authoritative.

### Account isolation

- Saved post IDs must be read from the verified session, not shared browser storage.
- The client cache may mirror the server response only.
- Cross-account and cross-workspace state must fail closed.
- Tests must verify that another account's saved IDs are not exposed.

## Moderation and privacy risks

- Comments are currently stored in shared browser localStorage and are not account-isolated.
- Public comments can be read by every account on the same origin.
- There is no server-backed moderation, reporting, hiding or blocking workflow.
- Activating comments without backend ownership and moderation would create privacy and safety risk.
- Save and share actions do not expose private user data, but saved references may reveal interests.
- Report, hide and block buttons must not show success unless a genuine record is created.

## Database and infrastructure requirements

No database migration is required for the first Private Saves slice if it uses the existing workspace profile JSON.

Required future authorization before broader IDEA-003 implementation:

- Server-backed comment storage if comments are activated.
- Moderation queue and moderation status handling.
- Report, hide and block records with ownership rules.
- Rate limiting for comment and report creation.
- Canonical content identity for saved posts.
- Abuse prevention and privacy review.

## UI components affected

- `components/social-home.tsx`
- `components/marketplace-ui.tsx`
- Post card components inside `components/social-home.tsx`
- Saved collection view, if added
- Profile or account surfaces, if saved collections are exposed
- `lib/social-store.ts`
- `lib/client-session.ts`
- `app/api/users/me/route.ts`

## Test matrix

- Authenticated client can save a public post.
- Authenticated client can unsave a public post.
- Save state persists across reload.
- Save state persists across sign-in.
- Guest cannot save.
- Professional and salon accounts cannot use the first slice unless approved.
- Account switching does not expose another account's saved posts.
- Workspace switching does not expose another workspace's saved posts.
- Duplicate save and unsave actions are idempotent.
- Missing posts are shown honestly.
- No fake saved count is displayed.
- No feed-post Like button is introduced.
- Existing containment tests continue to pass.

## Browser QA matrix

- Desktop and mobile feed rendering.
- Save and unsave interaction.
- Loading, success and failure states.
- Keyboard focus and screen reader labels.
- Reduced motion compatibility.
- All six Beauty Worlds.
- Guest and authenticated flows.
- Account switching.
- No horizontal overflow.

## Rollback strategy

- The first slice should be implemented as a separate reviewable commit.
- If rolled back, saves return to the existing fail-closed behavior.
- No database migration or schema rollback is required for the profile-JSON approach.
- Public posts, comments and shares remain unchanged.

## Implementation phases

1. Founder approval of bounded Private Saves scope.
2. Add profile field allowlisting and validation.
3. Add client save and unsave helpers.
4. Hydrate saved state from the verified session.
5. Update post card UI and add a saved collection view.
6. Add regression tests.
7. Run TypeScript, lint, tests, build and theme audit.
8. Perform desktop and mobile browser QA.
9. Create a local commit and stop for review.

Comments, sharing improvements, report, hide and block remain separate future proposals and should not be combined with the first slice.

## Required founder approvals

- Approve Private Saves as the first IDEA-003 slice.
- Approve storing saved post references in the active workspace profile JSON.
- Approve maximum saved post count and validation rules.
- Approve whether Professional and salon accounts may save posts.
- Approve whether saved collections are exposed in Profile or remain feed-only.
- Approve any future comment storage, moderation, report, hide or block work before implementation.

## Verification

- No code changes were made in this investigation.
- No database migration was run.
- No authentication settings were changed.
- No booking or payment capability was activated.
- Documentation only.
