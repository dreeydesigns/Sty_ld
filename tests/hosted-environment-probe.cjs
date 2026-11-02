/**
 * Hosted environment probe (DevOps slice).
 *
 * The beta cannot be called isolated until something inside the running deployment can say which
 * database it resolved to, so this suite loads the shipped route and the shipped read-only module
 * and proves six things: the endpoint is invisible without the token and stays invisible when no
 * token is configured, the answer names identity and emptiness rather than credentials, the answer
 * names the cluster and the running postmaster so two databases sharing a name cannot be confused,
 * a server that refuses the optional cluster statistic still answers the rest, the mail sender is
 * reported as a domain and nothing more, and a database that will not answer is reported without
 * its error text. The fake pool records the statements, so ordering and read-only-ness are observed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const PROBE_KEYS = ['STYLD_RESTRICTED_MEDIA_ENABLED', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET', 'CLOUDINARY_SIGN_KEY', 'STYLD_MEDIA_ALLOWED_ORIGINS', 'STYLD_MEDIA_UPLOADS_UNRESTRICTED',
  'STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED', 'HEALTH_CHECK_TOKEN', 'POSTGRES_URL', 'RESEND_API_KEY',
  'RESEND_FROM_EMAIL', 'EMAIL_PROVIDER'];

const healthToken = require('../lib/health-token.cjs');
const probeModule = require('../lib/environment-probe.cjs');

class NextResponseStub {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.headers = init.headers || {};
  }

  static json(body, init = {}) {
    return new NextResponseStub(body, { status: init?.status ?? 200, headers: init?.headers || {} });
  }
}

function loadModule(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(path.join(ROOT, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console, process, Buffer, URL, URLSearchParams })(
    (name) => (Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name)), module, module.exports);
  return module.exports;
}

const COMPLETE_DELIVERY = {
  STYLD_RESTRICTED_MEDIA_ENABLED: 'true',
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'styldtest',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret-value',
  CLOUDINARY_SIGN_KEY: '00112233445566778899aabbccddeeff',
  STYLD_MEDIA_ALLOWED_ORIGINS: 'https://media.example.test',
};

function fakePool({ tables = ['users', 'sessions', 'schema_migrations'], accounts = 0,
  applied = ['001_initial_schema.sql'], fail = null, cluster = '7300000000000000001' } = {}) {
  const issued = [];
  return {
    issued,
    async query(sql) {
      issued.push(sql);
      if (fail) throw fail;
      if (/^SELECT current_database/.test(sql)) {
        return { rows: [{ database: 'styld_beta', role: 'styld_beta_owner', port: 5432, address: '10.0.0.9' }], rowCount: 1 };
      }
      if (/^SELECT pg_postmaster_start_time/.test(sql)) {
        return { rows: [{ started_at: new Date('2026-11-02T07:41:00.000Z') }], rowCount: 1 };
      }
      if (/^SELECT system_identifier/.test(sql)) {
        if (cluster === 'refused') throw new Error('permission denied for function pg_control_system (42889)');
        return { rows: cluster === null ? [] : [{ system_identifier: cluster }], rowCount: cluster === null ? 0 : 1 };
      }
      if (/^SELECT table_name FROM information_schema/.test(sql)) {
        return { rows: tables.map(name => ({ table_name: name })), rowCount: tables.length };
      }
      if (/^SELECT count\(\*\)::int AS accounts/.test(sql)) return { rows: [{ accounts }], rowCount: 1 };
      if (/^SELECT name FROM schema_migrations/.test(sql)) return { rows: applied.map(name => ({ name })), rowCount: applied.length };
      throw new Error('the probe asked for a statement that is not on its list: ' + sql);
    },
  };
}

function routeHarness(poolDependencies) {
  const pool = poolDependencies || fakePool();
  const route = loadModule('app/api/health/environment/route.ts', {
    'next/server': { NextResponse: NextResponseStub },
    '@/lib/auth-database': { authPool: pool },
    '@/lib/email-diagnostics': loadModule('lib/email-diagnostics.ts', {}),
    '@/lib/health-token.cjs': healthToken,
    '@/lib/environment-probe.cjs': probeModule,
  });
  return { route, pool, get: (token) => route.GET({ headers: { get: (name) => (name === 'x-health-check-token' ? token : null) } }) };
}

async function withEnv(env, run) {
  const previous = { ...process.env };
  try {
    for (const key of PROBE_KEYS) delete process.env[key];
    Object.assign(process.env, env);
    return await run();
  } finally {
    for (const key of PROBE_KEYS) delete process.env[key];
    Object.assign(process.env, previous);
  }
}

test('the probe is a route that does not exist until a token is configured, and then only for the right token', async () => {
  await withEnv({ POSTGRES_URL: 'postgres://role:canary-secret@host.internal:5432/db' }, async () => {
    delete process.env.HEALTH_CHECK_TOKEN;
    const noToken = routeHarness();
    assert.equal((await noToken.get('anything')).status, 404, 'a probe with no token configured stays hidden');
    assert.deepEqual(noToken.pool.issued, [], 'a hidden probe asks the database nothing');

    process.env.HEALTH_CHECK_TOKEN = 'probe-token-1234';
    const h = routeHarness();
    assert.equal((await h.get(null)).status, 404, 'no header is a 404');
    assert.equal((await h.get('')).status, 404, 'an empty header is a 404');
    assert.equal((await h.get('wrong-token')).status, 404, 'a wrong token is the same 404');
    assert.equal((await h.get('probe-token-12')).status, 404, 'a shorter prefix of the real token is a 404, not a partial match');
    assert.deepEqual(h.pool.issued, [], 'none of those attempts reached the database');

    const ok = await h.get('probe-token-1234');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['Cache-Control'], 'no-cache, no-store, must-revalidate', 'the answer is never cached at an edge');
    assert.equal(ok.body.ok, true);
    assert.equal(ok.body.service, 'styld-environment');
    assert.ok(!JSON.stringify(ok.body).includes('canary-secret'), 'the connection string never appears in the answer');
    assert.ok(!JSON.stringify(ok.body).includes('host.internal'), 'the configured host is not echoed either');
  });
});

test('the answer states which database was reached, whether it is empty, and what is applied', async () => {
  await withEnv({ HEALTH_CHECK_TOKEN: 'probe-token-1234', POSTGRES_URL: 'postgres://role:synthetic-canary@host.internal:5432/beta' }, async () => {
    const h = routeHarness(fakePool({ accounts: 0, applied: ['001_initial_schema.sql', '016_discussion_requests.sql'] }));
    const body = (await h.get('probe-token-1234')).body;
    assert.equal(body.probe.database.name, 'styld_beta');
    assert.equal(body.probe.database.role, 'styld_beta_owner');
    assert.equal(body.probe.database.serverPort, 5432);
    assert.equal(body.probe.database.publicTableCount, 3);
    assert.equal(body.probe.database.accountRows, 0, 'an empty beta database is stated, not assumed');
    assert.deepEqual(body.probe.database.migrationsApplied, ['001_initial_schema.sql', '016_discussion_requests.sql']);
    assert.equal(body.probe.database.migrationCount, 2);
    assert.equal(body.configured.database.POSTGRES_URL, true, 'a database is present, stated as a boolean');
    assert.ok(!JSON.stringify(body).includes('synthetic-canary') && !JSON.stringify(body).includes('host.internal'),
      'the configured target is never echoed, only the server-reported identity');
    assert.equal(typeof body.configured.emailServiceConfigured, 'boolean');
    assert.deepEqual(h.pool.issued.filter(sql => !/^SELECT\b/.test(sql)), [], 'every statement the probe issues is a read');
  });
});

test('the answer names the cluster and the process, which is what separates two databases sharing one name', async () => {
  await withEnv({ HEALTH_CHECK_TOKEN: 'probe-token-1234', POSTGRES_URL: 'postgres://role:synthetic-canary@beta-host.internal:5432/styld_beta' }, async () => {
    const h = routeHarness(fakePool());
    const body = (await h.get('probe-token-1234')).body;
    assert.equal(body.probe.database.clusterId, '7300000000000000001',
      'a database name alone cannot prove which endpoint answered, a system identifier can');
    assert.equal(body.probe.database.serverStartedAt, '2026-11-02T07:41:00.000Z',
      'the running postmaster is identified, so a stale compute cannot pass for a fresh one');
    assert.ok(!JSON.stringify(body).includes('synthetic-canary'), 'no credential of any kind is echoed');
    assert.ok(!JSON.stringify(body).includes('beta-host.internal'),
      'the configured host is not the answer; the server-reported identity is');
    assert.deepEqual(h.pool.issued.filter(sql => !/^(SELECT|WITH)\b/.test(sql)), [],
      'and the two new reads are reads');
  });
});

test('a server that refuses the cluster statistics function still answers everything else', async () => {
  await withEnv({ HEALTH_CHECK_TOKEN: 'probe-token-1234' }, async () => {
    const h = routeHarness(fakePool({ cluster: 'refused' }));
    const response = await h.get('probe-token-1234');
    assert.equal(response.status, 200, 'a refused optional fact degrades the readout instead of blanking it');
    assert.equal(response.body.probe.database.clusterId, null);
    assert.equal(response.body.probe.database.name, 'styld_beta', 'the rest of the identity is still there');
    assert.ok(!JSON.stringify(response.body).includes('pg_control_system'),
      'the permission error is not carried into the answer');
  });
});

test('the sender is reported as a domain, which is the half that needs reconciling', async () => {
  await withEnv({
    HEALTH_CHECK_TOKEN: 'probe-token-1234',
    RESEND_FROM_EMAIL: 'STYLD Support <no-reply@wearestyld.com>',
  }, async () => {
    const body = (await routeHarness().get('probe-token-1234')).body;
    assert.equal(body.probe.email.senderDomain, 'wearestyld.com');
    assert.equal(body.probe.email.provider, 'resend', 'the default provider is stated rather than assumed');
    assert.ok(!JSON.stringify(body).includes('no-reply'), 'the mailbox itself is not published, only its domain');

    const gmail = await withEnv({
      HEALTH_CHECK_TOKEN: 'probe-token-1234', EMAIL_PROVIDER: 'gmail', RESEND_FROM_EMAIL: 'beta@styld.co.ke',
    }, async () => (await routeHarness().get('probe-token-1234')).body.probe.email);
    assert.deepEqual(gmail, { provider: 'gmail', senderDomain: 'styld.co.ke' });

    const unset = await withEnv({ HEALTH_CHECK_TOKEN: 'probe-token-1234' },
      async () => (await routeHarness().get('probe-token-1234')).body.probe.email);
    assert.equal(unset.senderDomain, null, 'an unset sender reads as unset, not as an empty domain');
  });
});

test('a database with no users table and no migrations table answers facts rather than zeroes', async () => {
  await withEnv({ HEALTH_CHECK_TOKEN: 'probe-token-1234' }, async () => {
    const h = routeHarness(fakePool({ tables: ['pg_stat'], applied: [], accounts: 0 }));
    const body = (await h.get('probe-token-1234')).body;
    assert.equal(body.probe.database.accountRows, null, 'a missing table is not reported as an empty table');
    assert.equal(body.probe.database.migrationCount, 0);
    assert.ok(!h.pool.issued.some(sql => /FROM users/.test(sql)), 'the count is not attempted against a table that is not there');
  });
});

test('the media half of the answer is the shipped policy, so an unconfigured beta reads as refusing uploads', async () => {
  await withEnv({ HEALTH_CHECK_TOKEN: 'probe-token-1234' }, async () => {
    const refusing = (await routeHarness().get('probe-token-1234')).body.probe.media;
    assert.deepEqual(refusing, {
      restrictedDeliveryConfigured: false,
      deliveryOrigin: null,
      accessWindowSeconds: null,
      uploadsAllowed: false,
      uploadBasis: null,
      uploadRefusalReason: 'restricted-delivery-not-attested',
    });

    const configured = await withEnv({
      HEALTH_CHECK_TOKEN: 'probe-token-1234', ...COMPLETE_DELIVERY, STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED: 'true',
    }, async () => (await routeHarness().get('probe-token-1234')).body.probe.media);
    assert.equal(configured.restrictedDeliveryConfigured, true);
    assert.equal(configured.deliveryOrigin, 'https://media.example.test');
    assert.equal(configured.uploadsAllowed, true);
    assert.equal(configured.uploadBasis, 'restricted-delivery-attested');
    assert.ok(!JSON.stringify(configured).includes('test-secret-value') && !JSON.stringify(configured).includes('00112233'),
      'the answer describes the delivery domain, never the signing key');
  });
});

test('a database that will not answer is announced as unavailable without repeating what the driver said', async () => {
  await withEnv({ HEALTH_CHECK_TOKEN: 'probe-token-1234' }, async () => {
    const h = routeHarness(fakePool({ fail: Object.assign(new Error('password authentication failed for role canary-secret@host.internal'), { code: '28P01' }) }));
    const response = await h.get('probe-token-1234');
    assert.equal(response.status, 503);
    assert.equal(response.body.ok, false);
    assert.equal(response.body.error, 'The environment probe is unavailable.');
    assert.ok(!JSON.stringify(response.body).includes('canary-secret') && !JSON.stringify(response.body).includes('28P01'),
      'the driver message is not carried into the answer');
  });
});

test('the token rule is one implementation and both readouts use it', () => {
  assert.equal(healthToken.healthTokenMatches('', ''), false);
  assert.equal(healthToken.healthTokenMatches('a', 'a'), true);
  assert.equal(healthToken.healthTokenMatches('a-token', 'a-toke'), false);
  const sources = ['app/api/health/auth/route.ts', 'app/api/health/environment/route.ts']
    .map(file => fs.readFileSync(path.join(ROOT, file), 'utf8'));
  for (const source of sources) {
    assert.match(source, /from ['"]@\/lib\/health-token\.cjs['"]/);
    assert.doesNotMatch(source, /timingSafeEqual/, 'the comparison lives once, in the shared module');
  }
});
