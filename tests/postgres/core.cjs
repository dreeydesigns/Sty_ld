const test = require('node:test');
const assert = require('node:assert/strict');
const { openLocalDatabases } = require('../helpers/local-postgres.cjs');
const { applicationHarness } = require('../helpers/application-harness.cjs');

test('owned PostgreSQL schema, independent connections and restricted runtime role', async t => {
  const db = await openLocalDatabases();
  try {
    await t.test('schema-only reference has all forty empty application tables', async () => {
      const tables = await db.owner.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
      assert.equal(tables.rows.length, 40);
      for (const { tablename } of tables.rows) assert.equal(Number((await db.owner.query(`SELECT count(*) AS n FROM public.${tablename}`)).rows[0].n), 0);
    });
    await t.test('two concurrent runtime connections are distinct real PostgreSQL backends', async () => {
      const a = await db.runtime.connect(), b = await db.runtime.connect();
      try {
        const [first, second] = await Promise.all([a.query('SELECT pg_backend_pid() AS pid'), b.query('SELECT pg_backend_pid() AS pid')]);
        assert.notEqual(first.rows[0].pid, second.rows[0].pid);
        assert.match((await a.query('SHOW server_version')).rows[0].server_version, /^17\.11/);
      } finally { a.release(); b.release(); }
    });
    await t.test('runtime is not an administrator and reproduces the workspace chooser grant gap', async () => {
      const result = await db.runtime.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user');
      assert.ok(Object.values(result.rows[0]).every(value => value === false));
      await assert.rejects(db.runtime.query('SELECT * FROM workspace_applications LIMIT 1'), error => error.code === '42501');
      await assert.rejects(db.runtime.query('CREATE TABLE public.forbidden_fixture(id int)'), error => error.code === '42501');
    });
    const app = await applicationHarness(db.runtime);
    const clients = [];
    const nextWindow = () => db.owner.query('UPDATE auth_limits SET "lastRequest"=0');
    await t.test('actual OTP transport and Better Auth create two independent persisted client sessions', async () => {
      for (const email of ['postgres-one@example.test', 'postgres-two@example.test']) {
        await nextWindow();
        assert.equal((await app.authRequest('email-otp/send-verification-otp', { email, type: 'sign-in' })).status, 200);
        assert.equal(Number((await db.owner.query('SELECT count(*) AS n FROM users WHERE email=$1', [email])).rows[0].n), 0);
        const code = app.codeFor(email);
        const signed = await app.authRequest('sign-in/email-otp', { email, otp: code });
        assert.equal(signed.status, 200);
        const cookie = app.cookieFrom(signed);
        assert.ok(cookie.includes('session='));
        assert.ok(/HttpOnly/i.test(signed.headers.get('set-cookie')), 'session cookie is HttpOnly');
        const session = await (await app.authRequest('get-session', null, cookie)).json();
        const workspace = (await db.owner.query("SELECT id FROM identity_workspaces WHERE user_id=$1 AND role='client' AND status='active'", [session.user.id])).rows[0].id;
        clients.push({ email, cookie, userId: session.user.id, workspace });
        assert.equal((await app.authRequest('sign-in/email-otp', { email, otp: code })).status, 400);
      }
      assert.notEqual(clients[0].userId, clients[1].userId);
      assert.notEqual(clients[0].workspace, clients[1].workspace);
      assert.ok(clients[0].cookie !== clients[1].cookie, 'independent sessions have distinct cookies');
    });
    await t.test('authenticated Plan reads and real row locks prevent stale overwrites and cross-client restoration', async () => {
      const a = clients[0], b = clients[1];
      assert.ok(a && b, 'both actual signups must succeed first');
      const read = await app.call('app/api/plan/route.ts', 'GET', '/api/plan', a.cookie);
      assert.equal(read.status, 200);
      const { plan } = await read.json();
      const { revision, updatedAt, ...fields } = plan;
      assert.equal(revision, 0);
      const write = area => app.call('app/api/plan/route.ts', 'PUT', '/api/plan', a.cookie,
        { expectedRevision: 0, plan: { ...fields, locationArea: area } }, { 'if-match': `"plan:${a.workspace}:0"` });
      const responses = await Promise.all([write('Synthetic North'), write('Synthetic South')]);
      assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
      const restored = await (await app.call('app/api/plan/route.ts', 'GET', '/api/plan', a.cookie)).json();
      assert.equal(restored.plan.revision, 1);
      assert.ok(['Synthetic North', 'Synthetic South'].includes(restored.plan.locationArea));
      const other = await (await app.call('app/api/plan/route.ts', 'GET', '/api/plan', b.cookie)).json();
      assert.equal(other.plan.revision, 0);
      assert.equal(other.plan.locationArea, '');
      assert.equal((await app.call('app/api/plan/route.ts', 'PUT', '/api/plan', b.cookie,
        { expectedRevision: 1, plan: fields }, { 'if-match': `"plan:${a.workspace}:1"` })).status, 412);
      assert.equal((await app.call('app/api/plan/route.ts', 'GET', '/api/plan')).status, 401);
    });
    await t.test('provider failures never create identities or disclose recipients', async () => {
      for (const mode of ['403', '429', 'timeout', 'network']) {
        await nextWindow(); app.setDelivery(mode);
        const email = `failure-${mode}@example.test`;
        const response = await app.authRequest('email-otp/send-verification-otp', { email, type: 'sign-in' });
        assert.equal(response.status, 503);
        assert.ok(!(await response.text()).includes(email));
        assert.equal(Number((await db.owner.query('SELECT count(*) AS n FROM users WHERE email=$1', [email])).rows[0].n), 0);
      }
      app.setDelivery('ok');
    });
    await t.test('workspace chooser requires the separately proposed minimal read grant', async () => {
      assert.ok(clients[0]);
      const route = 'app/api/workspaces/route.ts';
      assert.equal((await app.call(route, 'GET', '/api/workspaces', clients[0].cookie)).status, 500);
      await db.owner.query('GRANT SELECT ON workspace_applications TO styld_local_runtime');
      assert.equal((await app.call(route, 'GET', '/api/workspaces', clients[0].cookie)).status, 200);
      assert.equal((await app.call(route, 'GET', '/api/workspaces')).status, 401);
    });
    await t.test('concurrent verification atomically consumes one generated OTP', async () => {
      assert.ok(clients[0]);
      await nextWindow();
      const email = clients[0].email;
      const key = app.load('lib/security-events.ts').privateIdentifier(`email:cooldown:${email}`);
      await db.owner.query("UPDATE auth_rate_limits SET window_start=now()-interval '31 seconds' WHERE key=$1", [key]);
      const before = Number((await db.owner.query('SELECT count(*) AS n FROM auth_sessions WHERE "userId"=$1', [clients[0].userId])).rows[0].n);
      assert.equal((await app.authRequest('email-otp/send-verification-otp', { email, type: 'sign-in' })).status, 200);
      const otp = app.codeFor(email);
      const attempts = await Promise.all([app.authRequest('sign-in/email-otp', { email, otp }), app.authRequest('sign-in/email-otp', { email, otp })]);
      assert.deepEqual(attempts.map(response => response.status).sort(), [200, 400]);
      const after = Number((await db.owner.query('SELECT count(*) AS n FROM auth_sessions WHERE "userId"=$1', [clients[0].userId])).rows[0].n);
      assert.equal(after, before + 1);
    });
    await t.test('incorrect email, incorrect code, expiry and resend cooldown remain enforced', async () => {
      await nextWindow();
      const email = 'wrong-and-expired@example.test';
      assert.equal((await app.authRequest('email-otp/send-verification-otp', { email, type: 'sign-in' })).status, 200);
      const otp = app.codeFor(email);
      const wrong = otp === '000000' ? '000001' : '000000';
      assert.equal((await app.authRequest('sign-in/email-otp', { email: 'other-recipient@example.test', otp })).status, 400);
      assert.equal((await app.authRequest('sign-in/email-otp', { email, otp: wrong })).status, 400);
      assert.equal((await app.authRequest('email-otp/send-verification-otp', { email: email.toUpperCase(), type: 'sign-in' })).status, 429);
      await db.owner.query('UPDATE auth_verifications SET "expiresAt"=now()-interval \'1 hour\'');
      assert.equal((await app.authRequest('sign-in/email-otp', { email, otp })).status, 400);
      assert.equal(Number((await db.owner.query('SELECT count(*) AS n FROM users WHERE email=$1', [email])).rows[0].n), 0);
    });
    await t.test('real Save, Unsave and Undo preserve Plan JSON and reject private or removed content', async () => {
      const { randomUUID } = require('node:crypto');
      const a = clients[0], b = clients[1];
      assert.ok(a && b);
      const postId = randomUUID();
      await db.owner.query("INSERT INTO social_posts(id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,media_urls,visibility,publication_status,moderation_status) VALUES($1,$2,$3,'Synthetic local author','client','inspo','Disposable test only',ARRAY[]::text[],'public','published','visible')", [postId, b.userId, b.workspace]);
      const route = 'app/api/social/saves/route.ts';
      const save = () => app.call(route, 'POST', '/api/social/saves', a.cookie, { postId });
      const rapid = await Promise.all([save(), save(), save()]);
      assert.ok(rapid.every(response => response.status === 200));
      let read = await (await app.call(route, 'GET', '/api/social/saves', a.cookie)).json();
      assert.deepEqual(read.savedPostIds, [postId]);
      const other = await (await app.call(route, 'GET', '/api/social/saves', b.cookie)).json();
      assert.deepEqual(other.savedPostIds, []);
      const removed = await app.call('app/api/social/saves/[postId]/route.ts', 'DELETE', `/api/social/saves/${postId}`, a.cookie, undefined, {}, { postId });
      assert.equal(removed.status, 200);
      assert.deepEqual((await removed.json()).savedPostIds, []);
      assert.equal((await save()).status, 200, 'Undo of Unsave uses the actual Save API');
      const profile = (await db.owner.query('SELECT profile FROM identity_workspaces WHERE id=$1', [a.workspace])).rows[0].profile;
      assert.equal(profile.activePlan.revision, 1);
      await db.owner.query("UPDATE social_posts SET visibility='private' WHERE id=$1", [postId]);
      assert.equal((await save()).status, 404);
      await db.owner.query("UPDATE social_posts SET visibility='public',publication_status='pending' WHERE id=$1", [postId]);
      assert.equal((await save()).status, 404);
      await db.owner.query("UPDATE social_posts SET publication_status='published',deleted_at=now() WHERE id=$1", [postId]);
      assert.equal((await save()).status, 404);
      assert.equal((await app.call(route, 'POST', '/api/social/saves', undefined, { postId })).status, 401);
    });
    await t.test('actual sign-out and expiry revoke restoration without affecting the other client', async () => {
      const a = clients[0], b = clients[1];
      assert.ok(a && b);
      assert.equal((await app.authRequest('sign-out', {}, a.cookie)).status, 200);
      assert.equal(await (await app.authRequest('get-session', null, a.cookie)).text(), 'null');
      assert.ok((await (await app.authRequest('get-session', null, b.cookie)).json()).user.id);
      await db.owner.query('UPDATE auth_sessions SET "expiresAt"=now()-interval \'1 hour\' WHERE "userId"=$1', [b.userId]);
      assert.equal(await (await app.authRequest('get-session', null, b.cookie)).text(), 'null');
    });
  } finally { await db.close(); }
});
