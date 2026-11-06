const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { previewMediaVerificationEnabled } = require('../lib/media-verification-gate.cjs');
const { requestCarriesHealthToken } = require('../lib/health-token.cjs');
const { createPendingMediaHandler } = require('../lib/protected-media-contract.cjs');

function fixture(overrides = {}, providerType = 'authenticated') {
  const env = {
    VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'qoder/styld-beta-20261027',
    STYLD_MEDIA_VERIFICATION_STARTED_AT: new Date(Date.now() - 1000).toISOString(),
    HEALTH_CHECK_TOKEN: 'fixture-health-token', NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'fixture-cloud',
    CLOUDINARY_API_KEY: 'fixture-key', CLOUDINARY_API_SECRET: 'fixture-secret', ...overrides,
  };
  const calls = { upload: 0, destroy: [] };
  const cloudinary = { utils: { url: publicId => `https://res.cloudinary.com/fixture-cloud/image/authenticated/s--fixture-signature--/w_1/${publicId}.jpg` }, uploader: {
    upload: async (data, options) => {
      calls.upload++;
      assert.match(data, /^data:image\/png;base64,/);
      return { type: providerType, format: 'jpg', public_id: options.public_id };
    },
    destroy: async (id, options) => { calls.destroy.push({ id, options }); return { result: 'ok' }; },
  } };
  const dependencies = {
    'next/server': { NextResponse: Response }, cloudinary: { v2: cloudinary },
    '@/lib/health-token.cjs': { requestCarriesHealthToken: request => requestCarriesHealthToken(request, env) },
    '@/lib/media-verification-gate.cjs': { previewMediaVerificationEnabled },
    '@/lib/protected-media-contract.cjs': { createPendingMediaHandler },
    '@/lib/media-provider-signer': { createRestrictedSigner: () => record => ({ assetId: record.assetId, version: record.version, expiresAt: record.accessExpiresAt, expiryEnforced: true, url: `https://api.cloudinary.com/v1_1/fixture-cloud/image/download?expires_at=${record.accessExpiresAt}` }) },
  };
  const fetch = async url => {
    const parsed = new URL(url);
    if (parsed.hostname === 'res.cloudinary.com' && !parsed.pathname.includes('/s--fixture-signature--/')) return new Response(null, { status: 403 });
    assert.ok(['api.cloudinary.com', 'res.cloudinary.com'].includes(parsed.hostname), 'the canary cannot fetch arbitrary destinations');
    if (parsed.hostname === 'api.cloudinary.com' && Number(parsed.searchParams.get('expires_at')) < Date.now()) return new Response(null, { status: 400 });
    const jpeg = new Uint8Array(32); jpeg[0] = 255; jpeg[1] = 216;
    return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '32' } });
  };
  const code = ts.transpileModule(fs.readFileSync('app/api/health/media-verification/route.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { process: { env }, Response, Request, Date, URL, Uint8Array, AbortSignal, fetch })(
    name => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return { calls, request: (token = 'fixture-health-token') => module.exports.POST(new Request('https://preview.example.test/api/health/media-verification', { method: 'POST', headers: token ? { 'x-health-check-token': token } : {} })) };
}

for (const overrides of [
  { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'development' },
  { VERCEL_GIT_COMMIT_REF: 'main' }, { STYLD_MEDIA_VERIFICATION_STARTED_AT: '' },
  { STYLD_MEDIA_VERIFICATION_STARTED_AT: new Date(Date.now() - 3601000).toISOString() },
  { STYLD_MEDIA_VERIFICATION_STARTED_AT: new Date(Date.now() + 60000).toISOString() },
]) {
  test(`canary refuses unsafe environment ${JSON.stringify(overrides)}`, async () => {
    const f = fixture(overrides);
    assert.equal((await f.request()).status, 404);
    assert.equal(f.calls.upload, 0);
    assert.equal(f.calls.destroy.length, 0);
  });
}

test('missing or incorrect operator credentials never reach Cloudinary', async () => {
  for (const token of ['', 'wrong-token']) {
    const f = fixture();
    assert.equal((await f.request(token)).status, 404);
    assert.equal(f.calls.upload, 0);
  }
});

test('missing provider configuration reports names and never values', async () => {
  const f = fixture({ CLOUDINARY_API_SECRET: '' });
  const response = await f.request();
  assert.equal(response.status, 503);
  const text = await response.text();
  assert.match(text, /CLOUDINARY_API_SECRET/);
  assert.doesNotMatch(text, /fixture-key|fixture-health-token/);
  assert.equal(f.calls.upload, 0);
});

test('provider and real proxy-contract canary cleans its authenticated fixture without claiming a user journey', async () => {
  const f = fixture();
  const response = await f.request();
  assert.equal(response.status, 200);
  const text = await response.text();
  const body = JSON.parse(text);
  assert.equal(body.ok, true);
  assert.equal(body.fixtureActorsOnly, true);
  assert.equal(body.realSessionUploadVerified, false);
  assert.equal(body.checks.otherWorkspaceRefused, true);
  assert.equal(body.checks.signedTransformAllowed, true);
  assert.equal(body.checks.refusalsSkipProvider, true);
  assert.doesNotMatch(text, /https?:\/\/|fixture-key|fixture-secret|fixture-health-token/);
  assert.equal(f.calls.upload, 1);
  assert.equal(f.calls.destroy.length, 1);
  assert.equal(f.calls.destroy[0].options.type, 'authenticated');
  assert.match(f.calls.destroy[0].id, /^styld\/verification\/[a-f0-9-]+_styld_jpeg$/);
  assert.equal((await f.request()).status, 429, 'a second immediate run is bounded');
});

for (const type of ['upload', 'private']) test(`a ${type} provider answer never counts as verified and cleans the same disposable asset type`, async () => {
  const f = fixture({}, type);
  const response = await f.request();
  assert.equal(response.status, 502);
  assert.equal((await response.json()).ok, false);
  assert.equal(f.calls.destroy[0].options.type, type);
});
