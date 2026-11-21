import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsGeoRadarEngine } from './geo-tracker.js';

describe('LuxuryRealmsGeoRadarEngine', () => {
  it('instantiates with default sovereign enclave nodes and Earth spherical radius', () => {
    const engine = new LuxuryRealmsGeoRadarEngine();
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between Saint-Jean-Cap-Ferrat and Rome', () => {
    const engine = new LuxuryRealmsGeoRadarEngine();
    // Cap Ferrat (43.6896, 7.3312) to Rome (41.9075, 12.4907) is ~460 km
    const dist = engine.calculateHaversineDistance(43.6896, 7.3312, 41.9075, 12.4907);
    assert.ok(dist >= 440 && dist <= 480);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(43.6896, 7.3312, 43.6896, 7.3312), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new LuxuryRealmsGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 43.6896, lon: 7.3312 },
      { lat: 51.5053, lon: -0.1908 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new LuxuryRealmsGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 43.6896, lon: 7.3312 });

    assert.equal(sorted[0].name, 'Villa Les Cèdres (Saint-Jean-Cap-Ferrat)');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new LuxuryRealmsGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error on invalid or missing user coordinates', () => {
    const engine = new LuxuryRealmsGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'not-a-number', lon: 0 });
    }, /Invalid user coordinates/);
  });
});
