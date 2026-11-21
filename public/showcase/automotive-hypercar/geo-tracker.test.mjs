import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarGeoRadarEngine } from './geo-tracker.js';

test('AutomotiveHypercarGeoRadarEngine - instantiation and default presets', () => {
  const engine = new AutomotiveHypercarGeoRadarEngine();
  assert.equal(engine.name, 'AutomotiveHypercarGeoRadarEngine');
  assert.equal(engine.earthRadiusKm, 6371);
  assert.ok(Array.isArray(engine.locations));
  assert.ok(engine.locations.length >= 5);
});

test('calculateHaversineDistance - accuracy across grand prix circuits', () => {
  const engine = new AutomotiveHypercarGeoRadarEngine();
  // Nürburgring Nordschleife to Circuit de Spa-Francorchamps (~70 km)
  const distNurburgringToSpa = engine.calculateHaversineDistance(50.3356, 6.9475, 50.4372, 5.9714);
  assert.ok(distNurburgringToSpa >= 69.5 && distNurburgringToSpa <= 71.0);

  // Distance from point to itself is 0
  const selfDist = engine.calculateHaversineDistance(50.3356, 6.9475, 50.3356, 6.9475);
  assert.equal(selfDist, 0);

  // Nürburgring to Monza (~552 km)
  const distNurburgringToMonza = engine.calculateHaversineDistance(50.3356, 6.9475, 45.6156, 9.2811);
  assert.ok(distNurburgringToMonza >= 550 && distNurburgringToMonza <= 555);
});

test('computeBearing - forward azimuth degree range and direction', () => {
  const engine = new AutomotiveHypercarGeoRadarEngine();
  const start = { lat: 50.3356, lon: 6.9475 };
  const end = { lat: 50.4372, lon: 5.9714 };

  const bearing = engine.computeBearing(start, end);
  assert.ok(bearing >= 0 && bearing <= 360);
  assert.ok(bearing >= 275 && bearing <= 285); // West-Northwest direction (~279.65°)

  // Exact North bearing
  const northBearing = engine.computeBearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 });
  assert.equal(northBearing, 0);

  // Exact East bearing
  const eastBearing = engine.computeBearing({ lat: 0, lon: 0 }, { lat: 0, lon: 10 });
  assert.equal(eastBearing, 90);
});

test('sortNearestNodes - sorts correctly in ascending order of proximity', () => {
  const engine = new AutomotiveHypercarGeoRadarEngine();
  const origin = { lat: 50.3356, lon: 6.9475 }; // At Nürburgring
  const sorted = engine.sortNearestNodes(origin);

  assert.equal(sorted.length, engine.locations.length);
  assert.equal(sorted[0].id, 'track-nurburgring');
  assert.equal(sorted[0].distanceKm, 0);
  assert.equal(sorted[1].id, 'track-spa');

  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
    assert.ok(sorted[i].bearingDeg >= 0 && sorted[i].bearingDeg <= 360);
  }
});

test('sortNearestNodes - boundary conditions and error handling', () => {
  const engine = new AutomotiveHypercarGeoRadarEngine();

  // Throws on missing or invalid coordinates
  assert.throws(() => engine.sortNearestNodes(null), /Invalid user coordinates/);
  assert.throws(() => engine.sortNearestNodes({ lat: 'invalid', lon: 10 }), /Invalid user coordinates/);

  // Extreme polar and meridian coordinates
  const northPole = { lat: 90, lon: 0 };
  const polarSorted = engine.sortNearestNodes(northPole);
  assert.ok(polarSorted.length > 0);
  assert.ok(polarSorted[0].distanceKm > 0);
});
