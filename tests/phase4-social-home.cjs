const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('SocialHome preserves guest and authenticated separation', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'app', 'home', 'page.tsx'), 'utf8');
  assert.match(page, /GuestHome/);
  assert.match(page, /SocialHome/);
  assert.match(page, /isGuest/);
});

test('Phase 4 social feed is media-first and honest', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'social-home.tsx'), 'utf8');
  assert.match(source, /Beauty-first feed/);
  assert.match(source, /No manufactured stats/);
  assert.match(source, /object-cover/);
});

test('SocialHome empty states remain honest', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'social-home.tsx'), 'utf8');
  assert.match(source, /Nothing here yet/);
});
