/**
 * scripts/db-inventory.mjs
 *
 * STYLD DB-ISO-01 (task #74). A read-only picture of what a database actually holds, compared with
 * what the migration chain says it should hold. The beta database has 42 tables, one user and no
 * schema_migrations row, so an `IF NOT EXISTS` clause in a migration file is not evidence that
 * applying the chain is safe: an existing table can carry a different column, type, nullability or
 * index from the one the chain expects, and the chain quietly leaves it in place.
 *
 * This tool never writes. It proves it in three ways: it refuses a connection whose user is not a
 * read-only role unless you pass --allow-owner, it sets the session read-only at the server before
 * anything is asked, and every statement is checked (must start with SELECT or WITH, must contain
 * no write keyword outside a string literal) before it is sent. It reports structure only, never
 * row contents, and it never prints the connection string.
 *
 * Everything here is a pure function of its arguments so the offline test can exercise it with no
 * database at all. Only run() touches the network, and only main() touches the filesystem.
 *
 * Usage (the founder runs this; it needs no code changes to the app):
 *   node --env-file=.env.local scripts/db-inventory.mjs --out docs/readiness/beta/db-inventory.json
 *   node --env-file=.env.local scripts/db-inventory.mjs --allow-owner
 *
 * Exit code 0 means the live schema matches the expected schema exactly. Exit code 1 means the two
 * differ, which is the answer to "can the chain be applied safely?" and not a crash. Exit code 2
 * means the tool could not run at all.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const READ_ONLY_PRAGMA = 'SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY';

const WRITE_WORDS = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|analyze|call|do|comment|reindex|cluster|refresh|lock|notify|setval|nextval)\b/i;

/** The only non-SELECT statement this tool sends, and it can only restrict, never widen. */
const PRAGMATIC_EXEMPTION = new Set([READ_ONLY_PRAGMA]);

/**
 * @param {string} name label used in the refusal message
 * @param {string} sqlText
 * @returns {true}
 * @throws if the statement is not provably a read
 */
export function assertReadOnly(name, sqlText) {
  if (PRAGMATIC_EXEMPTION.has(sqlText.trim())) return true;
  const stripped = sqlText
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"])*"/g, '""')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim();
  if (!/^(select|with)\b/i.test(stripped)) {
    throw new Error(`db-inventory refuses to send a statement that does not start with SELECT or WITH (${name})`);
  }
  const offender = WRITE_WORDS.exec(stripped);
  if (offender) {
    throw new Error(`db-inventory refuses to send a statement containing ${offender[1].toUpperCase()} (${name})`);
  }
  return true;
}

// --- what the chain expects ---------------------------------------------------------------

const POSTGRES_TYPES = [
  'double precision', 'character varying', 'timestamp with time zone', 'timestamp without time zone',
  'time with time zone', 'time without time zone', 'bit varying',
  'smallserial', 'bigserial', 'serial', 'timestamptz', 'timetz', 'varchar', 'numeric', 'decimal',
  'integer', 'int2', 'int4', 'int8', 'smallint', 'bigint', 'boolean', 'bool', 'bytea', 'character',
  'bpchar', 'char', 'text', 'uuid', 'jsonb', 'json', 'xml', 'date', 'interval', 'real', 'money',
  'inet', 'cidr', 'macaddr', 'timestamp', 'time', 'bit',
];
const TYPE_ALTERNATION = POSTGRES_TYPES.slice().sort((a, b) => b.length - a.length).join('|');
const COLUMN_DECL = new RegExp(`^"([a-zA-Z0-9_]+)"\\s+(${TYPE_ALTERNATION})\\b|^([a-zA-Z0-9_]+)\\s+(${TYPE_ALTERNATION})\\b`, 'i');
const TABLE_LEVEL = /^(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|CONSTRAINT|EXCLUDE)\b/i;

/**
 * Tables, columns and indexes that sql/migrations creates, read straight out of the files. This is
 * the reference the live database is compared against, so a migration edited after the beta was
 * built shows up as a difference instead of being assumed away.
 *
 * @param {string} dir absolute or cwd-relative directory of .sql migrations
 * @returns {{ tables: Record<string, object>, sources: string[] }}
 */
