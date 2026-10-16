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

test('valid professional + matching service resolves correctly', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.provider.slug, 'faith-odhiambo');
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
});

test('valid salon + matching service resolves correctly', () => {
  const ctx = sanitizePlanContext({ targetType: 'salons', targetId: 'kilimani-texture-house', serviceIds: 'knotless-braids' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.provider.slug, 'kilimani-texture-house');
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'knotless-braids');
});

test('multiple valid services retain selection order', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'bridal-glam,makeup-soft-glam,full-glam' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.services.length, 3);
  assert.equal(result.services[0].id, 'bridal-glam');
  assert.equal(result.services[1].id, 'makeup-soft-glam');
  assert.equal(result.services[2].id, 'full-glam');
});

test('duplicate services appear only once', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam,makeup-soft-glam,bridal-glam' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.services.length, 2);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
  assert.equal(result.services[1].id, 'bridal-glam');
});

test('a service that exists but is not offered by the chosen provider is excluded', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'knotless-braids,makeup-soft-glam' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
});

test('unknown provider triggers generic state', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'nonexistent-pro', serviceIds: 'makeup-soft-glam' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.provider, null);
  assert.equal(result.services.length, 0);
});

test('unknown service IDs are not presented as valid offers', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam,not-a-real-service' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
});

test('invalid provider types are rejected', () => {
  const ctx = sanitizePlanContext({ targetType: 'evil-provider', targetId: 'faith-odhiambo', serviceIds: 'makeup-soft-glam' });
  assert.equal(ctx.targetType, null);
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.provider, null);
  assert.equal(result.services.length, 0);
});

test('malformed slugs are rejected', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: '../../etc/passwd', serviceIds: 'makeup-soft-glam' });
  assert.equal(ctx.targetId, null);
});

test('excessively long service IDs are bounded', () => {
  const longId = 'a'.repeat(100);
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: longId });
  assert.equal(ctx.serviceIds.length, 0);
});

test('excessive number of services is bounded', () => {
  const manyIds = Array.from({ length: 20 }, (_, i) => `service-${i}`).join(',');
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceIds: manyIds });
  assert.equal(ctx.serviceIds.length, 10);
  assert.equal(ctx.serviceIds[0], 'service-0');
  assert.equal(ctx.serviceIds[9], 'service-9');
});

test('singular serviceId continues to work', () => {
  const ctx = sanitizePlanContext({ targetType: 'professionals', targetId: 'faith-odhiambo', serviceId: 'makeup-soft-glam' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
});

test('general service planning works without a provider', () => {
  const ctx = sanitizePlanContext({ targetType: null, targetId: null, serviceIds: 'makeup-soft-glam,bridal-glam' });
  const result = resolvePlanContext(ctx, { professionals: mockProfessionals, salons: mockSalons, services: mockServices });
  assert.equal(result.provider, null);
  assert.equal(result.services.length, 2);
  assert.equal(result.services[0].id, 'makeup-soft-glam');
  assert.equal(result.services[1].id, 'bridal-glam');
});

test('no live booking or payment operation is enabled in component source', () => {
  const fs = require('fs');
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'appointment-planning.tsx'), 'utf8');
  assert.doesNotMatch(source, /payment_status/);
  assert.match(source, /BOOKING_COMMITMENTS=false/);
});