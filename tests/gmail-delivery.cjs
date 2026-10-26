const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const net = require('node:net');
const ts = require('typescript');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { process, AbortSignal })(
    name => name in deps ? deps[name] : require(name), module, module.exports);
  return module.exports;
}

test('Gmail readiness is explicit and never falls back to another provider', () => {
  const { emailConfigurationReady } = load('lib/auth-readiness.ts');
  assert.equal(emailConfigurationReady({ EMAIL_PROVIDER: 'gmail', RESEND_API_KEY: 'fixture', RESEND_FROM_EMAIL: 'a@example.test' }), false);
  assert.equal(emailConfigurationReady({ EMAIL_PROVIDER: 'gmail', GMAIL_USER: 'a@gmail.com', GMAIL_APP_PASSWORD: 'fixture' }), true);
  assert.equal(emailConfigurationReady({ EMAIL_PROVIDER: 'unknown', RESEND_API_KEY: 'fixture', RESEND_FROM_EMAIL: 'a@example.test' }), false);
});

test('Gmail uses TLS, fixes sender, reports rejection and suppresses SMTP error details', async () => {
  const old = { ...process.env };
  let options, message, opened = 0;
  let response = { accepted: ['a@example.test'], rejected: [], messageId: 'fixture-id' };
  const logs = [];
  try {
    process.env.EMAIL_PROVIDER = 'gmail'; process.env.GMAIL_USER = 'sender@gmail.com';
    delete process.env.GMAIL_APP_PASSWORD;
    const p = load('lib/email-provider.ts', {
      './email-reason': load('lib/email-reason.ts'),
      './logger': { logger: { error: (...args) => logs.push(args) } },
      nodemailer: { createTransport: opts => {
        opened++; options = opts;
        return { sendMail: async msg => { message = msg; if (response instanceof Error) throw response; return response; }, close() {} };
      } },
    });
    const payload = { to: 'a@example.test', subject: 'Fixture', text: '123456', from: 'spoof@example.test' };
    assert.equal((await p.sendEmail(payload)).ok, false);
    assert.equal(opened, 0);
    process.env.GMAIL_APP_PASSWORD = 'fixture password';
    const diagnostics = load('lib/email-diagnostics.ts').emailAndAuthEnvStatus();
    assert.equal(diagnostics.emailServiceConfigured, true);
    assert.equal(diagnostics.email.GMAIL_APP_PASSWORD, true);
    assert.equal(JSON.stringify(diagnostics).includes('fixture password'), false);
    assert.equal((await p.sendEmail(payload)).ok, true);
    assert.equal(options.host, 'smtp.gmail.com'); assert.equal(options.secure, true);
    assert.equal(options.port, 465); assert.equal(options.disableFileAccess, true);
    assert.equal(options.disableUrlAccess, true); assert.equal(options.debug, false);
    assert.equal(message.from.address, 'sender@gmail.com');
    response = { accepted: [], rejected: ['a@example.test'] };
    assert.equal((await p.sendEmail(payload)).ok, false);
    response = new Error('credential fixture password 123456');
    const failure = await p.sendEmail(payload);
    assert.equal(failure.ok, false);
    assert.equal(JSON.stringify([failure, logs]).includes('123456'), false);
    assert.equal(JSON.stringify([failure, logs]).includes('fixture password'), false);
    response.code = 'EAUTH';
    assert.equal((await p.sendEmail(payload)).reasonCode, 'SMTP_AUTH_FAILED');
    assert.equal(load('lib/email-reason.ts').isConfigLevelReason('SMTP_AUTH_FAILED'), true);
    process.env.EMAIL_PROVIDER = 'unknown';
    assert.equal((await p.sendEmail(payload)).ok, false);
  } finally {
    for (const key of ['EMAIL_PROVIDER', 'GMAIL_USER', 'GMAIL_APP_PASSWORD']) {
      if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key];
    }
  }
});

test('Gmail adapter hands a message to a local SMTP fixture, no external mail', async () => {
  let captured = '';
  const server = net.createServer(socket => {
    socket.write('220 fixture ESMTP\r\n');
    let buffer = '', data = false;
    socket.on('data', chunk => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') { data = false; socket.write('250 queued fixture\r\n'); }
          else captured += line + '\n';
        } else if (/^EHLO/.test(line)) socket.write('250 fixture\r\n');
        else if (line === 'DATA') { data = true; socket.write('354 Continue\r\n'); }
        else if (line === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const oldUser = process.env.GMAIL_USER, oldPassword = process.env.GMAIL_APP_PASSWORD;
  try {
    process.env.GMAIL_USER = 'sender@gmail.com'; process.env.GMAIL_APP_PASSWORD = 'fixture-only';
    const p = load('lib/email-provider.ts', {
      './email-reason': load('lib/email-reason.ts'), './logger': { logger: { error() {} } },
      nodemailer: { createTransport: opts => {
        assert.equal(opts.secure, true);
        return require('nodemailer').createTransport({ host: '127.0.0.1', port: server.address().port, secure: false, ignoreTLS: true });
      } },
    });
    assert.equal((await new p.GmailEmailProvider().sendEmail({ to: 'recipient@example.test', subject: 'Local fixture', text: 'Fixture code 123456' })).ok, true);
    assert.match(captured, /Fixture code 123456/);
    assert.match(captured, /sender@gmail.com/);
  } finally {
    if (oldUser === undefined) delete process.env.GMAIL_USER; else process.env.GMAIL_USER = oldUser;
    if (oldPassword === undefined) delete process.env.GMAIL_APP_PASSWORD; else process.env.GMAIL_APP_PASSWORD = oldPassword;
    await new Promise(resolve => server.close(resolve));
  }
});
