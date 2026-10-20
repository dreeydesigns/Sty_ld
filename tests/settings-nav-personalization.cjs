/**
 * Settings navigation and Profile Personalization regressions.
 *
 * Covers:
 * 1. /settings does not highlight Profile or any other primary tab.
 * 2. Nested general Settings routes keep Settings as the owning destination.
 * 3. Returning to /profile restores the Me destination.
 * 4. Every general Settings page declares the Settings nav key.
 * 5. The profile gear opens a labelled Profile Personalization interface.
 * 6. Edit Profile stays a separate form action with its own icon.
 * 7. Personalization exposes only supported controls that persist locally.
 * 8. General Settings stays directly accessible.
 * 9. The bottom navigation highlights at most one destination and says so.
 */

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

function readSource(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

const nav = load('lib/navigation.ts');
const profileSource = readSource('components/role-profile-workspace.tsx');
const marketplaceSource = readSource('components/marketplace-ui.tsx');
const personalizationSource = readSource('components/profile-personalization.tsx');
const pickerSource = readSource('components/beauty-world-picker.tsx');

const SETTINGS_PAGES = [
  'app/settings/page.tsx',
  'app/settings/edit-profile/page.tsx',
  'app/settings/active-sessions/page.tsx',
  'app/settings/muted-accounts/page.tsx',
  'app/settings/blocked-accounts/page.tsx',
];

test('general Settings is its own destination and never the Profile tab', () => {
  assert.equal(nav.mapCurrentNavToPrimaryTab('settings', 'client'), 'settings');
  assert.equal(nav.mapCurrentNavToPrimaryTab('settings', 'professional'), 'settings');
  assert.equal(nav.mapCurrentNavToPrimaryTab('settings', 'salon'), 'settings');
  assert.equal(nav.hasExactlyOneActiveTab('settings', nav.getPrimaryTabsForRole('client')), false);
  assert.equal(nav.hasExactlyOneActiveTab('settings', nav.getPrimaryTabsForRole('professional')), false);
});

test('nested general Settings routes stay owned by Settings', () => {
  for (const route of ['/settings', '/settings/edit-profile', '/settings/active-sessions', '/settings/muted-accounts', '/settings/blocked-accounts']) {
    assert.equal(nav.resolveActivePrimaryTab('profile', route, 'client'), 'settings', route);
    assert.equal(nav.resolveActivePrimaryTab('profile', route, 'professional'), 'settings', route);
  }
});

test('returning to the profile restores the Me destination', () => {
  assert.equal(nav.resolveActivePrimaryTab('settings', '/profile', 'client'), 'me');
  assert.equal(nav.resolveActivePrimaryTab('settings', '/profile?tab=requests', 'professional'), 'me');
  assert.equal(nav.mapCurrentNavToPrimaryTab('profile', 'client'), 'me');
  assert.equal(nav.mapCurrentNavToPrimaryTab('profile', 'professional'), 'me');
  assert.equal(nav.mapCurrentNavToPrimaryTab('profile', 'salon'), 'me');
});

test('every general Settings page declares the Settings nav key', () => {
  for (const file of SETTINGS_PAGES) {
    const source = readSource(file);
    assert.match(source, /<AppShell currentNav="settings"/, file);
    assert.doesNotMatch(source, /currentNav="profile"/, file);
  }
});

test('the profile gear opens a labelled Profile Personalization interface', () => {
  assert.equal((profileSource.match(/aria-label="Profile personalization"/g) ?? []).length, 2);
  assert.equal((profileSource.match(/onClick=\{\(\) => setShowPersonalization\(true\)\}/g) ?? []).length, 2);
  assert.match(profileSource, /role="client"/);
  assert.match(profileSource, /role=\{isPro \? "professional" : "salon"\}/);
  assert.match(profileSource, /cards=\{session\.cards\}/);
});

test('Edit Profile stays a separate action with its own icon and server save', () => {
  assert.equal((profileSource.match(/<Pencil className="h-4 w-4" \/>/g) ?? []).length, 2);
  assert.doesNotMatch(profileSource, /<Settings className="h-4 w-4" \/> Edit/);
  assert.match(profileSource, /async function handleSaveProfile\(\)/);
  assert.match(profileSource, /async function handleSaveSettings\(\)/);
  assert.match(profileSource, /fetch\("\/api\/users\/me"/);
});

test('personalization exposes only supported controls backed by the workspace profile', () => {
  assert.match(personalizationSource, /role="dialog"/);
  assert.match(personalizationSource, /aria-modal="true"/);
  assert.match(personalizationSource, /aria-labelledby="profile-personalization-title"/);
  assert.match(personalizationSource, /event\.key === "Escape"/);
  assert.match(personalizationSource, /<BeautyWorldPicker/);
  assert.match(pickerSource, /saveClientBeautyWorld\(theme\)/);
  assert.match(pickerSource, /aria-live="polite"/);
  assert.match(pickerSource, /role="alert"/);
  assert.match(personalizationSource, /onToggleCard\?\.\(card\.id\)/);
  assert.match(personalizationSource, /onRemoveCard\(card\.id\)/);
  assert.match(profileSource, /cards: \(session\.cards \?\? \[\]\)\.map/);
  assert.match(profileSource, /cards: \(session\.cards \?\? \[\]\)\.filter/);
});

test('general Settings stays directly accessible', () => {
  assert.match(marketplaceSource, /aria-label="Settings"/);
  assert.match(marketplaceSource, /currentNav === "settings"/);
  assert.match(marketplaceSource, /href="\/settings"/);
  assert.match(profileSource, /Full Settings/);
  assert.match(personalizationSource, /Open account settings/);
  assert.doesNotMatch(personalizationSource, /router\.(push|replace)\(/);
});

test('navigation highlights at most one destination and announces it', () => {
  assert.match(
    marketplaceSource,
    /item\.key === "book" \? "plan" : item\.key === "explore" \? "discover" : item\.key === "profile" \? "me" : item\.key/,
  );
  assert.match(marketplaceSource, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(marketplaceSource, /aria-current=\{current \? "page" : undefined\}/);
  assert.equal(nav.mapCurrentNavToPrimaryTab('explore', 'client'), 'discover');
  assert.equal(nav.mapCurrentNavToPrimaryTab('book', 'client'), 'plan');
  assert.equal(nav.mapCurrentNavToPrimaryTab('counter', 'client'), 'me');
  assert.equal(nav.mapCurrentNavToPrimaryTab('unknown', 'client'), 'home');
});
