const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Stories video cleanup guards are present', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'social-home.tsx'), 'utf8');
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /muted=\{storyVideoMuted\}/);
  assert.match(source, /preload="metadata"/);
  assert.match(source, /playsInline/);
  assert.match(source, /observer\.disconnect\(\)/);
  assert.match(source, /removeEventListener\("visibilitychange"/);
  assert.match(source, /setStoryVideoPaused\(false\)/);
  assert.match(source, /setStoryVideoPaused\(true\)/);
});
