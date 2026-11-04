// MOBILE-PLAN-04: the package to plan hand. The browser suite proves the journey; this file keeps
// the table honest, because a hand that names a service the catalogue does not carry would send a
// client to Plan holding nothing, which is the bug this whole task exists to close.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    `(function(require,module,exports){${code}\n})`,
    { console, process, Buffer, Date, URL, Response, Headers, crypto: require('node:crypto').webcrypto },
  )((name) => (name in deps ? deps[name] : require(name)), module, module.exports);
  return module.exports;
}

function readSource(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function packageCards(file) {
  const source = readSource(file);
  const start = source.indexOf('const PACKAGES = [');
  const body = source.slice(start, source.indexOf('\n];', start));
  const cards = [];
  // Both screens write the same fields, one per line and one per card, so scan pairs in order and
  // take the first `services` list that follows each pair.
  const pair = /id:\s*"([a-z0-9-]+)",\s*name:\s*"([^"]+)"/g;
  let match;
  while ((match = pair.exec(body))) {
    const services = body.slice(match.index).match(/services:\s*\[([^\]]*)\]/);
    cards.push({ id: match[1], name: match[2], services: services ? services[1] : '' });
  }
  return cards;
}

const catalogue = load('lib/site-data.ts');
const hand = load('lib/package-plan.ts', { '@/lib/site-data': catalogue });
const servedIds = new Set(catalogue.services.map((service) => service.id));

test('every package hand names services the shipped catalogue actually carries', () => {
  const cards = packageCards('components/discover-content.tsx');
  assert.ok(cards.length >= 6, `the Discover packages grid holds ${cards.length} cards`);
  for (const card of cards) {
    const ids = hand.plannablePackageServices(card.id);
    for (const id of ids) {
      assert.ok(servedIds.has(id), `${card.name} hands ${id}, which is not a catalogue service`);
    }
    // A package that shows more than one label has to be plannable, or the button disappears.
    const labels = card.services.split(',').filter(Boolean);
    if (labels.length > 1) assert.ok(ids.length >= 2, `${card.name} shows ${labels.length} inclusions but hands ${ids.length} services`);
  }
});

const DETAIL_IDS = packageCards('app/explore/packages/[id]/page.tsx').map((card) => card.id);
const DISCOVER_IDS = packageCards('components/discover-content.tsx').map((card) => card.id);

test('the hand table covers both package screens with the names those screens print', () => {
  // The loaded module runs in its own context, so compare printed values rather than array identity.
  const named = hand.HANDS.map((entry) => entry.id).sort().join(',');
  assert.equal(named, [...DISCOVER_IDS].sort().join(','), 'the hand table and the Discover grid are on different packages');
  assert.equal(DISCOVER_IDS.join(','), DETAIL_IDS.join(','), 'the Discover grid and the detail route are on different packages');
  for (const card of packageCards('components/discover-content.tsx')) {
    const entry = hand.HANDS.find((item) => item.id === card.id);
    assert.equal(entry.name, card.name, `${card.id} is named "${entry.name}" in the hand and "${card.name}" on the card`);
  }
});

test('a package the catalogue cannot back hands nothing, so the page offers the alternative', () => {
  for (const id of ['seasonal', 'not-a-package', null]) {
    assert.equal(hand.plannablePackageServices(id).length, 0, `${id} handed ${hand.plannablePackageServices(id).join(', ')}`);
  }
});

test('the pills a client reads as the package contents match what Plan is handed', () => {
  // "Locs installation" and "Aftercare guide" are not catalogue services. A card that shows more
  // inclusions than the hand can fill is promising something the plan will not contain, so the two
  // lists have to be the same length on every plannable package, on both package screens.
  for (const file of ['components/discover-content.tsx', 'app/explore/packages/[id]/page.tsx']) {
    for (const card of packageCards(file)) {
      const labels = card.services.split(',').map((label) => label.trim().replace(/"/g, '')).filter(Boolean);
      const ids = hand.plannablePackageServices(card.id);
      if (ids.length) {
        assert.equal(labels.length, ids.length, `${path.basename(file)}: ${card.name} shows ${labels.join(' / ')} but hands ${ids.join(', ')}`);
      } else {
        assert.deepEqual(labels, ['Varies by season'], `${card.name} hands no services, so it has to say the contents are not fixed yet`);
      }
    }
  }
});

test('Plan names the package only when the selection is exactly that package', () => {
  const bridal = hand.plannablePackageServices('bridal');
  assert.ok(bridal.length >= 3, `the bridal hand holds ${bridal.length} services`);
  assert.equal(hand.packageForServiceIds(bridal)?.name, 'Bridal Package');
  assert.equal(hand.packageForServiceIds([...bridal].reverse()).name, 'Bridal Package', 'order must not matter');
  assert.equal(hand.packageForServiceIds(bridal.map((id) => id.toUpperCase())), null, 'an unknown id must not name a package');
  assert.equal(hand.packageForServiceIds([...bridal, 'massage']), null, 'a widened selection is the client plan, not a package');
  assert.equal(hand.packageForServiceIds([]), null);
});
