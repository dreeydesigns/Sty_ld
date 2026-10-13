/**
 * T7B4 testimonial and review integrity suite.
 *
 * Locks the rule that Styld never shows a customer testimonial, star rating or
 * review count that is not backed by a genuine, server-side review record
 * created after a completed booking.
 *
 *   1. the static testimonials dataset is empty
 *   2. fabricated testimonial identities are removed
 *   3. public review sections guard on real data and show honest empty states
 *   4. reusable review components and their shape remain available
 *   5. the reviews API keeps authentication and is contained against unsafe writes
 *   6. ratings and review counts cannot be produced from demonstration data
 *   7. provider and booking navigation is preserved
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

function stripped(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

const siteData = load('lib/site-data.ts');

test('the static testimonials dataset is empty', () => {
  assert.ok(Array.isArray(siteData.testimonials), 'testimonials export must stay a ReviewSnapshot array');
  assert.equal(siteData.testimonials.length, 0, 'no seed testimonials may be published');
});

test('fabricated testimonial identities are removed', () => {
  const data = stripped('lib/site-data.ts');
  for (const name of ['Anne N.', 'Nimo M.', 'Shiko W.']) {
    assert.equal(data.includes(name), false, `${name} testimonial must be gone`);
  }
  assert.doesNotMatch(data, /rating:\s*5/, 'no static five-star endorsement may remain');
  assert.doesNotMatch(data, /export const testimonials: ReviewSnapshot\[\] = \[\s*\{/);
});

test('public review sections guard on real data and show honest empty states', () => {
  for (const file of ['app/[collection]/[slug]/page.tsx', 'app/professionals/preview/page.tsx']) {
    const src = stripped(file);
    assert.match(src, /testimonials\.length > 0/, `${file} must guard the reviews section`);
    assert.match(src, /ReviewsEmptyState/, `${file} must show an honest empty state`);
  }

  const booking = stripped('components/booking-experience.tsx');
  assert.match(booking, /testimonials\.length > 0/, 'booking reviews section must guard on real data');
});

test('reusable review components and their shape remain available', () => {
  const ui = stripped('components/marketplace-ui.tsx');
  assert.match(ui, /export function ReviewCard\(/, 'ReviewCard must stay reusable');
  assert.match(ui, /export function ReviewsEmptyState\(/);
  assert.match(ui, /No reviews yet/);

  const data = stripped('lib/site-data.ts');
  assert.match(data, /export interface ReviewSnapshot/, 'ReviewSnapshot shape must remain for genuine reviews');
  assert.match(data, /rating: number;/, 'ReviewSnapshot.rating is required for real records');
});

test('the reviews API keeps authentication and is contained against unsafe writes', () => {
  const api = stripped('app/api/reviews/route.ts');
  assert.match(api, /verifySession\(token\)/, 'reviews still require an authenticated session');
  assert.match(api, /status: 503/, 'review submission is contained with an unavailable response');
  assert.doesNotMatch(api, /INSERT INTO reviews/, 'contained endpoint must never insert a review');
  assert.doesNotMatch(api, /is_verified/, 'no hardcoded verified flag may remain');
  assert.doesNotMatch(api, /client_first_name/, 'public reads must not expose reviewer identity');
});

test('ratings and review counts cannot be produced from demonstration data', () => {
  for (const provider of [...siteData.salons, ...siteData.professionals]) {
    assert.ok(!('rating' in provider), `${provider.slug} must not carry a rating`);
    assert.ok(!('reviewCount' in provider), `${provider.slug} must not carry a review count`);
  }
  assert.equal(siteData.testimonials.length, 0);
});

test('provider and booking navigation is preserved', () => {
  const detail = stripped('app/[collection]/[slug]/page.tsx');
  assert.match(detail, /getSalon\(slug\)/);
  assert.match(detail, /getProfessional\(slug\)/);
  assert.match(detail, /buildBookingHref/);

  const preview = stripped('app/professionals/preview/page.tsx');
  assert.match(preview, /getProfessional/);
  assert.match(preview, /buildBookingHref/);

  const booking = stripped('components/booking-experience.tsx');
  assert.match(booking, /toBookableProvider/);
  assert.match(booking, /targetType/);
});
