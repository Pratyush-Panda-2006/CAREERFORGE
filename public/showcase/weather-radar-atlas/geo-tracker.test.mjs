import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasGeoRadarEngine } from './geo-tracker.js';

describe('WeatherRadarAtlasGeoRadarEngine', () => {
  it('initializes with default weather radar station locations', () => {
    const engine = new WeatherRadarAtlasGeoRadarEngine();
    assert.ok(Array.isArray(engine.locations));
    assert.strictEqual(engine.locations.length, 5);
  });

  it('accurately computes Haversine great-circle distance between two coordinates', () => {
    const engine = new WeatherRadarAtlasGeoRadarEngine();
    // Distance between SF (37.7749, -122.4194) and KMUX Mount Umunhum (37.1569, -121.8986)
    const distance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.1569, -121.8986);
    assert.ok(distance > 70 && distance < 85, `Expected ~82 km, got ${distance}`);

    // Identical coordinates return 0 km
    const zeroDistance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.strictEqual(zeroDistance, 0);
  });

  it('computes forward azimuth bearing within 0-360 degrees', () => {
    const engine = new WeatherRadarAtlasGeoRadarEngine();
    const start = { lat: 37.7749, lon: -122.4194 };
    const end = { lat: 37.1569, lon: -121.8986 }; // Heading South-East
    const bearing = engine.computeBearing(start, end);

    assert.ok(bearing >= 0 && bearing <= 360);
    assert.ok(bearing > 130 && bearing < 160, `Expected ~145 degrees, got ${bearing}`);
  });

  it('sorts weather radar locations in ascending order by distance to user coordinates', () => {
    const engine = new WeatherRadarAtlasGeoRadarEngine();
    const userCoord = { lat: 37.6190, lon: -122.3748 }; // Exact SFO TDWR
    const sorted = engine.sortNearestNodes(userCoord);

    assert.strictEqual(sorted.length, 5);
    assert.strictEqual(sorted[0].id, 'rad-sfo-terminal');
    assert.strictEqual(sorted[0].distanceKm, 0);

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].distanceKm <= sorted[i + 1].distanceKm);
    }
  });

  it('throws helpful error when invalid user coordinates are supplied', () => {
    const engine = new WeatherRadarAtlasGeoRadarEngine();
    assert.throws(() => engine.sortNearestNodes(null), /Invalid user coordinates/);
    assert.throws(() => engine.sortNearestNodes({ lat: 'invalid', lon: 10 }), /Invalid user coordinates/);
  });

  it('supports adding custom meteorological radar towers to registry', () => {
    const engine = new WeatherRadarAtlasGeoRadarEngine([]);
    engine.addLocation({
      id: 'custom-radar',
      name: 'Custom Doppler Node',
      lat: 34.0522,
      lon: -118.2437,
      category: 'Doppler Radar'
    });
    assert.strictEqual(engine.locations.length, 1);
    const sorted = engine.sortNearestNodes({ lat: 34.0522, lon: -118.2437 });
    assert.strictEqual(sorted[0].id, 'custom-radar');
    assert.strictEqual(sorted[0].distanceKm, 0);
  });
});
