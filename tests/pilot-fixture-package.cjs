const test = require('node:test'), assert = require('node:assert/strict'), { createHash } = require('node:crypto');
const { TARGET, buildFixturePackage, validateFixturePackage, dryRunFixtures, cleanupPlan } = require('../scripts/pilot-fixture-package.cjs');
const run = '11111111-1111-4111-8111-111111111111';
const build = () => buildFixturePackage(run, TARGET, true);
const resign = m => { const { checksum, ...content } = m; m.checksum = createHash('sha256').update(JSON.stringify(content)).digest('hex'); return m; };
test('Demo package generation, repetition, ownership and partial failure are deterministic and write nothing', () => {
  const m = build(), result = dryRunFixtures(m, TARGET);
  assert.deepEqual(m, build()); assert.equal(m.services.length, 3); assert.equal(m.posts.length, 6); assert.equal(m.workspaces.length, 4);
  assert.equal(result.writes, 0); assert.equal(dryRunFixtures(m, TARGET, result.created).created.length, 0);
  const partial = dryRunFixtures(m, TARGET, [], 5); assert.equal(partial.failed, true); assert.deepEqual(partial.rollback, [...partial.created].reverse());
});
test('production/wrong target, malformed ID, cross-owner services and moderation tampering are rejected', () => {
  for (const key of Object.keys(TARGET)) assert.throws(() => buildFixturePackage(run, { ...TARGET, [key]: 'production' }));
  for (const mutate of [m => m.workspaces[0].verified = true, m => m.posts[0].tags[1] = 'user:demo', m => m.workspaces[0].id = 'bad', m => m.services[0].workspaceId = m.workspaces[2].id, m => m.services[0].isActive = false, m => m.workspaces[0].status = 'deleted', m => m.workspaces[0].role = 'client', m => m.posts[0].workspaceId = m.workspaces[1].id, m => m.posts[0].publicationStatus = 'published', m => m.provenance.operation = 'user-caption']) {
    const m = build(); mutate(m); assert.throws(() => validateFixturePackage(resign(m), TARGET));
  }
});
test('cleanup is receipt-bound, reverse ordered and refuses unrelated records or modified manifests', () => {
  const m = build(), result = dryRunFixtures(m, TARGET);
  const receipt = { runId: run, manifestChecksum: m.checksum, createdIds: result.created.map(r => r.id) };
  const cleanup = cleanupPlan(m, TARGET, receipt); assert.equal(cleanup.writes, 0); assert.equal(cleanup.records[0].key, 'post-5'); assert.equal(cleanup.records.at(-1).key, 'workspace-0');
  assert.throws(() => cleanupPlan(m, TARGET, { ...receipt, createdIds: [...receipt.createdIds, '99999999-9999-4999-8999-999999999999'] }));
  m.posts[0].caption = 'Real content'; assert.throws(() => cleanupPlan(m, TARGET, receipt));
});
