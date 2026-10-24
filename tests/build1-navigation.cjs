const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => dependencies[name] || require(name), module, module.exports);
  return module.exports;
}
test('public Look trail restores source, feed depth and scroll without private state', () => {
  const store = new Map();
  global.sessionStorage = { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) };
  global.location = { pathname: '/discover', search: '?tab=looks&q=braids&chip=Braids' };
  global.window = { scrollY: 8300 };
  global.document = { querySelectorAll: () => Array(24) };
  const nav = load('lib/look-navigation.ts', { react: {} });
  nav.rememberLookOrigin('/looks/00000000-0000-4000-8000-000000000031');
  assert.deepEqual(nav.discoverPosition('/discover?tab=looks&q=braids&chip=Braids'), { y: 8300, shown: 24 });
  const record = JSON.parse([...store.values()][0]);
  assert.equal(Object.values(record.origins)[0], '/discover?tab=looks&q=braids&chip=Braids');
  assert.deepEqual(Object.keys(record).sort(), ['feeds', 'origins']);
  location.pathname = '/looks/00000000-0000-4000-8000-000000000031'; location.search = '';
  nav.rememberLookOrigin('/creators/00000000-0000-4000-8000-000000000011');
  location.pathname = '/creators/00000000-0000-4000-8000-000000000011';
  nav.rememberLookOrigin('/looks/00000000-0000-4000-8000-000000000031');
  assert.equal(JSON.parse([...store.values()][0]).origins['/looks/00000000-0000-4000-8000-000000000031'], '/discover?tab=looks&q=braids&chip=Braids', 'creator return cannot create a Back loop');
  const before = [...store.values()][0];
  nav.rememberLookOrigin('//evil.test');
  location.pathname = '/book'; location.search = '?view=estimate';
  nav.rememberLookOrigin('/looks/00000000-0000-4000-8000-000000000031');
  assert.equal([...store.values()][0], before);
  store.set([...store.keys()][0], '{invalid');
  assert.equal(nav.discoverPosition('/discover'), null);
  sessionStorage.setItem = () => { throw new Error('storage blocked'); };
  location.pathname = '/discover'; location.search = '';
  assert.doesNotThrow(() => nav.rememberLookOrigin('/looks/abc'));
});
test('missing, malformed and fractional service prices cannot become a free Look', () => {
  const feed = load('lib/social-feed.ts', { '@/lib/plan-offer.cjs': require('../lib/plan-offer.cjs') });
  for (const price of [null, undefined, '', ' ', false, -1, 'unknown', 1.001]) {
    assert.equal(feed.summarizeServiceRows([{ id: 'service', name: 'Braids', price }]).get('service').price, null);
  }
  const services = feed.summarizeServiceRows([{ id: 'service', name: 'Braids', price: null }]);
  const item = feed.toInspireItem({ id: 'post', look: { serviceId: 'service', authorWorkspaceId: 'creator' } }, services);
  assert.equal(item.service.id, 'service', 'unknown price retains the canonical Plan handoff');
  assert.equal(item.startingPrice, null);
  assert.equal(feed.summarizeServiceRows([{ id: 'service', name: 'Braids', price: '2000.50' }]).get('service').price, 2000.5);
  assert.equal(feed.summarizeServiceRows([{ id: 'service', name: 'Braids', price: 0 }]).get('service').price, 0);
});
