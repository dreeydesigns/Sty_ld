const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const source = ts.transpileModule(fs.readFileSync('lib/private-saves.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(`(function(exports) { ${source} })`, {})(mod.exports);
const { createPrivateSaves } = mod.exports;
const response = (ids, status = 200) => new Response(JSON.stringify({ ok: status === 200, savedPostIds: ids }), { status });
const settle = () => new Promise(setImmediate);
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
function ids(store) { return Array.from(store.getSnapshot().ids); }

test('Save, Unsave and both Undo directions use the existing API and synchronize subscribers', async () => {
  let saved = [];
  const calls = [];
  const store = createPrivateSaves(async (url, init) => {
    calls.push([url, init]);
    if (init?.method === 'POST') saved = [...new Set([...saved, JSON.parse(init.body).postId])];
    if (init?.method === 'DELETE') saved = saved.filter((id) => !url.endsWith(id));
    return response(saved);
  });
  const feed = [], detail = [], collection = [];
  for (const view of [feed, detail, collection]) store.subscribe(() => view.push(ids(store)));
  store.identify('client:workspace'); await settle();
  const saving = store.change('look', true);
  assert.deepEqual(ids(store), ['look'], 'immediate optimistic feedback');
  assert.equal(store.getSnapshot().pending, true);
  await saving;
  await store.undo(); assert.deepEqual(ids(store), []);
  await store.change('look', true); await store.change('look', false);
  await store.undo(); assert.deepEqual(ids(store), ['look']);
  assert.deepEqual(feed, detail); assert.deepEqual(feed, collection);
  assert.equal(calls[0][0], '/api/social/saves');
  assert.equal(calls[1][1].body, JSON.stringify({ postId: 'look' }));
  assert.equal(calls[2][0], '/api/social/saves/look');
});

test('API failure rolls back Save, Unsave and failed Undo without losing the retry action', async () => {
  let fail = false, saved = [];
  const store = createPrivateSaves(async (url, init) => {
    if (fail) return response([], 500);
    if (init?.method === 'POST') saved = ['look'];
    if (init?.method === 'DELETE') saved = [];
    return response(saved);
  });
  store.identify('a'); await settle();
  fail = true; await store.change('look', true); assert.deepEqual(ids(store), []);
  fail = false; await store.change('look', true);
  fail = true; await store.change('look', false); assert.deepEqual(ids(store), ['look']);
  await store.undo(); assert.deepEqual(ids(store), ['look']);
  assert.equal(store.getSnapshot().undo.postId, 'look');
  assert.match(store.getSnapshot().message, /Try again/);
});

test('rapid and duplicate interactions cannot overlap or overwrite another Look', async () => {
  const gate = deferred(); let mutations = 0;
  const store = createPrivateSaves(async (_url, init) => {
    if (!init?.method) return response([]);
    mutations++; return gate.promise;
  });
  store.identify('a'); await settle();
  const first = store.change('one', true);
  await Promise.all([store.change('one', true), store.change('one', false), store.change('two', true), store.undo()]);
  assert.equal(mutations, 1);
  gate.resolve(response(['one'])); await first;
  await store.change('one', true);
  assert.equal(mutations, 1);
});

test('account/workspace switches discard stale success, failure, reads and Undo, including A to B to A', async () => {
  for (const failure of [false, true]) {
    const gate = deferred(); let reads = 0;
    const store = createPrivateSaves(async (_url, init) => {
      if (init?.method) return gate.promise;
      reads++; return response(reads === 1 ? ['old'] : []);
    });
    store.identify('a:workspace1'); await settle();
    const pending = store.change('old', false);
    store.identify('a:workspace2'); await settle();
    assert.deepEqual(ids(store), []);
    store.identify('b:workspace'); await settle();
    store.identify('a:workspace1'); await settle();
    if (failure) gate.resolve(response([], 500)); else gate.resolve(response(['leak']));
    await pending;
    assert.deepEqual(ids(store), []); assert.equal(store.getSnapshot().undo, null);
  }
  const gate = deferred();
  const store = createPrivateSaves(() => gate.promise);
  store.identify('a'); store.identify(null);
  gate.resolve(response(['secret'])); await settle();
  assert.deepEqual(ids(store), []);
  const oldRead = deferred(); let reads = 0;
  const switched = createPrivateSaves(() => ++reads === 1 ? oldRead.promise : Promise.resolve(response(['new-account'])));
  switched.identify('old-account'); switched.identify('new-account'); await settle();
  oldRead.resolve(response(['secret'])); await settle();
  assert.deepEqual(ids(switched), ['new-account']);
});

test('guests make no requests and server authorization failures clear private state', async () => {
  let calls = 0, denied = false;
  const store = createPrivateSaves(async () => { calls++; return response(['private'], denied ? 403 : 200); });
  await store.change('look', true); await store.refresh(); assert.equal(calls, 0);
  store.identify('client'); await settle();
  denied = true; await store.change('private', false);
  assert.deepEqual(ids(store), []); assert.equal(store.getSnapshot().status, 'error');
  store.identify(null); assert.equal(store.getSnapshot().message, '');
});

test('removed or unpublished content fails Save and Undo honestly', async () => {
  let removed = false, saved = [];
  const store = createPrivateSaves(async (_url, init) => {
    if (init?.method === 'POST' && removed) return response([], 404);
    if (init?.method === 'POST') saved = ['look'];
    if (init?.method === 'DELETE') saved = [];
    return response(saved);
  });
  store.identify('a'); await settle();
  await store.change('look', true); await store.change('look', false);
  removed = true; await store.undo(); assert.deepEqual(ids(store), []);
  assert.match(store.getSnapshot().message, /could not/);
});

test('malformed and network responses fail closed and can be retried', async () => {
  let mode = 'network';
  const store = createPrivateSaves(async () => {
    if (mode === 'network') throw new Error('Offline');
    if (mode === 'malformed') return response([123]);
    return response(['look']);
  });
  store.identify('a'); await settle(); assert.equal(store.getSnapshot().status, 'error');
  mode = 'malformed'; await store.refresh(); assert.deepEqual(ids(store), []);
  mode = 'ready'; await store.refresh(); assert.deepEqual(ids(store), ['look']);
});
