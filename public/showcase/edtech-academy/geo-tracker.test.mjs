import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyGeoRadarEngine } from './geo-tracker.js';

describe('EdtechAcademyGeoRadarEngine', () => {
  it('instantiates with default academic campuses and Earth spherical radius', () => {
    const engine = new EdtechAcademyGeoRadarEngine();
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between Oxford and Zürich', () => {
    const engine = new EdtechAcademyGeoRadarEngine();
    // Oxford (51.7520, -1.2577) to Zürich (47.3769, 8.5417) is ~870 km
    const dist = engine.calculateHaversineDistance(51.7520, -1.2577, 47.3769, 8.5417);
    assert.ok(dist >= 850 && dist <= 900);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(51.7520, -1.2577, 51.7520, -1.2577), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new EdtechAcademyGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 51.7520, lon: -1.2577 },
      { lat: 42.3601, lon: -71.0942 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new EdtechAcademyGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 51.7520, lon: -1.2577 });

    assert.equal(sorted[0].name, 'Oxford Academic Institute (Oxford, UK)');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new EdtechAcademyGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error when invalid coordinate object is supplied to sortNearestNodes', () => {
    const engine = new EdtechAcademyGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'invalid', lon: 10 });
    }, /Invalid user coordinates/);
  });
});
