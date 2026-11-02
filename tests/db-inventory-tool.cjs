/**
 * DB-ISO-01 (task #74). The beta database holds 42 tables, one user and no schema_migrations row,
 * so an `IF NOT EXISTS` clause in a migration file proves nothing about the shape already on the
 * server. scripts/db-inventory.mjs is the comparison the founder needs before approving any
 * migration, and it must be provably incapable of writing.
 *
 * Every case here runs offline: a fake connection object stands in for PostgreSQL, so the guards,
 * the parser and the comparison are exercised without a database, without a network and without a
 * single write.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const MODULE = pathToFileURL(path.join(ROOT, 'scripts', 'db-inventory.mjs')).href;

const load = () => import(MODULE);

const fixture = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'styld-db-inventory-'));
  for (const [name, sql] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), sql, 'utf8');
  return dir;
};

const liveRow = (table, column, overrides = {}) => ({
  table_name: table,
  column_name: column,
  ordinal_position: 1,
  data_type: 'text',
  is_nullable: 'YES',
  column_default: null,
  character_maximum_length: null,
  ...overrides,
});

test('importing the inventory tool reads no database and exits nothing', async () => {
  const previous = process.env.POSTGRES_URL;
  delete process.env.POSTGRES_URL;
  try {
    const tool = await load();
    for (const name of ['expectedFromMigrations', 'assertReadOnly', 'inventoryQueries', 'readLiveSchema', 'indexRows', 'compareSchemas', 'run', 'assertUrlAllowed', 'typesAgree', 'rlsSummary', 'assertReportPath', 'SNAPSHOT_INSTRUCTION']) {
      assert.ok(tool[name], `db-inventory.mjs must export ${name} so it can be tested offline`);
    }
    assert.equal(typeof tool.run, 'function');
  } finally {
    if (previous !== undefined) process.env.POSTGRES_URL = previous;
  }
});

test('every statement the tool can send is a read', async () => {
  const tool = await load();
  for (const [name, sqlText] of Object.entries(tool.inventoryQueries)) {
    assert.equal(tool.assertReadOnly(name, sqlText), true, `${name} must pass its own guard`);
    assert.match(sqlText, /current_schema\(\)|current_schema/, `${name} must stay inside the connected schema`);
    assert.doesNotMatch(sqlText, /\b(limit|offset)\s+\d/i, 'an inventory must not silently truncate itself');
  }
  assert.equal(tool.assertReadOnly('pragma', tool.READ_ONLY_PRAGMA), true, 'the read-only pragma is the one non-SELECT statement, and it can only restrict');
});

test('the guard refuses anything that could change the database', async () => {
  const tool = await load();
  const refusals = [
    ['insert', "SELECT 1; INSERT INTO users (id) VALUES ('x')"],
    ['update', 'SELECT * FROM users; UPDATE users SET role = ' + "'admin'"],
    ['delete', 'WITH picked AS (SELECT id FROM users) DELETE FROM users WHERE id IN (SELECT id FROM picked)'],
    ['drop', 'SELECT 1 WHERE 1=1 UNION SELECT 2;\nDROP TABLE bookings'],
    ['bare write', 'ALTER TABLE users ADD COLUMN hacked text'],
    ['set outside the pragma', 'SET statement_timeout TO 0'],
    ['function that writes', 'SELECT setval(' + "'users_id_seq', 100)"],
    ['vacuum', 'SELECT 1; VACUUM FULL users'],
  ];
  for (const [kind, sqlText] of refusals) {
    assert.throws(() => tool.assertReadOnly(kind, sqlText), /refuses to send/, `${kind} must be refused`);
  }

  // The indexes inventory matches on the text PostgreSQL stores, so a quoted CREATE is data, not a
  // command, and the guard has to tell the two apart.
  assert.equal(tool.assertReadOnly('quoted', "SELECT indexdef LIKE 'CREATE UNIQUE%' AS is_unique FROM pg_indexes"), true);
  assert.equal(tool.assertReadOnly('comment', "SELECT 1 -- drop table users\n"), true);
});

test('the real migration chain parses into the shape the beta is expected to have', async () => {
  const tool = await load();
  const expected = tool.expectedFromMigrations(path.join(ROOT, 'sql', 'migrations'));
  assert.equal(expected.sources.length, 16, 'every numbered migration file is read');
  assert.ok(Object.keys(expected.tables).length >= 40, 'the chain describes the 42 tables the founder reported');
  for (const [table, slot] of Object.entries(expected.tables)) {
    assert.equal(table, table.toLowerCase(), `${table} must be matched case insensitively`);
    assert.ok(Object.keys(slot.columns).length > 0, `${table} has no columns parsed, so the comparison would be vacuous`);
    assert.ok(slot.indexes.length >= 0);
  }
  for (const table of ['users', 'sessions', 'bookings', 'reviews', 'media_manifests', 'discussion_requests']) {
    assert.ok(expected.tables[table], `the chain must describe ${table}`);
  }
  assert.ok(expected.tables.users.columns.email, 'users.email is the column the whole product hangs on');
  assert.ok(expected.tables.media_manifests.columns.state, 'the media manifest state machine is compared too');

  // A later migration that relaxes an earlier one must be reflected, or the tool invents drift.
  assert.equal(expected.tables.users.columns.phone.notNull, false, '005 and 010 drop the NOT NULL on users.phone');
  assert.equal(expected.tables.whatsapp_auth_challenges.columns.verification_sid.definition.includes('varchar(100)'), true, '007 widens verification_sid');
});

test('a migration file is read for the shape it asks for, not the comment around it', async () => {
  const tool = await load();
  const dir = fixture({
    '001_a.sql': [
      '-- create the first table',
      'CREATE TABLE IF NOT EXISTS "Widget" (',
      '  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
      '  label character varying(24) NOT NULL,',
      '  note text,',
      '  created_at timestamp with time zone NOT NULL DEFAULT now(),',
      '  CONSTRAINT widget_label_unique UNIQUE (label)',
      ');',
      'CREATE UNIQUE INDEX IF NOT EXISTS widget_note_idx ON "Widget" (note);',
      '',
    ].join('\n'),
    '002_b.sql': [
      'ALTER TABLE widget ADD COLUMN IF NOT EXISTS score numeric(6,2) DEFAULT 0;',
      'ALTER TABLE widget ALTER COLUMN note SET NOT NULL;',
      'ALTER TABLE widget ALTER COLUMN created_at DROP NOT NULL;',
      'ALTER TABLE widget DROP COLUMN label;',
      'CREATE INDEX widget_score_idx ON widget (score DESC);',
    ].join('\n'),
  });
  const expected = tool.expectedFromMigrations(dir);
  assert.deepEqual(Object.keys(expected.tables), ['widget']);
  const columns = expected.tables.widget.columns;
  assert.deepEqual(Object.keys(columns).sort(), ['created_at', 'id', 'note', 'score']);
  assert.equal(columns.id.primaryKey, true);
  assert.equal(columns.id.hasDefault, true);
  assert.equal(columns.id.type, 'uuid');
  assert.equal(columns.created_at.type, 'timestamp with time zone');
  assert.equal(columns.created_at.notNull, false, 'the later ALTER DROP NOT NULL wins');
  assert.equal(columns.note.notNull, true, 'the later ALTER SET NOT NULL wins');
  assert.equal(columns.score.type, 'numeric');
  assert.equal(columns.score.source, '002_b.sql');
  assert.equal(columns.label, undefined, 'a dropped column is not expected to exist');
  assert.deepEqual(expected.tables.widget.indexes.map((index) => [index.name, index.unique]), [['widget_note_idx', true], ['widget_score_idx', false]]);
  assert.equal(expected.tables.widget.constraints.length, 1, 'the table level UNIQUE is recorded once, not swallowed by the column list');
  // PostgreSQL builds an index for every PRIMARY KEY and UNIQUE it is asked for, under a name the
  // file never writes. Those names are recognised, and they are kept out of `indexes`, because the
  // tool must not turn around and claim the live database is missing a constraint it never read.
  assert.deepEqual(expected.tables.widget.constraintIndexes.map((index) => index.name).sort(), ['widget_label_unique', 'widget_pkey']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('spellings PostgreSQL rewrites are not reported as drift', async () => {
  const tool = await load();
  const agreeing = [
    ['serial', 'integer'],
    ['bigserial', 'bigint'],
    ['varchar', 'character varying'],
    ['bool', 'boolean'],
    ['timestamptz', 'timestamp with time zone'],
    ['int8', 'bigint'],
    ['numeric', 'numeric'],
    ['uuid', 'uuid'],
    // information_schema calls every array `array` and every TIME `time without time zone`. Before
    // these were understood, a database built by the chain alone reported ten columns as drift.
    ['text[]', 'array'],
    ['time', 'time without time zone'],
    ['timestamp', 'timestamp without time zone'],
  ];
  for (const [wanted, found] of agreeing) {
    assert.equal(tool.typesAgree(wanted, found), true, `${wanted} should satisfy ${found}`);
  }
  const drift = [
    ['text', 'character varying'],
    ['uuid', 'text'],
    ['integer', 'bigint'],
    ['boolean', 'integer'],
    ['jsonb', 'text'],
    ['text[]', 'text'],
    ['text', 'array'],
  ];
  for (const [wanted, found] of drift) {
    assert.equal(tool.typesAgree(wanted, found), false, `${wanted} is not ${found}`);
  }
});

test('the chain names the indexes a live PostgreSQL server builds for its own constraints', async () => {
  const tool = await load();
  const expected = tool.expectedFromMigrations(path.join(ROOT, 'sql', 'migrations'));
  // These five names are ones a live server made and an earlier reader called "created by no
  // migration file": the primary keys PostgreSQL names by itself, the two UNIQUE spellings it
  // derives from the column, and the constraint that only exists inside a DO block guard.
  const derived = (table) => expected.tables[table].constraintIndexes.map((index) => index.name);
  assert.ok(derived('users').includes('users_pkey'), JSON.stringify(derived('users')));
  assert.ok(derived('users').includes('users_email_key'), JSON.stringify(derived('users')));
  assert.ok(derived('users').includes('uq_users_clerk_user_id'), '006 adds it inside a DO block, so the name has to be read from there');
  assert.ok(derived('mfa_methods').includes('uq_mfa_methods_user_type'), JSON.stringify(derived('mfa_methods')));
  assert.ok(derived('bookings').includes('bookings_pkey'), JSON.stringify(derived('bookings')));
  assert.equal(expected.tables.users.columns.clerk_user_id.source, '006_clerk_canonical_user.sql');

  // The array and TIME spellings the chain uses are kept as the chain wrote them, so the reader can
  // line them up against what information_schema calls them.
  assert.equal(expected.tables.posts.columns.images.type, 'text[]');
  assert.equal(expected.tables.bookings.columns.booking_time.type, 'time');

  // A live index that matches a derived name is not drift, and without that name it is. This is the
  // before-and-after pair for the same difference.
  const liveWith = tool.indexRows({
    columns: [liveRow('widget', 'id', { data_type: 'uuid', is_nullable: 'NO' })],
    indexes: [{ table_name: 'widget', index_name: 'widget_pkey', is_unique: true }],
    constraints: [],
  });
  const wanted = { widget: { columns: { id: { type: 'uuid', notNull: true, primaryKey: true, hasDefault: false, source: '001.sql' } }, indexes: [], constraintIndexes: [{ name: 'widget_pkey', source: '001.sql' }] } };
  assert.deepEqual(tool.compareSchemas(wanted, liveWith).drift, [], 'the derived name is recognised');
  delete wanted.widget.constraintIndexes;
  assert.equal(tool.compareSchemas(wanted, liveWith).drift.length, 1, 'without it the same index reads as drift');
});

test('a matching live schema produces no drift and no invented findings', async () => {
  const tool = await load();
  const expected = {
    posts: { columns: { id: { type: 'uuid', notNull: false, primaryKey: true, hasDefault: true, source: '001.sql' }, body: { type: 'text', notNull: true, primaryKey: false, hasDefault: false, source: '001.sql' } }, indexes: [{ name: 'posts_body_idx', unique: false }] },
  };
  const live = tool.indexRows({
    columns: [liveRow('posts', 'id', { data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' }), liveRow('posts', 'body', { data_type: 'text', is_nullable: 'NO' })],
    indexes: [{ table_name: 'posts', index_name: 'posts_body_idx', is_unique: false }],
    constraints: [],
  });
  const comparison = tool.compareSchemas(expected, live);
  assert.equal(comparison.matches, true, JSON.stringify(comparison));
  assert.deepEqual(comparison.drift, []);
  assert.deepEqual(comparison.missingTables, []);
  assert.deepEqual(comparison.extraTables, []);
});

test('each way a live database can disagree with the chain is named separately', async () => {
  const tool = await load();
  const expected = {
    posts: {
      columns: {
        id: { type: 'uuid', notNull: false, primaryKey: true, hasDefault: true, source: '001.sql' },
        body: { type: 'text', notNull: true, hasDefault: false, source: '001.sql' },
        pinned: { type: 'boolean', notNull: false, hasDefault: false, source: '002.sql' },
        visibility: { type: 'varchar', notNull: false, hasDefault: false, source: '002.sql' },
        deleted_at: { type: 'timestamptz', notNull: false, hasDefault: false, source: '002.sql' },
      },
      indexes: [{ name: 'posts_body_idx', unique: true }, { name: 'posts_missing_idx', unique: false }],
    },
    gone_away: { columns: { id: { type: 'uuid', notNull: false, hasDefault: false } }, indexes: [] },
  };
  const live = tool.indexRows({
    columns: [
      liveRow('posts', 'id', { data_type: 'uuid', is_nullable: 'NO', column_default: null }),
      liveRow('posts', 'body', { data_type: 'text', is_nullable: 'YES' }),
      liveRow('posts', 'pinned', { data_type: 'integer' }),
      liveRow('posts', 'visibility', { data_type: 'character varying', is_nullable: 'NO' }),
      liveRow('posts', 'legacy_column', { data_type: 'text' }),
    ],
    indexes: [
      { table_name: 'posts', index_name: 'posts_body_idx', is_unique: false },
      { table_name: 'posts', index_name: 'posts_handmade_idx', is_unique: true },
    ],
    constraints: [],
  });
  const comparison = tool.compareSchemas(expected, live);
  assert.equal(comparison.matches, false);
  assert.deepEqual(comparison.missingTables, ['gone_away']);
  assert.deepEqual(comparison.extraTables, [], 'a table both sides know is not an extra table');
  const problems = comparison.drift.map((item) => `${item.kind}:${item.name}:${item.problem}`).sort();
  assert.deepEqual(problems, [
    'column:body:the migration requires a value but the live column allows null',
    'column:id:the migration sets a default the live column does not have',
    'column:deleted_at:missing in the live database',
    'column:legacy_column:present in the live database but created by no migration file',
    'column:pinned:type differs',
    'column:visibility:the live column rejects nulls the migration does not ask for',
    'index:posts_body_idx:uniqueness differs',
    'index:posts_handmade_idx:present in the live database but created by no migration file',
    'index:posts_missing_idx:missing in the live database',
  ].sort());
});

test('the connection URL is described without its password and refused without a read-only role', async () => {
  const tool = await load();
  const url = 'postgresql://dreeydesigns:S3cr3t-Pass@ep-blue-1.neon.aws:5432/styld_beta?sslmode=require';
  assert.throws(() => tool.assertUrlAllowed(url), /not a read-only role/, 'the owner role needs an explicit flag');
  assert.deepEqual(tool.describeConnection(url), { hostname: 'ep-blue-1.neon.aws', port: '5432', database: 'styld_beta', user: 'dreeydesigns' });
  assert.doesNotMatch(JSON.stringify(tool.describeConnection(url)), /S3cr3t/, 'the password never leaves the parser');
  assert.equal(tool.assertUrlAllowed(url, { allowOwner: true }).user, 'dreeydesigns');
  for (const user of ['read_only', 'readonly', 'styld_reader', 'beta_ro']) {
    assert.equal(tool.assertUrlAllowed(`postgresql://${user}:pw@host/db`, { allowOwner: false }).user, user);
  }
  assert.throws(() => tool.assertUrlAllowed(''), /nothing was read/);
  assert.throws(() => tool.assertUrlAllowed('not a url'), /could not be parsed/);
});

test('run() reports through a fake connection and never names the secret it was given', async () => {
  const tool = await load();
  const sent = [];
  const rows = {
    columns: [liveRow('users', 'id', { data_type: 'uuid' })],
    indexes: [],
    constraints: [],
    rls: [{ table_name: 'users', rls_enforced: '1', policies: 3 }, { table_name: 'sessions', rls_enforced: '0', policies: 0 }],
    summary: [{ schema_name: 'public', connected_user: 'read_only', base_tables: 2 }],
  };
  const connect = async (urlValue) => {
    assert.equal(urlValue, 'postgresql://read_only:hunter2@ep-test.neon.aws/styld_beta?sslmode=require');
    return {
      query: async (sqlText) => {
        tool.assertReadOnly('harness', sqlText);
        sent.push(sqlText);
        const key = Object.entries(tool.inventoryQueries).find(([, text]) => text === sqlText);
        return { rows: key ? rows[key[0]] || [] : [] };
      },
      end: async () => {},
    };
  };
  const report = await tool.run({ url: 'postgresql://read_only:hunter2@ep-test.neon.aws/styld_beta?sslmode=require', migrationsDir: path.join(ROOT, 'sql', 'migrations'), allowOwner: false, connect });
  assert.equal(sent[0], tool.READ_ONLY_PRAGMA, 'the session is set read-only before any question is asked');
  assert.equal(sent.length, Object.keys(tool.inventoryQueries).length + 1);
  assert.equal(report.statementsSent.length, sent.length);
  assert.equal(report.matches, false, 'one table out of 42 is not a match');
  assert.equal(report.missingTables.length, Object.keys(tool.expectedFromMigrations(path.join(ROOT, 'sql', 'migrations')).tables).length - 1);
  assert.doesNotMatch(JSON.stringify(report), /hunter2/, 'the report must be safe to commit');
  assert.equal(report.connection.hostname, 'ep-test.neon.aws');
  assert.deepEqual(report.security, { tablesWithRls: ['users'], tablesWithoutRls: ['sessions'], policyCount: 3 });
  assert.match(report.snapshot, /recoverable/i);
  assert.equal(report.expectedFrom.migrationFiles.length, 16);
  assert.deepEqual(report.scope.compares, tool.COMPARISON_SCOPE.compares);
});

test('the report may only land under docs, and the flags are read from the arguments', async () => {
  const tool = await load();
  assert.equal(tool.assertReportPath(path.join('docs', 'readiness', 'beta', 'db-inventory.json')).includes('docs'), true);
  assert.throws(() => tool.assertReportPath(path.join('lib', 'db-inventory.json')), /must be written under docs/);
  assert.throws(() => tool.assertReportPath(path.join('sql', 'migrations', '017_x.sql')), /must be written under docs/);
  const parsed = tool.parseArgs(['--out', 'docs/x.json', '--migrations', 'sql/other', '--allow-owner']);
  assert.equal(parsed.out, 'docs/x.json');
  assert.equal(parsed.migrations, path.resolve('sql/other'));
  assert.equal(parsed.allowOwner, true);
  const defaults = tool.parseArgs([]);
  assert.equal(defaults.allowOwner, false);
  assert.equal(defaults.out, path.join('docs', 'readiness', 'beta', 'db-inventory.json'));
});

test('the snapshot prerequisite is written where whoever runs the migration will read it', async () => {
  const tool = await load();
  assert.match(tool.SNAPSHOT_INSTRUCTION, /snapshot/);
  assert.match(tool.SNAPSHOT_INSTRUCTION, /founder/);
  assert.match(tool.SNAPSHOT_INSTRUCTION, /precondition/);
  const plan = fs.readFileSync(path.join(ROOT, 'docs', 'readiness', 'beta', 'STYLD_HOSTED_BETA_ACTIVATION_PLAN.md'), 'utf8');
  assert.match(plan, /scripts\/db-inventory\.mjs/, 'the activation plan must point at the comparison tool');
  assert.ok(
    plan.indexOf('scripts/db-inventory.mjs') < plan.indexOf('7. Apply the chain'),
    'the schema comparison has to be read before the chain is applied, not after'
  );
  assert.ok(
    plan.indexOf('6. Take a recoverable snapshot') < plan.indexOf('7. Apply the chain'),
    'the snapshot step is numbered ahead of the apply step'
  );
  assert.match(plan, /IF NOT EXISTS/, 'the plan has to say why the clause is not proof');
});
