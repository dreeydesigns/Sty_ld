/**
 * The first-render receipt is evidence about a build, so it has to keep being true.
 *
 * `docs/readiness/beta/first-render-audit.json` is written by
 * `scripts/write-first-render-receipt.cjs` from the `.next` output on disk plus three readings taken
 * from git: which paths differ between the declared build commit and HEAD, and what in the working
 * tree is untracked or modified under the source prefixes. The last revision of this file carried a
 * field, `appSourceCleanAgainstHead`, that the script no longer computed, so each re-write republished
 * whatever an older script had decided, and the value in the receipt contradicted the three fields
 * that were actually measured. A receipt that carries a provenance claim nothing produces is worse
 * than a shorter receipt, so the key set is pinned, and the git readings are re-taken here rather
 * than trusted.
 *
 * `.next` is build output and is not committed, so the check that compares the recorded build
 * identifier against the output on disk says what it skipped instead of passing quietly.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const receiptPath = path.join(root, 'docs', 'readiness', 'beta', 'first-render-audit.json');
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));

const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();

// Every top-level key, with the reason it is allowed. Narrative keys are prose the writer carries
// forward on purpose; provenance keys are recomputed on each write. A new key has to be declared as
// one or the other here, which is the point: an undeclared key is a value nothing in the toolchain
// produces or checks.
const NARRATIVE_KEYS = new Set(['measuredAt', 'artifactNote', 'command', 'instrument', 'metric',
  'beforeFigure', 'control', 'reviewCorrections', 'artifactCommit']);
const MEASURED_KEYS = new Set(['buildId', 'routes', 'gateExit', 'loaderOnlyRoutes', 'announcedWaitRoutes',
  'redirectRoutes', 'errorAnswerRoutes', 'thinRoutes', 'rows', 'frameSubtracted', 'metricComparability']);
const GIT_KEYS = new Set(['commit', 'branch', 'measurementInputsCleanAgainstArtifact',
  'buildInputChangesSinceArtifact', 'untrackedSourcePaths', 'modifiedSourcePaths']);

test('every field in the first-render receipt is one the writer measures or one it carries on purpose', () => {
  const unexpected = Object.keys(receipt).filter(key =>
    !NARRATIVE_KEYS.has(key) && !MEASURED_KEYS.has(key) && !GIT_KEYS.has(key));
  assert.deepEqual(unexpected, [], `the receipt holds ${JSON.stringify(unexpected)} that no part of the writer produces`);
  for (const dropped of ['appSourceCleanAgainstHead', 'untrackedInSourcePaths']) {
    assert.ok(!(dropped in receipt), `${dropped} is a superseded claim the script no longer computes; carrying it re-publishes an old decision`);
  }
});

test('the receipt states which build it measured and names the harness that measured it', () => {
  assert.match(receipt.buildId, /^[A-Za-z0-9_-]{16,32}$/, 'the build identifier is the one Next writes');
  assert.ok(/first-render-audit\.cjs/.test(receipt.command), 'the receipt must say which command produced the numbers');
  assert.ok(/scripts\/first-render-audit\.cjs/.test(receipt.instrument), 'the receipt must name the instrument it is quoting');
  assert.equal(receipt.gateExit, 0, 'the recorded gate exit is the audit answering with the loader-only budget at zero');
  assert.ok(Array.isArray(receipt.rows) && receipt.rows.length === receipt.routes,
    `the receipt claims ${receipt.routes} routes but holds ${Array.isArray(receipt.rows) ? receipt.rows.length : 'no'} per-route rows, so the totals are not attributable`);
});

test('nothing that could change the measurement differs between the recorded build commit and HEAD', () => {
  // The receipt says the build it quotes is still the build of the current revision. That is a claim
  // about git, so it is re-read from git: if application source, the framework or dependency config,
  // or the instrument moved after the declared build commit, the numbers describe an older tree.
  const BUILD_INPUT = /^(app\/|components\/|lib\/|sql\/|middleware\.ts|next\.config\.[cm]?js|package(-lock)?\.json|tsconfig\.json|tailwind\.config\.|postcss\.config\.|scripts\/first-render-audit\.cjs|tests\/first-render-audit\.cjs)/;
  const changed = git('diff', '--name-only', `${receipt.artifactCommit}..HEAD`).split('\n').filter(Boolean);
  assert.deepEqual(changed.filter(p => BUILD_INPUT.test(p)), receipt.buildInputChangesSinceArtifact,
    'paths that feed the measurement moved since the build the receipt declares; re-measure before quoting it');
  assert.equal(receipt.measurementInputsCleanAgainstArtifact, receipt.buildInputChangesSinceArtifact.length === 0,
    'the clean-flag must be the reading of the list it sits next to, not a separate opinion');
});

test('the working tree holds no source file the receipt does not name', () => {
  const SOURCE_PATH = /^(app\/|components\/|lib\/|sql\/|middleware\.ts)/;
  const working = git('status', '--porcelain').split('\n').filter(Boolean)
    .map(line => ({ status: line.slice(0, 2), path: line.slice(3).split(' -> ').pop().trim() }))
    .filter(entry => SOURCE_PATH.test(entry.path));
  assert.deepEqual(working.map(e => e.path).sort(), [...receipt.modifiedSourcePaths, ...receipt.untrackedSourcePaths].sort(),
    'the receipt was written against a different tree than this one: a source file is uncommitted or the receipt is stale');
});

test('the build on disk is the build the receipt describes, or the check says it could not compare', (t) => {
  const buildIdPath = path.join(root, '.next', 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    // `.next` is not committed, so on a tree that has only been cloned this is the honest answer.
    // It is reported as skipped rather than passed, because a passing "matches the build on disk"
    // with no build on disk is the same kind of claim this file exists to remove.
    t.skip('no .next/BUILD_ID on disk, so the recorded build identifier could not be compared');
    return;
  }
  assert.equal(fs.readFileSync(buildIdPath, 'utf8').trim(), receipt.buildId,
    'the receipt quotes a build identifier the output on disk does not carry, so re-run the receipt writer');
});

test('the comparability the receipt states about its own metric is what the instrument still does', () => {
  // The before and control figures are only evidence if the metric behind them is the one the receipt
  // describes. These two readings are re-taken from the instrument here, so an edit to the audit that
  // changes which branch subtracts the frame fails the gate instead of leaving prose that flatters the
  // before figure.
  const source = fs.readFileSync(path.join(root, 'scripts', 'first-render-audit.cjs'), 'utf8');
  assert.equal(receipt.metricComparability.frameSubtractionIsConditional,
    /const measure = words\.length > 0 \? \{\} : \{ withoutFrame: true \};/.test(source),
    'the receipt claims the frame subtraction is conditional; the instrument says otherwise, so the before and control figures need re-reading');
  assert.equal(receipt.metricComparability.announcementCountsTowardTheBody,
    /charactersBeyondLoader: characters,/.test(source) && /announcedWaitOnly: announced && beyondAnnouncement === 0/.test(source),
    'the receipt claims a route\'s own announcement words still count toward its body length; the instrument says otherwise');
});
