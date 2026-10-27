/**
 * Restricted pending-media delivery wiring (Backend & Data slice).
 *
 * Loads the shipped policy (lib/pending-media-policy.cjs), the shipped proxy contract
 * (lib/protected-media-contract.cjs), the configuration gate, the manifest data access,
 * the provider signer and the real route handler, and drives them against an in-memory
 * store that logs every statement. Proves that an unconfigured or unverified delivery is
 * a refusal that touches no adapter, that only an owner or an MFA reviewer can open a
 * bounded window, and that bytes reach nobody else.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const ASSET = 'pending_asset_01';
const ORIGIN = 'https://media.example.test';
const APP = 'https://styld.test';

class AuthError extends Error {
  constructor(message, statusCode) { super(message); this.statusCode = statusCode; }
}

function loadModule(file, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  const module = { exports: {} };
  const context = { console: { error: () => {}, warn: () => {}, log: () => {} }, process, Buffer, URL, URLSearchParams, Date, Math, JSON, Object, Array,
    Number, String, Boolean, Error, Set, Map, Symbol, Promise, RegExp, TypeError, globalThis: null, ...globals };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, context)(
    name => (Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name)), module, module.exports);
  return module.exports;
}

const manifestModule = loadModule('lib/media-manifest.ts', { './auth-database': { authPool: null } });
const signerModule = loadModule('lib/media-provider-signer.ts', { './media-manifest': {}, cloudinary: require('cloudinary') });
const gate = require('../lib/media-delivery-config.cjs');
const apiSecurity = loadModule('lib/api-security.ts', { './auth-resolver': { AuthError }, 'next/server': { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200, headers: init?.headers }) } } });

function completeEnv(overrides = {}) {
  const env = {
    STYLD_RESTRICTED_MEDIA_ENABLED: 'true',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'styldtest',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret-value',
    CLOUDINARY_SIGN_KEY: '00112233445566778899aabbccddeeff',
    STYLD_MEDIA_ALLOWED_ORIGINS: ORIGIN,
    BETTER_AUTH_URL: APP
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) delete env[key]; else env[key] = value;
  }
  return env;
}

test('the delivery gate only reports ready when every fact it depends on is present', () => {
  assert.equal(gate.resolveMediaDeliveryConfig({}), null, 'nothing configured is not configured delivery');
  assert.equal(gate.resolveMediaDeliveryConfig(completeEnv({ STYLD_RESTRICTED_MEDIA_ENABLED: null })), null, 'a switch nobody turned on stays off');
  for (const missing of ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_SIGN_KEY', 'STYLD_MEDIA_ALLOWED_ORIGINS']) {
    assert.equal(gate.resolveMediaDeliveryConfig(completeEnv({ [missing]: null })), null, `${missing} is required`);
  }
  const ready = gate.resolveMediaDeliveryConfig(completeEnv());
  assert.equal(ready.allowedOrigins.length, 1);
  assert.equal(ready.secureDistribution, 'media.example.test');
  assert.ok(ready.maxBytes <= 5 * 1024 * 1024 && ready.timeoutMs <= 5000 && ready.windowSeconds <= 300);
  assert.ok(!JSON.stringify(ready).includes('test-secret-value') && !JSON.stringify(ready).includes('00112233'), 'the gate answer carries no credential');
});

test('a delivery origin that is not an exact HTTPS origin, or more than one, is refused', () => {
  for (const origins of ['http://media.example.test', 'https://media.example.test/path', 'https://user:pass@media.example.test',
    'https://media.example.test,https://other.example.test', 'https://media.example.test,', 'not a url']) {
    assert.equal(gate.resolveMediaDeliveryConfig(completeEnv({ STYLD_MEDIA_ALLOWED_ORIGINS: origins })), null, `${origins} cannot be trusted`);
  }
  for (const [key, value] of [['STYLD_MEDIA_MAX_BYTES', '0'], ['STYLD_MEDIA_MAX_BYTES', '9000000'], ['STYLD_MEDIA_TIMEOUT_MS', '-1'],
    ['STYLD_MEDIA_ACCESS_WINDOW_SECONDS', '3600'], ['STYLD_MEDIA_ACCESS_WINDOW_SECONDS', 'soon']]) {
    assert.equal(gate.resolveMediaDeliveryConfig(completeEnv({ [key]: value })), null, `${key}=${value} is outside the bound`);
  }
});

test('the signer builds a bounded token URL on the one delivery domain and never beyond the stored window', () => {
  const config = gate.resolveMediaDeliveryConfig(completeEnv());
  const windowEndsAt = Date.now() + 120000;
  const sign = signerModule.createRestrictedSigner({ cloudName: config.cloudName, secureDistribution: config.secureDistribution, signingKey: completeEnv().CLOUDINARY_SIGN_KEY });
  const signed = sign({ assetId: ASSET, providerPublicId: 'styld/owner/pending_asset_01', version: 4, accessExpiresAt: windowEndsAt });
  const url = new URL(signed.url);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.origin, ORIGIN, 'the signed location lands on the allowlisted delivery domain');
  assert.match(url.pathname, /\/image\/authenticated\//, 'restricted delivery, not a public path');
  assert.ok(url.searchParams.get('_a'), 'a token is present');
  assert.equal(signed.assetId, ASSET);
  assert.equal(signed.version, 4);
  assert.equal(signed.expiryEnforced, true);
  assert.ok(signed.expiresAt <= windowEndsAt && signed.expiresAt > Date.now() - 1000, 'the signature cannot outlive the stored window');
  assert.ok(!signed.url.includes('00112233445566778899aabbccddeeff'), 'the key never travels in the URL');
  for (const bad of [{ signingKey: 'short' }, { signingKey: 'not-hex-not-hex-not-hex' }, { secureDistribution: 'media.example.test/path' }, { cloudName: '' }]) {
    assert.throws(() => signerModule.createRestrictedSigner({ cloudName: config.cloudName, secureDistribution: config.secureDistribution, signingKey: config.cloudName, ...bad }));
  }
});

test('a manifest row that does not look like a real record yields nothing', () => {
  const row = { asset_id: ASSET, provider_public_id: 'styld/o/pending_asset_01', owner_workspace_id: WORKSPACE, version: 1, state: 'pending',
    delivery_type: 'authenticated', provider_restriction_verified: true, revoked: false, public_derivative_verified: false,
    approved_version: null, access_expires_at: new Date(Date.now() + 60000) };
  assert.equal(manifestModule.mapPendingMediaRecord(row).accessExpiresAt, row.access_expires_at.getTime());
  assert.equal(manifestModule.mapPendingMediaRecord(undefined), null);
  for (const patch of [{ asset_id: 'has spaces' }, { asset_id: ASSET.repeat(9) }, { owner_workspace_id: 'not-a-uuid' }, { state: 'moderating' },
    { delivery_type: 'upload' }, { version: 'one' }, { provider_restriction_verified: 'maybe' }, { revoked: null }, { provider_public_id: '' }]) {
    assert.equal(manifestModule.mapPendingMediaRecord({ ...row, ...patch }), null, `${JSON.stringify(patch)} is not a usable record`);
  }
});

function harness({ rows = [ASSET], limit = true, session = { userId: USER, sessionId: 'session-one', role: 'professional', accountStatus: 'active', workspaceId: WORKSPACE, mfaVerified: false, admin: false } } = {}) {
  const sqlLog = [];
  const stored = new Map([[ASSET, { asset_id: ASSET, provider_public_id: `styld/${WORKSPACE}/${ASSET}`, owner_workspace_id: WORKSPACE, version: 1, state: 'pending',
    delivery_type: 'authenticated', provider_restriction_verified: true, revoked: false, public_derivative_verified: false,
    approved_version: null, access_expires_at: null }]]);
  const pool = {
    async query(sql, values) {
      sqlLog.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      if (/^SELECT/.test(sql)) {
        const row = stored.get(values[0]);
        return { rows: row && rows.includes(values[0]) ? [row] : [], rowCount: row && rows.includes(values[0]) ? 1 : 0 };
      }
      if (/^UPDATE media_manifests/.test(sql.replace(/\s+/g, ' ').trim())) {
        const row = stored.get(values[0]);
        const ownerScoped = /owner_workspace_id = \$2/.test(sql);
        const eligible = row && row.state === 'pending' && !row.revoked && row.delivery_type === 'authenticated' && row.provider_restriction_verified
          && (!ownerScoped || row.owner_workspace_id === values[1]);
        if (eligible) { row.access_expires_at = new Date(Date.now() + 300000); return { rows: [1], rowCount: 1 }; }
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    async connect() {
      return { query: (sql, values) => pool.query(sql, values ?? []), release() {} };
    }
  };
  const events = [];
  const route = loadModule('app/api/media/pending/[assetId]/route.ts', {
    '@/lib/media-manifest': {
      findPendingMedia: id => manifestModule.findPendingMedia(id, pool),
      openPendingAccessWindow: (id, actor, seconds) => manifestModule.openPendingAccessWindow(id, actor, seconds, pool)
    },
    '@/lib/media-delivery-config.cjs': gate,
    '@/lib/protected-media-contract.cjs': require('../lib/protected-media-contract.cjs'),
    '@/lib/media-provider-signer': signerModule,
    '@/lib/auth-resolver': { AuthError, resolveCurrentStyldUser: async () => session },
    '@/lib/api-security': apiSecurity,
    '@/lib/security-events': { consumeLimit: async () => limit, securityEvent: async event => { events.push(event); } }
  }, { fetch: async () => new Response(Uint8Array.from([137, 80, 78, 71, 10]), { headers: { 'content-type': 'image/png' } }) });
  const asset = () => ({ params: Promise.resolve({ assetId: ASSET }) });
  const get = () => route.GET(new Request(`${APP}/api/media/pending/${ASSET}`), asset());
  const post = (origin = APP) => route.POST(new Request(`${APP}/api/media/pending/${ASSET}`, { method: 'POST', headers: { origin } }), asset());
  return { route, stored, sqlLog, events, pool, get, post, asset };
}

async function withEnv(env, run) {
  const previous = { ...process.env };
  try {
    for (const key of Object.keys(process.env)) if (/^(STYLD_|CLOUDINARY_|NEXT_PUBLIC_|BETTER_AUTH_)/.test(key)) delete process.env[key];
    Object.assign(process.env, env);
    return await run();
  } finally {
    for (const key of Object.keys(process.env)) if (/^(STYLD_|CLOUDINARY_|NEXT_PUBLIC_|BETTER_AUTH_)/.test(key)) delete process.env[key];
    Object.assign(process.env, previous);
  }
}

test('the route refuses without touching a single adapter while delivery is not configured', async () => {
  const cases = [{}, completeEnv({ STYLD_RESTRICTED_MEDIA_ENABLED: null }), completeEnv({ CLOUDINARY_SIGN_KEY: null }),
    completeEnv({ STYLD_MEDIA_ALLOWED_ORIGINS: 'https://media.example.test,https://spare.example.test' })];
  for (const env of cases) {
    await withEnv(env, async () => {
      const h = harness();
      const response = await h.get();
      assert.equal(response.status, 503, 'an unverified delivery is announced as unavailable, not faked');
      assert.deepEqual(await response.json(), { ok: false, error: 'This image is not available.' });
      assert.equal((await h.post()).status, 503);
      assert.deepEqual(h.sqlLog, [], 'no window is opened against an unconfigured provider');
      assert.deepEqual(h.events, []);
    });
  }
});

test('a pending asset serves no bytes until a window is opened, and only to the owner', () => withEnv(completeEnv(), async () => {
  const h = harness();
  assert.equal((await h.get()).status, 404, 'nobody was granted a window, so nothing exists here');
  assert.equal(h.stored.get(ASSET).access_expires_at, null);

  const grant = await h.post();
  assert.equal(grant.status, 200);
  assert.deepEqual(await grant.json(), { ok: true, delivery: 'restricted' });
  assert.deepEqual(h.events, ['media_access_window_granted']);
  assert.ok(h.stored.get(ASSET).access_expires_at instanceof Date, 'the server recorded a bounded window');

  const served = await h.get();
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('cache-control'), 'private, no-store');
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(served.headers.get('vary'), 'Cookie');
  assert.deepEqual([...new Uint8Array(await served.arrayBuffer())], [137, 80, 78, 71, 10]);

  // A second professional in another workspace is told the same thing an intruder is.
  const outsider = harness({ session: { userId: '44444444-4444-4444-8444-444444444444', sessionId: 'session-two', role: 'professional', accountStatus: 'active', workspaceId: OTHER, mfaVerified: false, admin: false } });
  outsider.stored.set(ASSET, h.stored.get(ASSET));
  assert.equal((await outsider.get()).status, 404);
  // A caller the store is throttling is refused the write, not the read.
  const throttled = harness({ limit: false });
  throttled.stored.set(ASSET, { ...h.stored.get(ASSET), access_expires_at: null });
  const busy = await throttled.post();
  assert.equal(busy.status, 429);
  assert.equal(throttled.stored.get(ASSET).access_expires_at, null, 'a refused request leaves no window behind');
}));

test('an unverified provider restriction, a revoked asset and a rejected state all stay closed', async () => {
  const patches = [{ provider_restriction_verified: false }, { revoked: true }, { state: 'rejected' }, { state: 'published' }, { delivery_type: 'public' }];
  for (const patch of patches) {
    await withEnv(completeEnv(), async () => {
      const h = harness();
      Object.assign(h.stored.get(ASSET), patch);
      h.stored.get(ASSET).access_expires_at = new Date(Date.now() + 60000);
      assert.equal((await h.get()).status, 404, `${JSON.stringify(patch)} must not release bytes`);
      assert.ok([404, 503].includes((await h.post()).status), `${JSON.stringify(patch)} cannot be granted a window`);
    });
  }
});

test('opening a window is expressed only from server-derived authority', async () => {
  const base = { sessionId: 'session-one', active: true, mfaVerified: false, canReviewMedia: false, userId: USER };
  const run = (actor, seconds = 300) => {
    const sqlLog = [];
    const pool = { connect: async () => ({ query: async (sql, values) => { sqlLog.push({ sql: sql.replace(/\s+/g, ' ').trim(), values }); return { rowCount: 1, rows: [1] }; }, release() {} }) };
    return manifestModule.openPendingAccessWindow(ASSET, actor, seconds, pool).then(result => ({ result, sqlLog, update: sqlLog.find(entry => /^UPDATE/.test(entry.sql)) }));
  };
  const cases = [];
  cases.push(await run({ ...base, role: 'client', workspaceId: WORKSPACE }));
  cases.push(await run({ ...base, role: 'professional', workspaceId: null }));
  cases.push(await run({ ...base, role: 'professional', workspaceId: 'not-a-uuid' }));
  cases.push(await run({ ...base, active: false, role: 'professional', workspaceId: WORKSPACE }));
  for (const { result, sqlLog } of cases) {
    assert.ok(['forbidden', 'not_available'].includes(result));
    assert.deepEqual(sqlLog, [], 'a caller with no authority never reaches the database');
  }
  const owner = await run({ ...base, role: 'salon', workspaceId: WORKSPACE });
  assert.equal(owner.result, 'granted');
  assert.deepEqual(owner.sqlLog.map(entry => entry.sql).filter(sql => /^SET LOCAL/.test(sql)),
    ["SET LOCAL lock_timeout = '5s'", "SET LOCAL idle_in_transaction_session_timeout = '5s'"],
    'both guards are issued inside the transaction and before the row is touched');
  assert.equal(owner.sqlLog[0].sql, 'BEGIN', 'the guards run inside a transaction, where SET LOCAL applies');
  assert.match(owner.update.sql, /provider_restriction_verified = true/);
  assert.match(owner.update.sql, /owner_workspace_id = \$2/);
  // The bound values are built inside the module's realm, so compare the primitives rather than the array.
  const sameValues = (actual, expected) => {
    assert.equal(actual.length, expected.length, 'the statement binds exactly the server-derived values');
    expected.forEach((value, index) => assert.equal(actual[index], value, 'no client value is bound'));
  };
  sameValues(owner.update.values, [ASSET, WORKSPACE]);
  const reviewer = await run({ ...base, role: 'super_admin', workspaceId: null, mfaVerified: true, canReviewMedia: true });
  assert.equal(reviewer.result, 'granted');
  assert.doesNotMatch(reviewer.update.sql, /owner_workspace_id/, 'a reviewer is not scoped to one workspace');
  sameValues(reviewer.update.values, [ASSET]);
  const notMfa = await run({ ...base, role: 'super_admin', workspaceId: null, mfaVerified: false, canReviewMedia: true });
  assert.deepEqual(notMfa.sqlLog, [], 'an administrator without a verified second factor gets no window');
});

test('a POST from another site is refused before the manifest is read, and an anonymous caller is asked to sign in', () => withEnv(completeEnv(), async () => {
  const crossOrigin = harness();
  const refused = await crossOrigin.post('https://elsewhere.example.test');
  assert.equal(refused.status, 403);
  assert.deepEqual(crossOrigin.sqlLog, [], 'the origin guard runs before any database work');
  const signedOut = harness({ session: null });
  const anonymous = await signedOut.post();
  assert.equal(anonymous.status, 401);
  assert.deepEqual(signedOut.events, []);
  const anonymousRead = await signedOut.get();
  assert.equal(anonymousRead.status, 404, 'an anonymous read gets the same refusal as a wrong name');
}));

test('the shipped contract and policy are the only rule book this route uses', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app/api/media/pending/[assetId]/route.ts'), 'utf8');
  assert.match(source, /from '@\/lib\/protected-media-contract\.cjs'/, 'the route delegates serving to the reviewed contract');
  assert.match(source, /from '@\/lib\/media-delivery-config\.cjs'/);
  assert.doesNotMatch(source, /secure_url|res\.cloudinary\.com|http:/, 'no public storage path is ever assembled here');
  assert.doesNotMatch(source, /searchParams\.get\(['"]workspace|request\.headers\.get\(['"]x-styld-role/i, 'authority never comes from the request');
});
