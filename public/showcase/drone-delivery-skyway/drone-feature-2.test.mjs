import test from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayFilterEngine, SAMPLE_DRONE_DATA } from './search-filter.js';

test('DroneDeliverySkywayFilterEngine - case-insensitive keyword search', () => {
  const engine = new DroneDeliverySkywayFilterEngine(SAMPLE_DRONE_DATA);
  const medical = engine.filterByKeyword('medical');
  assert.equal(medical.length, 1);
  assert.equal(medical[0].corridor, 'Hospital Sector 4');

  const upperQuery = engine.filterByKeyword('HARBOR');
  assert.equal(upperQuery.length, 1);
  assert.equal(upperQuery[0].name, 'Skyway-Delta Harbor Patrol');
});

test('DroneDeliverySkywayFilterEngine - compound tag filtering', () => {
  const engine = new DroneDeliverySkywayFilterEngine(SAMPLE_DRONE_DATA);
  engine.toggleTag('active');
  let activeDrones = engine.getFilteredAndSorted();
  assert.equal(activeDrones.length, 3);

  engine.toggleTag('metro');
  let activeAndMetro = engine.getFilteredAndSorted();
  assert.equal(activeAndMetro.length, 1);
  assert.equal(activeAndMetro[0].name, 'Skyway-Alpha Metro Transit');

  // Untoggle
  engine.toggleTag('metro');
  assert.equal(engine.getFilteredAndSorted().length, 3);
});

test('DroneDeliverySkywayFilterEngine - multi-column ascending/descending sorting precision', () => {
  const engine = new DroneDeliverySkywayFilterEngine(SAMPLE_DRONE_DATA);

  // Battery ascending
  engine.sort('batteryPct', 'asc');
  let sortedBatteryAsc = engine.getFilteredAndSorted();
  assert.equal(sortedBatteryAsc[0].batteryPct, 15);
  assert.equal(sortedBatteryAsc[sortedBatteryAsc.length - 1].batteryPct, 94);

  // Battery descending
  engine.sort('batteryPct', 'desc');
  let sortedBatteryDesc = engine.getFilteredAndSorted();
  assert.equal(sortedBatteryDesc[0].batteryPct, 94);
  assert.equal(sortedBatteryDesc[sortedBatteryDesc.length - 1].batteryPct, 15);

  // Name alphabetical
  engine.sort('name', 'asc');
  let sortedNameAsc = engine.getFilteredAndSorted();
  assert.equal(sortedNameAsc[0].name, 'Skyway-Alpha Metro Transit');
});

test('DroneDeliverySkywayFilterEngine - combined search, tag, and sort', () => {
  const engine = new DroneDeliverySkywayFilterEngine(SAMPLE_DRONE_DATA);
  engine.filterByKeyword('Skyway');
  engine.toggleTag('active');
  engine.sort('batteryPct', 'desc');

  const results = engine.getFilteredAndSorted();
  assert.ok(results.length > 0);
  for (let i = 0; i < results.length - 1; i++) {
    assert.ok(results[i].batteryPct >= results[i + 1].batteryPct);
  }
});

test('DroneDeliverySkywayFilterEngine - reset filters restores complete dataset', () => {
  const engine = new DroneDeliverySkywayFilterEngine(SAMPLE_DRONE_DATA);
  engine.filterByKeyword('nonexistent-route');
  assert.equal(engine.getFilteredAndSorted().length, 0);

  engine.resetFilters();
  assert.equal(engine.getFilteredAndSorted().length, SAMPLE_DRONE_DATA.length);
});
