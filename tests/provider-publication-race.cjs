const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function saveHarness() {
  const source = fs.readFileSync('components/provider-publication-control.tsx', 'utf8');
  const ast = ts.createSourceFile('control.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let save;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'save') save = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(save);
  const code = ts.transpileModule(save.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const generation = { current: 1 };
  const writes = [];
  let resolve;
  let request;
  const action = new Function('state', 'workspaceId', 'saving', 'generation', 'area', 'setSaving', 'setMessage', 'setState', 'fetch', code + '; return save;')(
    { status: 'ready', workspaceId: 'first' }, 'first', false, generation, 'Kilimani',
    value => writes.push(['saving', value]), value => writes.push(['message', value]), value => writes.push(['state', value]),
    async (_url, options) => { request = JSON.parse(options.body); return new Promise(done => { resolve = done; }); });
  return { action, generation, writes, request: () => request, respond: body => resolve({ ok: true, json: async () => body }) };
}

test('listing save sends the loaded workspace as a concurrency precondition', async () => {
  const h = saveHarness();
  const pending = h.action(true);
  assert.deepEqual(h.request(), { enabled: true, area: 'Kilimani', expectedWorkspaceId: 'first' });
  h.respond({ ok: true, workspaceId: 'first', enabled: true, listed: false });
  await pending;
  const state = h.writes.find(([kind]) => kind === 'state')[1];
  assert.equal(state.listed, false);
  assert.equal(state.enabled, true);
});

test('a late listing save cannot change the newly selected workspace state', async () => {
  const h = saveHarness();
  const pending = h.action(true);
  h.generation.current++;
  const before = h.writes.length;
  h.respond({ ok: true, workspaceId: 'first', enabled: true, listed: true });
  await pending;
  assert.equal(h.writes.length, before, 'old success, message and saving state must all be ignored');
});
