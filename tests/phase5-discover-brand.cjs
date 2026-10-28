const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Discover page no longer uses purple accents', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'discover-content.tsx'), 'utf8');
  assert.doesNotMatch(source, /#8B5CF6/);
});

test('Discovery unsupported ordering is not offered', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'discovery.tsx'), 'utf8');
  assert.doesNotMatch(source, /Nearest|Earliest available/);
});

test('Previously mismatched imageAssets are honest placeholders', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'site-data.ts'), 'utf8');
  assert.match(source, /data:image\/svg\+xml/);
  assert.doesNotMatch(source, /images\.unsplash\.com\/photo/);
});

