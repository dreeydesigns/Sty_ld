const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    console, process, Buffer, Date, URL, URLSearchParams, Response, Headers, Request,
    ReadableStream, TextEncoder, TextDecoder, AbortController, AbortSignal,
    crypto: require('node:crypto').webcrypto,
  })((name) => (name in deps ? deps[name] : require(name)), module, module.exports);
  return module.exports;
}

const SIGN_IN_PATH = 'http://localhost:3000/api/auth/sign-in/email-otp';

function loadAuthRoute(onPost, securityEvents) {
  return load('app/api/auth/[...all]/route.ts', {
    'better-auth/next-js': {
      toNextJsHandler: () => ({ GET: async () => Response.json({}, { status: 200 }), POST: onPost }),
    },
    '@/lib/better-auth': { auth: {} },
    '@/lib/security-events': { securityEvent: async (...args) => { securityEvents.push(args); } },
    '@/lib/auth-readiness': { authConfigurationReady: () => true, emailConfigurationReady: () => true },
  });
}

function signInRequest() {
  return new Request(SIGN_IN_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'session=abc123' },
    body: JSON.stringify({ email: 'otp@example.test', otp: '123456' }),
  });
}

test('a database timeout during email sign-in returns a retryable 503, not an unhandled 500', async () => {
  const securityEvents = [];
  const route = loadAuthRoute(async () => {
    const timeout = new AggregateError([], 'connect ETIMEDOUT');
    timeout.code = 'ETIMEDOUT';
    throw timeout;
  }, securityEvents);

  const response = await route.POST(signInRequest());
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.code, 'SERVICE_UNAVAILABLE');
  assert.match(body.message, /try again/i);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(
    securityEvents.filter((entry) => entry[0] === 'login_failed').length,
    0,
    'an infrastructure failure must never be recorded as a failed login',
  );
});

test('any unexpected auth handler failure answers with JSON instead of an HTML 500', async () => {
  const securityEvents = [];
  const route = loadAuthRoute(async () => { throw new Error('connection terminated unexpectedly'); }, securityEvents);

  const response = await route.POST(signInRequest());

  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'SERVICE_UNAVAILABLE');
  assert.equal(securityEvents.length, 0);
});

test('a successful email sign-in response still passes through with the browser cookie', async () => {
  const securityEvents = [];
  const route = loadAuthRoute(async () => Response.json({ token: 'session-token', user: { id: 'user-1' } }, { status: 200 }), securityEvents);

  const response = await route.POST(signInRequest());
  const setCookie = response.headers.get('set-cookie') || '';

  assert.equal(response.status, 200);
  assert.match(setCookie, /styld_browser=[0-9a-f-]{36}/i);
  assert.equal(securityEvents.filter((entry) => entry[0] === 'login_failed').length, 0);
});

test('server and infrastructure failures are never described to the person as a bad code', () => {
  const { uiMessageForVerifyError } = load('lib/email-reason.ts');
  const badCodeMessage = 'Check your code and try again.';

  const cases = [
    [{ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'We could not complete that request right now. Please try again in a moment.' }],
    [{ status: 500 }],
    [{ status: 0, message: 'Failed to fetch' }],
    [null],
  ];
  for (const [error] of cases) {
    const rendered = uiMessageForVerifyError(error);
    if (error) {
      assert.notEqual(rendered, badCodeMessage, 'infra failures need their own message: ' + JSON.stringify(error));
      assert.match(rendered, /try again|unavailable/i);
    }
  }

  assert.equal(uiMessageForVerifyError({ status: 400, message: 'INVALID_OTP' }), 'That code did not match. Check the latest email and try again.');
  assert.equal(uiMessageForVerifyError({ status: 400 }), 'That code did not match. Check the latest email and try again.');
  assert.equal(uiMessageForVerifyError({ status: 400, message: 'OTP_EXPIRED' }), 'That code has expired. Request a new one.');
  assert.equal(uiMessageForVerifyError({ status: 403, message: 'TOO_MANY_ATTEMPTS' }), 'Too many attempts. Request a new code.');
  assert.equal(uiMessageForVerifyError({ status: 429, message: 'Rate limit exceeded' }), 'Too many attempts. Request a new code.');
});

test('the sign-in screen reports verification failures through the shared message mapper', () => {
  const flow = fs.readFileSync(path.join(__dirname, '..', 'components/auth/unified-auth-flow.tsx'), 'utf8');
  assert.match(flow, /uiMessageForVerifyError\(error\)/);
  assert.doesNotMatch(flow, /error\.message\|\|'Check your code and try again\.'/);

  const authRoute = fs.readFileSync(path.join(__dirname, '..', 'app/api/auth/[...all]/route.ts'), 'utf8');
  assert.match(authRoute, /SERVICE_UNAVAILABLE/);
  assert.match(authRoute, /catch \(error\)/);
});
