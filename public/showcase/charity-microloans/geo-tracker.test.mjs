import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansGeoRadarEngine } from './geo-tracker.js';

describe('CharityMicroloansGeoRadarEngine', () => {
  it('initializes with default microfinance kiosks and Nairobi coordinates', () => {
    const engine = new CharityMicroloansGeoRadarEngine();
    assert.ok(Array.isArray(engine.nodes));
    assert.ok(engine.nodes.length >= 4);
    assert.equal(engine.userCoord.lat, -1.2864);
    assert.equal(engine.userCoord.lon, 36.8172);
  });

  it('calculates Haversine distance with spherical trigonometry accuracy', () => {
    const engine = new CharityMicroloansGeoRadarEngine();
    // Distance between identical points is 0
    assert.equal(engine.calculateHaversineDistance(0, 0, 0, 0), 0);

    // Distance across equator 1 degree ~ 111.19 km
    const dist1Deg = engine.calculateHaversineDistance(0, 0, 0, 1);
    assert.ok(dist1Deg > 110 && dist1Deg < 112);
  });

  it('handles boundary coordinate validations correctly', () => {
    const engine = new CharityMicroloansGeoRadarEngine();
    assert.throws(() => {
      engine.calculateHaversineDistance('invalid', 0, 10, 10);
    }, /Valid numerical coordinates required/);

    assert.throws(() => {
      engine.computeBearing(null, { lat: 10, lon: 10 });
    }, /Valid start and end coordinates required/);
  });

  it('computes forward bearing and compass headings', () => {
    const engine = new CharityMicroloansGeoRadarEngine();
    const north = engine.computeBearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 });
    assert.equal(north, 0);
    assert.equal(engine.getCompassDirection(north), 'N');

    const south = engine.computeBearing({ lat: 10, lon: 0 }, { lat: 0, lon: 0 });
    assert.equal(south, 180);
    assert.equal(engine.getCompassDirection(south), 'S');
  });

  it('sorts nodes by proximity and calculates field telemetry metrics', () => {
    const customNodes = [
      { id: 'far', name: 'Distant Center', lat: -2.5, lon: 38.0, status: 'active', officers: '2' },
      { id: 'close', name: 'Close Kiosk', lat: -1.29, lon: 36.82, status: 'active', officers: '4' }
    ];
    const engine = new CharityMicroloansGeoRadarEngine({ nodes: customNodes });
    const sorted = engine.sortNearestNodes({ lat: -1.2864, lon: 36.8172 });

    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 'close');
    assert.equal(sorted[1].id, 'far');
    assert.ok(sorted[0].distanceKm < sorted[1].distanceKm);
    assert.ok(typeof sorted[0].compass === 'string');
  });
});
