import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusGeoRadarEngine } from './geo-tracker.js';

describe('SmartIotNexusGeoRadarEngine', () => {
  it('initializes with default IoT gateway locations', () => {
    const engine = new SmartIotNexusGeoRadarEngine();
    assert.ok(Array.isArray(engine.locations));
    assert.strictEqual(engine.locations.length, 5);
  });

  it('accurately computes Haversine great-circle distance between two coordinates', () => {
    const engine = new SmartIotNexusGeoRadarEngine();
    // Distance between SF (37.7749, -122.4194) and Mount Sutro LoRaWAN (37.7587, -122.4529)
    const distance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7587, -122.4529);
    assert.ok(distance > 3.0 && distance < 4.5, `Expected ~3.5 km, got ${distance}`);

    // Identical coordinates return 0 km
    const zeroDistance = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.strictEqual(zeroDistance, 0);
  });

  it('computes forward azimuth bearing within 0-360 degrees', () => {
    const engine = new SmartIotNexusGeoRadarEngine();
    const start = { lat: 37.7749, lon: -122.4194 };
    const end = { lat: 37.7587, lon: -122.4529 }; // Heading South-West
    const bearing = engine.computeBearing(start, end);

    assert.ok(bearing >= 0 && bearing <= 360);
    assert.ok(bearing > 220 && bearing < 250, `Expected ~235 degrees, got ${bearing}`);
  });

  it('sorts IoT gateway locations in ascending order by distance to user coordinates', () => {
    const engine = new SmartIotNexusGeoRadarEngine();
    const userCoord = { lat: 37.7885, lon: -122.4072 }; // Exact Downtown Smart Grid Hub
    const sorted = engine.sortNearestNodes(userCoord);

    assert.strictEqual(sorted.length, 5);
    assert.strictEqual(sorted[0].id, 'iot-smart-grid');
    assert.strictEqual(sorted[0].distanceKm, 0);

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].distanceKm <= sorted[i + 1].distanceKm);
    }
  });

  it('throws helpful error when invalid user coordinates are supplied', () => {
    const engine = new SmartIotNexusGeoRadarEngine();
    assert.throws(() => engine.sortNearestNodes(null), /Invalid user coordinates/);
    assert.throws(() => engine.sortNearestNodes({ lat: 'invalid', lon: 10 }), /Invalid user coordinates/);
  });

  it('supports adding custom IoT sensor concentrators to registry', () => {
    const engine = new SmartIotNexusGeoRadarEngine([]);
    engine.addLocation({
      id: 'custom-hub',
      name: 'Custom Zigbee Coordinator',
      lat: 34.0522,
      lon: -118.2437,
      category: 'Zigbee Hub'
    });
    assert.strictEqual(engine.locations.length, 1);
    const sorted = engine.sortNearestNodes({ lat: 34.0522, lon: -118.2437 });
    assert.strictEqual(sorted[0].id, 'custom-hub');
    assert.strictEqual(sorted[0].distanceKm, 0);
  });
});
