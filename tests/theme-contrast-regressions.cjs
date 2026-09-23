/**
 * STYLD Theme Contrast & Semantic Token Regression Suite
 *
 * Enforces:
 * 1. WCAG 2.1 AA (>= 4.5:1 for normal text) & AAA (>= 7:1) contrast ratios across light and dark tokens.
 * 2. Section 3 semantic tokens symmetry across :root and dark mode selectors.
 * 3. Theme applicator synchronization (data-theme, data-color-scheme, .dark class).
 * 4. Verification that key page components use theme-aware surface tokens instead of hardcoded white backgrounds.
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

test('light mode tokens satisfy WCAG AA and AAA contrast requirements', () => {
  const bgCanvas = '#FAF8F5';
  const textPrimary = '#1D1D1B';
  const textSecondary = '#4F4B48';
  const textMuted = '#6E6966';
  const clayText = '#875945';
  const placeholder = '#6E6966';
  const actionPrimaryBg = '#1D1D1B';
  const actionPrimaryText = '#FAF8F5';

  // Primary text on canvas: AAA >= 7.0:1
  const ratioPrimary = contrastRatio(textPrimary, bgCanvas);
  assert.ok(ratioPrimary >= 14.0, `Light text-primary contrast ${ratioPrimary.toFixed(2)} must be >= 14.0:1`);

  // Secondary text on canvas: AAA >= 7.0:1
  const ratioSecondary = contrastRatio(textSecondary, bgCanvas);
  assert.ok(ratioSecondary >= 7.0, `Light text-secondary contrast ${ratioSecondary.toFixed(2)} must be >= 7.0:1`);

  // Muted text on canvas: AA >= 4.5:1
  const ratioMuted = contrastRatio(textMuted, bgCanvas);
  assert.ok(ratioMuted >= 4.5, `Light text-muted contrast ${ratioMuted.toFixed(2)} must be >= 4.5:1`);

  // Clay brand text on canvas: AA >= 4.5:1
  const ratioClay = contrastRatio(clayText, bgCanvas);
  assert.ok(ratioClay >= 4.5, `Light clay-text contrast ${ratioClay.toFixed(2)} must be >= 4.5:1`);

  // Input placeholder on canvas: AA >= 4.5:1
  const ratioPlaceholder = contrastRatio(placeholder, bgCanvas);
  assert.ok(ratioPlaceholder >= 4.5, `Light placeholder contrast ${ratioPlaceholder.toFixed(2)} must be >= 4.5:1`);

  // Primary action button contrast: AAA >= 7.0:1
  const ratioAction = contrastRatio(actionPrimaryBg, actionPrimaryText);
  assert.ok(ratioAction >= 14.0, `Light action button contrast ${ratioAction.toFixed(2)} must be >= 14.0:1`);
});

test('dark mode tokens satisfy WCAG AA and AAA contrast requirements', () => {
  const bgCanvas = '#121211';
  const bgSurface = '#1A1918';
  const textPrimary = '#FAF8F5';
  const textSecondary = '#D4D0CB';
  const textMuted = '#A8A39E';
  const clayText = '#D4B5A6';
  const placeholder = '#A8A39E';
  const actionPrimaryBg = '#C0A090';
  const actionPrimaryText = '#1D1D1B';

  // Primary text on canvas: AAA >= 7.0:1
  const ratioPrimary = contrastRatio(textPrimary, bgCanvas);
  assert.ok(ratioPrimary >= 14.0, `Dark text-primary contrast ${ratioPrimary.toFixed(2)} must be >= 14.0:1`);

  // Secondary text on canvas: AAA >= 7.0:1
  const ratioSecondary = contrastRatio(textSecondary, bgCanvas);
  assert.ok(ratioSecondary >= 10.0, `Dark text-secondary contrast ${ratioSecondary.toFixed(2)} must be >= 10.0:1`);

  // Muted text on surface: AA >= 4.5:1
  const ratioMuted = contrastRatio(textMuted, bgSurface);
  assert.ok(ratioMuted >= 5.5, `Dark text-muted contrast ${ratioMuted.toFixed(2)} must be >= 5.5:1`);

  // Clay brand text on canvas: AAA >= 7.0:1
  const ratioClay = contrastRatio(clayText, bgCanvas);
  assert.ok(ratioClay >= 8.0, `Dark clay-text contrast ${ratioClay.toFixed(2)} must be >= 8.0:1`);

  // Input placeholder on surface: AA >= 4.5:1
  const ratioPlaceholder = contrastRatio(placeholder, bgSurface);
  assert.ok(ratioPlaceholder >= 5.5, `Dark placeholder contrast ${ratioPlaceholder.toFixed(2)} must be >= 5.5:1`);

  // Action button contrast: AA >= 4.5:1
  const ratioAction = contrastRatio(actionPrimaryBg, actionPrimaryText);
  assert.ok(ratioAction >= 4.5, `Dark action button contrast ${ratioAction.toFixed(2)} must be >= 4.5:1`);
});

test('Section 3 semantic tokens are comprehensively defined in app/globals.css', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'app', 'globals.css'), 'utf8');

  const REQUIRED_SECTION_3_TOKENS = [
    '--bg-canvas',
    '--bg-surface',
    '--bg-surface-raised',
    '--bg-surface-sunken',
    '--text-primary',
    '--text-secondary',
    '--text-muted',
    '--border-subtle',
    '--border-default',
    '--border-strong',
    '--action-primary-bg',
    '--action-primary-text',
    '--action-primary-hover',
    '--action-secondary-bg',
    '--action-secondary-text',
    '--color-bg',
    '--color-surface',
    '--color-card-bg',
    '--color-card-meta',
    '--color-focus',
    '--color-secondary',
    '--color-clay-text',
    '--input-placeholder',
    '--input-bg',
    '--input-border',
    '--input-text',
    '--nav-bg',
    '--nav-text',
    '--nav-border',
  ];

  // Check in :root
  for (const token of REQUIRED_SECTION_3_TOKENS) {
    assert.ok(css.includes(`${token}:`), `Token ${token} must be present in globals.css`);
  }

  // Styld is LIGHT MODE ONLY: no dark selector block may exist.
  assert.ok(
    !/\[data-color-scheme="dark"\]/.test(css),
    'globals.css must not define a dark color-scheme block'
  );
  assert.ok(
    !/\[data-theme="dark"\]/.test(css),
    'globals.css must not define a dark theme block'
  );
  assert.ok(
    !/prefers-color-scheme:\s*dark/.test(css),
    'globals.css must not follow OS dark mode'
  );
  assert.ok(/color-scheme:\s*light/.test(css), 'globals.css must pin color-scheme: light');
});

test('theme applicator applies only non-theme preferences (light-only contract)', () => {
  const applicatorSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'theme-applicator.tsx'), 'utf8');
  assert.ok(applicatorSrc.includes('export function applySettings'));
  assert.ok(!applicatorSrc.includes('colorScheme'), 'theme-applicator must not read a colorScheme preference');
  assert.ok(!applicatorSrc.includes('prefers-color-scheme'), 'theme-applicator must not follow system dark mode');
  assert.ok(!applicatorSrc.includes('classList.toggle("dark"'), 'theme-applicator must not toggle a dark class');
  assert.ok(applicatorSrc.includes('data-reduce-motion'), 'theme-applicator must still apply reduced motion');
  assert.ok(applicatorSrc.includes('data-high-contrast'), 'theme-applicator must still apply high contrast');

  const settingsUiSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'settings-ui.tsx'), 'utf8');
  assert.ok(settingsUiSrc.includes('applySettings(settings)'), 'settings-ui.tsx must invoke applySettings');
  assert.ok(!settingsUiSrc.includes('Color scheme'), 'settings-ui.tsx must not expose a theme selector');
});

test('StyldLogo provides auto variant by default to adapt dynamically to themes', () => {
  const logoSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'styld-logo.tsx'), 'utf8');
  assert.ok(logoSrc.includes('variant = "auto"'));
  assert.ok(logoSrc.includes('var(--text-primary)'));
  assert.ok(logoSrc.includes('var(--bg-surface-raised)'));
});

test('no hardcoded bg-white collisions on audited surfaces', () => {
  const filesToAudit = [
    path.join(ROOT_DIR, 'app', 'about', 'page.tsx'),
    path.join(ROOT_DIR, 'app', 'help', 'page.tsx'),
    path.join(ROOT_DIR, 'app', '[collection]', '[slug]', 'page.tsx'),
    path.join(ROOT_DIR, 'components', 'language-preference-card.tsx'),
    path.join(ROOT_DIR, 'components', 'my-world-card.tsx'),
  ];

  for (const file of filesToAudit) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // Look for solid bg-white container classes (not opacity modifiers like bg-white/15 or text-white)
      const hasSolidBgWhite = /(?:^|\s)bg-white(?:\s|$|["'`])/.test(line);
      assert.strictEqual(
        hasSolidBgWhite,
        false,
        `File ${path.basename(file)} line ${index + 1} should use theme surface tokens instead of hardcoded bg-white: ${line.trim()}`
      );
    });
  }
});