export function expectedFromMigrations(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const expected = { tables: {}, sources: files };
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const statement of splitStatements(sql)) {
      recordTable(expected, file, statement);
      recordIndex(expected, file, statement);
      recordAlter(expected, file, statement);
    }
    recordGuardedConstraints(expected, file, sql);
  }
  return expected;
}

/**
 * Several migrations add a constraint only after checking pg_constraint, inside a DO block, so the
 * ALTER never starts a statement and the anchored reader above cannot see it. The index PostgreSQL
 * builds for that constraint still exists in the live database, and naming it here is what keeps a
 * chain-built schema from reading as drift. This pass records names only; it changes no column.
 */
function recordGuardedConstraints(expected, file, sql) {
  const plain = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  const found = /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?("?)([a-zA-Z0-9_.]+)\1\s+ADD\s+CONSTRAINT\s+("?)([a-zA-Z0-9_]+)\3\s+(?:PRIMARY\s+KEY|UNIQUE)\b/gi;
  for (const hit of plain.matchAll(found)) {
    const table = tableRef(hit[2]);
    const slot = tableSlot(expected, table, file);
    const name = hit[4].toLowerCase();
    if (slot.indexes.some((index) => index.name === name)) continue;
    slot.constraintIndexes.push({ name, source: file });
  }
}

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((chunk) => chunk.replace(/--.*$/gm, '').trim())
    .filter(Boolean);
}

