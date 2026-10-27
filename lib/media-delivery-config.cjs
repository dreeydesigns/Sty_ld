// Pure configuration gate for restricted media delivery. It reads an environment
// record and answers one question: is every fact the proxy depends on actually
// present? Anything missing means the feature reports itself as not configured,
// because a pending upload must never be served on an assumption.
//
// The returned object deliberately carries no credential value, so a route can log
// or assert on it without any risk of printing a secret.

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function exactHttpsOrigin(value) {
  const candidate = clean(value);
  if (!candidate) return null;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
  return parsed.origin;
}

function positiveBoundedInteger(value, fallback, maximum) {
  if (value === undefined || value === null || clean(value) === '') return fallback;
  const raw = clean(value);
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return parsed;
}

// An access window longer than five minutes would outlive the bound the delivery
// policy was written against, so the configured ceiling cannot exceed it.
const MAX_WINDOW_SECONDS = 300;

function resolveMediaDeliveryConfig(env = {}) {
  if (clean(env.STYLD_RESTRICTED_MEDIA_ENABLED).toLowerCase() !== 'true') return null;
  const cloudName = clean(env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  if (!cloudName || !/^[A-Za-z0-9_.-]{1,100}$/.test(cloudName)) return null;
  if (!clean(env.CLOUDINARY_API_KEY) || !clean(env.CLOUDINARY_API_SECRET)) return null;
  if (!clean(env.CLOUDINARY_SIGN_KEY)) return null;
  const configured = clean(env.STYLD_MEDIA_ALLOWED_ORIGINS);
  if (!configured) return null;
  const origins = [];
  for (const entry of configured.split(',')) {
    if (!clean(entry)) return null;
    const origin = exactHttpsOrigin(entry);
    if (!origin || origins.includes(origin)) return null;
    origins.push(origin);
  }
  // One delivery domain, because every signed URL is checked against this list and a
  // list with several entries would let a misconfigured signer still find a match.
  if (origins.length !== 1) return null;
  const maxBytes = positiveBoundedInteger(env.STYLD_MEDIA_MAX_BYTES, 5 * 1024 * 1024, 5 * 1024 * 1024);
  const timeoutMs = positiveBoundedInteger(env.STYLD_MEDIA_TIMEOUT_MS, 5000, 5000);
  const windowSeconds = positiveBoundedInteger(env.STYLD_MEDIA_ACCESS_WINDOW_SECONDS, MAX_WINDOW_SECONDS, MAX_WINDOW_SECONDS);
  if (!maxBytes || !timeoutMs || !windowSeconds) return null;
  return Object.freeze({
    cloudName,
    allowedOrigins: Object.freeze(origins),
    secureDistribution: new URL(origins[0]).hostname,
    maxBytes,
    timeoutMs,
    windowSeconds,
  });
}

module.exports = { resolveMediaDeliveryConfig, exactHttpsOrigin };
