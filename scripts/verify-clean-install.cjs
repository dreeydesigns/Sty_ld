// Prove that a clean checkout can actually start the browser QA harness.
//
//   node scripts/verify-clean-install.cjs
//
// tests/dependency-lock.cjs reads the lockfile, and a lockfile reading is a claim about a file. The
// claim that matters is whether `npm ci`, which deletes node_modules and reinstalls exactly what the
// manifest declares, leaves every module the QA harness requires resolvable. That is only knowable by
// running it, and the reason it is worth running is that playwright sat in node_modules here while
// nothing declared it, which is invisible to anything that inspects the installed tree.
//
// --ignore-scripts is the project rule: the suites launch the installed system Chrome by absolute
// path, so the Playwright browser download would be 200 MB of nothing used. This script deletes and
// rebuilds node_modules, so nothing else may be running.

const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const receiptPath = path.join(root, 'docs/readiness/beta/clean-install.json');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

let install;
// On Windows `npm` is a batch file: spawnSync cannot start `npm.cmd` without a shell (it answers
// EINVAL) and `npm` alone is ENOENT. The first attempt here recorded a null exit status while
// node_modules stayed exactly as it was, which would have been filed as a clean install that never
// ran. So npm is started the way Node itself ships it, through its cli script, and the receipt names
// the invocation that was actually used. Nothing is run through a shell.
const npmCli = [
  path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli-mjs.js'),
].find(candidate => fs.existsSync(candidate));
if (!npmCli) throw new Error('no npm cli script next to ' + process.execPath + '; refusing to guess at a shell command');
const invocation = { command: `${process.execPath} ${npmCli} ci --ignore-scripts` };
try {
  const stdout = execFileSync(process.execPath, [npmCli, 'ci', '--ignore-scripts'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  install = { ...invocation, exitCode: 0, outputTail: stdout.split('\n').filter(Boolean).slice(-6).join(' | ') };
} catch (error) {
  install = { ...invocation, exitCode: error.status === undefined ? `no exit status (code=${error.code}, signal=${error.signal})` : error.status,
    outputTail: String(error.stdout || '').split('\n').filter(Boolean).slice(-6).join(' | ') + ' || ' + String(error.stderr || '').split('\n').filter(Boolean).slice(-6).join(' | ') };
}

// Each entry is a name the harness reaches for by string, so this is the same lookup the suites do,
// read from inside tests/browser rather than from the root, because resolution starts at the file.
const reach = specifier => {
  try { return require.resolve(specifier, { paths: [path.join(root, 'tests/browser')] }); } catch { return null; }
};
const probe = ['playwright', 'axe-core/axe.min.js', 'playwright-core/package.json', 'axe-core/package.json', '@electric-sql/pglite', 'typescript']
  .reduce((out, specifier) => {
    const resolved = reach(specifier);
    let version = null;
    if (resolved) {
      const owner = resolved.match(/[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/);
      if (owner) {
        try { version = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', owner[1], 'package.json'), 'utf8')).version; } catch { version = 'resolved but no package.json readable'; }
      }
    }
    out[specifier] = { resolved: Boolean(resolved), version, declaredInManifest: Boolean((manifest.dependencies || {})[specifier.split('/')[0]] || (manifest.devDependencies || {})[specifier.split('/')[0]]) };
    return out;
  }, {});

const failures = Object.entries(probe).filter(([, entry]) => !entry.resolved).map(([name]) => name);
fs.writeFileSync(receiptPath, JSON.stringify({
  measuredAt: new Date().toISOString(),
  commit: git('rev-parse', 'HEAD'),
  branch: git('branch', '--show-current'),
  workingTree: { dirty: git('status', '--porcelain').split('\n').filter(line => line.trim() && !line.startsWith('?? docs/')).length > 0,
    note: 'this receipt is written by the run it records, so it is expected to be the only dirty path afterwards' },
  install,
  playwrightBrowsers: 'not downloaded, deliberately: the suites launch C:/Program Files/Google/Chrome/Application/chrome.exe by executablePath, and --ignore-scripts skips the download step that would fetch a private browser nothing asks for',
  resolutionFrom: 'tests/browser, because that is where the suites sit and resolution starts at the requiring file',
  probe,
  result: { cleanInstallWorked: install.exitCode === 0 && failures.length === 0, unresolvableAfterInstall: failures },
}, null, 2) + '\n');
console.log(JSON.stringify({ exitCode: install.exitCode, cleanInstallWorked: install.exitCode === 0 && failures.length === 0,
  unresolvable: failures, playwright: probe.playwright, axeCore: probe['axe-core/axe.min.js'] }, null, 2));
process.exit(install.exitCode === 0 && failures.length === 0 ? 0 : 1);
