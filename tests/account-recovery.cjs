const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies, env = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${source}})`, { URL, Response, TextDecoder, process: { env }, console })(name => dependencies[name], module, module.exports);
  return module.exports;
}
const policy = load('lib/account-recovery.ts', {});
const input = { name: 'Recovery tester', contactEmail: 'reachable@example.test', accountEmail: 'old@example.test', accountReference: 'test-profile', reason: 'lost-inbox', note: 'I cannot open my previous email inbox.' };
function harness({ delivery = true, limited = false } = {}) {
  const queries = [], sent = [], limits = [];
  const route = load('app/api/account-recovery/route.ts', {
    '@/lib/account-recovery': policy,
    '@/lib/auth-database': { authPool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [{ id: '00000000-0000-4000-8000-000000000001' }] }; } } },
    '@/lib/security-events': { consumeLimit: async key => { limits.push(key); return !limited; } },
    '@/lib/email-provider': { sendEmail: async email => { sent.push(email); return { ok: delivery }; } },
  }, { VERCEL: '1', NODE_ENV: 'production', BETTER_AUTH_URL: 'https://styld.example.test' });
  const request = (body = input, patch = {}) => new Request('https://styld.example.test/api/account-recovery', {
    method: 'POST', headers: { origin: 'https://styld.example.test', 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1', ...patch }, body: JSON.stringify(body),
  });
  return { ...route, request, queries, sent, limits };
}

test('recovery intake saves a request and notifies only the configured support inbox', async () => {
  const h = harness(); const response = await h.POST(h.request()); const result = await response.json();
  assert.equal(response.status, 201); assert.equal(result.notified, true);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(h.queries.length, 1); assert.match(h.queries[0].sql, /^INSERT INTO contact_messages/);
  assert.doesNotMatch(h.queries[0].sql, /users|auth_sessions|user_identities|UPDATE|DELETE/i);
  assert.equal(h.sent[0].to, 'trystyld@gmail.com'); assert.equal(h.sent[0].replyTo, input.contactEmail);
  assert.match(h.sent[0].text, /unverified claims, not proof of ownership/);
});
test('recovery never checks whether an account exists or grants identity access', async () => {
  for (const accountEmail of ['known@example.test', 'unknown@example.test', '']) {
    const h = harness(); const response = await h.POST(h.request({ ...input, accountEmail }));
    assert.equal(response.status, 201);
    assert.equal(h.queries.length, 1); assert.match(h.queries[0].sql, /^INSERT INTO contact_messages/);
    assert.deepEqual(Object.keys(await response.json()).sort(), ['notified', 'ok', 'reference']);
  }
});
test('cross-origin requests are refused before storage, rate counters or email', async () => {
  const h = harness(); assert.equal((await h.POST(h.request(input, { origin: 'https://attacker.example' }))).status, 403);
  assert.equal(h.queries.length + h.sent.length + h.limits.length, 0);
});
test('rate limits refuse requests without storing messages or sending email', async () => {
  const h = harness({ limited: true }); assert.equal((await h.POST(h.request())).status, 429);
  assert.equal(h.queries.length + h.sent.length, 0);
});
test('invalid types, recipient injection and unsupported reasons cannot reach storage', async () => {
  for (const patch of [{ name: [] }, { contactEmail: 'a@example.test\r\nBcc: victim@example.test' }, { reason: '__proto__' }, { note: 'x'.repeat(1201) }]) {
    const h = harness(); assert.equal((await h.POST(h.request({ ...input, ...patch }))).status, 400);
    assert.equal(h.queries.length + h.sent.length, 0);
  }
});
test('streamed oversized bodies are rejected before parsing or persistence', async () => {
  const h = harness(); assert.equal((await h.POST(h.request({ ...input, note: 'x'.repeat(9000) }))).status, 413);
  assert.equal(h.queries.length + h.sent.length, 0);
});
test('a notification failure preserves the request and reports that support was not notified', async () => {
  const h = harness({ delivery: false }); const response = await h.POST(h.request());
  assert.equal(response.status, 201); assert.equal((await response.json()).notified, false); assert.equal(h.queries.length, 1);
});
