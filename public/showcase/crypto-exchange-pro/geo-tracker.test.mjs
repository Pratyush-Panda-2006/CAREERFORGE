import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProGeoRadarEngine } from './geo-tracker.js';

describe('CryptoExchangeProGeoRadarEngine', () => {
  it('instantiates with default colocation hubs and Earth spherical radius', () => {
    const engine = new CryptoExchangeProGeoRadarEngine();
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between NY4 and LD4', () => {
    const engine = new CryptoExchangeProGeoRadarEngine();
    // NY4 (40.7895, -74.0565) to LD4 (51.5113, -0.5954) is ~5580 km
    const dist = engine.calculateHaversineDistance(40.7895, -74.0565, 51.5113, -0.5954);
    assert.ok(dist >= 5500 && dist <= 5700);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(40.7895, -74.0565, 40.7895, -74.0565), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new CryptoExchangeProGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 40.7895, lon: -74.0565 },
      { lat: 35.6262, lon: 139.7486 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new CryptoExchangeProGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 40.7895, lon: -74.0565 });

    assert.equal(sorted[0].name, 'Equinix NY4 Secaucus Primary Orderbook Engine');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new CryptoExchangeProGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error on invalid or missing user coordinates', () => {
    const engine = new CryptoExchangeProGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'not-a-number', lon: 0 });
    }, /Invalid user coordinates/);
  });
});
