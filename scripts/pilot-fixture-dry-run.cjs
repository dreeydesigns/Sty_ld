// Pure validation only. No database, network, authentication or cleanup adapter.
const EXPECTED = Object.freeze({ projectId: 'broad-morning-34625938', database: 'styld_review', vercelProjectId: 'prj_W7UjUPQkUItT6LDjwqwWOoquTDUQ' });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !keys.includes(key)) || keys.some((key) => !(key in value))) throw new Error('Unexpected fixture fields.');
}
function validatePilotManifest(manifest, observedTarget) {
  exact(observedTarget, Object.keys(EXPECTED));
  if (Object.keys(EXPECTED).some((key) => observedTarget[key] !== EXPECTED[key])) throw new Error('Review environment identity mismatch.');
  exact(manifest, ['version', 'runId', 'target', 'accounts', 'services', 'posts']);
  exact(manifest.target, Object.keys(EXPECTED));
  if (manifest.version !== 1 || !uuid.test(manifest.runId) || Object.keys(EXPECTED).some((key) => manifest.target[key] !== EXPECTED[key])) throw new Error('Invalid fixture manifest identity.');
  if (!Array.isArray(manifest.accounts) || !Array.isArray(manifest.services) || !Array.isArray(manifest.posts)) throw new Error('Fixture collections must be arrays.');
  if (manifest.accounts.length < 3 || manifest.accounts.length > 4 || manifest.services.length < 2 || manifest.services.length > 3 || manifest.posts.length < 4 || manifest.posts.length > 6) throw new Error('Fixture count outside approved design.');
  const allKeys = new Set();
  function key(value) {
    if (typeof value !== 'string' || !/^demo-[a-z0-9-]{1,60}$/.test(value) || allKeys.has(value)) throw new Error('Fixture keys must be unique Demo identifiers.');
    allKeys.add(value);
  }
  const accounts = new Map();
  for (const account of manifest.accounts) {
    exact(account, ['key', 'role', 'displayName', 'approvedIdentityRef']); key(account.key);
    if (!['professional', 'client'].includes(account.role) || typeof account.displayName !== 'string' || !/^Demo [a-zA-Z0-9 ]{2,60}$/.test(account.displayName)
      || typeof account.approvedIdentityRef !== 'string' || !/^founder-approved-[a-z0-9-]{1,60}$/.test(account.approvedIdentityRef)) throw new Error('Use labelled Demo accounts and opaque approved identity references.');
    accounts.set(account.key, account);
  }
  if ([...accounts.values()].filter((a) => a.role === 'professional').length !== 2) throw new Error('Exactly two Demo professionals are required.');
  const services = new Map();
  for (const service of manifest.services) {
    exact(service, ['key', 'ownerKey', 'name', 'price', 'durationMinutes', 'category']); key(service.key);
    if (accounts.get(service.ownerKey)?.role !== 'professional' || typeof service.name !== 'string' || !/^Demo [a-zA-Z0-9 ]{2,60}$/.test(service.name)
      || !Number.isSafeInteger(service.price) || service.price < 1 || service.price > 100000 || !Number.isSafeInteger(service.durationMinutes) || service.durationMinutes < 1 || service.durationMinutes > 480
      || !['hair', 'nails', 'makeup', 'skin', 'wellness'].includes(service.category)) throw new Error('Invalid Demo service or ownership.');
    services.set(service.key, service);
  }
  if ([...accounts.values()].filter((a) => a.role === 'professional').some((a) => ![...services.values()].some((s) => s.ownerKey === a.key))) throw new Error('Each professional needs a service.');
  for (const post of manifest.posts) {
    exact(post, ['key', 'ownerKey', 'serviceKey', 'caption', 'mediaRef', 'publicationStatus']); key(post.key);
    if (services.get(post.serviceKey)?.ownerKey !== post.ownerKey || typeof post.caption !== 'string' || !post.caption.startsWith('Demo: ') || post.caption.length > 2000
      || typeof post.mediaRef !== 'string' || !/^synthetic-approved-[a-z0-9-]{1,80}$/.test(post.mediaRef) || post.publicationStatus !== 'pending') throw new Error('Posts require owned services, approved synthetic media and pending moderation.');
  }
  return Object.freeze({ dryRun: true, writes: 0, runId: manifest.runId, accounts: manifest.accounts.length, services: manifest.services.length, posts: manifest.posts.length,
    operations: Object.freeze(['confirm approved identities', 'normal OTP signup', 'record owned workspace IDs', 'create owned services', 'submit pending posts', 'normal MFA moderation']),
    cleanup: 'Design only. A separate receipt of server IDs, ownership and fingerprints is required before any cleanup.' });
}
module.exports = { validatePilotManifest, EXPECTED };
