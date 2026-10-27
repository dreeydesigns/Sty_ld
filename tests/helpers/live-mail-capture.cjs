// Loopback stand-in for the Resend HTTP API. The application still makes a real
// outbound request through its own provider; only the external vendor is replaced.
// Codes and addresses are held in memory and never printed.
const http = require('node:http');

async function startMailCapture() {
  const messages = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method !== 'POST' || url.pathname !== '/emails') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end('{"name":"not_found"}');
      request.destroy();
      return;
    }
    if (!/^Bearer\s+\S+/.test(String(request.headers.authorization || ''))) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end('{"name":"unauthorized","message":"Missing bearer token."}');
      return;
    }
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 65536) { request.destroy(); }
    });
    request.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch {
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end('{"name":"validation_error","message":"Invalid JSON."}');
        return;
      }
      const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
      if (!recipients.every(email => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email)))) {
        // Mirrors the vendor response that the provider classifies as a sender error.
        response.writeHead(403, { 'content-type': 'application/json' });
        response.end('{"name":"validation_error","message":"You can only send testing emails to your own email address."}');
        return;
      }
      messages.push({ at: Date.now(), from: payload.from, to: recipients, subject: payload.subject, text: payload.text, html: payload.html });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ id: `live-captured-${messages.length}` }));
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  const codeFor = email => {
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index];
      if (message.to.some(recipient => String(recipient).toLowerCase() === String(email).toLowerCase())) {
        const code = String(message.text || '').match(/^([0-9]{6}) /);
        if (code) return code[1];
      }
    }
    throw new Error('No verification code was captured for this recipient.');
  };
  const waitForCode = async (email, timeoutMs = 15000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try { return codeFor(email); } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    throw new Error('No verification code was captured before the deadline.');
  };
  return { apiUrl: `http://127.0.0.1:${port}/emails`, messages, codeFor, waitForCode,
    stop: () => new Promise(resolve => server.close(resolve)) };
}

module.exports = { startMailCapture };
