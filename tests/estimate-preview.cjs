const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const offer = require('../lib/plan-offer.cjs');
const service = (patch = {}) => ({ id: 'one', name: 'Listed braids', workspaceId: 'provider', providerName: 'Listed professional', price: 2000.25, durationMinutes: 60, modes: ['mobile'], ...patch });
const calculate = (rows, options = {}) => offer.summarizePlanSelection(rows, { kind: 'listed', ...options });

test('listed service arithmetic preserves cents and multiple selections without invented fees', () => {
  const result = calculate([service(), service({ id: 'two', price: 500.5, durationMinutes: null })]);
  assert.equal(result.complete, true); assert.equal(result.knownSubtotalCents, 250075);
  assert.equal(result.lines[0].durationMinutes, 60); assert.equal(result.lines[1].durationMinutes, null);
  assert.equal(result.multipleProviders, false);
  assert.equal(offer.formatListedPrice(result.knownSubtotalCents), new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 2 }).format(2500.75));
  assert.equal(offer.formatListedPrice(200000), new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(2000));
  assert.doesNotMatch(JSON.stringify(result), /travel|tax|discount|fee|availability|confirmed/i);
});

test('missing, malformed and non-finite prices never become fabricated zero or complete totals', () => {
  for (const price of [null, undefined, '', ' ', 'free', '-1', -1, NaN, Infinity, true, [], 1.001, '1e3', '0x10']) {
    const result = calculate([service(), service({ id: 'two', price })]);
    assert.equal(result.complete, false, String(price)); assert.equal(result.lines[1].cents, null);
    assert.equal(offer.formatListedPrice(null), 'Not provided');
  }
  assert.equal(calculate([]).knownSubtotalCents, null);
  assert.equal(calculate([service({ price: null })]).knownSubtotalCents, null);
  assert.equal(calculate([service({ price: 0 })]).lines[0].cents, 0, 'an explicitly listed zero is distinct from missing');
});

test('unavailable services, ownership mismatches, catalogue fallback and missing creator fail closed', () => {
  for (const [row, options] of [[service({ unavailable: true }), {}], [service(), { creatorWorkspaceId: 'another' }], [service({ workspaceId: null, price: 2000 }), {}], [service(), { creatorUnavailable: true }]]) {
    const result = calculate([row], options); assert.equal(result.complete, false); assert.equal(result.lines[0].cents, null); assert.equal(result.lines[0].durationMinutes, null); assert.ok(result.lines[0].problem);
  }
  assert.equal(calculate([service(), service({ id: 'two', workspaceId: 'another' })]).multipleProviders, true);
  assert.throws(() => calculate([service(), service()]), /Invalid/);
  assert.throws(() => calculate(Array.from({ length: 11 }, (_, n) => service({ id: String(n) }))), /Invalid/);
  assert.throws(() => calculate(['one', 'two', 'three'].map((id) => service({ id, price: 40000000000000 }))), /large/);
});

function loadComponent() {
  const module = { exports: {} }, deps = { 'react/jsx-runtime': require('react/jsx-runtime'), react: React,
    'next/image': { default: ({ unoptimized, ...props }) => React.createElement('img', props) },
    'next/link': { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) }, '@/lib/plan-offer.cjs': offer };
  const source = ts.transpileModule(fs.readFileSync('components/plan-estimate.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${source}})`, {})(name => deps[name], module, module.exports);
  return module.exports.PlanEstimate;
}
const Component = loadComponent();
const plan = { schemaVersion: 2, lookPostId: 'look', creatorWorkspaceId: 'provider', serviceIds: ['one'], preferredDate: '2028-02-29', timeWindow: 'morning', serviceMode: 'mobile', locationArea: 'Kilimani', shortlistProviderWorkspaceIds: ['provider'], leadingChoiceProviderWorkspaceId: 'provider' };
const snapshot = (patch = {}) => ({ draft: plan, data: { plan: { ...plan, revision: 2 }, services: [service()], creator: { workspaceId: 'provider', displayName: 'Listed professional' }, look: { postId: 'look', creatorWorkspaceId: 'provider', thumbnailUrl: 'https://mock.test/look.svg' } }, status: 'saved', dirty: false, ...patch });
const render = (props = {}) => renderToStaticMarkup(React.createElement(Component, { snapshot: snapshot(), resolved: true, authenticated: true, failure: '', retry() {}, ...props }));

test('estimate presents current Look, creator and preferences with explicit unknown charges and upcoming stages', () => {
  const html = render();
  for (const text of ['Your selected look', 'Listed professional', 'Listed braids', '60 minutes', '2028-02-29', 'morning', 'mobile', 'Kilimani', 'Unconfirmed', 'Final payable total', 'Not provided', 'Compare', 'Request (Upcoming)', 'Edit my plan', 'Prices and availability are confirmed by the professional.']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/bg-\[var\(--action-primary-bg\)\]/g) || []).length, 1);
  assert.doesNotMatch(html, /href="[^\"]*(Kilimani|2028|provider|look=)/);
  assert.doesNotMatch(html, /<button[^>]*>.*(?:Compare|Request)/);
});

test('missing prices suppress complete subtotal while retaining truthful individual prices', () => {
  const html = render({ snapshot: snapshot({ draft: { ...plan, serviceIds: ['one', 'two'] }, data: { ...snapshot().data, services: [service(), service({ id: 'two', price: null })] } }) });
  assert.match(html, /Listed service subtotal<\/dt><dd[^>]*>Not provided/);
  assert.match(html, /One or more service prices are missing/);
  assert.match(html, /2,000\.25/);
});

test('loading, unauthorized, failed refresh and conflict states do not expose an old estimate', () => {
  for (const props of [{ snapshot: null, resolved: false }, { snapshot: null, authenticated: false }, { failure: 'Offline' }, { snapshot: snapshot({ status: 'error', message: 'Offline' }) }, { snapshot: snapshot({ status: 'conflict' }) }, { snapshot: snapshot({ dirty: true }) }]) {
    const html = render(props); assert.doesNotMatch(html, /Listed braids|Kilimani|2,000\.25/); assert.match(html, /Edit my plan/);
  }
  assert.match(render({ snapshot: null, authenticated: false }), /Sign in to continue/);
  assert.match(render({ failure: 'Offline' }), /Retry estimate/);
});

test('empty and calculation-error states offer recovery and never invent a zero estimate', () => {
  const empty = render({ snapshot: snapshot({ draft: { ...plan, lookPostId: null, creatorWorkspaceId: null, serviceIds: [] } }) });
  assert.match(empty, /No services selected/); assert.doesNotMatch(empty, /Ksh[^<]*0/);
  const broken = render({ snapshot: snapshot({ draft: { ...plan, serviceIds: ['one', 'one'] } }) });
  assert.match(broken, /could not be calculated safely/); assert.match(broken, /Retry estimate/);
});
