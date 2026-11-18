import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioGeoRadarEngine } from './geo-tracker.js';

describe('MusicDawStudioGeoRadarEngine', () => {
  it('initializes with default recording studios and London coordinates', () => {
    const engine = new MusicDawStudioGeoRadarEngine();
    assert.ok(Array.isArray(engine.nodes));
    assert.ok(engine.nodes.length >= 4);
    assert.equal(engine.userCoord.lat, 51.5074);
    assert.equal(engine.userCoord.lon, -0.1278);
  });

  it('calculates Haversine distance with spherical trigonometry accuracy', () => {
    const engine = new MusicDawStudioGeoRadarEngine();
    // Distance between identical points is 0
    assert.equal(engine.calculateHaversineDistance(0, 0, 0, 0), 0);

    // Distance across equator 1 degree ~ 111.19 km
    const dist1Deg = engine.calculateHaversineDistance(0, 0, 0, 1);
    assert.ok(dist1Deg > 110 && dist1Deg < 112);
  });

  it('handles boundary coordinate validations correctly', () => {
    const engine = new MusicDawStudioGeoRadarEngine();
    assert.throws(() => {
      engine.calculateHaversineDistance('invalid', 0, 10, 10);
    }, /Valid numerical coordinates required/);

    assert.throws(() => {
      engine.computeBearing(null, { lat: 10, lon: 10 });
    }, /Valid start and end coordinates required/);
  });

  it('computes forward bearing and compass headings', () => {
    const engine = new MusicDawStudioGeoRadarEngine();
    const north = engine.computeBearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 });
    assert.equal(north, 0);
    assert.equal(engine.getCompassDirection(north), 'N');

    const south = engine.computeBearing({ lat: 10, lon: 0 }, { lat: 0, lon: 0 });
    assert.equal(south, 180);
    assert.equal(engine.getCompassDirection(south), 'S');
  });

  it('sorts nodes by proximity and calculates studio telemetry metrics', () => {
    const customNodes = [
      { id: 'far', name: 'Distant Studio', lat: 53.0, lon: -1.0, status: 'open', gear: 'Analog' },
      { id: 'close', name: 'Close Studio', lat: 51.51, lon: -0.13, status: 'live', gear: 'Digital' }
    ];
    const engine = new MusicDawStudioGeoRadarEngine({ nodes: customNodes });
    const sorted = engine.sortNearestNodes({ lat: 51.5074, lon: -0.1278 });

    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 'close');
    assert.equal(sorted[1].id, 'far');
    assert.ok(sorted[0].distanceKm < sorted[1].distanceKm);
    assert.ok(typeof sorted[0].compass === 'string');
  });
});
