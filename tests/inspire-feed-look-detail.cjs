/**
 * Inspire Feed, Look Detail and Plan handoff integrity suite (Build 1 Commit 2).
 *
 * Locks the Commit 2 contract:
 *   1. /discover?tab=looks renders only eligible canonical posts, never the
 *      catalogue sample looks (no confusing mixture).
 *   2. Look Detail fails closed without a server-validated look and offers
 *      exactly one primary CTA carrying look, creator and service ids.
 *   3. The creator endpoint is a public allowlist with no account fields.
 *   4. The Plan resolves canonical service UUIDs through the public service
 *      list and never calls booking or payment APIs.
 *   5. Tab, search, chip and filter state stays in the URL so Back restores it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('Discover looks tab sources only canonical eligible posts', () => {
  const discover = read('components/discover-content.tsx');
  assert.match(discover, /loadInspireFeed\(\)/);
  assert.match(discover, /<InspireLookCard key=\{look\.id\} item=\{look\}/);
  assert.doesNotMatch(discover, /<LookCard key=/);
  assert.doesNotMatch(discover, /BEAUTY_LOOKS/);
  assert.match(discover, /No published looks yet/);
  assert.match(discover, /Looks are unavailable right now/);
  assert.match(discover, /rankByBeautyWorld\(matchedLooks, beautyWorld, providerAffinity\)/);
});

test('Discover keeps tab, search, chip and filter state in the URL', () => {
  const discover = read('components/discover-content.tsx');
  assert.match(discover, /params\.set\("chip", quickLookChip\)/);
  assert.match(discover, /params\.append\("sel", value\)/);
  assert.match(discover, /searchParams\s*\.getAll\("sel"\)/);
  assert.match(discover, /LOOK_QUICK_CHIPS\.includes\(chipParam\)/);
  assert.match(discover, /Reset/);
  assert.match(discover, /lookFilterSections/);
});

test('Inspire cards navigate to Look Detail without booking claims', () => {
  const marketplace = read('components/marketplace-ui.tsx');
  const card = marketplace.slice(marketplace.indexOf('export function InspireLookCard'));
  assert.ok(card.length > 0, 'InspireLookCard must exist');
  assert.match(card, /href=\{`\/looks\/\$\{item\.id\}`\}/);
  assert.match(card, /From \{formatListedPrice\(listedPriceInCents\(item\.service\.price\)\)\}/);
  assert.match(card, /Demo/);
  assert.doesNotMatch(card, /Book now|Book this|Reserve|Checkout/i);
});

test('Look Detail fails closed and carries the full plan handoff', () => {
  const detail = read('app/looks/[postId]/page.tsx');
  const ctaCount = (detail.match(/Plan this look/g) ?? []).length;
  assert.equal(ctaCount, 1, 'exactly one primary CTA');
  assert.match(detail, /payload\.post\.look/);
  assert.match(detail, /setStatus\("unavailable"\)/);
  assert.match(detail, /serviceIds=\$\{encodeURIComponent\(item\.service\.id\)\}/);
  assert.match(detail, /look=\$\{encodeURIComponent\(item\.id\)\}/);
  assert.match(detail, /workspace=\$\{encodeURIComponent\(item\.authorWorkspaceId\)\}/);
  assert.match(detail, /The service for this look is unavailable right now\./);
  assert.match(detail, /href=\{`\/creators\/\$\{item\.authorWorkspaceId\}`\}/);
  assert.match(detail, /useLookReturn/);
  assert.match(detail, /back\.label/);
  assert.match(detail, /Estimates only\. Booking is not available yet\./);
  assert.doesNotMatch(detail, /paid|payment|confirmed|secured|guaranteed|instant|reserved/i);
});

test('Creator endpoint exposes an allowlisted profile only', () => {
  const route = read('app/api/creators/[workspaceId]/route.ts');
  assert.match(route, /CREATOR_ROLES = new Set\(\["professional", "salon"\]\)/);
  assert.match(route, /status !== "active"/);
  assert.match(route, /isUuid\(workspaceId\)/);
  assert.match(route, /profilePhoto/);
  assert.doesNotMatch(route, /\bemail\b/i);
  assert.doesNotMatch(route, /\bphone\b/i);
  assert.doesNotMatch(route, /SELECT \*/);

  const page = read('app/creators/[workspaceId]/page.tsx');
  assert.match(page, /No published looks yet/);
  assert.match(page, /InspireLookCard/);
  assert.doesNotMatch(page, /Verified|verification/i);
  assert.doesNotMatch(page, /rating/i);
});

test('Posts feed supports a server-side creator filter', () => {
  const posts = read('app/api/social/posts/route.ts');
  assert.match(posts, /authorWorkspaceId/);
  assert.match(posts, /Invalid creator reference\./);
  assert.match(posts, /AND \(\$3::uuid IS NULL OR author_workspace_id = \$3\)/);
  assert.match(posts, /publication_status = 'published'/);
  assert.match(posts, /moderation_status = 'visible'/);
});

test('Plan resolves canonical service UUIDs from the public service list', () => {
  const plan = read('components/appointment-planning.tsx');
  assert.match(plan, /fetch\("\/api\/services"\)/);
  assert.match(plan, /services: catalog/);
  assert.match(plan, /service\.workspaceId === draft\.creatorWorkspaceId/);
  assert.match(read('lib/plan-repository.ts'), /s\.workspace_id/);
  assert.match(plan, /Back to the look/);
  assert.match(plan, /isUuid\(lookParam\)/);
  assert.doesNotMatch(plan, /\/api\/bookings|\/api\/payments|payment_status/);
  assert.match(plan, /Preview only\. Prices are estimates\. Booking is not available yet\./);
});

test('Plan context accepts canonical service UUIDs as a general selection', () => {
  const { sanitizePlanContext } = require('../lib/plan-context.cjs');
  const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const context = sanitizePlanContext({ serviceIds: uuid });
  assert.equal(context.mode, 'general');
  assert.deepEqual(context.serviceIds, [uuid]);

  const partial = sanitizePlanContext({ targetType: 'professionals', serviceIds: uuid });
  assert.equal(partial.mode, 'invalid');
});
