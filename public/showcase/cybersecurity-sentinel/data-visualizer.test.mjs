import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelRadarChart } from './data-visualizer.js';

describe('CybersecuritySentinelRadarChart (Issue #1093)', () => {
  it('initializes with default metrics and center bounds', () => {
    const chart = new CybersecuritySentinelRadarChart();
    assert.equal(chart.centerX, 230);
    assert.equal(chart.centerY, 230);
    assert.equal(chart.maxRadius, 170);
    assert.equal(chart.metrics.length, 6);
  });

  it('accurately maps polar coordinates to Cartesian space across all quadrants', () => {
    const chart = new CybersecuritySentinelRadarChart({ centerX: 200, centerY: 200, maxRadius: 100 });

    // Angle 0 should point straight up: (200, 100)
    const top = chart.polarToCartesian(100, 0);
    assert.equal(Math.round(top.x), 200);
    assert.equal(Math.round(top.y), 100);

    // Angle PI / 2 should point right: (300, 200)
    const right = chart.polarToCartesian(100, Math.PI / 2);
    assert.equal(Math.round(right.x), 300);
    assert.equal(Math.round(right.y), 200);

    // Angle PI should point straight down: (200, 300)
    const bottom = chart.polarToCartesian(100, Math.PI);
    assert.equal(Math.round(bottom.x), 200);
    assert.equal(Math.round(bottom.y), 300);

    // Angle 3 * PI / 2 should point left: (100, 200)
    const left = chart.polarToCartesian(100, (3 * Math.PI) / 2);
    assert.equal(Math.round(left.x), 100);
    assert.equal(Math.round(left.y), 200);
  });

  it('generates valid SVG polygon point strings matching metric axes', () => {
    const chart = new CybersecuritySentinelRadarChart();
    const pointsStr = chart.generatePolygonPoints();

    assert.ok(typeof pointsStr === 'string');
    const points = pointsStr.split(' ');
    assert.equal(points.length, 6);

    points.forEach((pt) => {
      const [x, y] = pt.split(',').map(Number);
      assert.ok(!isNaN(x) && !isNaN(y));
      assert.ok(x >= 0 && x <= 460);
      assert.ok(y >= 0 && y <= 460);
    });
  });

  it('computes enclosed polygon area accurately using Gauss shoelace algorithm', () => {
    const chart = new CybersecuritySentinelRadarChart({ centerX: 100, centerY: 100, maxRadius: 50 });

    const fullMetrics = [
      { key: 'a', name: 'A', value: 1.0 },
      { key: 'b', name: 'B', value: 1.0 },
      { key: 'c', name: 'C', value: 1.0 },
      { key: 'd', name: 'D', value: 1.0 }
    ];

    const area = chart.computeEnclosedArea(fullMetrics);
    assert.ok(area > 0);

    // Zero area when values are 0
    const zeroMetrics = fullMetrics.map((m) => ({ ...m, value: 0 }));
    assert.equal(chart.computeEnclosedArea(zeroMetrics), 0);
  });

  it('generates concentric web grid rings', () => {
    const chart = new CybersecuritySentinelRadarChart();
    const grid = chart.generateWebGrid(5);
    assert.equal(grid.length, 5);
    grid.forEach((ring) => {
      assert.equal(ring.split(' ').length, 6);
    });
  });

  it('updates metrics dynamically and clamps values within [0, 1]', () => {
    const chart = new CybersecuritySentinelRadarChart();
    const firstKey = chart.metrics[0].key;

    assert.ok(chart.updateMetric(firstKey, 0.45));
    assert.equal(chart.metrics[0].value, 0.45);

    chart.updateMetric(firstKey, 1.8);
    assert.equal(chart.metrics[0].value, 1.0);

    chart.updateMetric(firstKey, -0.5);
    assert.equal(chart.metrics[0].value, 0.0);

    assert.equal(chart.updateMetric('invalid_key', 0.5), false);
  });
});
