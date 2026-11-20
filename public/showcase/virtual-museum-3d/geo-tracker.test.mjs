import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dGeoRadarEngine } from './geo-tracker.js';

describe('VirtualMuseum3dGeoRadarEngine', () => {
  it('initializes with default museum pavilion locations', () => {
    const engine = new VirtualMuseum3dGeoRadarEngine();
    assert.ok(Array.isArray(engine.locations));
    assert.strictEqual(engine.locations.length, 5);
  });

  it('accurately computes Haversine great-circle distance between two coordinates', () => {
    const engine = new VirtualMuseum3dGeoRadarEngine();
    // Distance between SF (37.7749, -122.4194) and Palace of Fine Arts (37.8029, -122.4484)
    const distance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.8029, -122.4484);
    assert.ok(distance > 3.5 && distance < 4.5, `Expected ~4.0 km, got ${distance}`);

    // Identical coordinates return 0 km
    const zeroDistance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.strictEqual(zeroDistance, 0);
  });

  it('computes forward azimuth bearing within 0-360 degrees', () => {
    const engine = new VirtualMuseum3dGeoRadarEngine();
    const start = { lat: 37.7749, lon: -122.4194 };
    const end = { lat: 37.8029, lon: -122.4484 }; // Heading North-West
    const bearing = engine.computeBearing(start, end);

    assert.ok(bearing >= 0 && bearing <= 360);
    assert.ok(bearing > 310 && bearing < 340, `Expected ~324 degrees, got ${bearing}`);
  });

  it('sorts museum pavilion locations in ascending order by distance to user coordinates', () => {
    const engine = new VirtualMuseum3dGeoRadarEngine();
    const userCoord = { lat: 37.7857, lon: -122.4011 }; // Exact SFMOMA
    const sorted = engine.sortNearestNodes(userCoord);

    assert.strictEqual(sorted.length, 5);
    assert.strictEqual(sorted[0].id, 'mus-sfmoma');
    assert.strictEqual(sorted[0].distanceKm, 0);

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].distanceKm <= sorted[i + 1].distanceKm);
    }
  });

  it('throws helpful error when invalid user coordinates are supplied', () => {
    const engine = new VirtualMuseum3dGeoRadarEngine();
    assert.throws(() => engine.sortNearestNodes(null), /Invalid user coordinates/);
    assert.throws(() => engine.sortNearestNodes({ lat: 'invalid', lon: 10 }), /Invalid user coordinates/);
  });

  it('supports adding custom museum exhibition wings to registry', () => {
    const engine = new VirtualMuseum3dGeoRadarEngine([]);
    engine.addLocation({
      id: 'custom-wing',
      name: 'Custom Holographic Gallery',
      lat: 34.0522,
      lon: -118.2437,
      category: 'Holographic Wing'
    });
    assert.strictEqual(engine.locations.length, 1);
    const sorted = engine.sortNearestNodes({ lat: 34.0522, lon: -118.2437 });
    assert.strictEqual(sorted[0].id, 'custom-wing');
    assert.strictEqual(sorted[0].distanceKm, 0);
  });
});
