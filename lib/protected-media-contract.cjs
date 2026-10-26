// Local contract only. No live route, manifest store or Cloudinary adapter is wired.
const { mediaAccess } = require('./pending-media-policy.cjs');
const { performance } = require('node:perf_hooks');
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' };
const fail = status => Response.json({ error: 'Media unavailable.' }, { status, headers });
const scope = actor => JSON.stringify([actor?.userId, actor?.sessionId, actor?.workspaceId, actor?.role]);
function bounded(promise, signal) {
  if (signal.aborted) return Promise.reject(new Error('Media deadline.'));
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('Media deadline.'));
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(value => { signal.removeEventListener('abort', abort); resolve(value); },
      error => { signal.removeEventListener('abort', abort); reject(error); });
  });
}
function eligible(media, actor, now) {
  try {
    return Boolean(actor?.userId && actor?.sessionId && media?.state === 'pending' && mediaAccess(media, actor, now).allowed);
  } catch { return false; }
}
function createPendingMediaHandler({ resolveActor, findManifest, signAuthenticated, fetchAsset, allowedOrigins, now = Date.now, maxBytes = 5 * 1024 * 1024, timeoutMs = 5000 }) {
  if (![resolveActor, findManifest, signAuthenticated, fetchAsset].every(fn => typeof fn === 'function') ||
      !Array.isArray(allowedOrigins) || !allowedOrigins.length || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 5 * 1024 * 1024 ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new Error('Verified media adapters and bounds are required.');
  const origins = new Set(allowedOrigins.map(origin => {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:' || parsed.origin !== origin || parsed.username || parsed.password) throw new Error('Exact HTTPS storage origins are required.');
    return origin;
  }));
  return async function pendingMedia(request, assetId) {
    if (request.method !== 'GET') return Response.json({ error: 'Media unavailable.' }, { status: 405, headers: { ...headers, Allow: 'GET' } });
    if (typeof assetId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(assetId) || request.signal.aborted) return fail(404);
    let reader;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = AbortSignal.any([request.signal, controller.signal]);
    const deadline = performance.now() + timeoutMs;
    try {
      const actor = { ...await bounded(resolveActor(request), signal) };
      const media = { ...await bounded(findManifest(assetId), signal) };
      if (media.assetId !== assetId || !eligible(media, actor, now())) return fail(404);
      const signed = await bounded(signAuthenticated(Object.freeze({ ...media }), { signal }), signal);
      const url = new URL(signed.url);
      if (signed.assetId !== media.assetId || signed.version !== media.version || signed.expiryEnforced !== true ||
          !Number.isFinite(signed.expiresAt) || signed.expiresAt <= now() || signed.expiresAt > media.accessExpiresAt ||
          signed.expiresAt > now() + 300000 || url.protocol !== 'https:' || !origins.has(url.origin) || url.username || url.password || url.hash) return fail(502);
      const upstream = await bounded(fetchAsset(url.href, { redirect: 'error', cache: 'no-store', signal }), signal);
      const type = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      const size = upstream.headers.get('content-length');
      if (upstream.status !== 200 || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(type) ||
          size !== null && (!/^\d+$/.test(size) || Number(size) > maxBytes) || !upstream.body) {
        if (upstream.body) void upstream.body.cancel().catch(() => {}); return fail(502);
      }
      reader = upstream.body.getReader();
      const bytes = Buffer.alloc(maxBytes); let total = 0;
      while (true) {
        signal.throwIfAborted();
        if (performance.now() >= deadline) return fail(502);
        const { value, done } = await bounded(reader.read(), signal);
        if (done) break;
        if (!(value instanceof Uint8Array) || !value.byteLength || total + value.byteLength > maxBytes) return fail(502);
        bytes.set(value, total); total += value.byteLength;
      }
      if (!total || size !== null && total !== Number(size)) return fail(502);
      const [currentActor, currentMedia] = await bounded(Promise.all([resolveActor(request), findManifest(assetId)]), signal);
      if (now() >= signed.expiresAt || currentMedia?.version !== media.version || currentMedia?.assetId !== assetId ||
          currentMedia?.ownerWorkspaceId !== media.ownerWorkspaceId || scope(currentActor) !== scope(actor) ||
          !eligible(currentMedia, currentActor, now())) return fail(404);
      return new Response(bytes.subarray(0, total), { headers: { ...headers, 'Content-Type': type, 'Content-Length': String(total) } });
    } catch { return fail(502); }
    finally { clearTimeout(timer); controller.abort(); if (reader) void reader.cancel().catch(() => {}); }
  };
}
module.exports = { createPendingMediaHandler };
