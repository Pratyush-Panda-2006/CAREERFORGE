import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeGeoRadarEngine } from './geo-tracker.js';

describe('QuantumForgeGeoRadarEngine', () => {
  it('instantiates with default quantum foundry nodes and Earth spherical radius', () => {
    const engine = new QuantumForgeGeoRadarEngine();
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between Yorktown and Santa Barbara', () => {
    const engine = new QuantumForgeGeoRadarEngine();
    // Yorktown Heights (41.2728, -73.8055) to Santa Barbara (34.4140, -119.8489) ~ 3980 km
    const dist = engine.calculateHaversineDistance(41.2728, -73.8055, 34.4140, -119.8489);
    assert.ok(dist >= 3900 && dist <= 4100);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(41.2728, -73.8055, 41.2728, -73.8055), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new QuantumForgeGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 41.2728, lon: -73.8055 },
      { lat: 51.4543, lon: -0.9781 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new QuantumForgeGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 41.2728, lon: -73.8055 });

    assert.equal(sorted[0].name, 'IBM Quantum System One Hub (Yorktown Heights)');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new QuantumForgeGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error on invalid or missing user coordinates', () => {
    const engine = new QuantumForgeGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'not-a-number', lon: 0 });
    }, /Invalid user coordinates/);
  });
});
