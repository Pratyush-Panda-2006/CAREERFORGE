import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactRadarChart as Radar } from './data-visualizer.js';
const close = (actual, expected, relative = 1e-10) => assert(Math.abs(actual - expected) <= relative * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('polar conversion uses the configured center and cardinal angles', () => {
  const chart = new Radar({ centerX: 15, centerY: -20 });
  for (const [angle, x, y] of [[0, 25, -20], [Math.PI / 2, 15, -10], [Math.PI, 5, -20], [-Math.PI / 2, 15, -30]]) {
    const point = chart.polarToCartesian(10, angle); close(point.x, x); close(point.y, y);
  }
  assert.deepEqual(chart.polarToCartesian(0, 123), { x: 15, y: -20 });
});
test('SVG point strings are stable numeric pairs without signed zero or scientific notation', () => {
  const chart = new Radar({ centerX: 0, centerY: 0, radius: 10 });
  assert.equal(chart.generatePolygonPoints([100, 100, 100, 100]), '0,-10 10,0 0,10 -10,0');
  assert.equal(chart.generatePolygonPoints([0, 0, 0]), '0,0 0,0 0,0');
});
test('regular 3–12 axis polygons match their independent analytic area', () => {
  for (let sides = 3; sides <= 12; sides++) {
    for (const radius of [0, 1, 160, 9999]) {
      const chart = new Radar({ radius, centerX: -8000, centerY: 9000 });
      chart.generatePolygonPoints(Array(sides).fill(100));
      close(chart.computeEnclosedArea(), sides * radius * radius * Math.sin(2 * Math.PI / sides) / 2);
    }
  }
});
test('varied profiles match the radial-pair area formula independently of shoelace coordinates', () => {
  let seed = 34123;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let i = 0; i < 150; i++) {
    const sides = 3 + i % 10, radius = 20 + random() * 1000, maxValue = i % 2 ? 100 : 500;
    const values = Array.from({ length: sides }, () => random() * maxValue);
    const chart = new Radar({ radius, maxValue, centerX: random() * 1000, centerY: -random() * 1000 });
    const pairSum = values.reduce((sum, value, index) => sum + value * values[(index + 1) % sides], 0);
    close(chart.computeEnclosedArea(values), radius ** 2 * Math.sin(2 * Math.PI / sides) * pairSum / (2 * maxValue ** 2));
  }
});
test('quarter-scale values enclose one sixteenth of the full area', () => {
  const chart = new Radar(); const full = chart.computeEnclosedArea(Array(6).fill(100));
  close(chart.computeEnclosedArea(Array(6).fill(25)), full / 16);
  assert.equal(chart.computeEnclosedArea([100, 0, 0, 0, 0, 0]), 0);
});
test('geometry uses unrounded coordinates rather than reparsing the displayed SVG points', () => {
  const chart = new Radar({ radius: 13.7654321, centerX: 0.123456, centerY: 3.147852 });
  const values = [13.2, 58.7, 99.1]; const points = chart.generatePolygonPoints(values);
  const parsed = points.split(' ').map(pair => pair.split(',').map(Number));
  assert(parsed.every(pair => pair.length === 2));
  const exact = chart.radius ** 2 * Math.sin(2 * Math.PI / 3) * (values[0] * values[1] + values[1] * values[2] + values[2] * values[0]) / 20000;
  close(chart.computeEnclosedArea(), exact, 1e-12);
});
test('input arrays are detached and explicit area queries do not replace the stored profile', () => {
  const chart = new Radar(), input = [20, 40, 60, 80]; chart.generatePolygonPoints(input);
  const original = chart.computeEnclosedArea(); input.fill(100); assert.equal(chart.computeEnclosedArea(), original);
  chart.computeEnclosedArea([0, 0, 0]); assert.equal(chart.computeEnclosedArea(), original);
  assert.throws(() => chart.generatePolygonPoints([30, NaN, 40])); assert.equal(chart.computeEnclosedArea(), original);
});
test('empty datasets clear the last profile and return zero area', () => {
  const chart = new Radar(); assert.equal(chart.computeEnclosedArea(), 0); chart.generatePolygonPoints([100, 100, 100]);
  assert.equal(chart.generatePolygonPoints([]), ''); assert.equal(chart.computeEnclosedArea(), 0);
});
test('invalid metrics and shapes reject without numeric coercion', () => {
  const chart = new Radar(), sparse = new Array(3); sparse[0] = 1; sparse[2] = 3;
  for (const value of [null, {}, [1], [1, 2], Array(13).fill(10), [0, -1, 4], [20, 101, 30], [20, Infinity, 30], [20, '30', 40], [10, undefined, 30], sparse]) assert.throws(() => chart.generatePolygonPoints(value));
  assert.equal(chart.computeEnclosedArea(), 0);
});
test('dimensions and polar helper inputs are bounded and the configuration cannot become invalid later', () => {
  for (const options of [{ radius: -1 }, { radius: 10001 }, { centerX: Infinity }, { centerY: '0' }, { maxValue: 0 }, { maxValue: -1 }, { maxValue: 1_000_001 }]) assert.throws(() => new Radar(options));
  const chart = new Radar(); assert.throws(() => { chart.radius = NaN; }, TypeError);
  for (const args of [[-1, 0], [NaN, 0], [1, Infinity], ['10', 0]]) assert.throws(() => chart.polarToCartesian(...args));
});
