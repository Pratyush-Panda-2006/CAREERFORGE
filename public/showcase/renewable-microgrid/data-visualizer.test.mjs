import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridRadarChart } from './data-visualizer.js';

test('RenewableMicrogridRadarChart - correctly converts polar coordinates to Cartesian', () => {
  const chart = new RenewableMicrogridRadarChart({ cx: 100, cy: 100 });

  // At angle 0 (12 o'clock), y is (cy - radius) and x is cx
  const topPt = chart.polarToCartesian(50, 0);
  assert.strictEqual(topPt.x, 100);
  assert.strictEqual(topPt.y, 50);

  // At angle PI (6 o'clock), y is (cy + radius) and x is cx
  const bottomPt = chart.polarToCartesian(50, Math.PI);
  assert.strictEqual(bottomPt.x, 100);
  assert.strictEqual(bottomPt.y, 150);
});

test('RenewableMicrogridRadarChart - generates normalized polygon points string', () => {
  const chart = new RenewableMicrogridRadarChart({ cx: 100, cy: 100, radius: 50 });
  const metrics = [
    { name: 'M1', value: 100, max: 100 },
    { name: 'M2', value: 100, max: 100 },
    { name: 'M3', value: 100, max: 100 },
    { name: 'M4', value: 100, max: 100 }
  ];

  const pointsStr = chart.generatePolygonPoints(metrics);
  const pts = pointsStr.split(' ');
  assert.strictEqual(pts.length, 4);
  pts.forEach(p => {
    const [x, y] = p.split(',').map(Number);
    assert.ok(!isNaN(x) && !isNaN(y));
  });
});

test('RenewableMicrogridRadarChart - calculates enclosed polygon area via Shoelace formula', () => {
  const chart = new RenewableMicrogridRadarChart();
  // 10x10 square points: (0,0), (10,0), (10,10), (0,10)
  const squarePoints = '0,0 10,0 10,10 0,10';
  const area = chart.computeEnclosedArea(squarePoints);

  assert.strictEqual(area, 100);
});
