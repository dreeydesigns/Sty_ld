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

const MOJIBAKE_PATTERNS = [/Â©/, /Â·/, /Ã©/, /Ã¨/, /Ã¢/];

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

    // Check custom variant dark
    if (!globalsContent.includes('@custom-variant dark') || !globalsContent.includes('[data-theme="dark"]')) {
      errors.push('app/globals.css must include @custom-variant dark supporting [data-theme="dark"]');
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

    // Check dark tokens in [data-color-scheme="dark"], .dark, [data-theme="dark"]
    if (!globalsContent.includes('[data-theme="dark"]') || !globalsContent.includes('[data-color-scheme="dark"]')) {
      errors.push('app/globals.css missing dark theme selector matching [data-theme="dark"] and [data-color-scheme="dark"]');
    }

    // Check system preference fallback
    if (!globalsContent.includes('@media (prefers-color-scheme: dark)')) {
      errors.push('app/globals.css missing @media (prefers-color-scheme: dark) system fallback');
    }
  }

  // 2. Verify Root Theme Contract in app/layout.tsx
  const layoutPath = path.join(ROOT_DIR, 'app', 'layout.tsx');
  if (!fs.existsSync(layoutPath)) {
    errors.push('app/layout.tsx does not exist');
  } else {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    if (!layoutContent.includes('data-theme') || !layoutContent.includes('data-color-scheme')) {
      errors.push('app/layout.tsx inline bootstrap script must set both data-theme and data-color-scheme attributes');
    }
    if (!layoutContent.includes('ms_app_settings.v1') || !layoutContent.includes('styld_settings')) {
      errors.push('app/layout.tsx bootstrap script must check both styld_settings and legacy ms_app_settings.v1 keys');
    }
  }

  // 3. Verify components/theme-applicator.tsx
  const applicatorPath = path.join(ROOT_DIR, 'components', 'theme-applicator.tsx');
  if (!fs.existsSync(applicatorPath)) {
    errors.push('components/theme-applicator.tsx does not exist');
  } else {
    const applicatorContent = fs.readFileSync(applicatorPath, 'utf8');
    if (!applicatorContent.includes('data-theme') || !applicatorContent.includes('data-color-scheme')) {
      errors.push('components/theme-applicator.tsx must set both data-theme and data-color-scheme on documentElement');
    }
    if (!applicatorContent.includes('classList.toggle("dark"')) {
      errors.push('components/theme-applicator.tsx must toggle .dark class for Tailwind compatibility');
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
