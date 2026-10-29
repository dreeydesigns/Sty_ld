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

test('every module a browser QA suite requires is declared, or named as a hoisted exception', () => {
  // A suite whose driver does not resolve throws on its first line, so browser QA on a clean
  // checkout is not a failing test, it is no test at all. `node_modules/<name>` is not evidence of
  // anything: a hoisted transitive satisfies it and an eslint plugin bump can remove it, which is
  // how axe-core came to be loadable here without anyone declaring it. The manifest is the only
  // place that states what this project asked for, so the manifest is what this reads.
  const builtins = new Set(require('module').builtinModules);
  const root = lock.packages[''] || {};
  const declared = { ...(root.dependencies || {}), ...(root.devDependencies || {}) };
  // The suite files reach their driver in three shapes: the plain require, the argv override the
  // mock suites use so one file runs against the bundled or an installed driver, and require.resolve
  // for a file inside a package. ESM import forms are scanned too even though these suites are CJS,
  // because the next harness file may not be.
  const patterns = [
    /require\(\s*(['"])([^'"]+)\1\s*\)/g,
    /require\.resolve\(\s*(['"])([^'"]+)\1\s*\)/g,
    /require\(\s*process\.argv\[\d+\]\s*\|\|\s*(['"])([^'"]+)\1\s*\)/g,
    /(?:^|[\s;}])(?:import|export)\s[^;]*?from\s*(['"])([^'"]+)\1/gm,
    /\bimport\(\s*(['"])([^'"]+)\1\s*\)/g,
  ];
  const browserFiles = [];
  (function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (/\.(cjs|mjs|js)$/.test(entry.name)) browserFiles.push(full);
    }
  })('tests');
  const needed = new Map();
  for (const file of browserFiles) {
    const source = fs.readFileSync(file, 'utf8');
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
  // One exception, stated with the package that actually brings it in. The version this suite would
  // load is read from the lock rather than trusted from the note, and the parent link is required to
  // still exist: if eslint-plugin-jsx-a11y ever stops depending on axe-core this fails and forces a
  // declaration instead of leaving a QA harness that stops installing.
  const hoistedExceptions = { 'axe-core': 'eslint-plugin-jsx-a11y' };
  const missing = [];
  for (const [name, files] of needed) {
    if (declared[name]) continue;
    const parent = hoistedExceptions[name];
    if (!parent) { missing.push(`${name} (needed by ${files.size} files, declared nowhere)`); continue; }
    const parentEntry = lock.packages[`node_modules/${parent}`];
    const parentWants = Object.entries({ ...(parentEntry?.dependencies || {}), ...(parentEntry?.peerDependencies || {}) })
      .filter(([dep]) => dep === name).map(([, range]) => range)[0];
    const locked = lock.packages[`node_modules/${name}`]?.version;
    if (!parentEntry || !parentWants) { missing.push(`${name} (needed by ${files.size} files, named as a hoist of ${parent} but the lock shows no such dependency)`); continue; }
    const installed = Object.keys(lock.packages).filter(key => key.endsWith(`node_modules/${name}`));
    if (!installed.length) missing.push(`${name} (needed by ${files.size} files, the lock installs it nowhere)`);
    else console.log(`  note: ${name} ${locked} is loaded from the hoist under ${parent} (${parentWants}); ${files.size} files need it`);
  }
  assert.ok(needed.has('playwright'), 'no browser suite reaches playwright by any require shape this scan knows, so the driver pin has nothing to prove');
  assert.equal(missing.length, 0, missing.join('; '));
});
