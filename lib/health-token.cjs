// One rule for the readouts that describe configuration: a shared token, checked in constant time,
// failing closed. No token configured, no header sent, a different length or a different value all
// answer exactly what a route that does not exist answers, so a probe cannot be used to discover
// whether the endpoint is there.

const { timingSafeEqual } = require('crypto');

function healthTokenMatches(provided, expected) {
  if (typeof expected !== 'string' || expected.trim() === '') return false;
  if (typeof provided !== 'string' || provided === '') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function requestCarriesHealthToken(request, env = process.env) {
  const header = request && request.headers ? request.headers.get('x-health-check-token') : null;
  return healthTokenMatches(typeof header === 'string' ? header : '', env.HEALTH_CHECK_TOKEN);
}

module.exports = { healthTokenMatches, requestCarriesHealthToken };
