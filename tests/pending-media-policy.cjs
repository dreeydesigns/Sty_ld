const test = require('node:test');
const assert = require('node:assert/strict');
const { mediaAccess, mediaTransition } = require('../lib/pending-media-policy.cjs');
const ownerWorkspaceId = '11111111-1111-4111-8111-111111111111';
const media = patch => ({ ownerWorkspaceId, assetId: 'synthetic_pending_asset', version: 1, state: 'pending', deliveryType: 'authenticated', providerRestrictionVerified: true, accessExpiresAt: 2000, ...patch });
const owner = { role: 'professional', active: true, workspaceId: ownerWorkspaceId };
const reviewer = { role: 'super_admin', active: true, mfaVerified: true, canReviewMedia: true };
test('pending originals and derivatives deny anonymous, other workspace, client and non-MFA reviewers', () => {
  for (const actor of [null, { ...owner, workspaceId: 'other' }, { ...owner, role: 'client' }, { ...reviewer, mfaVerified: false }, { ...reviewer, canReviewMedia: false }]) assert.equal(mediaAccess(media(), actor, 1000).allowed, false);
  for (const actor of [owner, reviewer]) assert.deepEqual(mediaAccess(media(), actor, 1000), { allowed: true, delivery: 'server-proxy-only', cacheControl: 'private, no-store', expiresAt: 2000 });
});
test('expiry, revocation, rejection, deletion and unverified storage deny access', () => {
  for (const patch of [{ accessExpiresAt: 1000 }, { accessExpiresAt: 999999 }, { accessExpiresAt: null }, { revoked: true }, { state: 'rejected' }, { state: 'deleted' }, { deliveryType: 'upload' }, { deliveryType: 'private' }, { providerRestrictionVerified: false }]) assert.equal(mediaAccess(media(patch), owner, 1000).allowed, false);
});
test('public delivery requires a verified approved derivative of exactly the current version', () => {
  for (const patch of [{}, { publicDerivativeVerified: true, approvedVersion: 2 }]) assert.equal(mediaAccess(media({ state: 'published', ...patch }), null).allowed, false);
  assert.equal(mediaAccess(media({ state: 'published', publicDerivativeVerified: true, approvedVersion: 1 }), null).allowed, true);
});
test('publication and cleanup plans require MFA, ownership, current evidence and audited transitions', () => {
  assert.throws(() => mediaTransition(media(), 'published', owner), /MFA/);
  assert.throws(() => mediaTransition(media(), 'published', reviewer), /derivative/);
  assert.throws(() => mediaTransition(media(), 'published', reviewer, { publicDerivativeVerified: true, approvedVersion: 1, ownerWorkspaceId: 'other' }), /ownership/);
  const plan = mediaTransition(media(), 'published', reviewer, { publicDerivativeVerified: true, approvedVersion: 1, ownerWorkspaceId });
  assert.equal(plan.auditRequired, true); assert.equal(plan.crossSystemTransaction, false);
  assert.equal(mediaTransition(media({ state: 'published' }), 'pending', reviewer).invalidatePublicDerivative, true);
  assert.throws(() => mediaTransition(media({ state: 'deleted' }), 'published', reviewer), /transition/);
});
