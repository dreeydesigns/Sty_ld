const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('lib/workspace-policy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', code)(moduleUnderTest.exports);
const { workspaceProfile } = moduleUnderTest.exports;

test('Salon description rehydrates from the field saved by the profile API', () => {
  const workspace = { id: 'salon-workspace', role: 'salon', status: 'active', profile: { salonName: 'Isolated QA Salon', bio: 'Saved salon description', location: 'Kilimani, Nairobi' } };
  const profile = workspaceProfile({ id: 'owner' }, workspace);
  assert.equal(profile.description, 'Saved salon description');
  assert.equal(profile.location, 'Kilimani, Nairobi');
  assert.equal(profile.workspaceId, workspace.id);
  assert.equal(profile.role, 'salon');
});

test('clearing a description cannot restore an older value and legacy Salon descriptions remain readable', () => {
  const salon = profile => workspaceProfile({ id: 'owner' }, { id: 'salon-workspace', role: 'salon', status: 'active', profile });
  assert.equal(salon({ bio: '', description: 'Old description' }).description, '');
  assert.equal(salon({ description: 'Legacy saved description' }).description, 'Legacy saved description');
  assert.equal(salon({ bio: {}, description: [] }).description, '');
  const professional = workspaceProfile({ id: 'owner' }, { id: 'pro-workspace', role: 'professional', status: 'active', profile: { bio: 'Professional bio' } });
  assert.equal(professional.bio, 'Professional bio');
  assert.equal(professional.description, undefined);
});
