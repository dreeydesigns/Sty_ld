const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

test('registry artifacts retain integrity and exact sources for reproducible clean installs', () => {
  const incomplete = Object.entries(lock.packages).filter(([name, item]) => name && item.version && !item.link &&
    (!/^sha512-/.test(item.integrity || '') || !/^https:\/\/registry\.npmjs\.org\//.test(item.resolved || ''))).map(([name]) => name);
  assert.equal(incomplete.length, 0, `Registry artifact metadata missing for ${incomplete.length} packages.`);
});

test('Windows and Linux x64 resolver bindings match the existing exact parent version', () => {
  const parent = lock.packages['node_modules/unrs-resolver'];
  for (const platform of ['win32-x64-msvc', 'linux-x64-gnu', 'linux-x64-musl']) {
    const name = `@unrs/resolver-binding-${platform}`;
    assert.equal(lock.packages[`node_modules/${name}`]?.version, parent.optionalDependencies[name], `Missing exact ${platform} binding.`);
  }
});
