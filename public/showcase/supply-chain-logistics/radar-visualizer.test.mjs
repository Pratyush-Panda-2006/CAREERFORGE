import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsRadarVisualizer } from './radar-visualizer.js';

test('SupplyChainLogisticsRadarVisualizer - calculates polar coordinates accurately', () => {
  const visualizer = new SupplyChainLogisticsRadarVisualizer({ cx: 100, cy: 100, radius: 50 });

  // 0 degrees points straight up: x = 100, y = 50
  const topPoint = visualizer.calculateCoordinates(100, 100, 0, 50, 100, 100);
  assert.strictEqual(topPoint.x, 100);
  assert.strictEqual(topPoint.y, 50);

  // 90 degrees points to the right: x = 150, y = 100
  const rightPoint = visualizer.calculateCoordinates(100, 100, 90, 50, 100, 100);
  assert.strictEqual(rightPoint.x, 150);
  assert.strictEqual(rightPoint.y, 100);

  // 180 degrees points straight down: x = 100, y = 150
  const bottomPoint = visualizer.calculateCoordinates(100, 100, 180, 50, 100, 100);
  assert.strictEqual(bottomPoint.x, 100);
  assert.strictEqual(bottomPoint.y, 150);
});

test('SupplyChainLogisticsRadarVisualizer - normalizes values and clamps within bounds', () => {
  const visualizer = new SupplyChainLogisticsRadarVisualizer({ cx: 100, cy: 100, radius: 50 });

  // Value exceeding max is clamped to 1.0 (radius 50)
  const over = visualizer.calculateCoordinates(150, 100, 0, 50, 100, 100);
  assert.strictEqual(over.normalized, 1);
  assert.strictEqual(over.y, 50);

  // Negative value is clamped to 0.0 (radius 0, center point 100, 100)
  const under = visualizer.calculateCoordinates(-20, 100, 0, 50, 100, 100);
  assert.strictEqual(under.normalized, 0);
  assert.strictEqual(under.x, 100);
  assert.strictEqual(under.y, 100);
});

test('SupplyChainLogisticsRadarVisualizer - generates valid SVG polygon points string', () => {
  const visualizer = new SupplyChainLogisticsRadarVisualizer({ cx: 150, cy: 150, radius: 100 });
  const pointsStr = visualizer.generatePolygonPoints([90, 80, 85, 95]);

  assert.ok(typeof pointsStr === 'string');
  const pairs = pointsStr.split(' ');
  assert.strictEqual(pairs.length, 4);

  pairs.forEach(pair => {
    const [x, y] = pair.split(',').map(Number);
    assert.ok(!isNaN(x));
    assert.ok(!isNaN(y));
  });
});

test('SupplyChainLogisticsRadarVisualizer - generates concentric grid levels and axis spokes', () => {
  const visualizer = new SupplyChainLogisticsRadarVisualizer();
  const grids = visualizer.generateGridLevels(4);
  assert.strictEqual(grids.length, 4);
  assert.strictEqual(grids[0].percentage, 25);
  assert.strictEqual(grids[3].percentage, 100);

  const axes = visualizer.generateAxisLines();
  assert.strictEqual(axes.length, visualizer.metrics.length);
  axes.forEach(axis => {
    assert.ok(axis.label);
    assert.ok(axis.x1 !== undefined);
    assert.ok(axis.x2 !== undefined);
  });
});
