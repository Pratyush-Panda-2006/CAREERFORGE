import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenGeoRadarEngine } from './geo-tracker.js';

describe('PetAdoptionHavenGeoRadarEngine', () => {
  it('initializes with default pet rescue sanctuaries and coordinates', () => {
    const engine = new PetAdoptionHavenGeoRadarEngine();
    assert.ok(Array.isArray(engine.nodes));
    assert.ok(engine.nodes.length >= 4);
    assert.equal(engine.userCoord.lat, 34.0522);
    assert.equal(engine.userCoord.lon, -118.2437);
  });

  it('calculates Haversine distance with spherical trigonometry accuracy', () => {
    const engine = new PetAdoptionHavenGeoRadarEngine();
    // Distance between identical points is 0
    assert.equal(engine.calculateHaversineDistance(0, 0, 0, 0), 0);

    // Distance across equator 1 degree ~ 111.19 km
    const dist1Deg = engine.calculateHaversineDistance(0, 0, 0, 1);
    assert.ok(dist1Deg > 110 && dist1Deg < 112);
  });

  it('handles boundary coordinate validations correctly', () => {
    const engine = new PetAdoptionHavenGeoRadarEngine();
    assert.throws(() => {
      engine.calculateHaversineDistance('invalid', 0, 10, 10);
    }, /Valid numerical coordinates required/);

    assert.throws(() => {
      engine.computeBearing(null, { lat: 10, lon: 10 });
    }, /Valid start and end coordinates required/);
  });

  it('computes forward bearing and compass headings', () => {
    const engine = new PetAdoptionHavenGeoRadarEngine();
    const north = engine.computeBearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 });
    assert.equal(north, 0);
    assert.equal(engine.getCompassDirection(north), 'N');

    const south = engine.computeBearing({ lat: 10, lon: 0 }, { lat: 0, lon: 0 });
    assert.equal(south, 180);
    assert.equal(engine.getCompassDirection(south), 'S');
  });

  it('sorts nodes by proximity and calculates rescue telemetry metrics', () => {
    const customNodes = [
      { id: 'far', name: 'Distant Oasis', lat: 35.0, lon: -117.0, status: 'open', capacity: '10' },
      { id: 'close', name: 'Close Haven', lat: 34.055, lon: -118.245, status: 'open', capacity: '20' }
    ];
    const engine = new PetAdoptionHavenGeoRadarEngine({ nodes: customNodes });
    const sorted = engine.sortNearestNodes({ lat: 34.0522, lon: -118.2437 });

    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 'close');
    assert.equal(sorted[1].id, 'far');
    assert.ok(sorted[0].distanceKm < sorted[1].distanceKm);
    assert.ok(typeof sorted[0].compass === 'string');
  });
});
