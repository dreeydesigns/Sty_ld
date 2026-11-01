/**
 * MOBILE-TYPE-06 close-out.
 *
 * The Large text setting works by raising the root font size, because raising the root is the only
 * mechanism that scales text without also scaling viewport units. It therefore reaches only sizes
 * written in rem. The interface had 515 arbitrary text utilities written as `text-[11px]` and its
 * neighbours, and a px utility is a fixed number of device pixels no matter what the visitor asks
 * for: the setting appeared to do nothing on the labels, chips and prices that carry it, which is
 * exactly what the founder's mobile screenshots showed. Every one of those is now written in rem,
 * and this file is what stops the next `text-[10px]` from re-opening the gap.
 *
 * A grep-only guard can pass on a tree nobody scanned, so the walk is proven against a planted
 * offender before it is allowed to report a clean one, and the rem values themselves are checked
 * for plausibility. A conversion that mistyped 11 as 11rem is a real risk of this shape of change,
 * and it would look like a success to a rule that only asks whether "px" is absent.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIRECTORIES = ['app', 'components', 'lib'];
const PIXEL_TEXT = /text-\[(?:\d*\.\d+|\d+)px\]/;
const REM_TEXT = /text-\[(\d*\.?\d+)rem\]/g;

function filesIn(directory) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...filesIn(full));
    else if (/(\.[cm]?[jt]sx?|\.css)$/.test(entry.name)) found.push(full);
  }
  return found;
}

function scannedFiles() {
  return SOURCE_DIRECTORIES.flatMap(name => filesIn(path.join(ROOT, name)));
}

function pixelTextOffenders(files) {
  return files.flatMap(file => fs.readFileSync(file, 'utf8').split('\n')
    .map((line, index) => ({ file: path.relative(ROOT, file).split(path.sep).join('/'), line: index + 1,
      match: (line.match(PIXEL_TEXT) || [])[0] }))
    .filter(entry => entry.match !== undefined));
}

test('no arbitrary text size in application source is fixed in pixels', () => {
  const files = scannedFiles();
  assert.ok(files.length > 200, `the scan found only ${files.length} files, so a path mistake would look like a clean tree`);
  const found = pixelTextOffenders(files);
  assert.deepEqual(found, [], `${found.length} pixel text utilities remain, first five: ${JSON.stringify(found.slice(0, 5))}`);
});

test('the scan reports a planted pixel size instead of reporting a clean tree', () => {
  const scratch = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'styld-type-')), 'sample.tsx');
  fs.writeFileSync(scratch, 'const a = <p className="text-[11px]">small</p>;\nconst b = <p className="text-[9.5px]">smaller</p>;\nconst c = <p className="text-[0.6875rem]">scales</p>;\n');
  const caught = pixelTextOffenders([scratch]);
  assert.deepEqual(caught.map(entry => entry.line), [1, 2], 'a fractional pixel size is as unscaled as a whole one');
  assert.equal(caught[0].match, 'text-[11px]');
  assert.equal(caught[1].match, 'text-[9.5px]');
  fs.rmSync(path.dirname(scratch), { recursive: true });

  // The rule has to be reading the directories it claims, or a wrong constant makes it vacuous.
  const relative = scannedFiles().map(file => path.relative(ROOT, file).split(path.sep).join('/'));
  for (const expected of SOURCE_DIRECTORIES) {
    assert.ok(relative.some(file => file.startsWith(`${expected}/`)), `the scan covers no file under ${expected}/`);
  }
  assert.ok(relative.some(file => file.endsWith('.css')), 'the scan covers no stylesheet');
});

test('the rem sizes that replaced them are text sizes, not a mistyped unit', () => {
  // 16px root: 0.6875rem is the 11px it replaced. Anything outside 8px to 64px is a conversion
  // mistake wearing the right suffix, and a 11rem "small label" would pass a px-absence check.
  const sizes = scannedFiles().flatMap(file => [...fs.readFileSync(file, 'utf8').matchAll(REM_TEXT)]
    .map(match => Number(match[1])));
  assert.ok(sizes.length > 200, `only ${sizes.length} rem text utilities found, so the sweep is not reading the tree`);
  const outside = [...new Set(sizes.filter(value => !(value * 16 >= 8 && value * 16 <= 64)))];
  assert.deepEqual(outside, [], `text utilities outside 8px to 64px at the default root: ${outside.slice(0, 8)}`);
});

test('nothing in the rendered interface pins text to a size the root scale cannot reach', () => {
  // Only the app shell and the components are in scope. Email bodies are excluded on purpose: a
  // mail client has no root font size from this app, so an inline px there is the correct form.
  const UNSCALED = /(?:font-size|fontSize)\s*[:=]\s*["'`]?[\d.]+px/;
  const rendered = ['app', 'components'].flatMap(name => filesIn(path.join(ROOT, name)));
  assert.ok(rendered.length > 100, `only ${rendered.length} rendered files scanned`);
  for (const file of rendered) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      assert.ok(!UNSCALED.test(line), `${relative}:${index + 1} sizes text in px: ${line.trim().slice(0, 100)}`);
    });
  }
});

test('the root font size is what carries the setting, and the setting writes it', () => {
  const css = fs.readFileSync(path.join(ROOT, 'app', 'globals.css'), 'utf8');
  const applicator = fs.readFileSync(path.join(ROOT, 'components', 'theme-applicator.tsx'), 'utf8');
  const store = fs.readFileSync(path.join(ROOT, 'lib', 'settings-store.ts'), 'utf8');
  assert.match(css, /html \{\s*font-size: calc\(100% \* var\(--text-scale, 1\)\);/, 'rem sizes resolve against a scaled root');
  assert.match(applicator, /--text-scale/, 'the stored preference writes the scale variable');
  assert.match(store, /large:\s*"1\.15"/, 'the Large step is a measurable 15 percent');
});

test('the stored preferences reach the document before the first paint', () => {
  // The applicator runs after mount, so without this a Large-text visitor loads every page at the
  // default size and sees it jump. The pre-paint script is the only thing that can prevent that.
  const layout = fs.readFileSync(path.join(ROOT, 'app', 'layout.tsx'), 'utf8');
  const noFlash = fs.readFileSync(path.join(ROOT, 'components', 'settings-no-flash.tsx'), 'utf8');
  const store = fs.readFileSync(path.join(ROOT, 'lib', 'settings-store.ts'), 'utf8');
  assert.ok(
    layout.indexOf('<SettingsNoFlash />') < layout.indexOf('<ThemeApplicator />'),
    'the script runs before the client applicator in the document'
  );
  assert.match(layout, /SettingsNoFlash/, 'the root layout renders the pre-paint script');
  assert.match(noFlash, /--text-scale/, 'the pre-paint script writes the root scale');
  assert.match(noFlash, /data-reduce-motion/, 'the pre-paint script writes Reduce Motion');
  assert.match(noFlash, /data-high-contrast/, 'the pre-paint script writes High Contrast');
  assert.match(noFlash, /catch/, 'a corrupt stored value cannot break the document');
  // The two paths have to agree on the key and the numbers, or the page jumps to a different size.
  assert.match(noFlash, /"styld_settings"/, 'the pre-paint script reads the key the store writes');
  assert.match(noFlash, /ms_app_settings\.v1/, 'and the legacy key too');
  assert.match(noFlash, /TEXT_SCALE_VALUES/, 'the scale numbers come from the store, not a second copy');
  assert.match(store, /TEXT_SCALE_VALUES/, 'the store owns them');
});
