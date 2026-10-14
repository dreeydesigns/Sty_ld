/**
 * STYLD landing page (Editorial Light, Phase 2B) regression suite.
 *
 * Locks the product/trust integrity and visual rules of the approved landing:
 *   - no splash screen, no autoplay video, no Rose CTAs, no select-none
 *   - the product preview + Inside STYLD are labelled ILLUSTRATIVE / SAMPLE DATA
 *   - no fabricated providers, verification, reviews, ratings, popularity,
 *     availability, testimonials or engagement metrics
 *   - booking + payments are explicitly NOT live
 *   - the 3-step journey is Discover / Compare / Plan
 *   - CTAs resolve to real routes; the shared Button + official logo are used
 *
 * Source-level assertions only (no component execution). Comments are stripped
 * first so the descriptive header cannot false-positive the content checks.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const raw = read('components/landing-client.tsx');
const landing = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

test('landing removes the splash screen, autoplay video and dark-theme defects', () => {
  assert.ok(!/<video/i.test(landing), 'landing must not render a <video> (no autoplay hero)');
  assert.ok(!/autoPlay|autoplay/i.test(landing), 'no autoplay media');
  assert.ok(!/showSplash|splash/i.test(landing), 'no splash screen');
  assert.ok(!/select-none/i.test(landing), 'must not disable text selection');
  assert.ok(!/#E03460/i.test(landing), 'no Rose accent anywhere');
});

test('landing is built from the shared Button and the official logo', () => {
  assert.match(landing, /import\s*\{\s*Button\s*\}\s*from\s*"@\/components\/ui\/button"/);
  assert.match(landing, /import\s*\{\s*StyldLockup\s*\}\s*from\s*"@\/components\/styld-logo"/);
  assert.match(landing, /import\s*\{\s*FEATURES\s*\}\s*from\s*"@\/lib\/feature-flags"/);
  assert.match(landing, /<StyldLockup/, 'official STYLD lockup must render');
});

test('product preview and Inside STYLD are explicitly labelled illustrative / sample data', () => {
  assert.match(landing, /Illustrative preview/i, 'preview must be labelled illustrative');
  assert.match(landing, /sample data/i, 'preview must carry a sample-data label');
  assert.match(landing, /Sample (Salon|Studio|Professional|discovery feed)/, 'sample entities must be named as samples');
  assert.match(landing, /Not real providers/i, 'Inside STYLD must state it is not real providers');
});

test('no fabricated providers, verification, reviews, ratings, popularity or availability claims', () => {
  // Only claims that assert a live/impressive capability are forbidden. The copy
  // may mention "reviews"/"verified" purely to negate them (e.g. "not real
  // providers, reviews, or live availability", "Verified badges are not available
  // yet"), which is exactly the honesty we want.
  const forbidden = [
    /Popular near you/i,
    /Live product preview/i,
    /testimonial/i,
    /rating/i,
    /available (appointment|slot|time)s?/i,
    /\d+(\.\d+)?\s*%/,
  ];
  for (const re of forbidden) {
    assert.ok(!re.test(landing), `landing must not claim: ${re}`);
  }
  // verification is only ever referenced as "coming soon", never as a live feature
  assert.match(landing, /Verification coming soon/i);
});

test('booking and payments are explicitly not live', () => {
  assert.match(landing, /coming soon/i, 'booking must be framed as coming soon');
  assert.match(landing, /does not collect payments|Not available yet/);
});

test('the three-step journey is Discover / Compare / Plan', () => {
  for (const step of ['Discover', 'Compare', 'Plan']) {
    assert.ok(landing.includes(step), `journey must include the "${step}" step`);
  }
  assert.match(landing, /Booking requests are coming soon/i);
});

test('all landing CTAs resolve to real routes', () => {
  const routes = [
    '/discover',
    '/auth/sign-up',
    '/auth/sign-in',
    '/onboarding/salon',
    '/onboarding/professional',
    '/privacy',
    '/terms',
    '/help',
  ];
  for (const r of routes) {
    assert.ok(landing.includes(r), `expected a CTA/link to ${r}`);
  }
  assert.ok(!/href="\/shop/i.test(landing), 'must not link to gated surfaces');
});

test('touch targets meet the 44px minimum (Button small size)', () => {
  const button = read('components/ui/button.tsx');
  assert.match(button, /sm:\s*"min-h-11 /, 'Button sm must be at least 44px tall');
});
