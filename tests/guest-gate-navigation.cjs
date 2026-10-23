const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function transpile(file, deps) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${source}})`, {})(name => deps[name], module, module.exports);
  return module.exports;
}
const policy = transpile('lib/auth-policy.ts', {});
function mount(path) {
  const listeners = new Map(), effects = [], states = [], pushes = [];
  let cursor = 0, mounted = false, session = null, storedReturn = null;
  const location = new URL(path, 'https://styld.test');
  const window = { location, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const jsx = (type, props) => ({ type, props });
  const SignIn = () => {}, SignUp = () => {};
  const react = { useEffect: fn => { if (!mounted) effects.push(fn); }, useState: value => {
    const index = cursor++; if (!(index in states)) states[index] = value;
    return [states[index], next => { states[index] = next; }];
  } };
  const code = ts.transpileModule(fs.readFileSync('components/guest-auth-gate.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  const deps = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/navigation': { useRouter: () => ({ push: path => pushes.push(path) }) },
    'framer-motion': { AnimatePresence: 'presence', motion: { div: 'div' } }, 'lucide-react': {}, '@/lib/utils': { cn: () => '' },
    '@/lib/auth-policy': policy, '@/components/role-picker-ui': { SignInRolePicker: SignIn, SignUpRolePicker: SignUp },
    '@/lib/client-session': { APP_SESSION_EVENT: 'session', readAppSession: () => session },
    '@/lib/guest-session': { GUEST_GATE_EVENT: 'gate', recordGuestActivity() {}, clearGuestActivity() {},
      getGuestReturn: () => storedReturn === null ? null : policy.safeReturnTo(storedReturn), clearGuestReturn: () => { storedReturn = null; } } };
  vm.runInNewContext(`(function(require,module,exports){${code}})`, { window })(name => deps[name], module, module.exports);
  function render() { cursor = 0; const tree = module.exports.GuestAuthGate(); if (!mounted) { mounted = true; effects.forEach(fn => fn()); } return tree; }
  function find(tree, type) {
    if (!tree) return null; if (Array.isArray(tree)) return tree.map(child => find(child, type)).find(Boolean);
    if (tree.type === type) return tree.props;
    return find(tree.props?.children, type);
  }
  render();
  return { pushes, location, render, signin: () => find(render(), SignIn),
    gate: (destination = null) => { storedReturn = destination; listeners.get('gate')({ detail: { reason: 'session-expired' } }); },
    hydrate: () => { session = { id: 'verified-display-profile' }; listeners.get('session')(); } };
}

test('hydration and repeated refresh preserve complete Plan handoff without navigation', () => {
  const url = '/book?look=look-id&workspace=workspace-id&serviceIds=one%2Ctwo&targetType=salon&targetId=provider#plan-estimate';
  const app = mount(url);
  for (let n = 0; n < 4; n++) app.hydrate();
  assert.deepEqual(app.pushes, []);
  assert.equal(app.location.pathname + app.location.search + app.location.hash, url);
});

test('real gate captures full current context and same-route authentication does not add history', () => {
  const url = '/book?look=id&workspace=owner&serviceId=service#plan-estimate';
  const app = mount(url); app.gate();
  const picker = app.signin(); assert.equal(picker.returnTo, url);
  app.hydrate(); picker.onSuccess(url); app.hydrate();
  assert.deepEqual(app.pushes, []);
});

test('legitimate authenticated return navigates once and refresh does not repeat it', () => {
  const app = mount('/discover?tab=looks');
  const destination = '/book?look=id&workspace=owner&serviceIds=one%2Ctwo#plan-estimate';
  app.gate(destination); const picker = app.signin();
  assert.equal(picker.returnTo, destination);
  app.hydrate(); picker.onSuccess(destination); app.hydrate(); app.hydrate();
  assert.deepEqual(app.pushes, [destination]);
});

test('external, protocol-relative, script and auth return destinations use existing safe fallback', () => {
  for (const unsafe of ['https://evil.test/book', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/api/plan', '/auth/sign-in', '/book\n//evil.test']) {
    const app = mount('/discover'); app.gate(unsafe); const picker = app.signin();
    assert.equal(picker.returnTo, '/home'); picker.onSuccess(unsafe); assert.deepEqual(app.pushes, ['/home']);
  }
});
