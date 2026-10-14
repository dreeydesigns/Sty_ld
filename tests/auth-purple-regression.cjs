const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AUTH_FILES = [
  'components/auth/unified-auth-flow.tsx',
  'app/auth/mfa/page.tsx',
  'app/auth/sign-in/page.tsx',
];

const forbidden = [/bg-purple/i, /text-purple/i, /border-purple/i, /ring-purple/i, /bg-violet/i, /text-violet/i, /bg-fuchsia/i, /text-fuchsia/i];

test('STYLD authentication interfaces do not use purple styling', () => {
  for (const file of AUTH_FILES) {
    const fullPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) continue;
    const source = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains unauthorized purple styling`);
    }
  }
});

test('Unified auth flow uses approved Ink button and neutral shield', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components/auth/unified-auth-flow.tsx'), 'utf8');
  assert.match(source, /bg-\[var\(--color-ink\)\]/);
  assert.match(source, /text-\[var\(--color-clay\)\]/);
});
