import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterGeoRadarEngine } from './geo-tracker.js';

describe('AerospaceOrbiterGeoRadarEngine', () => {
  it('instantiates with default spaceport facilities and Earth spherical radius', () => {
    const engine = new AerospaceOrbiterGeoRadarEngine();
    assert.equal(engine.name, 'AerospaceOrbiterGeoRadarEngine');
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between Cape Canaveral and Kourou', () => {
    const engine = new AerospaceOrbiterGeoRadarEngine();
    // Cape Canaveral (28.5729, -80.6490) to Kourou (5.2390, -52.7680) is ~3919 km
    const dist = engine.calculateHaversineDistance(28.5729, -80.6490, 5.2390, -52.7680);
    assert.ok(dist >= 3900 && dist <= 3950);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(28.5729, -80.6490, 28.5729, -80.6490), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new AerospaceOrbiterGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 28.5729, lon: -80.6490 },
      { lat: 5.2390, lon: -52.7680 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new AerospaceOrbiterGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 28.5729, lon: -80.6490 });

    assert.equal(sorted[0].name, 'Kennedy Space Center LC-39A (Cape Canaveral)');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new AerospaceOrbiterGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error when invalid coordinate object is supplied to sortNearestNodes', () => {
    const engine = new AerospaceOrbiterGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'invalid', lon: 10 });
    }, /Invalid user coordinates/);
  });
});
