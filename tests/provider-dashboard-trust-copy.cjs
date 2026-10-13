/**
 * T1C provider/salon dashboard trust-copy regression suite.
 *
 * Locks the honest-communication rules on the Professional and Salon
 * dashboard surfaces while PAYMENTS_LIVE and BOOKING_COMMITMENTS are false:
 *
 *   1. no funded, held, escrow, payout-release or confirmed-payment claims
 *   2. sample dashboard figures are labelled as samples, never as real earnings
 *   3. no fabricated week-over-week deltas or review counts presented as real
 *   4. verification/payment pills are flag-aware, not statements of fact
 *   5. a feature flag is never treated as proof that a transaction succeeded
 *
 * Source-level assertions only. No implementation file is executed here.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

// Strip line and block comments so assertions match rendered copy, not notes.
function stripped(file) {
  return source(file)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

const workspace = stripped('components/role-profile-workspace.tsx');
const salonTeam = stripped('components/salon-team-ui.tsx');
const wowUx = stripped('components/wow-ux.tsx');
const paymentDisclaimer = stripped('components/payment-disclaimer.tsx');

const dashboardFiles = { workspace, salonTeam, wowUx, paymentDisclaimer };

test('dashboard copy never claims funded, held, escrow or confirmed payments', () => {
  const forbidden = [
    /\bfunded\b/i,
    /held securely/i,
    /\bescrow\b/i,
    /confirmed payment/i,
    /payment received/i,
    /released after completion/i,
    /net amount/i,
    /directly to your m-?pesa/i,
  ];

  for (const [name, text] of Object.entries(dashboardFiles)) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `${name} still claims: ${pattern}`);
    }
  }
});

test('the provider requests panel shows a price, never a funded amount', () => {
  assert.match(workspace, /the service, time, notes, and price/i);
  assert.doesNotMatch(workspace, /funded amount/i);
});

test('sample dashboard figures are labelled as samples, not real earnings', () => {
  assert.match(workspace, /Preview dashboard/i);
  assert.match(workspace, /Sample earnings/i);
  assert.match(workspace, /not real earnings/i);
  assert.match(workspace, /Sample bookings/i);
  assert.match(workspace, /Sample rating/i);
});

test('fabricated deltas and review counts are not presented as real', () => {
  assert.doesNotMatch(workspace, /\+12% from last week/i);
  assert.doesNotMatch(workspace, /\+8% from last week/i);
  assert.doesNotMatch(workspace, /Based on 124 reviews/i);
});

test('payment pills are flag-aware and never state held funds as fact', () => {
  assert.match(wowUx, /FEATURES\.PAYMENTS_LIVE/);
  assert.doesNotMatch(wowUx, /Funds held securely/i);
  assert.match(paymentDisclaimer, /FEATURES\.PAYMENTS_LIVE/);
  assert.doesNotMatch(paymentDisclaimer, /held by Styld/i);
  assert.doesNotMatch(paymentDisclaimer, /released to the professional/i);
});

test('a feature flag is not treated as a completed transaction', () => {
  // The enabled branch must stay neutral: no paid/confirmed/settled success state.
  assert.doesNotMatch(wowUx, /PAYMENTS_LIVE[\s\S]{0,80}(Paid|Confirmed|Settled)/i);
  assert.doesNotMatch(paymentDisclaimer, /PAYMENTS_LIVE[\s\S]{0,120}(Paid|Confirmed|Settled)/i);
});

test('the salon team earnings copy explains future payouts without promises held as fact', () => {
  assert.match(salonTeam, /payouts are not live yet/i);
  assert.doesNotMatch(salonTeam, /the payment is held securely/i);
});
