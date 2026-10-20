/**
 * Five Beauty Worlds regressions.
 *
 * Covers approved themes, server backed saving, honest failure states,
 * account isolation, light mode safety, visual tokens, discovery relevance,
 * dialog accessibility, and the boundaries around booking, payments and auth.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTs(file, deps = {}) {
  const full = path.join(__dirname, '..', file);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const moduleRequire = (name) => {
    if (name in deps) return deps[name];
    if (name.startsWith('./') || name.startsWith('../')) {
      return require(path.join(path.dirname(full), name));
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(moduleRequire, module, module.exports);
  return module.exports;
}

function readSource(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

const personalization = loadTs('lib/personalization.ts');
const beautyWorld = loadTs('lib/beauty-world.ts', {
  '@/lib/personalization': personalization,
});
const relevance = loadTs('lib/content-relevance.ts', {
  '@/lib/beauty-world': beautyWorld,
  '@/lib/personalization': personalization,
});
const ranking = loadTs('lib/discovery-ranking.ts', {
  '@/lib/personalization': personalization,
});
const flags = loadTs('lib/feature-flags.ts');

const pickerSource = readSource('components/beauty-world-picker.tsx');
const dialogSource = readSource('components/profile-personalization.tsx');
const worldCardSource = readSource('components/my-world-card.tsx');
const applicatorSource = readSource('components/theme-applicator.tsx');
const clientSessionSource = readSource('lib/client-session.ts');
const profileSource = readSource('components/role-profile-workspace.tsx');
const discoverSource = readSource('app/discover/page.tsx');
const collectionSource = readSource('components/discovery.tsx');
const homeSource = readSource('components/social-home.tsx');
const apiSource = readSource('app/api/users/me/route.ts');
const workspaceSource = readSource('lib/workspace-policy.ts');
const hydratorSource = readSource('components/session-hydrator.tsx');
const layoutSource = readSource('app/layout.tsx');
const cssSource = readSource('app/globals.css');

function cssBlock(theme) {
  const start = cssSource.indexOf(`:root[data-beauty-world="${theme}"]`);
  assert.notEqual(start, -1, `${theme} must have a theme block`);
  return cssSource.slice(start, cssSource.indexOf('}', start));
}

function contrastWithWhite(hex) {
  const channels = hex.replace('#', '').match(/.{2}/g).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return 1.05 / (luminance + 0.05);
}

test('only the five approved beauty worlds are selectable', () => {
  assert.deepEqual([...beautyWorld.BEAUTY_WORLD_KEYS], ['feminine', 'natural', 'spiritual', 'cultural', 'african_nude']);
  assert.equal(new Set(beautyWorld.BEAUTY_WORLD_KEYS).size, 5);
  assert.ok(!beautyWorld.BEAUTY_WORLD_KEYS.includes('not_set'));
  for (const key of beautyWorld.BEAUTY_WORLD_KEYS) {
    assert.equal(personalization.normalizeThemeKey(key), key);
    assert.ok(personalization.themeConfigs[key].displayName);
    assert.ok(personalization.themeConfigs[key].tribeBadge);
  }
});

test('each world has distinct supporting colours with readable active states', () => {
  const accents = new Set();
  const softs = new Set();
  const darks = new Set();

  for (const key of beautyWorld.BEAUTY_WORLD_KEYS) {
    const config = personalization.themeConfigs[key];
    accents.add(config.accentColor);
    softs.add(config.softColor);
    darks.add(config.darkColor);
    assert.ok(contrastWithWhite(config.darkColor) >= 4.5, `${key} active state must keep white text readable`);
    assert.match(cssBlock(key), /--bw-accent:\s+#[0-9A-F]{6}/i);
  }

  assert.equal(accents.size, 5);
  assert.equal(softs.size, 5);
  assert.equal(darks.size, 5);
});

test('server validates the five values and derives the badge', () => {
  assert.equal(beautyWorld.isBeautyWorldKey('feminine'), true);
  assert.equal(beautyWorld.isBeautyWorldKey('nude'), false);
  assert.equal(beautyWorld.isBeautyWorldKey('not_set'), false);
  assert.equal(beautyWorld.isBeautyWorldKey('dark'), false);
  assert.equal(beautyWorld.beautyWorldBadge('cultural'), 'The Daughter of the Soil');

  assert.match(apiSource, /isBeautyWorldKey\(theme\)/);
  assert.match(apiSource, /beautyWorldBadge\(theme\)/);
  assert.match(apiSource, /The tribe badge is set by the beauty world\./);
});

test('PATCH rejects unknown themes and non-client workspaces', () => {
  assert.match(apiSource, /Choose one of the five beauty worlds\./);
  assert.match(apiSource, /s\.workspace\.role!=='client'/);
  assert.match(apiSource, /Beauty worlds are available for client profiles\./);
  assert.equal(beautyWorld.normalizeBeautyWorld('unknown'), null);
});

test('a successful save updates the active world without a reload', () => {
  const optimisticAt = clientSessionSource.indexOf('updateClientTheme(normalized)');
  const requestAt = clientSessionSource.indexOf('await fetch("/api/users/me"');
  assert.ok(optimisticAt >= 0);
  assert.ok(requestAt > optimisticAt, 'the client applies the world before the network round trip');
  assert.match(pickerSource, /setActiveTheme\(theme\)/);
  assert.match(pickerSource, /saveClientBeautyWorld\(theme\)/);
  assert.doesNotMatch(homeSource, /router\.refresh\(\)/);
});

test('a failed save restores the previous world and explains the failure', () => {
  assert.match(clientSessionSource, /catch \(error\)[\s\S]*writeClientSession\(previous\)/);
  assert.match(pickerSource, /role="alert"/);
  assert.match(pickerSource, /Nothing was saved\./);
  assert.match(pickerSource, /disabled=\{Boolean\(pendingTheme\)\}/);
});

test('the chosen world restores from the authenticated workspace profile', () => {
  assert.match(workspaceSource, /theme:p\.theme\|\|'not_set'/);
  assert.match(workspaceSource, /tribeBadge:p\.tribeBadge\|\|'Finding your world'/);
  assert.match(apiSource, /identity_workspaces SET profile=profile \|\| \$3::jsonb/);
  assert.match(hydratorSource, /fetch\("\/api\/me"/);
  assert.match(hydratorSource, /writeVerifiedAppSession\(data\.user\)/);
});

test('sign out removes the client beauty world from the document', () => {
  assert.match(applicatorSource, /removeAttribute\("data-beauty-world"\)/);
  assert.match(applicatorSource, /APP_SESSION_EVENT/);
  assert.match(clientSessionSource, /clearAppSession\(\)\{[^}]*dispatchEvent\(new Event\(APP_SESSION_EVENT\)\)/);
});

test('account and workspace switches never inherit another client theme', () => {
  assert.match(
    clientSessionSource,
    /old\?\.id!==next\.id\|\|old\?\.workspaceId!==next\.workspaceId\|\|old\?\.role!==next\.role/,
  );
  assert.match(applicatorSource, /activeBeautyWorld\(readAppSession\(\)\)/);
  assert.match(readSource('lib/beauty-world.ts'), /session\.role !== "client"/);
});

test('light mode remains the only colour scheme', () => {
  assert.match(layoutSource, /data-theme="light"/);
  assert.match(layoutSource, /data-color-scheme="light"/);
  assert.doesNotMatch(applicatorSource, /setAttribute\("data-theme"/);
  assert.doesNotMatch(applicatorSource, /classList\.add\("dark"\)/);
  assert.doesNotMatch(applicatorSource, /data-color-scheme/);
  assert.match(applicatorSource, /setAttribute\("data-beauty-world", theme\)/);
});

test('profile surfaces consume the semantic beauty world tokens', () => {
  assert.match(profileSource, /bw-cover/);
  assert.match(profileSource, /bw-surface/);
  assert.match(profileSource, /bw-heading/);
  assert.match(profileSource, /bw-chip/);
  assert.match(worldCardSource, /BeautyWorldPicker/);
  assert.match(cssSource, /\[data-beauty-world\] \.bw-surface/);
  assert.match(cssSource, /\[data-beauty-world\] \.beauty-card/);
  assert.match(cssSource, /\[data-beauty-world\] \.bw-cover/);
});

test('the five worlds keep distinct heading treatments and atmospheres', () => {
  const accents = new Set();
  const headings = new Set();
  const washes = new Set();

  for (const key of beautyWorld.BEAUTY_WORLD_KEYS) {
    const block = cssBlock(key);
    accents.add(block.match(/--bw-accent:\s+([^;]+)/)?.[1].trim());
    headings.add(block.match(/--bw-heading-font:\s+([^;]+)/)?.[1].trim());
    washes.add(block.match(/--bw-wash:\s+([^;]+)/)?.[1].trim());
  }

  assert.equal(accents.size, 5);
  assert.ok(headings.size >= 2);
  assert.equal(washes.size, 5);
  assert.match(cssSource, /html\[data-beauty-world\] body/);
});

test('the profile dialog is labelled, focus managed, and keyboard reachable', () => {
  assert.match(dialogSource, /role="dialog"/);
  assert.match(dialogSource, /aria-modal="true"/);
  assert.match(dialogSource, /aria-labelledby="profile-personalization-title"/);
  assert.match(dialogSource, /aria-describedby="profile-personalization-description"/);
  assert.match(dialogSource, /event\.key === "Escape"/);
  assert.match(dialogSource, /querySelectorAll<HTMLElement>/);
  assert.match(dialogSource, /previousFocus\.focus\(\)/);
  assert.match(dialogSource, /closeButtonRef\.current\?\.focus\(\)/);
  assert.match(pickerSource, /aria-pressed=\{active\}/);
  assert.match(pickerSource, /aria-busy=\{pending\}/);
});

test('the dialog keeps its heading and actions visible while content scrolls', () => {
  assert.match(dialogSource, /max-h-\[calc\(100dvh-0\.25rem\)\]/);
  assert.match(dialogSource, /min-h-0 flex-1 overflow-y-auto/);
  assert.match(dialogSource, /shrink-0 border-b/);
  assert.match(dialogSource, /shrink-0 border-t/);
  assert.match(dialogSource, /env\(safe-area-inset-top\)/);
  assert.match(dialogSource, /env\(safe-area-inset-bottom\)/);
  assert.match(dialogSource, /sm:items-center/);
});

test('Discover passes the active world into every discovery ranking consumer', () => {
  assert.match(discoverSource, /rankByBeautyWorld\(matchedLooks, beautyWorld, providerAffinity\)/);
  assert.match(discoverSource, /rankSalons\([\s\S]{0,1200}beautyWorld/);
  assert.match(discoverSource, /rankProfessionals\([\s\S]{0,1200}beautyWorld/);
  assert.match(collectionSource, /rankSalons\([\s\S]{0,1800}beautyWorld/);
  assert.match(collectionSource, /rankProfessionals\([\s\S]{0,1800}beautyWorld/);
  assert.match(discoverSource, /Search and filters always take priority\./);
});

test('ranking prefers shared affinity deterministically and keeps every item', () => {
  const feminine = {
    slug: 'feminine-salon',
    nextAvailable: 'Monday',
    location: 'Karen',
    startingPrice: 3000,
    mobileService: false,
    themeAffinity: ['feminine'],
  };
  const natural = {
    slug: 'natural-salon',
    nextAvailable: 'Monday',
    location: 'Karen',
    startingPrice: 2000,
    mobileService: false,
    themeAffinity: ['natural'],
  };

  assert.equal(ranking.rankSalons([natural, feminine], 'recommended', 'feminine')[0].slug, 'feminine-salon');
  assert.equal(ranking.rankSalons([feminine, natural], 'recommended', 'natural')[0].slug, 'natural-salon');
  assert.equal(ranking.rankSalons([natural, feminine], 'recommended', 'not_set')[0].slug, 'natural-salon');
  assert.deepEqual(
    ranking.rankSalons([natural, feminine], 'recommended', 'feminine').map((item) => item.slug).sort(),
    ['feminine-salon', 'natural-salon'],
  );
});

test('explicit sort and filters stay authoritative over theme affinity', () => {
  const feminine = {
    slug: 'feminine-salon',
    nextAvailable: 'Monday',
    location: 'Karen',
    startingPrice: 3000,
    mobileService: false,
    themeAffinity: ['feminine'],
  };
  const natural = {
    slug: 'natural-salon',
    nextAvailable: 'Today, 2:00 PM',
    location: 'Kilimani',
    startingPrice: 2000,
    mobileService: false,
    themeAffinity: ['natural'],
  };

  assert.deepEqual(
    ranking.rankSalons([feminine, natural], 'price-low', 'feminine').map((item) => item.slug),
    ['natural-salon', 'feminine-salon'],
  );
  assert.equal(ranking.rankSalons([feminine, natural], 'earliest', 'feminine')[0].slug, 'natural-salon');
  assert.match(discoverSource, /salons\.filter\([\s\S]{0,900}rankByBeautyWorld|rankSalons\(\s*salons\.filter/);
  assert.match(discoverSource, /if \(planFilterActive && !matchesPlanServiceIds/);
});

test('Home For You ranks real posts by the active world without touching Following', () => {
  assert.match(homeSource, /rankFeedPosts\(allPosts, beautyWorld, providerAffinity\)/);
  assert.match(homeSource, /activeTab === "following"[\s\S]{0,160}allPosts\.filter/);
  assert.match(homeSource, /For You leans toward your/);
  assert.match(homeSource, /session\.role === "client" && beautyWorld !== "not_set"/);
});

test('relevance uses existing post and provider metadata only', () => {
  const posts = [
    { id: 'cultural', caption: 'Knotless braids with beads', tags: ['braids', 'knotless'] },
    { id: 'nude', caption: 'Clean nude nails', tags: ['nude', 'minimal'] },
    { id: 'plain', caption: 'A quiet day', tags: [], authorSlug: 'plain-slug' },
  ];

  assert.equal(relevance.rankFeedPosts(posts, 'cultural')[0].id, 'cultural');
  assert.equal(relevance.rankFeedPosts(posts, 'african_nude')[0].id, 'nude');
  assert.deepEqual(relevance.rankFeedPosts(posts, 'not_set').map((post) => post.id), ['cultural', 'nude', 'plain']);
  assert.deepEqual(relevance.rankFeedPosts(posts, 'natural').map((post) => post.id).sort(), ['cultural', 'nude', 'plain']);
  const neutral = { id: 'plain', caption: 'A quiet day', tags: [], authorSlug: 'plain-slug' };
  assert.equal(relevance.beautyWorldRelevanceScore(neutral, 'cultural'), 0);
  assert.equal(
    relevance.beautyWorldRelevanceScore(neutral, 'cultural', (slug) => (slug === 'plain-slug' ? ['cultural'] : undefined)),
    8,
  );
  assert.doesNotMatch(readSource('lib/content-relevance.ts'), /writePost|SocialPost|fetch\(/);
});

test('booking, payments and authorization remain untouched', () => {
  assert.equal(flags.FEATURES.BOOKING_COMMITMENTS, false);
  assert.equal(flags.FEATURES.PAYMENTS_LIVE, false);
  assert.doesNotMatch(apiSource, /booking|payment/i);
  assert.match(apiSource, /requireAuthenticatedUser/);
  assert.doesNotMatch(clientSessionSource, /localStorage\.setItem\([^)]*theme/i);
});

test('themed UI stays emoji free and keeps the approved font families', () => {
  for (const source of [pickerSource, dialogSource, worldCardSource, readSource('lib/beauty-world.ts'), readSource('lib/content-relevance.ts')]) {
    assert.doesNotMatch(source, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  }

  for (const key of beautyWorld.BEAUTY_WORLD_KEYS) {
    const block = cssBlock(key);
    assert.doesNotMatch(block, /font-family/);
    assert.doesNotMatch(block, /@import|@font-face/);
    assert.match(block, /--bw-heading-font:\s+var\(--font-(display|sans)\)/);
  }

  assert.equal((cssSource.match(/@import url\("https:\/\/fonts\.googleapis\.com/g) ?? []).length, 1);
});

test('the Plan draft fix remains intact alongside beauty worlds', () => {
  const planDraft = readSource('lib/plan-draft.ts');
  const planTest = readSource('tests/plan-draft-persistence.cjs');
  assert.match(planDraft, /PLAN_DRAFT_STORAGE_KEY/);
  assert.match(planDraft, /planDraftScope/);
  assert.match(planTest, /Plan draft persistence regressions/);
  assert.match(discoverSource, /Your plan is saved in this tab/);
});
