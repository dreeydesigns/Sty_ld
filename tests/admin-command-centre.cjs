const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const { PGlite } = require('@electric-sql/pglite');
class AuthError extends Error { constructor(message, statusCode = 401) { super(message); this.statusCode = statusCode; } }
const reviewPolicy = (() => { const module = { exports: {} }; const code = ts.transpileModule(fs.readFileSync('lib/application-review.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText; new Function('require', 'module', 'exports', code)(require, module, module.exports); return module.exports; })();
function load(file, db, denied = false) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const deps = {
    'next/server': { NextResponse: Response },
    '@/lib/application-review': reviewPolicy,
    '@/lib/auth-resolver': { AuthError, requireAdmin: async () => { if (denied) throw new AuthError('Administrator MFA required.', 403); return { userId: uid(99) }; } },
    '@/lib/auth-database': { authPool: db },
    '@/lib/api-security': { sameOrigin() {}, authError: error => Response.json({ error: error.message }, { status: error.statusCode || 500 }) },
    '@/lib/security-events': { securityEvent: async () => {} },
  };
  vm.runInNewContext('(function(require,module,exports){' + source + '})', { URL, Response })(name => deps[name], module, module.exports);
  return module.exports;
}
const uid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

test('Admin read APIs deny non-administrators and missing MFA before database access', async () => {
  let queries = 0;
  for (const file of ['app/api/admin/overview/route.ts', 'app/api/admin/applications/route.ts']) {
    const api = load(file, { query: async () => { queries++; } }, true);
    assert.equal((await api.GET(new Request('https://styld.test/api/admin'))).status, 403);
  }
  assert.equal(queries, 0);
});

test('application queue rejects unsupported filters, injection sorts and unbounded pages', async () => {
  let queries = 0;
  const api = load('app/api/admin/applications/route.ts', { query: async () => { queries++; } });
  for (const query of ['role=admin', 'status=verified', 'sort=created_at;DROP', 'page=-1', 'page=1.5', 'page=10001', 'q=' + 'a'.repeat(101), 'userId=forged', 'userId=' + uid(1)]) {
    assert.equal((await api.GET(new Request('https://styld.test/api/admin/applications?' + query))).status, 400, query);
  }
  assert.equal(queries, 0);
});

test('real SQL overview and application queues count only supported server records', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE users(id uuid PRIMARY KEY,role text,email_verified boolean,auth_suspended boolean DEFAULT false,suspended boolean DEFAULT false,deletion_status text DEFAULT 'active');
      CREATE TABLE workspace_applications(user_id uuid,role text,name text,description text,contact text,status text,created_at timestamptz DEFAULT now(),reviewed_by uuid,UNIQUE(user_id,role));
      CREATE TABLE identity_workspaces(id uuid DEFAULT gen_random_uuid(),user_id uuid,role text,status text DEFAULT 'active',profile jsonb,UNIQUE(user_id,role));
      CREATE TABLE user_roles(user_id uuid,role text,assigned_by_admin boolean,UNIQUE(user_id,role));
      CREATE TABLE social_posts(publication_status text,deleted_at timestamptz);
      CREATE TABLE security_events(id serial,user_id uuid,event text,details jsonb,created_at timestamptz DEFAULT now());`);
    await db.query("INSERT INTO users(id,role,email_verified) VALUES($1,'client',true),($2,'client',true),($3,'client',true)", [uid(1), uid(2), uid(3)]);
    await db.query("INSERT INTO workspace_applications(user_id,role,name,description,contact,status) VALUES($1,'professional','QA approved','Private description','Private contact','approved'),($2,'salon','QA pending salon','Salon details','Private contact','pending'),($3,'professional','QA pending professional','Professional details','Private contact','pending')", [uid(1),uid(2),uid(3)]);
    await db.query("INSERT INTO identity_workspaces(user_id,role,profile) VALUES($1,'professional','{}'),($2,'salon','{}')",[uid(1),uid(2)]);
    await db.exec("INSERT INTO social_posts VALUES('pending',NULL),('pending',now()),('published',NULL)");
    const overview = load('app/api/admin/overview/route.ts', db);
    const response = await overview.GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await response.json()).counts, { pending_professionals: 1, pending_salons: 1, approved_providers: 1, pending_content: 1 });
    const apps = load('app/api/admin/applications/route.ts', db);
    const filtered = await apps.GET(new Request('https://styld.test/api/admin/applications?role=salon&status=pending&q=salon'));
    const body = await filtered.json();
    assert.equal(body.total, 1);
    assert.equal(body.applications[0].role, 'salon');
    assert.equal(body.applications[0].status, 'pending');
    assert.deepEqual(Object.keys(body.applications[0]).sort(), ['contact','created_at','description','name','reviewVersion','role','status','user_id']);
    assert.equal((await (await apps.GET(new Request('https://styld.test/api/admin/applications?role=professional&status=approved'))).json()).applications.length, 1);
    await db.query('UPDATE users SET suspended=true WHERE id=$1',[uid(1)]);
    assert.equal((await (await overview.GET()).json()).counts.approved_providers, 0);
    const adapter = { connect: async () => ({ release() {}, query: async (sql,args) => { const result = await db.query(sql,args); return { ...result, rowCount: /^SELECT\b/i.test(sql.trim()) ? result.rows.length : result.affectedRows }; } }) };
    const decisions = load('app/api/admin/security/route.ts', adapter);
    let expectedReviewVersion = reviewPolicy.applicationReviewVersion((await db.query('SELECT user_id,role,name,description,contact FROM workspace_applications WHERE user_id=$1',[uid(3)])).rows[0]);
    const submit = extra => decisions.POST({ headers: new Headers(), json: async () => ({ action:'approve',userId:uid(3),role:'professional',reason:'Reviewed isolated application evidence',expectedReviewVersion,...extra }) });
    assert.equal((await submit({})).status, 400, 'approval requires both individual review checks');
    await db.query('UPDATE workspace_applications SET contact=$2 WHERE user_id=$1',[uid(3),'Updated private contact']);
    assert.equal((await submit({review:{applicationReviewed:true,contactReviewed:true}})).status,409,'changed application content requires a fresh individual review');
    assert.equal((await db.query('SELECT status FROM workspace_applications WHERE user_id=$1',[uid(3)])).rows[0].status,'pending');
    expectedReviewVersion = reviewPolicy.applicationReviewVersion((await db.query('SELECT user_id,role,name,description,contact FROM workspace_applications WHERE user_id=$1',[uid(3)])).rows[0]);
    await db.exec("ALTER TABLE security_events ADD CONSTRAINT reject_approval_audit CHECK(event<>'admin_approve')");
    assert.equal((await submit({review:{applicationReviewed:true,contactReviewed:true}})).status, 500);
    assert.equal((await db.query('SELECT status FROM workspace_applications WHERE user_id=$1',[uid(3)])).rows[0].status,'pending');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM user_roles WHERE user_id=$1',[uid(3)])).rows[0].n,0,'audit failure rolls back provider authority');
    await db.exec('ALTER TABLE security_events DROP CONSTRAINT reject_approval_audit');
    assert.equal((await submit({review:{applicationReviewed:true,contactReviewed:true}})).status, 200);
    assert.equal((await db.query('SELECT status FROM workspace_applications WHERE user_id=$1',[uid(3)])).rows[0].status,'approved');
    const audit = await db.query("SELECT details FROM security_events WHERE event='admin_approve'");
    assert.deepEqual(audit.rows[0].details.review,{applicationReviewed:true,contactReviewed:true});
    assert.equal(audit.rows[0].details.reviewVersion,expectedReviewVersion);
    assert.equal((await submit({review:{applicationReviewed:true,contactReviewed:true}})).status,409,'a duplicate approval cannot grant authority twice');
    const detail = await (await apps.GET(new Request('https://styld.test/api/admin/applications?role=professional&status=all&userId='+uid(3)))).json();
    assert.equal(detail.audit.length,1);
    assert.equal(detail.audit[0].reason,'Reviewed isolated application evidence');
  } finally { await db.close(); }
});

test('Admin routes use the dedicated protected shell and never mount local demonstration metrics', () => {
  const page = fs.readFileSync('app/admin/page.tsx','utf8');
  const layout = fs.readFileSync('app/admin/layout.tsx','utf8');
  assert.doesNotMatch(page,/AppShell|SuperAdminPanel|social-store/);
  assert.match(layout,/!s.admin/);
  assert.match(layout,/!s.mfaVerified/);
  assert.match(layout,/<AdminShell/);
  const shell = fs.readFileSync('components/admin-shell.tsx','utf8');
  assert.doesNotMatch(shell,/BottomMobileNav|client-session|social-store/);
  assert.match(shell,/Switch to Client/);
});

test('application review versions bind every mutable review field and target', () => {
  const record={user_id:uid(1),role:'professional',name:'QA application',description:'Reviewed details',contact:'Private contact'};
  const version=reviewPolicy.applicationReviewVersion(record);
  assert.match(version,/^[a-f0-9]{64}$/);
  assert.equal(reviewPolicy.applicationReviewVersion({...record}),version);
  for(const field of Object.keys(record))assert.notEqual(reviewPolicy.applicationReviewVersion({...record,[field]:record[field]+' changed'}),version,field);
});
