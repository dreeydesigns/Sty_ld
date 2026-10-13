/**
 * OPENAI UI/UX PHASE 1 - shared foundations & critical accessibility regressions.
 *
 * Locks the Phase 1 deliverables at source level (no component execution):
 *   1. accessible CTA colour pairings (accent = Ink-on-Clay, not white-on-Clay)
 *   2. surface-aware focus ring (inverse on dark surfaces)
 *   3. .scroll-row horizontal rail defined without breaking grid breakpoints
 *   4. Button small size meets the 44px touch-target minimum
 *   5. .btn-press press feedback defined (low specificity)
 *   6. deferred decorative/verification utilities remain deliberately undefined
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
}

function hexToLuminance(hex) {
  const clean = hex.replace('#', '').trim();
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1, hex2) {
  const a = hexToLuminance(hex1);
  const b = hexToLuminance(hex2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('accent action pairing is WCAG AA and leaves Ink as the primary CTA', () => {
  const css = read('app/globals.css');

  // Primary CTA stays Ink with white text.
  assert.match(css, /--action-primary-bg:\s*#1D1D1B;/);
  assert.match(css, /--action-primary-text:\s*#FFFFFF;/);
  assert.ok(
    contrastRatio('#1D1D1B', '#FFFFFF') >= 4.5,
    'primary CTA (white on Ink) must clear AA',
  );

  // Accent CTA is Ink-on-Clay (the accessible pairing), never white-on-Clay.
  assert.match(css, /--action-accent-bg:\s*var\(--color-clay\);/);
  assert.match(css, /--action-accent-text:\s*var\(--color-ink\);/);
  assert.match(css, /--action-accent-hover:\s*#A98B79;/);
  assert.ok(
    contrastRatio('#1D1D1B', '#C0A090') >= 4.5,
    'accent CTA (Ink on Clay) must clear AA',
  );
  assert.ok(
    contrastRatio('#1D1D1B', '#A98B79') >= 4.5,
    'accent CTA hover (Ink on darker clay) must clear AA',
  );

  // Accessible accent text token exists for light surfaces.
  assert.match(css, /--color-accent-text:\s*var\(--color-clay-text\);/);
});

test('focus ring is AA (3:1) on light and has an inverse for dark surfaces', () => {
  const css = read('app/globals.css');

  assert.ok(
    contrastRatio('#875945', '#FAF8F5') >= 3.0,
    'base focus ring must clear 3:1 on the light page',
  );

  assert.match(css, /--focus-ring-inverse:\s*#FAF8F5;/);
  assert.ok(
    contrastRatio('#FAF8F5', '#1D1D1B') >= 3.0,
    'inverse focus ring must clear 3:1 on Ink/dark surfaces',
  );

  // Dark surfaces switch the outline colour to the inverse token.
  assert.match(
    css,
    /\[data-surface="dark"\]\s*:focus-visible[\s\S]*?outline-color:\s*var\(--focus-ring-inverse\)/,
  );

  // High contrast promotes the inverse ring to pure white.
  assert.match(css, /html\[data-high-contrast="true"\][\s\S]*?--focus-ring-inverse:\s*#FFFFFF;/);
});

test('Button exposes an accessible accent variant built from tokens', () => {
  const button = read('components/ui/button.tsx');

  assert.ok(!button.includes('#'), 'Button must not hardcode hex colours');
  assert.match(
    button,
    /accent:[\s\S]*?bg-\[var\(--action-accent-bg\)\] text-\[var\(--action-accent-text\)\][\s\S]*?hover:bg-\[var\(--action-accent-hover\)\]/,
    'accent variant must pair Clay bg with Ink text and a token hover',
  );

  const ui = read('components/marketplace-ui.tsx');
  assert.ok(ui.includes('"accent"'), 'CTAButton variant union must accept "accent"');
});

test('Button small size meets the 44px touch-target minimum', () => {
  const button = read('components/ui/button.tsx');

  assert.match(button, /sm:\s*"min-h-11 /, 'sm button must be at least 44px tall');
  assert.match(button, /md:\s*"min-h-11 /, 'md button must be at least 44px tall');
  assert.match(button, /lg:\s*"min-h-12 /, 'lg button must be at least 48px tall');
  assert.match(button, /icon:\s*"h-11 w-11 /, 'icon button must be 44x44');
});

test('.scroll-row is defined as an accessible horizontal rail without breaking grids', () => {
  const css = read('app/globals.css');

  // Declared inside @layer utilities with :where() so grid utilities still win.
  assert.match(css, /@layer utilities\s*\{[\s\S]*?:where\(\.scroll-row\)/);
  assert.match(css, /:where\(\.scroll-row\)\s*\{[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /:where\(\.scroll-row\)\s*\{[\s\S]*?scroll-snap-type:\s*x proximity/);
  assert.match(css, /:where\(\.scroll-row\)\s*>\s*\*\s*\{[\s\S]*?flex:\s*0 0 auto/);

  // Snapping is dropped for reduced-motion users.
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?:where\(\.scroll-row\)[\s\S]*?scroll-snap-type:\s*none/);
  assert.match(css, /html\[data-reduce-motion="true"\]\s*:where\(\.scroll-row\)[\s\S]*?scroll-snap-type:\s*none/);
});

test('.btn-press press feedback is defined with low specificity', () => {
  const css = read('app/globals.css');
  assert.match(css, /:where\(\.btn-press\):active\s*\{[\s\S]*?scale:\s*0\.97/);
});

test('decorative and verification-cue utilities are deliberately deferred in Phase 1', () => {
  const css = read('app/globals.css');
  // These remain undefined on purpose (see Phase 1 report). Defining them would
  // either add unearned trust cues (verified-glow, badge-shine, privacy-label)
  // or ambiguous decoration (section-grid, feminine-shell, decorative-orbit).
  for (const cls of ['.section-grid', '.feminine-shell', '.decorative-orbit', '.verified-glow', '.badge-shine', '.privacy-label']) {
    assert.ok(!css.includes(cls + ' '), `${cls} must remain undefined in Phase 1`);
  }
});
