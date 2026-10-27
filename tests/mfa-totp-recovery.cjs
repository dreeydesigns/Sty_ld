/**
 * MFA TOTP transaction and recovery regression suite (Identity & Security slice).
 *
 * Drives the real app/api/auth/mfa/totp/route.ts against an in-memory store that
 * logs every statement and tracks whether a statement ran inside a transaction.
 * Proves the lock and idle guards are issued inside the transaction and before the
 * row lock, that a timeout becomes a bounded refusal that rolls back without
 * granting verification, and that recovery codes, replay and refusal paths never
 * leave a half-written verification behind.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SESSION_ID = '99999999-9999-4999-8999-999999999999';
const SECRET = 'STORED-ENCRYPTED-SECRET';
const VALID_CODE = '111111';
const RECOVERY_CODE = 'recovery-one';

function loadRoute(dependencies) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', 'app/api/auth/mfa/totp/route.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }
  ).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    console: { error: () => {} }, process, Buffer, URL, URLSearchParams, Date, Math, JSON, Object, Array, Number, String, Boolean, Error, Set, Map, Symbol, Promise, RegExp,
  })(name => (Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name)), module, module.exports);
  return module.exports;
}

class AuthError extends Error {
  constructor(message, statusCode) { super(message); this.statusCode = statusCode; }
}

// The route's origin guard and its error serializer are loaded from the shipped lib/api-security.ts
// rather than reimplemented here, so a change to what that module puts into a response body fails
// this suite instead of passing a fixture that only ever agrees with itself.
function loadApiSecurity() {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', 'lib/api-security.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }
  ).outputText;
  const responseStub = { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200, headers: {} }) } };
  const module = { exports: {} };
  const sandbox = {
    process: { env: { BETTER_AUTH_URL: 'https://styld.test' } },
    console: { error: () => {} }, URL, Object, Error, String, Number, Boolean, JSON, Promise, RegExp, Array,
  };
  const loadDependency = name => (name === './auth-resolver' ? { AuthError } : name === 'next/server' ? responseStub : require(name));
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', sandbox)(loadDependency, module, module.exports);
  return module.exports;
}
const apiSecurity = loadApiSecurity();

function harness(overrides = {}) {
  const state = {
    factor: { user_id: USER_ID, enabled: true, last_step: 0, encrypted_secret: SECRET },
    recoveryCodes: [{ code_hash: 'hash-of-recovery-one' }],
    sessionContext: null,
    releaseCount: 0,
    lockTimeout: false,
    idleTimeout: false,
    allowLimit: true,
    recentSignIn: true,
    ...overrides,
  };
  const sqlLog = [];
  const events = [];
  let inTransaction = false;
  // Postgres ends the connection when an idle-in-transaction timeout fires, so the rollback after
  // that error fails too. The store models that, rather than pretending the session survives.
  let connectionDead = false;

  const record = (sql, values, inside) => {
    sqlLog.push({ sql: sql.replace(/\s+/g, ' ').trim(), values, inside });
  };

  const client = {
    async query(sql, values) {
      record(sql, values, inTransaction);
      const text = sql.replace(/\s+/g, ' ').trim().toUpperCase();
      if (text === 'BEGIN') { inTransaction = true; return { rows: [], rowCount: 0 }; }
      if (text.startsWith('SET LOCAL LOCK_TIMEOUT')) {
        if (!inTransaction) throw new Error('SET LOCAL outside a transaction');
        return { rows: [], rowCount: 0 };
      }
      if (text.startsWith('SET LOCAL IDLE_IN_TRANSACTION')) {
        if (!inTransaction) throw new Error('SET LOCAL outside a transaction');
        return { rows: [], rowCount: 0 };
      }
      if (text.startsWith('ROLLBACK')) {
        if (connectionDead) throw new Error('Connection terminated. The server closed the connection due to an idle timeout.');
        inTransaction = false; return { rows: [], rowCount: 0 };
      }
      if (text.startsWith('COMMIT')) { inTransaction = false; return { rows: [], rowCount: 0 }; }
      if (text.includes('FROM AUTH_TOTP') && text.includes('FOR UPDATE')) {
        if (state.lockTimeout) { const error = new Error('canceling statement due to lock timeout'); error.code = '55P03'; throw error; }
        if (state.idleTimeout) { connectionDead = true; const error = new Error('terminating connection due to idle-in-transaction timeout'); error.code = '25P03'; throw error; }
        if (state.otherFailure) { const error = new Error(state.otherFailure); error.code = '23505'; throw error; }
        return { rows: state.factor ? [{ ...state.factor }] : [], rowCount: state.factor ? 1 : 0 };
      }
      if (text.startsWith('UPDATE AUTH_TOTP')) {
        if (!inTransaction) throw new Error('factor update outside a transaction');
        state.factor.last_step = Number(values[1]); state.factor.enabled = true;
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('DELETE FROM AUTH_RECOVERY_CODES')) {
        const index = state.recoveryCodes.findIndex(entry => entry.code_hash === values[1]);
        if (index < 0) return { rows: [], rowCount: 0 };
        state.recoveryCodes.splice(index, 1);
        return { rows: [{ code_hash: 'removed' }], rowCount: 1 };
      }
      if (text.startsWith('INSERT INTO AUTH_RECOVERY_CODES')) {
        state.recoveryCodes.push({ code_hash: values[1] });
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('INSERT INTO AUTH_SESSION_CONTEXT')) {
        if (!inTransaction) throw new Error('verification granted outside a transaction');
        state.sessionContext = { session_id: values[0], mfa_verified_at: 'now', active_role: values[2] };
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unscheduled statement in the test store: ${text.slice(0, 80)}`);
    },
    release() { state.releaseCount += 1; },
  };

  const pool = { connect: async () => client };

  const deps = {
    'next/server': {
      NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200, headers: init?.headers }) },
    },
    '@/lib/auth-resolver': { AuthError, requireAuthenticatedUser: async () => ({ userId: USER_ID, sessionId: SESSION_ID, email: 'owner@styld.test', role: 'professional', admin: false, createdAt: new Date(Date.now() - 60_000).toISOString() }) },
    '@/lib/auth-database': { authPool: pool },
    '@/lib/auth-policy': { recentAuthentication: () => state.recentSignIn },
    '@/lib/totp': {
      generateTotpSecret: () => ({ secret: 'ignored', otpauthUrl: 'otpauth://ignored' }),
      verifyTotpCode: (secret, code, _offset, when) => secret === SECRET && code === VALID_CODE && Math.floor(when / 30000) === Math.floor(Date.now() / 30000),
      encryptTotpSecret: value => value,
      decryptTotpSecret: value => value,
      generateRecoveryCodes: () => ({ plainCodes: ['plain-recovery'], hashedCodes: ['hash-of-plain-recovery'] }),
      hashRecoveryCode: code => (code === RECOVERY_CODE ? 'hash-of-recovery-one' : `hash-of-${code}`),
    },
    '@/lib/security-events': {
      consumeLimit: async () => state.allowLimit,
      securityEvent: async (event) => { events.push(event); },
    },
    '@/lib/api-security': apiSecurity,
  };

  const route = loadRoute(deps);
  const call = (body, origin = 'https://styld.test') => route.POST({
    json: async () => body,
    headers: new Headers({ origin }),
    url: `${origin}/api/auth/mfa/totp`,
  });
  return { state, sqlLog, events, call, deps };
}

const statements = log => log.map(entry => entry.sql);
const indexOfPattern = (log, pattern) => statements(log).findIndex(sql => sql.includes(pattern));

test('the transaction opens with both bounded waits before it takes the row lock', async () => {
  const { sqlLog, call } = harness();
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 200);
  const begin = indexOfPattern(sqlLog, 'BEGIN');
  const lock = indexOfPattern(sqlLog, 'SET LOCAL lock_timeout');
  const idle = indexOfPattern(sqlLog, 'SET LOCAL idle_in_transaction_session_timeout');
  const lockingRead = indexOfPattern(sqlLog, 'FROM auth_totp WHERE user_id=$1 FOR UPDATE');
  assert.ok(begin >= 0 && lock > begin && idle > lock && lockingRead > idle,
    `guards must run inside the transaction and before the lock, got ${statements(sqlLog).slice(0, 5).join(' | ')}`);
  for (const entry of sqlLog.slice(begin + 1, lockingRead + 1)) assert.equal(entry.inside, true, 'SET LOCAL only applies inside the transaction');
  assert.equal(sqlLog[lock].values, undefined);
  assert.match(statements(sqlLog)[lock], /'5s'/);
  assert.match(statements(sqlLog)[idle], /'5s'/);
});

test('a verified factor commits verification and records the event only after commit', async () => {
  const { sqlLog, events, state, call } = harness();
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(state.sessionContext.session_id, SESSION_ID);
  assert.equal(state.sessionContext.active_role, 'professional');
  const commit = indexOfPattern(sqlLog, 'COMMIT');
  assert.ok(commit > indexOfPattern(sqlLog, 'INSERT INTO auth_session_context'));
  assert.deepEqual(events, ['mfa_verified']);
  assert.equal(state.releaseCount, 1, 'the pooled client is returned even on success');
});

test('a lock timeout becomes a bounded refusal that rolls back and grants nothing', async () => {
  const { sqlLog, events, state, call } = harness();
  state.lockTimeout = true;
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 503, 'a lock timeout is a retryable service condition, not a crash');
  assert.match(response.body.error, /busy right now/i);
  assert.doesNotMatch(response.body.error, /55P03|25P03|lock_timeout|postgres/i, 'the refusal names no internal driver detail');
  assert.equal(state.sessionContext, null, 'verification was not granted');
  assert.deepEqual(events, [], 'no false mfa_verified audit record');
  assert.ok(indexOfPattern(sqlLog, 'ROLLBACK') >= 0);
  assert.equal(indexOfPattern(sqlLog, 'COMMIT'), -1);
  assert.equal(state.releaseCount, 1, 'the client is released back to a pool of four');
});

test('an idle timeout ends the connection, so it stays a generic failure rather than a false retry promise', async () => {
  const { sqlLog, events, state, call } = harness();
  state.idleTimeout = true;
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 500, 'a dead connection cannot promise the caller that retrying now helps');
  // The body is built inside the VM realm, so its prototype differs from a host literal: compare the field.
  assert.equal(response.body.error, 'Unable to complete this request.', 'the Postgres code never reaches the body');
  assert.equal(state.sessionContext, null, 'verification was not granted');
  assert.deepEqual(events, [], 'no false mfa_verified audit record');
  assert.ok(indexOfPattern(sqlLog, 'ROLLBACK') >= 0, 'the route still tries to close the transaction');
  assert.equal(indexOfPattern(sqlLog, 'COMMIT'), -1);
  assert.equal(state.releaseCount, 1, 'the client is returned even when the rollback itself failed');
});

test('a cross-origin request is refused by the shipped origin guard before any database work', async () => {
  const { sqlLog, state, call } = harness();
  const response = await call({ action: 'validate', code: VALID_CODE }, 'https://not-styld.example');
  assert.equal(response.status, 403, 'the real sameOrigin guard runs, not a stub that always agrees');
  assert.equal(sqlLog.length, 0, 'an untrusted origin takes no connection from a pool of four');
  assert.equal(state.releaseCount, 0);
  assert.equal(state.sessionContext, null);
});

test('a database failure that is not a timeout is not dressed up as a retryable refusal', async () => {
  const { sqlLog, state, call } = harness();
  state.otherFailure = 'unexpected unique key collision';
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 500, 'only the bounded lock timeout earns a retry message');
  assert.equal(response.body.error, 'Unable to complete this request.');
  assert.equal(state.sessionContext, null);
  assert.ok(indexOfPattern(sqlLog, 'ROLLBACK') >= 0);
});

test('a recovery code is spent exactly once and a second use grants nothing', async () => {
  const { sqlLog, state, call } = harness();
  const first = await call({ action: 'recovery', code: RECOVERY_CODE });
  assert.equal(first.status, 200);
  assert.equal(state.recoveryCodes.length, 0, 'the spent code is deleted inside the transaction');
  assert.equal(state.sessionContext.session_id, SESSION_ID);
  sqlLog.length = 0;
  state.sessionContext = null;
  const second = await call({ action: 'recovery', code: RECOVERY_CODE });
  assert.equal(second.status, 400);
  assert.match(second.body.error, /invalid recovery code/i);
  assert.equal(state.sessionContext, null, 'a spent code cannot re-verify a session');
  assert.ok(indexOfPattern(sqlLog, 'ROLLBACK') >= 0);
});

test('an unrecognized recovery code leaves every stored code intact', async () => {
  const { sqlLog, state, call } = harness();
  const response = await call({ action: 'recovery', code: 'wrong-code' });
  assert.equal(response.status, 400);
  assert.equal(state.recoveryCodes.length, 1);
  assert.ok(indexOfPattern(sqlLog, 'ROLLBACK') >= 0);
  assert.equal(state.sessionContext, null);
});

test('a replayed authenticator code is refused and the step counter does not move', async () => {
  const step = Math.floor(Date.now() / 30000);
  const { sqlLog, state, call } = harness({ factor: { user_id: USER_ID, enabled: true, last_step: step, encrypted_secret: SECRET } });
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /invalid or already used/i);
  assert.equal(state.factor.last_step, step, 'a refused attempt cannot rewind or advance the replay guard');
  assert.equal(state.sessionContext, null);
  assert.ok(indexOfPattern(sqlLog, 'ROLLBACK') >= 0);
});

test('a session that has not configured a factor is told to set one up, without a verification row', async () => {
  const { sqlLog, state, call } = harness({ factor: null });
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /set up an authenticator first/i);
  assert.equal(state.sessionContext, null);
  assert.ok(indexOfPattern(sqlLog, 'ROLLBACK') >= 0);
});

test('an exhausted attempt budget refuses before any database work', async () => {
  const { sqlLog, state, call } = harness({ allowLimit: false });
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 429);
  assert.match(response.body.error, /too many attempts/i);
  assert.equal(sqlLog.length, 0, 'no connection is taken from a pool of four to say no');
  assert.equal(state.releaseCount, 0);
});

test('a stale sign-in cannot finish authenticator setup', async () => {
  const { sqlLog, state, call } = harness({ recentSignIn: false, factor: { user_id: USER_ID, enabled: false, last_step: 0, encrypted_secret: SECRET } });
  const response = await call({ action: 'verify', code: VALID_CODE });
  assert.equal(response.status, 403);
  assert.match(response.body.error, /sign in again/i);
  assert.equal(state.sessionContext, null);
  assert.equal(indexOfPattern(sqlLog, 'INSERT INTO auth_session_context'), -1);
});

test('finishing setup returns recovery codes once and stores only hashes', async () => {
  const { sqlLog, state, call } = harness({ factor: { user_id: USER_ID, enabled: false, last_step: 0, encrypted_secret: SECRET }, recoveryCodes: [] });
  const response = await call({ action: 'verify', code: VALID_CODE });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.recoveryCodes, ['plain-recovery'], 'plaintext codes are handed to the user exactly once');
  assert.deepEqual(state.recoveryCodes, [{ code_hash: 'hash-of-plain-recovery' }], 'only a hash is persisted');
  assert.equal(state.factor.enabled, true);
  assert.ok(indexOfPattern(sqlLog, 'UPDATE auth_totp SET enabled=true') > indexOfPattern(sqlLog, 'FOR UPDATE'));
});

test('an unconfirmed factor cannot be used for ordinary validation', async () => {
  const { sqlLog, state, call } = harness({ factor: { user_id: USER_ID, enabled: false, last_step: 0, encrypted_secret: SECRET } });
  const response = await call({ action: 'validate', code: VALID_CODE });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /finish authenticator setup/i);
  assert.equal(state.sessionContext, null);
  assert.equal(state.factor.enabled, false, 'a refused validation does not silently enable the factor');
});

test('an unknown action is refused without opening a transaction', async () => {
  const { sqlLog, call } = harness();
  const response = await call({ action: 'disable', code: VALID_CODE });
  assert.equal(response.status, 400);
  assert.equal(sqlLog.length, 0);
});

test('a non-string code is refused without opening a transaction', async () => {
  const { sqlLog, call } = harness();
  const response = await call({ action: 'validate', code: { $gt: '' } });
  assert.equal(response.status, 400);
  assert.equal(sqlLog.length, 0, 'a shaped payload must not reach the factor row');
});
