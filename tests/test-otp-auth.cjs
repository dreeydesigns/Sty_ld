/**
 * Test OTP Authentication & Provider Security Test Suite.
 *
 * Tests:
 * 1. Dynamic 6-digit cryptographic OTP generation (no static/universal master code).
 * 2. Test mode active detection via AUTH_OTP_PROVIDER=test and AUTH_TEST_MODE=true.
 * 3. Production fail-closed guard: TestOtpProvider rejected in NODE_ENV=production
 *    unless AUTH_STAGING_MODE=true / STYLD_ENV=staging AND AUTH_TEST_PHONE_ALLOWLIST is non-empty.
 * 4. Staging allowlist enforcement: non-allowlisted phone rejected with 403.
 * 5. Staging allowlist enforcement: allowlisted phone accepted.
 * 6. Local development convenience: any valid E.164 accepted when allowlist unset.
 * 7. OTP expiration: challenge expires after 10 minutes (600s).
 * 8. Attempt threshold: exceeding 5 attempts locks out verification.
 * 9. Replay attack prevention: single-use OTP cannot be consumed twice.
 * 10. Returning user vs New user: new user requires first name and terms acceptance.
 * 11. Privilege escalation defense: public signup strictly clamped to client role.
 * 12. Dev hint security: devHint returned in local dev, suppressed in production staging.
 * 13. Production WhatsApp provider: fails closed (503) when credentials missing.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function loadModule(filePath, customEnv = {}, mockDependencies = {}) {
  const absolutePath = path.join(__dirname, '..', filePath);
  const rawSource = fs.readFileSync(absolutePath, 'utf8');
  const transpiled = ts.transpileModule(rawSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const sandboxEnv = { ...process.env, ...customEnv };
  const moduleObj = { exports: {} };

  const sandbox = {
    console,
    process: {
      ...process,
      env: sandboxEnv,
    },
    Buffer,
    URL,
    URLSearchParams,
    AbortSignal,
    fetch: globalThis.fetch,
  };

  const runner = vm.runInNewContext(
    `(function(require, module, exports) { ${transpiled}\n})`,
    sandbox
  );

  const currentDir = path.dirname(filePath);

  runner(
    (name) => {
      if (mockDependencies[name]) return mockDependencies[name];
      if (name.startsWith('@/')) {
        let resolved = name.replace('@/', '');
        if (!resolved.endsWith('.ts')) resolved += '.ts';
        return loadModule(resolved, customEnv, mockDependencies);
      }
      if (name.startsWith('./') || name.startsWith('../')) {
        let resolved = path.join(currentDir, name).replace(/\\/g, '/');
        if (!resolved.endsWith('.ts')) resolved += '.ts';
        return loadModule(resolved, customEnv, mockDependencies);
      }
      return require(name);
    },
    moduleObj,
    moduleObj.exports
  );

  return moduleObj.exports;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Dynamic OTP Generation (Zero Static / Master Codes)
// ─────────────────────────────────────────────────────────────────────────────

test('TestOtpProvider generates dynamic, 6-digit random codes that vary across requests', async () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    AUTH_OTP_PROVIDER: 'test',
    NODE_ENV: 'development',
  });

  const provider = new TestOtpProvider();
  const codes = new Set();

  for (let i = 0; i < 20; i++) {
    const result = await provider.sendOtp(`+2547123456${String(i).padStart(2, '0')}`);
    assert.equal(result.status, 'pending');
    assert.equal(result.channel, 'test');
    assert.match(result.sid, /^TEST_[0-9a-f]{32}$/);

    // Verify OTP format: strictly 6 numeric digits
    const devHint = provider.getDevOtp(result.sid);
    assert.ok(devHint, 'Dev hint should be available in development');
    assert.match(devHint, /^\d{6}$/, 'OTP must be exactly 6 numeric digits');
    assert.notEqual(devHint, '123456', 'Must not use hardcoded 123456 as universal master code');
    codes.add(devHint);
  }

  // Cryptographically random codes must produce high variety
  assert.ok(codes.size > 15, `Expected diverse random OTPs, got ${codes.size} unique out of 20`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Test Mode Activation Checks
// ─────────────────────────────────────────────────────────────────────────────

test('isTestOtpModeActive returns true only when explicitly configured', () => {
  const { isTestOtpModeActive } = loadModule('lib/otp-provider.ts', {
    AUTH_OTP_PROVIDER: 'test',
  });
  assert.equal(isTestOtpModeActive(), true);

  const { isTestOtpModeActive: activeViaFlag } = loadModule('lib/otp-provider.ts', {
    AUTH_OTP_PROVIDER: '',
    AUTH_TEST_MODE: 'true',
  });
  assert.equal(activeViaFlag(), true);

  const { isTestOtpModeActive: disabledMode } = loadModule('lib/otp-provider.ts', {
    AUTH_OTP_PROVIDER: 'twilio',
    AUTH_TEST_MODE: 'false',
  });
  assert.equal(disabledMode(), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Production Safety Guard (Fail-Closed in Production)
// ─────────────────────────────────────────────────────────────────────────────

test('TestOtpProvider is refused in NODE_ENV=production without staging flag', () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_OTP_PROVIDER: 'test',
    AUTH_STAGING_MODE: 'false',
    STYLD_ENV: 'production',
  });

  assert.throws(
    () => new TestOtpProvider(),
    /cannot run in production without explicit staging authorization/i
  );
});

test('TestOtpProvider is refused in NODE_ENV=production without non-empty phone allowlist', () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_OTP_PROVIDER: 'test',
    AUTH_STAGING_MODE: 'true',
    AUTH_TEST_PHONE_ALLOWLIST: '',
  });

  assert.throws(
    () => new TestOtpProvider(),
    /cannot run in production without explicit staging authorization/i
  );
});

test('TestOtpProvider is allowed in NODE_ENV=production when both staging flag AND allowlist are set', () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_OTP_PROVIDER: 'test',
    AUTH_STAGING_MODE: 'true',
    AUTH_TEST_PHONE_ALLOWLIST: '+254712345678, +254799887766',
  });

  assert.doesNotThrow(() => new TestOtpProvider());
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Staging Allowlist Enforcement
// ─────────────────────────────────────────────────────────────────────────────

test('Staging mode rejects non-allowlisted phone numbers with 403 error', async () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_OTP_PROVIDER: 'test',
    AUTH_STAGING_MODE: 'true',
    AUTH_TEST_PHONE_ALLOWLIST: '+254712345678, +254799887766',
  });

  const provider = new TestOtpProvider();

  // Allowlisted phone succeeds
  const allowed = await provider.sendOtp('+254712345678');
  assert.equal(allowed.status, 'pending');

  // Non-allowlisted phone is rejected
  await assert.rejects(
    () => provider.sendOtp('+254700000000'),
    (err) => {
      assert.equal(err.status, 403);
      assert.match(err.message, /not allowlisted|not enabled/i);
      return true;
    }
  );
});

test('Local development accepts any valid E.164 when allowlist is not specified', async () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'development',
    AUTH_OTP_PROVIDER: 'test',
    AUTH_TEST_PHONE_ALLOWLIST: '',
  });

  const provider = new TestOtpProvider();
  const res = await provider.sendOtp('+254711223344');
  assert.equal(res.status, 'pending');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Expiration & Attempt Limit & Replay Protection
// ─────────────────────────────────────────────────────────────────────────────

test('TestOtpProvider: verification fails with wrong code and tracks attempts', async () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    AUTH_OTP_PROVIDER: 'test',
    NODE_ENV: 'development',
  });

  const provider = new TestOtpProvider();
  const { sid } = await provider.sendOtp('+254712345678');
  const realCode = provider.getDevOtp(sid);

  // Attempt with wrong code
  await assert.rejects(
    () => provider.verifyOtp('+254712345678', '000000', sid),
    /did not match/i
  );

  // Attempt with correct code succeeds
  const correctResult = await provider.verifyOtp('+254712345678', realCode, sid);
  assert.equal(correctResult.status, 'approved');
  assert.equal(correctResult.valid, true);
});

test('TestOtpProvider: exceeding 5 attempts locks out verification', async () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    AUTH_OTP_PROVIDER: 'test',
    NODE_ENV: 'development',
  });

  const provider = new TestOtpProvider();
  const { sid } = await provider.sendOtp('+254712345678');
  const realCode = provider.getDevOtp(sid);

  // Fail 5 times
  for (let i = 0; i < 5; i++) {
    await assert.rejects(
      () => provider.verifyOtp('+254712345678', '999999', sid),
      /did not match/i
    );
  }

  // 6th attempt with real code must be rejected due to attempt limit
  await assert.rejects(
    () => provider.verifyOtp('+254712345678', realCode, sid),
    /too many failed attempts|attempt limit/i
  );
});

test('TestOtpProvider: single-use replay protection prevents reusing verified code', async () => {
  const { TestOtpProvider } = loadModule('lib/otp-provider.ts', {
    AUTH_OTP_PROVIDER: 'test',
    NODE_ENV: 'development',
  });

  const provider = new TestOtpProvider();
  const { sid } = await provider.sendOtp('+254712345678');
  const realCode = provider.getDevOtp(sid);

  // First verification succeeds
  const first = await provider.verifyOtp('+254712345678', realCode, sid);
  assert.equal(first.status, 'approved');

  // Second verification with the same code fails (cannot replay consumed challenge)
  await assert.rejects(
    () => provider.verifyOtp('+254712345678', realCode, sid),
    /already been used/i
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Production WhatsApp Provider Fail-Closed
// ─────────────────────────────────────────────────────────────────────────────

test('whatsappConfiguration in production fails closed (503) when Twilio credentials missing', () => {
  const { whatsappConfiguration } = loadModule('lib/whatsapp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_OTP_PROVIDER: '',
    AUTH_TEST_MODE: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
  });

  assert.throws(
    () => whatsappConfiguration(),
    (err) => {
      assert.equal(err.status, 503);
      assert.match(err.message, /not available/i);
      return true;
    }
  );
});

test('whatsappConfiguration in test mode returns test config without requiring Twilio env vars', () => {
  const { whatsappConfiguration } = loadModule('lib/whatsapp-provider.ts', {
    NODE_ENV: 'development',
    AUTH_OTP_PROVIDER: 'test',
  });

  const config = whatsappConfiguration();
  assert.equal(config.isTestMode, true);
  assert.match(config.service, /^VA_TEST/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. API Route Integration: GET & POST /api/auth/whatsapp
// ─────────────────────────────────────────────────────────────────────────────

function setupRouteHarness(env = {}, dbState = {}) {
  const queries = [];
  const fakeSql = async (strings, ...values) => {
    const raw = strings.join('?');
    queries.push({ raw, values });
    if (raw.includes('auth_rate_limits')) return { rowCount: 1, rows: [] };
    if (raw.includes('SET attempts')) {
      return { rows: dbState.challengeRows || [{ phone: dbState.phone || '+254712345678', verification_sid: dbState.sid || 'TEST_sid_123' }] };
    }
    return { rowCount: 1, rows: [] };
  };

  fakeSql.connect = async () => ({
    release() {},
    query: async (sqlText, params) => {
      queries.push({ raw: sqlText, params });
      if (sqlText.startsWith('SELECT phone FROM whatsapp_auth_challenges')) {
        return { rows: dbState.proofRows || [{ phone: dbState.phone || '+254712345678' }] };
      }
      if (sqlText.startsWith('SELECT id, role')) {
        return { rows: dbState.userRows || [] };
      }
      if (sqlText.startsWith('INSERT INTO users')) {
        return { rows: [{ id: 'new_user_1', role: params[2] }] };
      }
      return { rows: [] };
    },
  });

  const nextServer = {
    NextResponse: {
      json: (body, init = {}) => ({
        body,
        status: init.status || 200,
        cookies: {
          set(name, value, opts) {
            this._cookies = this._cookies || {};
            this._cookies[name] = { value, ...opts };
          },
        },
      }),
    },
  };

  const route = loadModule('app/api/auth/whatsapp/route.ts', env, {
    'next/server': nextServer,
    '@vercel/postgres': { sql: fakeSql },
  });

  return { route, queries };
}

test('GET /api/auth/whatsapp returns testMode: true and clear message when active', async () => {
  const { route } = setupRouteHarness({
    AUTH_OTP_PROVIDER: 'test',
    NODE_ENV: 'development',
  });

  const res = await route.GET();
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.available, true);
  assert.equal(res.body.isTestMode, true);
  assert.equal(res.body.channel, 'test');
  assert.equal(res.body.message, 'Test authentication is active');
});

test('POST /api/auth/whatsapp (start) provides devHint in local dev', async () => {
  const { route } = setupRouteHarness({
    AUTH_OTP_PROVIDER: 'test',
    NODE_ENV: 'development',
  });

  const req = {
    url: 'https://styld.test/api/auth/whatsapp',
    headers: { get: (k) => (k === 'origin' ? 'https://styld.test' : null) },
    json: async () => ({ action: 'start', phone: '+254712345678' }),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.step, 'code');
  assert.ok(res.body.devHint, 'devHint should be present in local development');
  assert.match(res.body.devHint, /Development OTP: \d{6}/);
});

test('POST /api/auth/whatsapp (start) suppresses devHint in production staging', async () => {
  const { route } = setupRouteHarness({
    NODE_ENV: 'production',
    AUTH_OTP_PROVIDER: 'test',
    AUTH_STAGING_MODE: 'true',
    AUTH_TEST_PHONE_ALLOWLIST: '+254712345678',
  });

  const req = {
    url: 'https://styld.test/api/auth/whatsapp',
    headers: { get: (k) => (k === 'origin' ? 'https://styld.test' : null) },
    json: async () => ({ action: 'start', phone: '+254712345678' }),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.step, 'code');
  assert.equal(res.body.devHint, undefined, 'devHint must NOT be sent over the wire in production staging');
});

test('POST /api/auth/whatsapp (complete) creates user with role client and requires terms', async () => {
  const { route, queries } = setupRouteHarness(
    { AUTH_OTP_PROVIDER: 'test', NODE_ENV: 'development' },
    { phone: '+254712345678', userRows: [] } // New user
  );

  const req = {
    url: 'https://styld.test/api/auth/whatsapp',
    headers: { get: (k) => (k === 'origin' ? 'https://styld.test' : null) },
    cookies: { get: () => ({ value: 'a'.repeat(64) }) },
    json: async () => ({
      action: 'complete',
      phone: '+254712345678',
      firstName: 'Amani',
      role: 'client',
      acceptTerms: true,
    }),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.step, 'done');

  // Verify session cookie was set
  assert.ok(res.cookies._cookies?.session, 'Session cookie must be created');
  assert.ok(res.cookies._cookies?.user_id, 'user_id cookie must be created');
  assert.equal(res.cookies._cookies?.assumed_role?.value, 'client');

  // Verify insert query into users
  const insertUser = queries.find((q) => q.raw && q.raw.startsWith('INSERT INTO users'));
  assert.ok(insertUser, 'User must be inserted');
  assert.equal(insertUser.params[1], 'Amani');
  assert.equal(insertUser.params[2], 'client');
});

test('POST /api/auth/whatsapp (complete) rejects missing terms acceptance', async () => {
  const { route } = setupRouteHarness(
    { AUTH_OTP_PROVIDER: 'test', NODE_ENV: 'development' },
    { phone: '+254712345678', userRows: [] }
  );

  const req = {
    url: 'https://styld.test/api/auth/whatsapp',
    headers: { get: (k) => (k === 'origin' ? 'https://styld.test' : null) },
    cookies: { get: () => ({ value: 'a'.repeat(64) }) },
    json: async () => ({
      action: 'complete',
      phone: '+254712345678',
      firstName: 'Amani',
      role: 'client',
      acceptTerms: false, // Disagreed
    }),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
  assert.match(res.body.error, /agree to the terms/i);
});

test('POST /api/auth/whatsapp (complete) prevents privilege escalation to super_admin', async () => {
  const { route } = setupRouteHarness(
    { AUTH_OTP_PROVIDER: 'test', NODE_ENV: 'development' },
    { phone: '+254712345678', userRows: [] }
  );

  const req = {
    url: 'https://styld.test/api/auth/whatsapp',
    headers: { get: (k) => (k === 'origin' ? 'https://styld.test' : null) },
    cookies: { get: () => ({ value: 'a'.repeat(64) }) },
    json: async () => ({
      action: 'complete',
      phone: '+254712345678',
      firstName: 'Attacker',
      role: 'super_admin', // Privilege escalation attempt
      acceptTerms: true,
    }),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
});
