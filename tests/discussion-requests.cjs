/**
 * JOURNEY-05, the non-binding request to discuss.
 *
 * Runs lib/discussion-requests.ts against the reviewed schema plus migration 016 inside an
 * embedded PostgreSQL, then drives the two API routes through the same real store. The point is
 * to prove the boundaries a tester will exercise: only a client may ask, only the provider that
 * received the request may answer, only the sender may withdraw, one open request per pair, five
 * a day, blocks win, expiry cannot be answered, and an accepted discussion still is not a booking.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const MIGRATION = 'sql/migrations/016_discussion_requests.sql';
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const C = '10000000-0000-4000-8000-000000000001';
const CW = '20000000-0000-4000-8000-000000000001';
const P1 = '10000000-0000-4000-8000-000000000002';
const PW1 = '20000000-0000-4000-8000-000000000002';
const P2 = '10000000-0000-4000-8000-000000000003';
const PW2 = '20000000-0000-4000-8000-000000000003';
const PW3 = '20000000-0000-4000-8000-000000000004';
const PW4 = '20000000-0000-4000-8000-000000000005';
const PW5 = '20000000-0000-4000-8000-000000000006';
const PW6 = '20000000-0000-4000-8000-000000000007';
const SHOP = '20000000-0000-4000-8000-000000000008';
const LOOK = '30000000-0000-4000-8000-000000000001';
const LOOK_PENDING = '30000000-0000-4000-8000-000000000002';
const LOOK_FOREIGN = '30000000-0000-4000-8000-000000000003';
const SVC_ACTIVE = '40000000-0000-4000-8000-000000000001';
const SVC_INACTIVE = '40000000-0000-4000-8000-000000000002';
const SVC_FOREIGN = '40000000-0000-4000-8000-000000000003';

const NOTE = 'I would like to talk about soft glam for a wedding in December.';

let engine;

async function database() {
  if (!engine) {
    const { PGlite } = require('@electric-sql/pglite');
    engine = new PGlite();
  }
  await engine.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  await engine.exec(read('tests/fixtures/review-schema.sql'));
  await engine.exec(read(MIGRATION));

  for (const [id, name, role] of [
    [C, 'Amina', 'client'], [P1, 'Wanjiru', 'professional'], [P2, 'Zawadi', 'salon'],
    ['10000000-0000-4000-8000-000000000004', 'Nia', 'professional'],
    ['10000000-0000-4000-8000-000000000005', 'Thandi', 'professional'],
    ['10000000-0000-4000-8000-000000000006', 'Lulu', 'professional'],
    ['10000000-0000-4000-8000-000000000007', 'Sanaa', 'professional'],
  ]) {
    await engine.query('INSERT INTO users (id, first_name, role) VALUES ($1, $2, $3)', [id, name, role]);
  }
  for (const [id, userId, role, profile] of [
    [CW, C, 'client', {}],
    [PW1, P1, 'professional', { displayName: 'Wanjiru Studio' }],
    [PW2, P2, 'salon', { salonName: 'Sage Salon' }],
    [PW3, '10000000-0000-4000-8000-000000000004', 'professional', {}],
    [PW4, '10000000-0000-4000-8000-000000000005', 'professional', {}],
    [PW5, '10000000-0000-4000-8000-000000000006', 'professional', {}],
    [PW6, '10000000-0000-4000-8000-000000000007', 'professional', {}],
    [SHOP, P1, 'shop', {}],
  ]) {
    await engine.query('INSERT INTO identity_workspaces (id, user_id, role, status, profile) VALUES ($1, $2, $3, $4, $5)', [id, userId, role, 'active', profile]);
  }
  for (const [id, user, workspace, status, visibility] of [
    [LOOK, P1, PW1, 'published', 'public'],
    [LOOK_PENDING, P1, PW1, 'pending', 'public'],
    [LOOK_FOREIGN, P2, PW2, 'published', 'public'],
  ]) {
    await engine.query(
      `INSERT INTO social_posts (id, author_user_id, author_workspace_id, author_name, author_role, post_type, caption, visibility, publication_status)
       VALUES ($1, $2, $3, 'Fixture creator', 'professional', 'portfolio', 'Fixture look', $4, $5)`,
      [id, user, workspace, visibility, status],
    );
  }
  for (const [id, workspace, active] of [
    [SVC_ACTIVE, PW1, true], [SVC_INACTIVE, PW1, false], [SVC_FOREIGN, PW2, true],
  ]) {
    await engine.query(
      'INSERT INTO services (id, provider_id, workspace_id, name, price, is_active) VALUES ($1, $2, $3, $4, 1500, $5)',
      [id, P1, workspace, 'Knotless braids', active],
    );
  }
  return engine;
}

const clientActor = {
  userId: C, workspaceId: CW, role: 'client', workspaces: [{ id: CW, role: 'client' }],
};
const providerActor = {
  userId: P1, workspaceId: PW1, role: 'professional', workspaces: [{ id: PW1, role: 'professional' }],
};
const otherProviderActor = {
  userId: P2, workspaceId: PW2, role: 'salon', workspaces: [{ id: PW2, role: 'salon' }],
};

function loadModule(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}})`)(() => {
    throw new Error('Unexpected dependency');
  }, module, module.exports);
  return module.exports;
}

let lib;
function api() {
  if (!lib) lib = loadModule('lib/discussion-requests.ts');
  return lib;
}

async function refusal(run) {
  try {
    await run();
    return null;
  } catch (error) {
    return error;
  }
}

test('migration 016 adds the request table with every bound the application also checks', async () => {
  const db = await database();
  const names = (await db.query(
    `SELECT con.conname FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'discussion_requests' AND con.contype IN ('c', 'f', 'p') ORDER BY con.conname`,
  )).rows.map((row) => row.conname);
  for (const name of [
    'discussion_requests_note_length', 'discussion_requests_own_workspace',
    'discussion_requests_response_recorded', 'discussion_requests_response_order',
    'discussion_requests_expiry_order', 'discussion_requests_client_user_id_fkey',
    'discussion_requests_provider_workspace_id_fkey',
  ]) {
    assert.ok(names.includes(name), `${name} belongs in the store, not only in the caller`);
  }
  const indexes = (await db.query("SELECT indexdef FROM pg_indexes WHERE tablename = 'discussion_requests'")).rows.map((row) => row.indexdef);
  assert.ok(indexes.some((def) => def.includes("WHERE (status = 'requested'::text)")), 'one open request per pair is a database rule');
});

test('a client request is stored as non-binding interest with no appointment and no price', async () => {
  const db = await database();
  const now = new Date(Date.now() - 60_000);
  const result = await api().createDiscussionRequest(db, clientActor, {
    providerWorkspaceId: PW1, note: `  ${NOTE}  `, lookPostId: LOOK, serviceId: SVC_ACTIVE,
  }, now);
  assert.equal(result.created, true);
  assert.equal(result.request.status, 'requested');
  assert.equal(result.request.respondedAt, null);
  assert.equal(result.request.note, NOTE);
  assert.equal(result.request.lookPostId, LOOK);
  assert.equal(result.request.serviceId, SVC_ACTIVE);
  assert.equal(result.request.providerName, 'Wanjiru Studio');
  assert.equal(result.request.clientName, 'Amina');
  assert.equal(result.request.createdAt, now.toISOString());
  const days = (new Date(result.request.expiresAt).getTime() - now.getTime()) / 86_400_000;
  assert.ok(days > 13 && days < 15, 'an open request expires in about two weeks');
  const stored = (await db.query('SELECT status, count(*) AS n FROM discussion_requests GROUP BY status')).rows;
  assert.deepEqual(stored.map((row) => [row.status, Number(row.n)]), [['requested', 1]]);
});

test('a retried send returns the same open request instead of a duplicate', async () => {
  const db = await database();
  const first = await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE });
  const again = await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: `Different words. ${NOTE}` });
  assert.equal(again.created, false);
  assert.equal(again.request.id, first.request.id);
  assert.equal(again.request.note, NOTE);
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM discussion_requests')).rows[0].n), 1);
});

test('only an active client workspace can ask, and the note is bounded', async () => {
  const db = await database();
  assert.equal((await refusal(() => api().createDiscussionRequest(db, providerActor, { providerWorkspaceId: PW1, note: NOTE }))).statusCode, 403);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, { ...clientActor, workspaceId: null }, { providerWorkspaceId: PW1, note: NOTE }))).statusCode, 403);
  const missing = await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: 'too short' }));
  assert.equal(missing.statusCode, 400);
  assert.match(missing.message, /at least 10/);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: 'x'.repeat(601) }))).statusCode, 400);
  const exact = await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: 'y'.repeat(600) });
  assert.equal(exact.request.note.length, 600);
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM discussion_requests')).rows[0].n), 1);
});

test('the provider must exist, be active, be a professional or salon, and not be the caller', async () => {
  const db = await database();
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: 'not-a-uuid', note: NOTE }))).statusCode, 400);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: '99999999-9999-4999-8999-999999999999', note: NOTE }))).statusCode, 404);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: SHOP, note: NOTE }))).statusCode, 404, 'a shop cannot receive discussion requests');
  await db.query("UPDATE identity_workspaces SET status = 'suspended' WHERE id = $1", [PW3]);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW3, note: NOTE }))).statusCode, 404);
  const selfActor = { userId: P1, workspaceId: CW, role: 'client', workspaces: [{ id: CW, role: 'client' }, { id: PW1, role: 'professional' }] };
  assert.equal((await refusal(() => api().createDiscussionRequest(db, selfActor, { providerWorkspaceId: PW1, note: NOTE }))).statusCode, 403);
});

test('a Look or service reference must belong to the provider and still be live', async () => {
  const db = await database();
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE, lookPostId: LOOK_PENDING }))).statusCode, 400);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE, lookPostId: LOOK_FOREIGN }))).statusCode, 400);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE, serviceId: SVC_INACTIVE }))).statusCode, 400);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE, serviceId: SVC_FOREIGN }))).statusCode, 400);
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM discussion_requests')).rows[0].n), 0);
});

test('a block in either direction stops the request before anything is written', async () => {
  const db = await database();
  await db.query('INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2)', [P1, C]);
  const blocked = await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE }));
  assert.equal(blocked.statusCode, 403);
  await db.query('DELETE FROM user_blocks');
  await db.query('INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2)', [C, P1]);
  assert.equal((await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE }))).statusCode, 403);
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM discussion_requests')).rows[0].n), 0);
});

test('a client may send five requests in a day and the sixth is refused', async () => {
  const db = await database();
  for (const workspaceId of [PW1, PW2, PW3, PW4, PW5]) {
    await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: workspaceId, note: NOTE });
  }
  const sixth = await refusal(() => api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW6, note: NOTE }));
  assert.equal(sixth.statusCode, 429);
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM discussion_requests')).rows[0].n), 5);
});

test('only the receiving provider may accept or decline, and only the sender may withdraw', async () => {
  const db = await database();
  const { request } = await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE });
  assert.equal((await refusal(() => api().respondToDiscussionRequest(db, otherProviderActor, request.id, 'accept'))).statusCode, 403);
  assert.equal((await refusal(() => api().respondToDiscussionRequest(db, clientActor, request.id, 'accept'))).statusCode, 403);
  assert.equal((await refusal(() => api().respondToDiscussionRequest(db, providerActor, request.id, 'withdraw'))).statusCode, 403);
  assert.equal((await refusal(() => api().respondToDiscussionRequest(db, providerActor, request.id, 'approve'))).statusCode, 400);

  const accepted = await api().respondToDiscussionRequest(db, providerActor, request.id, 'accept');
  assert.equal(accepted.status, 'discussion_accepted');
  assert.ok(accepted.respondedAt);
  assert.equal((await refusal(() => api().respondToDiscussionRequest(db, providerActor, request.id, 'decline'))).statusCode, 409);

  const second = await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW2, note: NOTE });
  const withdrawn = await api().respondToDiscussionRequest(db, clientActor, second.request.id, 'withdraw');
  assert.equal(withdrawn.status, 'withdrawn');
  assert.equal((await refusal(() => api().respondToDiscussionRequest(db, otherProviderActor, second.request.id, 'accept'))).statusCode, 409);
});

test('a request past its window expires on read and can never be accepted after that', async () => {
  const db = await database();
  const { request } = await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE });
  const later = new Date(Date.now() + 15 * 86_400_000);
  await api().listDiscussionRequests(db, clientActor, later);
  const stored = (await db.query('SELECT status, responded_at FROM discussion_requests')).rows[0];
  assert.equal(stored.status, 'expired');
  assert.ok(stored.responded_at);

  const fresh = await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW2, note: NOTE });
  const expired = await refusal(() => api().respondToDiscussionRequest(db, otherProviderActor, fresh.request.id, 'accept', later));
  assert.equal(expired.statusCode, 409);
  assert.equal((await db.query('SELECT status FROM discussion_requests WHERE id = $1', [fresh.request.id])).rows[0].status, 'expired');
});

test('each side lists only what it is allowed to see', async () => {
  const db = await database();
  await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW1, note: NOTE });
  await api().createDiscussionRequest(db, clientActor, { providerWorkspaceId: PW2, note: 'Second note for the salon.' });

  const client = await api().listDiscussionRequests(db, clientActor);
  assert.equal(client.sent.length, 2);
  assert.equal(client.received.length, 0);
  assert.deepEqual(client.sent.map((row) => row.providerName).sort(), ['Sage Salon', 'Wanjiru Studio']);

  const provider = await api().listDiscussionRequests(db, providerActor);
  assert.equal(provider.sent.length, 0);
  assert.deepEqual(provider.received.map((row) => row.id), [client.sent.find((row) => row.providerName === 'Wanjiru Studio').id]);

  const stranger = await api().listDiscussionRequests(db, { userId: '10000000-0000-4000-8000-000000000005', workspaceId: PW4, role: 'professional', workspaces: [{ id: PW4, role: 'professional' }] });
  assert.equal(stranger.sent.length, 0);
  assert.equal(stranger.received.length, 0);
});

// ── API routes, driven through the same real store ────────────────────────────

function routes(db) {
  const discussion = api();
  let session;
  let originAllowed = true;
  const audit = [];
  class AuthError extends Error {
    constructor(message, statusCode = 401) { super(message); this.statusCode = statusCode; }
  }
  const deps = {
    'next/server': { NextRequest: Request, NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/auth-resolver': { AuthError, requireAuthenticatedUser: async () => {
      if (!session) throw new AuthError('Unauthorized', 401);
      return session;
    } },
    '@/lib/auth-database': { authPool: { query: (text, values) => db.query(text, values) } },
    '@/lib/api-security': {
      sameOrigin: () => { if (!originAllowed) throw new AuthError('Invalid request origin.', 403); },
      authError: (error) => Response.json({ ok: false, error: error.message }, { status: error.statusCode || 500 }),
    },
    '@/lib/security-events': { securityEvent: async (event, userId, headers, details) => { audit.push({ event, userId, details }); } },
    '@/lib/discussion-requests': discussion,
  };
  function load(file) {
    const code = ts.transpileModule(fs.readFileSync(path.join('app/api/discussion-requests', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext('(function(require,module,exports){' + code + '})', { Date, JSON, Promise, Response, Request, Object, Number, String, console })
      (name => deps[name], module, module.exports);
    return module.exports;
  }
  const collection = load('route.ts');
  const single = load('[id]/route.ts');
  const request = (body) => new Request('https://example.test/api/discussion-requests', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return {
    audit,
    setSession: (next) => { session = next; },
    setOrigin: (allowed) => { originAllowed = allowed; },
    get: () => collection.GET(),
    post: (body) => collection.POST(request(body)),
    decide: (id, body) => single.POST(request(body), { params: Promise.resolve({ id }) }),
  };
}

const clientSession = { userId: C, workspaceId: CW, role: 'client', workspaces: [{ id: CW, role: 'client' }] };
const providerSession = { userId: P1, workspaceId: PW1, role: 'professional', workspaces: [{ id: PW1, role: 'professional' }] };

test('the API refuses anonymous callers and cross-origin writes without touching the store', async () => {
  const db = await database();
  const api = routes(db);
  assert.equal((await api.get()).status, 401);
  assert.equal((await api.post({ providerWorkspaceId: PW1, note: NOTE })).status, 401);
  api.setSession(clientSession);
  api.setOrigin(false);
  assert.equal((await api.post({ providerWorkspaceId: PW1, note: NOTE })).status, 403);
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM discussion_requests')).rows[0].n), 0);
});

test('the API sends, lists and answers one request end to end', async () => {
  const db = await database();
  const api = routes(db);
  api.setSession(clientSession);

  const created = await api.post({ providerWorkspaceId: PW1, note: NOTE, lookPostId: LOOK });
  assert.equal(created.status, 201);
  const body = await created.json();
  assert.equal(body.ok, true);
  assert.equal(body.request.status, 'requested');

  const retried = await api.post({ providerWorkspaceId: PW1, note: NOTE });
  assert.equal(retried.status, 200);
  assert.equal((await retried.json()).request.id, body.request.id);

  const sent = await (await api.get()).json();
  assert.equal(sent.sent.length, 1);
  assert.equal(sent.received.length, 0);

  api.setSession({ userId: P2, workspaceId: PW2, role: 'salon', workspaces: [{ id: PW2, role: 'salon' }] });
  assert.equal((await api.decide(body.request.id, { action: 'accept' })).status, 403);
  assert.equal((await (await api.get()).json()).received.length, 0, 'a stranger sees an empty queue');

  api.setSession(providerSession);
  const received = await (await api.get()).json();
  assert.equal(received.received.length, 1);
  const accepted = await api.decide(body.request.id, { action: 'accept' });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).request.status, 'discussion_accepted');
  assert.equal((await api.decide(body.request.id, { action: 'decline' })).status, 409);

  assert.deepEqual(api.audit.map((entry) => entry.event), ['discussion_request_sent', 'discussion_request_discussion_accepted']);
  assert.equal(api.audit[0].userId, C);
  assert.equal(api.audit[0].details.requestId, body.request.id);
  assert.equal(api.audit[1].userId, P1);

  const row = (await db.query('SELECT count(*) AS n FROM bookings')).rows[0];
  assert.equal(Number(row.n), 0, 'accepting a discussion never creates a booking');
});
