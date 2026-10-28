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

test('every module a browser QA suite requires is a package the lockfile installs', () => {
  // A suite whose driver does not resolve throws on its first line, so browser QA on a clean
  // checkout is not a failing test, it is no test at all. node_modules can hold packages nothing
  // declares, and npm ci deletes exactly those, so the lockfile is the only honest place to check.
  const builtins = new Set(require('module').builtinModules);
  const patterns = [/require\(\s*(['"])([^'"]+)\1\s*\)/g, /require\(\s*process\.argv\[2\]\s*\|\|\s*(['"])([^'"]+)\1\s*\)/g];
  const needed = new Map();
  for (const file of fs.readdirSync('tests/browser').filter(name => name.endsWith('.cjs'))) {
    const source = fs.readFileSync(`tests/browser/${file}`, 'utf8');
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const specifier = match[2];
        if (builtins.has(specifier) || specifier.startsWith('node:') || specifier.startsWith('.')) continue;
        const segments = specifier.split('/');
        const name = specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
        if (!needed.has(name)) needed.set(name, new Set());
        needed.get(name).add(file);
      }
    }
  }
  const missing = [...needed].filter(([name]) => !lock.packages[`node_modules/${name}`]);
  assert.equal(missing.length, 0, `${missing.map(([name, files]) => `${name} (needed by ${files.size} of the ${fs.readdirSync('tests/browser').filter(n => n.endsWith('.cjs')).length} browser suites)`).join(', ')} is required by the QA harness and the lockfile does not install it.`);
});
