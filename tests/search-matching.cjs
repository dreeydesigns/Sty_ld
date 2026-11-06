const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesBeautySearch: matches } = require('../lib/search-matching.cjs');

test('literal discovery searches retain case, phrase and partial matching', () => {
  assert.equal(matches('Knotless Braids in Westlands', ' BRAIDS '), true);
  assert.equal(matches('Knotless Braids in Westlands', 'less bra'), true);
  assert.equal(matches('Knotless Braids in Westlands', 'braids in Westlands'), true);
  assert.equal(matches('Knotless Braids in Westlands', 'Westlands braids'), false);
  assert.equal(matches('Anything', '   '), true);
});

test('common complete-word aliases match existing records in both directions', () => {
  for (const [a, b] of [['nywele', 'hair'], ['kucha', 'nails'], ['kusuka', 'braids'], ['rasta', 'locs'], ['dreadlocks', 'locs']]) {
    assert.equal(matches(a, b), true, a + ' / ' + b);
    assert.equal(matches(b, a), true, b + ' / ' + a);
  }
  assert.equal(matches('Nail Art Upgrade', 'kucha art'), true);
  assert.equal(matches('Hair and braids in Kilimani', 'nywele and kusuka'), true);
});

test('aliases never discard location, phrase order or unknown query words', () => {
  assert.equal(matches('Braids in Kilimani', 'kusuka in Westlands'), false);
  assert.equal(matches('Braids in Kilimani', 'kusuka unknown'), false);
  assert.equal(matches('Hair braids', 'kusuka nywele'), false);
  assert.equal(matches('Hairbraids', 'nywele'), false);
  assert.equal(matches('Rastafari', 'locs'), false);
  assert.equal(matches('Nails', 'mbuyu'), false);
});

test('search is a predicate and does not reorder or manufacture results', () => {
  const records = [{ id: 'a', name: 'Hair colour', area: 'Karen' }, { id: 'b', name: 'Hair wash', area: 'Westlands' }];
  const result = records.filter(item => matches(item.name, 'nywele') && item.area === 'Westlands');
  assert.deepEqual(result, [records[1]]);
  assert.equal(records.length, 2);
});

test('alias expansion matches complete tokens instead of unrelated substrings', () => {
  for (const value of ['located', 'local', 'location', 'Location in Karen']) {
    assert.equal(matches(value, 'rasta'), false, value);
  }
  assert.equal(matches('thumbnail', 'kucha'), false);
  assert.equal(matches('Nail art in Karen', 'kucha art in Westlands'), false);
  assert.equal(matches('Nail art in Karen', 'kucha unknown'), false);
  assert.equal(matches('Hair braids', 'kusuka nywele'), false);
  assert.equal(matches('Location in Karen', 'loc'), true, 'literal substring behavior stays first');
});
