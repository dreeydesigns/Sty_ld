/**
 * Twilio Verify WhatsApp OTP Provider and Endpoint Tests.
 *
 * Exercises the OtpProvider interface, TwilioVerifyWhatsAppProvider,
 * DevWhatsAppOtpProvider, E.164 phone normalization, and WhatsApp API route.
 * 100% mocked network calls — no live Twilio requests or SMS/WhatsApp costs.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies = {}, mockFetch = null) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const sandboxFetch = mockFetch || globalThis.fetch;
  vm.runInNewContext(
    `(function(require, module, exports) { ${source}\n})`,
    {
      console,
      process,
      Buffer,
      URL,
      URLSearchParams,
      AbortSignal,
      fetch: sandboxFetch,
    }
  )(
    (name) => dependencies[name] || require(name),
    module,
    module.exports
  );
  return module.exports;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Phone Normalization & E.164 Validation
// ─────────────────────────────────────────────────────────────────────────────

test('Kenya phone normalization: 07xx, 01xx, bare digits, and +254', () => {
  const { parsePhoneNumber, isValidE164Broad } = load('lib/phone-utils.ts');

  // 07xx format (standard Safaricom/Airtel)
  const p1 = parsePhoneNumber('0743817931');
  assert.equal(p1.isValid, true);
  assert.equal(p1.fullE164, '+254743817931');
  assert.equal(p1.country.code, '254');

  // 01xx format (newer Safaricom 011x / Airtel 010x)
  const p2 = parsePhoneNumber('0112345678');
  assert.equal(p2.isValid, true);
  assert.equal(p2.fullE164, '+254112345678');

  // Bare local digits without leading 0
  const p3 = parsePhoneNumber('743817931');
  assert.equal(p3.isValid, true);
  assert.equal(p3.fullE164, '+254743817931');

  // Already formatted with +254
  const p4 = parsePhoneNumber('+254 743 817 931');
  assert.equal(p4.isValid, true);
  assert.equal(p4.fullE164, '+254743817931');

  // Broad validator requires leading +
  assert.equal(isValidE164Broad('+254743817931'), true);
  assert.equal(isValidE164Broad('0743817931'), false);
});

test('International phone numbers starting with + are never rewritten to Kenya', () => {
  const { parsePhoneNumber } = load('lib/phone-utils.ts');

  // US/Canada number
  const us = parsePhoneNumber('+1 (501) 712-2661');
  assert.equal(us.isValid, true);
  assert.equal(us.fullE164, '+15017122661');
  assert.equal(us.country.prefix, '+1');

  // UK number
  const uk = parsePhoneNumber('+44 7911 123456');
  assert.equal(uk.isValid, true);
  assert.equal(uk.fullE164, '+447911123456');

  // Germany number (generic international not in pre-seeded 13 countries)
  const de = parsePhoneNumber('+49 151 12345678');
  assert.equal(de.isValid, true);
  assert.equal(de.fullE164, '+4915112345678');
  assert.equal(de.fullE164.startsWith('+254'), false, 'Should not rewrite German number to Kenya');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DevWhatsAppOtpProvider (Sandbox Mode)
// ─────────────────────────────────────────────────────────────────────────────

test('DevWhatsAppOtpProvider: sends mock challenge and validates sandbox code 123456', async () => {
  const { DevWhatsAppOtpProvider } = load('lib/otp-provider.ts');
  const provider = new DevWhatsAppOtpProvider();

  assert.equal(provider.isConfigured(), true);
  assert.equal(provider.getProviderName(), 'dev-whatsapp-sandbox');

  // Send OTP
  const sent = await provider.sendOtp({ to: '+254743817931', channel: 'whatsapp' });
  assert.equal(sent.to, '+254743817931');
  assert.equal(sent.status, 'pending');
  assert.equal(sent.channel, 'whatsapp');
  assert.ok(sent.sid.startsWith('VE'));

  // Verify valid code 123456
  const verified = await provider.verifyOtp({ to: '+254743817931', code: '123456', verificationSid: sent.sid });
  assert.equal(verified.status, 'approved');
  assert.equal(verified.valid, true);
  assert.equal(verified.to, '+254743817931');

  // Reject invalid code 999999
  await assert.rejects(
    async () => provider.verifyOtp({ to: '+254743817931', code: '999999', verificationSid: sent.sid }),
    (err) => err.status === 400 && err.message.includes('123456')
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TwilioVerifyWhatsAppProvider (Network & API Protocol)
// ─────────────────────────────────────────────────────────────────────────────

test('TwilioVerifyWhatsAppProvider: enforces configuration and credentials', async () => {
  const { TwilioVerifyWhatsAppProvider } = load('lib/otp-provider.ts');

  // Missing credentials
  const unconfigured = new TwilioVerifyWhatsAppProvider({
    accountSid: '',
    authToken: '',
    verifyServiceSid: '',
    authEnabled: false,
  });
  assert.equal(unconfigured.isConfigured(), false);
  await assert.rejects(
    async () => unconfigured.sendOtp({ to: '+254743817931' }),
    (err) => err.status === 503 && err.message.includes('not available yet')
  );

  // Invalid SID formats
  const invalidSids = new TwilioVerifyWhatsAppProvider({
    accountSid: 'invalid_sid',
    authToken: 'token',
    verifyServiceSid: 'invalid_service',
    authEnabled: true,
  });
  assert.equal(invalidSids.isConfigured(), false);
  await assert.rejects(
    async () => invalidSids.sendOtp({ to: '+254743817931' }),
    (err) => err.status === 503 && err.message.includes('temporarily unavailable')
  );
});

test('TwilioVerifyWhatsAppProvider.sendOtp: sends correct HTTP request to Twilio Verify v2', async () => {
  let capturedUrl = '';
  let capturedHeaders = {};
  let capturedBody = '';

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    capturedBody = options.body.toString();
    return {
      ok: true,
      status: 201,
      json: async () => ({
        sid: 'VE11112222333344445555666677778888',
        service_sid: 'VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        account_sid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        to: '+254743817931',
        channel: 'whatsapp',
        status: 'pending',
        valid: false,
      }),
    };
  };

  const { TwilioVerifyWhatsAppProvider } = load('lib/otp-provider.ts', {}, mockFetch);
  const provider = new TwilioVerifyWhatsAppProvider({
    accountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    authToken: 'secret_auth_token',
    verifyServiceSid: 'VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    authEnabled: true,
  });

  assert.equal(provider.isConfigured(), true);
  const result = await provider.sendOtp({ to: '+254743817931', channel: 'whatsapp' });

  // Verify URL and path
  assert.equal(capturedUrl, 'https://verify.twilio.com/v2/Services/VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Verifications');

  // Verify Basic Auth header
  const expectedAuth = 'Basic ' + Buffer.from('ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:secret_auth_token').toString('base64');
  assert.equal(capturedHeaders['Authorization'], expectedAuth);
  assert.equal(capturedHeaders['Content-Type'], 'application/x-www-form-urlencoded');

  // Verify POST body: To and Channel=whatsapp (Meta approved authentication template)
  const params = new URLSearchParams(capturedBody);
  assert.equal(params.get('To'), '+254743817931');
  assert.equal(params.get('Channel'), 'whatsapp');

  // Verify result
  assert.equal(result.sid, 'VE11112222333344445555666677778888');
  assert.equal(result.to, '+254743817931');
  assert.equal(result.status, 'pending');
  assert.equal(result.channel, 'whatsapp');
});

test('TwilioVerifyWhatsAppProvider.verifyOtp: sends To and Code to VerificationCheck', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedBody = options.body.toString();
    return {
      ok: true,
      status: 200,
      json: async () => ({
        sid: 'VEcheck999999999999999999999999999',
        service_sid: 'VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        account_sid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        to: '+254743817931',
        channel: 'whatsapp',
        status: 'approved',
        valid: true,
      }),
    };
  };

  const { TwilioVerifyWhatsAppProvider } = load('lib/otp-provider.ts', {}, mockFetch);
  const provider = new TwilioVerifyWhatsAppProvider({
    accountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    authToken: 'secret_auth_token',
    verifyServiceSid: 'VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    authEnabled: true,
  });

  const result = await provider.verifyOtp({
    to: '+254743817931',
    code: '123456',
    verificationSid: 'VE11112222333344445555666677778888',
  });

  assert.equal(capturedUrl, 'https://verify.twilio.com/v2/Services/VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/VerificationCheck');

  const params = new URLSearchParams(capturedBody);
  assert.equal(params.get('To'), '+254743817931');
  assert.equal(params.get('Code'), '123456');
  assert.equal(params.get('VerificationSid'), 'VE11112222333344445555666677778888');

  assert.equal(result.status, 'approved');
  assert.equal(result.valid, true);
  assert.equal(result.to, '+254743817931');
});

test('TwilioVerifyWhatsAppProvider: handles Twilio 429 rate limit gracefully', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ code: 20429, message: 'Too Many Requests' }),
  });

  const { TwilioVerifyWhatsAppProvider } = load('lib/otp-provider.ts', {}, mockFetch);
  const provider = new TwilioVerifyWhatsAppProvider({
    accountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    authToken: 'secret_auth_token',
    verifyServiceSid: 'VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    authEnabled: true,
  });

  await assert.rejects(
    async () => provider.sendOtp({ to: '+254743817931' }),
    (err) => err.status === 429 && err.message.includes('Too many attempts')
  );
});

test('TwilioVerifyWhatsAppProvider: prefers API Key credentials over Auth Token when provided', async () => {
  let capturedHeaders = {};

  const mockFetch = async (url, options) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 201,
      json: async () => ({
        sid: 'VE11112222333344445555666677778888',
        to: '+254743817931',
        channel: 'whatsapp',
        status: 'pending',
      }),
    };
  };

  const { TwilioVerifyWhatsAppProvider } = load('lib/otp-provider.ts', {}, mockFetch);
  const provider = new TwilioVerifyWhatsAppProvider({
    accountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    apiKeySid: 'SK11111111111111111111111111111111',
    apiKeySecret: 'my_api_key_secret',
    authToken: 'fallback_master_token',
    verifyServiceSid: 'VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    authEnabled: true,
  });

  assert.equal(provider.isConfigured(), true);
  await provider.sendOtp({ to: '+254743817931' });

  // Verify that SK... credentials were used for Basic auth, not the master token
  const expectedApiKeyAuth = 'Basic ' + Buffer.from('SK11111111111111111111111111111111:my_api_key_secret').toString('base64');
  assert.equal(capturedHeaders['Authorization'], expectedApiKeyAuth);
});

test('TwilioVerifyWhatsAppProvider: rejects if Verify Service SID is wrongly an API Key (SK instead of VA)', async () => {
  const { TwilioVerifyWhatsAppProvider } = load('lib/otp-provider.ts');

  // Passing an SK... SID as the Verify Service SID should be rejected
  const mismatchedService = new TwilioVerifyWhatsAppProvider({
    accountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    apiKeySid: 'SK11111111111111111111111111111111',
    apiKeySecret: 'my_api_key_secret',
    verifyServiceSid: 'SK00000000000000000000000000000000', // Invalid: SK is an API Key, not a VA Verify Service
    authEnabled: true,
  });

  assert.equal(mismatchedService.isConfigured(), false);
  await assert.rejects(
    async () => mismatchedService.sendOtp({ to: '+254743817931' }),
    (err) => err.status === 503 && err.message.includes('temporarily unavailable')
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/auth/whatsapp Provider Status Endpoint
// ─────────────────────────────────────────────────────────────────────────────

test('GET /api/auth/whatsapp reports availability without throwing 500 error', async () => {
  const next = {
    NextResponse: {
      json: (body, options = {}) => ({
        body,
        status: options.status || 200,
      }),
    },
  };

  // Test when unconfigured
  const unconfiguredRoute = load('app/api/auth/whatsapp/route.ts', {
    'next/server': next,
    '@vercel/postgres': { sql: async () => ({ rows: [] }) },
    '@/lib/whatsapp-provider': {
      AuthFlowError: class extends Error { constructor(m, s = 400) { super(m); this.status = s; } },
      whatsappConfiguration() {
        const err = new Error('WhatsApp sign-in is not available yet.');
        err.status = 503;
        throw err;
      },
    },
  });

  const unconfiguredRes = await unconfiguredRoute.GET();
  assert.equal(unconfiguredRes.status, 200);
  assert.equal(unconfiguredRes.body.available, false);
  assert.equal(unconfiguredRes.body.channel, 'whatsapp');

  // Test when dev sandbox mode is active
  const devRoute = load('app/api/auth/whatsapp/route.ts', {
    'next/server': next,
    '@vercel/postgres': { sql: async () => ({ rows: [] }) },
    '@/lib/whatsapp-provider': {
      AuthFlowError: class extends Error { constructor(m, s = 400) { super(m); this.status = s; } },
      whatsappConfiguration() {
        return { account: 'AC000', secret: 'dev', service: 'VA000', isDev: true };
      },
    },
  });

  const devRes = await devRoute.GET();
  assert.equal(devRes.status, 200);
  assert.equal(devRes.body.available, true);
  assert.equal(devRes.body.devMode, true);
});
