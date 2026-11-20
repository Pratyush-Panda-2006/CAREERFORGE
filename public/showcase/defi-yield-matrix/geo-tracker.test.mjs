import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixGeoRadarEngine } from './geo-tracker.js';

describe('DefiYieldMatrixGeoRadarEngine', () => {
  it('initializes with default DeFi validator locations', () => {
    const engine = new DefiYieldMatrixGeoRadarEngine();
    assert.ok(Array.isArray(engine.locations));
    assert.strictEqual(engine.locations.length, 5);
  });

  it('accurately computes Haversine great-circle distance between two coordinates', () => {
    const engine = new DefiYieldMatrixGeoRadarEngine();
    // Distance between SF (37.7749, -122.4194) and Mission Bay Solana (37.7681, -122.3921)
    const distance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7681, -122.3921);
    assert.ok(distance > 2.0 && distance < 3.0, `Expected ~2.5 km, got ${distance}`);

    // Identical coordinates return 0 km
    const zeroDistance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.strictEqual(zeroDistance, 0);
  });

  it('computes forward azimuth bearing within 0-360 degrees', () => {
    const engine = new DefiYieldMatrixGeoRadarEngine();
    const start = { lat: 37.7749, lon: -122.4194 };
    const end = { lat: 37.7681, lon: -122.3921 }; // Heading South-East
    const bearing = engine.computeBearing(start, end);

    assert.ok(bearing >= 0 && bearing <= 360);
    assert.ok(bearing > 95 && bearing < 125, `Expected ~110 degrees, got ${bearing}`);
  });

  it('sorts validator locations in ascending order by distance to user coordinates', () => {
    const engine = new DefiYieldMatrixGeoRadarEngine();
    const userCoord = { lat: 37.7749, lon: -122.4194 }; // Exact Silicon Valley ETH Node
    const sorted = engine.sortNearestNodes(userCoord);

    assert.strictEqual(sorted.length, 5);
    assert.strictEqual(sorted[0].id, 'defi-eth-validator');
    assert.strictEqual(sorted[0].distanceKm, 0);

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].distanceKm <= sorted[i + 1].distanceKm);
    }
  });

  it('throws helpful error when invalid user coordinates are supplied', () => {
    const engine = new DefiYieldMatrixGeoRadarEngine();
    assert.throws(() => engine.sortNearestNodes(null), /Invalid user coordinates/);
    assert.throws(() => engine.sortNearestNodes({ lat: 'invalid', lon: 10 }), /Invalid user coordinates/);
  });

  it('supports adding custom RPC validator relay nodes to registry', () => {
    const engine = new DefiYieldMatrixGeoRadarEngine([]);
    engine.addLocation({
      id: 'custom-node',
      name: 'Custom Base Sequencer',
      lat: 34.0522,
      lon: -118.2437,
      category: 'OP Stack Sequencer'
    });
    assert.strictEqual(engine.locations.length, 1);
    const sorted = engine.sortNearestNodes({ lat: 34.0522, lon: -118.2437 });
    assert.strictEqual(sorted[0].id, 'custom-node');
    assert.strictEqual(sorted[0].distanceKm, 0);
  });
});
