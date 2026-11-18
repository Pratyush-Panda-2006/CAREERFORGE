import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsTelemetryVisualizer } from './telemetry-visualizer.js';

describe('SupplyChainLogisticsTelemetryVisualizer (Issue #685)', () => {
  it('initializes with default options and time window dataset', () => {
    const visualizer = new SupplyChainLogisticsTelemetryVisualizer();
    assert.equal(visualizer.timeWindow, '24H');
    assert.ok(Array.isArray(visualizer.currentData));
    assert.equal(visualizer.currentData.length, 16);
  });

  it('accurately calculates data bounds (min, max, span)', () => {
    const visualizer = new SupplyChainLogisticsTelemetryVisualizer();
    const bounds = visualizer.calculateBounds([10, 45, 90, 25]);
    assert.equal(bounds.min, 10);
    assert.equal(bounds.max, 90);
    assert.equal(bounds.span, 80);

    const flatBounds = visualizer.calculateBounds([50, 50]);
    assert.equal(flatBounds.min, 50);
    assert.equal(flatBounds.max, 50);
    assert.equal(flatBounds.span, 1);
  });

  it('normalizes arbitrary metric series strictly within [0.0, 1.0]', () => {
    const visualizer = new SupplyChainLogisticsTelemetryVisualizer();
    const normalized = visualizer.normalizeData([100, 150, 200]);
    assert.deepEqual(normalized, [0.0, 0.5, 1.0]);

    const empty = visualizer.normalizeData([]);
    assert.deepEqual(empty, []);
  });

  it('computes exponential moving average (EMA) smoothing', () => {
    const visualizer = new SupplyChainLogisticsTelemetryVisualizer({ alpha: 0.5 });
    const smoothed = visualizer.exponentialMovingAverage([10, 20, 30]);
    assert.equal(smoothed[0], 10);
    assert.equal(smoothed[1], 15); // 0.5*20 + 0.5*10
    assert.equal(smoothed[2], 22.5); // 0.5*30 + 0.5*15
  });

  it('interpolates points smoothly with boundary clamping', () => {
    const visualizer = new SupplyChainLogisticsTelemetryVisualizer();
    const p0 = { x: 0, y: 100 };
    const p1 = { x: 100, y: 200 };

    const mid = visualizer.interpolatePoint(p0, p1, 0.5);
    assert.equal(mid.x, 50);
    assert.equal(mid.y, 150);

    const clampedLow = visualizer.interpolatePoint(p0, p1, -0.2);
    assert.equal(clampedLow.x, 0);
    assert.equal(clampedLow.y, 100);

    const clampedHigh = visualizer.interpolatePoint(p0, p1, 1.5);
    assert.equal(clampedHigh.x, 100);
    assert.equal(clampedHigh.y, 200);
  });

  it('maps coordinates to pixel canvas boundaries and finds nearest hover point', () => {
    const visualizer = new SupplyChainLogisticsTelemetryVisualizer();
    const coords = visualizer.mapCoordinates([10, 50, 90], 500, 300, { top: 20, right: 20, bottom: 20, left: 20 });
    assert.equal(coords.length, 3);
    assert.equal(coords[0].x, 20);
    assert.equal(coords[2].x, 480);

    // Nearest point test
    const nearest = visualizer.findNearestPoint(240, coords);
    assert.equal(nearest.index, 1);
    assert.equal(nearest.value, 50);
  });

  it('switches time windows and summarizes aggregate performance metrics', () => {
    const visualizer = new SupplyChainLogisticsTelemetryVisualizer();
    assert.ok(visualizer.setTimeWindow('1H'));
    assert.equal(visualizer.currentData.length, 12);

    const summary = visualizer.getSummaryMetrics();
    assert.equal(summary.count, 12);
    assert.ok(summary.average > 90);
    assert.ok(summary.max <= 100);
    assert.equal(visualizer.setTimeWindow('INVALID_KEY'), false);
  });
});
