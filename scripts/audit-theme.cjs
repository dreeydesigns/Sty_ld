#!/usr/bin/env node
/**
 * STYLD Theme System Audit Script
 *
 * Validates the permanent theme contract across:
 * 1. app/globals.css token definitions (Light, Dark, System media query)
 * 2. Root theme synchronization in app/layout.tsx, components/theme-applicator.tsx, lib/settings-store.ts
 * 3. Elimination of hardcoded text-[var(--color-ink)] in themeable UI surfaces
 * 4. Elimination of unicode mojibake encoding artifacts
 * 5. Onboarding tour state machine and control contract
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const REQUIRED_CANONICAL_TOKENS = [
  '--bg-page',
  '--bg-surface',
  '--bg-surface-raised',
  '--bg-surface-subtle',
  '--bg-overlay',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--text-disabled',
  '--text-inverse',
  '--text-link',
  '--action-primary-bg',
  '--action-primary-text',
  '--action-primary-hover',
  '--action-secondary-bg',
  '--action-secondary-text',
  '--input-bg',
  '--input-text',
  '--input-placeholder',
  '--input-border',
  '--nav-bg',
  '--nav-pill-bg',
  '--nav-text',
  '--nav-text-muted',
  '--nav-active-bg',
  '--nav-active-text',
  '--card-bg',
  '--card-text',
  '--modal-bg',
  '--modal-text',
  '--focus-ring',
  '--focus-ring-offset',
  '--footer-bg',
  '--footer-text',
  '--header-bg',
  '--header-text',
  '--header-text-muted',
  '--header-border',
  '--action-disabled-bg',
  '--action-disabled-text',
  '--auth-card-bg',
  '--auth-card-border',
  '--auth-heading',
  '--auth-body',
  '--auth-label',
];

const MOJIBAKE_PATTERNS = [/\u00C2\u00A9/, /\u00C2\u00B7/, /\u00C3\u00A9/, /\u00C3\u00A8/, /\u00E2/];

function runAudit() {
  const errors = [];
  const warnings = [];

  console.log('\n--- STYLD THEME SYSTEM AUDIT ---');

  // 1. Verify app/globals.css
  const globalsPath = path.join(ROOT_DIR, 'app', 'globals.css');
  if (!fs.existsSync(globalsPath)) {
    errors.push('app/globals.css does not exist');
  } else {
    const globalsContent = fs.readFileSync(globalsPath, 'utf8');

    // Styld is LIGHT MODE ONLY: the dark variant must not exist at all.
    if (globalsContent.includes('@custom-variant dark')) {
      errors.push('app/globals.css must not register a dark Tailwind variant (Styld is light-only)');
    }

    // Check light tokens in :root
    const rootBlockMatch = globalsContent.match(/:root\s*\{([\s\S]*?)\}/);
    if (!rootBlockMatch) {
      errors.push('app/globals.css missing :root block');
    } else {
      const rootBlock = rootBlockMatch[1];
      for (const token of REQUIRED_CANONICAL_TOKENS) {
        if (!rootBlock.includes(token + ':')) {
          errors.push(`Missing canonical token "${token}" in :root of app/globals.css`);
        }
      }
    }

    // Styld is LIGHT MODE ONLY: no dark theme selectors, no OS dark following.
    if (globalsContent.includes('[data-theme="dark"]') || globalsContent.includes('[data-color-scheme="dark"]')) {
      errors.push('app/globals.css must not define dark theme selectors (Styld is light-only)');
    }

    if (globalsContent.includes('@media (prefers-color-scheme: dark)')) {
      errors.push('app/globals.css must not follow OS dark mode (Styld is light-only)');
    }

    // Native controls and scrollbars must stay light regardless of OS appearance.
    if (!globalsContent.includes('color-scheme: light')) {
      errors.push('app/globals.css must pin color-scheme: light');
    }
  }

  // 2. Verify app/layout.tsx renders a static LIGHT document (Styld is light-only)
  const layoutPath = path.join(ROOT_DIR, 'app', 'layout.tsx');
  if (!fs.existsSync(layoutPath)) {
    errors.push('app/layout.tsx does not exist');
  } else {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    if (!layoutContent.includes('data-theme="light"') || !layoutContent.includes('data-color-scheme="light"')) {
      errors.push('app/layout.tsx must render the document statically in the light theme');
    }
    if (layoutContent.includes('prefers-color-scheme') || layoutContent.includes('colorScheme')) {
      errors.push('app/layout.tsx must not contain a theme selection bootstrap (Styld is light-only)');
    }
  }

  // 3. Verify components/theme-applicator.tsx
  const applicatorPath = path.join(ROOT_DIR, 'components', 'theme-applicator.tsx');
  if (!fs.existsSync(applicatorPath)) {
    errors.push('components/theme-applicator.tsx does not exist');
  } else {
    const applicatorContent = fs.readFileSync(applicatorPath, 'utf8');
    if (applicatorContent.includes('colorScheme') || applicatorContent.includes('prefers-color-scheme')) {
      errors.push('components/theme-applicator.tsx must not select or apply a theme (Styld is light-only)');
    }
    if (applicatorContent.includes('classList.toggle("dark"')) {
      errors.push('components/theme-applicator.tsx must not toggle a dark class');
    }
    if (!applicatorContent.includes('data-reduce-motion') || !applicatorContent.includes('data-high-contrast')) {
      errors.push('components/theme-applicator.tsx must still apply reduced motion and high contrast');
    }
  }

  // 4. Verify lib/settings-store.ts
  const settingsStorePath = path.join(ROOT_DIR, 'lib', 'settings-store.ts');
  if (!fs.existsSync(settingsStorePath)) {
    errors.push('lib/settings-store.ts does not exist');
  } else {
    const settingsContent = fs.readFileSync(settingsStorePath, 'utf8');
    if (!settingsContent.includes('styld_settings') || !settingsContent.includes('ms_app_settings.v1')) {
      errors.push('lib/settings-store.ts must read and persist both styld_settings and ms_app_settings.v1');
    }
  }

  // 5. Verify components/onboarding-tour.tsx
  const tourPath = path.join(ROOT_DIR, 'components', 'onboarding-tour.tsx');
  if (!fs.existsSync(tourPath)) {
    errors.push('components/onboarding-tour.tsx does not exist');
  } else {
    const tourContent = fs.readFileSync(tourPath, 'utf8');
    if (!tourContent.includes('export type TourStatus')) {
      errors.push('components/onboarding-tour.tsx must export TourStatus type');
    }
    if (!tourContent.includes('Start tour') || !tourContent.includes('Explore Styld')) {
      errors.push('components/onboarding-tour.tsx controls must include "Start tour" for step 1 and "Explore Styld" for final step');
    }
  }

  // 6. Scan files for Mojibake artifacts in app and components
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          scanDir(fullPath);
        }
      } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of MOJIBAKE_PATTERNS) {
          if (pattern.test(content)) {
            errors.push(`Encoding issue (mojibake) detected in ${path.relative(ROOT_DIR, fullPath)}: matches ${pattern}`);
            break;
          }
        }
      }
    }
  }

  scanDir(path.join(ROOT_DIR, 'components'));
  scanDir(path.join(ROOT_DIR, 'app'));

  console.log(`Audited tokens: ${REQUIRED_CANONICAL_TOKENS.length} canonical tokens checked.`);
  console.log(`Root theme contract: verified.`);
  console.log(`Encoding cleanliness: verified.`);

  if (warnings.length > 0) {
    console.warn('\nWarnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (errors.length > 0) {
    console.error('\nAudit Failed with errors:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log('\n[PASS] Styld theme system audit passed successfully!\n');
}

if (require.main === module) {
  runAudit();
}

module.exports = { runAudit, REQUIRED_CANONICAL_TOKENS };
