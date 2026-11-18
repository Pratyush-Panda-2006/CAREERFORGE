import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixRadarChart } from './data-visualizer.js';

test('DefiYieldMatrixRadarChart - converts polar coordinates to Cartesian accurately', () => {
  const radar = new DefiYieldMatrixRadarChart({ cx: 200, cy: 200 });

  // Angle 0 rad (pointing right)
  const right = radar.polarToCartesian(100, 0);
  assert.strictEqual(right.x, 300);
  assert.strictEqual(right.y, 200);

  // Angle -PI/2 rad (pointing up)
  const top = radar.polarToCartesian(100, -Math.PI / 2);
  assert.strictEqual(top.x, 200);
  assert.strictEqual(top.y, 100);
});

test('DefiYieldMatrixRadarChart - generates formatted SVG polygon points string', () => {
  const radar = new DefiYieldMatrixRadarChart({ cx: 200, cy: 200, maxRadius: 100 });
  const metrics = [
    { value: 100, max: 100 },
    { value: 50, max: 100 },
    { value: 100, max: 100 }
  ];

  const result = radar.generatePolygonPoints(metrics);
  assert.strictEqual(result.points.length, 3);
  assert.match(result.pointsString, /^(\d+(\.\d+)?,?\d+(\.\d+)?\s*)+$/);

  // Top vertex at (200, 100)
  assert.strictEqual(result.points[0].x, 200);
  assert.strictEqual(result.points[0].y, 100);
});

test('DefiYieldMatrixRadarChart - computes enclosed polygon area using Gauss Shoelace formula', () => {
  const radar = new DefiYieldMatrixRadarChart();

  // Unit square from (0,0) to (10,10) has area 100
  const squarePoints = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 }
  ];

  const area = radar.computeEnclosedArea(squarePoints);
  assert.strictEqual(area, 100);

  // Also handles space-delimited pointsString format
  const stringArea = radar.computeEnclosedArea('0,0 10,0 10,10 0,10');
  assert.strictEqual(stringArea, 100);
});

test('DefiYieldMatrixRadarChart - generates concentric grid webs for polar canvas', () => {
  const radar = new DefiYieldMatrixRadarChart({ cx: 200, cy: 200, maxRadius: 100 });
  const webs = radar.getGridWebPolygons(5);

  assert.strictEqual(webs.length, 5);
  assert.strictEqual(webs[4].fraction, 1);
  assert.ok(webs[0].pointsString.length > 0);
});
