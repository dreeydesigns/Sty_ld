/**
 * Typography rule the project instructions state and nothing enforced.
 *
 * AGENTS.md says no em or en dashes in any copy, docs or code comments, and the tree disagreed:
 * 213 of them across application source, 30 more across the markdown, and every earlier "copy is
 * clean" claim was a reading rather than a check. A rule with no test behind it is re-broken by the
 * next file written, so this holds it, and it also holds what the sweep had to decide by hand: a
 * dash between two digits is a range and takes the word "to", a dash that closes a label takes a
 * colon, and a dash standing alone as a no-value placeholder is not a dash at all but a glyph that
 * a screen reader calls "em dash" to a visitor who asked for plain words.
 *
 * Generated artifacts are not scanned. The `docs/readiness` receipts (`.json`) and the stored `.txt`
 * run logs are records of the revision that produced them; rewriting them would put words
 * in the past that the harnesses never emitted. The harness strings that write them are in tests/
 * and scripts/, which are scanned, so a dash can only reach a receipt through a change this suite
 * sees first.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const DASH = /[\u2013\u2014]/;
const SOURCE_DIRECTORIES = ['app', 'components', 'lib', 'scripts', 'tests'];
const ROOT_MARKDOWN = fs.existsSync(root)
  ? fs.readdirSync(root).filter(name => name.endsWith('.md')).map(name => path.join(root, name)) : [];

function filesIn(directory, extensionPattern) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...filesIn(full, extensionPattern));
    else if (extensionPattern.test(entry.name)) found.push(full);
  }
  return found;
}

function scannedFiles() {
  const code = /\.[cm]?[jt]sx?$/;
  const fromSource = SOURCE_DIRECTORIES.flatMap(name => filesIn(path.join(root, name), code));
  const sql = filesIn(path.join(root, 'sql'), /\.sql$/);
  const docs = filesIn(path.join(root, 'docs'), /\.md$/);
  return [...fromSource, ...sql, ...docs, ...ROOT_MARKDOWN];
}

function offenders(files) {
  return files.flatMap(file => fs.readFileSync(file, 'utf8').split('\n')
    .map((line, index) => ({ file: path.relative(root, file).split(path.sep).join('/'), line: index + 1, text: line.trim().slice(0, 120) }))
    .filter(entry => DASH.test(entry.text)));
}

test('no application source, script, test, migration or markdown file carries an em or en dash', () => {
  const files = scannedFiles();
  assert.ok(files.length > 200, `the scan found only ${files.length} files, so a path mistake would look like a clean tree`);
  const found = offenders(files);
  assert.deepEqual(found, [], `${found.length} dash lines remain, first five: ${JSON.stringify(found.slice(0, 5))}`);
});

test('the scanner sees a dash, names where it is, and is pointed at real files', () => {
  // Without this, an empty walk or a broken filter would make the rule above pass on a tree full of
  // dashes, which is the failure mode a copy rule has in a repository nobody reads line by line.
  const os = require('node:os');
  const scratch = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'styld-dash-')), 'sample.md');
  fs.writeFileSync(scratch, 'One clean line.\nA braider in Nairobi\u2014not a niche.\nA range from 2\u20133 hours.\n');
  const caught = offenders([scratch]);
  assert.equal(caught.length, 2, `the scanner reported ${caught.length} of the two dash lines in a three line file`);
  assert.deepEqual(caught.map(entry => entry.line), [2, 3], 'each dash line is named by its number');

  const files = scannedFiles();
  const relative = files.map(file => path.relative(root, file).split(path.sep).join('/'));
  for (const expected of ['app', 'components', 'lib', 'scripts', 'tests', 'docs']) {
    assert.ok(relative.some(file => file.startsWith(`${expected}/`)),
      `the scan covers no file under ${expected}/, so a dash there would be invisible`);
  }
  assert.ok(!files.some(file => file.includes(`${path.sep}.next${path.sep}`)), 'the scan must not read build output');
  assert.ok(!relative.some(file => file.endsWith('.json')), 'receipts are records of the revision that wrote them, not copy to edit');
  fs.rmSync(path.dirname(scratch), { recursive: true });
});

test('a placeholder that reads as a dash to a screen reader is not used as a value', () => {
  // The three places the sweep found were not punctuation at all: a landing mock, a professional
  // mode stat and the phone row for a guest, each showing the character because no value existed.
  // They now say "n/a" or "Not set", which is what the rest of the interface already says.
  const placeholders = filesIn(path.join(root, 'components'), /\.tsx$/).flatMap(file => fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((line, index) => ({ file: path.relative(root, file).split(path.sep).join('/'), line: index + 1, line }))
    .filter(entry => /^\s*(>|")[\u2013\u2014](<|")/.test(entry.line)));
  assert.deepEqual(placeholders, [], `a bare dash is drawn as a value in ${JSON.stringify(placeholders.slice(0, 3))}`);
});
