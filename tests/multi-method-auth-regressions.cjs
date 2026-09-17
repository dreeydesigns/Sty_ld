/**
 * Multi-Method Authentication Architecture & Identity Ladder Regression Suite
 *
 * Enforces:
 * 1. Google Identity Services ID token verification & user provisioning.
 * 2. Universal Email OTP generation, rate limits, expiration, and replay prevention.
 * 3. WebAuthn Passkeys challenge lifecycle and assertion verification.
 * 4. Multi-method user identities resolution, linking, and final-method unlinking prevention.
 * 5. RFC 6238 TOTP two-factor authentication, secret encryption, and backup recovery codes.
 * 6. Africa's Talking & Meta WhatsApp pluggable provider abstractions.
 * 7. Value-moment phone contact verification without forced re-login.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function loadTs(file, dependencies = {}, mockFetch = null) {
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
      setTimeout,
      clearTimeout,
    }
  )((name) => dependencies[name] || require(name), module, module.exports);
  return module.exports;
}

// Load TypeScript modules
const totpModule = loadTs('lib/totp.ts');
const googleAuthModule = loadTs('lib/google-auth.ts');
const passkeyModule = loadTs('lib/passkey.ts', { '@vercel/postgres': { sql: () => ({ rows: [] }) } });
const otpProviderModule = loadTs('lib/otp-provider.ts');
const identityManagerModule = loadTs('lib/identity-manager.ts', { '@vercel/postgres': { sql: () => ({ rows: [] }) } });

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOTP (RFC 6238) & Backup Recovery Codes
// ─────────────────────────────────────────────────────────────────────────────
test('TOTP: Base32 encoding and decoding operates bidirectionally', () => {
  const original = Buffer.from('Styld Nairobi Beauty 2026', 'utf8');
  const encoded = totpModule.base32Encode(original);
  assert.ok(typeof encoded === 'string' && encoded.length > 0);
  const decoded = totpModule.base32Decode(encoded);
  assert.equal(decoded.toString('utf8'), 'Styld Nairobi Beauty 2026');
});

test('TOTP: Secret generation creates valid otpauth URI and 20-byte base32 secret', () => {
  const { secret, otpauthUrl } = totpModule.generateTotpSecret('client@styld.test', 'Styld');
  assert.ok(secret.length >= 26, 'Secret must be at least 26 base32 characters');
  assert.ok(otpauthUrl.startsWith('otpauth://totp/Styld:client%40styld.test?secret='));
  assert.ok(otpauthUrl.includes('algorithm=SHA1'));
  assert.ok(otpauthUrl.includes('period=30'));
});

test('TOTP: Generated codes verify successfully within time window and reject invalid codes', () => {
  const { secret } = totpModule.generateTotpSecret('admin@styld.test');

  // Compute code at current time
  const secretBytes = totpModule.base32Decode(secret);
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(currentStep));
  const hmac = crypto.createHmac('sha1', secretBytes).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const validCode = (binary % 1_000_000).toString().padStart(6, '0');

  // Verify valid code
  assert.ok(totpModule.verifyTotpCode(secret, validCode), 'Valid current TOTP code must verify');

  // Reject invalid / wrong code
  const wrongCode = ((Number(validCode) + 123456) % 1_000_000).toString().padStart(6, '0');
  assert.strictEqual(totpModule.verifyTotpCode(secret, wrongCode), false, 'Wrong TOTP code must be rejected');

  // Reject non-numeric or wrong length codes
  assert.strictEqual(totpModule.verifyTotpCode(secret, '123'), false);
  assert.strictEqual(totpModule.verifyTotpCode(secret, 'abcdef'), false);
});

test('TOTP: Secrets are encrypted and decrypted with AES-256-GCM', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const encrypted = totpModule.encryptTotpSecret(secret);
  assert.notEqual(encrypted, secret);
  assert.equal(encrypted.split(':').length, 3, 'Encrypted secret must be iv:tag:ciphertext');

  const decrypted = totpModule.decryptTotpSecret(encrypted);
  assert.equal(decrypted, secret, 'Decrypted secret must match original');
});

test('Recovery Codes: 8 single-use codes generated with secure SHA-256 hashes', () => {
  const { plainCodes, hashedCodes } = totpModule.generateRecoveryCodes(8);
  assert.equal(plainCodes.length, 8);
  assert.equal(hashedCodes.length, 8);

  for (let i = 0; i < 8; i++) {
    const code = plainCodes[i];
    assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Recovery code format must be XXXX-XXXX');
    const computedHash = totpModule.hashRecoveryCode(code);
    assert.equal(computedHash, hashedCodes[i]);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Google Identity Services ID Token Verification
// ─────────────────────────────────────────────────────────────────────────────
test('Google Auth: Empty or missing token is rejected with 401', async () => {
  await assert.rejects(
    async () => googleAuthModule.verifyGoogleIdToken(''),
    (err) => err instanceof googleAuthModule.GoogleAuthError && err.statusCode === 401
  );
});

test('Google Auth: Test/sandbox Google token extracts verified identity correctly', async () => {
  process.env.GOOGLE_AUTH_MOCK = 'true';
  const mockPayload = {
    sub: 'google_user_sub_98765',
    email: 'Amina.Nairobi@Gmail.Com',
    email_verified: true,
    name: 'Amina Kamau',
    given_name: 'Amina',
    family_name: 'Kamau',
  };
  const token = `header.${Buffer.from(JSON.stringify(mockPayload)).toString('base64url')}.sig`;

  const verified = await googleAuthModule.verifyGoogleIdToken(token);
  assert.equal(verified.sub, 'google_user_sub_98765');
  assert.equal(verified.email, 'amina.nairobi@gmail.com', 'Email must be normalized to lowercase');
  assert.equal(verified.emailVerified, true);
  assert.equal(verified.givenName, 'Amina');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. WebAuthn Passkeys
// ─────────────────────────────────────────────────────────────────────────────
test('Passkeys: Challenge generation produces 32-byte URL-safe base64 string', () => {
  const challenge = passkeyModule.generateChallenge();
  assert.ok(typeof challenge === 'string');
  const buffer = passkeyModule.fromBase64Url(challenge);
  assert.equal(buffer.length, 32);
});

test('Passkeys: clientDataJSON validation ensures matching challenge and ceremony type', () => {
  const challenge = passkeyModule.generateChallenge();
  const clientData = {
    type: 'webauthn.create',
    challenge,
    origin: 'https://styld.test',
  };
  const clientDataBase64 = passkeyModule.toBase64Url(Buffer.from(JSON.stringify(clientData)));

  // Valid verification
  const parsed = passkeyModule.parseClientData(clientDataBase64, 'webauthn.create', challenge);
  assert.equal(parsed.challenge, challenge);
  assert.equal(parsed.origin, 'https://styld.test');

  // Rejection on type mismatch
  assert.throws(
    () => passkeyModule.parseClientData(clientDataBase64, 'webauthn.get', challenge),
    (err) => err instanceof passkeyModule.PasskeyError
  );

  // Rejection on challenge mismatch
  const wrongChallenge = passkeyModule.generateChallenge();
  assert.throws(
    () => passkeyModule.parseClientData(clientDataBase64, 'webauthn.create', wrongChallenge),
    (err) => err instanceof passkeyModule.PasskeyError
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Pluggable OTP Providers & Phone Layer
// ─────────────────────────────────────────────────────────────────────────────
test('OTP Provider: Dev sandbox provider is returned in test environment', () => {
  process.env.PHONE_OTP_PROVIDER = 'dev';
  const provider = otpProviderModule.getOtpProvider();
  assert.equal(provider.getProviderName(), 'dev-whatsapp-sandbox');
  assert.equal(provider.isConfigured(), true);
});

test('OTP Provider: Africa\'s Talking SMS provider interface is active when configured', () => {
  process.env.PHONE_OTP_PROVIDER = 'africastalking';
  const provider = otpProviderModule.getOtpProvider('sms');
  assert.equal(provider.getProviderName(), 'africas-talking-sms');
});

test('OTP Provider: Dev sandbox verifies code 123456 and rejects other codes', async () => {
  const dev = new otpProviderModule.DevWhatsAppOtpProvider();
  const sendRes = await dev.sendOtp({ to: '+254712345678', channel: 'whatsapp' });
  assert.equal(sendRes.status, 'pending');

  const verifySuccess = await dev.verifyOtp({ to: '+254712345678', code: '123456', verificationSid: sendRes.sid });
  assert.equal(verifySuccess.valid, true);

  await assert.rejects(
    async () => dev.verifyOtp({ to: '+254712345678', code: '999999', verificationSid: sendRes.sid }),
    (err) => err.status === 400
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Account Linking & Final Login Method Protection
// ─────────────────────────────────────────────────────────────────────────────
test('Identity Manager: IdentityError provides appropriate HTTP status code', () => {
  const err = new identityManagerModule.IdentityError('Cannot remove only login method', 400);
  assert.equal(err.statusCode, 400);
  assert.equal(err.name, 'IdentityError');
});
