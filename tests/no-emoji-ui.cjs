/**
 * Emoji-free UI regression.
 *
 * The STYLD application owns its interface copy, so app owned source must not
 * ship emoji or emoji-style pictographs. Icons come from the icon library.
 *
 * Scan scope: application owned source only (app, components, lib), extensions
 * .ts, .tsx, .js, .jsx, .cjs and .css.
 *
 * Documented exclusions:
 * - Markdown documentation (docs, README) is prose, not interface chrome.
 * - scripts/ is local tooling output, not shipped UI.
 * - Typographic arrows and separators (left/right arrows, bullets, middots,
 *   dashes) are allowed as plain text and are outside the scanned ranges.
 * - User generated content and external provider data are not source.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOTS = ['app', 'components', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.css']);
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2139}\u{2300}-\u{23FF}\u{FE0F}\u{20E3}]/u;

function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next'].includes(entry.name)) collectFiles(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

test('app owned UI source contains no emoji or emoji-style symbols', () => {
  const violations = [];
  for (const root of ROOTS) {
    for (const file of collectFiles(path.join(__dirname, '..', root))) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        if (EMOJI.test(line)) {
          violations.push(`${path.relative(path.join(__dirname, '..'), file)}:${index + 1}`);
        }
      });
    }
  }
  assert.deepEqual(violations, []);
});

test('replaced surfaces keep real icon components instead of glyphs', () => {
  const expectations = [
    ['components/toast-container.tsx', /<Check /],
    ['components/session-expiry-modal.tsx', /<Lock /],
    ['components/error-boundary.tsx', /<AlertTriangle /],
    ['components/service-session.tsx', /function Stars/],
    ['app/community-guidelines/page.tsx', /<Check /],
    ['app/contact/page.tsx', /<Check /],
  ];
  for (const [file, pattern] of expectations) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.match(source, pattern, file);
  }
});
