import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubGeoRadarEngine } from './geo-tracker.js';

describe('VrMetaverseHubGeoRadarEngine', () => {
  it('initializes with default metaverse realms and coordinates', () => {
    const engine = new VrMetaverseHubGeoRadarEngine();
    assert.ok(Array.isArray(engine.nodes));
    assert.ok(engine.nodes.length >= 4);
    assert.equal(engine.userCoord.lat, 37.7749);
    assert.equal(engine.userCoord.lon, -122.4194);
  });

  it('calculates Haversine distance with spherical trigonometry accuracy', () => {
    const engine = new VrMetaverseHubGeoRadarEngine();
    // Distance between identical points is 0
    assert.equal(engine.calculateHaversineDistance(0, 0, 0, 0), 0);

    // Distance across equator 1 degree ~ 111.19 km
    const dist1Deg = engine.calculateHaversineDistance(0, 0, 0, 1);
    assert.ok(dist1Deg > 110 && dist1Deg < 112);
  });

  it('handles boundary coordinate validations correctly', () => {
    const engine = new VrMetaverseHubGeoRadarEngine();
    assert.throws(() => {
      engine.calculateHaversineDistance('invalid', 0, 10, 10);
    }, /Valid numerical coordinates required/);

    assert.throws(() => {
      engine.computeBearing(null, { lat: 10, lon: 10 });
    }, /Valid start and end coordinates required/);
  });

  it('computes forward bearing and compass headings', () => {
    const engine = new VrMetaverseHubGeoRadarEngine();
    const north = engine.computeBearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 });
    assert.equal(north, 0);
    assert.equal(engine.getCompassDirection(north), 'N');

    const south = engine.computeBearing({ lat: 10, lon: 0 }, { lat: 0, lon: 0 });
    assert.equal(south, 180);
    assert.equal(engine.getCompassDirection(south), 'S');
  });

  it('sorts nodes by proximity and calculates telemetry metrics', () => {
    const customNodes = [
      { id: 'far', name: 'Distant Realm', lat: 39.0, lon: -120.0, status: 'calm' },
      { id: 'close', name: 'Close Realm', lat: 37.776, lon: -122.418, status: 'populated' }
    ];
    const engine = new VrMetaverseHubGeoRadarEngine({ nodes: customNodes });
    const sorted = engine.sortNearestNodes({ lat: 37.7749, lon: -122.4194 });

    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 'close');
    assert.equal(sorted[1].id, 'far');
    assert.ok(sorted[0].distanceKm < sorted[1].distanceKm);
    assert.ok(typeof sorted[0].compass === 'string');
  });

  it('updates location and notifies observers', () => {
    const engine = new VrMetaverseHubGeoRadarEngine();
    let updatedCoord = null;
    engine.subscribe((coord) => {
      updatedCoord = coord;
    });

    engine.setUserCoord(37.79, -122.41);
    assert.deepEqual(updatedCoord, { lat: 37.79, lon: -122.41 });
  });
});
