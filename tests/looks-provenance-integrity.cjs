/**
 * T7B2 Looks provenance and social-proof integrity suite.
 *
 * Locks the rule that a "Look" is presented as visual inspiration only. It must
 * never carry a hardcoded verified-review count, a fabricated star rating, or a
 * verification badge that claims a completed appointment or verified stylist
 * work without a trusted server record. Those records do not exist today.
 *
 *   1. hardcoded verified-review counts and ratings are gone from Looks data
 *   2. Look cards expose no "Verified Client Look" / "Verified Stylist Work"
 *   3. sample portfolios cannot receive a verified status from static data
 *   4. genuine look content and navigation are preserved
 *   5. booking deep links and feed rendering still work
 *   6. the shared verification interface still rejects unsupported claims
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

const looks = load('lib/looks-data.ts', { './site-data': { imageAssets: {} } });
const verification = load('lib/verification.ts');

test('looks data carries no hardcoded verified-review counts or ratings', () => {
  assert.ok(Array.isArray(looks.BEAUTY_LOOKS) && looks.BEAUTY_LOOKS.length > 0);

  for (const look of looks.BEAUTY_LOOKS) {
    assert.ok(!('verifiedClientReviewsCount' in look), `${look.id} must not carry verifiedClientReviewsCount`);
    assert.ok(!('rating' in look), `${look.id} must not carry a rating`);
  }

  const looksSource = stripped('lib/looks-data.ts');
  assert.doesNotMatch(looksSource, /verifiedClientReviewsCount/);
  assert.doesNotMatch(looksSource, /\brating\b/);
});

test('look cards expose no verified client or stylist verification badge', () => {
  const marketplace = stripped('components/marketplace-ui.tsx');
  assert.doesNotMatch(marketplace, /Verified Client Look/);
  assert.doesNotMatch(marketplace, /Verified Stylist Work/);
  assert.doesNotMatch(marketplace, /look\.verifiedClientReviewsCount/);
  assert.doesNotMatch(marketplace, /look\.rating/);
  assert.doesNotMatch(marketplace, /look\.provenance/);
  assert.match(marketplace, /No reviews yet/);
});

test('sample portfolios cannot receive a verified status from static data', () => {
  assert.equal(verification.hasVerificationEvidence(true), false);
  assert.equal(verification.hasVerificationEvidence({ verified: true }), false);
  assert.equal(verification.hasVerificationEvidence({ provenance: 'verified_portfolio' }), false);
  assert.equal(verification.resolveProviderVerification({ provenance: 'verified_portfolio' }), null);

  const discover = stripped('app/discover/page.tsx');
  assert.doesNotMatch(discover, /Completed booking look/);
  assert.doesNotMatch(discover, /Stylist portfolio look/);
  assert.doesNotMatch(discover, /Provenance/);
  assert.doesNotMatch(discover, /look\.provenance/);
});

test('genuine look content and navigation are preserved', () => {
  const marketplace = stripped('components/marketplace-ui.tsx');
  assert.match(marketplace, /<ImageLayer asset=\{look\.image\}/);
  assert.match(marketplace, /look\.title/);
  assert.match(marketplace, /look\.providerName/);
  assert.match(marketplace, /look\.location/);
  assert.match(marketplace, /formatKES\(look\.startingPrice\)/);
  assert.match(marketplace, /look\.estimatedDuration/);
  assert.match(marketplace, /look\.serviceMode/);
  assert.match(marketplace, /SaveHeart slug=\{`look-\$\{look\.id\}`\}/);

  for (const look of looks.BEAUTY_LOOKS) {
    assert.ok(typeof look.title === 'string' && look.title.length > 0, `${look.id} keeps its title`);
    assert.ok(look.startingPrice > 0, `${look.id} keeps its price`);
    assert.ok(look.nextAvailable, `${look.id} keeps its availability`);
    assert.ok(look.provenance, `${look.id} keeps the preserved provenance field`);
  }
});

test('booking deep links and looks feed rendering still work', () => {
  const marketplace = stripped('components/marketplace-ui.tsx');
  assert.match(marketplace, /buildBookingHref/);
  assert.match(marketplace, /targetType: look\.providerType/);
  assert.match(marketplace, /targetId: look\.providerSlug/);
  assert.match(marketplace, /serviceId=\$\{look\.serviceId\}/);
  assert.match(marketplace, /lookTitle=\$\{encodeURIComponent\(look\.title\)\}/);

  const discover = stripped('app/discover/page.tsx');
  assert.match(discover, /loadInspireFeed/);
  assert.match(discover, /<InspireLookCard key=\{look\.id\} item=\{look\}/);
});

test('the shared verification interface still rejects unsupported claims', () => {
  const loose = [
    undefined, null, 0, 'verified', {}, { verified: true },
    { kind: 'identity' },
    { kind: 'identity', evidenceId: '', verifiedAt: '2026-01-01T00:00:00Z' },
  ];
  for (const value of loose) {
    assert.equal(verification.hasVerificationEvidence(value), false, `must reject: ${JSON.stringify(value)}`);
  }
  assert.equal(
    verification.hasVerificationEvidence({ kind: 'identity', evidenceId: 'ev-1', verifiedAt: '2026-01-01T00:00:00Z' }),
    true,
  );
});
