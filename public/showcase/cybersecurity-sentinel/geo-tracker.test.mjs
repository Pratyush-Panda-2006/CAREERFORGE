import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelGeoRadarEngine } from './geo-tracker.js';

describe('CybersecuritySentinelGeoRadarEngine', () => {
  it('instantiates with default SOC facilities and Earth spherical radius', () => {
    const engine = new CybersecuritySentinelGeoRadarEngine();
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between Frankfurt and London', () => {
    const engine = new CybersecuritySentinelGeoRadarEngine();
    // Frankfurt (50.1109, 8.6821) to London (51.5074, -0.1278) is ~635 km
    const dist = engine.calculateHaversineDistance(50.1109, 8.6821, 51.5074, -0.1278);
    assert.ok(dist >= 620 && dist <= 660);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(50.1109, 8.6821, 50.1109, 8.6821), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new CybersecuritySentinelGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 50.1109, lon: 8.6821 },
      { lat: 38.9586, lon: -77.3570 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new CybersecuritySentinelGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 50.1109, lon: 8.6821 });

    assert.equal(sorted[0].name, 'European Threat Operations Command (Frankfurt)');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new CybersecuritySentinelGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error when invalid coordinate object is supplied to sortNearestNodes', () => {
    const engine = new CybersecuritySentinelGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'invalid', lon: 10 });
    }, /Invalid user coordinates/);
  });
});
