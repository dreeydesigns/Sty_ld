const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,exports){${code}})`, { Date, Set, Map })((name) => deps[name], module.exports);
  return module.exports;
}
const contract = load('lib/plan-v2.ts');
const { createPlanClient: rawClient } = load('lib/plan-client.ts', { './plan-v2': contract });
function createPlanClient(fetcher, notify) {
  let client;
  client = rawClient(async (...args) => {
    const scopeKey = client.getSnapshot().identity;
    const result = await fetcher(...args), body = await result.json();
    return new Response(JSON.stringify({ ...body, scopeKey }), { status: result.status, headers: { ETag: `"test:${body.plan?.revision ?? 0}"` } });
  }, notify);
  return client;
}
const { emptySavedPlan, emptyPlanFields } = contract;
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const data = (plan = emptySavedPlan()) => ({ ok: true, plan, services: [], look: null, creator: null, handoff: null });
const settle = () => new Promise(setImmediate);
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const plain = (value) => JSON.parse(JSON.stringify(value));
const saved = (patch, revision = 1) => ({ ...emptyPlanFields(), ...patch, revision, updatedAt: '2026-10-23T12:00:00.000Z' });

test('autosave serializes rapid edits, confirms revisions and never calls an unconfirmed save Saved', async () => {
  const first = deferred(); const calls = []; let server = emptySavedPlan(), notifications = 0;
  const client = createPlanClient(async (_url, init) => {
    if (!init?.method) return response(data(server));
    const body = JSON.parse(init.body); calls.push(body);
    if (calls.length === 1) { await first.promise; }
    server = saved(body.plan, server.revision + 1);
    return response({ ok: true, plan: server });
  }, () => notifications++);
  client.identify('a:workspace'); await client.load();
  client.edit({ ...client.getSnapshot().draft, locationArea: 'Kilimani' });
  assert.equal(client.getSnapshot().status, 'saving'); assert.notEqual(client.getSnapshot().message, 'Saved');
  client.edit({ ...client.getSnapshot().draft, preferredDate: '2028-02-29', timeWindow: 'morning' });
  assert.equal(calls.length, 1);
  first.resolve(); await settle(); await settle();
  assert.equal(calls.length, 2); assert.equal(calls[1].expectedRevision, 1);
  assert.equal(server.locationArea, 'Kilimani'); assert.equal(server.preferredDate, '2028-02-29');
  assert.equal(client.getSnapshot().message, 'Saved'); assert.equal(notifications, 2);
});

test('offline/failed saves retain edits, never claim success and support explicit retry and clear', async () => {
  let offline = true, server = emptySavedPlan();
  const client = createPlanClient(async (_url, init) => {
    if (!init?.method) return response(data(server));
    if (offline) throw new Error('Not saved. Keep this page open.');
    server = saved(JSON.parse(init.body).plan, server.revision + 1); return response({ ok: true, plan: server });
  });
  client.identify('a'); await client.load(); client.edit({ ...client.getSnapshot().draft, locationArea: 'South B' }); await settle();
  assert.equal(client.getSnapshot().status, 'error'); assert.equal(client.getSnapshot().dirty, true); assert.equal(client.getSnapshot().draft.locationArea, 'South B');
  assert.notEqual(client.getSnapshot().message, 'Saved');
  offline = false; await client.save(); await settle(); assert.equal(server.locationArea, 'South B');
  client.edit(emptyPlanFields()); await settle(); assert.equal(server.locationArea, ''); assert.equal(server.revision, 2);
});

test('cross-tab conflicts preserve edits and require deliberate revision-safe recovery', async () => {
  let server = emptySavedPlan();
  const fetcher = async (_url, init) => {
    if (!init?.method) return response(data(server));
    const body = JSON.parse(init.body);
    if (body.expectedRevision !== server.revision) return response({ ok: false, plan: server }, 409);
    server = saved(body.plan, server.revision + 1); return response({ ok: true, plan: server });
  };
  const a = createPlanClient(fetcher), b = createPlanClient(fetcher);
  for (const client of [a, b]) { client.identify('same:workspace'); await client.load(); }
  a.edit({ ...a.getSnapshot().draft, locationArea: 'Westlands' }); await settle();
  b.edit({ ...b.getSnapshot().draft, locationArea: 'South B' }); await settle();
  assert.equal(b.getSnapshot().status, 'conflict'); assert.equal(b.getSnapshot().draft.locationArea, 'South B');
  assert.equal(server.locationArea, 'Westlands');
  await b.resolveConflict(true); await settle(); assert.equal(server.locationArea, 'South B'); assert.equal(server.revision, 2);
  a.edit({ ...a.getSnapshot().draft, locationArea: 'Kilimani' }); await settle();
  assert.equal(a.getSnapshot().status, 'conflict'); await a.resolveConflict(false);
  assert.equal(a.getSnapshot().draft.locationArea, 'South B'); assert.equal(a.getSnapshot().dirty, false);
});

test('account and workspace switches reject stale reads, writes and queued edits, including A to B to A', async () => {
  const gate = deferred(); let requests = 0;
  const client = createPlanClient(async (_url, init) => {
    if (!init?.method) return response(data());
    requests++; return gate.promise;
  });
  client.identify('a:one'); await client.load(); client.edit({ ...client.getSnapshot().draft, locationArea: 'Private A' });
  client.edit({ ...client.getSnapshot().draft, timeWindow: 'morning' });
  client.identify('a:two'); await client.load(); client.identify('b:one'); await client.load(); client.identify('a:one'); await client.load();
  gate.resolve(response({ ok: true, plan: saved({ locationArea: 'Private A' }) })); await settle();
  assert.equal(client.getSnapshot().draft.locationArea, ''); assert.equal(requests, 1);
  const read = deferred(); const loading = createPlanClient(() => read.promise);
  loading.identify('a'); const pending = loading.load(); loading.identify(null);
  read.resolve(response(data(saved({ locationArea: 'Secret' })))); await pending;
  assert.equal(loading.getSnapshot().data, null); assert.equal(loading.getSnapshot().draft.locationArea, '');
});

test('late reads cannot overwrite confirmed newer writes, and focus refresh detects conflicts without dropping edits', async () => {
  const gate = deferred(); let reads = 0;
  const client = createPlanClient(async (_url, init) => {
    if (init?.method) return response({ ok: true, plan: saved(JSON.parse(init.body).plan, 2) });
    reads++;
    if (reads === 2) return gate.promise;
    return response(data(reads > 2 ? saved({ locationArea: 'New' }, 2) : emptySavedPlan()));
  });
  client.identify('a'); await client.load(); const late = client.load(); client.edit({ ...client.getSnapshot().draft, locationArea: 'New' }); await settle();
  gate.resolve(response(data())); await late; assert.equal(client.getSnapshot().draft.locationArea, 'New'); assert.equal(client.getSnapshot().revision, 2);
});

test('guests stay local, and unauthorized responses discard private state', async () => {
  let calls = 0;
  const guest = createPlanClient(async () => { calls++; return response(data()); });
  guest.guest(data()); guest.edit({ ...guest.getSnapshot().draft, serviceIds: ['knotless-braids'] }); await settle();
  assert.equal(calls, 0); assert.deepEqual(plain(guest.getSnapshot().draft.serviceIds), ['knotless-braids']);
  const client = createPlanClient(async () => response({ ok: false }, 401));
  client.identify('a'); await client.load(); assert.equal(client.getSnapshot().data, null); assert.equal(client.getSnapshot().identity, null);
});

test('a server workspace mismatch is rejected even before the display session updates', async () => {
  const client = rawClient(async () => response({ ...data(saved({ locationArea: 'Different private workspace' })), scopeKey: 'different' }));
  client.identify('expected'); await client.load();
  assert.equal(client.getSnapshot().data, null); assert.equal(client.getSnapshot().draft.locationArea, '');
});

test('autosave normalization does not remove a space while the client is typing an area', async () => {
  let server = emptySavedPlan();
  const client = createPlanClient(async (_url, init) => {
    if (!init?.method) return response(data(server));
    const draft = JSON.parse(init.body).plan;
    server = saved({ ...draft, locationArea: draft.locationArea.trim() }, server.revision + 1);
    return response({ ok: true, plan: server });
  });
  client.identify('a'); await client.load();
  client.edit({ ...client.getSnapshot().draft, locationArea: 'South ' }); await settle(); await settle();
  assert.equal(client.getSnapshot().draft.locationArea, 'South ');
  client.edit({ ...client.getSnapshot().draft, locationArea: client.getSnapshot().draft.locationArea + 'B' }); await settle();
  assert.equal(server.locationArea, 'South B');
});

test('a delayed read cannot replace a newer conflict revision or restore older confirmed state', async () => {
  const read = deferred(), write = deferred(); let reads = 0;
  const client = createPlanClient(async (_url, init) => {
    if (init?.method) return write.promise;
    return ++reads === 1 ? response(data()) : read.promise;
  });
  client.identify('a'); await client.load(); client.edit({ ...client.getSnapshot().draft, locationArea: 'My edits' });
  const pendingRead = client.load();
  write.resolve(response({ ok: false, plan: saved({ locationArea: 'Latest elsewhere' }, 2) }, 409)); await settle();
  read.resolve(response(data(saved({ locationArea: 'Older' }, 1)))); await pendingRead;
  assert.equal(client.getSnapshot().remote.revision, 2); assert.equal(client.getSnapshot().draft.locationArea, 'My edits');
  let old = false;
  const loaded = createPlanClient(async () => response(data(saved({ locationArea: old ? 'Old' : 'New' }, old ? 1 : 2))));
  loaded.identify('a'); await loaded.load(); old = true; await loaded.load();
  assert.equal(loaded.getSnapshot().draft.locationArea, 'New'); assert.equal(loaded.getSnapshot().revision, 2);
});
