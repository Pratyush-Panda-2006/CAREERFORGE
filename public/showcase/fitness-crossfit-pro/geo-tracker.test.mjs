import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProGeoRadarEngine } from './geo-tracker.js';

describe('FitnessCrossfitProGeoRadarEngine', () => {
  it('initializes with default CrossFit boxes and locations', () => {
    const engine = new FitnessCrossfitProGeoRadarEngine();
    assert.ok(Array.isArray(engine.locations));
    assert.strictEqual(engine.locations.length, 5);
  });

  it('accurately computes Haversine great-circle distance between two coordinates', () => {
    const engine = new FitnessCrossfitProGeoRadarEngine();
    // Distance between Downtown CrossFit Arena (37.7749, -122.4194) and Golden Gate Studio (37.8024, -122.4058)
    const distance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.8024, -122.4058);
    assert.ok(distance > 3.0 && distance < 3.5, `Expected ~3.27 km, got ${distance}`);

    // Identical coordinates return 0 km
    const zeroDistance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.strictEqual(zeroDistance, 0);
  });

  it('computes forward azimuth bearing within 0-360 degrees', () => {
    const engine = new FitnessCrossfitProGeoRadarEngine();
    const start = { lat: 37.7749, lon: -122.4194 };
    const end = { lat: 37.8024, lon: -122.4058 }; // Heading roughly North-East
    const bearing = engine.computeBearing(start, end);

    assert.ok(bearing >= 0 && bearing <= 360);
    assert.ok(bearing > 15 && bearing < 35, `Expected ~21 degrees, got ${bearing}`);
  });

  it('sorts nodes in ascending order by distance to user coordinates', () => {
    const engine = new FitnessCrossfitProGeoRadarEngine();
    const userCoord = { lat: 37.7749, lon: -122.4194 };
    const sorted = engine.sortNearestNodes(userCoord);

    assert.strictEqual(sorted.length, 5);
    assert.strictEqual(sorted[0].id, 'wod-hq');
    assert.strictEqual(sorted[0].distanceKm, 0);

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].distanceKm <= sorted[i + 1].distanceKm);
    }
  });

  it('throws helpful error when invalid user coordinates are supplied', () => {
    const engine = new FitnessCrossfitProGeoRadarEngine();
    assert.throws(() => engine.sortNearestNodes(null), /Invalid user coordinates/);
    assert.throws(() => engine.sortNearestNodes({ lat: 'invalid', lon: 10 }), /Invalid user coordinates/);
  });

  it('supports adding custom training hubs to location registry', () => {
    const engine = new FitnessCrossfitProGeoRadarEngine([]);
    engine.addLocation({
      id: 'custom-box',
      name: 'Custom Garage Gym',
      lat: 34.0522,
      lon: -118.2437,
      category: 'Garage Gym'
    });
    assert.strictEqual(engine.locations.length, 1);
    const sorted = engine.sortNearestNodes({ lat: 34.0522, lon: -118.2437 });
    assert.strictEqual(sorted[0].id, 'custom-box');
    assert.strictEqual(sorted[0].distanceKm, 0);
  });
});
