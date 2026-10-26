const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), path = require('node:path');
const { createRequire } = require('node:module');
function load(file) { const module = { exports: {} }; const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText; vm.runInNewContext(`(function(require,module,exports){${code}})`, {})(createRequire(path.resolve(file)), module, module.exports); return module.exports; }
const { changeShortlist, canUndoShortlist, shortlistFingerprint } = load('lib/shortlist-actions.ts');
const { comparePlanProvider } = load('lib/compare-plan.ts');
const { emptyPlanFields } = load('lib/plan-v2.ts');
const ids = [1,2,3,4].map(n => `0000000${n}-0000-4000-8000-00000000000${n}`);
const plain = x => JSON.parse(JSON.stringify(x));
test('shortlist adds in order, deduplicates normalized IDs and requires explicit fourth replacement', () => {
  let plan = emptyPlanFields();
  for (const id of ids.slice(0,3)) plan = changeShortlist(plan, { type: 'add', id });
  assert.deepEqual(plain(plan.shortlistProviderWorkspaceIds), ids.slice(0,3));
  assert.deepEqual(plain(changeShortlist(plan, { type: 'add', id: ids[0].toUpperCase() })), plain(plan));
  assert.throws(() => changeShortlist(plan, { type: 'add', id: ids[3] }), /replace/);
  assert.throws(() => changeShortlist(plan, { type: 'add', id: 'not-a-workspace' }), /real provider/);
  const replaced = changeShortlist(plan, { type: 'replace', id: ids[3], previousId: ids[1] });
  assert.deepEqual(plain(replaced.shortlistProviderWorkspaceIds), [ids[0],ids[3],ids[2]]);
  assert.throws(() => changeShortlist(plan, { type: 'replace', id: ids[0], previousId: ids[1] }));
});
test('leading choice belongs to shortlist, removal/replacement clears it and unrelated Plan fields survive', () => {
  const base = { ...emptyPlanFields(), serviceIds: ['one'], locationArea: 'South B', shortlistProviderWorkspaceIds: ids.slice(0,3) };
  const selected = changeShortlist(base, { type: 'lead', id: ids[1] }); assert.equal(selected.leadingChoiceProviderWorkspaceId, ids[1]);
  assert.equal(changeShortlist(selected, { type: 'remove', id: ids[1] }).leadingChoiceProviderWorkspaceId, null);
  assert.equal(changeShortlist(selected, { type: 'replace', id: ids[3], previousId: ids[1] }).leadingChoiceProviderWorkspaceId, null);
  assert.throws(() => changeShortlist(base, { type: 'lead', id: ids[3] }));
  assert.equal(selected.locationArea, 'South B'); assert.deepEqual(selected.serviceIds, ['one']); assert.equal(base.leadingChoiceProviderWorkspaceId, null);
});
test('Undo refuses dirty, failed, stale-revision and switched-account states, including A to B to A', () => {
  const plan = { ...emptyPlanFields(), shortlistProviderWorkspaceIds: [ids[0]] };
  const receipt = { identity: 'account-a', generation: 1, revision: 4, after: shortlistFingerprint(plan) };
  const state = { identity: 'account-a', generation: 1, revision: 5, draft: plan, dirty: false, status: 'saved' };
  assert.equal(canUndoShortlist(receipt, state), true);
  for (const patch of [{ identity: 'account-b' }, { generation: 3 }, { revision: 6 }, { status: 'conflict' }, { status: 'error' }, { dirty: true }, { draft: emptyPlanFields() }]) assert.equal(canUndoShortlist(receipt, { ...state, ...patch }), false);
});
test('same Plan uses exact owned service IDs, never category/name similarity or unavailable facts', () => {
  const plan = { ...emptyPlanFields(), serviceIds: ['service-one'] };
  const data = { services: [{ id: 'service-one', workspaceId: ids[0], name: 'Braids', price: 2000, modes: [] }, { id: 'service-two', workspaceId: ids[1], name: 'Braids', price: 500, modes: [] }] };
  const provider = id => ({ workspaceId: id, available: true, displayName: 'Provider', location: null, serviceMode: null });
  const own = comparePlanProvider(plan, data, provider(ids[0])); assert.match(own.price, /2,000.*listed subtotal/); assert.equal(own.reviews, 'Not provided'); assert.equal(own.availability, 'Unconfirmed');
  const other = comparePlanProvider(plan, data, provider(ids[1])); assert.equal(other.price, 'Not provided'); assert.match(other.requirements, /unconfirmed/);
  for (const price of [null, NaN, Infinity, -1]) assert.equal(comparePlanProvider(plan, { services: [{ ...data.services[0], price }] }, provider(ids[0])).price, 'Not provided');
  assert.equal(comparePlanProvider(plan, data, { ...provider(ids[0]), available: false }).price, 'Not provided');
  assert.equal(comparePlanProvider(plan, { services: [] }, provider(ids[0])).price, 'Not provided');
});

test('a service transferred after shortlisting never becomes another provider price for the original Plan', () => {
  const plan = { ...emptyPlanFields(), creatorWorkspaceId: ids[0], serviceIds: ['selected-service'] };
  const provider = workspaceId => ({ workspaceId, available: true, displayName: 'Synthetic provider', location: null, serviceMode: null });
  const original = { id: 'selected-service', workspaceId: ids[0], name: 'Selected service', price: 2000, modes: [] };
  assert.match(comparePlanProvider(plan, { services: [original] }, provider(ids[0])).price, /2,000/);
  const changed = { services: [{ ...original, workspaceId: ids[1], price: 500 }] };
  for (const workspaceId of ids.slice(0,2)) {
    const result = comparePlanProvider(plan, changed, provider(workspaceId));
    assert.equal(result.price, 'Not provided');
    assert.equal(result.requirements, 'Matching services unconfirmed');
  }
  assert.equal(comparePlanProvider(plan, { services: [] }, provider(ids[0])).price, 'Not provided');
});
