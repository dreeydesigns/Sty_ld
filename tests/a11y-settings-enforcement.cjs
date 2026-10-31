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
  assert.match(block, /\[class\*="text-white\/"\][\s\S]*?color:\s*#FFFFFF !important/, 'muted white text becomes solid white');
  assert.match(block, /:focus-visible[\s\S]*?outline:\s*3px solid var\(--focus-ring\) !important/, 'focus stays visible');
});

test('large text scales the root font size instead of the viewport', () => {
  const applicator = read('components/theme-applicator.tsx');
  const css = read('app/globals.css');
  assert.match(applicator, /TEXT_SCALE_MAP/);
  assert.match(applicator, /--text-scale/);
  assert.doesNotMatch(applicator, /--zoom|ZOOM_MAP/);
  assert.match(css, /html \{\s*font-size: calc\(100% \* var\(--text-scale, 1\)\);/);
  assert.doesNotMatch(css, /html \{\s*zoom:/, 'CSS zoom scales 100vw and breaks mobile width containment');
});
