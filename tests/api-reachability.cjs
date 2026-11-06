const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function harness(fetchResponse, online = true) {
  const source = fs.readFileSync('components/api-reachability.tsx', 'utf8');
  const ast = ts.createSourceFile('reachability.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'check') callback = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(callback);
  const code = ts.transpileModule('const check = ' + callback.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const states = [];
  const active = { current: null };
  const navigator = { onLine: online };
  const timers = [];
  let requests = 0;
  const make = new Function('active', 'setState', 'navigator', 'window', 'fetch', 'AbortController', 'const useCallback = fn => fn; ' + code + '; return check;');
  const check = make(active, value => states.push(value), navigator, { setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {} }, (...args) => { requests++; return fetchResponse(...args); }, AbortController);
  return { check, active, navigator, timers, states, requests: () => requests };
}

test('an offline browser reports offline without sending a request', async () => {
  const h = harness(() => { throw new Error('Must not fetch'); }, false);
  await h.check();
  assert.deepEqual(h.states, ['offline']);
  assert.equal(h.requests(), 0);
});

test('only a successful response from the expected STYLD health contract is reachable', async () => {
  for (const fixture of [
    { ok: true, body: { ok: true, service: 'styld-api' }, expected: 'reachable' },
    { ok: false, body: null, expected: 'unavailable' },
    { ok: true, body: { ok: true, service: 'another-service' }, expected: 'unavailable' },
    { ok: true, body: { ok: false, service: 'styld-api' }, expected: 'unavailable' },
    { ok: true, body: null, expected: 'unavailable' },
  ]) {
    const h = harness(async (url, options) => {
      assert.equal(url, '/api/health');
      assert.equal(options.cache, 'no-store');
      return { ok: fixture.ok, json: async () => fixture.body };
    });
    await h.check();
    assert.equal(h.states.at(-1), fixture.expected);
  }
});

test('malformed JSON and failed network requests report unavailable without error details', async () => {
  for (const response of [async () => { throw new Error('private provider detail'); }, async () => ({ ok: true, json: async () => { throw new Error('bad JSON'); } })]) {
    const h = harness(response);
    await h.check();
    assert.deepEqual(h.states, ['checking', 'unavailable']);
  }
});

test('retry cancels the previous request and a late response cannot replace the current result', async () => {
  let firstResolve;
  let firstSignal;
  let request = 0;
  const h = harness(async (_url, options) => {
    if (++request === 1) { firstSignal = options.signal; return new Promise(resolve => { firstResolve = resolve; }); }
    return { ok: true, json: async () => ({ ok: true, service: 'styld-api' }) };
  });
  const first = h.check();
  await h.check();
  assert.equal(firstSignal.aborted, true);
  firstResolve({ ok: false });
  await first;
  assert.equal(h.states.at(-1), 'reachable');
});

test('timeout ends the check and does not leave retry disabled indefinitely', async () => {
  const h = harness((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const pending = h.check();
  assert.equal(h.timers[0].ms, 8000);
  h.timers[0].fn();
  await pending;
  assert.equal(h.states.at(-1), 'unavailable');
});

test('a browser that goes offline during a request reports the current offline state', async () => {
  const h = harness(async () => { h.navigator.onLine = false; throw new Error('connection lost'); });
  await h.check();
  assert.equal(h.states.at(-1), 'offline');
});
