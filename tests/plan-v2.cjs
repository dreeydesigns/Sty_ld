const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}})`, { Date, Set, Map, URL, Response, Headers, process: { env: {} } })((name) => name in deps ? deps[name] : require(name), module, module.exports);
  return module.exports;
}
const contract = load('lib/plan-v2.ts');
const catalogue = load('lib/site-data.ts');
const looks = load('lib/look-contract.ts');
const { emptyPlanFields, planFields, PlanError } = contract;
const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const clientA = id(1), clientB = id(2), p1 = id(11), p2 = id(12), p3 = id(13), p4 = id(14), inactive = id(15);
const s1 = id(21), s2 = id(22), removed = id(23), post1 = id(31), wrongPost = id(32), hiddenPost = id(33);
const fields = (patch = {}) => ({ ...emptyPlanFields(), ...patch });
const plain = (value) => JSON.parse(JSON.stringify(value));

test('Version 2 validates dates, bounds, strict fields, shortlist order and leading-choice removal', () => {
  assert.equal(contract.validPlanDate('2028-02-29'), true);
  for (const date of ['2027-02-29', '2026-02-30', '2026-13-01', 'tomorrow']) assert.equal(contract.validPlanDate(date), false);
  for (const patch of [{ preferredDate: '2026-02-30' }, { timeWindow: 'now' }, { timeWindow: ['morning'] }, { serviceMode: ['salon'] }, { serviceMode: 'guaranteed' }, { locationArea: '<script>' }, { locationArea: 'x'.repeat(121) },
    { serviceIds: ['one', 'one'] }, { serviceIds: Array.from({ length: 11 }, (_, n) => id(100 + n)) }, { shortlistProviderWorkspaceIds: [p1, p2, p3, p4] }, { shortlistProviderWorkspaceIds: [p1, p1] }, { revision: 100 }, { price: 1 }]) {
    assert.throws(() => planFields(fields(patch)), PlanError);
  }
  const previous = fields({ shortlistProviderWorkspaceIds: [p2, p1, p3], leadingChoiceProviderWorkspaceId: p1 });
  assert.deepEqual(plain(planFields(previous).shortlistProviderWorkspaceIds), [p2, p1, p3]);
  assert.equal(planFields({ ...previous, shortlistProviderWorkspaceIds: [p2, p3] }, previous).leadingChoiceProviderWorkspaceId, null);
  assert.equal(planFields({ ...previous, shortlistProviderWorkspaceIds: [p2, p3], leadingChoiceProviderWorkspaceId: p3 }, previous).leadingChoiceProviderWorkspaceId, p3);
  assert.throws(() => planFields(fields({ shortlistProviderWorkspaceIds: [p1], leadingChoiceProviderWorkspaceId: p2 })), PlanError);
  assert.equal(planFields(fields({ locationArea: '  South   B  ' })).locationArea, 'South B');
});

test('Plan repository and authenticated API use real in-memory PostgreSQL, never QA', async (t) => {
  const db = new PGlite();
  await db.exec(`CREATE TABLE identity_workspaces (id uuid PRIMARY KEY, user_id text, role text, status text, profile jsonb NOT NULL DEFAULT '{}');
    CREATE TABLE services (id uuid PRIMARY KEY, workspace_id uuid, is_active boolean, name text, price numeric, category text, duration_minutes integer);
    CREATE TABLE social_posts (id uuid PRIMARY KEY, author_user_id text, author_workspace_id uuid, author_name text, author_slug text, author_role text,
      post_type text, caption text, tags text[], media_urls text[], visibility text, publication_status text, moderation_status text, deleted_at timestamp, created_at timestamp DEFAULT now());`);
  for (const [workspace, user, role, status] of [[clientA, 'a', 'client', 'active'], [clientB, 'b', 'client', 'active'], [p1, 'p1', 'professional', 'active'], [p2, 'p2', 'salon', 'active'], [p3, 'p3', 'professional', 'active'], [p4, 'p4', 'salon', 'active'], [inactive, 'p5', 'professional', 'suspended']]) {
    await db.query('INSERT INTO identity_workspaces VALUES ($1,$2,$3,$4,$5)', [workspace, user, role, status, JSON.stringify({ firstName: role === 'client' ? 'Client' : 'Provider', serviceMode: workspace === p2 ? 'Mobile' : 'Both', theme: 'natural', savedPostIds: [post1] })]);
  }
  for (const [service, owner, active] of [[s1, p1, true], [s2, p2, true], [removed, p1, false]]) await db.query('INSERT INTO services (id,workspace_id,is_active,name,price,category,duration_minutes) VALUES ($1,$2,$3,$4,2000,$5,60)', [service, owner, active, `Service ${service}`, 'Hair']);
  for (const [post, service, published] of [[post1, s1, 'published'], [wrongPost, s2, 'published'], [hiddenPost, s1, 'pending']]) {
    await db.query(`INSERT INTO social_posts (id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status) VALUES ($1,'p1',$2,'Provider','professional','portfolio','Test only',$3,ARRAY[]::text[],'public',$4,'visible')`, [post, p1, [`svc:${service}`], published]);
  }
  const query = async (sql, values) => { const result = await db.query(sql, values); return { ...result, rowCount: /^SELECT/i.test(sql.trim()) ? result.rows.length : result.affectedRows }; };
  let turn = Promise.resolve();
  const pool = { query, async connect() { const previous = turn; let release; turn = new Promise((r) => { release = r; }); await previous; return { query, release }; } };
  const repo = load('lib/plan-repository.ts', { '@/lib/auth-database': { authPool: pool }, '@/lib/site-data': catalogue, '@/lib/look-contract': looks, '@/lib/plan-v2': contract, '@/lib/plan-offer.cjs': require('../lib/plan-offer.cjs') });
  const reset = () => db.query("UPDATE identity_workspaces SET profile = profile - 'activePlan'");
  try {
    await t.test('authoritative Look handoff, service ownership and supported modes', async () => {
      const data = await repo.loadPlan(clientA, 'a', post1, p1);
      assert.equal(data.services.find((service) => service.id === s1).durationMinutes, 60);
      assert.equal(data.services.find((service) => service.id === s1).providerName, 'Provider');
      assert.equal(data.handoff.look.serviceId, s1); assert.equal(data.handoff.creator.workspaceId, p1);
      assert.equal((await repo.loadPlan(clientA, 'a', post1, p2)).handoff, null);
      assert.equal((await repo.loadPlan(clientA, 'a', wrongPost, p1)).handoff, null);
      assert.equal((await repo.loadPlan(clientA, 'a', hiddenPost, p1)).handoff, null);
      await assert.rejects(repo.updatePlan(clientA, 'a', 0, fields({ creatorWorkspaceId: p1, serviceIds: [s2] })), /not offered/);
      await assert.rejects(repo.updatePlan(clientA, 'a', 0, fields({ serviceIds: [removed] })), /unavailable/);
      await assert.rejects(repo.updatePlan(clientA, 'a', 0, fields({ creatorWorkspaceId: p2, serviceIds: [s2], serviceMode: 'salon' })), /not supported/);
      const saved = await repo.updatePlan(clientA, 'a', 0, fields({ lookPostId: post1, creatorWorkspaceId: p1, serviceIds: [s1], serviceMode: 'mobile' }));
      assert.equal(saved.plan.revision, 1);
      assert.equal((await repo.loadPlan(clientA, 'a')).look.postId, post1);
      await reset();
    });
    await t.test('atomic revision checks, two tabs, clear and stale restoration preserve all other profile fields', async () => {
      const [one, two] = await Promise.all([
        repo.updatePlan(clientA, 'a', 0, fields({ serviceIds: [s1], locationArea: 'Kilimani' })),
        repo.updatePlan(clientA, 'a', 0, fields({ serviceIds: [s2], locationArea: 'South B' })),
      ]);
      assert.equal(one.conflict, false); assert.equal(two.conflict, true);
      assert.equal(two.plan.locationArea, 'Kilimani');
      const cleared = await repo.updatePlan(clientA, 'a', 1, fields());
      assert.equal(cleared.plan.revision, 2); assert.deepEqual(plain(cleared.plan.serviceIds), []);
      assert.equal((await repo.updatePlan(clientA, 'a', 1, fields({ serviceIds: [s1] }))).conflict, true);
      const profile = (await db.query('SELECT profile FROM identity_workspaces WHERE id=$1', [clientA])).rows[0].profile;
      assert.deepEqual(profile.savedPostIds, [post1]); assert.equal(profile.theme, 'natural'); assert.equal(profile.firstName, 'Client');
      assert.deepEqual(Object.keys(profile.activePlan).sort(), [...Object.keys(emptyPlanFields()), 'revision', 'updatedAt'].sort());
      await reset();
    });
    await t.test('account/workspace isolation and invalid provider references fail closed', async () => {
      await assert.rejects(repo.loadPlan(clientA, 'b'), /client workspace/);
      await assert.rejects(repo.updatePlan(clientA, 'b', 0, fields()), /client workspace/);
      await assert.rejects(repo.updatePlan(p1, 'p1', 0, fields()), /client workspace/);
      for (const provider of [clientB, inactive, id(999)]) await assert.rejects(repo.updatePlan(clientA, 'a', 0, fields({ shortlistProviderWorkspaceIds: [provider] })), /unavailable/);
      await repo.updatePlan(clientA, 'a', 0, fields({ shortlistProviderWorkspaceIds: [p3, p1, p2], leadingChoiceProviderWorkspaceId: p1 }));
      assert.equal((await repo.loadPlan(clientB, 'b')).plan.revision, 0);
      const saved = (await repo.loadPlan(clientA, 'a')).plan;
      assert.deepEqual(plain(saved.shortlistProviderWorkspaceIds), [p3, p1, p2]);
      const next = await repo.updatePlan(clientA, 'a', 1, fields({ shortlistProviderWorkspaceIds: [p3, p2], leadingChoiceProviderWorkspaceId: p1 }));
      assert.equal(next.plan.leadingChoiceProviderWorkspaceId, null);
      assert.equal((await repo.updatePlan(clientA, 'a', 1, fields({ shortlistProviderWorkspaceIds: [p3, p1, p2], leadingChoiceProviderWorkspaceId: p1 }))).conflict, true);
      await reset();
    });
    await t.test('catalogue interests are validated without storing invented prices or provider claims', async () => {
      await assert.rejects(repo.updatePlan(clientA, 'a', 0, fields({ serviceIds: ['made-up'] })), /unavailable/);
      const saved = await repo.updatePlan(clientA, 'a', 0, fields({ serviceIds: ['knotless-braids'] }));
      assert.equal(saved.plan.creatorWorkspaceId, null);
      const data = await repo.loadPlan(clientA, 'a');
      assert.equal(data.services.find((service) => service.id === 'knotless-braids').price, null);
      assert.doesNotMatch(JSON.stringify(saved.plan), /price|displayName|verified|availability/i);
      await reset();
    });
    await t.test('inactive/removed content does not erase unaffected preferences or reveal unpublished content', async () => {
      await repo.updatePlan(clientA, 'a', 0, fields({ lookPostId: post1, creatorWorkspaceId: p1, serviceIds: [s1], locationArea: 'Westlands' }));
      await db.query('UPDATE services SET is_active=false WHERE id=$1', [s1]);
      const data = await repo.loadPlan(clientA, 'a'); assert.equal(data.look, null); assert.equal(data.plan.locationArea, 'Westlands');
      const next = await repo.updatePlan(clientA, 'a', 1, fields({ lookPostId: post1, creatorWorkspaceId: p1, serviceIds: [s1], locationArea: 'Westlands', preferredDate: '2028-02-29' }));
      assert.equal(next.plan.locationArea, 'Westlands');
      await db.query('UPDATE services SET is_active=true WHERE id=$1', [s1]); await reset();
    });
    await t.test('API derives ownership from authenticated session, requires same origin and rejects forged authority fields', async () => {
      class AuthError extends Error { constructor(message, statusCode = 401) { super(message); this.statusCode = statusCode; } }
      let session = { userId: 'a', workspaceId: clientA, workspace: { role: 'client' } };
      const NextResponse = { json: (body, init) => new Response(JSON.stringify(body), init) };
      const auth = { AuthError, requireAuthenticatedUser: async () => { if (!session) throw new AuthError('Sign in'); return session; } };
      const security = load('lib/api-security.ts', { 'next/server': { NextResponse }, './auth-resolver': auth });
      const api = load('app/api/plan/route.ts', { 'next/server': { NextResponse }, '@/lib/auth-resolver': auth, '@/lib/api-security': security, '@/lib/plan-repository': repo, '@/lib/plan-v2': contract });
      const request = (body, origin = true) => new Request('http://localhost/api/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': `"plan:${clientA}:${body.expectedRevision}"`, ...(origin ? { Origin: 'http://localhost' } : {}) }, body: JSON.stringify(body) });
      const update = { expectedRevision: 0, plan: fields({ serviceIds: [s1] }) };
      assert.equal((await api.PUT(request(update, false))).status, 403);
      assert.equal((await api.PUT(request({ ...update, workspaceId: clientB }))).status, 400);
      assert.equal((await api.PUT(request({ ...update, plan: { ...update.plan, price: 1 } }))).status, 400);
      assert.equal((await api.PUT(request({ ...update, plan: { ...update.plan, timeWindow: ['morning'] } }))).status, 400);
      assert.equal((await api.PUT(request(update))).status, 200);
      assert.equal((await api.PUT(request(update))).status, 409);
      session = { userId: 'b', workspaceId: clientB, workspace: { role: 'client' } };
      assert.equal((await api.PUT(request(update))).status, 412, 'a stale tab cannot write into a newly selected workspace');
      session = { userId: 'a', workspaceId: clientA, workspace: { role: 'client' } };
      const get = await api.GET(new Request('http://localhost/api/plan')); assert.equal(get.headers.get('cache-control'), 'no-store');
      session = null;
      assert.equal((await api.GET(new Request('http://localhost/api/plan'))).status, 401);
      assert.equal((await api.PUT(request(update))).status, 401);
      session = { userId: 'p1', workspaceId: p1, workspace: { role: 'professional' } };
      assert.equal((await api.GET(new Request('http://localhost/api/plan'))).status, 403);
    });
  } finally { await db.close(); }
});
