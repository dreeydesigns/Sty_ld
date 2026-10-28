/**
 * Offline and network-error handling (Client Experience slice).
 *
 * Renders components/connection-notice.tsx as a plain object tree, drives the effect the browser
 * would run, and proves three things: a visitor is told the truth when the connection drops, the
 * notice disappears when it returns, and nothing in this path caches, queues or claims a send.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const SOURCE = 'components/connection-notice.tsx';
const { deliveryClaim } = require('./helpers/delivery-claim.cjs');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, SOURCE), 'utf8');

function element(type, props, ...children) {
  return { type, props: props || {}, children: children.flat() };
}

function render(react) {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React, reactModuleName: 'React', esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  // The component imports its hooks from "react" and emits JSX as React.createElement, so both
  // channels are stubbed: hooks come from the per-test React shim, JSX becomes plain objects.
  const sandboxRequire = name => (name === 'react' ? { useState: react.useState, useEffect: react.useEffect } : require(name));
  const sandbox = {
    React: { createElement: element },
    Object, Array, String, Number, Boolean, JSON, Error, window: react.window,
  };
  vm.runInNewContext('(function(require,module,exports){' + transpiled + '\n})', sandbox)(sandboxRequire, module, module.exports);
  return module.exports.ConnectionNotice();
}

function textOf(node) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  return textOf(node.children);
}

test('a visitor with a connection sees nothing at all', () => {
  const rendered = render({ useState: value => [value, () => {}], useEffect: () => {} });
  assert.equal(rendered, null, 'the notice must not reserve space when the network is fine');
});

test('a lost connection is announced as a status and promises nothing', () => {
  const rendered = render({ useState: () => [true, () => {}], useEffect: () => {} });
  assert.equal(rendered.props.role, 'status', 'assistive tech has to hear it, not see it');
  const copy = textOf(rendered);
  assert.match(copy, /offline/i);
  assert.match(copy, /Nothing has been sent/, 'the notice states the negative, because that is what is true');
  assert.doesNotMatch(copy, deliveryClaim, 'nothing may be claimed as delivered while offline');
  assert.match(copy, /stay where they are/i, 'the honest reading is that the change was not sent');
});

// The same rule the live accessibility audit applies to the notice while a page is open, so the two
// cannot drift apart. One pattern, stated once, with its own cases: a truthful negative ("Nothing
// has been sent") must pass, an unproven perfect ("Your look has been saved") must not.
test('the delivery-claim rule separates a denial from a promise', () => {
  const denials = [
    'You are offline right now. Nothing has been sent, so saved looks, shortlist picks and drafts stay where they are until the connection returns.',
    'Your draft was not saved.',
    'Nothing here has been queued.',
    'The shortlist was never sent.',
  ];
  for (const copy of denials) assert.equal(deliveryClaim.test(copy), false, `${copy} denies a send, it does not claim one`);
  const claims = [
    'Your look has been saved.', 'It was sent.', 'The shortlist is delivered.', 'Payment is confirmed',
    'Your booking was queued.', 'All set, you are good to go.', 'Saved successfully.', "You're done, it is on the way.",
  ];
  for (const copy of claims) assert.equal(deliveryClaim.test(copy), true, `${copy} claims a state no server record proves here`);
});

test('the notice listens for both edges and unsubscribes on cleanup', () => {
  const listeners = [];
  const react = {
    useState: value => [value, () => {}],
    useEffect: fn => {
      const cleanup = fn();
      assert.equal(typeof cleanup, 'function', 'the effect must return a remover or leak listeners on every route');
      cleanup();
    },
    window: {
      addEventListener: (name, handler) => listeners.push([name, handler]),
      removeEventListener: (name, handler) => listeners.push(['removed:' + name, handler]),
    },
  };
  render(react);
  const added = listeners.filter(entry => !entry[0].startsWith('removed:')).map(entry => entry[0]);
  const removed = listeners.filter(entry => entry[0].startsWith('removed:')).map(entry => entry[0].slice(8));
  assert.deepEqual(added, ['offline', 'online']);
  assert.deepEqual(removed, ['offline', 'online'], 'each listener is paired with a removal');
  assert.equal(listeners.length, 4, 'adding and removing are the only window calls');
});

test('only the browser offline event opens the notice, never a self-reported connection', () => {
  const handlers = {};
  let opened = false;
  const react = {
    useState: value => [value, setter => { if (setter === undefined) return; opened = true; }],
    useEffect: fn => { fn(); },
    window: {
      addEventListener: (name, handler) => { handlers[name] = handler; },
      removeEventListener: () => {},
    },
  };
  render(react);
  assert.deepEqual(Object.keys(handlers).sort(), ['offline', 'online']);
  handlers.offline();
  assert.equal(opened, true, 'the offline edge is the trigger');
});

test('the offline path caches nothing, queues nothing and touches no storage', () => {
  assert.doesNotMatch(source, /serviceWorker|caches\.|indexedDB|localStorage|sessionStorage/i, 'no unsafe caching model');
  assert.doesNotMatch(source, /\bfetch\(|XMLHttpRequest|navigator\.sendBeacon/, 'the notice does not retry or queue a send');
  assert.match(source, /navigator\.onLine|window\.addEventListener\("offline"/);
});

test('the shell renders the notice inside main, above page content', () => {
  const shell = fs.readFileSync(path.join(root, 'components/app-shell.tsx'), 'utf8');
  assert.match(shell, /import \{ ConnectionNotice \} from "@\/components\/connection-notice"/);
  const main = shell.slice(shell.indexOf('<main'), shell.indexOf('{children}'));
  assert.ok(main.includes('<ConnectionNotice />'), 'the notice has to be in the shell that 36 routes share');
});
