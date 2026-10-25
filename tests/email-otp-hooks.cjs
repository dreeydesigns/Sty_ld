const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function hooks({ limits = [], delivery = { ok: false, reasonCode: 'RESEND_TEST_RECIPIENT_RESTRICTED' } } = {}) {
  const calls = [], events = [], sent = [];
  class APIError extends Error { constructor(status, body) { super(body.message); this.status = status; this.body = body; } }
  const deps = {
    'better-auth': { betterAuth: value => value, APIError },
    'better-auth/plugins': { emailOTP: value => value },
    'better-auth/api': { createAuthMiddleware: value => value },
    './auth-database': { authPool: { query: () => { throw new Error('No database access in transport tests'); } } },
    './email-provider': { sendEmail: async payload => { sent.push(payload); return delivery; } },
    './email-reason': { userMessageForReasonCode: () => 'We could not deliver your code. Please try again later.' },
    './security-events': { consumeLimit: async (...args) => { calls.push(args); return limits.length ? limits.shift() : true; }, securityEvent: async (...args) => events.push(args) },
    './auth-policy': {},
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/better-auth.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}})`, { process: { env: {} } })(name => deps[name], module, module.exports);
  return { config: module.exports.auth, calls, events, sent };
}

test('actual OTP hook propagates rejection and records failure, never successful delivery', async () => {
  const h = hooks();
  await assert.rejects(h.config.plugins[1].sendVerificationOTP({ email: 'client@example.test', otp: 'synthetic-code', type: 'sign-in' }), error => error.status === 'SERVICE_UNAVAILABLE' && error.body.code === 'RESEND_TEST_RECIPIENT_RESTRICTED');
  assert.equal(h.sent.length, 1);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0][0], 'otp_delivery_failed');
  assert.doesNotMatch(JSON.stringify(h.events), /synthetic-code|client@/);
  assert.deepEqual(h.calls.map(call => call.slice(1)), [[3, 600], [90, 86400], [2700, 2678400]]);
});

test('actual OTP cooldown normalizes email and blocks before transport', async () => {
  const h = hooks({ limits: [false] });
  await assert.rejects(h.config.hooks.before({ path: '/email-otp/send-verification-otp', body: { email: ' Client@Example.Test ' } }), error => error.status === 'TOO_MANY_REQUESTS');
  assert.deepEqual(h.calls[0], ['email:cooldown:client@example.test', 1, 30]);
  assert.equal(h.sent.length, 0);
});

test('per-address, daily and monthly quota rejection prevents delivery and success events', async () => {
  for (const limits of [[false], [true, false], [true, true, false]]) {
    const h = hooks({ limits });
    await assert.rejects(h.config.plugins[1].sendVerificationOTP({ email: 'client@example.test', otp: 'synthetic-code', type: 'sign-in' }), error => error.status === 'TOO_MANY_REQUESTS');
    assert.equal(h.sent.length, 0); assert.equal(h.events.length, 0);
  }
});

test('awaited delivery, hashing, expiry, attempts and database rate limits remain enabled', async () => {
  const h = hooks({ delivery: { ok: true } });
  const otp = h.config.plugins[1];
  assert.equal(otp.storeOTP, 'hashed'); assert.equal(otp.otpLength, 6);
  assert.equal(otp.expiresIn, 600); assert.equal(otp.allowedAttempts, 5);
  assert.equal(h.config.rateLimit.enabled, true); assert.equal(h.config.rateLimit.storage, 'database');
  await assert.rejects(h.config.plugins[0].init().context.runInBackgroundOrAwait(Promise.reject(new Error('delivery failed'))), /delivery failed/);
  await otp.sendVerificationOTP({ email: 'client@example.test', otp: 'synthetic-code', type: 'sign-in' });
  assert.equal(h.events[0][0], 'otp_sent');
});
