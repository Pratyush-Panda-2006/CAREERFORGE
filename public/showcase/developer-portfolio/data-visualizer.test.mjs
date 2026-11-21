import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioRadarChart } from './data-visualizer.js';

describe('DeveloperPortfolioRadarChart (Issue #1041)', () => {
  it('initializes with default engineering competency metrics and center bounds', () => {
    const chart = new DeveloperPortfolioRadarChart({ cx: 200, cy: 200, maxRadius: 150 });
    assert.equal(chart.cx, 200);
    assert.equal(chart.cy, 200);
    assert.equal(chart.maxRadius, 150);
    assert.equal(chart.metrics.length, 6);
    assert.equal(chart.metrics[0].key, 'codeQuality');
  });

  it('accurately maps polar coordinates to Cartesian space across all quadrants', () => {
    const chart = new DeveloperPortfolioRadarChart({ cx: 100, cy: 100 });
    // Angle 0: Top (x = 100, y = 100 - 50 = 50)
    const top = chart.polarToCartesian(50, 0);
    assert.equal(top.x, 100);
    assert.equal(top.y, 50);

    // Angle PI/2: Right (x = 100 + 50 = 150, y = 100)
    const right = chart.polarToCartesian(50, Math.PI / 2);
    assert.equal(right.x, 150);
    assert.equal(right.y, 100);

    // Angle PI: Bottom (x = 100, y = 100 + 50 = 150)
    const bottom = chart.polarToCartesian(50, Math.PI);
    assert.equal(bottom.x, 100);
    assert.equal(bottom.y, 150);
  });

  it('normalizes skill metric values strictly to [0.0, 1.0] scale', () => {
    const chart = new DeveloperPortfolioRadarChart({ maxValue: 100 });
    const normalized = chart.normalizeMetrics([{ value: 0 }, { value: 60 }, { value: 100 }]);
    assert.deepEqual(normalized, [0.0, 0.6, 1.0]);

    const empty = chart.normalizeMetrics([]);
    assert.deepEqual(empty, []);
  });

  it('generates valid SVG polygon point strings matching skill axes', () => {
    const chart = new DeveloperPortfolioRadarChart();
    const { points, pointsString } = chart.generatePolygonPoints();
    assert.equal(points.length, 6);
    assert.ok(typeof pointsString === 'string');
    assert.equal(pointsString.split(' ').length, 6);

    pointsString.split(' ').forEach(coord => {
      const [x, y] = coord.split(',').map(Number);
      assert.ok(!isNaN(x) && !isNaN(y));
    });
  });

  it('computes enclosed polygon area accurately using Gauss shoelace algorithm', () => {
    const chart = new DeveloperPortfolioRadarChart();
    // Test square with side 40: (0,0), (40,0), (40,40), (0,40) => Area = 1600
    const square = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 40 },
      { x: 0, y: 40 }
    ];
    const area = chart.computeEnclosedArea(square);
    assert.equal(area, 1600);

    // Under 3 points returns 0
    assert.equal(chart.computeEnclosedArea([]), 0);
  });

  it('generates concentric web grids and radial axis spokes', () => {
    const chart = new DeveloperPortfolioRadarChart();
    const webs = chart.generateWebPolygons(5);
    assert.equal(webs.length, 5);
    assert.equal(webs[0].level, 1);
    assert.ok(webs[4].radius > webs[0].radius);

    const axes = chart.generateAxes();
    assert.equal(axes.length, 6);
    assert.equal(axes[0].x1, chart.cx);
    assert.equal(axes[0].y1, chart.cy);
  });

  it('updates individual metric values and aggregates overall competency summaries', () => {
    const chart = new DeveloperPortfolioRadarChart();
    assert.ok(chart.setMetricValue('codeQuality', 98));
    assert.equal(chart.metrics.find(m => m.key === 'codeQuality').value, 98);
    assert.equal(chart.setMetricValue('unknown_skill', 50), false);

    const summary = chart.getMetricsSummary();
    assert.ok(summary.enclosedArea > 0);
    assert.ok(summary.overallPerformanceScore > 0 && summary.overallPerformanceScore <= 100);
    assert.equal(summary.axisCount, 6);
  });
});
