/**
 * T1B public trust-copy regression suite.
 *
 * Locks the honest-communication rules on public-facing pages while
 * PAYMENTS_LIVE and BOOKING_COMMITMENTS are false. We must not imply a live
 * escrow, guaranteed refunds, automatic payouts, confirmed paid bookings or
 * identity verification that the server cannot yet prove.
 *
 *   1. no live escrow / held-funds / guaranteed-refund language
 *   2. no automatic M-Pesa payout promises
 *   3. no "all professionals are verified" claims
 *   4. the payment disclaimer is flag-aware, not a promise of future escrow
 *   5. the corrected pages keep the honest "not live yet" wording
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

const landing = stripped('components/landing-client.tsx');
const guide = stripped('app/guide/page.tsx');
const marketplace = stripped('components/marketplace-ui.tsx');
const paymentDisclaimer = stripped('components/payment-disclaimer.tsx');

const publicFiles = { landing, guide, marketplace, paymentDisclaimer };

test('public copy never claims a live escrow or held funds', () => {
  const forbidden = [
    /\bescrow\b/i,
    /held safely/i,
    /held securely/i,
    /holds the money first/i,
    /funds stay protected/i,
    /m-pesa holding shield/i,
    /kes ?4,?500 held/i,
  ];

  for (const [name, text] of Object.entries(publicFiles)) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `${name} still claims: ${pattern}`);
    }
  }
});

test('public copy never guarantees refunds or automatic payouts', () => {
  const forbidden = [
    /refund guarantee/i,
    /protected payouts?/i,
    /payout follows confirmation/i,
    /releases? to your m-pesa/i,
    /funds release/i,
    /50% refund/i,
  ];

  for (const [name, text] of Object.entries(publicFiles)) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `${name} still claims: ${pattern}`);
    }
  }
});

test('public copy never claims all professionals are verified', () => {
  const forbidden = [
    /police clearance/i,
    /vetted artists first/i,
    /verification boost/i,
    /verified for your peace of mind/i,
    /absolute trust/i,
    /every professional listed on styld goes through/i,
    /verification badges? are (active|live)/i,
    /green verified badge/i,
  ];

  for (const [name, text] of Object.entries(publicFiles)) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `${name} still claims: ${pattern}`);
    }
  }
});

test('the booking payment disclaimer is flag-aware and promises no future escrow', () => {
  assert.match(paymentDisclaimer, /FEATURES\.PAYMENTS_LIVE/);
  assert.doesNotMatch(paymentDisclaimer, /will hold your payment/i);
  assert.doesNotMatch(paymentDisclaimer, /safe platform escrow/i);
  assert.doesNotMatch(paymentDisclaimer, /held securely by Styld/i);
  // The unrelated product-delivery disclaimer must be left untouched.
  assert.match(paymentDisclaimer, /does not provide delivery services/i);
});

test('the landing payments tab is gated by the payments flag', () => {
  assert.match(landing, /FEATURES\.PAYMENTS_LIVE/);
  assert.match(landing, /const paymentsLive = FEATURES\.PAYMENTS_LIVE/);
  assert.match(landing, /paymentsLive \?/);
});

test('the corrected pages keep the honest not-live-yet wording', () => {
  assert.match(landing, /Payments are not live yet/i);
  assert.match(landing, /does not collect payments yet/i);
  assert.match(guide, /not live yet/i);
  assert.match(guide, /Verification badges are not available yet/i);
  assert.match(marketplace, /Payments are not live yet/i);
  assert.match(marketplace, /Contact details unlock after a confirmed booking/i);
});
