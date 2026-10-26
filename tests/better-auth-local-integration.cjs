const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
function load(file, deps, env = {}) {
  const module = { exports: {} }, code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}})`, { process: { env }, Date, Headers, console })(name => name in deps ? deps[name] : require(name), module, module.exports);
  return module.exports;
}
test('real Better Auth OTP handler persists local verification, sessions and Client workspaces without email or Neon', async t => {
  const { betterAuth, APIError } = await import('better-auth');
  const { emailOTP } = await import('better-auth/plugins');
  const db = new PGlite(); let delivered;
  const syntheticSecret = 'local-only-disposable-test-secret-with-no-remote-access';
  try {
    await db.exec(fs.readFileSync('tests/fixtures/review-schema.sql', 'utf8'));
    const query = async (sql, params) => { const r = await db.query(sql, params); return { ...r, rowCount: r.affectedRows ?? r.rows.length }; };
    const pool = { query, async connect() { return { query, release() {} }; }, async end() {} };
    const security = load('lib/security-events.ts', { './auth-database': { authPool: pool } }, { BETTER_AUTH_SECRET: syntheticSecret });
    const reason = load('lib/email-reason.ts', {});
    const config = load('lib/better-auth.ts', {
      'better-auth': { APIError, betterAuth: config => config }, 'better-auth/plugins': { emailOTP: config => config },
      'better-auth/api': { createAuthMiddleware: fn => fn }, './auth-database': { authPool: pool },
      './email-provider': { sendEmail: async payload => { delivered = payload; return { ok: true }; } }, './email-reason': reason,
      './security-events': security, './auth-policy': load('lib/auth-policy.ts', {}),
    }, { BETTER_AUTH_SECRET: syntheticSecret, BETTER_AUTH_URL: 'http://localhost:3107', NODE_ENV: 'test' }).auth;
    const { createAuthMiddleware } = await import('better-auth/api');
    config.hooks.before = createAuthMiddleware(config.hooks.before);
    config.plugins[1] = emailOTP(config.plugins[1]);
    const auth = betterAuth(config);
    const request = (path, body, cookie) => auth.handler(new Request('http://localhost:3107/api/auth/' + path, { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost:3107', ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    const email = 'client-one@example.test';
    const sent = await request('email-otp/send-verification-otp', { email, type: 'sign-in' });
    assert.equal(sent.status, 200, 'real OTP request accepted against disposable local schema');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 0, 'interrupted send creates no user');
    const generated = delivered.text.match(/^([0-9]{6}) /)?.[1]; assert.ok(generated, 'real library generated a six-digit code');
    assert.equal(delivered.to, email);
    const wrong = generated === '000000' ? '000001' : '000000';
    assert.equal((await request('sign-in/email-otp', { email, otp: wrong })).status, 400);
    const signed = await request('sign-in/email-otp', { email, otp: generated });
    assert.equal(signed.status, 200);
    const cookie = (signed.headers.getSetCookie?.() ?? [signed.headers.get('set-cookie')]).filter(Boolean).map(value => value.split(';')[0]).join('; ');
    assert.ok(cookie.includes('session='), 'session cookie present');
    assert.ok(/HttpOnly/i.test(signed.headers.get('set-cookie')), 'session cookie HttpOnly');
    const session = await request('get-session', null, cookie); assert.equal(session.status, 200); assert.ok((await session.json()).user.id);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM identity_workspaces WHERE role='client' AND status='active'")).rows[0].n, 1);
    assert.equal((await request('sign-in/email-otp', { email, otp: generated })).status, 400, 'consumed OTP cannot be replayed');
    assert.equal((await request('email-otp/send-verification-otp', { email: email.toUpperCase(), type: 'sign-in' })).status, 429, 'normalization shares cooldown');
    assert.ok(await (await request('get-session')).text() === 'null', 'other tab without cookie has no invented session');
    assert.equal((await request('sign-in/email-otp', { email, otp: wrong })).status, 429, 'library path limiter remains active at its boundary');
    // Advance only disposable SQL rate-window fixtures between independent cases.
    // The actual library limiter and application quotas remain enabled.
    const nextWindow = () => db.query('UPDATE auth_limits SET "lastRequest"=0');
    await t.test('independent signup creates a second private Client workspace and a distinct session', async () => {
      await nextWindow();
      const other = 'client-two@example.test';
      assert.equal((await request('email-otp/send-verification-otp', { email: other, type: 'sign-in' })).status, 200);
      const code = delivered.text.match(/^([0-9]{6}) /)[1];
      const response = await request('sign-in/email-otp', { email: other, otp: code }); assert.equal(response.status, 200);
      const counts = await db.query("SELECT count(DISTINCT user_id)::int AS n FROM identity_workspaces WHERE role='client'");
      assert.equal(counts.rows[0].n, 2);
      assert.ok(!response.headers.get('set-cookie').includes(cookie.split(';')[0]), 'independent identity has a distinct cookie');
    });
    await t.test('send responses do not disclose existing versus unknown accounts', async () => {
      await nextWindow();
      await db.query("UPDATE auth_rate_limits SET window_start=now()-interval '31 seconds' WHERE key=$1", [security.privateIdentifier(`email:cooldown:${email}`)]);
      const existing = await request('email-otp/send-verification-otp', { email, type: 'sign-in' });
      const unknown = await request('email-otp/send-verification-otp', { email: 'unverified-client@example.test', type: 'sign-in' });
      assert.equal(existing.status, 200); assert.equal(unknown.status, 200);
      assert.deepEqual(await existing.json(), await unknown.json());
      assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 2);
    });
    await t.test('expired generated OTP is rejected without creating an identity', async () => {
      await nextWindow();
      const email = 'expired-client@example.test';
      assert.equal((await request('email-otp/send-verification-otp', { email, type: 'sign-in' })).status, 200);
      const code = delivered.text.match(/^([0-9]{6}) /)[1];
      await db.query('UPDATE auth_verifications SET "expiresAt"=now()-interval \'1 hour\'');
      assert.equal((await request('sign-in/email-otp', { email, otp: code })).status, 400);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 2);
    });
    await t.test('expired session cannot restore identity', async () => {
      await db.query('UPDATE auth_sessions SET "expiresAt"=now()-interval \'1 hour\'');
      const expired = await request('get-session', null, cookie); assert.ok(await expired.text() === 'null', 'expired session rejected');
    });
  } finally { delivered = undefined; await db.close(); }
});
