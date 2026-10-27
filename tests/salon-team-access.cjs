/**
 * Salon team surface access (Professional & Salon Experience slice).
 *
 * Salon staff invitations are the deferred IDEA-009 work. The panel and the invite page stay in
 * the tree for the design demo, so what protects a beta tester from reading an invitation as real
 * access is this decision. It is tested both ways: off as the product ships, and on, to prove the
 * gate is a flag rather than a code path that was deleted.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

// The helper takes its flags, so the module's own default comes from the shipped flag file and
// the switched-on case is an argument rather than an edited source tree.
const flagModule = (() => {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/feature-flags.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { Object, Array, String, Boolean, JSON, Error })(() => ({}), module, module.exports);
  return module.exports;
})();

const accessSource = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/salon-team-access.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const accessModule = { exports: {} };
vm.runInNewContext('(function(require,module,exports){' + accessSource + '\n})', { Object, Array, String, Boolean, JSON, Error })(
  name => (name === '@/lib/feature-flags' ? flagModule : require(name)), accessModule, accessModule.exports,
);
const isSalonTeamSurfaceAllowed = accessModule.exports.isSalonTeamSurfaceAllowed;

test('the beta ships with the salon team surface off for every role', () => {
  assert.equal(flagModule.FEATURES.SALON_TEAM_PROTOTYPE, false, 'the flag is the switch, and it is off');
  for (const role of ['salon', 'team_member', 'professional', 'client', 'shop', 'delivery', 'super_admin', undefined, null]) {
    assert.equal(isSalonTeamSurfaceAllowed(role), false, `no role meets the team surface today, including ${String(role)}`);
  }
});

test('switching the flag on brings back exactly the two prototype roles', () => {
  const on = { SALON_TEAM_PROTOTYPE: true };
  assert.equal(isSalonTeamSurfaceAllowed('salon', on), true, 'the salon panel is what the design demo needs');
  assert.equal(isSalonTeamSurfaceAllowed('team_member', on), true, 'the invited member view returns with it');
  for (const role of ['professional', 'client', 'super_admin', undefined, null]) {
    assert.equal(isSalonTeamSurfaceAllowed(role, on), false, `an enabled prototype does not hand ${String(role)} a team surface`);
  }
});

test('one decision serves the whole profile, so a tab cannot outlive its content', () => {
  const component = fs.readFileSync(path.join(root, 'components/role-profile-workspace.tsx'), 'utf8');
  assert.match(component, /import \{ isSalonTeamSurfaceAllowed \} from "@\/lib\/salon-team-access"/);
  assert.equal((component.match(/isSalonTeamSurfaceAllowed\(/g) || []).length, 2, 'the invited-member view and the provider workspace each ask once, and the provider workspace decides its three surfaces from that answer');
  assert.doesNotMatch(component, /FEATURES\.SALON_TEAM_PROTOTYPE/, 'the flag is not consulted twice, where one branch can be missed');
  const guarded = (component.match(/teamSurface/g) || []).length;
  assert.ok(guarded >= 4, `the answer is used by the tab list, the panel and the deep link, saw ${guarded}`);
  assert.match(component, /\["posts", \.\.\.\(teamSurface \? \(\["team"\] as ProviderTab\[\]\) : \[\]\), "settings"\]/, 'a deep link to the hidden tab falls back to posts instead of opening an empty pane');
  assert.match(component, /t\.key === "team" \? !isPro && teamSurface/, 'the tab is not offered while the surface is off');
  assert.match(component, /activeTab === "team" && !isPro && salonSess && teamSurface/, 'the panel is not rendered while the surface is off');
});
