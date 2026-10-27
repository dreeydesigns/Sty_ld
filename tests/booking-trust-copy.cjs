/**
 * T1A booking trust-copy regression suite.
 *
 * Locks the honest-communication rules for the booking experience while
 * BOOKING_COMMITMENTS and PAYMENTS_LIVE are false:
 *
 *   1. no claim that a booking is paid, funded, secured, confirmed or received
 *   2. the final submit action is disabled and labelled honestly while disabled
 *   3. the payment disclaimer only appears when booking commitments are enabled
 *   4. the payment disclaimer no longer promises a live escrow
 *   5. the booking state machine, guest gate and no-false-success behavior survive
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

const bookingExperience = stripped('components/booking-experience.tsx');
const paymentDisclaimer = stripped('components/payment-disclaimer.tsx');

test('booking copy makes no paid, funded, secured, confirmed or received claims', () => {
  const forbidden = [
    /booking is secured once you pay/i,
    /pay to secure/i,
    /securing your paid request/i,
    /everything visible before you pay/i,
    /opens protected checkout/i,
    /payment guardian/i,
    /funds held securely/i,
    /\bfunded\b/i,
    /\bescrow\b/i,
    /has your request/i,
    /request has been sent/i,
    /\bConfirmed\b/,
    /\bbooking confirmation\b/i,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(bookingExperience, pattern, `booking experience still claims: ${pattern}`);
  }
});

test('booking no longer renders the payment TrustShield or an accepted timeline', () => {
  assert.doesNotMatch(bookingExperience, /TrustShield/);
  assert.doesNotMatch(bookingExperience, /BookingTimeline status="accepted"/);
  assert.match(bookingExperience, /BookingTimeline status="pending"/);
});

test('the disabled submit action is gated by the booking commitments flag', () => {
  assert.match(bookingExperience, /FEATURES\.BOOKING_COMMITMENTS/);
  assert.match(bookingExperience, /disabled=\{!bookingCommitmentsEnabled \|\| !disclaimerAccepted\}/);
  assert.match(bookingExperience, /bookingCommitmentsEnabled \? "Send booking request"/);
  assert.match(bookingExperience, /"Booking unavailable in preview"/);
});

test('the payment disclaimer is only rendered when booking commitments are enabled', () => {
  assert.match(bookingExperience, /\{bookingCommitmentsEnabled \? \(\s*<PaymentDisclaimer/);
});

test('the booking payment disclaimer no longer promises a live escrow', () => {
  assert.doesNotMatch(paymentDisclaimer, /safe platform escrow/i);
  assert.doesNotMatch(paymentDisclaimer, /held securely by Styld/i);
  assert.doesNotMatch(paymentDisclaimer, /payment guardian/i);
  // The unrelated product-delivery disclaimer must be left untouched.
  assert.match(paymentDisclaimer, /does not provide delivery services/i);
});

test('the booking state machine and guest gate survive the copy changes', () => {
  assert.match(bookingExperience, /const response = await fetch\("\/api\/bookings"/);
  assert.match(bookingExperience, /throw new Error/);
  assert.match(bookingExperience, /setStatus\("done"\)/);
  assert.match(bookingExperience, /openGuestGate\("booking", "\/book\?resume=booking"\)/);
  assert.match(bookingExperience, /saveBookingDraft\(\)/);
});

test('the deferred salon team surfaces promise no money that no server can move', () => {
  const invitePage = stripped('app/join-team/page.tsx');
  const teamPanel = stripped('components/salon-team-ui.tsx');

  assert.doesNotMatch(invitePage, /payment is released/i, 'nothing is released while PAYMENTS_LIVE is false');
  assert.doesNotMatch(invitePage, /you earn[^<]*to your m-pesa/i, 'an illustrative split is not earnings');
  assert.doesNotMatch(invitePage, /\bguaranteed\b/i);
  assert.match(invitePage, /Payments are not live on STYLD yet/i, 'the split panel says what it is');

  // Both surfaces stay labelled as prototypes, so switching the feature flag back on for a
  // design session cannot silently turn a demo into a claim.
  assert.match(invitePage, /role="note"[\s\S]{0,400}?design prototype/i);
  assert.match(invitePage, /invitations here do not grant real access|grants no access/i);
  assert.match(teamPanel, /role="note"[\s\S]{0,400}?Prototype only/i);
  assert.match(teamPanel, /invitations here do not grant real access/i);
});
