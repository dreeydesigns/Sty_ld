// Pillar 4 guards. The signature loader is a brand gesture, so the things worth
// pinning are the ones that keep it honest: unchanged official artwork, cold
// session only, a real 600ms hold, a fail-safe, and no global loading fallback.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('there is no root app/loading.tsx and the loader is not a Suspense fallback', () => {
  assert.equal(fs.existsSync(path.join(root, 'app/loading.tsx')), false, 'app/loading.tsx must stay removed');

  const layout = read('app/layout.tsx');
  assert.match(layout, /<SignatureLoader \/>/, 'the loader is mounted beside the children');
  assert.doesNotMatch(layout, /Suspense/, 'it is not wrapped in a Suspense boundary');
});

test('the loader draws the shipped Logo Book artwork and imports nothing else', () => {
  const source = read('components/signature-loader.tsx');
  assert.match(source, /import \{ StyldMark, StyldWordmark \} from "@\/components\/styld-logo"/);
  const imports = [...source.matchAll(/^import .*$/gm)].map(match => match[0]);
  assert.equal(imports.length, 2, `only react and the logo module may be imported, found ${imports.join(' | ')}`);
  assert.doesNotMatch(source, /framer-motion|gsap|anime|three|webgl|lottie/i, 'no animation package for a one-shot gesture');
  assert.doesNotMatch(source, /<svg|viewBox|path d=/, 'the artwork is not redrawn here');
});

test('the loader is non-blocking, announced as decorative and cold-session only', () => {
  const source = read('components/signature-loader.tsx');
  const css = read('app/globals.css');

  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /const SEEN_KEY = "styld\.loader\.seen\.v1"/);
  assert.match(source, /sessionStorage/);
  assert.match(css, /\.signature-loader \{[\s\S]*?pointer-events: none;/);
  assert.doesNotMatch(css, /\.signature-loader[^{]*\{[^}]*backdrop-filter/, 'no blur on the loader');
  assert.doesNotMatch(css, /@keyframes signature-loader-reveal[^}]*rotate/, 'no spinning mark');
});

test('the hold is at least 600ms and a fail-safe ends the gesture', () => {
  const source = read('components/signature-loader.tsx');
  const css = read('app/globals.css');
  const total = Number(/const TOTAL_MS = (\d+)/.exec(source)[1]);
  const failsafe = Number(/const FAILSAFE_MS = (\d+)/.exec(source)[1]);
  const veilDelay = Number(/animation: signature-loader-veil \d+ms ease (\d+)ms/.exec(css)[1]);
  const wordDelay = Number(/\.signature-loader__word \{\s*animation-delay: (\d+)ms/.exec(css)[1]);
  const wordDuration = Number(/animation: signature-loader-reveal (\d+)ms/.exec(css)[1]);
  const holdFrom = wordDelay + wordDuration;

  assert.ok(total >= 1500 && total <= 1750, `total ${total}ms must sit in the 1.5 to 1.75s draft`);
  assert.ok(failsafe > total, 'the fail-safe must outlast the scripted exit');
  assert.ok(veilDelay - holdFrom >= 600, `the mark must hold still for 600ms, measured ${veilDelay - holdFrom}ms`);
  assert.match(source, /window\.clearTimeout\(failsafe\)/);
  assert.match(source, /dataset\.signatureLoader = "failsafe"/);
});

test('reduced motion, reduced data, data saver, hidden tabs and late hydration skip the gesture', () => {
  const source = read('components/signature-loader.tsx');
  for (const reason of ['reduced-motion', 'reduced-data', 'save-data', 'hidden-tab', 'late-hydration', 'seen']) {
    assert.match(source, new RegExp(`"${reason}"`), `${reason} must be a named skip reason`);
  }
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /prefers-reduced-data: reduce/);
  assert.match(source, /connection\?\.saveData/);
  assert.match(source, /visibilityState === "hidden"/);
});

test('glass is capped at 10px on a phone and keeps solid fallbacks', () => {
  const css = read('app/globals.css');
  const glass = /\/\* Reusable world surfaces[\s\S]*?\.world-glass \{([\s\S]*?)\}/.exec(css)[1];
  assert.match(glass, /blur\(10px\)/, 'the mobile layer is 10px, below the 12px limit');
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.world-glass \{\s*-webkit-backdrop-filter: blur\(var\(--world-glass-blur\)\)/);
  assert.match(css, /@supports not \(\(backdrop-filter: blur\(1px\)\)/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /html\[data-save-data="true"\] \.world-glass/);
  assert.doesNotMatch(read('components/marketplace-ui.tsx'), /backdrop-blur-2xl/, 'the header must not stack a second blur over the header pill');
});

test('the viewport opts into safe-area insets and the bottom bar respects them', () => {
  const layout = read('app/layout.tsx');
  const css = read('app/globals.css');
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(css, /\.mobile-bottom-nav \{\s*bottom: calc\(0\.75rem \+ env\(safe-area-inset-bottom, 0px\)\);/);
});

test('the focus ring in use clears 3:1 against every world page', () => {
  const css = read('app/globals.css');
  const pairs = [];
  const ring = [...css.matchAll(/--world-focus-ring:\s*(#[0-9A-Fa-f]{6});/g)].map(match => match[1]);
  const page = [...css.matchAll(/--world-page:\s*(#[0-9A-Fa-f]{6});/g)].map(match => match[1]);
  ring.forEach((colour, index) => pairs.push([colour, page[index] || '#FAF8F5']));

  const luminance = hex => {
    const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const ratio = (a, b) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };

  assert.equal(pairs.length, 6, 'one focus ring per world');
  for (const [colour, background] of pairs) {
    assert.ok(ratio(colour, background) >= 3, `${colour} on ${background} is ${ratio(colour, background).toFixed(2)}:1`);
  }
});
