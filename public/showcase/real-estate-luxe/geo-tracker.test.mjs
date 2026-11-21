import test from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeGeoRadarEngine as Engine, EARTH_RADIUS_KM as R } from './geo-tracker.js';

const engine = new Engine();
const near = (actual, expected, tolerance = 1e-7) => assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const rad = (n) => n * Math.PI / 180;
const distance = (a, b) => engine.calculateHaversineDistance(a.lat, a.lon, b.lat, b.lon);

test('zero, quarter and half circumference agree with analytical spherical geometry', () => {
  near(distance({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0);
  near(distance({ lat: 0, lon: 0 }, { lat: 0, lon: 90 }), R * Math.PI / 2);
  near(distance({ lat: 0, lon: 0 }, { lat: 90, lon: 77 }), R * Math.PI / 2);
  near(distance({ lat: 0, lon: 0 }, { lat: 0, lon: 180 }), R * Math.PI);
});

test('London to New York uses spherical kilometres and an initial northwest bearing', () => {
  const london = { lat: 51.5074, lon: -0.1278 }, ny = { lat: 40.7128, lon: -74.0060 };
  near(distance(london, ny), 5570.2298736565, .00001);
  near(engine.computeBearing(london, ny), 288.3297015936, .00001);
});

test('longitude differences take the short arc across the dateline in both directions', () => {
  const east = { lat: 0, lon: 179.5 }, west = { lat: 0, lon: -179.5 };
  near(distance(east, west), R * Math.PI / 180);
  near(distance(west, east), R * Math.PI / 180);
  assert.equal(engine.computeBearing(east, west), 90);
  assert.equal(engine.computeBearing(west, east), 270);
  near(distance({ lat: 15, lon: 180 }, { lat: 15, lon: -180 }), 0);
});

test('cardinal bearings are clockwise from north with no negative zero', () => {
  const origin = { lat: 0, lon: 0 };
  for (const [end, bearing] of [[{ lat: 1, lon: 0 }, 0], [{ lat: 0, lon: 1 }, 90], [{ lat: -1, lon: 0 }, 180], [{ lat: 0, lon: -1 }, 270]]) {
    assert.equal(engine.computeBearing(origin, end), bearing);
    assert.equal(Object.is(engine.computeBearing(origin, end), -0), false);
  }
});

test('coincident, antipodal and polar-origin headings are explicitly undefined', () => {
  const a = { lat: 17, lon: 23 };
  assert.equal(engine.computeBearing(a, a), null);
  assert.equal(engine.computeBearing(a, { lat: -17, lon: -157 }), null);
  for (const lat of [-90, 90]) {
    assert.equal(engine.computeBearing({ lat, lon: 10 }, { lat: 0, lon: 10 }), null);
    near(distance({ lat, lon: -180 }, { lat, lon: 90 }), 0);
  }
});

test('sorts nearby nodes accurately by distance', () => {
  const customEngine = new Engine([
    { id: 'near', name: 'Near Site', lat: 0.1, lon: 0 },
    { id: 'far', name: 'Far Site', lat: 10, lon: 0 },
    { id: 'mid', name: 'Mid Site', lat: 1, lon: 0 }
  ]);
  const sorted = customEngine.sortNearestNodes({ lat: 0, lon: 0 });
  assert.equal(sorted[0].id, 'near');
  assert.equal(sorted[1].id, 'mid');
  assert.equal(sorted[2].id, 'far');
});
