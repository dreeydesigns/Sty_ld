// SAFETY-01: the application-level authorization boundary, measured on a live server.
//
// The hosted database has zero row level security policies (measured in DB-ISO-01b), so the tenant
// wall is entirely application code. This suite signs two real clients in with real emailed OTP on a
// disposable cluster, seeds a professional with real services and posts, and then asks every private
// endpoint the questions an attacker would ask: what an anonymous visitor can read, what one tenant
// can see or change of another's, what a forged Origin or a body-carried identity does, and whether
// every decommissioned surface still refuses. Every probe is paired with a positive control, because
// a test that only proves refusal cannot tell a wall from a broken route.
//
// Four steps assert the security requirement, not the current behavior, and are expected to be the
// findings: analytics has no cap on an unauthenticated write path (POST /api/analytics), reports have
// no throttle (POST /api/reports), a malformed block id answers 500 instead of 400 (POST /api/blocks),
// and a post may embed another account's Cloudinary folder because validMediaUrl never checks the
// path below the cloud name (POST /api/social/posts). A failing step here is a reproduced finding,
// and the receipt names each one.
//
// Usage: node tests/browser/live-authz-boundary.cjs --bin "<PostgreSQL 17.11 bin>"
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = process.env.STYLD_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = process.env.STYLD_AUTHZ_RECEIPT || 'docs/readiness/beta/live-authz-boundary.json';

const EMAIL_A = 'authz-client-a@example.test';
const EMAIL_B = 'authz-client-b@example.test';
const EMAIL_P = 'authz-provider@example.test';
const CLOUD_NAME = 'qacloud';

const results = [];
const samples = [];
const notes = [];
const answers = [];

async function step(name, run) {
  try {
    await run();
    results.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'fail', error: String(error.message || error).slice(0, 900) });
    console.log(`FAIL ${name}: ${String(error.message || error).split('\n')[0].slice(0, 300)}`);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

