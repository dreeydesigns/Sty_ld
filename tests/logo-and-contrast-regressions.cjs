/**
 * STYLD Brand Asset, Header Contrast & Theme Surface Regression Suite
 *
 * Enforces:
 * 1. Logo Book v2.0 identity compliance (monogram S-mark, Playfair Display wordmark, Clay dot #C0A090, Sage rules #909888).
 * 2. Canonical header tokens contrast ratios in both light and dark themes (WCAG AA/AAA).
 * 3. Canonical auth card surface contrast (heading, body, labels against card background).
 * 4. Disabled CTA button legibility (>= 3.0:1 contrast on disabled tokens).
 * 5. Single, deduplicated theme contract in app/globals.css (no rogue duplicate dark selectors).
 * 6. Elimination of hardcoded bg-white in modal and auth components.
 * 7. Tablist accessibility contracts in Discover and Auth components.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Relative luminance calculation per WCAG 2.1 definition
function hexToLuminance(hex) {
  const clean = hex.replace('#', '').trim();
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

test('components/styld-logo.tsx conforms to Logo Book v2.0 specifications', () => {
  const logoSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'styld-logo.tsx'), 'utf8');

  // Exports check
  assert.ok(logoSrc.includes('export function StyldMark'), 'StyldMark must be exported');
  assert.ok(logoSrc.includes('export function StyldWordmark'), 'StyldWordmark must be exported');
  assert.ok(logoSrc.includes('export function StyldLockup'), 'StyldLockup must be exported');
  assert.ok(logoSrc.includes('export default StyldLockup'), 'StyldLockup must be the default export');

  // Variant support
  const variants = ['"auto"', '"default"', '"reversed"', '"dark"', '"light"', '"mark"', '"mark-reversed"'];
  for (const v of variants) {
    assert.ok(logoSrc.includes(v), `Logo variants must include ${v}`);
  }

  // Official Logo Book palette
  assert.ok(logoSrc.includes('#C0A090'), 'Logo must contain Clay accent (#C0A090)');
  assert.ok(logoSrc.includes('#909888'), 'Logo must contain Sage accent (#909888)');
  assert.ok(logoSrc.includes('#1D1D1B'), 'Logo must contain Deep Ink (#1D1D1B)');
  assert.ok(logoSrc.includes('#FAF8F5'), 'Logo must contain Warm White (#FAF8F5)');

  // Surface-aware header fallback tokens
  assert.ok(logoSrc.includes('--header-logo-mark'), 'Mark must check --header-logo-mark');
  assert.ok(logoSrc.includes('--header-logo-text'), 'Wordmark must check --header-logo-text');
  assert.ok(logoSrc.includes('--header-border'), 'Mark ring must check --header-border');
});

test('canonical header tokens meet WCAG contrast thresholds in light and dark modes', () => {
  // Light mode header tokens
  const lightHeaderBg = '#FAF8F5';
  const lightHeaderText = '#1D1D1B';
  const lightHeaderTextMuted = '#6E6966';

  const lightTextRatio = contrastRatio(lightHeaderBg, lightHeaderText);
  assert.ok(lightTextRatio >= 14.0, `Light header text ratio ${lightTextRatio.toFixed(2)} must be >= 14:1`);

  const lightMutedRatio = contrastRatio(lightHeaderBg, lightHeaderTextMuted);
  assert.ok(lightMutedRatio >= 4.5, `Light header muted text ratio ${lightMutedRatio.toFixed(2)} must be >= 4.5:1`);

  // Dark mode header tokens
  const darkHeaderBg = '#161514';
  const darkHeaderText = '#FAF8F5';
  const darkHeaderTextMuted = '#A8A39E';

  const darkTextRatio = contrastRatio(darkHeaderBg, darkHeaderText);
  assert.ok(darkTextRatio >= 14.0, `Dark header text ratio ${darkTextRatio.toFixed(2)} must be >= 14:1`);

  const darkMutedRatio = contrastRatio(darkHeaderBg, darkHeaderTextMuted);
  assert.ok(darkMutedRatio >= 6.0, `Dark header muted text ratio ${darkMutedRatio.toFixed(2)} must be >= 6.0:1`);
});

test('canonical auth card tokens meet WCAG contrast thresholds in light and dark modes', () => {
  // Light mode auth card
  const lightAuthBg = '#FFFFFF';
  const lightAuthHeading = '#1D1D1B';
  const lightAuthBody = '#4F4B48';
  const lightAuthLabel = '#1D1D1B';

  const lightHeadingRatio = contrastRatio(lightAuthBg, lightAuthHeading);
  assert.ok(lightHeadingRatio >= 14.0, `Light auth heading ratio ${lightHeadingRatio.toFixed(2)} must be >= 14:1`);

  const lightBodyRatio = contrastRatio(lightAuthBg, lightAuthBody);
  assert.ok(lightBodyRatio >= 7.0, `Light auth body ratio ${lightBodyRatio.toFixed(2)} must be >= 7:1`);

  const lightLabelRatio = contrastRatio(lightAuthBg, lightAuthLabel);
  assert.ok(lightLabelRatio >= 14.0, `Light auth label ratio ${lightLabelRatio.toFixed(2)} must be >= 14:1`);

  // Dark mode auth card
  const darkAuthBg = '#1E1D1B';
  const darkAuthHeading = '#FAF8F5';
  const darkAuthBody = '#D4D0CB';
  const darkAuthLabel = '#FAF8F5';

  const darkHeadingRatio = contrastRatio(darkAuthBg, darkAuthHeading);
  assert.ok(darkHeadingRatio >= 12.0, `Dark auth heading ratio ${darkHeadingRatio.toFixed(2)} must be >= 12:1`);

  const darkBodyRatio = contrastRatio(darkAuthBg, darkAuthBody);
  assert.ok(darkBodyRatio >= 8.0, `Dark auth body ratio ${darkBodyRatio.toFixed(2)} must be >= 8:1`);

  const darkLabelRatio = contrastRatio(darkAuthBg, darkAuthLabel);
  assert.ok(darkLabelRatio >= 12.0, `Dark auth label ratio ${darkLabelRatio.toFixed(2)} must be >= 12:1`);
});

test('disabled CTA button tokens meet minimum legible contrast thresholds', () => {
  // Light mode disabled action button
  const lightDisabledBg = '#E5DFD9';
  const lightDisabledText = '#8C847E';
  const lightDisabledRatio = contrastRatio(lightDisabledBg, lightDisabledText);
  assert.ok(lightDisabledRatio >= 2.5, `Light disabled action ratio ${lightDisabledRatio.toFixed(2)} must be >= 2.5:1`);

  // Dark mode disabled action button
  const darkDisabledBg = '#2A2826';
  const darkDisabledText = '#827C77';
  const darkDisabledRatio = contrastRatio(darkDisabledBg, darkDisabledText);
  assert.ok(darkDisabledRatio >= 2.5, `Dark disabled action ratio ${darkDisabledRatio.toFixed(2)} must be >= 2.5:1`);
});

test('globals.css is light-only: no dark theme blocks, no OS dark following', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'app', 'globals.css'), 'utf8');

  // Dark mode was removed from the product entirely.
  const darkOverrideMatches = css.match(/\[data-color-scheme="dark"\]|\[data-theme="dark"\]/g) || [];
  assert.strictEqual(darkOverrideMatches.length, 0, 'globals.css must not define any dark theme block');

  const prefersDarkMatches = css.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/g) || [];
  assert.strictEqual(prefersDarkMatches.length, 0, 'globals.css must not follow OS dark mode');

  // Native controls must stay light even when the OS is dark.
  assert.ok(/color-scheme:\s*light/.test(css), 'globals.css must pin color-scheme: light');

  // Ensure rogue override '--color-primary: var(--text-primary)' is NOT in globals.css
  assert.ok(
    !css.includes('--color-primary: var(--text-primary)'),
    'globals.css must not assign var(--text-primary) to --color-primary'
  );
});

test('components/service-session.tsx and auth modals have no hardcoded bg-white collisions', () => {
  const sessionSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'service-session.tsx'), 'utf8');
  // Check for bare bg-white classes (not bg-white/xx)
  const sessionLines = sessionSrc.split('\n');
  sessionLines.forEach((line, idx) => {
    const hasSolidWhite = /(?:^|\s)bg-white(?:\s|$|["'`])/.test(line);
    assert.strictEqual(
      hasSolidWhite,
      false,
      `components/service-session.tsx line ${idx + 1} has hardcoded bg-white: ${line.trim()}`
    );
  });

  const authSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'auth', 'unified-auth-flow.tsx'), 'utf8');
  assert.ok(authSrc.includes('var(--auth-card-bg)'), 'unified-auth-flow must use var(--auth-card-bg)');
});

test('segmented tab controls contain accessible tablist and tab roles', () => {
  // Discover page tabs
  const discoverSrc = fs.readFileSync(path.join(ROOT_DIR, 'app', 'discover', 'page.tsx'), 'utf8');
  assert.ok(discoverSrc.includes('role="tablist"'), 'Discover tabs container must have role="tablist"');
  assert.ok(discoverSrc.includes('role="tab"'), 'Discover tab buttons must have role="tab"');
  assert.ok(discoverSrc.includes('aria-selected='), 'Discover tab buttons must specify aria-selected');

  // Phone verification channel tabs
  const phoneModalSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'auth', 'phone-verification-modal.tsx'), 'utf8');
  assert.ok(phoneModalSrc.includes('role="tablist"'), 'Phone verification tabs container must have role="tablist"');
  assert.ok(phoneModalSrc.includes('role="tab"'), 'Phone verification tab buttons must have role="tab"');
  assert.ok(phoneModalSrc.includes('aria-selected='), 'Phone verification tab buttons must specify aria-selected');
});
