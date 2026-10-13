/**
 * OPENAI UI/UX WAVE 1 - shared UI foundation regressions.
 *
 * Locks the Wave 1 deliverables at source level:
 *   1. the focus-ring token resolves to a valid color (not a box-shadow string)
 *      and box-shadow definitions live in a separate --focus-shadow token
 *   2. the reusable component foundation exists (Button / Card / Input / states)
 *   3. the existing shared controls delegate to the primitive layer
 *      (no duplicate component systems)
 *   4. previously undefined shared utilities are now defined, and the loader
 *      does not hardcode its own dimensions (callers size it)
 *
 * Source-level assertions only. No implementation file is executed here.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
}

function stripped(file) {
  return read(file)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

test('focus-ring resolves to a valid color and box-shadow lives in a separate token', () => {
  const css = read('app/globals.css');

  // :root must define --focus-ring as a color token...
  assert.match(
    css,
    /--focus-ring:\s*var\(--color-clay-text\);/,
    '--focus-ring must resolve to a color token in :root',
  );

  // ...and a dedicated, separate box-shadow token must exist.
  assert.match(
    css,
    /--focus-shadow:\s*0 0 0 2px var\(--focus-ring-offset\), 0 0 0 4px var\(--focus-ring\);/,
    '--focus-shadow must hold the ring box-shadow separately',
  );

  // No rule anywhere may assign a box-shadow value to --focus-ring.
  assert.doesNotMatch(
    css,
    /--focus-ring:\s*0 0 0/,
    '--focus-ring must never be assigned a box-shadow value',
  );

  // The utility consumes the shadow token.
  assert.match(css, /\.focus-ring\s*\{\s*box-shadow:\s*var\(--focus-shadow\);\s*\}/);

  // High-contrast mode sets --focus-ring to a color and a stronger shadow.
  assert.match(css, /html\[data-high-contrast="true"\][\s\S]*?--focus-ring:\s*#2b2621;/);
  assert.match(css, /html\[data-high-contrast="true"\][\s\S]*?--focus-shadow:/);

  // :focus-visible must still draw an outline from the color token.
  assert.match(css, /:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--focus-ring\)/);

  // Reduced-motion support must survive.
  assert.match(css, /html\[data-reduce-motion="true"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('reusable UI foundation exists and is token-driven', () => {
  const button = read('components/ui/button.tsx');
  assert.match(button, /export function Button\(/);
  for (const variant of ['primary', 'secondary', 'ghost', 'outline', 'destructive', 'icon']) {
    assert.ok(button.includes(variant), `Button must define the "${variant}" variant`);
  }
  assert.ok(button.includes('href'), 'Button must support link rendering');
  assert.ok(button.includes('loading'), 'Button must support a loading state');
  assert.ok(!button.includes('#'), 'Button must not hardcode hex colors (use tokens)');

  const card = read('components/ui/card.tsx');
  for (const part of ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter']) {
    assert.match(card, new RegExp(`export function ${part}\\(`));
  }

  const input = read('components/ui/input.tsx');
  assert.match(input, /export function Input\(/);
  assert.match(input, /export function Field\(/);
  assert.match(input, /aria-describedby/);
  assert.match(input, /aria-invalid/);

  const states = read('components/ui/states.tsx');
  for (const s of ['Spinner', 'LoadingState', 'EmptyState', 'ErrorState']) {
    assert.match(states, new RegExp(`export function ${s}\\(`));
  }
  assert.match(states, /role="status"/, 'loading state must announce politely');
  assert.match(states, /role="alert"/, 'error state must announce assertively');

  const barrel = read('components/ui/index.ts');
  assert.match(barrel, /components\/ui\/button/);
  assert.match(barrel, /components\/ui\/states/);
});

test('existing shared controls delegate to the primitive layer (no duplicate systems)', () => {
  const ui = stripped('components/marketplace-ui.tsx');
  assert.match(
    ui,
    /import\s*\{\s*Button as BaseButton\s*\}\s*from\s*"@\/components\/ui\/button"/,
    'marketplace-ui must import the Button primitive',
  );
  assert.match(
    ui,
    /import\s*\{\s*EmptyState as BaseEmptyState\s*\}\s*from\s*"@\/components\/ui\/states"/,
    'marketplace-ui must import the EmptyState primitive',
  );
  assert.match(ui, /<BaseButton/, 'CTAButton must delegate to the Button primitive');
  assert.match(ui, /<BaseEmptyState/, 'EmptyState must delegate to the primitive');
  assert.match(ui, /export function CTAButton\(/, 'CTAButton public export must remain');
  assert.match(ui, /export function EmptyState\(/, 'EmptyState public export must remain');
});

test('previously undefined shared utilities are now defined', () => {
  const css = read('app/globals.css');
  for (const cls of [
    '.silk-panel',
    '.beauty-link',
    '.loader-bloom',
    '.card-lift',
    '.animate-fade-in',
    '.animate-scale-up',
  ]) {
    assert.ok(css.includes(cls + ' '), `missing definition for ${cls}`);
  }

  // The loader must not hardcode its own width/height: callers size it.
  assert.doesNotMatch(css, /\.loader-bloom\s*\{[^}]*\bwidth:/);
  assert.doesNotMatch(css, /\.loader-bloom\s*\{[^}]*\bheight:/);
});
