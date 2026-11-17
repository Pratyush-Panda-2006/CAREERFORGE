import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsFilterEngine } from './search-filter.js';

const testShipments = [
  { id: 1, trackingNumber: 'SC-98214-US', origin: 'Los Angeles Port', destination: 'Chicago Distribution Hub', carrier: 'Pacific Rail Express', weightKg: 14200, etaHours: 24, status: 'IN_TRANSIT', tags: ['intermodal', 'heavy-freight', 'priority'] },
  { id: 2, trackingNumber: 'SC-44012-DE', origin: 'Frankfurt Air Cargo', destination: 'London Heathrow Gateway', carrier: 'AeroFreight Cargo', weightKg: 850, etaHours: 4, status: 'CUSTOMS', tags: ['air-cargo', 'express', 'international'] },
  { id: 3, trackingNumber: 'SC-11983-JP', origin: 'Tokyo Yokohama Pier', destination: 'Singapore Mega Port', carrier: 'Oceanic Wave Lines', weightKg: 42000, etaHours: 72, status: 'IN_TRANSIT', tags: ['sea-freight', 'cold-chain', 'international'] },
  { id: 4, trackingNumber: 'SC-66321-SG', origin: 'Singapore Jurong East', destination: 'Kuala Lumpur Central', carrier: 'Overland Logistics', weightKg: 3400, etaHours: 12, status: 'OUT_FOR_DELIVERY', tags: ['express', 'priority', 'last-mile'] },
  { id: 5, trackingNumber: 'SC-77091-NL', origin: 'Rotterdam Terminal', destination: 'Antwerp Gateway', carrier: 'Rhine Barge Line', weightKg: 18500, etaHours: 18, status: 'DELIVERED', tags: ['barge', 'intermodal', 'eco-friendly'] }
];

test('Case-insensitive search by tracking number, origin, destination and carrier', () => {
  const engine = new SupplyChainLogisticsFilterEngine(testShipments);
  const results = engine.filterByKeyword('heathrow');
  assert.equal(results.length, 1);
  assert.equal(results[0].trackingNumber, 'SC-44012-DE');

  const railResults = engine.filterByKeyword('PACIFIC RAIL');
  assert.equal(railResults.length, 1);
  assert.equal(railResults[0].id, 1);
});

test('Compound tag filtering narrows shipments matching all active tags', () => {
  const engine = new SupplyChainLogisticsFilterEngine(testShipments);
  engine.toggleTag('express');
  let results = engine.getFilteredAndSorted();
  assert.equal(results.length, 2);

  engine.toggleTag('international');
  results = engine.getFilteredAndSorted();
  assert.equal(results.length, 1);
  assert.equal(results[0].trackingNumber, 'SC-44012-DE');

  // Untoggle tag
  engine.toggleTag('international');
  assert.equal(engine.getFilteredAndSorted().length, 2);
});

test('Multi-column sorting handles numeric weight/eta and alphabetical tracking', () => {
  const engine = new SupplyChainLogisticsFilterEngine(testShipments);

  // Numeric weight desc
  engine.sort('weightKg', 'desc');
  const sortedWeight = engine.getFilteredAndSorted();
  assert.equal(sortedWeight[0].weightKg, 42000);
  assert.equal(sortedWeight[sortedWeight.length - 1].weightKg, 850);

  // ETA asc
  engine.sort('etaHours', 'asc');
  const sortedEta = engine.getFilteredAndSorted();
  assert.equal(sortedEta[0].etaHours, 4);
  assert.equal(sortedEta[sortedEta.length - 1].etaHours, 72);
});

test('Combined keyword query, tag filtering, and sorting', () => {
  const engine = new SupplyChainLogisticsFilterEngine(testShipments);
  engine.filterByKeyword('Transit');
  engine.toggleTag('international');
  engine.sort('weightKg', 'desc');
  const results = engine.getFilteredAndSorted();
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 3);
});

test('Reset filters restores full consignment list with default settings', () => {
  const engine = new SupplyChainLogisticsFilterEngine(testShipments);
  engine.filterByKeyword('Air');
  engine.toggleTag('express');
  assert.equal(engine.getFilteredAndSorted().length, 1);

  const resetResults = engine.resetFilters();
  assert.equal(resetResults.length, 5);
  assert.equal(engine.getActiveTags().length, 0);
  assert.equal(engine.searchQuery, '');
});