function tableRef(raw) {
  return raw.split('.').pop().replace(/"/g, '').toLowerCase();
}

function tableSlot(expected, table, file) {
  if (!expected.tables[table]) {
    expected.tables[table] = { source: file, columns: {}, indexes: [], constraints: [], constraintIndexes: [] };
  }
  return expected.tables[table];
}

function recordTable(expected, file, statement) {
  const match = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?)([a-zA-Z0-9_.]+)\1\s*\(/i.exec(statement);
  if (!match) return;
  const table = tableRef(match[2]);
  const slot = tableSlot(expected, table, file);
  const body = parenBody(statement, match[0].length - 1);
  if (body === null) return;
  for (const piece of splitTopLevel(body)) {
    const token = piece.trim();
    if (!token) continue;
    if (TABLE_LEVEL.test(token)) {
      slot.constraints.push(normalise(token));
      for (const indexName of constraintIndexNames(table, token)) {
        slot.constraintIndexes.push({ name: indexName, source: file });
      }
      continue;
    }
    const column = COLUMN_DECL.exec(token);
    if (!column) continue;
    const name = (column[1] || column[3]).toLowerCase();
    const afterType = token.slice(column.index + column[0].length);
    slot.columns[name] = {
      type: `${normaliseType(column[2] || column[4])}${/^\s*\[\s*\]/.test(afterType) ? '[]' : ''}`,
      notNull: /\bNOT\s+NULL\b/i.test(token),
      primaryKey: /\bPRIMARY\s+KEY\b/i.test(token),
      hasDefault: /\bDEFAULT\b/i.test(token),
      definition: normalise(token),
      source: file,
    };
    // PostgreSQL builds the index for an inline constraint itself, under a name the file never
    // spells out. Deriving it here is what keeps a database the chain created from reading as 60
    // indexes that no migration made.
    if (/\bPRIMARY\s+KEY\b/i.test(token)) {
      slot.constraintIndexes.push({ name: `${table}_pkey`, source: file });
    }
    if (/\bUNIQUE\b/i.test(token)) {
      slot.constraintIndexes.push({ name: `${table}_${name}_key`, source: file });
    }
  }
}

/**
 * The index names PostgreSQL creates for a table-level PRIMARY KEY or UNIQUE constraint, including
 * the ones the file names by hand with CONSTRAINT. A CHECK or FOREIGN KEY makes no index.
 */
function constraintIndexNames(table, token) {
  const named = /^CONSTRAINT\s+("?[a-zA-Z0-9_]+"?)\s+(?:PRIMARY\s+KEY|UNIQUE)\b/i.exec(token);
  if (named) return [named[1].replace(/"/g, '').toLowerCase()];
  const bare = /^(PRIMARY\s+KEY|UNIQUE)\s*\(([^)]*)\)/i.exec(token);
  if (!bare) return [];
  const columns = bare[2].split(',').map((part) => part.trim().replace(/"/g, '').toLowerCase()).filter(Boolean);
  if (!columns.length) return [];
  return [/^PRIMARY/i.test(bare[1]) ? `${table}_pkey` : `${table}_${columns.join('_')}_key`];
}

function recordIndex(expected, file, statement) {
  const match = /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?("?)([a-zA-Z0-9_]+)\2\s+ON\s+("?)([a-zA-Z0-9_.]+)\4\s*(\(.*?\))?/is.exec(statement);
  if (!match) return;
  const table = tableRef(match[5]);
  const slot = tableSlot(expected, table, file);
  slot.indexes.push({
    name: match[3].toLowerCase(),
    unique: Boolean(match[1]),
    columns: match[6] ? normalise(match[6]) : '',
    source: file,
  });
}

function recordAlter(expected, file, statement) {
  const match = /^ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?("?)([a-zA-Z0-9_.]+)\1\s+([\s\S]+)$/i.exec(statement);
  if (!match) return;
  const table = tableRef(match[2]);
  const slot = tableSlot(expected, table, file);
  for (const action of splitTopLevel(match[3])) {
    const token = action.trim();
    if (/^ADD\s+(?:CONSTRAINT|CHECK|UNIQUE|PRIMARY\s+KEY)\b/i.test(token)) {
      slot.constraints.push(normalise(token));
      const added = /^ADD\s+CONSTRAINT\s+("?[a-zA-Z0-9_]+"?)\s+(?:PRIMARY\s+KEY|UNIQUE)\b/i.exec(token);
      if (added) {
        slot.constraintIndexes.push({ name: added[1].replace(/"/g, '').toLowerCase(), source: file });
      }
      continue;
    }
    if (/^DROP\s+COLUMN\b/i.test(token)) {
      const dropped = /^DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?("?)([a-zA-Z0-9_]+)\1/i.exec(token);
      if (dropped) delete slot.columns[dropped[2].toLowerCase()];
      continue;
    }
    const changed = /^ALTER\s+COLUMN\s+(?:IF\s+EXISTS\s+)?("?)([a-zA-Z0-9_]+)\1\s+(.+)$/i.exec(token);
    if (changed) {
      const name = changed[2].toLowerCase();
      const column = slot.columns[name];
      if (!column) continue;
      const rest = changed[3].trim();
      if (/^SET\s+NOT\s+NULL\b/i.test(rest)) column.notNull = true;
      if (/^DROP\s+NOT\s+NULL\b/i.test(rest)) column.notNull = false;
      if (/^SET\s+DEFAULT\b/i.test(rest)) column.hasDefault = true;
      if (/^DROP\s+DEFAULT\b/i.test(rest)) column.hasDefault = false;
      const type = /^TYPE\s+(.+?)(?:\s+COLLATE\b|\s+USING\b|$)/i.exec(rest);
      if (type) {
        const parsed = COLUMN_DECL.exec(`x ${type[1]}`);
        if (parsed) column.type = normaliseType(parsed[2] || parsed[4]);
      }
      column.definition = normalise(`${column.type} ${rest}`);
      column.source = file;
      continue;
    }
    const addColumn = /^ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(.+)$/i.exec(token);
    if (!addColumn) continue;
    const column = COLUMN_DECL.exec(addColumn[1]);
    if (!column) continue;
    if (/\bPRIMARY\s+KEY\b/i.test(addColumn[1])) {
      slot.constraintIndexes.push({ name: `${table}_pkey`, source: file });
    }
    if (/\bUNIQUE\b/i.test(addColumn[1])) {
      slot.constraintIndexes.push({ name: `${table}_${(column[1] || column[3]).toLowerCase()}_key`, source: file });
    }
    slot.columns[(column[1] || column[3]).toLowerCase()] = {
      type: normaliseType(column[2] || column[4]),
      notNull: /\bNOT\s+NULL\b/i.test(addColumn[1]),
      primaryKey: /\bPRIMARY\s+KEY\b/i.test(addColumn[1]),
      hasDefault: /\bDEFAULT\b/i.test(addColumn[1]),
      definition: normalise(addColumn[1]),
      source: file,
    };
  }
}

/** The text between the parentheses that open at `startIndex`, or null when unbalanced. */
function parenBody(statement, startIndex) {
  let depth = 0;
  for (let i = startIndex; i < statement.length; i++) {
    const char = statement[i];
    if (char === "'" ) {
      const rest = statement.slice(i);
      const end = rest.match(/'(?:[^']|'')*'/);
      if (end) i += end[0].length - 1;
      continue;
    }
    if (char === '(') depth++;
    if (char === ')') {
      depth--;
      if (depth === 0) return statement.slice(startIndex + 1, i);
    }
  }
  return null;
}

/** Splits a list on commas that are not inside parentheses or a string literal. */
function splitTopLevel(body) {
  const out = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === "'") {
      const end = body.slice(i).match(/'(?:[^']|'')*'/);
      if (end) {
        current += end[0];
        i += end[0].length - 1;
        continue;
      }
    }
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      out.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) out.push(current);
  return out;
}

function normalise(text) {
  return text.replace(/\s+/g, ' ').replace(/\s+([(),])/g, '$1').trim().toLowerCase();
}

function normaliseType(text) {
  return normalise(text);
}

/**
 * PostgreSQL rewrites some spellings on the way in, so `serial` becomes `integer` and `varchar(24)`
 * becomes `character varying`. Anything not listed here has to match the live data_type exactly,
 * which is what keeps a genuine drift visible.
 */
const TYPE_ACCEPTS = {
  serial: new Set(['integer']),
  bigserial: new Set(['bigint']),
  smallserial: new Set(['smallint']),
  int2: new Set(['smallint']),
  int4: new Set(['integer']),
  int8: new Set(['bigint']),
  int: new Set(['integer']),
  bool: new Set(['boolean']),
  varchar: new Set(['character varying']),
  character: new Set(['character']),
  bpchar: new Set(['character']),
  decimal: new Set(['numeric']),
  timestamptz: new Set(['timestamp with time zone']),
  timetz: new Set(['time with time zone']),
  time: new Set(['time without time zone']),
  timestamp: new Set(['timestamp without time zone']),
};

export function typesAgree(expectedType, liveType) {
  const wanted = normaliseType(expectedType).replace(/\([\d,\s]*\)/, '');
  const found = normaliseType(liveType);
  if (wanted === found) return true;
  // information_schema reports every array as the bare word `array` and puts the element type in a
  // different column, so a migration that says TEXT[] has to be read against that word alone.
  if (/\[\]$/.test(wanted)) return found === 'array';
  return (TYPE_ACCEPTS[wanted] || new Set()).has(found);
}

// --- what the database actually holds -----------------------------------------------------

export const inventoryQueries = {
  columns: `
    SELECT table_name, column_name, ordinal_position, data_type, is_nullable, column_default,
           character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = current_schema()
    ORDER BY table_name, ordinal_position`,
  indexes: `
    SELECT tablename AS table_name, indexname AS index_name,
           (indexdef LIKE 'CREATE UNIQUE%') AS is_unique
    FROM pg_indexes
    WHERE schemaname = current_schema()
    ORDER BY tablename, indexname`,
  constraints: `
    SELECT rel.relname AS table_name, c.conname AS constraint_name,
           CASE c.contype WHEN 'p' THEN 'primary key' WHEN 'f' THEN 'foreign key'
                          WHEN 'u' THEN 'unique' WHEN 'c' THEN 'check' ELSE c.contype END AS kind
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = current_schema()
    ORDER BY rel.relname, c.conname`,
  rls: `
    SELECT rel.relname AS table_name, max(CAST(rel.relrowsecurity AS INTEGER)) AS rls_enforced,
           count(pol.polname) AS policies
    FROM pg_class rel
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    LEFT JOIN pg_policy pol ON pol.polrelid = rel.oid
    WHERE nsp.nspname = current_schema() AND rel.relkind = 'r'
    GROUP BY rel.relname
    ORDER BY rel.relname`,
  summary: `
    SELECT current_schema() AS schema_name, current_user AS connected_user,
           (SELECT count(*) FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_type = 'BASE TABLE') AS base_tables
    ORDER BY 1`,
};

/**
 * Runs the inventory against a live connection. `connect` is injected so the offline test can
 * exercise the statement guards without a server.
 *
 * @param {string} connectionString
 * @param {(connectionString: string) => Promise<{query: Function, end: Function}>} [connect]
 * @returns {Promise<{rows: Record<string, object[]>, statementsSent: string[]}>}
 */
export async function readLiveSchema(connectionString, connect) {
  const open = connect || (async (urlValue) => {
    const module = await import('pg').then((m) => m.default ?? m);
    const ssl = /sslmode=require/.test(urlValue) ? { rejectUnauthorized: false } : undefined;
    const client = new module.Client({ connectionString: urlValue, ssl });
    await client.connect();
    return client;
  });
  const client = await open(connectionString);
  const rows = {};
  const statementsSent = [];
  try {
    assertReadOnly('pragma', READ_ONLY_PRAGMA);
    await client.query(READ_ONLY_PRAGMA);
    statementsSent.push(READ_ONLY_PRAGMA);
    for (const [key, sqlText] of Object.entries(inventoryQueries)) {
      assertReadOnly(key, sqlText);
      const result = await client.query(sqlText);
      rows[key] = result.rows ?? result;
      statementsSent.push(sqlText);
    }
  } finally {
    await client.end();
  }
  return { rows, statementsSent };
}

/** @returns {Record<string, {columns: object, indexes: object[], constraints: object[]}>} */
export function indexRows(rows) {
  const live = {};
  const slot = (table) => (live[table] ||= { columns: {}, indexes: [], constraints: [] });
  for (const row of rows.columns || []) {
    const found = slot(String(row.table_name).toLowerCase());
    found.columns[String(row.column_name).toLowerCase()] = {
      type: String(row.data_type).toLowerCase(),
      notNull: row.is_nullable === 'NO',
      hasDefault: row.column_default !== null && row.column_default !== undefined,
      default: row.column_default,
    };
  }
  for (const row of rows.indexes || []) {
    slot(String(row.table_name).toLowerCase()).indexes.push({
      name: String(row.index_name).toLowerCase(),
      unique: row.is_unique === true || row.is_unique === 't' || row.is_unique === 1,
    });
  }
  for (const row of rows.constraints || []) {
    slot(String(row.table_name).toLowerCase()).constraints.push({
      name: String(row.constraint_name).toLowerCase(),
      kind: String(row.kind).toLowerCase(),
    });
  }
  return live;
}

// --- the comparison -----------------------------------------------------------------------

export const COMPARISON_SCOPE = {
  compares: ['tables', 'columns', 'column types', 'nullability', 'default present or absent', 'indexes'],
  reportsWithoutComparing: [
    'row level security per table (the migration chain does not declare it, so there is nothing to expect)',
    'constraint names and kinds',
  ],
  notCompared: [
    'constraint definitions (PostgreSQL reformats them, so a textual diff would be noise)',
    'the columns behind an index PostgreSQL built itself for a PRIMARY KEY or UNIQUE: the name the server '
    + 'would give it is recognised, the key columns behind it are not re-derived',
    'row contents (this tool reads structure only)',
    'grants, storage, tablespaces and extension membership',
  ],
};

/**
 * @param {Record<string, object>} expected the tables map from expectedFromMigrations
 * @param {Record<string, object>} live the map from indexRows
 */
export function compareSchemas(expected, live) {
  const missingTables = Object.keys(expected).filter((table) => !live[table]).sort();
  const extraTables = Object.keys(live).filter((table) => !(table in expected)).sort();

  const drift = [];
  for (const table of Object.keys(expected).filter((table) => live[table]).sort()) {
    const wanted = expected[table].columns || {};
    const found = live[table].columns || {};
    for (const column of Object.keys(wanted).sort()) {
      const want = wanted[column];
      const got = found[column];
      if (!got) {
        drift.push({ table, kind: 'column', name: column, problem: 'missing in the live database', expected: want.type, created_by: want.source });
        continue;
      }
      if (!typesAgree(want.type, got.type)) {
        drift.push({ table, kind: 'column', name: column, problem: 'type differs', expected: want.type, live: got.type });
      }
      if ((want.notNull || want.primaryKey) && !got.notNull) {
        drift.push({ table, kind: 'column', name: column, problem: 'the migration requires a value but the live column allows null', expected: 'not null', live: 'null' });
      }
      if (!(want.notNull || want.primaryKey) && got.notNull) {
        drift.push({ table, kind: 'column', name: column, problem: 'the live column rejects nulls the migration does not ask for', expected: 'null allowed', live: 'not null' });
      }
      if (want.hasDefault && !got.hasDefault) {
        drift.push({ table, kind: 'column', name: column, problem: 'the migration sets a default the live column does not have' });
      }
    }
    for (const column of Object.keys(found).sort()) {
      if (!wanted[column]) {
        drift.push({ table, kind: 'column', name: column, problem: 'present in the live database but created by no migration file', live: found[column].type });
      }
    }
    const wantedIndexes = new Set([
      ...(expected[table].indexes || []).map((index) => index.name),
      ...(expected[table].constraintIndexes || []).map((index) => index.name),
    ]);
    const foundIndexes = new Map((live[table].indexes || []).map((index) => [index.name, index]));
    for (const index of (expected[table].indexes || []).slice().sort((a, b) => a.name.localeCompare(b.name))) {
      const hit = foundIndexes.get(index.name);
      if (!hit) {
        drift.push({ table, kind: 'index', name: index.name, problem: 'missing in the live database', created_by: index.source });
      } else if (hit.unique !== index.unique) {
        drift.push({ table, kind: 'index', name: index.name, problem: 'uniqueness differs', expected: index.unique, live: hit.unique });
      }
    }
    for (const index of (live[table].indexes || []).slice().sort((a, b) => a.name.localeCompare(b.name))) {
      if (!wantedIndexes.has(index.name)) {
        drift.push({ table, kind: 'index', name: index.name, problem: 'present in the live database but created by no migration file' });
      }
    }
  }

  return {
    missingTables,
    extraTables,
    drift,
    liveTableCount: Object.keys(live).length,
    expectedTableCount: Object.keys(expected).length,
    matches: missingTables.length === 0 && extraTables.length === 0 && drift.length === 0,
  };
}

/**
 * Row level security is the tenant wall STYLD relies on, and the migration chain does not declare
 * it, so there is nothing to expect and every table is simply reported.
 */
export function rlsSummary(rows) {
  const tables = (rows.rls || []).map((row) => ({
    table: String(row.table_name).toLowerCase(),
    enforced: Number(row.rls_enforced) === 1 || row.rls_enforced === true,
    policies: Number(row.policies || 0),
  }));
  return {
    tablesWithRls: tables.filter((table) => table.enforced).map((table) => table.table),
    tablesWithoutRls: tables.filter((table) => !table.enforced).map((table) => table.table),
    policyCount: tables.reduce((total, table) => total + table.policies, 0),
  };
}

export const SNAPSHOT_INSTRUCTION = [
  'Before any migration is approved against this database, the founder takes a recoverable Neon',
  'snapshot (or a pg_dump of the same branch) and records its id. Then apply, then re-run this',
  'tool and compare the two reports. A matching report from this tool is a precondition for a',
  'migration, never a substitute for the snapshot.',
].join(' ');

// --- argument handling --------------------------------------------------------------------

export function parseArgs(argv) {
  const read = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : fallback;
  };
  return {
    out: read('out', path.join('docs', 'readiness', 'beta', 'db-inventory.json')),
    migrations: path.resolve(read('migrations', path.join('sql', 'migrations'))),
    allowOwner: argv.includes('--allow-owner'),
    url: read('url', process.env.POSTGRES_URL || process.env.DATABASE_URL || ''),
  };
}

const READ_ONLY_ROLE = /(^|[_-])(read[_-]?only|reader|ro)([_-]|$)/i;

/**
 * A read-only role name is a cheap first gate. --allow-owner is the escape hatch for a Neon branch
 * that only exposes the owner role, and using it means the read-only guarantee rests on the session
 * pragma plus the statement guard instead of on the role.
 */
export function assertUrlAllowed(connectionString, { allowOwner = false } = {}) {
  if (!connectionString) {
    throw new Error('no connection URL was supplied, so nothing was read and nothing was written');
  }
  const parsed = describeConnection(connectionString);
  if (!parsed.hostname) throw new Error('the connection URL could not be parsed');
  if (!allowOwner && !READ_ONLY_ROLE.test(parsed.user)) {
    throw new Error(`the user "${parsed.user}" is not a read-only role name. Pass --allow-owner if this branch only exposes its owner.`);
  }
  return parsed;
}

export function describeConnection(connectionString) {
  try {
    const parsed = new URL(connectionString.replace(/^postgres(ql)?:\/\//i, 'http://'));
    return {
      hostname: parsed.hostname,
      port: parsed.port || '5432',
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '') || ''),
      user: decodeURIComponent(parsed.username || ''),
    };
  } catch {
    return { hostname: '', port: '', database: '', user: '' };
  }
}

function safeWrite(target, payload) {
  const resolved = assertReportPath(target);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(payload, null, 2));
  return resolved;
}

/** A report is a readiness document, never a source file, so it may only land under docs/. */
export function assertReportPath(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(process.cwd(), 'docs') + path.sep)) {
    throw new Error('the report must be written under docs/: ' + resolved);
  }
  return resolved;
}

export async function run({ url, migrationsDir, allowOwner, connect }) {
  const connection = assertUrlAllowed(url, { allowOwner });
  const expected = expectedFromMigrations(migrationsDir);
  const { rows, statementsSent } = await readLiveSchema(url, connect);
  const live = indexRows(rows);
  const comparison = compareSchemas(expected.tables, live);
  return {
    instrument: 'scripts/db-inventory.mjs',
    conditions: 'read-only session at the server; every statement checked before it is sent; information_schema and pg_catalog only; structure only, never row contents; the connection string is never recorded',
    generatedAt: new Date().toISOString(),
    connection,
    statementsSent: statementsSent.map((text) => normalise(text).slice(0, 160)),
    expectedFrom: { migrationsDir, migrationFiles: expected.sources, tables: comparison.expectedTableCount },
    live: { summary: rows.summary, tables: comparison.liveTableCount },
    security: rlsSummary(rows),
    scope: COMPARISON_SCOPE,
    missingTables: comparison.missingTables,
    extraTables: comparison.extraTables,
    drift: comparison.drift,
    matches: comparison.matches,
    snapshot: SNAPSHOT_INSTRUCTION,
    reading: 'matches false is the answer to "can the chain be applied as-is?", not a crash. This file authorises nothing: the founder takes a recoverable snapshot, then the founder applies, then this tool is re-run and the two reports compared.',
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await run({
    url: options.url,
    migrationsDir: options.migrations,
    allowOwner: options.allowOwner,
  });
  const written = safeWrite(options.out, report);
  console.log(JSON.stringify({
    written,
    host: report.connection.hostname,
    database: report.connection.database,
    user: report.connection.user,
    liveTables: report.live.tables,
    expectedTables: report.expectedFrom.tables,
    missing: report.missingTables.length,
    extra: report.extraTables.length,
    drift: report.drift.length,
    matches: report.matches,
  }));
  process.exitCode = report.matches ? 0 : 1;
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error('DB inventory could not run:', error.message);
    process.exitCode = 2;
  });
}
