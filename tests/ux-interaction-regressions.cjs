/**
 * STYLD UX, Interaction, Responsive & Settings Regression Suite
 *
 * Enforces:
 * 1. Zero dead links (href="#", javascript:void(0)) across codebase.
 * 2. Feedback and support reporting submits to /api/contact, zero Firestore calls.
 * 3. Language settings truthfulness (English & Kiswahili supported, others badged Coming soon).
 * 4. Administrator and Super Admin label resolution in settings UI.
 * 5. Route fallbacks for /pro and /salon redirect cleanly.
 * 6. Nested card click boundaries (stopPropagation) on interactive items.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', '.next', '.git', 'tests'].includes(f)) {
        results = results.concat(walk(full));
      }
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx')) {
      results.push(full);
    }
  }
  return results;
}

test('codebase contains zero dead href="#" or javascript:void(0) links', () => {
  const files = walk(ROOT_DIR);
  const deadLinks = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (
        line.includes('href="#"') ||
        line.includes("href='#'") ||
        line.includes('href={`#`}') ||
        line.includes('javascript:void(0)')
      ) {
        deadLinks.push(`${path.relative(ROOT_DIR, file)}:${i + 1} -> ${line.trim()}`);
      }
    });
  });

  assert.equal(
    deadLinks.length,
    0,
    `Found dead hrefs:\n${deadLinks.join('\n')}`
  );
});

test('components/settings-ui.tsx and components/feedback-modal.tsx submit to /api/contact without Firestore', () => {
  const settingsSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'settings-ui.tsx'), 'utf8');
  const feedbackModalSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'feedback-modal.tsx'), 'utf8');

  // Verify Firestore is not used
  assert.ok(!settingsSrc.includes('firebase/firestore'), 'settings-ui must not import firebase/firestore');
  assert.ok(!settingsSrc.includes('addDoc('), 'settings-ui must not call addDoc');
  assert.ok(!feedbackModalSrc.includes('firebase/firestore'), 'feedback-modal must not import firebase/firestore');
  assert.ok(!feedbackModalSrc.includes('addDoc('), 'feedback-modal must not call addDoc');

  // Verify /api/contact is called
  assert.ok(settingsSrc.includes('/api/contact'), 'settings-ui must submit report to /api/contact');
  assert.ok(feedbackModalSrc.includes('/api/contact'), 'feedback-modal must submit feedback to /api/contact');
});

test('components/settings-ui.tsx truthfully differentiates supported languages', () => {
  const settingsSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'settings-ui.tsx'), 'utf8');

  // Must define supported: true for en and sw
  assert.ok(settingsSrc.includes('code: "en"'), 'Must define English');
  assert.ok(settingsSrc.includes('code: "sw"'), 'Must define Kiswahili');
  assert.ok(settingsSrc.includes('supported: true'), 'Must mark supported languages');
  assert.ok(settingsSrc.includes('supported: false'), 'Must mark unsupported languages');
  assert.ok(settingsSrc.includes('Coming soon'), 'Must badge unsupported languages as Coming soon');
});

test('components/settings-ui.tsx resolves display name and account label for admin and super_admin', () => {
  const settingsSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'settings-ui.tsx'), 'utf8');

  assert.ok(settingsSrc.includes('Administrator'), 'Must resolve admin to Administrator');
  assert.ok(settingsSrc.includes('Super Admin'), 'Must resolve super_admin to Super Admin');
  assert.ok(settingsSrc.includes('Admin account'), 'Must resolve admin account label');
  assert.ok(settingsSrc.includes('Super Admin account'), 'Must resolve super_admin account label');
});

test('app/pro/page.tsx and app/salon/page.tsx exist and redirect to respective dashboards', () => {
  const proPagePath = path.join(ROOT_DIR, 'app', 'pro', 'page.tsx');
  const salonPagePath = path.join(ROOT_DIR, 'app', 'salon', 'page.tsx');

  assert.ok(fs.existsSync(proPagePath), 'app/pro/page.tsx must exist');
  assert.ok(fs.existsSync(salonPagePath), 'app/salon/page.tsx must exist');

  const proSrc = fs.readFileSync(proPagePath, 'utf8');
  const salonSrc = fs.readFileSync(salonPagePath, 'utf8');

  assert.ok(proSrc.includes("redirect('/pro/dashboard')"), 'app/pro/page.tsx must redirect to /pro/dashboard');
  assert.ok(salonSrc.includes("redirect('/salon/dashboard')"), 'app/salon/page.tsx must redirect to /salon/dashboard');
});

test('nested card actions enforce stopPropagation to prevent unintended navigation', () => {
  const marketplaceSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'marketplace-ui.tsx'), 'utf8');
  const socialHomeSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'social-home.tsx'), 'utf8');

  assert.ok(marketplaceSrc.includes('e.stopPropagation()'), 'marketplace-ui must stopPropagation on card controls');
  assert.ok(socialHomeSrc.includes('e.stopPropagation()'), 'social-home must stopPropagation on card controls');
});
