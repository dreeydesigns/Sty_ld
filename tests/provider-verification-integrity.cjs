/**
 * T7A provider verification integrity suite.
 *
 * Locks the rule that no Professional or Salon is presented as
 * identity-verified or business-verified unless a trusted, server-backed
 * verification record exists. Today no such records exist, so every provider
 * badge must stay hidden and no filter, sort or ranking may reward an
 * unsupported verified flag.
 *
 *   1. a static "verified: true" source creates no badge
 *   2. client-manipulated / loose verification values cannot create a badge
 *   3. unsupported "verified only" filters no longer mislead
 *   4. provider discovery and booking deep links still work
 *   5. verification does not influence ranking
 *   6. no existing booking or authorization behaviour is weakened
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch })(
    (name) => dependencies[name] || require(name), module, module.exports,
  );
  return module.exports;
}

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function stripped(file) {
  return source(file)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

const verification = load('lib/verification.ts');

test('a static verified flag can never produce a verification record', () => {
  assert.equal(verification.hasVerificationEvidence(true), false);
  assert.equal(verification.hasVerificationEvidence(false), false);
  assert.equal(verification.hasVerificationEvidence({ verified: true }), false);
  assert.equal(verification.hasVerificationEvidence({ slug: 'njeri-kamau', verified: true }), false);
  assert.equal(verification.resolveProviderVerification({ slug: 'njeri-kamau' }), null);
});

test('seed providers no longer carry a true verified flag', () => {
  const siteData = stripped('lib/site-data.ts');
  assert.doesNotMatch(siteData, /verified:\s*true/);
  assert.match(siteData, /verified:\s*false/);
});

test('client-manipulated or partial verification values are rejected', () => {
  const loose = [
    undefined,
    null,
    0,
    1,
    'verified',
    {},
    { kind: 'identity' },
    { kind: 'identity', evidenceId: 'ev-1' },
    { kind: 'identity', evidenceId: '', verifiedAt: '2026-01-01T00:00:00Z' },
    { kind: 'identity', evidenceId: '   ', verifiedAt: '2026-01-01T00:00:00Z' },
    { kind: 'identity', evidenceId: 'ev-1', verifiedAt: '' },
    { kind: 'gold', evidenceId: 'ev-1', verifiedAt: '2026-01-01T00:00:00Z' },
  ];

  for (const value of loose) {
    assert.equal(verification.hasVerificationEvidence(value), false, `must reject: ${JSON.stringify(value)}`);
  }

  assert.equal(
    verification.hasVerificationEvidence({ kind: 'identity', evidenceId: 'ev-1', verifiedAt: '2026-01-01T00:00:00Z' }),
    true,
    'a complete trusted record is the only accepted shape',
  );
});

test('launch suppresses provider badges even with a complete evidence-shaped object', () => {
  const file = ts.createSourceFile('marketplace.tsx', source('components/marketplace-ui.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const badge = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'VerifiedBadge');
  assert.ok(badge);
  const code = ts.transpileModule(badge.getText(file).replace('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const render = new Function(code + '; return VerifiedBadge;')();
  for (const value of [null, true, { kind: 'identity', evidenceId: 'ev-1', verifiedAt: '2026-01-01T00:00:00Z' }]) assert.equal(render({ verification: value }), null);
});

test('unsupported verified-only filters and sorts are removed', () => {
  const discovery = stripped('components/discovery.tsx');
  assert.doesNotMatch(discovery, /Verified only/);
  assert.doesNotMatch(discovery, /item\.verified/);
  assert.doesNotMatch(discovery, /Verified spaces/);

  const discover = stripped('components/discover-content.tsx');
  assert.doesNotMatch(discover, /Verified only/);
  assert.doesNotMatch(discover, /s\.verified/);
  assert.doesNotMatch(discover, /p\.verified/);

  const booking = stripped('components/booking-experience.tsx');
  assert.doesNotMatch(booking, /Verified only/);
  assert.doesNotMatch(booking, /provider\.verified/);

  const signup = stripped('components/client-signup-flow.tsx');
  assert.doesNotMatch(signup, /professional\.verified/);

  const social = stripped('components/social-home.tsx');
  assert.doesNotMatch(social, /localPost\.verified/);
});

test('public provider links use gated profiles and retired sample URLs fail closed', () => {
  for (const file of ['app/[collection]/[slug]/page.tsx', 'app/professionals/preview/page.tsx', 'app/professionals/[slug]/page.tsx', 'app/salons/[slug]/page.tsx', 'app/u/[id]/page.tsx']) {
    const retired = load(file, { 'next/navigation': { notFound: () => { throw new Error('404'); } } });
    assert.throws(() => retired.default(), /404/);
    assert.equal(retired.metadata.robots.index, false);
  }
  const profile = source('app/creators/[workspaceId]/page.tsx');
  assert.match(profile, /readPublicDiscovery\(authPool, workspaceId\)/);
  assert.match(profile, /index: false/);
  assert.doesNotMatch(profile, /VerifiedBadge|profilePhoto|phone|email|exactAddress/);
});

test('verification no longer influences marketplace ranking', () => {
  const ranking = stripped('lib/discovery-ranking.ts');
  assert.doesNotMatch(ranking, /verified/);
  assert.doesNotMatch(ranking, /verification/);

  const mod = load('lib/discovery-ranking.ts', {
    '@/lib/personalization': { normalizeThemeKey: (value) => value || 'not_set' },
  });

  const base = {
    rating: 4.8,
    reviewCount: 40,
    responseSpeedMinutes: 20,
    completionRate: 95,
    repeatBookings: 12,
    savedCount: 30,
    trendingScore: 5,
    nextAvailable: "Today, 2:00 PM",
    location: "Kilimani",
    serviceMode: "Both",
    gallery: [],
  };

  const withFlag = { ...base, slug: "a", name: "A", verified: true };
  const withoutFlag = { ...base, slug: "b", name: "B", verified: false };

  assert.equal(mod.scoreProfessional(withFlag), mod.scoreProfessional(withoutFlag));

  const ranked = mod.rankProfessionals([withoutFlag, withFlag], "top-rated");
  assert.equal(ranked.length, 2, "ranking keeps every provider, filtering by a flag is gone");
});

test('booking and authorization behaviour is untouched by the badge change', () => {
  const clientSession = stripped('lib/client-session.ts');
  assert.doesNotMatch(clientSession, /verified:\s*false/);
  assert.doesNotMatch(clientSession, /verified:\s*boolean/);

  const booking = stripped('components/booking-experience.tsx');
  assert.match(booking, /function sortProviders\(/);
  assert.match(booking, /providerDistanceScore\(/);
  assert.match(booking, /PROVIDER_SORTS/);

  const flags = load('lib/feature-flags.ts');
  assert.equal(flags.FEATURES.PAYMENTS_LIVE, false);
  assert.equal(flags.FEATURES.BOOKING_COMMITMENTS, false);
  assert.equal(flags.FEATURES.BOOKINGS, true);
  assert.equal(flags.FEATURES.DISCOVERY, true);
});
