import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadRadarChart } from './data-visualizer.js';

describe('SaasLaunchpadRadarChart (Issue #1037)', () => {
  it('initializes with default SaaS reliability metrics and center bounds', () => {
    const chart = new SaasLaunchpadRadarChart({ cx: 200, cy: 200, maxRadius: 150 });
    assert.equal(chart.cx, 200);
    assert.equal(chart.cy, 200);
    assert.equal(chart.maxRadius, 150);
    assert.equal(chart.metrics.length, 6);
    assert.equal(chart.metrics[0].key, 'uptime');
  });

  it('accurately maps polar coordinates to Cartesian space across all quadrants', () => {
    const chart = new SaasLaunchpadRadarChart({ cx: 100, cy: 100 });
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

  it('normalizes SLA metric values strictly to [0.0, 1.0] scale', () => {
    const chart = new SaasLaunchpadRadarChart({ maxValue: 100 });
    const normalized = chart.normalizeMetrics([{ value: 0 }, { value: 75 }, { value: 100 }]);
    assert.deepEqual(normalized, [0.0, 0.75, 1.0]);

    const empty = chart.normalizeMetrics([]);
    assert.deepEqual(empty, []);
  });

  it('generates valid SVG polygon point strings matching metric axes', () => {
    const chart = new SaasLaunchpadRadarChart();
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
    const chart = new SaasLaunchpadRadarChart();
    // Test square with side 30: (0,0), (30,0), (30,30), (0,30) => Area = 900
    const square = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 30 },
      { x: 0, y: 30 }
    ];
    const area = chart.computeEnclosedArea(square);
    assert.equal(area, 900);

    // Under 3 points returns 0
    assert.equal(chart.computeEnclosedArea([]), 0);
  });

  it('generates concentric web grids and radial axis spokes', () => {
    const chart = new SaasLaunchpadRadarChart();
    const webs = chart.generateWebPolygons(5);
    assert.equal(webs.length, 5);
    assert.equal(webs[0].level, 1);
    assert.ok(webs[4].radius > webs[0].radius);

    const axes = chart.generateAxes();
    assert.equal(axes.length, 6);
    assert.equal(axes[0].x1, chart.cx);
    assert.equal(axes[0].y1, chart.cy);
  });

  it('updates individual metric values and aggregates overall health summaries', () => {
    const chart = new SaasLaunchpadRadarChart();
    assert.ok(chart.setMetricValue('uptime', 100));
    assert.equal(chart.metrics.find(m => m.key === 'uptime').value, 100);
    assert.equal(chart.setMetricValue('invalid_pillar', 50), false);

    const summary = chart.getMetricsSummary();
    assert.ok(summary.enclosedArea > 0);
    assert.ok(summary.overallPerformanceScore > 0 && summary.overallPerformanceScore <= 100);
    assert.equal(summary.axisCount, 6);
  });
});
