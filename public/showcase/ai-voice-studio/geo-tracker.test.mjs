import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioGeoRadarEngine } from './geo-tracker.js';

describe('AiVoiceStudioGeoRadarEngine', () => {
  it('instantiates with default vocal studio facilities and Earth spherical radius', () => {
    const engine = new AiVoiceStudioGeoRadarEngine();
    assert.equal(engine.name, 'AiVoiceStudioGeoRadarEngine');
    assert.equal(engine.earthRadiusKm, 6371);
    assert.ok(Array.isArray(engine.locations));
    assert.ok(engine.locations.length >= 5);
  });

  it('calculates spherical haversine distance accurately between London and Berlin', () => {
    const engine = new AiVoiceStudioGeoRadarEngine();
    // London Abbey Road (51.5320, -0.1780) to Berlin Funkhaus (52.4890, 13.4980) is ~935 km
    const dist = engine.calculateHaversineDistance(51.5320, -0.1780, 52.4890, 13.4980);
    assert.ok(dist >= 920 && dist <= 960);

    // Distance to self is 0
    assert.equal(engine.calculateHaversineDistance(51.5320, -0.1780, 51.5320, -0.1780), 0);
  });

  it('computes forward azimuth bearing within 0 to 360 degrees', () => {
    const engine = new AiVoiceStudioGeoRadarEngine();
    const bearing = engine.computeBearing(
      { lat: 51.5320, lon: -0.1780 },
      { lat: 34.0980, lon: -118.3370 }
    );
    assert.ok(typeof bearing === 'number');
    assert.ok(bearing >= 0 && bearing <= 360);
  });

  it('sorts nearest nodes in ascending distance order', () => {
    const engine = new AiVoiceStudioGeoRadarEngine();
    const sorted = engine.sortNearestNodes({ lat: 51.5320, lon: -0.1780 });

    assert.equal(sorted[0].name, 'Abbey Road Voice Scoring Stage (London)');
    assert.equal(sorted[0].distanceKm, 0);

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    }
  });

  it('handles boundary and meridian coordinates properly', () => {
    const engine = new AiVoiceStudioGeoRadarEngine();
    const distAcrossAntimeridian = engine.calculateHaversineDistance(0, 179, 0, -179);
    assert.ok(distAcrossAntimeridian > 220 && distAcrossAntimeridian < 225);
  });

  it('throws an error when invalid coordinate object is supplied to sortNearestNodes', () => {
    const engine = new AiVoiceStudioGeoRadarEngine();
    assert.throws(() => {
      engine.sortNearestNodes(null);
    }, /Invalid user coordinates/);
    assert.throws(() => {
      engine.sortNearestNodes({ lat: 'invalid', lon: 10 });
    }, /Invalid user coordinates/);
  });
});
