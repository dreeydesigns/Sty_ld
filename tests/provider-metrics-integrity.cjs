/**
 * T7B3 provider metrics and engagement integrity suite.
 *
 * Locks the rule that Styld never presents a Professional or Salon with a
 * rating, review count, response time, completion rate, repeat-booking count,
 * save count or trending score unless a trusted server record backs it. Those
 * records do not exist today, so no seed provider may carry these figures and
 * no ranking or sort may reward them.
 *
 *   1. static provider data cannot produce public ratings or review counts
 *   2. no fabricated engagement metric is seeded on any provider
 *   3. unsupported metrics do not influence ranking
 *   4. unsupported sorting options are removed or neutralised
 *   5. location and service filtering still function
 *   6. Salon and Professional profiles still render
 *   7. booking deep links and the provider picker remain intact
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

const siteData = load('lib/site-data.ts');
const ranking = load('lib/discovery-ranking.ts', {
  '@/lib/personalization': { normalizeThemeKey: (value) => value || 'not_set' },
});

const METRIC_FIELDS = [
  'rating',
  'reviewCount',
  'responseSpeedMinutes',
  'completionRate',
  'repeatBookings',
  'savedCount',
  'trendingScore',
];

test('static provider data carries no public rating or review count', () => {
  assert.ok(Array.isArray(siteData.salons) && siteData.salons.length > 0);
  assert.ok(Array.isArray(siteData.professionals) && siteData.professionals.length > 0);

  for (const provider of [...siteData.salons, ...siteData.professionals]) {
    assert.ok(!('rating' in provider), `${provider.slug} must not carry a rating`);
    assert.ok(!('reviewCount' in provider), `${provider.slug} must not carry a review count`);
  }

  const data = stripped('lib/site-data.ts');
  assert.match(data, /rating\?: number;/);
  assert.match(data, /reviewCount\?: number;/);
});

test('no fabricated engagement metric is seeded on any provider', () => {
  for (const provider of [...siteData.salons, ...siteData.professionals]) {
    for (const field of METRIC_FIELDS) {
      assert.ok(!(field in provider), `${provider.slug} must not carry ${field}`);
    }
  }

  const data = stripped('lib/site-data.ts');
  for (const field of ['reviewCount', 'responseSpeedMinutes', 'completionRate', 'repeatBookings', 'savedCount', 'trendingScore']) {
    assert.doesNotMatch(data, new RegExp(`${field}\\s*:`), `${field} must not be populated in seed data`);
  }
  assert.doesNotMatch(data, /Most booked/, 'the comparative "Most booked" badge is removed');
});

test('unsupported metrics do not influence provider ranking', () => {
  const base = {
    slug: 'a', name: 'A', specialty: 'Hair', location: 'Kilimani', serviceMode: 'Both',
    salonAffiliation: 'Independent', areasServed: [], startingPrice: 2000, verified: false,
    bio: '', description: '', heroMood: '', serviceIds: [], packageOffers: [], gallery: [],
    faq: [], nextAvailable: 'Today, 2:00 PM', identityAttributes: [],
  };

  const inflated = { ...base, rating: 5, reviewCount: 900, responseSpeedMinutes: 1, completionRate: 100, repeatBookings: 500, savedCount: 900, trendingScore: 100 };
  const deflated = { ...base, rating: 1, reviewCount: 1, responseSpeedMinutes: 500, completionRate: 10, repeatBookings: 0, savedCount: 0, trendingScore: 0 };

  assert.equal(ranking.scoreProfessional(inflated), ranking.scoreProfessional(deflated), 'metric fields must not change the score');

  const ranked = ranking.rankProfessionals([deflated, inflated], 'recommended');
  assert.equal(ranked.length, 2, 'ranking keeps every provider');

  const rankingSource = stripped('lib/discovery-ranking.ts');
  for (const field of METRIC_FIELDS) {
    assert.doesNotMatch(rankingSource, new RegExp(field), `ranking must not reference ${field}`);
  }
});

test('unsupported comparative sorting options are removed or neutralised', () => {
  const discovery = stripped('components/discovery.tsx');
  assert.doesNotMatch(discovery, /Top rated/);
  assert.doesNotMatch(discovery, /top-rated/);
  assert.match(discovery, /Recommended/);

  const discover = stripped('components/discover-content.tsx');
  assert.doesNotMatch(discover, /top-rated/);
  assert.match(discover, /recommended/);

  const booking = stripped('components/booking-experience.tsx');
  assert.doesNotMatch(booking, /Top rated/);
  assert.doesNotMatch(booking, /Fastest response/);
  assert.doesNotMatch(booking, /Most booked/);
  assert.doesNotMatch(booking, /\.rating/);
  assert.doesNotMatch(booking, /\.reviewCount/);
  assert.doesNotMatch(booking, /responseSpeedMinutes/);
});

test('location and service filtering still function', () => {
  const discovery = stripped('components/discovery.tsx');
  assert.match(discovery, /item\.location\.includes\(value\)/);
  assert.match(discovery, /item\.specialty\.includes\(value\)/);
  assert.match(discovery, /\.serviceIds\.some\(/);

  const discover = stripped('components/discover-content.tsx');
  assert.match(discover, /look\.category\.includes/);
  assert.match(discover, /s\.location\.includes/);
  assert.match(discover, /p\.location\.includes/);
  assert.match(discover, /look\.startingPrice/);
});

test('Salon and Professional profiles still render', () => {
  const detail = stripped('app/[collection]/[slug]/page.tsx');
  assert.match(detail, /getSalon\(slug\)/);
  assert.match(detail, /getProfessional\(slug\)/);
  assert.match(detail, /<VerifiedBadge verification=\{resolveProviderVerification\(item\)\}/);

  const preview = stripped('app/professionals/preview/page.tsx');
  assert.match(preview, /getProfessional/);

  const marketplace = stripped('components/marketplace-ui.tsx');
  assert.match(marketplace, /export function SalonCard/);
  assert.match(marketplace, /export function ProfessionalCard/);
  assert.doesNotMatch(marketplace, /salon\.rating/);
  assert.doesNotMatch(marketplace, /salon\.reviewCount/);
  assert.doesNotMatch(marketplace, /professional\.rating/);
  assert.doesNotMatch(marketplace, /professional\.reviewCount/);
  assert.doesNotMatch(marketplace, /professional\.completionRate/);
  assert.doesNotMatch(marketplace, /professional\.responseSpeedMinutes/);
});

test('booking deep links and the provider picker remain intact', () => {
  const booking = stripped('components/booking-experience.tsx');
  assert.match(booking, /function toBookableProvider\(/);
  assert.match(booking, /PROVIDER_SORTS/);
  assert.match(booking, /providerDistanceScore\(/);
  assert.match(booking, /Nearest first/);
  assert.match(booking, /Soonest available/);
  assert.match(booking, /targetType/);

  const marketplace = stripped('components/marketplace-ui.tsx');
  assert.match(marketplace, /buildBookingHref\(\{ targetType: "salons", targetId: salon\.slug \}\)/);
  assert.match(marketplace, /buildBookingHref\(\{ targetType: "professionals", targetId: professional\.slug \}\)/);

  const data = siteData;
  for (const provider of [...data.salons, ...data.professionals]) {
    assert.ok(provider.slug && provider.name, 'provider identity preserved');
    assert.ok(Array.isArray(provider.serviceIds), 'service catalogue preserved');
    assert.ok(typeof provider.startingPrice === 'number', 'transparent pricing preserved');
  }
});
