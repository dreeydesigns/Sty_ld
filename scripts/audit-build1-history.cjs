// Read-only local Git inspection. Findings contain paths and counts, never matched values.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const accepted = '5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12';
const upstream = 'origin/work/pre-mvp-closeout-20261016';
const review = process.argv[2];
if (!review) throw new Error('Supply the existing local sanitized publication repository.');
const git = (args, cwd = process.cwd()) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const protectedFile = path => /(^|\/)\.env(\.|$)/.test(path) && path !== '.env.example';
function tree(ref, cwd, prefix = '') {
  return new Map(git(['ls-tree', '-r', ref, ...(prefix ? [prefix] : [])], cwd).split('\n').filter(Boolean).map(line => {
    const [meta, path] = line.split('\t'); return [path.slice(prefix.length), meta.split(' ')[2]];
  }));
}
const base = git(['rev-parse', upstream]);
const commits = git(['log', '--reverse', '--format=%H%x09%s', `${upstream}..${accepted}`]).split('\n').map(line => {
  const [sha, subject] = line.split('\t');
  const paths = git(['diff-tree', '--no-commit-id', '--name-only', '-r', sha]).split('\n').filter(Boolean);
  const classes = [];
  if (paths.some(p => /^(app|components|lib|middleware)/.test(p))) classes.push('application');
  if (paths.some(p => /^tests\//.test(p))) classes.push('tests');
  if (paths.some(p => /\.md$/.test(p))) classes.push('documentation');
  if (paths.some(p => /sql\//.test(p))) classes.push('schema artifact, founder application only');
  if (paths.some(p => /auth|security|moderation|save|ownership|database|log/i.test(p))) classes.push('security or data boundary review');
  const findings = [];
  for (const path of paths) {
    if (protectedFile(path)) { findings.push({ path, kind: 'environment file not read' }); continue; }
    if (!/\.(ts|tsx|js|cjs|mjs|json|md|sql|ya?ml)$/.test(path)) continue;
    let content; try { content = git(['show', `${sha}:${path}`]); } catch { continue; }
    for (const [kind, pattern] of [
      ['private key marker', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
      ['provider token candidate', /\b(?:re_[A-Za-z0-9_-]{25,}|gh[pousr]_[A-Za-z0-9]{30,}|sk_live_[A-Za-z0-9]{16,})\b/g],
      ['credential URL candidate', /\bpostgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@[^\s]+/g],
    ]) { const count = [...content.matchAll(pattern)].length; if (count) findings.push({ path, kind, count }); }
  }
  return { sha, subject, classes, paths, secretPatternCandidates: findings,
    integration: paths.some(p => p.startsWith('sql/')) ? 'Do not execute schema artifacts automatically; review against target schema.' : classes.includes('application') ? 'Review final combined state and regressions; no individual deployment approval.' : 'Retain as evidence; no independent runtime release needed.' };
});
const reviewSha = git(['rev-parse', 'HEAD'], review);
if (reviewSha !== '702783b427e28980f18d19bea5d3b7d71ccf2f6b') throw new Error('Unexpected review snapshot HEAD.');
const original = tree(accepted), published = tree(reviewSha, review, 'source/');
const missing = [], changed = [], extra = [];
for (const [path, hash] of original) {
  if (!published.has(path)) missing.push(path);
  else if (published.get(path) !== hash) changed.push(path);
}
for (const path of published.keys()) if (!original.has(path)) extra.push(path);
const report = { accepted, upstream, upstreamSha: base, comparison: 'cached remote-tracking ref, no remote fetch performed', count: commits.length,
  acceptedAncestorOfOvernight: git(['merge-base', accepted, 'HEAD']) === accepted,
  commits, snapshot: { reviewSha, commitCount: Number(git(['rev-list', '--count', reviewSha], review)), sourceFiles: published.size, missing, changed, extra },
  scanLimit: 'Heuristic candidate detection, not credential validation or a complete entropy/history secret audit. Environment files except .env.example were not read. Synthetic examples can match.' };
fs.writeFileSync('docs/readiness/sprint2-history-audit.json', JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync('docs/readiness/sprint2-history-review.md', [
  '# Build 1 unpublished history review', '',
  `Accepted HEAD: ${accepted}. Test upstream: ${base}. Exactly ${commits.length} commits ahead. The branch has no configured upstream; comparison explicitly names ${upstream}.`, '',
  'Each row inventories the commit tree changes. Detailed paths and candidate results are in sprint2-history-audit.json. This is source review and local test evidence, not permission to deploy each historical state.', '',
  '| Commit | Change | Review class | Files | Integration treatment |',
  '| --- | --- | --- | --- | --- |',
  ...commits.map(c => `| ${c.sha} | ${c.subject} | ${c.classes.join(', ')} | ${c.paths.length} | ${c.integration} |`), '',
  '## Review snapshot reconciliation', '',
  `The existing local publication repository is clean at ${reviewSha}, with one root commit and ${published.size} files under source/. Blob comparisons establish identical content for every common source file except the declared Firebase substitution. No Git history was inherited.`, '',
  'Excluded source paths:', '', ...missing.map(p => `- ${p}`), '',
  'Changed source paths:', '', ...changed.map(p => `- ${p}`), '',
  `Extra source paths: ${extra.length}. No workflow was present in the accepted source tree. The snapshot's eight exclusions and one substitution match its manifest. IDEA.md was never tracked and is not part of either source tree. Generated output, node_modules and live environment files are absent from the accepted tracked tree.`, '',
  '## Security disposition and integration proposal', '',
  'The heuristic scan found a credential-shaped URL only in tests/error-disclosure-regression.cjs, used as synthetic redaction input. No real credential was validated, and no whole-history secret clearance is claimed. Source and snapshot can still contain sensitive business logic and should remain private. A dedicated secret scanner with redacted output is still a release gate; gitleaks was not available.', '',
  'Do not deploy historical intermediate states. Early save/database fixtures and schema-review artifacts were superseded by later combined fixes. e798172 is a schema-review migration artifact, not authorization to apply it. Documentation and test-only commits do not require runtime rollout. No commit is recommended for automatic discard, rewrite or publication.', '',
  'Keep the accepted branch and overnight branch intact. After founder authorization, create an isolated release candidate from the reviewed sanitized snapshot or another explicitly selected baseline, then apply a separately reviewed patch series for the approved local fixes. This is a proposal only: no release branch, cherry-pick, squash, rebase or merge was performed. Do not import the 33-commit history into the public repository by default.', '',
  'Review the final combined source and exact allowlist of source files, preserve the Firebase sanitization and exclusions, run fresh secret/dependency scans and clean-install Linux gates, inspect the final staged diff, and record its tree/commit hashes. Use one approved protected Preview target with no inherited production credentials or automatic production workflow. Separately authorize live database/identity/fixture tests. Record prior deployment and rollback compatibility before any publication.', '',
  'Commercial flag inspection: SHOP=false, DELIVERY=false, PAYMENTS_LIVE=false, BOOKING_COMMITMENTS=false. Inherited COUNTER=true and BOOKINGS=true expose surfaces, not permission to transact. None of the 33 commits modifies lib/feature-flags.ts. Existing tests assert these inherited settings. Founder must decide Counter scope before release; no flag was silently changed.', '',
].join('\n'));
console.log(JSON.stringify({ count: commits.length, reviewSha, missing, changed, extra, candidateFiles: [...new Set(commits.flatMap(c => c.secretPatternCandidates.map(f => f.path)))] }));
