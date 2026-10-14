const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProfessionalComparisonItems,
  buildSalonComparisonItems,
  canCompare,
  mergeSelection,
  removeSelection,
  priceLabel,
  durationLabel,
} = require('../lib/service-comparison.cjs');
const professionals = [
  { slug: 'faith', name: 'Faith', serviceIds: ['gloss-service'] },
];
const salons = [
  { slug: 'glow', name: 'Glow Studio', serviceIds: ['gel-service', 'missing'] },
];
const services = [
  { id: 'gloss-service', name: 'Gloss', description: 'Shiny finish', minPrice: 1000, maxPrice: 1000, durationMin: 45, durationMax: 45, category: 'Hair', inclusions: '' },
  { id: 'gel-service', name: 'Gel', description: 'Gel finish', minPrice: 2000, maxPrice: 2500, durationMin: 60, durationMax: 75, category: 'Nails', inclusions: '' },
];
test('comparison items link providers to catalogue services', () => {
  const professionalItems = buildProfessionalComparisonItems(professionals, services);
  const salonItems = buildSalonComparisonItems(salons, services);
  assert.equal(professionalItems.length, 1);
  assert.equal(salonItems.length, 1);
  assert.equal(salonItems[0].key, 'glow:gel-service');
});
test('selection helpers prevent duplicates and enforce limits', () => {
  const selected = ['a', 'b'];
  assert.deepEqual(mergeSelection(selected, 'a'), selected);
  assert.deepEqual(mergeSelection(['a', 'b', 'c'], 'd'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(mergeSelection(['a', 'b', 'c', 'd'], 'e'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(mergeSelection(['a', 'b'], 'c'), ['a', 'b', 'c']);
  assert.deepEqual(removeSelection(['a', 'b'], 'a'), ['b']);
});
test('comparison labels avoid ranges when values are equal', () => {
  assert.equal(priceLabel(services[0]), 'KES 1000');
  assert.equal(priceLabel(services[1]), 'KES 2000-2500');
  assert.equal(durationLabel(services[0]), '45 minutes');
});
test('comparison requires at least two distinct services', () => {
  assert.equal(canCompare(['a', 'b']), true);
  assert.equal(canCompare(['a']), false);
});
