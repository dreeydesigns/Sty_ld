/**
 * Error disclosure regression suite (internal stabilization).
 *
 * 1. Source guard: reachable API routes and active lib modules never pass raw
 *    error objects, error messages or provider payload text to console output.
 *    They log only a name and driver code classification, the accepted
 *    GET /api/me pattern.
 * 2. Behavioral: sanitizeLogData keeps database hosts, SQL text, connection
 *    strings and personal data out of log output.
 * 3. Behavioral: authError answers a generic 500 and logs a classification only.
 * 4. Behavioral: a reachable route survives a driver failure with a static
 *    response body and sanitized server-side logs.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function loadTs(file, dependencies = {}, sandboxExtras = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }
  ).outputText;

  const moduleObj = { exports: {} };
  const sandbox = {
    console,
    process,
    Buffer,
    URL,
    URLSearchParams,
    AbortSignal,
    ...sandboxExtras,
  };

  vm.runInNewContext(
    `(function(require, module, exports) { ${source}\n})`,
    sandbox
  )(
    (name) => {
      if (Object.prototype.hasOwnProperty.call(dependencies, name)) {
        return dependencies[name];
      }
      return require(name);
    },
    moduleObj,
    moduleObj.exports
  );

  return moduleObj.exports;
}

const DORMANT_LIB = new Set([
  'lib/db.ts',
  'lib/firebase.ts',
  'lib/sms.ts',
  'lib/payment-provider.ts',
  'lib/otp-provider.ts',
  'lib/whatsapp-provider.ts',
  'lib/middleware-multi-role.ts',
  'lib/test-multi-role-scenarios.tsx',
]);

function walk(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(__dirname, '..', dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...walk(rel, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(rel);
    }
  }
  return out;
}

// lib/logger.ts is self contained, so it loads in the test realm. This keeps
// instanceof Error checks intact for objects created by the test itself.
function loadLogger() {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', 'lib/logger.ts'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }
  ).outputText;
  const moduleObj = { exports: {} };
  const factory = new Function('module', 'exports', 'require', source);
  factory(moduleObj, moduleObj.exports, (name) => {
    throw new Error(`logger must stay self contained, found import of ${name}`);
  });
  return moduleObj.exports;
}

const RAW_CONSOLE_PATTERNS = [
  {
    name: 'raw error identifier as a console argument',
    regex: /console\.(?:error|warn)\([^;]*?,\s*(?:error|err|e|rateLimitErr|dbErr|failure|cause|exception)\s*[,)]/g,
  },
  {
    name: 'raw error passed alone to console',
    regex: /console\.(?:error|warn)\(\s*(?:error|err|e|rateLimitErr|dbErr|failure|cause|exception)\s*\)/g,
  },
  {
    name: 'error.message printed to console',
    regex: /console\.(?:error|warn)\([^;]*\.message/g,
  },
  {
    name: 'String(error) style detail printed to console',
    regex: /console\.(?:error|warn)\([^;]*String\(\s*(?:error|err|e|dbErr|rateLimitErr)\s*\)/g,
  },
  {
    name: 'raw message interpolation printed to console',
    regex: /console\.(?:error|warn)\([^;]*\$\{(?:error|err|e|msg|errorMsg|errorDesc|reasonCode)\}/g,
  },
];

test('reachable API routes and active lib modules never log raw error objects', () => {
  const files = [
    ...walk('app/api', ['.ts']),
    ...walk('lib', ['.ts', '.tsx']).filter((file) => !DORMANT_LIB.has(file)),
  ];

  assert.ok(files.length > 40, 'guard must scan the API surface');

  const offenders = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    for (const { name, regex } of RAW_CONSOLE_PATTERNS) {
      const matches = source.match(new RegExp(regex.source, 'g'));
      if (matches) {
        offenders.push(`${file}: ${name}: ${matches[0].replace(/\s+/g, ' ').slice(0, 120)}`);
      }
    }
  }

  assert.deepEqual(offenders, [], `raw error logging found:\n${offenders.join('\n')}`);
});

test('sanitizeLogData redacts connection strings, masks emails and drops error messages', () => {
  const logger = loadLogger();

  const connection = logger.sanitizeLogData(
    'connect failed postgres://styld_qa_owner:npg_password@ep-jane.c-xx.aws.neon.tech/neondb'
  );
  assert.doesNotMatch(String(connection), /npg_password|ep-jane|neon\.tech/);

  const emailed = logger.sanitizeLogData('provider said amina.njeri@example.test is unverified');
  assert.doesNotMatch(String(emailed), /amina\.njeri@example\.test/);
  assert.match(String(emailed), /a\*\*\*@example\.test/);

  const driverError = Object.assign(new Error('getaddrinfo ENOTFOUND ep-jane.c-xx.aws.neon.tech'), {
    code: 'ENOTFOUND',
    stack: 'Error: getaddrinfo ENOTFOUND ep-jane.c-xx.aws.neon.tech\n    at Object.<anonymous> (lib/db.ts:1:1)',
  });
  const cleaned = logger.sanitizeLogData(driverError);
  const serialized = JSON.stringify(cleaned);
  assert.doesNotMatch(serialized, /ENOTFOUND ep-jane|getaddrinfo/);
  assert.equal(cleaned.name, 'Error');
  assert.equal(cleaned.code, 'ENOTFOUND');
});

test('logger.error output never contains driver detail from an Error argument', () => {
  const loggerModule = loadLogger();
  const lines = [];
  const originalError = console.error;
  console.error = (...args) => lines.push(args.map(String).join(' '));

  try {
    const secret = 'connect ENOTFOUND ep-jane.c-xx.aws.neon.tech port 5432';
    loggerModule.logger.error('database operation failed', Object.assign(new Error(secret), { code: 'ENOTFOUND' }));
  } finally {
    console.error = originalError;
  }

  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /ep-jane|getaddrinfo/);
  assert.match(lines[0], /Error/);
  assert.match(lines[0], /ENOTFOUND/);
});

test('authError returns a generic 500 and logs only a classification', () => {
  const lines = [];
  const AuthError = class AuthError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  };

  const apiSecurity = loadTs('lib/api-security.ts', {
    'next/server': {
      NextResponse: {
        json: (body, init = {}) => ({ status: init.status || 200, body }),
      },
    },
    './auth-resolver': { AuthError },
  }, {
    console: {
      log: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
      error: (...args) => lines.push(args.map(String).join(' ')),
    },
  });

  const internal = Object.assign(new Error('password=hunter2 connection refused at ep-jane.c-xx.aws.neon.tech'), {
    code: 'ECONNREFUSED',
  });
  const response = apiSecurity.authError(internal);

  assert.equal(response.status, 500);
  assert.equal(response.body.error, 'Unable to complete this request.');
  assert.doesNotMatch(JSON.stringify(response.body), /hunter2|ep-jane|refused/);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Security operation failed/);
  assert.match(lines[0], /Error \(ECONNREFUSED\)/);
  assert.doesNotMatch(lines[0], /hunter2|ep-jane/);

  lines.length = 0;
  const denied = apiSecurity.authError(new AuthError('Sign in to continue.', 401));
  assert.equal(denied.status, 401);
  assert.equal(denied.body.error, 'Sign in to continue.');
  assert.equal(lines.length, 0, 'intentional AuthError responses need no failure log');
});

test('contact route answers statically and logs a classification on a driver failure', async () => {
  const logs = { error: [], warn: [] };
  const driverError = Object.assign(
    new Error('getaddrinfo ENOTFOUND ep-jane.c-xx.aws.neon.tech'),
    { code: 'ENOTFOUND' }
  );

  const route = loadTs('app/api/contact/route.ts', {
    'next/server': {
      NextRequest: class {},
      NextResponse: {
        json: (body, init = {}) => ({ status: init.status || 200, body }),
      },
    },
    '@/lib/auth-database': {
      authPool: {
        query: async () => {
          throw driverError;
        },
      },
    },
    '@/lib/email-provider': {
      sendContactNotification: async () => ({ ok: true }),
    },
  }, {
    console: {
      log: () => {},
      info: () => {},
      debug: () => {},
      warn: (...args) => logs.warn.push(args.map(String).join(' ')),
      error: (...args) => logs.error.push(args.map(String).join(' ')),
    },
  });

  const request = {
    headers: { get: () => null },
    json: async () => ({ name: 'Amina', message: 'Hello from QA' }),
  };
  const response = await route.POST(request);

  assert.equal(response.status, 500);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error, 'Failed to send message. Please try again later.');
  assert.doesNotMatch(JSON.stringify(response.body), /ENOTFOUND|ep-jane|getaddrinfo/);

  const allLogs = [...logs.error, ...logs.warn].join('\n');
  assert.doesNotMatch(allLogs, /ep-jane|getaddrinfo|aws\.neon/);
  assert.match(allLogs, /Error \(ENOTFOUND\)/);
  assert.equal(logs.error.length, 1, 'the outer failure must still be logged once');
  assert.equal(logs.warn.length, 1, 'the rate limit skip must still be logged once');
});
