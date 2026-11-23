import assert from 'node:assert/strict';
import test from 'node:test';
import { MusicDawStudioRadarChart } from './data-visualizer.js';

const chart = new MusicDawStudioRadarChart(0, 0, 100);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('polar conversion puts the origin at the configured center', () => {
  const shifted = new MusicDawStudioRadarChart(17, 9, 100);
  assert.deepEqual(shifted.polarToCartesian(0, 1), { x: 17, y: 9 });
  assert.deepEqual(shifted.polarToCartesian(15, 0), { x: 32, y: 9 });
  close(shifted.polarToCartesian(15, Math.PI / 2).y, 24);
});

test('polygon starts at twelve o’clock and normalizes point strings', () => {
  assert.equal(chart.generatePolygonPoints([100, 100, 100, 100]), '0,-100 100,0 0,100 -100,0');
});

test('negative, excessive and nonfinite metrics stay inside the grid', () => {
  assert.equal(chart.generatePolygonPoints([-5, 120, Number.NaN, Number.POSITIVE_INFINITY]), '0,0 100,0 0,0 0,0');
});

test('full hexagon area matches the closed-form area', () => {
  close(chart.computeEnclosedArea([100, 100, 100, 100, 100, 100]), 3 * Math.sqrt(3) * 5000);
});

test('a half-radius profile takes one quarter of the full polygon area', () => {
  const full = chart.computeEnclosedArea([100, 100, 100, 100, 100, 100]);
  close(chart.computeEnclosedArea([50, 50, 50, 50, 50, 50]) / full, 0.25);
});

test('offsetting the chart center leaves the area unchanged', () => {
  const shifted = new MusicDawStudioRadarChart(210, 175, 100);
  const sample = [45, 70, 56, 80, 50, 0];
  close(shifted.computeEnclosedArea(sample), chart.computeEnclosedArea(sample));
});

test('degenerate charts have zero area', () => {
  assert.equal(chart.computeEnclosedArea([]), 0);
  assert.equal(chart.computeEnclosedArea([100, 100]), 0);
  assert.equal(chart.computeEnclosedArea([0, 0, 0, 0, 0, 0]), 0);
});
