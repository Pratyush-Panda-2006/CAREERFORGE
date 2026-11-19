import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactGeoRadarEngine as Engine, EARTH_RADIUS_KM as R } from './geo-tracker.js';
const engine = new Engine();
const near = (actual, expected, tolerance = 1e-7) => assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const rad = (n) => n * Math.PI / 180;
const unit = ({ lat, lon }) => [Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat))];
// Independent 3D unit-vector oracle, rather than the production haversine equation.
function vectorDistance(a, b) {
  const u = unit(a), v = unit(b), cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return R * Math.atan2(Math.hypot(...cross), u.reduce((sum, n, i) => sum + n * v[i], 0));
}
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
  near(distance(east, west), R * Math.PI / 180); near(distance(west, east), R * Math.PI / 180);
  assert.equal(engine.computeBearing(east, west), 90); assert.equal(engine.computeBearing(west, east), 270);
  near(distance({ lat: 15, lon: 180 }, { lat: 15, lon: -180 }), 0);
});
test('cardinal bearings are clockwise from north with no negative zero', () => {
  const origin = { lat: 0, lon: 0 };
  for (const [end, bearing] of [[{ lat: 1, lon: 0 }, 0], [{ lat: 0, lon: 1 }, 90], [{ lat: -1, lon: 0 }, 180], [{ lat: 0, lon: -1 }, 270]]) {
    assert.equal(engine.computeBearing(origin, end), bearing); assert.equal(Object.is(engine.computeBearing(origin, end), -0), false);
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
test('near antipodes retain small arc differences rather than rounding to half circumference', () => {
  const a = { lat: 0, lon: 0 }, b = { lat: 0, lon: 179.999999 };
  near(distance(a, b), Math.PI * R - rad(.000001) * R, 1e-8);
  assert(distance(a, b) < Math.PI * R); near(engine.computeBearing(a, b), 90);
});
test('a nearby northward site and high-latitude dateline crossing remain finite', () => {
  const a = { lat: 40, lon: 50 }, b = { lat: 40.000001, lon: 50 };
  near(distance(a, b), R * rad(.000001), 1e-8); near(engine.computeBearing(a, b), 0);
  const polar = { lat: 89.9, lon: 170 }, other = { lat: 89.9, lon: -170 };
  near(distance(polar, other), vectorDistance(polar, other)); assert(engine.computeBearing(polar, other) > 0 && engine.computeBearing(polar, other) < 90);
});
test('200 deterministic coordinate pairs agree with an independent vector oracle and symmetry', () => {
  let seed = 9137;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let i = 0; i < 200; i++) {
    const a = { lat: random() * 180 - 90, lon: random() * 360 - 180 }, b = { lat: random() * 180 - 90, lon: random() * 360 - 180 };
    const actual = distance(a, b); near(actual, vectorDistance(a, b), 1e-6); near(actual, distance(b, a), 1e-6);
    assert(actual >= 0 && actual <= Math.PI * R + 1e-8);
    const bearing = engine.computeBearing(a, b); assert(bearing >= 0 && bearing < 360);
  }
});
test('invalid coordinates are rejected without coercion, even with an empty site list', () => {
  for (const bad of [NaN, Infinity, -Infinity, null, undefined, '0', true]) {
    assert.throws(() => engine.calculateHaversineDistance(bad, 0, 0, 0)); assert.throws(() => engine.calculateHaversineDistance(0, bad, 0, 0));
    assert.throws(() => engine.computeBearing({ lat: 0, lon: 0 }, { lat: bad, lon: 0 }));
    assert.throws(() => engine.sortNearestNodes({ lat: 0, lon: bad }));
  }
  for (const p of [{ lat: 90.01, lon: 0 }, { lat: -90.01, lon: 0 }, { lat: 0, lon: 180.01 }, { lat: 0, lon: -180.01 }]) assert.throws(() => distance(p, { lat: 0, lon: 0 }));
  assert.throws(() => engine.sortNearestNodes(null)); assert.throws(() => engine.computeBearing(null, {}));
});
test('nearest sorting is deterministic, keeps ties stable and leaves the source order intact', () => {
  const source = [{ id: 'far', name: 'Far', lat: 0, lon: 1 }, { id: 'near-b', name: 'Near B', lat: 0, lon: 0 }, { id: 'near-a', name: 'Near A', lat: 0, lon: 0 }];
  const radar = new Engine(source), sorted = radar.sortNearestNodes({ lat: 0, lon: 0 });
  assert.deepEqual(sorted.map(n => n.id), ['near-b', 'near-a', 'far']); assert.deepEqual(source.map(n => n.id), ['far', 'near-b', 'near-a']);
  assert.equal(sorted[0].distanceKm, 0); assert.equal(sorted[0].bearingDegrees, null); assert.equal(sorted[2].bearingDegrees, 90);
});
test('constructor and returned results are detached from later caller mutation', () => {
  const source = [{ id: 'tree', name: 'Survey plot', lat: 0, lon: 1 }], radar = new Engine(source);
  source[0].lat = 80; source.push({ id: 'extra', name: 'Extra', lat: 0, lon: 0 });
  const first = radar.sortNearestNodes({ lat: 0, lon: 0 }); first[0].name = 'Edited'; first[0].distanceKm = -5; first.pop();
  const second = radar.sortNearestNodes({ lat: 0, lon: 0 }); assert.equal(second.length, 1); assert.equal(second[0].name, 'Survey plot'); assert.equal(second[0].lat, 0); assert(second[0].distanceKm > 100);
});
test('invalid, duplicate, sparse and oversized site collections fail before use', () => {
  const row = { id: 'a', name: 'A', lat: 0, lon: 0 };
  for (const nodes of [null, {}, [null], [row, row], [{ ...row, id: '' }], [{ ...row, id: 'a'.repeat(61) }], [{ ...row, name: '' }], [{ ...row, name: 'a'.repeat(101) }], [{ ...row, lat: 100 }], new Array(2), Array.from({ length: 129 }, (_, i) => ({ ...row, id: String(i) }))]) assert.throws(() => new Engine(nodes));
  assert.deepEqual(new Engine().sortNearestNodes({ lat: 0, lon: 0 }), []);
  assert.equal(new Engine(Array.from({ length: 128 }, (_, i) => ({ ...row, id: String(i) }))).sortNearestNodes({ lat: 0, lon: 0 }).length, 128);
});
