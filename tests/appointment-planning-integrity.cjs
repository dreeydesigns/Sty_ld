const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sanitizePlanContext, resolvePlanContext } = require('../lib/plan-context.cjs');

const mockProfessionals = [
  { slug: 'faith-odhiambo', name: 'Faith Odhiambo', serviceIds: ['makeup-soft-glam', 'full-glam', 'bridal-glam'] },
  { slug: 'njeri-kamau', name: 'Njeri Kamau', serviceIds: ['knotless-braids', 'boho-braids', 'silk-press'] },
];
const mockSalons = [
  { slug: 'kilimani-texture-house', name: 'Kilimani Texture House', serviceIds: ['knotless-braids', 'cornrows', 'fulani-braids'] },
  { slug: 'westlands-polish-room', name: 'Westlands Polish Room', serviceIds: ['gel-manicure', 'classic-manicure', 'acrylic-full-set'] },
];
const mockServices = [
  { id: 'makeup-soft-glam', name: 'Soft Glam', category: 'Make-Up' },
  { id: 'full-glam', name: 'Full Glam', category: 'Make-Up' },
  { id: 'bridal-glam', name: 'Bridal Glow', category: 'Bridal & Events' },
  { id: 'knotless-braids', name: 'Knotless Braids', category: 'Hair' },
  { id: 'gel-manicure', name: 'Gel Manicure', category: 'Nails' },
];

const catalogue = { professionals: mockProfessionals, salons: mockSalons, services: mockServices };

function resolve(input) {
  return resolvePlanContext(sanitizePlanContext(input), catalogue);
}

test('regression 1: no provider and no services returns an empty selection', () => {
  const result = resolve({ targetType: null, targetId: null });
  assert.equal(result.mode, 'general');
  assert.equal(result.provider, null);
  assert.deepEqual(result.services, []);
});

test('regression 2: no provider with a valid requested service returns that service only', () => {
  const result = resolve({ serviceIds: 'makeup-soft-glam' });
  assert.equal(result.mode, 'general');
  assert.equal(result.provider, null);
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
});

