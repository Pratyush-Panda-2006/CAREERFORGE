import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultRadarChart } from './data-visualizer.js';

describe('FintechVaultRadarChart (Issue #1057)', () => {
  it('initializes with default capital solvency metrics and center bounds', () => {
    const chart = new FintechVaultRadarChart();
    assert.equal(chart.centerX, 230);
    assert.equal(chart.centerY, 230);
    assert.equal(chart.maxRadius, 170);
    assert.equal(chart.metrics.length, 6);
  });

  it('accurately maps polar coordinates to Cartesian space across all quadrants', () => {
    const chart = new FintechVaultRadarChart({ centerX: 200, centerY: 200, maxRadius: 100 });

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
    const chart = new FintechVaultRadarChart();
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
    const chart = new FintechVaultRadarChart({ centerX: 100, centerY: 100, maxRadius: 50 });

    const fullMetrics = [
      { key: 'a', name: 'A', value: 1.0 },
      { key: 'b', name: 'B', value: 1.0 },
      { key: 'c', name: 'C', value: 1.0 },
      { key: 'd', name: 'D', value: 1.0 },
      { key: 'e', name: 'E', value: 1.0 },
      { key: 'f', name: 'F', value: 1.0 }
    ];

    const area = chart.computeEnclosedArea(fullMetrics);
    assert.ok(Math.abs(area - 6495.19) < 2);

    const zeroMetrics = fullMetrics.map((m) => ({ ...m, value: 0 }));
    assert.equal(chart.computeEnclosedArea(zeroMetrics), 0);
  });

  it('generates concentric web grids and radial axis spokes', () => {
    const chart = new FintechVaultRadarChart();
    const grid = chart.generateWebGrid(4);
    assert.equal(grid.length, 4);

    const spokes = chart.getSpokeCoordinates();
    assert.equal(spokes.length, 6);
    spokes.forEach((s) => {
      assert.equal(s.x1, chart.centerX);
      assert.equal(s.y1, chart.centerY);
      assert.ok(s.labelX !== undefined);
      assert.ok(s.labelY !== undefined);
    });
  });

  it('updates individual metric values and aggregates overall competency summaries', () => {
    const chart = new FintechVaultRadarChart();
    const updated = chart.updateMetric('liquidity', 0.99);
    assert.equal(updated, true);

    const m = chart.metrics.find((item) => item.key === 'liquidity');
    assert.equal(m.value, 0.99);

    const summary = chart.getMetricsSummary();
    assert.equal(summary.totalMetrics, 6);
    assert.ok(summary.averageScore > 0.8 && summary.averageScore <= 1.0);
    assert.ok(summary.enclosedArea > 0);

    // Invalid metric key
    assert.equal(chart.updateMetric('nonexistent', 0.5), false);
  });
});
