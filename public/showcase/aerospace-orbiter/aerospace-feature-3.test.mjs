import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterTelemetryVisualizer } from './telemetry-visualizer.js';

test('AerospaceOrbiterTelemetryVisualizer - initializes with default series and time window', () => {
  const visualizer = new AerospaceOrbiterTelemetryVisualizer();
  assert.equal(visualizer.timeWindow, '24H');
  assert.equal(visualizer.rawSeries.length, 24);

  visualizer.setTimeWindow('1H');
  assert.equal(visualizer.timeWindow, '1H');
  assert.equal(visualizer.rawSeries.length, 12);

  visualizer.setTimeWindow('7D');
  assert.equal(visualizer.timeWindow, '7D');
  assert.equal(visualizer.rawSeries.length, 14);
});

test('AerospaceOrbiterTelemetryVisualizer - getCoordinateBounds computes accurate min and max', () => {
  const visualizer = new AerospaceOrbiterTelemetryVisualizer();
  const testData = [
    { timestamp: 1000, value: 180 },
    { timestamp: 2000, value: 540 },
    { timestamp: 3000, value: 320 }
  ];

  const bounds = visualizer.getCoordinateBounds(testData);
  assert.equal(bounds.minVal, 180);
  assert.equal(bounds.maxVal, 540);
  assert.equal(bounds.minTime, 1000);
  assert.equal(bounds.maxTime, 3000);
});

test('AerospaceOrbiterTelemetryVisualizer - normalizeData maps downlink throughput series between 0.0 and 1.0', () => {
  const visualizer = new AerospaceOrbiterTelemetryVisualizer();
  const testData = [
    { timestamp: 1, value: 100 },
    { timestamp: 2, value: 200 },
    { timestamp: 3, value: 300 }
  ];

  const normalized = visualizer.normalizeData(testData);
  assert.equal(normalized.length, 3);
  assert.equal(normalized[0], 0.0);
  assert.equal(normalized[1], 0.5);
  assert.equal(normalized[2], 1.0);
});

test('AerospaceOrbiterTelemetryVisualizer - smoothPoints applies EMA smoothing correctly', () => {
  const visualizer = new AerospaceOrbiterTelemetryVisualizer();
  const testData = [
    { value: 100 },
    { value: 200 },
    { value: 100 },
    { value: 200 }
  ];

  const smoothed = visualizer.smoothPoints(testData, 0.5);
  assert.equal(smoothed.length, 4);
  assert.equal(smoothed[0], 100);
  assert.equal(smoothed[1], 150);
  assert.equal(smoothed[2], 125);
  assert.equal(smoothed[3], 162.5);
});

test('AerospaceOrbiterTelemetryVisualizer - generateSvgPath builds valid SVG path strings', () => {
  const visualizer = new AerospaceOrbiterTelemetryVisualizer();
  const testData = [
    { value: 100 },
    { value: 200 },
    { value: 300 }
  ];

  const { pathD, areaD } = visualizer.generateSvgPath(400, 200, testData);
  assert.ok(pathD.startsWith('M'));
  assert.ok(pathD.includes('L'));
  assert.ok(areaD.endsWith('Z'));
});

test('AerospaceOrbiterTelemetryVisualizer - getNearestPoint locates closest sample based on mouse X', () => {
  const visualizer = new AerospaceOrbiterTelemetryVisualizer();
  const testData = [
    { timestamp: 10, value: 150 },
    { timestamp: 20, value: 300 },
    { timestamp: 30, value: 450 }
  ];

  const matchFirst = visualizer.getNearestPoint(40, 400, testData);
  assert.equal(matchFirst.index, 0);
  assert.equal(matchFirst.point.value, 150);

  const matchLast = visualizer.getNearestPoint(380, 400, testData);
  assert.equal(matchLast.index, 2);
  assert.equal(matchLast.point.value, 450);
});
