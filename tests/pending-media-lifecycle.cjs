const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const URL_PATH = '/api/media/pending/11111111-1111-4111-8111-111111111111';
function load(fetch) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/image-prep.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext('(function(exports,module){' + source + String.fromCharCode(10) + '})', { fetch, URL, Date, Map, Set, AbortController, setTimeout, clearTimeout, FormData, File, Blob, console })(module.exports, module);
  return module.exports;
}
test('simultaneous owner image renders coalesce and honor the server lifetime', async () => {
  let calls = 0;
  let release;
  const api = load(async () => { calls++; await new Promise(resolve => { release = resolve; }); return Response.json({ ok: true, expiresInSeconds: 300 }); });
  const first = api.openPendingMediaWindow(URL_PATH);
  const second = api.openPendingMediaWindow(URL_PATH);
  assert.equal(calls, 1);
  release();
  assert.equal((await first).ok, true);
  assert.equal((await second).ok, true);
  assert.equal((await api.openPendingMediaWindow(URL_PATH)).ok, true);
  assert.equal(calls, 1);
  api.clearPendingMediaWindows();
});
test('failed opens can retry, while external or malformed addresses never receive a request', async () => {
  let calls = 0;
  const api = load(async () => { calls++; return Response.json({ ok: calls > 1 }, { status: calls > 1 ? 200 : 404 }); });
  assert.equal((await api.openPendingMediaWindow(URL_PATH)).ok, false);
  assert.equal((await api.openPendingMediaWindow(URL_PATH)).ok, true);
  for (const url of ['https://other.test' + URL_PATH, '//' + URL_PATH, URL_PATH + '?x=1', '/api/media/pending/not-an-id']) assert.equal((await api.openPendingMediaWindow(url)).ok, false);
  assert.equal(calls, 2);
});
test('short server windows are not cached and an expired image can force a fresh authorization', async () => {
  let shortCalls = 0;
  const short = load(async () => { shortCalls++; return Response.json({ ok: true, expiresInSeconds: 1 }); });
  await short.openPendingMediaWindow(URL_PATH);
  await short.openPendingMediaWindow(URL_PATH);
  assert.equal(shortCalls, 2);
  let calls = 0;
  const api = load(async () => { calls++; return Response.json({ ok: true, expiresInSeconds: 300 }); });
  await api.openPendingMediaWindow(URL_PATH);
  await api.openPendingMediaWindow(URL_PATH, true);
  assert.equal(calls, 2);
});
test('restricted uploads prefer the proxy, open its window and never fall back to provider addresses', async () => {
  const calls = [];
  const api = load(async (url, options) => { calls.push({ url, options }); return url === '/api/upload' ? Response.json({ ok: true, delivery: 'restricted', pendingUrl: URL_PATH, url: 'https://provider.invalid/private.jpg' }) : Response.json({ ok: true, expiresInSeconds: 300 }); });
  const file = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
  const saved = await api.uploadPreparedImage(file);
  assert.equal(saved.ok, true);
  assert.equal(saved.url, URL_PATH);
  assert.equal(calls[1].url, URL_PATH);
  assert.equal(calls[1].options.method, 'POST');
  const refused = load(async () => Response.json({ ok: true, delivery: 'restricted', pendingUrl: 'https://other.test/private', url: 'https://provider.invalid/private.jpg' }));
  assert.equal((await refused.uploadPreparedImage(file)).ok, false);
});
test('profile image persistence sends only the photo field and reports server refusal', async () => {
  const calls = [];
  const api = load(async (url, options) => { calls.push({ url, options }); return Response.json({ ok: false }, { status: 403 }); });
  assert.equal((await api.persistProfileImage('profileImageUrl', URL_PATH)).ok, false);
  assert.equal(calls[0].url, '/api/users/me');
  assert.equal(calls[0].options.body, JSON.stringify({ profileImageUrl: URL_PATH }));
});
