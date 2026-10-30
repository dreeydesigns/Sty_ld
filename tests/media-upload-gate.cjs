/**
 * Pending-media upload gate (Backend & Data slice).
 *
 * /api/upload hands the browser a provider URL, so while the provider side of
 * restricted delivery is unverified an accepted upload would be a public image wearing
 * a private label. These tests load the shipped policy and the real route handler and
 * prove that the refusal happens before the rate limiter is charged, before the request
 * body is parsed and before the provider is called, and that the two ways back in are
 * both explicit acts by the person who owns the account.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const GATE_KEYS = ['STYLD_RESTRICTED_MEDIA_ENABLED', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET', 'CLOUDINARY_SIGN_KEY', 'STYLD_MEDIA_ALLOWED_ORIGINS', 'STYLD_MEDIA_MAX_BYTES',
  'STYLD_MEDIA_TIMEOUT_MS', 'STYLD_MEDIA_ACCESS_WINDOW_SECONDS', 'STYLD_MEDIA_UPLOADS_UNRESTRICTED',
  'STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED', 'BETTER_AUTH_URL'];

const gate = require('../lib/media-delivery-config.cjs');

const next = { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers || {}, cookies: { set() {} } }) } };

function completeDelivery(overrides = {}) {
  const env = {
    STYLD_RESTRICTED_MEDIA_ENABLED: 'true',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'styldtest',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret-value',
    CLOUDINARY_SIGN_KEY: '00112233445566778899aabbccddeeff',
    STYLD_MEDIA_ALLOWED_ORIGINS: 'https://media.example.test',
    BETTER_AUTH_URL: 'https://styld.test',
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) delete env[key]; else env[key] = value;
  }
  return env;
}

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(path.join(ROOT, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console: { error() {}, warn() {}, log() {} }, process, Buffer, URL, URLSearchParams })(
    (name) => (Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name)), module, module.exports);
  return module.exports;
}

function withEnv(env, run) {
  const previous = { ...process.env };
  return Promise.resolve()
    .then(() => {
      for (const key of GATE_KEYS) delete process.env[key];
      Object.assign(process.env, env);
      return run();
    })
    .finally(() => {
      for (const key of GATE_KEYS) delete process.env[key];
      Object.assign(process.env, previous);
    });
}

// A route run that records everything it touched, so ordering is proved by observation
// rather than by reading the source.
function routeRun(env, { session = { userId: '33333333-3333-4333-8333-333333333333' } } = {}) {
  const touched = { rateLimitQueries: 0, bodiesParsed: 0, providerCalls: 0 };
  const pool = {
    async query() {
      touched.rateLimitQueries += 1;
      return { rows: [{ count: 1 }], rowCount: 1 };
    },
  };
  const cloudinary = {
    v2: {
      config() {},
      uploader: {
        upload(_dataUrl, _options, callback) {
          touched.providerCalls += 1;
          callback(null, {
            secure_url: 'https://res.cloudinary.com/styldtest/image/upload/styld/owner/pic.jpg',
            public_id: 'styld/owner/pic', width: 512, height: 512, format: 'jpg', bytes: 1024,
          });
        },
      },
    },
  };
  const route = load('app/api/upload/route.ts', {
    'next/server': next,
    cloudinary,
    '@/lib/auth-resolver': { resolveCurrentStyldUser: async () => session },
    '@/lib/auth-database': { authPool: pool },
    '@/lib/media-delivery-config.cjs': gate,
  });
  const request = {
    headers: { get: () => 'application/json' },
    json: async () => {
      touched.bodiesParsed += 1;
      return { dataUrl: 'data:image/png;base64,AAAB' };
    },
  };
  return withEnv(env, async () => ({ response: await route.POST(request), touched }));
}

test('the policy refuses when nobody has configured or declared anything', () => {
  for (const env of [{}, { STYLD_MEDIA_UPLOADS_UNRESTRICTED: '' }, { STYLD_MEDIA_UPLOADS_UNRESTRICTED: 'yes' },
    { STYLD_MEDIA_UPLOADS_UNRESTRICTED: 'false' }, { STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED: 'true' }]) {
    const policy = gate.resolvePendingUploadPolicy(env);
    assert.equal(policy.allowUploads, false, `${JSON.stringify(env)} is not a reason to accept a pending image`);
    assert.equal(policy.reason, 'restricted-delivery-not-attested');
    assert.equal(policy.basis, null);
  }
});

test('a fully configured restricted delivery still needs the account owner to attest the provider side', () => {
  assert.equal(gate.resolvePendingUploadPolicy(completeDelivery()).allowUploads, false,
    'configuration alone does not prove the provider folder is private');
  for (const missing of ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_SIGN_KEY', 'STYLD_MEDIA_ALLOWED_ORIGINS']) {
    const env = completeDelivery({ [missing]: null, STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED: 'true' });
    assert.equal(gate.resolvePendingUploadPolicy(env).allowUploads, false, `${missing} missing cannot be attested away`);
  }
  const attested = gate.resolvePendingUploadPolicy(completeDelivery({ STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED: 'true' }));
  assert.equal(attested.allowUploads, true);
  assert.equal(attested.basis, 'restricted-delivery-attested');
  assert.equal(gate.resolvePendingUploadPolicy(completeDelivery({ STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED: 'TRUE' })).allowUploads, true,
    'the attestation is matched on the word, not its case');
});

test('the public declaration is a separate explicit act and carries no credential', () => {
  const declared = gate.resolvePendingUploadPolicy({ STYLD_MEDIA_UPLOADS_UNRESTRICTED: 'true' });
  assert.equal(declared.allowUploads, true);
  assert.equal(declared.basis, 'public-uploads-declared');
  assert.ok(!JSON.stringify(declared).includes('test-secret-value'), 'the answer describes the rule, never the secret');
  assert.ok(Object.isFrozen(declared), 'a caller cannot talk the policy into opening itself');
});

test('with nothing configured the route refuses and touches neither the limiter, the body nor the provider', async () => {
  for (const env of [{}, completeDelivery(), completeDelivery({ CLOUDINARY_SIGN_KEY: null }),
    completeDelivery({ STYLD_MEDIA_ALLOWED_ORIGINS: 'http://media.example.test' }),
    completeDelivery({ STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED: 'true', CLOUDINARY_SIGN_KEY: null })]) {
    const { response, touched } = await routeRun(env);
    assert.equal(response.status, 503, `${JSON.stringify(Object.keys(env))} must not accept an upload`);
    assert.equal(response.body.ok, false);
    assert.equal(response.body.error, 'Image uploads are not available in this environment yet.');
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.deepEqual(touched, { rateLimitQueries: 0, bodiesParsed: 0, providerCalls: 0 },
      'a closed gate costs no database write and no provider call');
  }
});

test('a signed out caller is asked to sign in before the upload gate is even consulted', async () => {
  const { response, touched } = await routeRun({}, { session: null });
  assert.equal(response.status, 401);
  assert.deepEqual(touched, { rateLimitQueries: 0, bodiesParsed: 0, providerCalls: 0 });
});

test('either accepted basis lets the upload through to the provider, and the refusal reason never names a secret', async () => {
  const accepted = [
    { env: completeDelivery({ STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED: 'true' }), label: 'attested restricted delivery' },
    { env: { STYLD_MEDIA_UPLOADS_UNRESTRICTED: 'true', NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'styldtest', CLOUDINARY_API_KEY: 'test-key', CLOUDINARY_API_SECRET: 'test-secret-value' }, label: 'declared public environment' },
  ];
  for (const { env, label } of accepted) {
    const { response, touched } = await routeRun(env);
    assert.equal(response.status, 200, label);
    assert.equal(touched.providerCalls, 1, label);
    assert.equal(touched.bodiesParsed, 1, label);
    assert.equal(touched.rateLimitQueries, 1, `${label} still charges the rate limiter`);
    assert.equal(response.body.ok, true);
    assert.ok(!JSON.stringify(response.body).includes('test-secret-value'), 'the answer carries no credential');
  }
  const refusal = await routeRun({});
  assert.ok(!JSON.stringify(refusal.response.body).match(/styldtest|test-key|test-secret-value|00112233/), 'a refusal describes the rule, not the configuration');
});

test('the consulted policy is the shipped one and the route reads it from the server environment', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app/api/upload/route.ts'), 'utf8');
  assert.match(source, /from ['"]@\/lib\/media-delivery-config\.cjs['"]/, 'the gate is the reviewed module, not an inline guess');
  assert.match(source, /resolvePendingUploadPolicy\(process\.env\)/);
  assert.doesNotMatch(source, /resolvePendingUploadPolicy\(\s*\{/, 'no request-supplied object decides the policy');
  const gateIndex = source.indexOf('resolvePendingUploadPolicy(process.env)');
  assert.ok(gateIndex > 0 && gateIndex < source.indexOf('authPool.query'), 'the gate runs before the rate limiter spends a write');
  assert.ok(gateIndex < source.indexOf('cloudinary.uploader.upload'), 'the gate runs before the provider is called');
});
