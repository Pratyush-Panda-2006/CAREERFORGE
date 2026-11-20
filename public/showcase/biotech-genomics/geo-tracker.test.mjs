import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsGeoRadarEngine } from './geo-tracker.js';

describe('BiotechGenomicsGeoRadarEngine', () => {
  it('instantiates with default genomic nodes and Earth spherical radius', () => {
    const engine = new BiotechGenomicsGeoRadarEngine();
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between Sanger and EMBL', () => {
    const engine = new BiotechGenomicsGeoRadarEngine();
    // Sanger (52.0805, 0.1873) and EMBL (52.0798, 0.1856) are closely situated (~0.14 km)
    const dist = engine.calculateHaversineDistance(52.0805, 0.1873, 52.0798, 0.1856);
    assert.ok(dist >= 0.1 && dist <= 0.2);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(52.0805, 0.1873, 52.0805, 0.1873), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new BiotechGenomicsGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 52.0805, lon: 0.1873 },
      { lat: 42.3629, lon: -71.0903 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new BiotechGenomicsGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 52.0805, lon: 0.1873 });

    assert.equal(sorted[0].name, 'Wellcome Sanger Institute');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new BiotechGenomicsGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    // 2 degrees across equator: 2 * (pi / 180) * 6371 ≈ 222.39 km
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error on invalid or missing user coordinates', () => {
    const engine = new BiotechGenomicsGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'not-a-number', lon: 0 });
    }, /Invalid user coordinates/);
  });
});
