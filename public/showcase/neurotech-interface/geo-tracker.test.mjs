import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceGeoRadarEngine } from './geo-tracker.js';

describe('NeurotechInterfaceGeoRadarEngine', () => {
  it('initializes with default neurotech facility locations', () => {
    const engine = new NeurotechInterfaceGeoRadarEngine();
    assert.ok(Array.isArray(engine.locations));
    assert.strictEqual(engine.locations.length, 5);
  });

  it('accurately computes Haversine great-circle distance between two coordinates', () => {
    const engine = new NeurotechInterfaceGeoRadarEngine();
    // Distance between SF (37.7749, -122.4194) and UCSF Surgical Wing (37.7631, -122.4580)
    const distance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7631, -122.4580);
    assert.ok(distance > 3.0 && distance < 4.5, `Expected ~3.6 km, got ${distance}`);

    // Identical coordinates return 0 km
    const zeroDistance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.strictEqual(zeroDistance, 0);
  });

  it('computes forward azimuth bearing within 0-360 degrees', () => {
    const engine = new NeurotechInterfaceGeoRadarEngine();
    const start = { lat: 37.7749, lon: -122.4194 };
    const end = { lat: 37.7631, lon: -122.4580 }; // Heading South-West
    const bearing = engine.computeBearing(start, end);

    assert.ok(bearing >= 0 && bearing <= 360);
    assert.ok(bearing > 230 && bearing < 265, `Expected ~247 degrees, got ${bearing}`);
  });

  it('sorts neurotech locations in ascending order by distance to user coordinates', () => {
    const engine = new NeurotechInterfaceGeoRadarEngine();
    const userCoord = { lat: 37.7812, lon: -122.4045 }; // Exact SOMA Neural Link
    const sorted = engine.sortNearestNodes(userCoord);

    assert.strictEqual(sorted.length, 5);
    assert.strictEqual(sorted[0].id, 'bci-neural-link');
    assert.strictEqual(sorted[0].distanceKm, 0);

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].distanceKm <= sorted[i + 1].distanceKm);
    }
  });

  it('throws helpful error when invalid user coordinates are supplied', () => {
    const engine = new NeurotechInterfaceGeoRadarEngine();
    assert.throws(() => engine.sortNearestNodes(null), /Invalid user coordinates/);
    assert.throws(() => engine.sortNearestNodes({ lat: 'invalid', lon: 10 }), /Invalid user coordinates/);
  });

  it('supports adding custom neural laboratory facilities to registry', () => {
    const engine = new NeurotechInterfaceGeoRadarEngine([]);
    engine.addLocation({
      id: 'custom-bci-hub',
      name: 'Custom Cortical Lab',
      lat: 34.0522,
      lon: -118.2437,
      category: 'Cortical Lab'
    });
    assert.strictEqual(engine.locations.length, 1);
    const sorted = engine.sortNearestNodes({ lat: 34.0522, lon: -118.2437 });
    assert.strictEqual(sorted[0].id, 'custom-bci-hub');
    assert.strictEqual(sorted[0].distanceKm, 0);
  });
});
