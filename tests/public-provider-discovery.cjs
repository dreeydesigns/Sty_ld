const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, process, Response, Request, URL, Date })(name => name in deps ? deps[name] : require(name), module, module.exports);
  return module.exports;
}
const policy = load('lib/public-discovery.ts', {
  '@/lib/site-data': { marketAreas: ['Westlands', 'Kilimani', 'Karen', 'Lavington', 'South B', 'South C', 'Parklands', 'Ruaka', 'Thika Road'] },
  '@/lib/plan-offer.cjs': require('../lib/plan-offer.cjs'),
});
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('real SQL publishes only opted-in approved available providers and their active offers', async () => {
  const db = new PGlite();
  await db.exec(`CREATE TABLE users(id uuid,auth_suspended boolean,suspended boolean,deletion_status text);
    CREATE TABLE identity_workspaces(id uuid,user_id uuid,role text,status text,profile jsonb,created_at timestamptz DEFAULT now());
    CREATE TABLE workspace_applications(user_id uuid,role text,status text);
    CREATE TABLE services(id uuid,workspace_id uuid,name text,category text,price numeric,duration_minutes integer,is_active boolean);`);
  const cases = [
    {}, { consent: false }, { consent: 'true' }, { approval: 'pending' }, { approval: 'rejected' },
    { role: 'client' }, { status: 'suspended' }, { authSuspended: true }, { suspended: true },
    { deletion: 'pending' }, { deletion: 'deleted' }, { stamp: false }, { area: '123 private street' },
  ];
  try {
    for (let n = 0; n < cases.length; n++) {
      const c = cases[n];
      const profile = { displayName: 'Published provider', specialty: 'Hair', publicArea: c.area || 'Kilimani', publicDiscoveryEnabled: c.consent === undefined ? true : c.consent, phone: '+254-private', bio: 'Private biography', profilePhoto: 'https://private.example.test/photo' };
      if (c.stamp !== false) profile.publicDiscoveryChangedAt = '2026-11-05T00:00:00Z';
      await db.query('INSERT INTO users VALUES($1,$2,$3,$4)', [uid(n + 1), !!c.authSuspended, !!c.suspended, c.deletion || 'active']);
      await db.query('INSERT INTO identity_workspaces(id,user_id,role,status,profile) VALUES($1,$2,$3,$4,$5)', [uid(n + 101), uid(n + 1), c.role || 'professional', c.status || 'active', JSON.stringify(profile)]);
      await db.query('INSERT INTO workspace_applications VALUES($1,$2,$3)', [uid(n + 1), c.role || 'professional', c.approval || 'approved']);
      await db.query('INSERT INTO services VALUES($1,$2,$3,$4,$5,$6,true)', [uid(n + 201), uid(n + 101), 'Actual service', 'Hair', '1500.50', 45]);
    }
    await db.query('INSERT INTO services VALUES($1,$2,$3,$4,$5,$6,false)', [uid(999), uid(101), 'Inactive service', 'Hair', 900, 30]);
    await db.exec(`CREATE TABLE social_posts(id uuid,author_user_id uuid,author_workspace_id uuid,author_name text,author_slug text,author_role text,post_type text,caption text,tags text[],media_urls text[],visibility text,publication_status text,moderation_status text,created_at timestamptz,deleted_at timestamptz);
      INSERT INTO social_posts SELECT id,user_id,id,'Published name',NULL,role,'tip','Public post',ARRAY[]::text[],ARRAY[]::text[],'public','published','visible',now(),NULL FROM identity_workspaces;`);
    const feed = load('app/api/social/posts/route.ts', {
      'next/server': { NextResponse: Response }, '@/lib/auth-database': { authPool: db },
      '@/lib/public-discovery': policy, '@/lib/auth-resolver': {}, '@/lib/api-security': {},
      '@/lib/look-contract': { serviceIdFromTags: () => null, buildCanonicalLook: () => null },
    });
    const publicFeed = await feed.GET(new Request('https://example.test/api/social/posts'));
    assert.equal(publicFeed.status, 200);
    assert.equal((await publicFeed.json()).posts.length, 1, 'feed SQL excludes unapproved, Client and opted-out authors');
    const result = await policy.readPublicDiscovery(db);
    assert.equal(result.providers.length, 1);
    assert.equal(result.services.length, 1);
    assert.equal(result.services[0].price, 1500.5);
    assert.equal(result.services[0].durationMinutes, 45);
    assert.deepEqual(Object.keys(result.providers[0]).sort(), ['area', 'displayName', 'role', 'specialty', 'workspaceId']);
    for (const forbidden of ['phone', 'bio', 'profilePhoto', 'rating', 'reviewCount', 'verified', 'user_id']) assert.equal(JSON.stringify(result).includes(forbidden), false);
    const alien = await db.query(policy.PROVIDER_PUBLICATION_UPDATE, [uid(101), uid(2), false, null]);
    assert.equal(alien.affectedRows, 0, 'body-selected or foreign ownership cannot withdraw someone else');
    await db.query(policy.PROVIDER_PUBLICATION_UPDATE, [uid(101), uid(1), false, null]);
    assert.equal((await policy.readPublicDiscovery(db)).providers.length, 0, 'withdrawal removes provider and offers');
    assert.equal((await (await feed.GET(new Request('https://example.test/api/social/posts'))).json()).posts.length, 0, 'withdrawal also hides existing public feed entries');
    const pending = await db.query(policy.PROVIDER_PUBLICATION_UPDATE, [uid(104), uid(4), true, 'Kilimani']);
    assert.equal(pending.affectedRows, 0, 'pending applications cannot opt into publication');
    await db.query(policy.PROVIDER_PUBLICATION_UPDATE, [uid(101), uid(1), true, 'Kilimani']);
    assert.equal((await policy.readPublicDiscovery(db)).providers.length, 1);
    await db.query("UPDATE users SET auth_suspended=true WHERE id=$1", [uid(1)]);
    assert.equal((await policy.readPublicDiscovery(db)).providers.length, 0, 'suspension hides an existing consent immediately');
  } finally { await db.close(); }
});

