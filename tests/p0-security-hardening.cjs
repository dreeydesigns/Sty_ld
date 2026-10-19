/**
 * P0 Security Hardening Regression Suite.
 *
 * Enforces:
 * 1. POST /api/init is decommissioned: always 410 Gone, never runs
 *    initializeDatabase or runMigrations, regardless of environment or
 *    supplied headers (including a matching x-cron-secret).
 * 2. Production builds (NODE_ENV=production, including Vercel previews) never
 *    activate test authentication, never expose dev OTP hints, and never
 *    select fixed-code providers.
 * 3. Non-production builds keep local test and dev providers available.
 * 4. The legitimate production path (Twilio Verify) remains intact.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const SENSITIVE_ENV_PATTERN =
  /^(AUTH_|WHATSAPP_|PHONE_OTP_|DEV_OTP_|STYLD_|APP_ENV|TWILIO_|META_|AFRICASTALKING_|CRON_SECRET)/;

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

  const inheritedEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!SENSITIVE_ENV_PATTERN.test(key)) inheritedEnv[key] = value;
  }

  const sandbox = {
    console,
    process: {
      ...process,
      env: { ...inheritedEnv, ...customEnv },
    },
    Buffer,
    URL,
    URLSearchParams,
    AbortSignal,
    fetch: () => {
      throw new Error('Network access is disabled in this test suite');
    },
  };

  const moduleObj = { exports: {} };
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

function assertRefusedWithStatus(error, expectedStatus) {
  assert.equal(error.status, expectedStatus);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. /api/init Decommissioning
// ─────────────────────────────────────────────────────────────────────────────

test('POST /api/init always responds 410 and never runs database initialization or migrations', async () => {
  let initializeCalls = 0;
  let migrationCalls = 0;

  const route = loadModule(
    'app/api/init/route.ts',
    { CRON_SECRET: 'matching-secret-value' },
    {
      'next/server': {
        NextResponse: {
          json: (body, init = {}) => ({ body, status: init.status || 200 }),
        },
      },
      '@/lib/db': {
        initializeDatabase: async () => {
          initializeCalls += 1;
        },
      },
      '@/lib/migrations': {
        runMigrations: async () => {
          migrationCalls += 1;
          return { applied: [] };
        },
      },
    }
  );

  const matchingSecretRequest = {
    headers: {
      get: (name) => (name === 'x-cron-secret' ? 'matching-secret-value' : null),
    },
  };
  const withSecret = await route.POST(matchingSecretRequest);
  assert.equal(withSecret.status, 410);
  assert.equal(withSecret.body.ok, false);

  const noSecretRequest = { headers: { get: () => null } };
  const withoutSecret = await route.POST(noSecretRequest);
  assert.equal(withoutSecret.status, 410);
  assert.equal(withoutSecret.body.ok, false);

  assert.equal(initializeCalls, 0, 'initializeDatabase must never be called by /api/init');
  assert.equal(migrationCalls, 0, 'runMigrations must never be called by /api/init');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Production OTP Hardening
// ─────────────────────────────────────────────────────────────────────────────

test('Production build never activates test OTP mode, even with staging markers and allowlist', () => {
  const mod = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_TEST_MODE: 'true',
    AUTH_OTP_PROVIDER: 'test',
    AUTH_STAGING_MODE: 'true',
    STYLD_ENV: 'staging',
    APP_ENV: 'staging',
    AUTH_TEST_PHONE_ALLOWLIST: '+254712345678',
    WHATSAPP_AUTH_ENABLED: 'true',
  });

  assert.equal(mod.isTestOtpModeActive(), false);
  assert.equal(mod.isStagingTestModeAllowed(), true, 'staging markers present, but must be inert on production');
  assert.throws(
    () => new mod.TestOtpProvider(),
    (err) => assertRefusedWithStatus(err, 403)
  );
  assert.notEqual(mod.getOtpProvider().getProviderName(), 'test-otp-provider');
});

test('Test mode flag semantics: the string "false" always deactivates test auth', () => {
  const prodStringFalse = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_TEST_MODE: 'false',
  });
  assert.equal(prodStringFalse.isTestOtpModeActive(), false);

  const devStringFalse = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'development',
    AUTH_OTP_PROVIDER: 'test',
    AUTH_TEST_MODE: 'false',
  });
  assert.equal(devStringFalse.isTestOtpModeActive(), false);
});

test('Production build never exposes dev OTP hints, even with DEV_OTP_EXPOSE_IN_RESPONSE', () => {
  const mod = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    DEV_OTP_EXPOSE_IN_RESPONSE: 'true',
  });

  assert.equal(mod.getDevOtpHint('TEST_00000000000000000000000000000000'), undefined);
  assert.equal(mod.getDevOtp('TEST_00000000000000000000000000000000'), undefined);
});

test('Production build refuses WHATSAPP_DEV_MODE and the dev provider selection', () => {
  const devMode = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    WHATSAPP_DEV_MODE: 'true',
  });
  assert.equal(devMode.isWhatsAppDevMode(), false);
  assert.notEqual(devMode.getOtpProvider().getProviderName(), 'dev-whatsapp-sandbox');

  const devSelection = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    PHONE_OTP_PROVIDER: 'dev',
  });
  assert.throws(
    () => devSelection.getOtpProvider(),
    (err) => assertRefusedWithStatus(err, 503)
  );
  assert.throws(
    () => new devSelection.DevWhatsAppOtpProvider(),
    (err) => assertRefusedWithStatus(err, 403)
  );
});

test('Production build refuses fixed-code provider selections (meta, africastalking)', () => {
  const metaSelection = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    PHONE_OTP_PROVIDER: 'meta',
  });
  assert.throws(
    () => metaSelection.getOtpProvider(),
    (err) => assertRefusedWithStatus(err, 503)
  );

  const africasTalkingSelection = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    PHONE_OTP_PROVIDER: 'africastalking',
  });
  assert.throws(
    () => africasTalkingSelection.getOtpProvider('sms'),
    (err) => assertRefusedWithStatus(err, 503)
  );
  assert.throws(
    () => africasTalkingSelection.getOtpProvider('whatsapp'),
    (err) => assertRefusedWithStatus(err, 503)
  );
});

test('Production build preserves the legitimate Twilio Verify path', () => {
  const mod = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_OTP_PROVIDER: 'twilio',
    WHATSAPP_AUTH_ENABLED: 'true',
    TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32),
    TWILIO_API_KEY_SID: 'SK' + 'b'.repeat(32),
    TWILIO_API_KEY_SECRET: 'secret',
    TWILIO_VERIFY_SERVICE_SID: 'VA' + 'c'.repeat(32),
  });

  const provider = mod.getOtpProvider();
  assert.equal(provider.getProviderName(), 'twilio-verify-whatsapp');
  assert.equal(provider.isConfigured(), true);
});

test('whatsappConfiguration on production builds ignores staging markers and fails closed without credentials', () => {
  const mod = loadModule('lib/whatsapp-provider.ts', {
    NODE_ENV: 'production',
    AUTH_TEST_MODE: 'true',
    AUTH_STAGING_MODE: 'true',
    AUTH_TEST_PHONE_ALLOWLIST: '+254712345678',
  });

  assert.throws(
    () => mod.whatsappConfiguration(),
    (err) => assertRefusedWithStatus(err, 503)
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Non-Production Preservation
// ─────────────────────────────────────────────────────────────────────────────

test('Non-production builds keep local test and dev providers available', async () => {
  const testMode = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'development',
    AUTH_OTP_PROVIDER: 'test',
  });
  assert.equal(testMode.isTestOtpModeActive(), true);

  const provider = new testMode.TestOtpProvider();
  const sent = await provider.sendOtp('+254712345678');
  assert.equal(sent.status, 'pending');
  const hint = testMode.getDevOtpHint(sent.sid);
  assert.match(hint, /^Development OTP: \d{6}$/);

  const devMode = loadModule('lib/otp-provider.ts', {
    NODE_ENV: 'development',
    AUTH_TEST_MODE: 'false',
    WHATSAPP_DEV_MODE: 'true',
  });
  assert.equal(devMode.isWhatsAppDevMode(), true);
  assert.equal(devMode.getOtpProvider().getProviderName(), 'dev-whatsapp-sandbox');
});
