/**
 * Provider listing truth suite.
 *
 * A public profile exists only when the server record says so: identity_workspaces.profile carries
 * publicDiscoveryEnabled and lib/public-discovery.ts also demands an approved application. Two ways
 * that boundary used to leak into the interface are pinned closed here: browser storage that carried
 * a listing flag UI could render as a claim, and links that still aimed at catalogue pages the
 * privacy change retired to notFound().
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sourceDirs = ['app', 'components', 'lib'];

function relative(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function sources() {
  const found = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:ts|tsx)$/.test(entry.name)) found.push(full);
    }
  };
  for (const dir of sourceDirs) walk(path.join(root, dir));
  return found.sort((a, b) => relative(a).localeCompare(relative(b)));
}

const read = (file) => fs.readFileSync(file, 'utf8');

// The pages that answered a catalogue profile now refuse, so a link to one is a 404 for a client.
const retiredRoutes = [
  'app/professionals/[slug]/page.tsx',
  'app/professionals/preview/page.tsx',
  'app/salons/[slug]/page.tsx',
  'app/u/[id]/page.tsx',
  'app/[collection]/[slug]/page.tsx',
];

test('every retired profile route still refuses to render and stays out of the index', () => {
  for (const file of retiredRoutes) {
    const source = read(path.join(root, file));
    assert.match(source, /notFound\(\)/, `${file} must answer notFound, not a half-built profile`);
    assert.match(source, /index: false/, `${file} must not be offered to a crawler`);
    assert.doesNotMatch(source, /authPool|readPublicDiscovery/, `${file} must not read provider records again`);
  }
});

test('nothing a client can reach links at a retired profile route', () => {
  const linkPattern = /[`"']\/(?:professionals|salons)\/|[`"']\/u\//;
  const exportedNames = new Set();
  for (const file of sources()) {
    for (const statement of read(file).matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']@\/[^"']+["']/g)) {
      for (const clause of statement[1].split(',')) {
        const name = clause.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (name) exportedNames.add(name);
      }
    }
  }

  const offenders = [];
  for (const file of sources()) {
    const lines = read(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!linkPattern.test(line)) return;
      // An export nobody imports cannot be rendered, so it is not a dead link a client can follow.
      let enclosing = null;
      for (let cursor = index; cursor >= 0 && !enclosing; cursor -= 1) {
        const declaration = /^\s*export\s+(?:async\s+)?(?:default\s+)?(?:function|const|class)\s+(\w+)/.exec(lines[cursor]);
        if (declaration) enclosing = declaration[1];
      }
      if (relative(file).startsWith('app/') || (enclosing && exportedNames.has(enclosing))) {
        offenders.push(`${relative(file)}:${index + 1}${enclosing ? ` in ${enclosing}` : ' at module top level'}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `retired profile addresses are 404s, so no reachable surface may link to them:\n${offenders.join('\n')}`);
});

test('no source file carries a browser-side listing flag', () => {
  const carriers = sources().filter((file) => /\blistingPublished\b/.test(read(file))).map(relative);
  assert.deepEqual(carriers, [], 'listing state comes from /api/providers/publication, never from browser storage');
});

test('the provider profile reads the server answer before it calls a listing public', () => {
  const profile = read(path.join(root, 'components/role-profile-workspace.tsx'));
  assert.match(profile, /<ProviderPublicationControl[^>]*onState=/s, 'the page must take the state the control loaded');
  assert.match(profile, /publication\.enabled/, 'public affordances are gated on the server answer');
  assert.match(profile, /Listing status unavailable|listing status could not be read/i, 'an unreadable listing is reported, not guessed');

  const control = read(path.join(root, 'components/provider-publication-control.tsx'));
  assert.match(control, /fetch\('\/api\/providers\/publication', \{ cache: 'no-store'/, 'the listing state is fetched, not assumed');
  assert.match(control, /method: 'PATCH'/, 'the toggle writes through the same endpoint the gate reads');

  const salonWorkspace = read(path.join(root, 'components/salon-workspace.tsx'));
  assert.doesNotMatch(salonWorkspace, /listingPublished/i, 'the salon workspace shows no listing claim it cannot prove');
});

test('client onboarding offers no sample providers and no dead profile links', () => {
  const signup = read(path.join(root, 'components/client-signup-flow.tsx'));
  assert.doesNotMatch(signup, /@\/lib\/site-data/, 'onboarding must not pull the seed catalogue');
  assert.doesNotMatch(signup, /rankProfessionals/, 'onboarding must not rank providers it cannot list');
  assert.match(signup, /href="\/discover"/, 'onboarding sends the client to the live discovery surface');
  assert.doesNotMatch(signup, /from day one|all Nairobi professionals/i, 'no promise of a feed the server cannot fill');
});
