/**
 * Tests for Server-Authoritative Booking State Machine
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch })(
    (name) => dependencies[name] || require(name), module, module.exports,
  );
  return module.exports;
}

const stateMachine = load('lib/booking-state.ts');

test('normalizes legacy booking statuses', () => {
  assert.equal(stateMachine.normalizeBookingStatus('pending'), 'requested');
  assert.equal(stateMachine.normalizeBookingStatus('confirmed'), 'accepted');
  assert.equal(stateMachine.normalizeBookingStatus('ACCEPTED'), 'accepted');
  assert.equal(stateMachine.normalizeBookingStatus(null), 'requested');
});

test('allows provider to accept and decline requested bookings', () => {
  const acceptResult = stateMachine.validateBookingTransition('requested', 'accepted', 'professional');
  assert.equal(acceptResult.valid, true);

  const declineResult = stateMachine.validateBookingTransition('requested', 'declined', 'salon');
  assert.equal(declineResult.valid, true);
});

test('prevents client from accepting or declining a booking', () => {
  const acceptResult = stateMachine.validateBookingTransition('requested', 'accepted', 'client');
  assert.equal(acceptResult.valid, false);
  assert.match(acceptResult.error, /not authorized/);

  const declineResult = stateMachine.validateBookingTransition('requested', 'declined', 'client');
  assert.equal(declineResult.valid, false);
});

test('allows client to cancel or request reschedule on requested or accepted bookings', () => {
  const cancelResult = stateMachine.validateBookingTransition('requested', 'cancelled', 'client');
  assert.equal(cancelResult.valid, true);

  const rescheduleResult = stateMachine.validateBookingTransition('accepted', 'reschedule_requested', 'client');
  assert.equal(rescheduleResult.valid, true);
});

test('prevents illegal transitions like draft directly to completed', () => {
  const result = stateMachine.validateBookingTransition('draft', 'completed', 'admin');
  assert.equal(result.valid, false);
  assert.match(result.error, /Cannot transition booking from 'draft' to 'completed'/);
});

test('terminal states (cancelled, declined) have no transitions', () => {
  const fromCancelled = stateMachine.validateBookingTransition('cancelled', 'requested', 'admin');
  assert.equal(fromCancelled.valid, false);

  const fromDeclined = stateMachine.validateBookingTransition('declined', 'accepted', 'admin');
  assert.equal(fromDeclined.valid, false);
});

test('admin can transition across valid graph states', () => {
  const result = stateMachine.validateBookingTransition('accepted', 'scheduled', 'admin');
  assert.equal(result.valid, true);
});
