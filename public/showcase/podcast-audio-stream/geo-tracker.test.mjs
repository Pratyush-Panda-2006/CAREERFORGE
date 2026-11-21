import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamGeoRadarEngine } from './geo-tracker.js';

describe('PodcastAudioStreamGeoRadarEngine', () => {
  it('instantiates with default recording studios and Earth spherical radius', () => {
    const engine = new PodcastAudioStreamGeoRadarEngine();
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between London and Stockholm', () => {
    const engine = new PodcastAudioStreamGeoRadarEngine();
    // London (51.5186, -0.1438) to Stockholm (59.3372, 18.0620) is ~1430 km
    const dist = engine.calculateHaversineDistance(51.5186, -0.1438, 59.3372, 18.0620);
    assert.ok(dist >= 1400 && dist <= 1470);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(51.5186, -0.1438, 51.5186, -0.1438), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new PodcastAudioStreamGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 51.5186, lon: -0.1438 },
      { lat: 40.7028, lon: -73.9872 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new PodcastAudioStreamGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 51.5186, lon: -0.1438 });

    assert.equal(sorted[0].name, 'BBC Broadcasting House (London, UK)');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new PodcastAudioStreamGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error when invalid coordinate object is supplied to sortNearestNodes', () => {
    const engine = new PodcastAudioStreamGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'invalid', lon: 10 });
    }, /Invalid user coordinates/);
  });
});
