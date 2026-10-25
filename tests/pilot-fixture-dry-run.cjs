const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePilotManifest, EXPECTED } = require('../scripts/pilot-fixture-dry-run.cjs');
function manifest() {
  return { version: 1, runId: '11111111-1111-4111-8111-111111111111', target: { ...EXPECTED },
    accounts: ['professional', 'professional', 'client'].map((role, n) => ({ key: `demo-account-${n}`, role, displayName: `Demo Person ${n}`, approvedIdentityRef: `founder-approved-inbox-${n}` })),
    services: [0, 1].map((n) => ({ key: `demo-service-${n}`, ownerKey: `demo-account-${n}`, name: `Demo Braids ${n}`, price: 2000, durationMinutes: 60, category: 'hair' })),
    posts: [0, 1, 2, 3].map((n) => ({ key: `demo-post-${n}`, ownerKey: `demo-account-${n % 2}`, serviceKey: `demo-service-${n % 2}`, caption: `Demo: Fictional inspiration ${n}`, mediaRef: `synthetic-approved-image-${n}`, publicationStatus: 'pending' })) };
}
test('pilot dry-run is deterministic, immutable and cannot mutate its input', () => {
  const m = manifest(), before = structuredClone(m);
  const result = validatePilotManifest(m, EXPECTED);
  assert.equal(result.writes, 0); assert.equal(result.dryRun, true); assert.ok(Object.isFrozen(result));
  assert.deepEqual(m, before); assert.deepEqual(result, validatePilotManifest(m, EXPECTED));
});
test('pilot validation refuses other environments and deployment identities', () => {
  for (const field of Object.keys(EXPECTED)) assert.throws(() => validatePilotManifest(manifest(), { ...EXPECTED, [field]: 'production' }), /mismatch/);
  const m = manifest(); m.target.database = 'neondb'; assert.throws(() => validatePilotManifest(m, EXPECTED));
});
test('pilot validator rejects spoofed ownership, publication and unlabelled content', () => {
  for (const change of [m => m.posts[0].ownerKey = 'demo-account-1', m => m.posts[0].publicationStatus = 'published', m => m.posts[0].caption = 'Real professional', m => m.accounts[0].displayName = 'Verified provider', m => m.services[0].ownerKey = 'demo-account-2']) {
    const m = manifest(); change(m); assert.throws(() => validatePilotManifest(m, EXPECTED));
  }
});
test('pilot validator rejects credentials, recipient addresses, live URLs and duplicate identifiers', () => {
  for (const change of [m => m.secret = 'sensitive', m => m.accounts[0].email = 'person@example.test', m => m.posts[0].mediaRef = 'https://res.cloudinary.com/live/image/upload/a', m => m.posts[0].key = m.posts[1].key, m => m.services[0].price = null]) {
    const m = manifest(); change(m); assert.throws(() => validatePilotManifest(m, EXPECTED));
  }
});
