/**
 * MOBILE-A11Y-05 and MOBILE-TYPE-06 regressions.
 *
 * The stored Reduce Motion setting used to reach only CSS, so the signature
 * loader, the onboarding tour and the scroll-to-top button kept animating.
 * High contrast changed text tokens but left blurred, translucent surfaces
 * untouched. Large text scaled with CSS zoom, which also scaled 100vw and
 * pushed mobile layouts past the screen edge.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('the stored reduce motion setting reaches every JavaScript animation', () => {
  const loader = read('components/signature-loader.tsx');
  assert.match(loader, /readSettings\(\)\.reduceMotion/, 'the loader must honour the app setting, not just the OS preference');
  assert.ok(
    loader.indexOf('readSettings().reduceMotion') < loader.indexOf('setActive(true)'),
    'the loader must decide to skip before it starts playing'
  );

  const tour = read('components/onboarding-tour.tsx');
  assert.match(tour, /readSettings\(\)\.reduceMotion/, 'the tour must not smooth-scroll under reduce motion');
  const tourEffect = tour.slice(tour.indexOf('const reduceMotion'), tour.indexOf('scrollIntoView'));
  assert.match(tourEffect, /readSettings\(\)\.reduceMotion/, 'the scroll decision reads the stored setting');

  const scrollTop = read('components/scroll-to-top.tsx');
  assert.match(scrollTop, /readSettings\(\)\.reduceMotion/, 'scroll to top must honour the stored setting');
  assert.match(scrollTop, /behavior: reduceMotion \? "auto" : "smooth"/);
});

test('high contrast flattens translucent surfaces and protects focus and dark-surface text', () => {
  const css = read('app/globals.css');
  const block = css.slice(css.indexOf('html[data-high-contrast="true"] {'));
  assert.match(block, /--text-secondary:\s*#2b2621/);
  assert.match(block, /\[class\*="backdrop-blur"\][\s\S]*?backdrop-filter:\s*none !important/, 'blur is removed');
  // Taking the blur out used to leave the fill see-through, so the mode now solidifies the
  // resting surface too, at the token level for the frosted sheets and at the utility level for
  // chips. `tests/browser/high-contrast.cjs` measures the result in a real page.
  assert.match(block, /--world-glass-tint:\s*#FFFFFF/, 'the frosted sheets become solid');
  assert.match(css, /:is\(\[class\^="bg-white\/"\], \[class\*=" bg-white\/"\]\)[\s\S]*?background-color:\s*#FFFFFF !important/, 'translucent chips become solid');
  assert.match(css, /:is\(\[class\^="bg-black\/"\], \[class\*=" bg-black\/"\]\):not\(\[class\*="inset-0"\]\)[\s\S]*?background-color:\s*#1A1A2E !important/, 'dark chips become solid, dim layers stay');
  // A badge can carry the dim fill and the white label on one element, and the descendant rule that
  // protects a label inside a solidified chip cannot reach that case.
  assert.match(css, /:is\(\[class\^="bg-white\/"\], \[class\*=" bg-white\/"\]\):is\(\[class\*="text-white"\]\)[\s\S]*?color:\s*#1A1A2E !important/, 'a white label on the element the mode solidified turns to ink');
  // Only a token that is the resting style may be rewritten. The old `[class*="text-white/"]`
  // also matched `hover:`, `placeholder:` and `disabled:`, which repainted states nobody asked
  // about, so both forms below anchor the match at a token boundary.
  assert.match(css, /:is\(\[class\^="text-white\/"\], \[class\*=" text-white\/"\]\)[\s\S]*?color:\s*#FFFFFF !important/, 'muted white text becomes solid white');
  assert.doesNotMatch(css, /\[class\*="text-white\/"\]/, 'a substring match would also catch variant tokens');
  assert.match(css, /:focus-visible[\s\S]*?outline:\s*3px solid var\(--focus-ring\) !important/, 'focus stays visible');
});

test('large text scales the root font size instead of the viewport', () => {
  const applicator = read('components/theme-applicator.tsx');
  const css = read('app/globals.css');
  assert.match(applicator, /TEXT_SCALE_VALUES/);
  assert.match(applicator, /--text-scale/);
  assert.doesNotMatch(applicator, /--zoom|ZOOM_MAP/);
  assert.match(css, /html \{\s*font-size: calc\(100% \* var\(--text-scale, 1\)\);/);
  assert.doesNotMatch(css, /html \{\s*zoom:/, 'CSS zoom scales 100vw and breaks mobile width containment');
});
