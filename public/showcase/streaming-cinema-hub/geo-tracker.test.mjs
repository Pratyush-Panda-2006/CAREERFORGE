import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubGeoRadarEngine } from './geo-tracker.js';

describe('StreamingCinemaHubGeoRadarEngine', () => {
  it('initializes with default cinema venue locations', () => {
    const engine = new StreamingCinemaHubGeoRadarEngine();
    assert.ok(Array.isArray(engine.locations));
    assert.strictEqual(engine.locations.length, 5);
  });

  it('accurately computes Haversine great-circle distance between two coordinates', () => {
    const engine = new StreamingCinemaHubGeoRadarEngine();
    // Distance between Metreon IMAX (37.7844, -122.4034) and Castro Cinema (37.7620, -122.4350)
    const distance = engine.calculateHaversineDistance(37.7844, -122.4034, 37.7620, -122.4350);
    assert.ok(distance > 3.4 && distance < 4.0, `Expected ~3.7 km, got ${distance}`);

    // Identical coordinates return 0 km
    const zeroDistance = engine.calculateHaversineDistance(37.7844, -122.4034, 37.7844, -122.4034);
    assert.strictEqual(zeroDistance, 0);
  });

  it('computes forward azimuth bearing within 0-360 degrees', () => {
    const engine = new StreamingCinemaHubGeoRadarEngine();
    const start = { lat: 37.7844, lon: -122.4034 };
    const end = { lat: 37.7620, lon: -122.4350 };
    const bearing = engine.computeBearing(start, end);

    assert.ok(bearing >= 0 && bearing <= 360);
    assert.ok(bearing > 220 && bearing < 245, `Expected ~230 degrees, got ${bearing}`);
  });

  it('sorts cinema locations in ascending order by distance to user coordinates', () => {
    const engine = new StreamingCinemaHubGeoRadarEngine();
    const userCoord = { lat: 37.7844, lon: -122.4034 };
    const sorted = engine.sortNearestNodes(userCoord);

    assert.strictEqual(sorted.length, 5);
    assert.strictEqual(sorted[0].id, 'cinema-imax');
    assert.strictEqual(sorted[0].distanceKm, 0);

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].distanceKm <= sorted[i + 1].distanceKm);
    }
  });

  it('throws helpful error when invalid user coordinates are supplied', () => {
    const engine = new StreamingCinemaHubGeoRadarEngine();
    assert.throws(() => engine.sortNearestNodes(null), /Invalid user coordinates/);
    assert.throws(() => engine.sortNearestNodes({ lat: 'invalid', lon: 10 }), /Invalid user coordinates/);
  });

  it('supports adding custom cinema venues to location registry', () => {
    const engine = new StreamingCinemaHubGeoRadarEngine([]);
    engine.addLocation({
      id: 'custom-cinema',
      name: 'Custom Sunset Drive-In',
      lat: 34.0522,
      lon: -118.2437,
      category: 'Drive-In'
    });
    assert.strictEqual(engine.locations.length, 1);
    const sorted = engine.sortNearestNodes({ lat: 34.0522, lon: -118.2437 });
    assert.strictEqual(sorted[0].id, 'custom-cinema');
    assert.strictEqual(sorted[0].distanceKm, 0);
  });
});
