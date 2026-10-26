// Actual application modules, actual Better Auth, synthetic SQL and captured mail only.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createRequire } = require('node:module');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomBytes } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const base = 'http://localhost:3107';

async function applicationHarness(pool) {
  const { betterAuth, APIError } = await import('better-auth');
  const { emailOTP } = await import('better-auth/plugins');
  const { createAuthMiddleware } = await import('better-auth/api');
  const requestContext = new AsyncLocalStorage(), cache = new Map(), inbox = new Map();
  const environment = { NODE_ENV: 'test', BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    MFA_SECRET_KEY: randomBytes(32).toString('hex'), RESEND_API_KEY: 'local', RESEND_FROM_EMAIL: 'STYLD Local <login@example.test>' };
  let actualAuth, collecting = true, deliveryMode = 'ok', diagnosticCount = 0;
  const NextResponse = { json: (body, init = {}) => Response.json(body, init) };
  const quietConsole = { ...console, error: () => { diagnosticCount++; }, warn: () => { diagnosticCount++; } };
  async function capturedFetch(url, options) {
    if (url !== 'https://api.resend.com/emails') throw new Error('Unexpected test transport destination.');
    if (deliveryMode === 'timeout') throw Object.assign(new Error('Local transport timeout'), { name: 'TimeoutError' });
    if (deliveryMode === 'network') throw new TypeError('Local transport interruption');
    if (deliveryMode === '403') return Response.json({ name: 'validation_error', message: 'You can only send testing emails to your own email address.' }, { status: 403 });
    if (deliveryMode === '429') return Response.json({ name: 'rate_limit_exceeded', message: 'Local provider rate limit.' }, { status: 429 });
    const payload = JSON.parse(options.body);
    for (const email of payload.to) inbox.set(email.toLowerCase(), payload);
    return Response.json({ id: 'local-captured-message' });
  }
  function load(relative) {
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !/\.(ts|cjs)$/.test(file)) throw new Error('Invalid application module.');
    if (relative === 'lib/auth-database.ts') return { authPool: pool };
    if (relative === 'lib/better-auth.ts' && actualAuth) return { auth: actualAuth };
    if (relative === 'lib/logger.ts') return { logger: { info() {}, debug() {}, warn() { diagnosticCount++; }, error() { diagnosticCount++; } } };
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.cjs')) return require(file);
    const module = { exports: {} }; cache.set(file, module);
    const nativeRequire = createRequire(file);
    const requireModule = name => {
      if (name === 'next/server') return { NextResponse };
      if (name === 'next/headers') return { headers: async () => requestContext.getStore()?.headers || new Headers() };
      if (collecting && name === 'better-auth') return { APIError, betterAuth: config => config };
      if (collecting && name === 'better-auth/plugins') return { emailOTP: config => config };
      if (collecting && name === 'better-auth/api') return { createAuthMiddleware: fn => fn };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const target = name.startsWith('@/') ? name.slice(2) : path.relative(root, path.resolve(path.dirname(file), name)).replaceAll('\\', '/');
        for (const suffix of ['', '.ts', '.cjs']) if (fs.existsSync(path.join(root, target + suffix)) && fs.statSync(path.join(root, target + suffix)).isFile()) return load(target + suffix);
      }
      return nativeRequire(name);
    };
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(`(function(require,module,exports){${code}})`, { URL, Request, Response, Headers, Date, Buffer, Set, Map,
      process: { env: environment }, console: quietConsole, fetch: capturedFetch, AbortSignal, AbortController, setTimeout, clearTimeout })(requireModule, module, module.exports);
    return module.exports;
  }
  const config = load('lib/better-auth.ts').auth;
  config.hooks.before = createAuthMiddleware(config.hooks.before);
  config.plugins[1] = emailOTP(config.plugins[1]);
  actualAuth = betterAuth(config); collecting = false;
  const authRequest = (endpoint, body, cookie) => actualAuth.handler(new Request(base + '/api/auth/' + endpoint, {
    method: body ? 'POST' : 'GET', headers: { origin: base, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) }));
  const cookieFrom = response => (response.headers.getSetCookie?.() || []).map(value => value.split(';')[0]).join('; ');
  const codeFor = email => {
    const code = inbox.get(email.toLowerCase())?.text?.match(/^([0-9]{6}) /)?.[1];
    if (!code) throw new Error('Local generated OTP was not captured.');
    return code;
  };
  const call = (relative, method, requestPath, cookie, body, extraHeaders = {}, params = {}) => {
    const headers = new Headers({ origin: base, ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...extraHeaders });
    const request = new Request(base + requestPath, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    return requestContext.run({ headers }, () => load(relative)[method](request, { params: Promise.resolve(params) }));
  };
  return { load, authRequest, codeFor, cookieFrom, call, setDelivery: mode => { deliveryMode = mode; },
    diagnostics: () => diagnosticCount, inRequest: (cookie, fn) => requestContext.run({ headers: new Headers(cookie ? { cookie } : {}) }, fn) };
}
module.exports = { applicationHarness, base };
