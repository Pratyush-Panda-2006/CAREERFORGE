import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsGeoRadarEngine } from './geo-tracker.js';

describe('LegalSmartContractsGeoRadarEngine', () => {
  it('initializes with default arbitration chambers and Geneva origin', () => {
    const engine = new LegalSmartContractsGeoRadarEngine();
    assert.ok(Array.isArray(engine.nodes));
    assert.ok(engine.nodes.length >= 4);
    assert.equal(engine.userCoord.lat, 46.2044);
    assert.equal(engine.userCoord.lon, 6.1432);
  });

  it('calculates Haversine distance with spherical trigonometry accuracy', () => {
    const engine = new LegalSmartContractsGeoRadarEngine();
    // Distance between identical points is 0
    assert.equal(engine.calculateHaversineDistance(0, 0, 0, 0), 0);

    // Distance across equator 1 degree ~ 111.19 km
    const dist1Deg = engine.calculateHaversineDistance(0, 0, 0, 1);
    assert.ok(dist1Deg > 110 && dist1Deg < 112);
  });

  it('handles boundary coordinate validations correctly', () => {
    const engine = new LegalSmartContractsGeoRadarEngine();
    assert.throws(() => {
      engine.calculateHaversineDistance('invalid', 0, 10, 10);
    }, /Valid numerical coordinates required/);

    assert.throws(() => {
      engine.computeBearing(null, { lat: 10, lon: 10 });
    }, /Valid start and end coordinates required/);
  });

  it('computes forward bearing and compass headings', () => {
    const engine = new LegalSmartContractsGeoRadarEngine();
    const north = engine.computeBearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 });
    assert.equal(north, 0);
    assert.equal(engine.getCompassDirection(north), 'N');

    const south = engine.computeBearing({ lat: 10, lon: 0 }, { lat: 0, lon: 0 });
    assert.equal(south, 180);
    assert.equal(engine.getCompassDirection(south), 'S');
  });

  it('sorts nodes by proximity and calculates jurisdiction telemetry metrics', () => {
    const customNodes = [
      { id: 'far', name: 'Distant Court', lat: 1.3521, lon: 103.8198, jurisdiction: 'APAC', oracles: '10' },
      { id: 'close', name: 'Close Court', lat: 47.3769, lon: 8.5417, jurisdiction: 'Swiss', oracles: '20' }
    ];
    const engine = new LegalSmartContractsGeoRadarEngine({ nodes: customNodes });
    const sorted = engine.sortNearestNodes({ lat: 46.2044, lon: 6.1432 });

    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 'close');
    assert.equal(sorted[1].id, 'far');
    assert.ok(sorted[0].distanceKm < sorted[1].distanceKm);
    assert.ok(typeof sorted[0].compass === 'string');
  });
});
