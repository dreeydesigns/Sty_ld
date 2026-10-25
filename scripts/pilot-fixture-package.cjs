// Dry-run only. No connector, database, mail or storage adapter exists here.
const { createHash } = require('node:crypto');
const TARGET = Object.freeze({ projectId: 'broad-morning-34625938', branchId: 'br-steep-violet-b78kgp17', database: 'styld_review', vercelProjectId: 'prj_W7UjUPQkUItT6LDjwqwWOoquTDUQ' });
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function targetIdentity(target) {
  if (!target || Object.keys(target).length !== Object.keys(TARGET).length || Object.keys(TARGET).some(key => target[key] !== TARGET[key])) throw new Error('Only the allowlisted review identity is accepted for dry-run planning.');
}
function buildFixturePackage(runId, target, secondClient = false) {
  targetIdentity(target); if (!uuid(runId)) throw new Error('A valid run UUID is required.');
  const id = key => { const hex = hash([runId, key]); return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`; };
  const workspaces = ['professional', 'salon', 'client', ...(secondClient ? ['client'] : [])].map((role, i) => ({ key: `workspace-${i}`, id: id(`workspace-${i}`), role, status: 'active', displayName: `Demo ${role} ${i + 1}` }));
  const services = [0,1,2].map(i => ({ key: `service-${i}`, id: id(`service-${i}`), workspaceId: workspaces[i % 2].id, isActive: true, name: `Demo service ${i + 1}`, price: 2000 + i * 500 }));
  const posts = [0,1,2,3,4,5].map(i => ({ key: `post-${i}`, id: id(`post-${i}`), workspaceId: services[i % 3].workspaceId, tags: [`svc:${services[i % 3].id}`, 'qa:demo'], caption: `Demo: Fictional Look ${i + 1}`, publicationStatus: 'pending', moderationStatus: 'visible', mediaRef: `synthetic-approved-${i + 1}` }));
  const content = { version: 2, runId, target: { ...target }, workspaces, services, posts, provenance: { operation: 'founder-authorized-fixture', marker: 'qa:demo' } };
  return { ...content, checksum: hash(content) };
}
function validateFixturePackage(input, observedTarget) {
  targetIdentity(observedTarget); targetIdentity(input?.target);
  const { checksum, ...content } = input || {};
  if (!uuid(content.runId) || checksum !== hash(content) || content.version !== 2 || content.provenance?.operation !== 'founder-authorized-fixture') throw new Error('Fixture manifest integrity failed.');
  if (Object.keys(content).sort().join() !== ['version','runId','target','workspaces','services','posts','provenance'].sort().join()) throw new Error('Unexpected fixture fields.');
  const ids = new Set();
  const exact = (record, keys) => { if (!record || Object.keys(record).sort().join() !== keys.sort().join()) throw new Error('Unexpected fixture record fields.'); };
  for (const record of content.workspaces) exact(record, ['key','id','role','status','displayName']);
  for (const record of content.services) exact(record, ['key','id','workspaceId','isActive','name','price']);
  for (const record of content.posts) exact(record, ['key','id','workspaceId','tags','caption','publicationStatus','moderationStatus','mediaRef']);
  for (const record of [...content.workspaces, ...content.services, ...content.posts]) { if (!uuid(record.id) || ids.has(record.id)) throw new Error('Invalid or duplicate fixture ID.'); ids.add(record.id); }
  if (content.workspaces.filter(w => ['professional','salon'].includes(w.role)).length !== 2 || content.workspaces.some(w => !['professional','salon','client'].includes(w.role) || w.status !== 'active' || !w.displayName.startsWith('Demo '))) throw new Error('Invalid Demo workspaces.');
  for (const service of content.services) if (!service.isActive || !Number.isSafeInteger(service.price) || service.price < 0 || !service.name.startsWith('Demo ') || !content.workspaces.some(w => w.id === service.workspaceId && ['professional','salon'].includes(w.role))) throw new Error('Inactive service or missing provider.');
  for (const post of content.posts) if (!Array.isArray(post.tags) || post.tags.length !== 2 || post.tags[1] !== 'qa:demo' || !content.services.some(s => s.id === post.tags[0]?.slice(4) && post.tags[0] === `svc:${s.id}` && s.workspaceId === post.workspaceId) || post.publicationStatus !== 'pending' || post.moderationStatus !== 'visible' || !post.caption.startsWith('Demo: ') || !/^synthetic-approved-\d+$/.test(post.mediaRef)) throw new Error('Ownership, media or moderation validation failed.');
  if (content.services.length < 3 || content.posts.length < 6) throw new Error('Insufficient Demo records.');
  return content;
}
function dryRunFixtures(manifest, observedTarget, existing = [], failAfter = Infinity) {
  const content = validateFixturePackage(manifest, observedTarget);
  const ordered = [...content.workspaces, ...content.services, ...content.posts];
  const created = [], reused = [];
  for (const record of ordered) {
    const found = existing.find(item => item.id === record.id);
    if (found) { if (hash(found) !== hash(record)) throw new Error('Existing record differs; never overwrite unrelated data.'); reused.push(record.id); continue; }
    if (created.length === failAfter) return { dryRun: true, writes: 0, failed: true, created, rollback: [...created].reverse() };
    created.push(record);
  }
  return { dryRun: true, writes: 0, failed: false, created, reused, cleanup: [...created].reverse() };
}
function cleanupPlan(manifest, observedTarget, receipt) {
  const content = validateFixturePackage(manifest, observedTarget);
  if (receipt.runId !== content.runId || receipt.manifestChecksum !== manifest.checksum || !Array.isArray(receipt.createdIds) || new Set(receipt.createdIds).size !== receipt.createdIds.length) throw new Error('Invalid cleanup receipt.');
  const records = [...content.workspaces, ...content.services, ...content.posts];
  if (receipt.createdIds.some(id => !records.some(record => record.id === id))) throw new Error('Non-fixture record refused.');
  return { dryRun: true, writes: 0, requiresFounderAuthorization: true, records: records.filter(record => receipt.createdIds.includes(record.id)).reverse() };
}
if (require.main === module) { console.log(JSON.stringify({ dryRunOnly: true, remoteExecution: false, instruction: 'Import the pure builder with an explicit run ID and observed review identity. No seed command is available.' })); }
module.exports = { TARGET, buildFixturePackage, validateFixturePackage, dryRunFixtures, cleanupPlan };
