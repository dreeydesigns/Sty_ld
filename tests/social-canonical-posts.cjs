const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('canonical social post migration defines one additive social_posts table', () => {
  const migration = read('sql/migrations/012_social_posts.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS social_posts/);
  assert.match(migration, /author_workspace_id uuid NOT NULL REFERENCES identity_workspaces/);
  assert.match(migration, /deleted_at timestamptz/);
  assert.match(migration, /publication_status text NOT NULL DEFAULT 'pending'/);
});

test('canonical post APIs enforce server ownership and eligible reads', () => {
  const posts = read('app/api/social/posts/route.ts');
  const post = read('app/api/social/posts/[id]/route.ts');
  assert.match(posts, /requireAuthenticatedUser/);
  assert.match(posts, /publication_status = 'published'/);
  assert.match(posts, /moderation_status = 'visible'/);
  assert.match(post, /author_user_id = \$\d/);
  assert.match(post, /author_workspace_id = \$\d/);
  assert.match(post, /deleted_at = now/);
});

test('private saves are client-only and transactionally guarded', () => {
  const saves = read('app/api/social/saves/route.ts');
  const unsave = read('app/api/social/saves/[postId]/route.ts');
  const store = read('lib/social-saves.ts');
  assert.match(saves, /session.workspace\?\.role !== "client"/);
  assert.match(store, /FOR UPDATE/);
  assert.match(store, /MAX_SAVED_POSTS = 100/);
  assert.match(store, /jsonb_set/);
  assert.match(unsave, /export async function DELETE/);
});

test('client profile can carry saved post references', () => {
  const personalization = read('lib/personalization.ts');
  const clientSession = read('lib/client-session.ts');
  assert.match(personalization, /savedPostIds\?: string\[\]/);
  assert.match(clientSession, /saveSocialPost/);
  assert.match(clientSession, /unsaveSocialPost/);
});

test('social interface has a saved collection without feed-post likes', () => {
  const socialHome = read('components/social-home.tsx');
  assert.match(socialHome, /No saved posts yet/);
  assert.match(socialHome, /handleSaveToggle/);
  assert.match(socialHome, /savedPostIds/);
  assert.doesNotMatch(socialHome, /handleLike\(\) \{\s*\/\/ CONTAINMENT[\s\S]{0,120}guard\(\(\) => onToast\("Likes aren't available yet\."\)\)/);
});

test('canonical post references can be stored on social posts', () => {
  const store = read('lib/social-store.ts');
  assert.match(store, /canonicalId\?: string/);
});
