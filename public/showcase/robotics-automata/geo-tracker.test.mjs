import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataGeoRadarEngine } from './geo-tracker.js';

describe('RoboticsAutomataGeoRadarEngine', () => {
  it('initializes with default nodes and coordinates', () => {
    const engine = new RoboticsAutomataGeoRadarEngine();
    assert.ok(Array.isArray(engine.nodes));
    assert.ok(engine.nodes.length >= 4);
    assert.equal(engine.userCoord.lat, 37.7749);
    assert.equal(engine.userCoord.lon, -122.4194);
  });

  it('calculates accurate Haversine distance in km', () => {
    const engine = new RoboticsAutomataGeoRadarEngine();
    // Distance between same points should be 0
    const zeroDist = engine.calculateHaversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.equal(zeroDist, 0);

    // Distance between SF (37.7749, -122.4194) and San Jose (37.3382, -121.8863) is approx 67-70 km
    const distToSJ = engine.calculateHaversineDistance(37.7749, -122.4194, 37.3382, -121.8863);
    assert.ok(distToSJ > 65 && distToSJ < 75);
  });

  it('validates numerical coordinates in calculateHaversineDistance', () => {
    const engine = new RoboticsAutomataGeoRadarEngine();
    assert.throws(() => {
      engine.calculateHaversineDistance('invalid', -122, 37, -121);
    }, /Valid numerical coordinates required/);
  });

  it('computes correct initial bearing and compass direction', () => {
    const engine = new RoboticsAutomataGeoRadarEngine();
    const northBearing = engine.computeBearing(
      { lat: 0, lon: 0 },
      { lat: 10, lon: 0 }
    );
    assert.equal(northBearing, 0);
    assert.equal(engine.getCompassDirection(northBearing), 'N');

    const eastBearing = engine.computeBearing(
      { lat: 0, lon: 0 },
      { lat: 0, lon: 10 }
    );
    assert.equal(eastBearing, 90);
    assert.equal(engine.getCompassDirection(eastBearing), 'E');
  });

  it('sorts nodes by proximity accurately', () => {
    const customNodes = [
      { id: 'far', name: 'Far Node', lat: 38.5, lon: -121.5 },
      { id: 'near', name: 'Near Node', lat: 37.775, lon: -122.419 }
    ];
    const engine = new RoboticsAutomataGeoRadarEngine({ nodes: customNodes });
    const sorted = engine.sortNearestNodes({ lat: 37.7749, lon: -122.4194 });

    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 'near');
    assert.equal(sorted[1].id, 'far');
    assert.ok(sorted[0].distanceKm < sorted[1].distanceKm);
    assert.ok(typeof sorted[0].bearing === 'number');
    assert.ok(typeof sorted[0].compass === 'string');
  });

  it('notifies subscribers upon updating user coordinate', () => {
    const engine = new RoboticsAutomataGeoRadarEngine();
    let notifiedCoord = null;
    let notifiedNodes = null;

    engine.subscribe((coord, nodes) => {
      notifiedCoord = coord;
      notifiedNodes = nodes;
    });

    engine.setUserCoord(37.8, -122.4);
    assert.deepEqual(notifiedCoord, { lat: 37.8, lon: -122.4 });
    assert.ok(Array.isArray(notifiedNodes));
    assert.equal(notifiedNodes.length, engine.nodes.length);
  });
});
