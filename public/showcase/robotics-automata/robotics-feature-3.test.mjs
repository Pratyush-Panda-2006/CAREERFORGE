import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataTelemetryVisualizer } from './telemetry-visualizer.js';

test('RoboticsAutomataTelemetryVisualizer - data normalization (0.0 to 1.0)', () => {
  const visualizer = new RoboticsAutomataTelemetryVisualizer();
  const raw = [5, 10, 15, 20, 25];
  const { normalized, min, max } = visualizer.normalizeData(raw);

  assert.equal(min, 5);
  assert.equal(max, 25);
  assert.equal(normalized[0], 0.0);
  assert.equal(normalized[2], 0.5);
  assert.equal(normalized[4], 1.0);

  // Flat series fallback
  const flat = visualizer.normalizeData([100, 100]);
  assert.equal(flat.normalized[0], 0.5);

  // Empty array
  const empty = visualizer.normalizeData([]);
  assert.equal(empty.normalized.length, 0);
});

test('RoboticsAutomataTelemetryVisualizer - math interpolation', () => {
  const visualizer = new RoboticsAutomataTelemetryVisualizer();
  assert.equal(visualizer.interpolate(5, 15, 0), 5);
  assert.equal(visualizer.interpolate(5, 15, 0.5), 10);
  assert.equal(visualizer.interpolate(5, 15, 1), 15);

  // Clamping
  assert.equal(visualizer.interpolate(5, 15, -0.2), 5);
  assert.equal(visualizer.interpolate(5, 15, 1.2), 15);
});

test('RoboticsAutomataTelemetryVisualizer - min/max coordinate bounding', () => {
  const visualizer = new RoboticsAutomataTelemetryVisualizer(null, { padding: 30 });
  const width = 800;
  const height = 400;
  const padding = 30;

  // Bottom boundary (normalized = 0.0 => Y = height - padding)
  const bottomPoint = visualizer.mapCoordinates(0.0, 0, 5, width, height, padding);
  assert.equal(bottomPoint.x, 30);
  assert.equal(bottomPoint.y, 370);

  // Top boundary (normalized = 1.0 => Y = padding)
  const topPoint = visualizer.mapCoordinates(1.0, 4, 5, width, height, padding);
  assert.equal(topPoint.x, 770);
  assert.equal(topPoint.y, 30);
});

test('RoboticsAutomataTelemetryVisualizer - data point smoothing', () => {
  const visualizer = new RoboticsAutomataTelemetryVisualizer();
  const rawPoints = [10, 50, 10, 50, 10];
  const smoothed = visualizer.smoothPoints(rawPoints, 3);
  assert.equal(smoothed.length, 5);
  assert.ok(smoothed[2] > 10 && smoothed[2] < 50);
});

test('RoboticsAutomataTelemetryVisualizer - nearest point detection for mouse events', () => {
  const visualizer = new RoboticsAutomataTelemetryVisualizer();
  const totalCount = 11;
  const width = 1000;
  const padding = 0;

  assert.equal(visualizer.findNearestPoint(0, totalCount, width, padding), 0);
  assert.equal(visualizer.findNearestPoint(49, totalCount, width, padding), 0);
  assert.equal(visualizer.findNearestPoint(51, totalCount, width, padding), 1);
  assert.equal(visualizer.findNearestPoint(1000, totalCount, width, padding), 10);
});
