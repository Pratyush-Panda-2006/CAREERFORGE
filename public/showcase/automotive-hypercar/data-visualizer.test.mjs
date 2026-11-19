import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarRadarChart as Radar } from './data-visualizer.js';

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('cardinal polar coordinates include chart translation', () => {
  const chart = new Radar({ radius: 10, centerX: 30, centerY: 40 });
  for (const [angle, x, y] of [[0, 40, 40], [Math.PI / 2, 30, 50], [Math.PI, 20, 40], [-Math.PI / 2, 30, 30]]) {
    const point = chart.polarToCartesian(10, angle); near(point.x, x); near(point.y, y);
  }
});

test('vertices start at top and proceed clockwise; SVG strings normalize negative zero', () => {
  const chart = new Radar({ radius: 10, centerX: 0, centerY: 0 });
  assert.equal(chart.generatePolygonPoints([100, 100, 100, 100]), '0,-10 10,0 0,10 -10,0');
  near(chart.computeEnclosedArea(), 200);
});

test('regular polygons from 3 to 12 axes agree with analytic areas', () => {
  for (let count = 3; count <= 12; count++) {
    const chart = new Radar({ radius: 150 }); chart.generatePolygonPoints(Array(count).fill(100));
    near(chart.computeEnclosedArea(), count * 150 ** 2 * Math.sin(2 * Math.PI / count) / 2);
  }
});

test('independent radial cross-product formula agrees for 100 varied datasets', () => {
  const chart = new Radar({ radius: 73, centerX: 1000000, centerY: -1000000 });
  for (let trial = 0; trial < 100; trial++) {
    const count = 3 + trial % 10;
    const values = Array.from({ length: count }, (_, index) => (trial * 17 + index * 29) % 101);
    chart.generatePolygonPoints(values);
    const expected = values.reduce((sum, value, index) => sum + value * values[(index + 1) % count], 0) * (73 / 100) ** 2 * Math.sin(2 * Math.PI / count) / 2;
    near(chart.computeEnclosedArea(), expected, 1e-6);
  }
});

test('zero, repeated-center, mixed and fractional scores remain finite', () => {
  const chart = new Radar({ radius: 10, centerX: 0, centerY: 0 });
  assert.equal(chart.computeEnclosedArea(), 0);
  assert.equal(chart.generatePolygonPoints([0, 0, 0]), '0,0 0,0 0,0'); assert.equal(chart.computeEnclosedArea(), 0);
  chart.generatePolygonPoints([100, 0, 100, 0]); assert.equal(chart.computeEnclosedArea(), 0);
  chart.generatePolygonPoints([50.5, 50.5, 50.5, 50.5]); near(chart.computeEnclosedArea(), 2 * 5.05 ** 2);
});

test('radius scaling squares the area and translation preserves it', () => {
  const values = [33, 77, 19, 96, 82];
  const a = new Radar({ radius: 100, centerX: 0, centerY: 0 });
  const b = new Radar({ radius: 300, centerX: 900000, centerY: -900000 });
  near(b.computeEnclosedArea(values), 9 * a.computeEnclosedArea(values), 1e-6);
});

test('returned and input arrays cannot mutate stored geometry', () => {
  const chart = new Radar(); const values = [20, 30, 40]; chart.generatePolygonPoints(values);
  const area = chart.computeEnclosedArea(); values[0] = 100; chart.getMetrics()[1] = 100; chart.getVertices()[0].x = -100;
  assert.deepEqual(chart.getMetrics(), [20, 30, 40]); assert.equal(chart.computeEnclosedArea(), area);
});

test('invalid metric inputs fail without replacing the last valid calculation', () => {
  const chart = new Radar(); chart.generatePolygonPoints([10, 20, 30]); const area = chart.computeEnclosedArea();
  for (const value of [null, {}, '20,30,40', [], [1, 2], Array(13).fill(5), [1, 2, -1], [1, 2, 101], [1, 2, NaN], [1, 2, Infinity], [1, 2, '3'], [1, 2, null], Array(3)]) {
    assert.throws(() => chart.generatePolygonPoints(value)); assert.equal(chart.computeEnclosedArea(), area);
  }
  const withGetter = [1, 2, 3]; Object.defineProperty(withGetter, 0, { get() { throw new Error('Getter executed'); } });
  assert.throws(() => chart.generatePolygonPoints(withGetter), /dense array/); assert.equal(chart.computeEnclosedArea(), area);
});

test('invalid radius, center and polar arguments are rejected without coercion', () => {
  for (const radius of [0, -1, 10001, NaN, Infinity, '10']) assert.throws(() => new Radar({ radius }));
  for (const centerX of [NaN, Infinity, 1000001, '20']) assert.throws(() => new Radar({ centerX }));
  const chart = new Radar();
  for (const [r, angle] of [[-1, 0], [10001, 0], [1, Infinity], [1, NaN], [1, '0']]) assert.throws(() => chart.polarToCartesian(r, angle));
});

test('area queries do not change selected metrics and serialized coordinates stay bounded', () => {
  const chart = new Radar(); chart.generatePolygonPoints([40, 50, 60]); const selected = chart.getMetrics();
  chart.computeEnclosedArea([100, 100, 100, 100]); assert.deepEqual(chart.getMetrics(), selected);
  const points = chart.generatePolygonPoints(Array(12).fill(100)).split(' ').map((pair) => pair.split(',').map(Number));
  assert.equal(points.length, 12); points.flat().forEach((value) => assert.ok(Number.isFinite(value) && value >= 70 && value <= 370));
});
