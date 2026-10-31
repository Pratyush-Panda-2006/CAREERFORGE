// Run with: node --test public/showcase/real-estate-luxe/estates.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('./filters.js', import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\nthis.EstateFilter = EstateFilter; this.ESTATES = ESTATES;', ctx);
const F = ctx.EstateFilter;
const E = ctx.ESTATES;
const ids = (list) => Array.from(list, (e) => e.id);

test('default filters show every estate', () => {
  assert.equal(F.filterEstates(E, F.defaults()).length, E.length);
  assert.equal(F.filterEstates(E, undefined).length, E.length);
});

test('price range is inclusive and the top of the slider has no cap', () => {
  const mid = F.filterEstates(E, { minPrice: 12000000, maxPrice: 18500000 });
  assert.deepEqual(ids(mid).sort(), ['azur-chateau', 'cay-island', 'glass-horizon']);
  const top = F.filterEstates(E, { minPrice: 25000000, maxPrice: 25000000 });
  assert.deepEqual(ids(top), ['aspen-ridge']); // $35M counts as "$25M+"
});

test('swapped or out-of-range prices are corrected', () => {
  const n = F.normalize({ minPrice: 30000000, maxPrice: 2000000 });
  assert.equal(n.minPrice, 2000000);
  assert.equal(n.maxPrice, 25000000);
  assert.equal(F.normalize({ minPrice: 'abc' }).minPrice, F.PRICE_MIN);
});

test('minimum bedrooms', () => {
  assert.deepEqual(ids(F.filterEstates(E, { minBeds: 8 })).sort(), ['aspen-ridge', 'azur-chateau']);
  assert.equal(F.filterEstates(E, { minBeds: 0 }).length, E.length);
});

test('property type matches any selected type', () => {
  assert.deepEqual(ids(F.filterEstates(E, { types: ['Island'] })), ['cay-island']);
  assert.equal(F.filterEstates(E, { types: ['Penthouse', 'Villa'] }).length, 4);
});

test('amenities must all be present', () => {
  assert.deepEqual(ids(F.filterEstates(E, { amenities: ['Wine Cellar'] })).sort(), ['aspen-ridge', 'azur-chateau', 'skyline-penthouse']);
  assert.deepEqual(ids(F.filterEstates(E, { amenities: ['Wine Cellar', 'Vineyard'] })), ['azur-chateau']);
});

test('filters combine and can produce an empty result', () => {
  assert.deepEqual(ids(F.filterEstates(E, { types: ['Penthouse'], minBeds: 4 })), ['skyline-penthouse']);
  assert.equal(F.filterEstates(E, { types: ['Island'], amenities: ['Vineyard'] }).length, 0);
});

test('count label', () => {
  assert.equal(F.countLabel(4, 6), 'Showing 4 of 6 Estates');
  assert.equal(F.countLabel(1, 1), 'Showing 1 of 1 Estate');
});

test('price labels', () => {
  assert.equal(F.formatShortPrice(1000000, false), '$1M');
  assert.equal(F.formatShortPrice(2500000, false), '$2.5M');
  assert.equal(F.formatShortPrice(25000000, true), '$25M+');
});

test('data model is well formed', () => {
  assert.equal(new Set(ids(E)).size, E.length);
  for (const e of E) {
    assert.ok(e.price > 0 && e.beds > 0 && e.type && e.amenities.length);
  }
});
