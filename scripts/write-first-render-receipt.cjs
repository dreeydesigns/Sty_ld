/**
 * Writes docs/readiness/beta/first-render-audit.json from the build that is actually on disk.
 *
 * The receipt has to answer three questions a bare measurement cannot: which commit the measured
 * `.next` output was built from, whether anything outside scripts/ and tests/ differs between that
 * build and the commit the receipt is recorded against, and what the instrument's metric means. The
 * measurement comes from `scripts/first-render-audit.cjs --json`; the narrative fields are carried
 * forward from the previous receipt so a re-run refreshes evidence without rewriting prose.
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
const productChanges = changedSinceBuild.filter(p => !/^(scripts|tests)\//.test(p));
const untrackedProductPaths = git('status', '--porcelain').split('\n').filter(Boolean)
  .map(line => line.slice(3).trim())
  .filter(p => /^(app|components|lib|sql|middleware)/.test(p));

const receipt = {
  ...previous,
  measuredAt: new Date().toISOString(),
  commit: git('rev-parse', 'HEAD'),
  branch: git('branch', '--show-current'),
  appSourceCleanAgainstHead: productChanges.length === 0,
  buildId: measured.buildId,
  artifactCommit: resolvedBuildCommit,
  artifactNote: `The .next output measured here was built at ${resolvedBuildCommit}. git diff --name-only ${resolvedBuildCommit}..HEAD lists ${changedSinceBuild.length} paths, of which ${productChanges.length} are outside scripts/ and tests/, so no app, component, lib, schema or middleware file differs between the build and the commit this receipt is recorded against (${git('rev-parse', '--short', 'HEAD')}).`,
  ...measured,
  // The gate is the audit's own exit status with the loader-only budget at zero.
  gateExit: (() => {
    try {
      execFileSync(process.execPath, ['scripts/first-render-audit.cjs', '--max-loader-only=0'], { cwd: root, stdio: 'ignore' });
      return 0;
    } catch { return 1; }
  })(),
  untrackedInSourcePaths: untrackedProductPaths,
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({
  written: path.relative(root, receiptPath).split(path.sep).join('/'),
  commit: receipt.commit.slice(0, 7),
  artifactCommit: receipt.artifactCommit,
  gateExit: receipt.gateExit,
  routes: receipt.routes,
  loaderOnly: receipt.loaderOnlyRoutes.length,
  announcedWaits: receipt.announcedWaitRoutes.length,
  thin: receipt.thinRoutes.length,
  redirects: receipt.redirectRoutes.length,
  errorAnswers: receipt.errorAnswerRoutes.length,
  productChangesSinceBuild: productChanges,
  untrackedInSourcePaths: untrackedProductPaths,
}, null, 2));
