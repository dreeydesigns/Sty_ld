const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
const { openLocalDatabases } = require('../helpers/local-postgres.cjs');
const { applicationHarness } = require('../helpers/application-harness.cjs');

test('real MFA reviewer and transactional PostgreSQL moderation audit', async t => {
  const db = await openLocalDatabases();
  try {
    const app = await applicationHarness(db.runtime);
    const email = 'local-reviewer@example.test';
    await db.owner.query('UPDATE auth_limits SET "lastRequest"=0');
    assert.equal((await app.authRequest('email-otp/send-verification-otp', { email, type: 'sign-in' })).status, 200);
    const signed = await app.authRequest('sign-in/email-otp', { email, otp: app.codeFor(email) });
    assert.equal(signed.status, 200);
    const cookie = app.cookieFrom(signed);
    const session = await (await app.authRequest('get-session', null, cookie)).json();
    const reviewer = session.user.id;
    // An owner-created synthetic role grant is a fixture, not a fabricated session.
    await db.owner.query("INSERT INTO user_roles(user_id,role) VALUES($1,'super_admin')", [reviewer]);
    const moderation = (method, body) => app.call('app/api/admin/moderation/route.ts', method, '/api/admin/moderation', cookie, body);
    const mfa = body => app.call('app/api/auth/mfa/totp/route.ts', 'POST', '/api/auth/mfa/totp', cookie, body);
    await t.test('a database admin grant alone never bypasses MFA', async () => {
      assert.equal((await moderation('GET')).status, 403);
      assert.equal((await mfa({ action: 'validate', code: '000000' })).status, 400);
    });
    await t.test('real encrypted factor setup and concurrent verification permit only one use', async () => {
      const setup = await mfa({ action: 'setup' });
      assert.equal(setup.status, 200);
      assert.equal(setup.headers.get('cache-control'), 'no-store');
      const { secret } = await setup.json();
      assert.ok(typeof secret === 'string');
      const bytes = Buffer.alloc(8); bytes.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
      const digest = createHmac('sha1', app.load('lib/totp.ts').base32Decode(secret)).update(bytes).digest();
      const otp = String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
      const results = await Promise.all([mfa({ action: 'verify', code: otp }), mfa({ action: 'verify', code: otp })]);
      assert.deepEqual(results.map(response => response.status).sort(), [200, 400]);
      const codes = (await results.find(response => response.status === 200).json()).recoveryCodes;
      assert.equal(codes.length, 8);
      const stored = (await db.owner.query('SELECT encrypted_secret,enabled FROM auth_totp WHERE user_id=$1', [reviewer])).rows[0];
      assert.equal(stored.enabled, true);
      assert.ok(stored.encrypted_secret !== secret && !stored.encrypted_secret.includes(secret), 'plaintext factor is not persisted');
      assert.equal((await moderation('GET')).status, 200);
    });
    const author = randomUUID(), workspace = randomUUID(), service = randomUUID(), post = randomUUID();
    await db.owner.query("INSERT INTO users(id,email,first_name) VALUES($1,'local-author@example.test','Synthetic author')", [author]);
    await db.owner.query("INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,'professional',$3)", [workspace, author, JSON.stringify({ firstName: 'Synthetic author', serviceMode: 'Both' })]);
    await db.owner.query("INSERT INTO services(id,workspace_id,provider_id,name,price,is_active) VALUES($1,$2,$3,'Disposable service',2000,true)", [service, workspace, author]);
    await db.owner.query("INSERT INTO social_posts(id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status) VALUES($1,$2,$3,'Synthetic author','professional','portfolio','Disposable canonical Look',$4,ARRAY[]::text[],'public','pending','visible')", [post, author, workspace, [`svc:${service}`]]);
    await t.test('moderation requires its precise update grant even with real MFA', async () => {
      assert.equal((await moderation('POST', { postId: post, decision: 'approve' })).status, 500);
      assert.equal((await db.owner.query('SELECT publication_status FROM social_posts WHERE id=$1', [post])).rows[0].publication_status, 'pending');
      await db.owner.query('GRANT UPDATE(publication_status,updated_at) ON social_posts TO styld_local_runtime');
    });
    await t.test('a real database audit failure rolls publication back atomically', async () => {
      await db.owner.query(`CREATE FUNCTION public.styld_fixture_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.event='moderation_approve' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER styld_fixture_audit_failure BEFORE INSERT ON security_events FOR EACH ROW EXECUTE FUNCTION public.styld_fixture_audit_failure()`);
      try {
        assert.equal((await moderation('POST', { postId: post, decision: 'approve' })).status, 500);
        assert.equal((await db.owner.query('SELECT publication_status FROM social_posts WHERE id=$1', [post])).rows[0].publication_status, 'pending');
        assert.equal(Number((await db.owner.query("SELECT count(*) AS n FROM security_events WHERE event='moderation_approve'")).rows[0].n), 0);
      } finally {
        await db.owner.query('DROP TRIGGER styld_fixture_audit_failure ON security_events; DROP FUNCTION public.styld_fixture_audit_failure()');
      }
      assert.equal((await moderation('POST', { postId: post, decision: 'approve' })).status, 200);
      assert.equal((await db.owner.query('SELECT publication_status FROM social_posts WHERE id=$1', [post])).rows[0].publication_status, 'published');
      assert.equal(Number((await db.owner.query("SELECT count(*) AS n FROM security_events WHERE event='moderation_approve'")).rows[0].n), 1);
      assert.equal((await moderation('POST', { postId: post, decision: 'approve' })).status, 409);
    });
    await t.test('removed service ownership cannot be published by an authorized reviewer', async () => {
      await db.owner.query("UPDATE social_posts SET publication_status='pending' WHERE id=$1", [post]);
      await db.owner.query('UPDATE services SET is_active=false WHERE id=$1', [service]);
      assert.equal((await moderation('POST', { postId: post, decision: 'approve' })).status, 409);
      assert.equal((await db.owner.query('SELECT publication_status FROM social_posts WHERE id=$1', [post])).rows[0].publication_status, 'pending');
    });
  } finally { await db.close(); }
});
