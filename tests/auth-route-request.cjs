const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    console, process, Buffer, Date, URL, URLSearchParams, Response, Headers, Request,
    ReadableStream, TextEncoder, TextDecoder, AbortController, AbortSignal,
    crypto: require('node:crypto').webcrypto,
  })((name) => (name in deps ? deps[name] : require(name)), module, module.exports);
  return module.exports;
}

function loadRoute(onRequest) {
  return load('app/api/auth/[...all]/route.ts', {
    'better-auth/next-js': { toNextJsHandler: () => ({ GET: onRequest, POST: onRequest }) },
    '@/lib/better-auth': { auth: {} },
    '@/lib/security-events': { securityEvent: async () => {} },
    '@/lib/auth-readiness': { authConfigurationReady: () => true, emailConfigurationReady: () => true },
  });
}

const URL_PATH = 'http://localhost:3000/api/auth/email-otp/send-verification-otp';

test('missing auth configuration returns a safe 503 before auth initialization', async () => {
  const route = load('app/api/auth/[...all]/route.ts', {
    'better-auth/next-js': {},
    '@/lib/security-events': {},
    '@/lib/auth-readiness': { authConfigurationReady: () => false },
  });
  const response = await route.POST(new Request(URL_PATH, {method:'POST'}));
  assert.equal(response.status,503);
  assert.equal((await response.json()).code,'AUTH_NOT_CONFIGURED');
  assert.equal(response.headers.get('cache-control'),'no-store');
});

test('missing sender configuration never starts an OTP request', async () => {
  const route = load('app/api/auth/[...all]/route.ts', {
    'better-auth/next-js': {},
    '@/lib/security-events': {},
    '@/lib/auth-readiness': { authConfigurationReady: () => true, emailConfigurationReady: () => false },
  });
  const response = await route.POST(new Request(URL_PATH, {method:'POST'}));
  assert.equal(response.status,503);
  assert.equal((await response.json()).code,'EMAIL_NOT_CONFIGURED');
});

test('auth route rebuilds a plain Request, preserving method, cookies and body', async () => {
  let seen = null;
  const route = loadRoute(async (input) => { seen = input; return new Response('ok', { status: 200 }); });
  const body = JSON.stringify({ email: 'otp@example.test', type: 'sign-in' });
  const incoming = new Request(URL_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'session=abc123' },
    body,
  });

  const response = await route.POST(incoming);

  assert.equal(response.status, 200);
  assert.ok(seen instanceof Request, 'handler receives a real Fetch Request');
  assert.equal(seen.method, 'POST');
  assert.equal(seen.url, URL_PATH);
  assert.match(seen.headers.get('cookie'), /session=abc123/);
  assert.match(seen.headers.get('cookie'), /styld_browser=[0-9a-f-]{36}/i);
  assert.equal(await seen.text(), body, 'OTP request body is preserved');
  assert.match(response.headers.get('set-cookie') || '', /styld_browser=/);
});

test('auth route never passes the incoming request object into the Request constructor', async () => {
  // A request-like object that is not a branded Request reproduces the class of
  // failure seen in bundled runtimes: `new Request(request, ...)` throws
  // (TypeError: Cannot read private member #state / Failed to parse URL). The
  // route must rebuild from request.url, request.method, headers and body.
  let seen = null;
  const route = loadRoute(async (input) => { seen = input; return new Response('ok', { status: 200 }); });
  const body = JSON.stringify({ email: 'brand@example.test', type: 'sign-in' });
  const incoming = {
    url: URL_PATH,
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', cookie: 'session=xyz' }),
    signal: new AbortController().signal,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };

  const response = await route.POST(incoming);

  assert.equal(response.status, 200);
  assert.ok(seen instanceof Request);
  assert.equal(seen.method, 'POST');
  assert.equal(seen.url, URL_PATH);
  assert.match(seen.headers.get('cookie'), /styld_browser=[0-9a-f-]{36}/i);
  assert.equal(await seen.text(), body);
});

test('auth route does not send a body for GET requests', async () => {
  let seen = null;
  const route = loadRoute(async (input) => { seen = input; return new Response('{}', { status: 200 }); });
  const incoming = new Request(URL_PATH, { method: 'GET', headers: { cookie: 'session=get' } });

  const response = await route.GET(incoming);

  assert.equal(response.status, 200);
  assert.equal(seen.method, 'GET');
  assert.equal(seen.body, null);
});
