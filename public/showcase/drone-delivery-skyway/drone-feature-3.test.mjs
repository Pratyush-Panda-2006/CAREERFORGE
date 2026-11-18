import test from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayTelemetryVisualizer } from './telemetry-visualizer.js';

test('DroneDeliverySkywayTelemetryVisualizer - data normalization (0.0 to 1.0)', () => {
  const visualizer = new DroneDeliverySkywayTelemetryVisualizer();
  const raw = [100, 200, 300, 400, 500];
  const { normalized, min, max } = visualizer.normalizeData(raw);

  assert.equal(min, 100);
  assert.equal(max, 500);
  assert.equal(normalized[0], 0.0);
  assert.equal(normalized[2], 0.5);
  assert.equal(normalized[4], 1.0);

  // Flat series fallback
  const flat = visualizer.normalizeData([350, 350]);
  assert.equal(flat.normalized[0], 0.5);

  // Empty array
  const empty = visualizer.normalizeData([]);
  assert.equal(empty.normalized.length, 0);
});

test('DroneDeliverySkywayTelemetryVisualizer - math interpolation', () => {
  const visualizer = new DroneDeliverySkywayTelemetryVisualizer();
  assert.equal(visualizer.interpolate(100, 300, 0), 100);
  assert.equal(visualizer.interpolate(100, 300, 0.5), 200);
  assert.equal(visualizer.interpolate(100, 300, 1), 300);

  // Clamping
  assert.equal(visualizer.interpolate(100, 300, -0.5), 100);
  assert.equal(visualizer.interpolate(100, 300, 1.5), 300);
});

test('DroneDeliverySkywayTelemetryVisualizer - min/max coordinate bounding', () => {
  const visualizer = new DroneDeliverySkywayTelemetryVisualizer(null, { padding: 30 });
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

test('DroneDeliverySkywayTelemetryVisualizer - data point smoothing', () => {
  const visualizer = new DroneDeliverySkywayTelemetryVisualizer();
  const rawPoints = [100, 500, 100, 500, 100];
  const smoothed = visualizer.smoothPoints(rawPoints, 3);
  assert.equal(smoothed.length, 5);
  assert.ok(smoothed[2] > 100 && smoothed[2] < 500);
});

test('DroneDeliverySkywayTelemetryVisualizer - nearest point detection for mouse events', () => {
  const visualizer = new DroneDeliverySkywayTelemetryVisualizer();
  const totalCount = 11;
  const width = 1000;
  const padding = 0;

  assert.equal(visualizer.findNearestPoint(0, totalCount, width, padding), 0);
  assert.equal(visualizer.findNearestPoint(49, totalCount, width, padding), 0);
  assert.equal(visualizer.findNearestPoint(51, totalCount, width, padding), 1);
  assert.equal(visualizer.findNearestPoint(1000, totalCount, width, padding), 10);
});
