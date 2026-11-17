import test from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubTelemetryVisualizer } from './telemetry-visualizer.js';

test('VrMetaverseHubTelemetryVisualizer initializes with default 24H data points', () => {
  const visualizer = new VrMetaverseHubTelemetryVisualizer();
  assert.equal(visualizer.timeWindow, '24H');
  assert.equal(visualizer.rawSeries.length, 24);
  assert.ok(visualizer.rawSeries[0].value > 0);
});

test('VrMetaverseHubTelemetryVisualizer setTimeWindow updates time-series bucket size', () => {
  const visualizer = new VrMetaverseHubTelemetryVisualizer();

  visualizer.setTimeWindow('1H');
  assert.equal(visualizer.timeWindow, '1H');
  assert.equal(visualizer.rawSeries.length, 12);

  visualizer.setTimeWindow('7D');
  assert.equal(visualizer.timeWindow, '7D');
  assert.equal(visualizer.rawSeries.length, 14);

  const invalid = visualizer.setTimeWindow('30D');
  assert.equal(invalid, false);
});

test('VrMetaverseHubTelemetryVisualizer normalizeData scales metrics strictly within [0.0, 1.0] boundary', () => {
  const sample = [
    { timestamp: 1000, value: 200 },
    { timestamp: 2000, value: 400 },
    { timestamp: 3000, value: 600 }
  ];
  const visualizer = new VrMetaverseHubTelemetryVisualizer({ data: sample });
  const normalized = visualizer.normalizeData();

  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].normalized, 0.0);
  assert.equal(normalized[1].normalized, 0.5);
  assert.equal(normalized[2].normalized, 1.0);

  const bounds = visualizer.getCoordinateBounds(sample);
  assert.equal(bounds.minVal, 200);
  assert.equal(bounds.maxVal, 600);
});

test('VrMetaverseHubTelemetryVisualizer interpolate creates smooth sub-sample points with linear precision', () => {
  const sample = [
    { timestamp: 0, value: 100 },
    { timestamp: 100, value: 200 }
  ];
  const visualizer = new VrMetaverseHubTelemetryVisualizer({ data: sample });
  const smoothed = visualizer.interpolate(sample, 5);

  assert.equal(smoothed.length, 5);
  assert.equal(smoothed[0].value, 100);
  assert.equal(smoothed[1].value, 125);
  assert.equal(smoothed[2].value, 150);
  assert.equal(smoothed[3].value, 175);
  assert.equal(smoothed[4].value, 200);
});