test('regression 3: unsupported targetType with a valid-looking targetId is rejected', () => {
  const context = sanitizePlanContext({ targetType: 'evil-provider', targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam' });
  assert.equal(context.mode, 'invalid');
  const result = resolvePlanContext(context, catalogue);
  assert.equal(result.mode, 'invalid');
  assert.equal(result.provider, null);
  assert.deepEqual(result.services, []);
});

test('regression 4: unsupported targetType with no targetId is rejected', () => {
  const context = sanitizePlanContext({ targetType: 'evil-provider', serviceIds: 'makeup-soft-glam' });
  assert.equal(context.mode, 'invalid');
  const result = resolvePlanContext(context, catalogue);
  assert.equal(result.mode, 'invalid');
  assert.deepEqual(result.services, []);
});

test('regression 5: valid targetType with missing targetId is rejected', () => {
  const context = sanitizePlanContext({ targetType: 'professionals', serviceIds: 'makeup-soft-glam' });
  assert.equal(context.mode, 'invalid');
  const result = resolvePlanContext(context, catalogue);
  assert.equal(result.mode, 'invalid');
  assert.deepEqual(result.services, []);
});

test('regression 6: missing targetType with a supplied targetId is rejected', () => {
  const context = sanitizePlanContext({ targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam' });
  assert.equal(context.mode, 'invalid');
  const result = resolvePlanContext(context, catalogue);
  assert.equal(result.mode, 'invalid');
  assert.equal(result.provider, null);
  assert.deepEqual(result.services, []);
});

test('regression 7: unknown provider is rejected, not treated as general browsing', () => {
  const context = sanitizePlanContext({ targetType: 'professionals', targetId: 'nonexistent-pro', serviceIds: 'makeup-soft-glam' });
  assert.equal(context.mode, 'provider');
  const result = resolvePlanContext(context, catalogue);
  assert.equal(result.mode, 'invalid');
  assert.equal(result.provider, null);
  assert.deepEqual(result.services, []);
});

test('regression 8: valid provider with a matching service resolves correctly', () => {
  const result = resolve({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam' });
  assert.equal(result.mode, 'provider');
  assert.equal(result.provider.slug, 'faith-odhiambo');
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
});

test('regression 9: valid provider with another provider service is rejected', () => {
  const result = resolve({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'knotless-braids' });
  assert.equal(result.mode, 'provider');
  assert.equal(result.provider.slug, 'faith-odhiambo');
  assert.deepEqual(result.services, []);
});

test('regression 10: mixed valid and invalid services keep only matching valid services', () => {
  const result = resolve({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'knotless-braids,makeup-soft-glam,not-a-real-service,bridal-glam' });
  assert.equal(result.mode, 'provider');
  assert.deepEqual(result.services.map((service) => service.id), ['makeup-soft-glam', 'bridal-glam']);
});

test('regression 11: duplicate services resolve without duplicates', () => {
  const result = resolve({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam,makeup-soft-glam,bridal-glam' });
  assert.equal(result.mode, 'provider');
  assert.deepEqual(result.services.map((service) => service.id), ['makeup-soft-glam', 'bridal-glam']);
});

test('regression 12: malformed and oversized inputs stay safely bounded', () => {
  const malformedContext = sanitizePlanContext({ targetType: 'professionals', targetId: '../../etc/passwd', serviceIds: 'makeup-soft-glam' });
  assert.equal(malformedContext.mode, 'invalid');
  assert.equal(malformedContext.targetId, null);
  assert.deepEqual(resolvePlanContext(malformedContext, catalogue).services, []);

  const longIds = `${'a'.repeat(100)},makeup-soft-glam`;
  const boundedContext = sanitizePlanContext({ serviceIds: longIds });
  assert.deepEqual(boundedContext.serviceIds, ['makeup-soft-glam']);
  assert.deepEqual(resolvePlanContext(boundedContext, catalogue).services.map((service) => service.id), ['makeup-soft-glam']);

  const manyIds = Array.from({ length: 20 }, (_, i) => `service-${i}`).join(',');
  const cappedContext = sanitizePlanContext({ serviceIds: manyIds });
  assert.equal(cappedContext.serviceIds.length, 10);
  assert.equal(cappedContext.serviceIds[0], 'service-0');
  assert.equal(cappedContext.serviceIds[9], 'service-9');
  assert.deepEqual(resolvePlanContext(cappedContext, catalogue).services, []);
});

test('unknown service IDs are not presented as valid offers', () => {
  const result = resolve({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam,not-a-real-service' });
  assert.equal(result.mode, 'provider');
  assert.deepEqual(result.services.map((service) => service.id), ['makeup-soft-glam']);
});

test('valid salon + matching service resolves correctly', () => {
  const ctx = sanitizePlanContext({ targetType: 'salons', targetId: 'kilimani-texture-house', serviceIds: 'knotless-braids' });
  const result = resolvePlanContext(ctx, catalogue);
  assert.equal(result.mode, 'provider');
  assert.equal(result.provider.slug, 'kilimani-texture-house');
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'knotless-braids');
});

test('multiple valid services retain selection order', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'bridal-glam,makeup-soft-glam,full-glam' });
  const result = resolvePlanContext(ctx, catalogue);
  assert.deepEqual(result.services.map((service) => service.id), ['bridal-glam', 'makeup-soft-glam', 'full-glam']);
});

test('a provider type from the wrong collection does not resolve', () => {
  const result = resolve({ targetType: 'professionals', targetId: 'kilimani-texture-house', serviceIds: 'knotless-braids' });
  assert.equal(result.mode, 'invalid');
  assert.equal(result.provider, null);
  assert.deepEqual(result.services, []);
});

test('singular serviceId continues to work', () => {
  const result = resolve({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceId: 'makeup-soft-glam' });
  assert.equal(result.mode, 'provider');
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
});

test('general mode never falls back to every catalogue service', () => {
  const context = sanitizePlanContext({ targetType: null, targetId: null, serviceIds: 'makeup-soft-glam,not-a-real-service' });
  const result = resolvePlanContext(context, catalogue);
  assert.equal(result.mode, 'general');
  assert.deepEqual(result.services.map((service) => service.id), ['makeup-soft-glam']);
});

test('no live booking or payment operation is enabled in component source', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'appointment-planning.tsx'), 'utf8');
  assert.doesNotMatch(source, /payment_status/);
  assert.doesNotMatch(source, /\/api\/bookings/);
  assert.doesNotMatch(source, /\/api\/payments/);
  assert.match(source, /Preview only\. Prices are estimates\. Booking is not available yet\./);
});
