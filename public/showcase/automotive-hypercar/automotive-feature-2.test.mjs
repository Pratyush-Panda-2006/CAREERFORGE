import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarFilterEngine } from './filter-engine.js';

test('AutomotiveHypercarFilterEngine - filterByKeyword performs case-insensitive search across name, brand, drivetrain, and tags', () => {
  const engine = new AutomotiveHypercarFilterEngine();

  // Search by brand lowercase
  const rimac = engine.filterByKeyword('rimac');
  assert.equal(rimac.length, 1);
  assert.equal(rimac[0].name, 'Nevera Time Attack');

  // Search by partial model name uppercase
  const valk = engine.filterByKeyword('VALKYRIE');
  assert.equal(valk.length, 1);
  assert.equal(valk[0].brand, 'Aston Martin');

  // Search by tag keyword
  const aero = engine.filterByKeyword('aero');
  assert.equal(aero.length, 1);
  assert.equal(aero[0].id, 'hc-1');

  // Search with no matches
  const none = engine.filterByKeyword('nonexistent-prototype');
  assert.equal(none.length, 0);

  // Clear query restores all
  const all = engine.filterByKeyword('');
  assert.equal(all.length, 6);
});

test('AutomotiveHypercarFilterEngine - compound tag filtering strictly enforces all selected tags', () => {
  const engine = new AutomotiveHypercarFilterEngine();

  // Single tag filter
  engine.toggleTag('v12');
  const v12Cars = engine.apply();
  assert.equal(v12Cars.length, 2); // Valkyrie & Utopia
  assert.ok(v12Cars.every(c => c.tags.includes('v12')));

  // Compound second tag: 'track'
  engine.toggleTag('track');
  const v12Track = engine.apply();
  assert.equal(v12Track.length, 1); // Only Valkyrie has both
  assert.equal(v12Track[0].id, 'hc-1');

  // Untoggle 'track'
  engine.toggleTag('track');
  assert.equal(engine.apply().length, 2);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 6);
});

test('AutomotiveHypercarFilterEngine - sort handles ascending and descending ordering accurately', () => {
  const engine = new AutomotiveHypercarFilterEngine();

  // Horsepower descending
  const byHpDesc = engine.sort('horsepower', 'desc');
  assert.equal(byHpDesc[0].horsepower, 1914); // Rimac Nevera
  assert.equal(byHpDesc[byHpDesc.length - 1].horsepower, 829); // Solus GT

  // Top speed ascending
  const bySpeedAsc = engine.sort('topSpeed', 'asc');
  assert.equal(bySpeedAsc[0].topSpeed, 322); // Solus GT
  assert.equal(bySpeedAsc[bySpeedAsc.length - 1].topSpeed, 531); // Jesko Absolut

  // 0-100 km/h ascending (fastest acceleration first)
  const byAccelAsc = engine.sort('zeroToSixty', 'asc');
  assert.equal(byAccelAsc[0].zeroToSixty, 1.74); // Rimac
  assert.equal(byAccelAsc[1].zeroToSixty, 2.3); // Chiron
});

test('AutomotiveHypercarFilterEngine - setRange filters items within numerical boundaries', () => {
  const engine = new AutomotiveHypercarFilterEngine();

  // Price range between 3.0M and 3.5M
  engine.setRange('price', 3000000, 3500000);
  const midPrice = engine.apply();
  assert.equal(midPrice.length, 2); // Valkyrie ($3.2M) and Jesko ($3.4M)
  assert.ok(midPrice.every(c => c.price >= 3000000 && c.price <= 3500000));

  // Clear range
  engine.setRange('price', null, null);
  assert.equal(engine.apply().length, 6);
});

test('AutomotiveHypercarFilterEngine - reset completely restores default state and parameters', () => {
  const engine = new AutomotiveHypercarFilterEngine();
  engine.filterByKeyword('koenigsegg');
  engine.toggleTag('carbon');
  engine.sort('price', 'asc');

  assert.equal(engine.apply().length, 1);

  const resetItems = engine.reset();
  assert.equal(resetItems.length, 6);
  assert.equal(engine.getActiveTags().length, 0);
  assert.equal(engine.searchQuery, '');
  assert.equal(engine.sortField, 'horsepower');
  assert.equal(engine.sortDirection, 'desc');
});

test('AutomotiveHypercarFilterEngine - subscribe alerts callbacks on filter adjustments', () => {
  const engine = new AutomotiveHypercarFilterEngine();
  let callCount = 0;
  let lastState = null;

  const unsubscribe = engine.subscribe(state => {
    callCount++;
    lastState = state;
  });

  engine.filterByKeyword('Rimac');
  assert.equal(callCount, 1);
  assert.equal(lastState.query, 'rimac');
  assert.equal(lastState.count, 1);

  engine.toggleTag('electric');
  assert.equal(callCount, 2);
  assert.ok(lastState.tags.includes('electric'));

  unsubscribe();
  engine.clearTags();
  assert.equal(callCount, 2); // Unsubscribed, count doesn't increment
});
