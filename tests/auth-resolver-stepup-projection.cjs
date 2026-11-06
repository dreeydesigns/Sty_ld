/**
 * Administrator step-up projection suite.
 *
 * lib/auth-resolver.ts is a protected file, so the property that makes the administrator step-up
 * hold is pinned from here instead. users has its own mfa_verified_at (sql/migrations/010) and
 * auth_session_context has one too. node-postgres builds a row object field by field in column
 * order, so when two columns share a name the projected LAST one wins
 * (node_modules/pg/lib/result.js parseRow). The session copy has to be projected after u.*, or a
 * stale users.mfa_verified_at would keep an administrator through the gate after the step-up was
 * cleared.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/auth-resolver.ts'), 'utf8');

function projectedFields(sql) {
  const projection = /SELECT (u\.\*,.*?) FROM users u/.exec(sql);
  assert.ok(projection, 'the resolver must project u.* first, then the joined columns it trusts');
  return projection[1].split(',').map((field) => field.trim());
}

test('the joined session columns are projected after u.* so they win the row object', () => {
  const resolverLine = source.split(/\r?\n/).find((line) => line.includes('FROM users u'));
  assert.ok(resolverLine, 'the identity read is a single joined query');
  const fields = projectedFields(resolverLine);
  const firstByName = fields.indexOf('u.*');
  assert.equal(firstByName, 0, 'u.* comes first, so any column named twice is a user column copy');
  for (const field of ['c.active_role', 'c.workspace_id', 'c.mfa_verified_at']) {
    assert.ok(fields.indexOf(field) > firstByName, `${field} must be projected after u.* to override the users copy`);
  }
  assert.match(resolverLine, /COALESCE\(t\.enabled,false\) AS mfa_enabled/, 'a missing auth_totp row reads as TOTP off');
});

test('step-up authority comes from the session row and the gate is still closed without it', () => {
  assert.match(source, /const mfaVerified=!!u\.mfa_enabled&&!!u\.mfa_verified_at&&/, 'a disabled TOTP or a missing stamp cannot pass');
  assert.match(source, /mfaAge<12\*3600000/, 'the step-up is time-boxed');
  assert.match(source, /if\(!s\.admin\|\|!s\.mfaVerified\)throw new AuthError\('Administrator MFA required\.'/, 'requireAdmin refuses an unverified administrator');
});

test('a cleared session context cannot be re-decided in the browser', () => {
  const totpRoute = fs.readFileSync(path.join(root, 'app/api/auth/mfa/totp/route.ts'), 'utf8');
  assert.match(totpRoute, /mfa_verified_at=NULL/, 'the recovery branch clears the step-up stamp in the same record that carries it');
  assert.doesNotMatch(totpRoute, /localStorage|sessionStorage/, 'the step-up outcome is never stored in the browser to be trusted later');
});
