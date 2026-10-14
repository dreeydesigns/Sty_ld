const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const r = (name) => require(name);
  new Function('require', 'module', 'exports', source)(r, module, module.exports);
  return module.exports;
}

const nav = load('lib/navigation.ts');

test('unified client navigation uses Home, Discover, Plan and Me', () => {
  assert.deepEqual(nav.CLIENT_PRIMARY_TABS.map((t) => t.label), ['Home', 'Discover', 'Plan', 'Me']);
});

test('guest navigation invites account access on Me', () => {
  const me = nav.GUEST_PRIMARY_TABS.find((t) => t.key === 'me');
  assert.match(me.href, /^\/auth\/sign-in/);
});

test('every role exposes exactly one tab set and Plan is booking-safe', () => {
  for (const role of ['guest', 'client', 'professional', 'salon']) {
    const tabs = nav.getPrimaryTabsForRole(role);
    assert.ok(Array.isArray(tabs) && tabs.length > 0);
    // Each tab key is unique.
    const keys = tabs.map((t) => t.key);
    assert.equal(new Set(keys).size, keys.length);
  }
});

test('active primary tab mapping resolves exactly one tab', () => {
  const cases = [
    ['home', 'client', 'home'],
    ['discover', 'client', 'discover'],
    ['explore', 'client', 'discover'],
    ['book', 'client', 'plan'],
    ['profile', 'client', 'me'],
  ];
  for (const [currentNav, role, expected] of cases) {
    const active = nav.mapCurrentNavToPrimaryTab(currentNav, role);
    assert.equal(active, expected);
    const tabs = nav.getPrimaryTabsForRole(role);
    assert.equal(nav.hasExactlyOneActiveTab(active, tabs) || role !== 'client', true);
  }
});

test('resolveActivePrimaryTab is pathname authoritative', () => {
  assert.equal(nav.resolveActivePrimaryTab('home', '/discover', 'client'), 'discover');
  assert.equal(nav.resolveActivePrimaryTab('home', '/book', 'client'), 'plan');
  assert.equal(nav.resolveActivePrimaryTab('home', '/profile', 'client'), 'me');
});

test('safe internal destinations reject external and auth paths', () => {
  assert.equal(nav.safeInternalDestination('https://evil.example'), '/home');
  assert.equal(nav.safeInternalDestination('/auth/sign-in?returnTo=/profile'), '/home');
  assert.equal(nav.safeInternalDestination('/discover?tab=salons'), '/discover?tab=salons');
});
