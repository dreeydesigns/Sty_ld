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
const atmosphereSource = readSource('components/world-atmosphere.tsx');
const applicatorSource = readSource('components/theme-applicator.tsx');
const clientSessionSource = readSource('lib/client-session.ts');
const profileSource = readSource('components/role-profile-workspace.tsx');
const discoverSource = readSource('components/discover-content.tsx');
const collectionSource = readSource('components/discovery.tsx');
const homeSource = readSource('components/social-home.tsx');
const apiSource = readSource('app/api/users/me/route.ts');
const workspaceSource = readSource('lib/workspace-policy.ts');
const hydratorSource = readSource('components/session-hydrator.tsx');
const layoutSource = readSource('app/layout.tsx');
const cssSource = readSource('app/globals.css');

function cssBlock(theme) {
  const start = cssSource.indexOf(`:root[data-world="${theme}"]`);
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
    assert.match(cssBlock(key), /--world-accent:\s+#[0-9A-F]{6}/i);
    assert.match(cssBlock(key), /--world-accent-strong:\s+#[0-9A-F]{6}/i);
  }

  assert.equal(accents.size, 5);
  assert.equal(softs.size, 5);
  assert.equal(darks.size, 5);
});

test('server validates Pure and the five personalised values, then derives the badge', () => {
  assert.equal(beautyWorld.isBeautyWorldKey('feminine'), true);
  assert.equal(beautyWorld.isBeautyWorldKey('nude'), false);
  assert.equal(beautyWorld.isBeautyWorldKey('not_set'), false);
  assert.equal(beautyWorld.isBeautyWorldKey('dark'), false);
  assert.equal(beautyWorld.isPersistableWorldKey('not_set'), true);
  assert.equal(beautyWorld.isPersistableWorldKey('feminine'), true);
  assert.equal(beautyWorld.isPersistableWorldKey('dark'), false);
  assert.equal(beautyWorld.beautyWorldBadge('cultural'), 'The Daughter of the Soil');
  assert.equal(beautyWorld.worldBadge('default'), 'Finding your world');
  assert.equal(beautyWorld.worldBadge('african_nude'), 'The Muse');

  assert.match(apiSource, /isPersistableWorldKey\(theme\)/);
  assert.match(apiSource, /worldBadge\(theme\)/);
  assert.match(apiSource, /The tribe badge is set by the beauty world\./);
});

test('PATCH rejects unknown themes and non-client workspaces', () => {
  assert.match(apiSource, /Choose Pure or one of the five beauty worlds\./);
  assert.match(apiSource, /s\.workspace\.role!=='client'/);
  assert.match(apiSource, /Beauty worlds are available for client profiles\./);
  assert.match(apiSource, /Choose calm, balanced or immersive intensity\./);
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
  assert.match(workspaceSource, /const theme=typeof p\.theme==='string'&&p\.theme\?p\.theme:'not_set'/);
  assert.match(workspaceSource, /theme,tribeBadge:p\.tribeBadge\|\|'Finding your world'/);
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
  assert.match(applicatorSource, /activeWorld\(session\)/);
  assert.match(readSource('lib/beauty-world.ts'), /session\.role !== "client"/);
});

