const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidSlug,
  splitServiceIds,
  sanitizePlanContext,
  isValidReturnDestination,
} = require('../lib/plan-context.cjs');

test('planning slugs and service ids reject query injection', () => {
  assert.equal(isValidSlug('faith-odhiambo'), true);
  assert.equal(isValidSlug('../../etc/passwd'), false);
  assert.equal(isValidSlug('faith?admin=true'), false);
  assert.deepEqual(splitServiceIds('makeup-soft-glam,../x,gel-manicure'), ['makeup-soft-glam', 'gel-manicure']);
});

test('planning context cannot forge an unknown provider type', () => {
  const context = sanitizePlanContext({
    targetType: 'evil-provider',
    targetId: 'faith-odhiambo',
    serviceIds: '../secret,gel-manicure',
  });
  assert.deepEqual(context, {
    mode: 'invalid',
    targetType: null,
    targetId: null,
    serviceIds: ['gel-manicure'],
  });
});

test('unknown service ids remain syntactically safe but are not auto-trusted', () => {
  const context = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'not-a-service,makeup-soft-glam' });
  assert.deepEqual(context, {
    mode: 'provider',
    targetType: 'professionals',
    targetId: 'faith-odhiambo',
    serviceIds: ['not-a-service', 'makeup-soft-glam'],
  });
  const htmlSafe = '<script>alert(1)</script>';
  assert.deepEqual(sanitizePlanContext({ serviceIds: htmlSafe }).serviceIds, []);
});

test('return destinations stay internal and cannot be redirected externally', () => {
  assert.equal(isValidReturnDestination('/discover?tab=looks&q=braids'), true);
  assert.equal(isValidReturnDestination('https://evil.example.com'), false);
  assert.equal(isValidReturnDestination('//evil.example.com'), false);
  assert.equal(isValidReturnDestination('/book?returnTo=\\evil'), false);
});
