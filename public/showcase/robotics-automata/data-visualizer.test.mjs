import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataRadarChart } from './data-visualizer.js';

test('RoboticsAutomataRadarChart - converts polar coordinates to Cartesian space accurately', () => {
  const chart = new RoboticsAutomataRadarChart({ cx: 100, cy: 100, radius: 50 });

  // 0 radians (pointing right): x = 100 + 50 = 150, y = 100
  const right = chart.polarToCartesian(50, 0, 100, 100);
  assert.strictEqual(right.x, 150);
  assert.strictEqual(right.y, 100);

  // PI/2 radians (pointing down): x = 100, y = 100 + 50 = 150
  const down = chart.polarToCartesian(50, Math.PI / 2, 100, 100);
  assert.strictEqual(down.x, 100);
  assert.strictEqual(down.y, 150);

  // -PI/2 radians (pointing up): x = 100, y = 100 - 50 = 50
  const up = chart.polarToCartesian(50, -Math.PI / 2, 100, 100);
  assert.strictEqual(up.x, 100);
  assert.strictEqual(up.y, 50);
});

test('RoboticsAutomataRadarChart - generates normalized polygon point strings', () => {
  const chart = new RoboticsAutomataRadarChart({ cx: 150, cy: 150, radius: 100 });
  const pointsStr = chart.generatePolygonPoints([100, 100, 100, 100]);

  assert.ok(typeof pointsStr === 'string');
  const pairs = pointsStr.split(' ');
  assert.strictEqual(pairs.length, 4);

  pairs.forEach(pair => {
    const [x, y] = pair.split(',').map(Number);
    assert.ok(!isNaN(x));
    assert.ok(!isNaN(y));
  });
});

test('RoboticsAutomataRadarChart - computes enclosed area using Shoelace formula accurately', () => {
  const chart = new RoboticsAutomataRadarChart();

  // Test with a known square of 100x100: corners (0,0), (100,0), (100,100), (0,100) -> Area = 10,000
  const squarePoints = '0,0 100,0 100,100 0,100';
  const areaSquare = chart.computeEnclosedArea(squarePoints);
  assert.strictEqual(areaSquare, 10000);

  // Test with standard 6-axis metrics polygon
  const areaMetrics = chart.computeEnclosedArea();
  assert.ok(areaMetrics > 0);
  assert.ok(typeof areaMetrics === 'number');

  // Test degenerate points (< 3 vertices) returns 0
  assert.strictEqual(chart.computeEnclosedArea('10,10 20,20'), 0);
});

test('RoboticsAutomataRadarChart - generates concentric grid web levels and axes', () => {
  const chart = new RoboticsAutomataRadarChart();
  const grids = chart.generateGridLevels(4);
  assert.strictEqual(grids.length, 4);
  assert.strictEqual(grids[0].percentage, 25);
  assert.strictEqual(grids[3].percentage, 100);

  const axes = chart.generateAxisLines();
  assert.strictEqual(axes.length, chart.metrics.length);
  axes.forEach(axis => {
    assert.ok(axis.label);
    assert.ok(axis.x1 !== undefined);
    assert.ok(axis.x2 !== undefined);
  });
});
