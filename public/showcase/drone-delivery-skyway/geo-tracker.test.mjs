import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayGeoRadarEngine } from './geo-tracker.js';

describe('DroneDeliverySkywayGeoRadarEngine', () => {
  it('initializes with default vertiports and Seattle coordinates', () => {
    const engine = new DroneDeliverySkywayGeoRadarEngine();
    assert.ok(Array.isArray(engine.nodes));
    assert.ok(engine.nodes.length >= 4);
    assert.equal(engine.userCoord.lat, 47.6062);
    assert.equal(engine.userCoord.lon, -122.3321);
  });

  it('calculates Haversine distance with spherical trigonometry accuracy', () => {
    const engine = new DroneDeliverySkywayGeoRadarEngine();
    // Distance between identical points is 0
    assert.equal(engine.calculateHaversineDistance(0, 0, 0, 0), 0);

    // Distance across equator 1 degree ~ 111.19 km
    const dist1Deg = engine.calculateHaversineDistance(0, 0, 0, 1);
    assert.ok(dist1Deg > 110 && dist1Deg < 112);
  });

  it('handles boundary coordinate validations correctly', () => {
    const engine = new DroneDeliverySkywayGeoRadarEngine();
    assert.throws(() => {
      engine.calculateHaversineDistance('invalid', 0, 10, 10);
    }, /Valid numerical coordinates required/);

    assert.throws(() => {
      engine.computeBearing(null, { lat: 10, lon: 10 });
    }, /Valid start and end coordinates required/);
  });

  it('computes forward bearing and compass headings', () => {
    const engine = new DroneDeliverySkywayGeoRadarEngine();
    const north = engine.computeBearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 });
    assert.equal(north, 0);
    assert.equal(engine.getCompassDirection(north), 'N');

    const south = engine.computeBearing({ lat: 10, lon: 0 }, { lat: 0, lon: 0 });
    assert.equal(south, 180);
    assert.equal(engine.getCompassDirection(south), 'S');
  });

  it('sorts nodes by proximity and calculates airspace telemetry metrics', () => {
    const customNodes = [
      { id: 'far', name: 'Distant Waypoint', lat: 48.0, lon: -121.0, status: 'active', pads: '2 bays' },
      { id: 'close', name: 'Close Skyport', lat: 47.61, lon: -122.34, status: 'active', pads: '6 bays' }
    ];
    const engine = new DroneDeliverySkywayGeoRadarEngine({ nodes: customNodes });
    const sorted = engine.sortNearestNodes({ lat: 47.6062, lon: -122.3321 });

    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 'close');
    assert.equal(sorted[1].id, 'far');
    assert.ok(sorted[0].distanceKm < sorted[1].distanceKm);
    assert.ok(typeof sorted[0].compass === 'string');
  });
});