test('light mode remains the only colour scheme', () => {
  assert.match(layoutSource, /data-theme="light"/);
  assert.match(layoutSource, /data-color-scheme="light"/);
  assert.doesNotMatch(applicatorSource, /setAttribute\("data-theme"/);
  assert.doesNotMatch(applicatorSource, /classList\.add\("dark"\)/);
  assert.doesNotMatch(applicatorSource, /data-color-scheme/);
  assert.match(applicatorSource, /setAttribute\("data-world", world\.key\)/);
  assert.match(applicatorSource, /setAttribute\("data-intensity", activeWorldIntensity\(session\) \?\? "balanced"\)/);
  assert.match(applicatorSource, /setAttribute\("data-beauty-world", world\.key\)/);
  assert.match(applicatorSource, /removeAttribute\("data-world"\)/);
  assert.match(applicatorSource, /removeAttribute\("data-intensity"\)/);
});

test('profile surfaces consume the semantic beauty world tokens', () => {
  assert.match(profileSource, /bw-cover/);
  assert.match(profileSource, /bw-surface/);
  assert.match(profileSource, /bw-heading/);
  assert.match(profileSource, /bw-chip/);
  assert.match(worldCardSource, /BeautyWorldPicker/);
  assert.match(cssSource, /\[data-world\] \.bw-surface/);
  assert.match(cssSource, /\[data-world\] \.beauty-card/);
  assert.match(cssSource, /\[data-world\] \.bw-cover/);
});

test('the five worlds keep distinct heading treatments and atmospheres', () => {
  const accents = new Set();
  const headings = new Set();
  const washes = new Set();

  for (const key of beautyWorld.BEAUTY_WORLD_KEYS) {
    const block = cssBlock(key);
    accents.add(block.match(/--world-accent:\s+([^;]+)/)?.[1].trim());
    headings.add(block.match(/--world-heading-family:\s+([^;]+)/)?.[1].trim());
    washes.add(block.match(/--world-wash:\s+([^;]+)/)?.[1].trim());
  }

  assert.equal(accents.size, 5);
  assert.ok(headings.size >= 2);
  assert.equal(washes.size, 5);
  assert.match(cssSource, /html\[data-world\] body/);
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

test('the six world selector previews first and selects explicitly', () => {
  assert.deepEqual(
    [...beautyWorld.WORLD_KEYS],
    ['default', 'feminine', 'natural', 'spiritual', 'cultural', 'african_nude'],
  );
  assert.match(pickerSource, /WORLD_KEYS\.map/);
  assert.match(pickerSource, /worldPreviewDetails\(previewWorld\)/);
  assert.match(pickerSource, /onMouseEnter=\{\(\) => setPreviewWorld\(worldKey\)\}/);
  assert.match(pickerSource, /onFocus=\{\(\) => setPreviewWorld\(worldKey\)\}/);
  assert.match(pickerSource, /onClick=\{\(\) => setPreviewWorld\(worldKey\)\}/);
  assert.match(pickerSource, /Preview only\. Nothing changes until you select this world\./);
  assert.match(pickerSource, /Select this world/);
  assert.match(pickerSource, /getWorld\(/);
  assert.match(pickerSource, /aria-controls=\{previewId\}/);
  assert.doesNotMatch(pickerSource, /themeConfigs/);
  assert.doesNotMatch(pickerSource, /#[0-9A-F]{6}/i);
});

test('world previews explain every visual layer without changing behaviour', () => {
  const preview = beautyWorld.worldPreviewDetails('natural');
  assert.match(preview.colours, /Sage accent/);
  assert.match(preview.buttons, /forest ink/);
  assert.match(preview.glass, /Sage tinted glass/);
  assert.match(preview.atmosphere, /pollen/);
  assert.match(preview.interaction, /Grounded surfaces/);
  assert.match(preview.recommendations, /Natural hair/);
  assert.match(preview.unchanged, /bookings, payments/);

  for (const key of beautyWorld.WORLD_KEYS) {
    const details = beautyWorld.worldPreviewDetails(key);
    for (const value of Object.values(details)) {
      assert.equal(typeof value, 'string');
      assert.ok(value.length > 0);
    }
  }

  assert.equal(beautyWorld.worldPreviewDetails('default').atmosphere, 'None. Pure stays still and minimal.');
  assert.equal(beautyWorld.worldPreviewDetails('default').recommendations, 'Discovery stays balanced, with no world bias.');
});

test('intensity controls save Calm, Balanced and Immersive for the active world', () => {
  assert.match(pickerSource, /WORLD_INTENSITIES\.map/);
  assert.match(pickerSource, /saveClientWorldIntensity\(intensity\)/);
  assert.match(pickerSource, /worldIntensityLabel\(activeIntensity\)/);
  assert.match(pickerSource, /Pure stays minimal\. Choose a world to use Calm, Balanced or Immersive\./);
  assert.match(clientSessionSource, /body: JSON\.stringify\(\{ worldIntensity: intensity \}\)/);
  assert.match(apiSource, /profile\.worldIntensity=value/);
});

test('the atmosphere layer is session scoped and respects motion and data preferences', () => {
  assert.match(layoutSource, /<WorldAtmosphere/);
  assert.match(atmosphereSource, /activeWorld\(session\)/);
  assert.match(atmosphereSource, /activeWorldIntensity\(session\)/);
  assert.match(atmosphereSource, /state\.reducedMotion/);
  assert.match(atmosphereSource, /state\.dataSaver/);
  assert.match(atmosphereSource, /state\.world\.ambient === "none"/);
  assert.match(atmosphereSource, /AMBIENT_COUNT/);
  assert.match(cssSource, /\.world-atmosphere\s*\{/);
  assert.match(cssSource, /@media \(max-width: 639px\)/);
  assert.match(cssSource, /html\[data-reduce-motion="true"\] \.world-atmosphere/);
  assert.match(cssSource, /@media \(prefers-reduced-data: reduce\)/);

  for (const ambient of ['petals', 'pollen', 'stars', 'weave', 'shimmer']) {
    assert.match(cssSource, new RegExp(`\\[data-ambient="${ambient}"\\]`));
  }
});

test('studio and settings surfaces read world data from the registry', () => {
  assert.match(worldCardSource, /getWorld\(profile\.theme\)/);
  assert.match(worldCardSource, /worldIntensityLabel/);
  assert.doesNotMatch(worldCardSource, /getThemeConfig/);
  assert.doesNotMatch(dialogSource, /getThemeConfig/);
  assert.match(dialogSource, /getWorld\(clientProfile\?\.theme\)/);
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
    assert.match(block, /--world-heading-family:\s+var\(--font-(display|sans)\)/);
  }

  assert.equal((cssSource.match(/@import url\("https:\/\/fonts\.googleapis\.com/g) ?? []).length, 1);
});

test('the Plan draft fix remains intact alongside beauty worlds', () => {
  const planDraft = readSource('lib/plan-draft.ts');
  const planTest = readSource('tests/plan-draft-persistence.cjs');
  assert.match(planDraft, /PLAN_DRAFT_STORAGE_KEY/);
  assert.match(planDraft, /planDraftScope/);
  assert.match(planTest, /Plan draft persistence regressions/);
  assert.match(discoverSource, /Return to your plan/);
});

test('six registered worlds use unique stable keys', () => {
  assert.deepEqual([...beautyWorld.WORLD_KEYS], ['default', 'feminine', 'natural', 'spiritual', 'cultural', 'african_nude']);
  assert.equal(new Set(beautyWorld.WORLD_KEYS).size, beautyWorld.WORLD_KEYS.length);
  for (const key of beautyWorld.WORLD_KEYS) {
    assert.equal(beautyWorld.isWorldKey(key), true);
  }
});

test('Pure persists as not_set and restores the default world', () => {
  assert.equal(beautyWorld.worldKeyFromTheme('not_set'), 'default');
  assert.equal(beautyWorld.themeKeyForWorld('default'), 'not_set');
  assert.equal(beautyWorld.getWorld('default').ambient, 'none');
  assert.equal(beautyWorld.getWorld('default').ambientOpacity, 0);
});

test('legacy five-world keys remain valid theme values', () => {
  for (const key of ['feminine', 'natural', 'spiritual', 'cultural', 'african_nude']) {
    assert.equal(personalization.normalizeThemeKey(key), key);
    assert.ok(personalization.themeConfigs[key].displayName);
  }
});

test('root world selection changes semantic tokens and Pure restores the baseline', () => {
  assert.match(cssSource, /:root\[data-world="natural"\]/);
  assert.match(cssSource, /--world-accent:\s+#7B927E/);
  assert.match(cssSource, /--world-accent:\s+#C0A090/);
});

test('guests, professionals and salons inherit no client world', () => {
  assert.equal(beautyWorld.activeWorldKey({ role: 'guest', theme: 'natural' }), null);
  assert.equal(beautyWorld.activeWorldKey({ role: 'professional', theme: 'natural' }), null);
  assert.equal(beautyWorld.activeWorldKey({ role: 'salon', theme: 'natural' }), null);
  assert.equal(beautyWorld.activeWorld({ role: 'client', theme: 'natural' })?.key, 'natural');
});

test('account switching clears the previous client world', () => {
  assert.match(
    clientSessionSource,
    /old\?\.id!==next\.id\|\|old\?\.workspaceId!==next\.workspaceId\|\|old\?\.role!==next\.role/,
  );
  assert.match(applicatorSource, /removeAttribute\("data-world"\)/);
  assert.match(applicatorSource, /removeAttribute\("data-intensity"\)/);
});

test('saving a world uses authorized persistence and restores on failure', () => {
  assert.match(pickerSource, /saveClientBeautyWorld\(theme\)/);
  assert.match(clientSessionSource, /await fetch\("\/api\/users\/me"/);
  assert.match(apiSource, /requireAuthenticatedUser/);
  assert.match(clientSessionSource, /catch \(error\)[\s\S]*writeClientSession\(previous\)/);
  assert.match(pickerSource, /Nothing was saved\./);
});

test('intensity supports Calm, Balanced and Immersive', () => {
  assert.deepEqual([...beautyWorld.WORLD_INTENSITIES], ['calm', 'balanced', 'immersive']);
  assert.match(pickerSource, /saveClientWorldIntensity\(intensity\)/);
  assert.match(apiSource, /profile\.worldIntensity=value/);
});

test('Pure renders no ambient particles', () => {
  assert.equal(beautyWorld.getWorld('default').ambient, 'none');
  assert.match(atmosphereSource, /state\.world\.ambient === "none"/);
  assert.match(atmosphereSource, /return null/);
});

test('reduced motion and Data Saver suppress decorative ambience', () => {
  assert.match(cssSource, /html\[data-reduce-motion="true"\] \.world-atmosphere/);
  assert.match(cssSource, /@media \(prefers-reduced-data: reduce\)/);
  assert.match(atmosphereSource, /state\.reducedMotion/);
  assert.match(atmosphereSource, /state\.dataSaver/);
});

test('all six preview cards are accessible and require explicit confirmation', () => {
  assert.match(pickerSource, /aria-pressed=\{active\}/);
  assert.match(pickerSource, /aria-controls=\{previewId\}/);
  assert.match(pickerSource, /aria-label=/);
  assert.match(pickerSource, /aria-pressed=\{active\}/);
  assert.match(pickerSource, /Preview only\. Nothing changes until you select this world\./);
  assert.match(pickerSource, /Select this world/);
});

test('recommendation scoring is deterministic and preserves ties and Pure ordering', () => {
  const posts = [
    { id: 'cultural', caption: 'Knotless braids with beads', tags: ['braids', 'knotless'] },
    { id: 'nude', caption: 'Clean nude nails', tags: ['nude', 'minimal'] },
    { id: 'plain', caption: 'A quiet day', tags: [], authorSlug: 'plain-slug' },
  ];

  assert.deepEqual(relevance.rankFeedPosts(posts, 'cultural'), relevance.rankFeedPosts(posts, 'cultural'));
  assert.deepEqual(relevance.rankFeedPosts(posts, 'not_set').map((post) => post.id), posts.map((post) => post.id));
  const tied = relevance.rankFeedPosts([{ id: 'a', caption: 'quiet' }, { id: 'b', caption: 'quiet' }], 'natural');
  assert.deepEqual(tied.map((post) => post.id), ['a', 'b']);
});

test('explicit sorting stays authoritative over world affinity', () => {
  const feminine = { slug: 'feminine-salon', nextAvailable: 'Monday', location: 'Karen', startingPrice: 3000, mobileService: false, themeAffinity: ['feminine'] };
  const natural = { slug: 'natural-salon', nextAvailable: 'Today, 2:00 PM', location: 'Kilimani', startingPrice: 2000, mobileService: false, themeAffinity: ['natural'] };

  assert.deepEqual(ranking.rankSalons([feminine, natural], 'price-low', 'feminine').map((item) => item.slug), ['natural-salon', 'feminine-salon']);
  assert.equal(ranking.rankSalons([feminine, natural], 'earliest', 'feminine')[0].slug, 'natural-salon');
});

test('recommendation ranking never fabricates records and Following stays unaffected', () => {
  assert.doesNotMatch(readSource('lib/content-relevance.ts'), /writePost|SocialPost|fetch\(/);
  assert.match(homeSource, /activeTab === "following"[\s\S]{0,160}allPosts\.filter/);
});

test('Plan draft persistence and invalid provider contexts remain intact', () => {
  const planDraft = readSource('lib/plan-draft.ts');
  assert.match(planDraft, /PLAN_DRAFT_STORAGE_KEY/);
  assert.match(planDraft, /planDraftScope/);
  assert.match(discoverSource, /if \(planFilterActive && !matchesPlanServiceIds/);
});

test('booking and payment flags remain disabled', () => {
  assert.equal(flags.FEATURES.BOOKING_COMMITMENTS, false);
  assert.equal(flags.FEATURES.PAYMENTS_LIVE, false);
});

test('themed UI stays emoji free and keeps approved font families and logo constants', () => {
  for (const source of [pickerSource, dialogSource, worldCardSource, readSource('lib/beauty-world.ts'), readSource('lib/content-relevance.ts')]) {
    assert.doesNotMatch(source, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  }

  const logoSource = readSource('components/styld-logo.tsx');
  for (const color of ['#1D1D1B', '#C0A090', '#909888', '#FFFFFF']) {
    assert.ok(logoSource.includes(color), `logo must retain ${color}`);
  }
});
