const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('home route separates guest and authenticated experiences', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'home', 'page.tsx'), 'utf8');
  assert.match(source, /GuestHome/);
  assert.match(source, /SocialHome/);
  assert.match(source, /isGuest/);
});

test('guest home uses honest empty states and safe CTAs', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'guest-home.tsx'), 'utf8');
  assert.match(source, /No posts to show yet/);
  assert.match(source, /No published looks yet/);
  assert.match(source, /\/discover/);
  assert.doesNotMatch(source, /Njeri Kamau/);
});

test('guest home preserves official Styld application shell', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'home', 'page.tsx'), 'utf8');
  assert.match(source, /AppShell currentNav="home"/);
});
