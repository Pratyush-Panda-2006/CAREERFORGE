import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubRadarChart } from './data-visualizer.js';

describe('FestivalHubRadarChart (Issue #1033)', () => {
  it('initializes with default center coordinates, radius, and axes metrics', () => {
    const chart = new FestivalHubRadarChart({ cx: 200, cy: 200, maxRadius: 150 });
    assert.equal(chart.cx, 200);
    assert.equal(chart.cy, 200);
    assert.equal(chart.maxRadius, 150);
    assert.equal(chart.metrics.length, 6);
    assert.equal(chart.metrics[0].key, 'acoustics');
  });

  it('correctly maps polar coordinates to Cartesian space across cardinal directions', () => {
    const chart = new FestivalHubRadarChart({ cx: 100, cy: 100 });
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

  it('normalizes metrics to [0.0, 1.0] scale', () => {
    const chart = new FestivalHubRadarChart({ maxValue: 100 });
    const normalized = chart.normalizeMetrics([{ value: 0 }, { value: 50 }, { value: 100 }]);
    assert.deepEqual(normalized, [0.0, 0.5, 1.0]);

    const empty = chart.normalizeMetrics([]);
    assert.deepEqual(empty, []);
  });

  it('generates valid SVG polygon point strings matching data length', () => {
    const chart = new FestivalHubRadarChart();
    const { points, pointsString } = chart.generatePolygonPoints();
    assert.equal(points.length, 6);
    assert.ok(typeof pointsString === 'string');
    assert.equal(pointsString.split(' ').length, 6);

    // Each coordinate pair has x,y format
    pointsString.split(' ').forEach(coord => {
      const [x, y] = coord.split(',').map(Number);
      assert.ok(!isNaN(x) && !isNaN(y));
    });
  });

  it('computes enclosed polygon area accurately using Gauss shoelace algorithm', () => {
    const chart = new FestivalHubRadarChart();
    // Test square with side 20: (0,0), (20,0), (20,20), (0,20) => Area = 400
    const square = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 }
    ];
    const area = chart.computeEnclosedArea(square);
    assert.equal(area, 400);

    // Empty or under 3 points returns 0
    assert.equal(chart.computeEnclosedArea([]), 0);
  });

  it('generates concentric web grids and radial axis spokes', () => {
    const chart = new FestivalHubRadarChart();
    const webs = chart.generateWebPolygons(4);
    assert.equal(webs.length, 4);
    assert.equal(webs[0].level, 1);
    assert.ok(webs[3].radius > webs[0].radius);

    const axes = chart.generateAxes();
    assert.equal(axes.length, 6);
    assert.equal(axes[0].x1, chart.cx);
    assert.equal(axes[0].y1, chart.cy);
  });

  it('updates individual metric values and aggregates telemetry summaries', () => {
    const chart = new FestivalHubRadarChart();
    assert.ok(chart.setMetricValue('acoustics', 99));
    assert.equal(chart.metrics.find(m => m.key === 'acoustics').value, 99);
    assert.equal(chart.setMetricValue('non_existent', 50), false);

    const summary = chart.getMetricsSummary();
    assert.ok(summary.enclosedArea > 0);
    assert.ok(summary.overallPerformanceScore > 0 && summary.overallPerformanceScore <= 100);
    assert.equal(summary.axisCount, 6);
  });
});