(async () => {
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required (--bin).');
  const cluster = await startLiveCluster({ bin, label: 'authz-boundary' });
  let mail;
  let server;
  let browser;
  const serverLog = [];
  const errors = [];
  let cleanedUp = false;
  async function teardown() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (browser) await browser.close().catch(() => null);
    if (server) server.kill();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const cleanup = await cluster.close();
    if (mail) await mail.stop().catch(() => null);
    console.log('cleanup', JSON.stringify(cleanup));
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void teardown().then(() => process.exit(1), () => process.exit(1)); });
  }

  let base = '';
  try {
    mail = await startMailCapture();
    const appPort = await freePort();
    base = `http://127.0.0.1:${appPort}`;
    const environment = {
      PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, WINDIR: process.env.WINDIR,
      TEMP: process.env.TEMP, TMP: process.env.TMP, COMSPEC: process.env.COMSPEC, PATHEXT: process.env.PATHEXT,
      NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), MFA_SECRET_KEY: randomBytes(32).toString('hex'),
      POSTGRES_URL: cluster.runtimeUrl, POSTGRES_URL_NON_POOLING: cluster.runtimeUrl, DATABASE_URL: cluster.runtimeUrl,
      EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'live-qa-local-token', RESEND_FROM_EMAIL: 'STYLD QA <qa@example.test>',
      RESEND_API_URL: mail.apiUrl,
      // A stand-in cloud name, so the post-creation media validator runs its real check. No byte ever
      // leaves loopback: the route filter below aborts every non-loopback request, and the audit
      // question is which URL the server agrees to store, not whether the image exists.
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: CLOUD_NAME,
    };
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(appPort)],
      { cwd: root, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', chunk => serverLog.push(String(chunk)));
    server.stderr.on('data', chunk => serverLog.push(String(chunk)));
    for (let attempt = 0; attempt < 60; attempt++) {
      try { const response = await fetch(`${base}/discover`); if (response.status < 500) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const loopbackOnly = async (context) => {
      await context.route(/.*/, route => {
        const host = new URL(route.request().url()).hostname;
        if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
        return route.abort();
      });
      return context;
    };

    async function newClient(email, label) {
      const context = await loopbackOnly(await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`${label} ${page.url().replace(base, '')}: ${error.message}`));
      await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email address').fill(email);
      // The two tabs share one loopback IP, so both auth buckets are cleared before every send.
      for (let attempt = 1; attempt <= 2; attempt++) {
        await cluster.owner.query('DELETE FROM auth_limits');
        await cluster.owner.query('DELETE FROM auth_rate_limits');
        await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
        if (await page.getByRole('heading', { name: 'Check your email', exact: true })
          .waitFor({ timeout: 20000 }).then(() => true).catch(() => false)) break;
        if (attempt === 2) throw new Error(`the OTP screen never painted for ${email}`);
        await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
        await page.getByLabel('Email address').fill(email);
      }
      const code = await mail.waitForCode(email);
      await page.getByLabel('Verification code').fill(code);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      if (await page.getByRole('heading', { name: 'What should we call you?', exact: true })
        .waitFor({ timeout: 6000 }).then(() => true).catch(() => false)) {
        await page.getByLabel('Preferred name').fill(label);
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      await page.waitForURL('**/home', { timeout: 25000 });
      const skip = page.locator('div[role="dialog"] button[aria-label="Skip walkthrough"]').first();
      if (await skip.waitFor({ timeout: 12000 }).then(() => true).catch(() => false)) {
        await skip.click({ timeout: 10000 });
        await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
      }
      return { context, page, email };
    }

    // One request shape for every probe: same-origin mutations carry the real Origin, and the
    // status plus a trimmed body are recorded so the receipt shows what the server actually said.
    // The body is kept whole for the assertions and trimmed only in the receipt copy.
    async function ask(request, method, pathname, { body = null, origin = base, headers = {} } = {}) {
      const response = await request[method.toLowerCase()](`${base}${pathname}`, {
        headers: { origin, ...headers },
        data: body === null ? undefined : JSON.stringify(body),
      });
      let parsed = null;
      try { parsed = await response.json(); } catch { parsed = null; }
      const textBody = parsed === null ? String(await response.text().catch(() => '')) : JSON.stringify(parsed);
      const record = { method, path: pathname, status: response.status(), body: textBody.slice(0, 240) };
      answers.push(record);
      return { ...record, json: parsed, full: textBody, headers: response.headers() };
    }
    const refused = (answer, allowed) => allowed.includes(answer.status)
      ? null : `${answer.method} ${answer.path} answered ${answer.status} "${answer.body}"`;
    const REFUSALS = [401, 403, 404];

    const state = {};

    await step('client A signs in with a real OTP on the disposable cluster', async () => {
      const a = await newClient(EMAIL_A, 'Authz Client A');
      state.a = a;
      state.aMe = (await ask(a.context.request, 'GET', '/api/me')).status === 200;
      assert.ok(state.aMe, 'A must be signed in for every probe below to mean anything');
    });

    await step('client B signs in with a real OTP in its own context', async () => {
      state.b = await newClient(EMAIL_B, 'Authz Client B');
      assert.ok((await ask(state.b.context.request, 'GET', '/api/me')).status === 200);
    });

    await step('the workspace records of both clients and a seeded provider are read from the server', async () => {
      const rowsA = await cluster.owner.query(
        "SELECT id FROM identity_workspaces WHERE user_id = (SELECT id FROM users WHERE email = $1) AND role = 'client' AND status = 'active'", [EMAIL_A]);
      const rowsB = await cluster.owner.query(
        "SELECT id FROM identity_workspaces WHERE user_id = (SELECT id FROM users WHERE email = $1) AND role = 'client' AND status = 'active'", [EMAIL_B]);
      assert.equal(rowsA.rows.length, 1, 'A should have exactly one active client workspace');
      assert.equal(rowsB.rows.length, 1, 'B should have exactly one active client workspace');
      state.aWorkspace = rowsA.rows[0].id;
      state.bWorkspace = rowsB.rows[0].id;
      state.aUser = (await cluster.owner.query('SELECT id FROM users WHERE email = $1', [EMAIL_A])).rows[0].id;
      state.bUser = (await cluster.owner.query('SELECT id FROM users WHERE email = $1', [EMAIL_B])).rows[0].id;

      // The 40-table fixture predates the two newest migrations; live-auth-journey set the precedent
      // of applying them to this run's own cluster through the same founder-facing files.
      for (const file of ['015_media_manifests.sql', '016_discussion_requests.sql']) {
        await cluster.owner.query(fs.readFileSync(path.join(root, 'sql/migrations', file), 'utf8'));
      }

      const providerId = randomUUID();
      const providerWorkspace = randomUUID();
      await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)',
        [providerId, EMAIL_P, 'QA Boundary Studio']);
      await cluster.owner.query('INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)',
        [providerWorkspace, providerId, 'professional', JSON.stringify({ displayName: 'QA Boundary Studio', location: 'Westlands, Nairobi', serviceMode: 'Salon', specialty: 'Braids' })]);
      const services = [];
      for (const name of ['QA Boundary Knotless', 'QA Boundary Cornrows']) {
        const inserted = await cluster.owner.query(
          'INSERT INTO services(id,workspace_id,provider_id,name,price,category,is_active) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id',
          [randomUUID(), providerWorkspace, providerId, name, '2500.00', 'QA Boundary']);
        services.push(inserted.rows[0].id);
      }
      const published = await cluster.owner.query(
        `INSERT INTO social_posts(author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status)
         VALUES($1,$2,$3,'professional','inspo',$4,'{}','{}','public','published','visible') RETURNING id`,
        [providerId, providerWorkspace, 'QA Boundary Studio', 'A published look for the boundary audit.']);
      const pending = await cluster.owner.query(
        `INSERT INTO social_posts(author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status)
         VALUES($1,$2,$3,'professional','portfolio',$4,'{}','{}','public','pending','visible') RETURNING id`,
        [providerId, providerWorkspace, 'QA Boundary Studio', 'A not-yet-published post for the boundary audit.']);
      const privateOfA = await cluster.owner.query(
        `INSERT INTO social_posts(author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status)
         VALUES($1,$2,$3,'client','inspo',$4,'{}','{}','private','published','visible') RETURNING id`,
        [state.aUser, state.aWorkspace, 'Authz Client A', 'Client A private note for the boundary audit.']);
      const request = await cluster.owner.query(
        `INSERT INTO discussion_requests(client_user_id,client_workspace_id,provider_workspace_id,look_post_id,service_id,note,status,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,'requested', now() + interval '7 days') RETURNING id`,
        [state.aUser, state.aWorkspace, providerWorkspace, published.rows[0].id, services[0],
          'A seeded request from client A so client B can try to touch it.']);
      Object.assign(state, { providerUser: providerId, providerWorkspace,
        serviceOne: services[0], serviceTwo: services[1],
        publishedLook: published.rows[0].id, pendingPost: pending.rows[0].id,
        privatePostA: privateOfA.rows[0].id, seededRequest: request.rows[0].id });
    });

    await step('an anonymous visitor is refused every private read and gets no 500 anywhere', async () => {
      const anon = await loopbackOnly(await browser.newContext({ viewport: { width: 390, height: 844 } }));
      const unknownAsset = randomUUID();
      const endpoints = ['/api/me', '/api/plan', '/api/workspaces', '/api/auth/session', '/api/auth/sessions',
        '/api/social/saves', '/api/discussion-requests', '/api/admin/security', '/api/admin/moderation',
        '/api/admin/integrations', '/api/blocks', '/api/bookings', '/api/account/deletion',
        `/api/media/pending/${unknownAsset}`];
      const problems = [];
      for (const pathname of endpoints) {
        const answer = await ask(anon.request, 'GET', pathname);
        // The pending-media route refuses with 503 while delivery is not configured, which is the
        // fail-closed answer this environment gives; a 500 from anywhere else is a crash.
        const failClosed = pathname.startsWith('/api/media/pending') && answer.status === 503;
        if (answer.status >= 500 && !failClosed) problems.push(`${pathname} crashed with ${answer.status}`);
        else if (!failClosed && ![401, 403, 404].includes(answer.status)) problems.push(`${pathname} answered ${answer.status} "${answer.body}"`);
      }
      await anon.request.dispose();
      assert.deepEqual(problems, [], `anonymous reached or broke something: ${problems.join(' | ')}`);
    });

    await step('client A saves a real plan through the plan API (positive control)', async () => {
      const read = await ask(state.a.context.request, 'GET', '/api/plan');
      assert.equal(read.status, 200, `A cannot read its own plan: ${read.status} ${read.body}`);
      const json = read.json;
      state.aScopeKey = json.scopeKey;
      state.aPlanRevision = json.plan.revision;
      const write = await ask(state.a.context.request, 'PUT', '/api/plan', {
        // The plan API accepts the whole schemaVersion-2 document, so the probe sends every field.
        body: { expectedRevision: json.plan.revision, plan: { schemaVersion: 2, lookPostId: null, creatorWorkspaceId: null,
          serviceIds: [state.serviceOne, state.serviceTwo], preferredDate: null, timeWindow: null, serviceMode: null,
          locationArea: 'QA Boundary Area', shortlistProviderWorkspaceIds: [], leadingChoiceProviderWorkspaceId: null } },
        headers: { 'if-match': `"plan:${state.aWorkspace}:${json.plan.revision}"` },
      });
      assert.equal(write.status, 200, `the plan write was refused: ${write.status} ${write.body}`);
      assert.match(write.headers['cache-control'] || '', /no-store/, 'a private plan must not be cacheable');
      const stored = write.json;
      assert.deepEqual(stored.plan.serviceIds, [state.serviceOne, state.serviceTwo]);
      assert.match((await ask(state.a.context.request, 'GET', '/api/me')).headers['cache-control'] || '', /no-store/,
        '/api/me must not be cacheable either');
    });

    await step('client B cannot see or inherit client A plan', async () => {
      const read = await ask(state.b.context.request, 'GET', '/api/plan');
      assert.equal(read.status, 200, 'B must be able to read its own plan');
      const json = read.json;
      assert.notEqual(json.scopeKey, state.aScopeKey, `B was served A plan scope ${json.scopeKey}`);
      assert.ok(!json.plan.serviceIds || !json.plan.serviceIds.includes(state.serviceOne),
        `B plan carries A service: ${JSON.stringify(json.plan.serviceIds)}`);
      const serverSide = await cluster.owner.query(
        'SELECT profile -> $3 AS active_plan FROM identity_workspaces WHERE id = $1 AND user_id = $2', [state.aWorkspace, state.aUser, 'activePlan']);
      assert.ok(serverSide.rows[0].active_plan, 'A plan row must still exist server-side after B activity');
      samples.push({ stage: 'plan-isolation', bScope: json.scopeKey, aScope: state.aScopeKey, aStoredPlan: serverSide.rows[0].active_plan });
    });

    await step('B cannot switch its session into workspace that is not its own', async () => {
      const intoA = await ask(state.b.context.request, 'POST', '/api/auth/session', { body: { workspaceId: state.aWorkspace } });
      assert.deepEqual([intoA.status], [403], `switching into client A workspace answered ${intoA.status} "${intoA.body}"`);
      const intoProvider = await ask(state.b.context.request, 'POST', '/api/auth/session', { body: { workspaceId: state.providerWorkspace } });
      assert.deepEqual([intoProvider.status], [403], `switching into provider workspace answered ${intoProvider.status}`);
      const context = await cluster.owner.query(
        'SELECT workspace_id FROM auth_session_context WHERE user_id = $1', [state.bUser]);
      const stillB = context.rows.every(row => String(row.workspace_id) === String(state.bWorkspace) || row.workspace_id === null);
      assert.ok(stillB, `the session context table shows B attached to something that is not its own workspace: ${JSON.stringify(context.rows)}`);
      const own = await ask(state.a.context.request, 'POST', '/api/auth/session', { body: { workspaceId: state.aWorkspace } });
      assert.equal(own.status, 200, `A switching to its OWN workspace must work (positive control): ${own.status} ${own.body}`);
    });

    await step('B cannot read or delete private post of A, and cannot reach unpublished post of provider', async () => {
      const bRead = await ask(state.b.context.request, 'GET', `/api/social/posts/${state.privatePostA}`);
      assert.ok(REFUSALS.includes(bRead.status), `B read A private post with ${bRead.status} "${bRead.body}"`);
      const bDelete = await ask(state.b.context.request, 'DELETE', `/api/social/posts/${state.privatePostA}`);
      assert.ok(REFUSALS.includes(bDelete.status), `B deleted A private post with ${bDelete.status}`);
      const stillThere = await cluster.owner.query('SELECT deleted_at FROM social_posts WHERE id = $1', [state.privatePostA]);
      assert.equal(stillThere.rows[0].deleted_at, null, 'A private post was soft-deleted by B');
      const pendingRead = await ask(state.b.context.request, 'GET', `/api/social/posts/${state.pendingPost}`);
      assert.ok(REFUSALS.includes(pendingRead.status), `provider unpublished post is readable with ${pendingRead.status}`);
      const publicRead = await ask(state.b.context.request, 'GET', `/api/social/posts/${state.publishedLook}`);
      assert.equal(publicRead.status, 200, `positive control: B must see the published look (${publicRead.status})`);
      const ownerRead = await ask(state.a.context.request, 'GET', `/api/social/posts/${state.privatePostA}`);
      assert.equal(ownerRead.status, 200, `positive control: A must see its own private post (${ownerRead.status})`);
    });

    await step('B cannot save A private post, and can save public look (positive control)', async () => {
      const savePrivate = await ask(state.b.context.request, 'POST', '/api/social/saves', { body: { postId: state.privatePostA } });
      assert.equal(savePrivate.status, 404, `saving A private post answered ${savePrivate.status}`);
      const saveLook = await ask(state.b.context.request, 'POST', '/api/social/saves', { body: { postId: state.publishedLook } });
      assert.equal(saveLook.status, 200, `positive control: B must be able to save a public look (${saveLook.status} ${saveLook.body})`);
      const list = await ask(state.b.context.request, 'GET', '/api/social/saves');
      assert.ok(list.json.savedPostIds.includes(state.publishedLook), 'the saved look must appear in B own list');
      const aList = (await ask(state.a.context.request, "GET", "/api/social/saves")).json;
      assert.ok(!aList.savedPostIds.includes(state.publishedLook), 'B save must not leak into A saves');
    });

    await step('discussion requests stay between their own parties', async () => {
      const againstA = await ask(state.b.context.request, 'POST', '/api/discussion-requests', {
        body: { providerWorkspaceId: state.aWorkspace, note: 'Trying to open a request against a client workspace.' } });
      assert.ok(REFUSALS.includes(againstA.status), `a request against a client workspace answered ${againstA.status}`);
      const own = await ask(state.b.context.request, 'POST', '/api/discussion-requests', {
        body: { providerWorkspaceId: state.providerWorkspace, lookPostId: state.publishedLook, serviceId: state.serviceOne,
          note: 'Boundary audit positive control, asking about the seeded service.' } });
      assert.equal(own.status, 201, `positive control: B must be able to ask the provider (${own.status} ${own.body})`);
      const withdraw = await ask(state.b.context.request, 'POST', `/api/discussion-requests/${state.seededRequest}`, { body: { action: 'withdraw' } });
      assert.ok(REFUSALS.includes(withdraw.status), `B withdrew A request with ${withdraw.status} "${withdraw.body}"`);
      const accept = await ask(state.b.context.request, 'POST', `/api/discussion-requests/${state.seededRequest}`, { body: { action: 'accept' } });
      assert.ok(REFUSALS.includes(accept.status), `B accepted provider request with ${accept.status}`);
      const status = await cluster.owner.query('SELECT status FROM discussion_requests WHERE id = $1', [state.seededRequest]);
      assert.equal(status.rows[0].status, 'requested', `the seeded request moved to ${status.rows[0].status}`);
      const listA = String((await ask(state.a.context.request, 'GET', '/api/discussion-requests')).body);
      const listB = String((await ask(state.b.context.request, 'GET', '/api/discussion-requests')).body);
      assert.ok(listA.includes(state.seededRequest), `the request A opened is missing from A own list: ${listA.slice(0, 300)}`);
      assert.ok(!listB.includes(state.seededRequest), `A request leaked into B list: ${listB.slice(0, 300)}`);
      samples.push({ stage: 'discussion', aList: listA.slice(0, 500), bList: listB.slice(0, 500) });
    });

    await step('one client cannot list or revoke the session of another', async () => {
      const aSessions = (await ask(state.a.context.request, "GET", "/api/auth/sessions")).json;
      const current = aSessions.sessions.find(s => s.is_current);
      assert.ok(current, 'A own session must be listed for A (positive control)');
      const bSessions = (await ask(state.b.context.request, "GET", "/api/auth/sessions")).json;
      assert.ok(!bSessions.sessions.some(s => s.id === current.id), 'B session list leaked A session id');
      const revoke = await ask(state.b.context.request, 'DELETE', '/api/auth/sessions', { body: { sessionId: current.id } });
      const alive = await cluster.owner.query('SELECT id FROM auth_sessions WHERE id = $1', [current.id]);
      assert.equal(alive.rows.length, 1, `B DELETE answered ${revoke.status} and A session is GONE from the table`);
      const stillSignedIn = await ask(state.a.context.request, 'GET', '/api/me');
      assert.equal(stillSignedIn.status, 200, 'A session that was never revoked must still serve A');
      samples.push({ stage: 'revoke-attempt', deleteAnswer: revoke.status, deleteBody: revoke.body });
    });

    await step('a forged Origin is refused and a workspace application grants nothing', async () => {
      const forged = await ask(state.b.context.request, 'POST', '/api/workspaces',
        { body: { role: 'salon', name: 'QA Forge Salon', description: 'Forged-origin probe.', contact: 'b@example.test' }, origin: 'https://evil.example' });
      assert.equal(forged.status, 403, `forged origin answered ${forged.status} "${forged.body}"`);
      const real = await ask(state.b.context.request, 'POST', '/api/workspaces',
        { body: { role: 'salon', name: 'QA Apply Salon', description: 'A real application filed through the honest route.', contact: 'b@example.test' } });
      assert.equal(real.status, 200, `positive control: an honest application must be accepted (${real.status} ${real.body})`);
      const roles = await cluster.owner.query(
        "SELECT count(*)::int AS n FROM user_roles WHERE user_id = $1 AND role IN ('professional','salon','admin','super_admin')", [state.bUser]);
      assert.equal(roles.rows[0].n, 0, 'filing an application must not mint a workspace or a role');
      const after = await ask(state.b.context.request, 'GET', '/api/workspaces');
      assert.ok(String(after.json?.applications[0]?.status) === 'pending', 'the application must sit pending');
    });

    await step('a client cannot create a service, and a provider session can (positive control)', async () => {
      const asClient = await ask(state.b.context.request, 'POST', '/api/services',
        { body: { name: 'QA Forged Service', price: 10, category: 'QA Boundary' } });
      assert.ok(REFUSALS.includes(asClient.status), `a client created a service with ${asClient.status}`);
      // Grant B a real professional workspace in the database, the way admin approval would, so the
      // switch validates it server-side and the positive control runs through the same route.
      const bProWorkspace = randomUUID();
      await cluster.owner.query('INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)',
        [bProWorkspace, state.bUser, 'professional', JSON.stringify({ displayName: 'QA Boundary B Studio', location: 'Nairobi', serviceMode: 'Salon', specialty: 'Braids' })]);
      const switchTo = await ask(state.b.context.request, 'POST', '/api/auth/session', { body: { workspaceId: bProWorkspace } });
      assert.equal(switchTo.status, 200, `B switching to its own new workspace was refused: ${switchTo.status} ${switchTo.body}`);
      const asProvider = await ask(state.b.context.request, 'POST', '/api/services',
        { body: { name: 'QA Provider Service', price: 1500, category: 'QA Boundary' } });
      assert.ok([200, 201].includes(asProvider.status), `positive control: the provider session must be able to create (${asProvider.status} ${asProvider.body})`);
      const notAdmin = await ask(state.b.context.request, 'GET', '/api/admin/security');
      assert.ok(REFUSALS.includes(notAdmin.status), `a provider read the admin console with ${notAdmin.status}`);
      state.bProWorkspace = bProWorkspace;
    });

    await step('every retired and contained surface still refuses', async () => {
      const problems = [];
      const retired = ['/api/init', '/api/setup/init-admin', '/api/auth/audit', '/api/auth/change-password',
        '/api/auth/client/signup', '/api/auth/email', '/api/auth/google', '/api/auth/identities',
        '/api/auth/passkey', '/api/auth/phone-signin', '/api/auth/phone/verify', '/api/auth/signin',
        '/api/auth/signin-multi-role', '/api/auth/whatsapp'];
      for (const pathname of retired) {
        const answer = await ask(state.a.context.request, 'POST', pathname, { body: {} });
        if (answer.status !== 410) problems.push(`${pathname} answered ${answer.status} "${answer.body}" instead of 410`);
      }
      const inert = [
        { path: '/api/reviews', method: 'GET', allow: [503] },
        { path: '/api/reviews', method: 'POST', allow: [401, 403, 404, 405, 503] },
        { path: '/api/payments/mpesa/callback', method: 'POST', allow: [503] },
        { path: '/api/bookings', method: 'POST', allow: [503] },
        { path: '/api/onboarding/client-interests', method: 'PATCH', allow: [400, 503] },
        { path: '/api/upload', method: 'POST', allow: [400, 503] },
      ];
      for (const probe of inert) {
        const answer = await ask(state.a.context.request, probe.method, probe.path, { body: {} });
        if (!probe.allow.includes(answer.status)) problems.push(`${probe.method} ${probe.path} answered ${answer.status} "${answer.body}"`);
      }
      const health = await ask(state.a.context.request, 'GET', '/api/health');
      assert.equal(health.status, 200, 'the public health endpoint must answer');
      for (const pathname of ['/api/health/auth', '/api/health/environment']) {
        const noToken = await ask(state.a.context.request, 'GET', pathname);
        const wrongToken = await ask(state.a.context.request, 'GET', pathname, { headers: { 'x-health-check-token': 'nope' } });
        if (noToken.status !== 404 || wrongToken.status !== 404) problems.push(`${pathname} answered ${noToken.status}/${wrongToken.status} without the right token`);
      }
      assert.deepEqual(problems, [], `a surface that was supposed to be inert answered differently: ${problems.join(' | ')}`);
    });

    await step('an admin role without MFA cannot open the admin console', async () => {
      await cluster.owner.query("UPDATE users SET role = 'admin' WHERE id = $1", [state.aUser]);
      await cluster.owner.query('INSERT INTO user_roles(id,user_id,role) VALUES($1,$2,$3)', [randomUUID(), state.aUser, 'admin']);
      try {
        const me = (await ask(state.a.context.request, "GET", "/api/me")).json;
        assert.equal(me.user?.admin ?? me.admin, true, 'the server must report A as admin after the grant');
        assert.equal(me.user?.mfaVerified ?? me.mfaVerified, false, 'and must report MFA as absent');
        const adminRead = await ask(state.a.context.request, 'GET', '/api/admin/security');
        assert.equal(adminRead.status, 403, `an admin without MFA read the console with ${adminRead.status} "${adminRead.body}"`);
        const moderation = await ask(state.a.context.request, 'POST', '/api/admin/moderation', { body: { postId: state.pendingPost, decision: 'approve' } });
        assert.equal(moderation.status, 403, `an admin without MFA acted on moderation with ${moderation.status}`);
      } finally {
        await cluster.owner.query("UPDATE users SET role = 'client' WHERE id = $1", [state.aUser]);
        await cluster.owner.query("DELETE FROM user_roles WHERE user_id = $1 AND role = 'admin'", [state.aUser]);
      }
    });

    await step('the pending-media endpoint refuses identically for stranger, client and provider', async () => {
      const ghost = randomUUID();
      const anon = await loopbackOnly(await browser.newContext());
      const trio = [
        await ask(anon.request, 'GET', `/api/media/pending/${ghost}`),
        await ask(state.a.context.request, 'GET', `/api/media/pending/${ghost}`),
        await ask(state.b.context.request, 'GET', `/api/media/pending/${ghost}`),
      ];
      const bodies = new Set(trio.map(answer => `${answer.status} ${answer.body}`));
      await anon.request.dispose();
      assert.equal(bodies.size, 1, `the refusals are not uniform: ${[...bodies].join(' || ')}`);
      assert.ok([404, 503].includes(trio[0].status), `a stranger was told ${trio[0].status}, not a uniform refusal`);
      const traversal = await ask(state.b.context.request, 'GET', '/api/media/pending/..%2F..%2Fusers');
      assert.ok([400, 403, 404, 503].includes(traversal.status), `a hostile asset id answered ${traversal.status}`);
    });

    await step('the analytics intake is capped for a signed-in and an anonymous burst', async () => {
      // The route caps intake at 60 events a minute per user or per trusted IP. The burst runs past
      // that as client B, and alongside it as an anonymous visitor, which this host cannot key to
      // an IP and so must refuse outright.
      const before = Number((await cluster.owner.query('SELECT count(*)::text AS n FROM analytics_events')).rows[0].n);
      let inserted = 0, denied = 0;
      const anon = await loopbackOnly(await browser.newContext({ viewport: { width: 390, height: 844 } }));
      for (let index = 0; index < 80; index++) {
        const request = index % 5 === 0 ? anon.request : state.b.context.request;
        const answer = await ask(request, 'POST', '/api/analytics',
          { body: { eventName: `qa_boundary_probe_${index % 10}`, anonymousId: 'qa-anon-probe' } });
        if (answer.status < 400) inserted++; else denied++;
      }
      await anon.request.dispose();
      const after = Number((await cluster.owner.query('SELECT count(*)::text AS n FROM analytics_events')).rows[0].n);
      samples.push({ stage: 'analytics', before, after, inserted, denied });
      assert.ok(denied > 0 && after - before <= 80 - 1,
        `80 analytics writes produced ${after - before} rows and ${denied} refusals: this intake is uncapped`);
    });

    await step('the report intake throttles repeated submissions and the limiter cannot be spoofed', async () => {
      const statuses = [];
      for (let index = 0; index < 12; index++) {
        // Three of the posts also carry a body-supplied userId, to prove the throttle key and the
        // stored reporter both come from the session rather than from anything the client sends.
        const body = { targetType: 'user', targetId: state.aUser, reason: `QA boundary throttle probe ${index}` };
        if (index === 3 || index === 7 || index === 11) body.userId = state.aUser;
        const answer = await ask(state.b.context.request, 'POST', '/api/reports', { body });
        statuses.push(answer.status);
      }
      const reporters = await cluster.owner.query('SELECT DISTINCT reporter_id FROM user_reports');
      samples.push({ stage: 'reports', statuses, reporters: reporters.rows.map(row => row.reporter_id) });
      const refused = statuses.filter(s => s === 429 || (s >= 400 && s < 500 && s !== 404)).length;
      assert.ok(refused > 0, `12 back-to-back reports against one user all answered ${JSON.stringify(statuses)}: no throttle exists`);
      assert.deepEqual(reporters.rows.map(row => row.reporter_id), [state.bUser],
        'a body-supplied userId moved the stored reporter away from the session user');
    });

    await step('a malformed block reference answers 4xx, not 500', async () => {
      const answer = await ask(state.b.context.request, 'POST', '/api/blocks', { body: { blockedId: 'not-a-uuid' } });
      samples.push({ stage: 'blocks', status: answer.status, body: answer.body });
      assert.ok([400, 403, 404, 409, 422].includes(answer.status),
        `a non-UUID blockedId answered ${answer.status} "${answer.body}"; a database constraint must not surface as the answer`);
    });

    await step('a post cannot embed another account upload folder', async () => {
      const foreign = `https://res.cloudinary.com/${CLOUD_NAME}/image/styld/${state.aUser}/qa-leak/v1`;
      const own = `https://res.cloudinary.com/${CLOUD_NAME}/image/styld/${state.bUser}/qa-own/v1`;
      const answer = await ask(state.b.context.request, 'POST', '/api/social/posts',
        { body: { postType: 'inspo', caption: 'Boundary probe: does the server know whose image folder this is?', mediaUrls: [foreign] } });
      const rows = await cluster.owner.query('SELECT id, media_urls FROM social_posts WHERE author_user_id = $1', [state.bUser]);
      if (answer.status < 400 && rows.rows.some(row => String(row.media_urls).includes(String(state.aUser)))) {
        await cluster.owner.query('DELETE FROM social_posts WHERE id = ANY($1::uuid[])', [rows.rows.map(row => row.id)]);
      }
      const ownPost = await ask(state.b.context.request, 'POST', '/api/social/posts',
        { body: { postType: 'inspo', caption: 'Boundary positive control: own folder image.', mediaUrls: [own] } });
      // Two shapes that must not slip past the folder check: a transformation segment in front of
      // the author's own folder (legitimate, must still be accepted), and an encoded traversal that
      // reads as own-folder on paper but folds to a foreign object at delivery.
      const transformed = await ask(state.b.context.request, 'POST', '/api/social/posts',
        { body: { postType: 'inspo', caption: 'Own folder with a transformation.', mediaUrls: [`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_400/styld/${state.bUser}/qa-own/v1`] } });
      const encoded = await ask(state.b.context.request, 'POST', '/api/social/posts',
        { body: { postType: 'inspo', caption: 'Encoded traversal probe.', mediaUrls: [`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/styld/${state.bUser}/..%2F..%2F${state.aUser}/pic.jpg`] } });
      samples.push({ stage: 'media-url', foreign: { status: answer.status, body: answer.body }, own: { status: ownPost.status },
        transformed: { status: transformed.status }, encoded: { status: encoded.status, body: encoded.body } });
      assert.ok(answer.status >= 400,
        `the server accepted another account's image folder (${answer.status}); validMediaUrl never checks the path below the cloud name`);
      assert.equal(ownPost.status, 201, `positive control: own-folder media must be accepted (${ownPost.status} ${ownPost.body})`);
      assert.equal(transformed.status, 201, `a transformed own-folder address was refused (${transformed.status} ${transformed.body})`);
      assert.ok(encoded.status >= 400, `an encoded traversal past the own folder was accepted (${encoded.status})`);
      if (ownPost.status === 201) {
        const cleanup = await cluster.owner.query('DELETE FROM social_posts WHERE author_user_id = $1', [state.bUser]);
        void cleanup;
      }
    });

    await step('one provider cannot reach another provider records, and a service tag proves ownership', async () => {
      const otherId = randomUUID();
      const otherWorkspace = randomUUID();
      await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)',
        [otherId, 'authz-provider-other@example.test', 'QA Other Studio']);
      await cluster.owner.query('INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)',
        [otherWorkspace, otherId, 'professional', JSON.stringify({ displayName: 'QA Other Studio' })]);
      const otherService = (await cluster.owner.query(
        'INSERT INTO services(id,workspace_id,provider_id,name,price,category,is_active) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id',
        [randomUUID(), otherWorkspace, otherId, 'QA Other Knotless', '3000.00', 'QA Boundary'])).rows[0].id;
      const otherPending = (await cluster.owner.query(
        `INSERT INTO social_posts(author_user_id,author_workspace_id,author_name,author_role,post_type,caption,visibility,publication_status,moderation_status)
         VALUES($1,$2,$3,'professional','portfolio',$4,'public','pending','visible') RETURNING id`,
        [otherId, otherWorkspace, 'QA Other Studio', 'Another provider unpublished post.'])).rows[0].id;
      state.otherService = otherService;

      const readPending = await ask(state.b.context.request, 'GET', `/api/social/posts/${otherPending}`);
      assert.ok(REFUSALS.includes(readPending.status), `B provider read another provider unpublished post with ${readPending.status}`);
      const injected = await ask(state.b.context.request, 'POST', '/api/services',
        { body: { name: 'QA Injected Workspace', price: 900, category: 'QA Boundary', workspaceId: otherWorkspace } });
      assert.ok([200, 201].includes(injected.status), `the provider positive control must create (${injected.status} ${injected.body})`);
      const stored = await cluster.owner.query(
        "SELECT workspace_id, provider_id FROM services WHERE name = $1", ['QA Injected Workspace']);
      assert.equal(String(stored.rows[0].workspace_id), String(state.bProWorkspace),
        `a body-supplied workspaceId moved the row to ${stored.rows[0].workspace_id}; it must stay in the session workspace`);
      assert.equal(String(stored.rows[0].provider_id), String(state.bUser));

      const foreignTag = await ask(state.b.context.request, 'POST', '/api/social/posts',
        { body: { postType: 'inspo', caption: 'Trying to claim another provider service.', tags: [`svc:${otherService}`] } });
      assert.equal(foreignTag.status, 403, `B tagged another workspace service and got ${foreignTag.status} "${foreignTag.body}"`);
      const ownService = (await cluster.owner.query('SELECT id FROM services WHERE provider_id = $1 LIMIT 1', [state.bUser])).rows[0].id;
      const ownTag = await ask(state.b.context.request, 'POST', '/api/social/posts',
        { body: { postType: 'inspo', caption: 'Own service tag positive control.', tags: [`svc:${ownService}`] } });
      assert.equal(ownTag.status, 201, `positive control: own service tag must be accepted (${ownTag.status} ${ownTag.body})`);
      await cluster.owner.query('DELETE FROM social_posts WHERE author_user_id = $1', [state.bUser]);
    });

    await step('salon workspaces obey the same walls, and inactive states and suspension refuse', async () => {
      const salonWorkspace = randomUUID();
      await cluster.owner.query('INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)',
        [salonWorkspace, state.bUser, 'salon', JSON.stringify({ displayName: 'QA Boundary Salon' })]);
      const toSalon = await ask(state.b.context.request, 'POST', '/api/auth/session', { body: { workspaceId: salonWorkspace } });
      assert.equal(toSalon.status, 200, `B switching to its own salon workspace was refused (${toSalon.status} ${toSalon.body})`);
      const salonService = await ask(state.b.context.request, 'POST', '/api/services',
        { body: { name: 'QA Salon Service', price: 1800, category: 'QA Boundary' } });
      assert.ok([200, 201].includes(salonService.status), `positive control: a salon workspace must be able to list (${salonService.status} ${salonService.body})`);

      const victimSalonId = randomUUID();
      const victimSalonWorkspace = randomUUID();
      await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)',
        [victimSalonId, 'authz-salon-victim@example.test', 'QA Victim Salon']);
      await cluster.owner.query('INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)',
        [victimSalonWorkspace, victimSalonId, 'salon', JSON.stringify({ displayName: 'QA Victim Salon' })]);
      const victimPost = (await cluster.owner.query(
        `INSERT INTO social_posts(author_user_id,author_workspace_id,author_name,author_role,post_type,caption,visibility,publication_status,moderation_status)
         VALUES($1,$2,$3,'salon','portfolio',$4,'public','pending','visible') RETURNING id`,
        [victimSalonId, victimSalonWorkspace, 'QA Victim Salon', 'A salon unpublished post.'])).rows[0].id;
      const victimRead = await ask(state.b.context.request, 'GET', `/api/social/posts/${victimPost}`);
      assert.ok(REFUSALS.includes(victimRead.status), `salon B read another salon unpublished post with ${victimRead.status}`);
      const askVictim = await ask(state.b.context.request, 'POST', '/api/discussion-requests', {
        body: { providerWorkspaceId: victimSalonWorkspace, note: 'Salon to salon probe across the boundary.' } });
      assert.equal(askVictim.status, 403, `B salon asked through the client-only creation rule and got ${askVictim.status}`);

      // The workspace table only ever holds active or suspended rows; pending and rejected are states
      // of the application, so boundary 8 is measured where those states really live.
      await cluster.owner.query(
        `INSERT INTO workspace_applications(user_id,role,name,description,contact,status)
         VALUES($1,'professional',$2,$3,$4,'pending')`,
        [state.aUser, 'QA Pending Studio', 'Boundary application probe.', 'a@example.test']);
      const pendingDeny = await ask(state.a.context.request, 'POST', '/api/services',
        { body: { name: 'QA Pending Try', price: 100, category: 'QA Boundary' } });
      assert.ok(REFUSALS.includes(pendingDeny.status), `a pending application let A act as a provider (${pendingDeny.status})`);
      await cluster.owner.query(`UPDATE workspace_applications SET status = 'rejected' WHERE user_id = $1 AND role = 'professional'`, [state.aUser]);
      const rejectedDeny = await ask(state.a.context.request, 'POST', '/api/services',
        { body: { name: 'QA Rejected Try', price: 100, category: 'QA Boundary' } });
      assert.ok(REFUSALS.includes(rejectedDeny.status), `a rejected application let A act as a provider (${rejectedDeny.status})`);
      await cluster.owner.query(`DELETE FROM workspace_applications WHERE user_id = $1 AND role = 'professional'`, [state.aUser]);

      // A suspended workspace leaves the session's active list, so switching into it must refuse,
      // and lifting the suspension must restore the switch.
      await cluster.owner.query(`UPDATE identity_workspaces SET status = 'suspended' WHERE id = $1`, [state.bProWorkspace]);
      try {
        const toSuspended = await ask(state.b.context.request, 'POST', '/api/auth/session', { body: { workspaceId: state.bProWorkspace } });
        assert.equal(toSuspended.status, 403, `switching into a suspended workspace answered ${toSuspended.status} "${toSuspended.body}"`);
      } finally {
        await cluster.owner.query(`UPDATE identity_workspaces SET status = 'active' WHERE id = $1`, [state.bProWorkspace]);
      }
      const backActive = await ask(state.b.context.request, 'POST', '/api/auth/session', { body: { workspaceId: state.bProWorkspace } });
      assert.equal(backActive.status, 200, `positive control: lifting the suspension must restore the switch (${backActive.status} ${backActive.body})`);

      await cluster.owner.query('UPDATE users SET auth_suspended = true WHERE id = $1', [state.aUser]);
      try {
        const suspendedMe = await ask(state.a.context.request, 'GET', '/api/me');
        assert.ok(REFUSALS.includes(suspendedMe.status), `a suspended account still read its profile with ${suspendedMe.status}`);
        const suspendedPlan = await ask(state.a.context.request, 'GET', '/api/plan');
        assert.ok(REFUSALS.includes(suspendedPlan.status), `a suspended account still read its plan with ${suspendedPlan.status}`);
      } finally {
        await cluster.owner.query('UPDATE users SET auth_suspended = false WHERE id = $1', [state.aUser]);
      }
      const restored = await ask(state.a.context.request, 'GET', '/api/me');
      assert.equal(restored.status, 200, `positive control: lifting the suspension must restore the session (${restored.status})`);
    });

    await step('no refusal in this audit leaked an email, a credential shape or a database internal', async () => {
      const leaks = [];
      const banned = ['@example.test', 'postgres', 'password', 'secret', 'syntax error', 'duplicate key',
        'violates', 'constraint', 'auth_sessions', 'token'];
      for (const answer of answers) {
        if (answer.status < 400) continue;
        const haystack = `${answer.body} ${answer.method}`.toLowerCase();
        for (const needle of banned) {
          if (haystack.includes(needle)) leaks.push(`${answer.method} ${answer.path} ${answer.status} contains "${needle}"`);
        }
      }
      samples.push({ stage: 'leak-sweep', refusals: answers.filter(a => a.status >= 400).length, leaks });
      assert.deepEqual(leaks, [], `refusals said too much: ${leaks.join(' | ')}`);
    });

    await step('nothing in this audit created a booking or touched a payment record', async () => {
      const bookings = Number((await cluster.owner.query('SELECT count(*)::text AS n FROM bookings')).rows[0].n);
      const payments = Number((await cluster.owner.query('SELECT count(*)::text AS n FROM payment_logs')).rows[0].n);
      assert.equal(bookings, 0, `${bookings} booking rows exist, so a commitment path ran`);
      assert.equal(payments, 0, `${payments} payment rows exist`);
    });

    await step('no page in this run produced a client-side error', async () => {
      assert.deepEqual(errors, []);
    });

    notes.push('middleware.ts authenticates no /api route: every refusal above is earned by the route itself or '
      + 'by the same-origin and no-store rules in middleware. The anonymous step proves none of it is a guess.');
    notes.push('the revoke and workspace-switch steps assert against the database, not only the HTTP answer, '
      + 'because a DELETE that answers ok:true while matching zero rows is still a refusal.');
    notes.push('the four finding-shaped steps assert the security requirement rather than the current behavior: '
      + 'analytics capping, report throttling, block input validation and the Cloudinary folder check in '
      + 'validMediaUrl. A FAIL on those lines is the reproduced finding, matching the register decision that '
      + 'a defect is named rather than hidden.');
    notes.push('verifySession ignores its token argument (lib/auth-server.ts:4) and mislabels an admin-without-MFA '
      + 'as 401 on the routes that use it; that is a correctness finding recorded in the register, and the '
      + 'MFA-gate step above measures the fail-closed outcome, not the label.');
    notes.push('uploads remain refused by the pending-media policy in this environment (no provider attestation, '
      + 'no unrestricted declaration), so the upload route was probed for its refusal, not its happy path. '
      + 'The media step seeds nothing into media_manifests; the uniform-404 refusal for an unknown asset is what '
      + 'an attacker can actually observe.');
    notes.push('the provider was seeded with SQL like plan-catalogue-order does; B later received a real '
      + 'professional workspace so the provider-role positive control ran through the honest switch route.');

    const failed = results.filter(item => item.status === 'fail');
    const receipt = {
      instrument: 'tests/browser/live-authz-boundary.cjs',
      conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 '
        + 'disposable cluster with 015/016 applied from the migration chain, two real email-OTP client sessions, '
        + 'one seeded professional, no route interception, nothing reaching a non-loopback host',
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      commit: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      origin: base,
      clusterIdentity: cluster.identity,
      steps: results,
      passed: results.length - failed.length,
      failed: failed.length,
      samples,
      answers: answers.slice(0, 400),
      notes,
      browserErrors: errors,
      appServerLogTail: serverLog.join('').slice(-4000),
    };
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(`receipt ${receipt.passed}/${results.length} passed -> ${receiptPath}`);
    if (receipt.failed) process.exitCode = 1;
  } finally {
    await teardown();
  }
})().catch(error => {
  console.error('authz boundary audit failed:', String(error.message || error).split('\n')[0]);
  process.exitCode = 1;
}).then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
