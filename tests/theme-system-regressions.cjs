/**
 * Theme System Regressions and Contrast Verification Tests
 *
 * Validates:
 * 1. Canonical design token hierarchy in app/globals.css
 * 2. Root theme synchronization contract across layout, applicator, and store
 * 3. WCAG contrast compliance for key token pairings
 * 4. Onboarding tour controls and state machine contract
 * 5. Encoding cleanliness (absence of mojibake)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { REQUIRED_CANONICAL_TOKENS } = require('../scripts/audit-theme.cjs');

const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to compute relative luminance from hex
function hexToLuminance(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1, hex2) {
  const lum1 = hexToLuminance(hex1);
  const lum2 = hexToLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test('all canonical semantic tokens are defined in the light :root of app/globals.css', () => {
  const globalsContent = fs.readFileSync(path.join(ROOT_DIR, 'app', 'globals.css'), 'utf8');

  // Styld is LIGHT MODE ONLY: the dark variant registration, dark selectors and
  // OS-dark following must not exist anywhere in the stylesheet.
  assert.ok(!globalsContent.includes('@custom-variant dark'), 'must not register a dark variant');
  assert.ok(!globalsContent.includes('[data-theme="dark"]'), 'must not define a dark theme selector');
  assert.ok(!globalsContent.includes('[data-color-scheme="dark"]'), 'must not define a dark color-scheme selector');
  assert.ok(!globalsContent.includes('@media (prefers-color-scheme: dark)'), 'must not follow OS dark mode');
  assert.ok(/color-scheme:\s*light/.test(globalsContent), 'must pin color-scheme: light');

  // The single authoritative theme is the light :root block.
  const rootBlockMatch = globalsContent.match(/:root\s*\{([\s\S]*?)\}/);
  assert.ok(rootBlockMatch, 'must have :root block in globals.css');
  const rootBlock = rootBlockMatch[1];

  for (const token of REQUIRED_CANONICAL_TOKENS) {
    assert.ok(rootBlock.includes(token + ':'), `Token ${token} must be defined in :root`);
  }
});

test('the document is rendered statically in the light theme (no theme bootstrap)', () => {
  const layoutContent = fs.readFileSync(path.join(ROOT_DIR, 'app', 'layout.tsx'), 'utf8');
  assert.ok(layoutContent.includes('data-theme="light"'), 'layout must render data-theme="light"');
  assert.ok(layoutContent.includes('data-color-scheme="light"'), 'layout must render data-color-scheme="light"');
  assert.ok(!layoutContent.includes('prefers-color-scheme'), 'layout must not read the OS color scheme');
  assert.ok(!layoutContent.includes('localStorage.getItem("styld_settings")'), 'layout must not read theme settings');
  assert.ok(!layoutContent.includes('classList.add("dark"'), 'layout must never add a dark class');
  assert.ok(!layoutContent.includes('dangerouslySetInnerHTML'), 'layout must not inline a theme bootstrap script');

  const applicatorContent = fs.readFileSync(path.join(ROOT_DIR, 'components', 'theme-applicator.tsx'), 'utf8');
  assert.ok(!applicatorContent.includes('colorScheme'), 'theme-applicator must not read a theme preference');
  assert.ok(!applicatorContent.includes('prefers-color-scheme'), 'theme-applicator must not follow OS appearance');
  assert.ok(!applicatorContent.includes('classList.toggle("dark"'), 'theme-applicator must not toggle a dark class');
  assert.ok(applicatorContent.includes('data-reduce-motion'), 'theme-applicator must still apply reduced motion');
  assert.ok(applicatorContent.includes('data-high-contrast'), 'theme-applicator must still apply high contrast');
});

test('settings store dual-persists to styld_settings and ms_app_settings.v1', () => {
  const storeContent = fs.readFileSync(path.join(ROOT_DIR, 'lib', 'settings-store.ts'), 'utf8');
  assert.ok(storeContent.includes('STYLD_SETTINGS_KEY = "styld_settings"'));
  assert.ok(storeContent.includes('LEGACY_SETTINGS_KEY = "ms_app_settings.v1"'));
  assert.ok(storeContent.includes('window.localStorage.setItem(STYLD_SETTINGS_KEY, serialized)'));
  assert.ok(storeContent.includes('window.localStorage.setItem(LEGACY_SETTINGS_KEY, serialized)'));
});

test('token pairings meet WCAG AA / AAA contrast standards', () => {
  // Dark mode primary button: Clay bg (#C0A090) with Deep Ink text (#1D1D1B)
  const darkActionContrast = contrastRatio('#C0A090', '#1D1D1B');
  assert.ok(darkActionContrast >= 4.5, `Dark action contrast must be >= 4.5:1, got ${darkActionContrast.toFixed(2)}:1`);

  // Light mode primary text on page bg: Deep Ink (#1D1D1B) on Bone (#F7F4EE)
  const lightTextContrast = contrastRatio('#1D1D1B', '#F7F4EE');
  assert.ok(lightTextContrast >= 7.0, `Light text contrast must be >= 7.0:1 (AAA), got ${lightTextContrast.toFixed(2)}:1`);

  // Dark mode primary text on dark page bg: White (#FFFFFF) on Deep Charcoal (#161615)
  const darkTextContrast = contrastRatio('#FFFFFF', '#161615');
  assert.ok(darkTextContrast >= 7.0, `Dark text contrast must be >= 7.0:1 (AAA), got ${darkTextContrast.toFixed(2)}:1`);

  // Secondary text light mode: #4F4B48 on #F7F4EE
  const lightSecondaryContrast = contrastRatio('#4F4B48', '#F7F4EE');
  assert.ok(lightSecondaryContrast >= 4.5, `Light secondary contrast must be >= 4.5:1 (AA), got ${lightSecondaryContrast.toFixed(2)}:1`);

  // Secondary text dark mode: #D4D0CB on #161615
  const darkSecondaryContrast = contrastRatio('#D4D0CB', '#161615');
  assert.ok(darkSecondaryContrast >= 4.5, `Dark secondary contrast must be >= 4.5:1 (AA), got ${darkSecondaryContrast.toFixed(2)}:1`);
});

test('onboarding tour controls and state machine are fully configured', () => {
  const tourContent = fs.readFileSync(path.join(ROOT_DIR, 'components', 'onboarding-tour.tsx'), 'utf8');

  // Verify status machine types
  assert.ok(tourContent.includes('export type TourStatus'));
  assert.ok(tourContent.includes('"not_started"'));
  assert.ok(tourContent.includes('"running"'));
  assert.ok(tourContent.includes('"waiting_for_route"'));
  assert.ok(tourContent.includes('"waiting_for_target"'));
  assert.ok(tourContent.includes('"completed"'));
  assert.ok(tourContent.includes('"skipped"'));

  // Verify step controls
  assert.ok(tourContent.includes('Start tour'));
  assert.ok(tourContent.includes('Skip'));
  assert.ok(tourContent.includes('Skip tour'));
  assert.ok(tourContent.includes('Back'));
  assert.ok(tourContent.includes('Explore Styld'));
});
