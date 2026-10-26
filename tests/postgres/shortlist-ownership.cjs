const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { openLocalDatabases } = require('../helpers/local-postgres.cjs');
const { applicationHarness } = require('../helpers/application-harness.cjs');

test('real persisted Plan never compares a transferred or inactive service as another provider offer', async () => {
  const db = await openLocalDatabases();
  try {
    const app = await applicationHarness(db.runtime), userIds = [randomUUID(), randomUUID(), randomUUID()];
    const workspaces = [randomUUID(), randomUUID(), randomUUID()], service = randomUUID();
    for (let i = 0; i < 3; i++) {
      await db.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)', [userIds[i], `ownership-${i}@example.test`, `Synthetic ${i}`]);
      await db.owner.query('INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)',
        [workspaces[i], userIds[i], i === 2 ? 'client' : 'professional', JSON.stringify({ firstName: `Synthetic ${i}`, serviceMode: 'Both' })]);
    }
    await db.owner.query("INSERT INTO services(id,provider_id,workspace_id,name,price,is_active) VALUES($1,$2,$3,'Synthetic service',2000,true)", [service, userIds[0], workspaces[0]]);
    const repository = app.load('lib/plan-repository.ts'), { emptyPlanFields } = app.load('lib/plan-v2.ts');
    const compare = app.load('lib/compare-plan.ts').comparePlanProvider;
    const fields = { ...emptyPlanFields(), creatorWorkspaceId: workspaces[0], serviceIds: [service], shortlistProviderWorkspaceIds: workspaces.slice(0,2) };
    assert.equal((await repository.updatePlan(workspaces[2], userIds[2], 0, fields)).conflict, false);
    const facts = workspaceId => ({ workspaceId, available: true, location: null, serviceMode: null });
    let restored = await repository.loadPlan(workspaces[2], userIds[2]);
    assert.match(compare(restored.plan, restored, facts(workspaces[0])).price, /2,000/);
    await db.owner.query('UPDATE services SET provider_id=$2,workspace_id=$3,price=500 WHERE id=$1', [service, userIds[1], workspaces[1]]);
    restored = await repository.loadPlan(workspaces[2], userIds[2]);
    assert.equal(restored.plan.creatorWorkspaceId, workspaces[0]);
    for (const workspaceId of workspaces.slice(0,2)) assert.equal(compare(restored.plan, restored, facts(workspaceId)).price, 'Not provided');
    await db.owner.query('UPDATE services SET is_active=false WHERE id=$1', [service]);
    restored = await repository.loadPlan(workspaces[2], userIds[2]);
    assert.equal(compare(restored.plan, restored, facts(workspaces[0])).price, 'Not provided');
    assert.equal(restored.plan.revision, 1, 'read-time eligibility changes do not silently rewrite the saved Plan');
  } finally { await db.close(); }
});
