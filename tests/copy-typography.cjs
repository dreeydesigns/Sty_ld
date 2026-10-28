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
 * Generated artifacts are not scanned. The `docs/readiness` receipts (`.json`) and the stored run
 * logs are records of the revision that produced them; rewriting them would put words in the past
 * that the harnesses never emitted. Two of those records, `live-first-render.json` and its
 * siblings, captured page copy that still contains a dash because the build they measured predates
 * this sweep, so the clean reading here is of the source, and a hosted document is clean only after
 * a preview is rebuilt from a revision this suite passes on.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const DASH = /[\u2013\u2014]/;
// A glyph whose only content is a dash, sitting in the place a value would be drawn.
const PLACEHOLDER_AS_VALUE = /^\s*(>|")\s*[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u2500]+\s*(<|")/;
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
  // CSS carries the palette comments the brand work writes, so it is source the rule covers too.
  const code = /(\.[cm]?[jt]sx?|\.css)$/;
  const fromSource = SOURCE_DIRECTORIES.flatMap(name => filesIn(path.join(root, name), code));
  const sql = filesIn(path.join(root, 'sql'), /\.sql$/);
  const docs = filesIn(path.join(root, 'docs'), /\.md$/);
  return [...fromSource, ...sql, ...docs, ...ROOT_MARKDOWN];
}

function offenders(files) {
  // The whole line is tested and only the report is shortened. Trimming before the match is what
  // made this rule lie: a markdown table row can run past a thousand characters, and the one line
  // the ledger row about this very sweep held a U+2014 at character 640, which a 120 character
  // window never reads. The rule is about the file, not about its first hundred characters.
  return files.flatMap(file => fs.readFileSync(file, 'utf8').split('\n')
    .map((line, index) => ({ file: path.relative(root, file).split(path.sep).join('/'), line: index + 1,
      text: line.trim().slice(0, 120), offset: line.trim().search(DASH) }))
    .filter(entry => entry.offset >= 0));
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
  // A filter that silently admits nothing is the other way this rule can rot, so each class of file
  // the rule claims to cover has to be represented in the walk, not merely allowed by it.
  for (const [label, pattern] of [['tsx or jsx', /\.(tsx|jsx)$/], ['ts or js', /\.[cm]?[jt]s$/], ['css', /\.css$/],
    ['sql', /\.sql$/], ['markdown', /\.md$/]]) {
    assert.ok(relative.some(file => pattern.test(file)), `the scan covers no ${label} file`);
  }
  fs.rmSync(path.dirname(scratch), { recursive: true });
});

test('a dash that sits past the report window is still an offender', () => {
  // The first version of the scan matched `line.trim().slice(0, 120)`, so a line longer than the
  // excerpt it prints was only read as far as the excerpt went. That is how this repository came to
  // hold a literal em dash at character 478 of a markdown table row while the suite reported a clean
  // tree, and long lines are exactly where prose copy lives.
  const os = require('node:os');
  const scratch = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'styld-dash-deep-')), 'row.md');
  const filler = 'x'.repeat(400);
  fs.writeFileSync(scratch, `| Quality | ${filler} clean prefix\n| Quality | ${filler} a dash at character ${filler.length + 14}\u2014near the end\n`);
  const caught = offenders([scratch]);
  assert.deepEqual(caught.map(entry => entry.line), [2], 'the second line is the only one with a dash, and it is far past the excerpt');
  assert.ok(caught[0].offset > 120, `the planted dash is at offset ${caught[0].offset}, which a 120 character window would never read`);
  assert.equal(caught[0].text.length, 120, 'the report stays short while the match reads the whole line');
  fs.rmSync(path.dirname(scratch), { recursive: true });
});

test('a placeholder that reads as a dash to a screen reader is not used as a value', () => {
  // The three places the sweep found were not punctuation at all: a landing mock, a professional
  // mode stat and the phone row for a guest, each showing the character because no value existed.
  // They now say "n/a" or "Not set", which is what the rest of the interface already says.
  const placeholders = filesIn(path.join(root, 'components'), /\.tsx$/).flatMap(file => fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((line, index) => ({ file: path.relative(root, file).split(path.sep).join('/'), line: index + 1, line }))
    .filter(entry => PLACEHOLDER_AS_VALUE.test(entry.line)));
  assert.deepEqual(placeholders, [], `a bare dash glyph is drawn as a value in ${JSON.stringify(placeholders.slice(0, 3))}`);
  // The class is deliberately wider than the rule above, which names only U+2013 and U+2014: a
  // box-drawing rule or a non-breaking hyphen is read out the same way and is neither of those.
  // If this stops being true the second test is a subset of the first and cannot fail on its own.
  assert.ok(PLACEHOLDER_AS_VALUE.test('>─<'), 'a box-drawing rule in value position must be caught here');
  assert.ok(!DASH.test('─'), 'and it must be a character the broad scan does not already refuse');
  assert.ok(PLACEHOLDER_AS_VALUE.test('"\u2014"'), 'a quoted bare em dash is a placeholder too');
  assert.ok(!PLACEHOLDER_AS_VALUE.test('>Nairobi<'), 'real copy in the same position must not be flagged');
});