test('publication route rejects forged identity, non-booleans, Client workspaces and non-listed locations', async () => {
  class AuthError extends Error { constructor(message, statusCode = 401) { super(message); this.statusCode = statusCode; } }
  let actor = { userId: uid(1), workspaceId: uid(101), workspace: { role: 'professional' } };
  const calls = [];
  let auditFailure = false;
  const client = { release() {}, query: async (sql, args) => {
    calls.push({ sql, args });
    if (auditFailure && sql.startsWith('INSERT INTO security_events')) throw new Error('audit failed');
    return { rowCount: 1 };
  } };
  const endpoint = load('app/api/providers/publication/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/public-discovery': policy,
    '@/lib/auth-database': { authPool: { connect: async () => client, query: async () => ({ rows: [{ profile: { publicDiscoveryEnabled: true, publicArea: 'Kilimani' }, listed: false }] }) } },
    '@/lib/auth-resolver': { AuthError, requireAuthenticatedUser: async () => { if (!actor) throw new AuthError('Sign in.'); return actor; } },
    '@/lib/api-security': { sameOrigin: () => {}, authError: error => Response.json({ error: error.message }, { status: error.statusCode || 500 }) },
  });
  const submit = body => endpoint.PATCH(new Request('https://example.test/api/providers/publication', { method: 'PATCH', body: JSON.stringify(body) }));
  for (const body of [{ enabled: 'true', area: 'Kilimani' }, { enabled: true, area: '123 private street' }, { enabled: true, area: 'Kilimani', userId: uid(2) }, { enabled: true, area: 'Kilimani', publicDiscoveryChangedAt: 'forged' }]) assert.equal((await submit({ expectedWorkspaceId: uid(101), ...body })).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await submit({ enabled: true, area: 'Kilimani', expectedWorkspaceId: uid(102) })).status, 409);
  assert.equal(calls.length, 0, 'a stale workspace must be rejected before any write');
  const consent = await submit({ enabled: true, area: 'Kilimani', expectedWorkspaceId: uid(101) });
  assert.equal(consent.status, 200);
  const consentBody = await consent.json();
  assert.equal(consentBody.enabled, true);
  assert.equal(consentBody.listed, false, 'saved consent alone does not prove public eligibility');
  assert.equal(consentBody.workspaceId, uid(101));
  const update = calls.find(call => call.sql.startsWith('UPDATE identity_workspaces'));
  assert.deepEqual(Array.from(update.args), [uid(101), uid(1), true, 'Kilimani']);
  const audit = calls.find(call => call.sql.startsWith('INSERT INTO security_events'));
  assert.equal(audit.args[0], uid(1));
  assert.equal(JSON.parse(audit.args[1]).workspaceId, uid(101));
  assert.equal(calls.at(-1).sql, 'COMMIT');
  auditFailure = true;
  assert.equal((await submit({ enabled: false, expectedWorkspaceId: uid(101) })).status, 500);
  assert.equal(calls.at(-1).sql, 'ROLLBACK', 'audit failure must roll back publication preference');
  auditFailure = false;
  actor = { ...actor, workspace: { role: 'client' } };
  assert.equal((await submit({ enabled: false })).status, 403);
  actor = null;
  assert.equal((await submit({ enabled: false })).status, 401);
});

test('public discovery is available to guests and backend errors are an unavailable state', async () => {
  let fail = false;
  const endpoint = load('app/api/providers/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/auth-database': { authPool: {} },
    '@/lib/public-discovery': { readPublicDiscovery: async () => { if (fail) throw new Error('private connection detail'); return { providers: [], services: [] }; } },
  });
  assert.equal((await endpoint.GET()).status, 200);
  fail = true;
  const response = await endpoint.GET();
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('private connection detail'), false);
});

test('creator endpoint uses the same publication eligibility and never exposes old private fields', async () => {
  let published = false;
  const endpoint = load('app/api/creators/[workspaceId]/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/auth-database': { authPool: {} },
    '@/lib/public-discovery': { readPublicDiscovery: async (_db, id) => ({ providers: published ? [{ workspaceId: id, role: 'professional', displayName: 'Public name', specialty: 'Hair', area: 'Kilimani' }] : [], services: [] }) },
  });
  const context = { params: Promise.resolve({ workspaceId: uid(101) }) };
  assert.equal((await endpoint.GET(null, context)).status, 404);
  published = true;
  const response = await endpoint.GET(null, context);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(payload.creator).sort(), ['displayName', 'location', 'role', 'specialty', 'workspaceId']);
  assert.equal(payload.creator.location, 'Kilimani');
});

test('direct service API delegates eligibility and exposes only server-backed offer fields', async () => {
  const endpoint = load('app/api/services/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/auth-database': { authPool: {} },
    'next/headers': {}, '@/lib/auth-server': {}, '@/lib/auth-resolver': {}, '@/lib/api-security': {},
    '@/lib/public-discovery': { readPublicDiscovery: async () => ({ providers: [], services: [{ id: uid(201), workspaceId: uid(101), name: 'Actual service', category: 'Hair', price: null, durationMinutes: 30 }] }) },
  });
  const response = await endpoint.GET();
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(payload.services[0].price, null, 'no invented fallback price');
  assert.deepEqual(Object.keys(payload.services[0]).sort(), ['category', 'duration_minutes', 'id', 'name', 'price', 'workspace_id']);
});
