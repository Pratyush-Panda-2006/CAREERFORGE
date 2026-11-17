import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingTelemetryVisualizer } from './telemetry-visualizer.js';

test('AgritechPrecisionFarmingTelemetryVisualizer - data normalization (0.0 to 1.0)', () => {
  const visualizer = new AgritechPrecisionFarmingTelemetryVisualizer();
  const raw = [10, 20, 30, 40, 50];
  const { normalized, min, max } = visualizer.normalizeData(raw);

  assert.equal(min, 10);
  assert.equal(max, 50);
  assert.equal(normalized[0], 0.0);
  assert.equal(normalized[2], 0.5);
  assert.equal(normalized[4], 1.0);

  // Flat series fallback
  const flat = visualizer.normalizeData([42, 42, 42]);
  assert.equal(flat.normalized[0], 0.5);

  // Empty array
  const empty = visualizer.normalizeData([]);
  assert.equal(empty.normalized.length, 0);
});

test('AgritechPrecisionFarmingTelemetryVisualizer - math interpolation', () => {
  const visualizer = new AgritechPrecisionFarmingTelemetryVisualizer();
  assert.equal(visualizer.interpolate(10, 20, 0), 10);
  assert.equal(visualizer.interpolate(10, 20, 0.5), 15);
  assert.equal(visualizer.interpolate(10, 20, 1), 20);

  // Clamping check
  assert.equal(visualizer.interpolate(10, 20, -0.5), 10);
  assert.equal(visualizer.interpolate(10, 20, 1.5), 20);
});

test('AgritechPrecisionFarmingTelemetryVisualizer - min/max coordinate bounding', () => {
  const visualizer = new AgritechPrecisionFarmingTelemetryVisualizer(null, { padding: 30 });
  const width = 800;
  const height = 400;
  const padding = 30;

  // Bottom boundary (normalized = 0.0 => Y = height - padding)
  const bottomPoint = visualizer.mapCoordinates(0.0, 0, 5, width, height, padding);
  assert.equal(bottomPoint.x, 30);
  assert.equal(bottomPoint.y, 370); // 400 - 30

  // Top boundary (normalized = 1.0 => Y = padding)
  const topPoint = visualizer.mapCoordinates(1.0, 4, 5, width, height, padding);
  assert.equal(topPoint.x, 770); // 800 - 30
  assert.equal(topPoint.y, 30);
});

test('AgritechPrecisionFarmingTelemetryVisualizer - data point smoothing', () => {
  const visualizer = new AgritechPrecisionFarmingTelemetryVisualizer();
  const rawPoints = [0, 10, 0, 10, 0];
  const smoothed = visualizer.smoothPoints(rawPoints, 3);
  assert.equal(smoothed.length, 5);
  // Center point smoothed average of [10, 0, 10] = 6.667
  assert.ok(smoothed[2] > 0 && smoothed[2] < 10);
});

test('AgritechPrecisionFarmingTelemetryVisualizer - nearest point detection for mouse events', () => {
  const visualizer = new AgritechPrecisionFarmingTelemetryVisualizer();
  const totalCount = 11;
  const width = 1000;
  const padding = 0; // step = 100

  assert.equal(visualizer.findNearestPoint(0, totalCount, width, padding), 0);
  assert.equal(visualizer.findNearestPoint(49, totalCount, width, padding), 0);
  assert.equal(visualizer.findNearestPoint(51, totalCount, width, padding), 1);
  assert.equal(visualizer.findNearestPoint(1000, totalCount, width, padding), 10);
});
