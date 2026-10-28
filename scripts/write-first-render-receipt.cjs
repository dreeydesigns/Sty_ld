/**
 * Writes docs/readiness/beta/first-render-audit.json from the build that is actually on disk.
 *
 * The receipt has to answer four questions a bare measurement cannot: which commit the measured
 * `.next` output was built from, whether anything outside scripts/ and tests/ differs between that
 * build and the commit the receipt is recorded against, whether the working tree holds source files
 * git has never seen, and what the instrument's metric means. The measurement comes from
 * `scripts/first-render-audit.cjs --json`; the narrative fields are carried forward from the
 * previous receipt so a re-run refreshes evidence without rewriting prose, except the instrument's
 * own test count, which is read from the file instead of remembered.
 *
 *   node scripts/write-first-render-receipt.cjs --built-at 7318e71
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const receiptPath = path.join(root, 'docs', 'readiness', 'beta', 'first-render-audit.json');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
const builtAtFlag = process.argv.indexOf('--built-at');
if (builtAtFlag < 0 || !process.argv[builtAtFlag + 1]) throw new Error('Pass --built-at <commit> for the commit the .next output was built from.');
const builtAt = process.argv[builtAtFlag + 1];

if (!fs.existsSync(receiptPath)) throw new Error(`${receiptPath} does not exist; the narrative fields have nowhere to be carried from.`);
const previous = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
const measured = JSON.parse(execFileSync(process.execPath, ['scripts/first-render-audit.cjs', '--json'],
  { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));

const resolvedBuildCommit = git('rev-parse', '--short', builtAt);
const changedSinceBuild = git('diff', '--name-only', `${resolvedBuildCommit}..HEAD`).split('\n').filter(Boolean);

// What sits in the working tree right now, split by whether git already tracks the path. The two
// are different facts: a tracked file modified since HEAD means the tree the receipt is recorded
// against is not the tree git holds, while an untracked source file means a file the build may have
// compiled is in no commit at all. A prefix match without its separator would also let `application/`
// or `libraries/` answer for `app/` or `lib/`, so each pattern carries its own boundary. Only the
// paths that reach the build are listed; editing this script must not make the tree look dirty.
const SOURCE_PATH = /^(app\/|components\/|lib\/|sql\/|middleware\.ts)/;
// Which of the paths that differ between the build commit and HEAD could have changed what is being
// measured. Docs and receipts cannot; application source, the framework and dependency manifests,
// and the two instrument files can. Naming the set is what lets the note say something differs
// without concluding, from a list of changed markdown files, that no source file does.
const BUILD_INPUT = /^(app\/|components\/|lib\/|sql\/|middleware\.ts|next\.config\.[cm]?js|package(-lock)?\.json|tsconfig\.json|tailwind\.config\.|postcss\.config\.|scripts\/first-render-audit\.cjs|tests\/first-render-audit\.cjs)/;
const buildInputChanges = changedSinceBuild.filter(p => BUILD_INPUT.test(p));
const workingPaths = git('status', '--porcelain').split('\n').filter(Boolean)
  .map(line => ({ status: line.slice(0, 2), path: line.slice(3).split(' -> ').pop().trim() }));
const untrackedSourcePaths = workingPaths.filter(entry => entry.status === '??' && SOURCE_PATH.test(entry.path)).map(entry => entry.path);
const modifiedSourcePaths = workingPaths.filter(entry => entry.status !== '??' && SOURCE_PATH.test(entry.path)).map(entry => entry.path);

// The operator names the commit the `.next` output was built from. Nothing in git links a commit to
// a build identifier, and the measurement reads the identifier out of the same `.next/BUILD_ID` file
// that a check "against the tree on disk" would compare itself to, so that comparison would always
// agree and would prove nothing. What is provable is stated instead: the declaration is a
// declaration, and the diff between the named commit and HEAD is listed by file.

// The instrument's test count is read from the file that pins it. Carrying a hand-written number
// forward from the previous receipt is how this file came to describe "20 tests" the run after the
// twenty-first case was added.
const instrumentTests = (fs.readFileSync(path.join(root, 'tests', 'first-render-audit.cjs'), 'utf8')
  .match(/^test\(/gm) || []).length;
const instrumentNarrative = String(previous.instrument || '')
  .replace(/\(\d+ tests in tests\/first-render-audit\.cjs\)/, `(${instrumentTests} tests in tests/first-render-audit.cjs)`);

const receipt = {
  // `untrackedInSourcePaths` was the old name for the same idea and reported modified tracked files
  // as well as untracked ones; it is dropped rather than carried forward under a new spelling.
  // `appSourceCleanAgainstHead` is dropped for the same reason in the other direction: nothing here
  // computes it any more, so carrying it forward re-publishes whatever an older revision of this
  // script happened to write. The three fields that replaced it are computed from git on every run:
  // `measurementInputsCleanAgainstArtifact`, `modifiedSourcePaths` and `untrackedSourcePaths`.
  ...(({ untrackedInSourcePaths, appSourceCleanAgainstHead, ...carried }) => carried)(previous),
  measuredAt: new Date().toISOString(),
  commit: git('rev-parse', 'HEAD'),
  branch: git('branch', '--show-current'),
  measurementInputsCleanAgainstArtifact: buildInputChanges.length === 0,
  buildInputChangesSinceArtifact: buildInputChanges,
  buildId: measured.buildId,
  artifactCommit: resolvedBuildCommit,
  artifactNote: [
    `The .next output measured here carries build id ${measured.buildId} and is declared, by --built-at and not derived, to be the build of ${resolvedBuildCommit}: nothing in git links a commit to a build identifier, so that part of the receipt is the operator's statement, not a measurement.`,
    `git diff --name-only ${resolvedBuildCommit}..HEAD lists ${changedSinceBuild.length} paths, of which ${buildInputChanges.length} could have changed what is measured (application source, framework or dependency config, or the instrument): ${buildInputChanges.length === 0 ? 'none' : buildInputChanges.join(', ')}. The remainder are docs and receipts and are not evidence about the build. HEAD is ${git('rev-parse', '--short', 'HEAD')}.`,
  ].join(' '),
  ...measured,
  instrument: instrumentNarrative,
  // The gate is the audit's own exit status with the loader-only budget at zero.
  gateExit: (() => {
    try {
      execFileSync(process.execPath, ['scripts/first-render-audit.cjs', '--max-loader-only=0'], { cwd: root, stdio: 'ignore' });
      return 0;
    } catch { return 1; }
  })(),
  untrackedSourcePaths,
  modifiedSourcePaths,
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({
  written: path.relative(root, receiptPath).split(path.sep).join('/'),
  commit: receipt.commit.slice(0, 7),
  artifactCommit: receipt.artifactCommit,
  buildId: receipt.buildId,
  gateExit: receipt.gateExit,
  routes: receipt.routes,
  loaderOnly: receipt.loaderOnlyRoutes.length,
  announcedWaits: receipt.announcedWaitRoutes.length,
  thin: receipt.thinRoutes.length,
  redirects: receipt.redirectRoutes.length,
  errorAnswers: receipt.errorAnswerRoutes.length,
  buildInputChangesSinceArtifact: buildInputChanges,
  untrackedSourcePaths,
  modifiedSourcePaths,
}, null, 2));
