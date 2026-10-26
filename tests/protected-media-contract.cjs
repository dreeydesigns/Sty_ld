const test = require('node:test'), assert = require('node:assert/strict');
const { createPendingMediaHandler } = require('../lib/protected-media-contract.cjs');
const workspace = '11111111-1111-4111-8111-111111111111';
function fixture(patch = {}) {
  const state = { actor: { userId: 'local-owner', sessionId: 'local-session', role: 'professional', active: true, workspaceId: workspace },
    media: { assetId: 'synthetic_asset', ownerWorkspaceId: workspace, version: 1, state: 'pending', deliveryType: 'authenticated',
      providerRestrictionVerified: true, accessExpiresAt: 2000 }, clock: 1000, calls: [], ...patch };
  const sign = async media => ({ assetId: media.assetId, version: media.version, expiresAt: 1900,
    expiryEnforced: true, url: 'https://storage.example.test/restricted/synthetic_asset' });
  const handler = createPendingMediaHandler({ now: () => state.clock, allowedOrigins: ['https://storage.example.test'], maxBytes: 16, timeoutMs: patch.timeoutMs || 5000,
    resolveActor: async () => state.actor, findManifest: async () => state.media,
    signAuthenticated: async media => { state.calls.push('sign'); return (state.sign || sign)(media); },
    fetchAsset: async (url, options) => { state.calls.push('fetch'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
      return state.fetch ? state.fetch(url, options) : new Response(Uint8Array.from([137,80,78,71]), { headers: { 'content-type': 'image/png' } }); } });
  return { state, request: () => handler(new Request('http://localhost/media/synthetic_asset'), 'synthetic_asset'), handler };
}
test('pending bytes require current server-owned eligibility and never disclose the signed URL', async () => {
  const f = fixture(), response = await f.request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('vary'), 'Cookie');
  assert.equal(response.headers.get('location'), null);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [137,80,78,71]);
});
test('anonymous, cross-workspace and non-MFA reviewers fail before signing', async () => {
  for (const actor of [null, { role: 'client', active: true, workspaceId: workspace }, { role: 'professional', active: true, workspaceId: 'other' },
    { role: 'super_admin', active: true, mfaVerified: false, canReviewMedia: true }]) {
    const f = fixture({ actor }); assert.equal((await f.request()).status, 404); assert.deepEqual(f.state.calls, []);
  }
  const f = fixture({ actor: { userId: 'local-reviewer', sessionId: 'local-session', role: 'super_admin', active: true, mfaVerified: true, canReviewMedia: true } });
  assert.equal((await f.request()).status, 200);
});
test('revocation, rejected/deleted states, public storage and unverified restrictions fail closed', async () => {
  for (const patch of [{ revoked: true }, { state: 'rejected' }, { state: 'deleted' }, { state: 'published' },
    { deliveryType: 'upload' }, { providerRestrictionVerified: false }, { accessExpiresAt: 999 }]) {
    const f = fixture(); Object.assign(f.state.media, patch);
    assert.equal((await f.request()).status, 404); assert.deepEqual(f.state.calls, []);
  }
});
test('signer must bind current asset/version and enforce a bounded upstream expiry', async () => {
  for (const patch of [{ assetId: 'another_asset' }, { version: 2 }, { expiresAt: 1000 }, { expiresAt: 3000 }, { expiryEnforced: false },
    { url: 'http://storage.example.test/restricted/asset' }, { url: 'https://untrusted.example.test/asset' }, { url: 'https://user:pass@storage.example.test/asset' }]) {
    const f = fixture(); f.state.sign = async media => ({ assetId: media.assetId, version: media.version, expiresAt: 1900,
      expiryEnforced: true, url: 'https://storage.example.test/restricted/synthetic_asset', ...patch });
    assert.equal((await f.request()).status, 502); assert.deepEqual(f.state.calls, ['sign']);
  }
});
test('state and actor are rechecked after upstream work before releasing any bytes', async () => {
  for (const change of [state => { state.media.revoked = true; }, state => { state.media.version = 2; },
    state => { state.actor = null; }, state => { state.actor = { ...state.actor, sessionId: 'another-session' }; },
    state => { state.clock = 1900; }, state => { state.media.ownerWorkspaceId = '22222222-2222-4222-8222-222222222222'; }]) {
    const f = fixture(); f.state.fetch = async () => { change(f.state); return new Response('bytes', { headers: { 'content-type': 'image/png' } }); };
    const response = await f.request(); assert.equal(response.status, 404); assert.ok(!(await response.text()).includes('bytes'));
  }
});
test('redirects, active formats, oversized or failed upstream responses do not leak content', async () => {
  const responses = [() => new Response(null, { status: 302, headers: { location: 'https://untrusted.example.test/' } }),
    () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }),
    () => new Response('html', { headers: { 'content-type': 'text/html' } }),
    () => new Response('too large', { headers: { 'content-type': 'image/png', 'content-length': '100' } }),
    () => new Response('x'.repeat(17), { headers: { 'content-type': 'image/png' } }),
    () => new Response(new ReadableStream({ start(controller) { controller.enqueue('non-binary'); controller.close(); } }), { headers: { 'content-type': 'image/png' } }),
    () => { throw new Error('Mock timeout, no provider details.'); }];
  for (const factory of responses) { const f = fixture(); f.state.fetch = factory; const response = await f.request();
    assert.equal(response.status, 502); assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), { error: 'Media unavailable.' }); }
});
test('client URL and role parameters cannot choose an upstream resource', async () => {
  const f = fixture();
  const response = await f.handler(new Request('http://localhost/media/asset?url=https://untrusted.example.test&role=super_admin'), '../asset');
  assert.equal(response.status, 404); assert.deepEqual(f.state.calls, []);
  assert.equal((await f.handler(new Request('http://localhost/media/asset', { method: 'POST' }), 'synthetic_asset')).status, 405);
});
test('stalled signing and body streams are bounded by the handler deadline', async () => {
  const signing = fixture({ timeoutMs: 40 }); signing.state.sign = () => new Promise(() => {});
  assert.equal((await signing.request()).status, 502);
  assert.deepEqual(signing.state.calls, ['sign']);
  const body = fixture({ timeoutMs: 40 }); let cancelled = false;
  body.state.fetch = async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'content-type': 'image/png' } });
  assert.equal((await body.request()).status, 502);
  assert.equal(cancelled, true);
});
