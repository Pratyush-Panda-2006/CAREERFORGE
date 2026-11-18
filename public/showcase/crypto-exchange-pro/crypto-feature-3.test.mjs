import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProTelemetryVisualizer } from './telemetry-visualizer.js';

test('CryptoExchangeProTelemetryVisualizer - initializes with default series and time window', () => {
  const visualizer = new CryptoExchangeProTelemetryVisualizer();
  assert.equal(visualizer.timeWindow, '24H');
  assert.equal(visualizer.rawSeries.length, 24);

  visualizer.setTimeWindow('1H');
  assert.equal(visualizer.timeWindow, '1H');
  assert.equal(visualizer.rawSeries.length, 12);

  visualizer.setTimeWindow('7D');
  assert.equal(visualizer.timeWindow, '7D');
  assert.equal(visualizer.rawSeries.length, 14);
});

test('CryptoExchangeProTelemetryVisualizer - getCoordinateBounds computes accurate min and max', () => {
  const visualizer = new CryptoExchangeProTelemetryVisualizer();
  const testData = [
    { timestamp: 1000, value: 12000 },
    { timestamp: 2000, value: 34500 },
    { timestamp: 3000, value: 18200 }
  ];

  const bounds = visualizer.getCoordinateBounds(testData);
  assert.equal(bounds.minVal, 12000);
  assert.equal(bounds.maxVal, 34500);
  assert.equal(bounds.minTime, 1000);
  assert.equal(bounds.maxTime, 3000);
});

test('CryptoExchangeProTelemetryVisualizer - normalizeData maps throughput series between 0.0 and 1.0', () => {
  const visualizer = new CryptoExchangeProTelemetryVisualizer();
  const testData = [
    { timestamp: 1, value: 1000 },
    { timestamp: 2, value: 2000 },
    { timestamp: 3, value: 3000 }
  ];

  const normalized = visualizer.normalizeData(testData);
  assert.equal(normalized.length, 3);
  assert.equal(normalized[0], 0.0);
  assert.equal(normalized[1], 0.5);
  assert.equal(normalized[2], 1.0);
});

test('CryptoExchangeProTelemetryVisualizer - smoothPoints applies EMA smoothing correctly', () => {
  const visualizer = new CryptoExchangeProTelemetryVisualizer();
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

test('CryptoExchangeProTelemetryVisualizer - generateSvgPath builds valid SVG path strings', () => {
  const visualizer = new CryptoExchangeProTelemetryVisualizer();
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

test('CryptoExchangeProTelemetryVisualizer - getNearestPoint locates closest sample based on mouse X', () => {
  const visualizer = new CryptoExchangeProTelemetryVisualizer();
  const testData = [
    { timestamp: 10, value: 1000 },
    { timestamp: 20, value: 2000 },
    { timestamp: 30, value: 3000 }
  ];

  const matchFirst = visualizer.getNearestPoint(40, 400, testData);
  assert.equal(matchFirst.index, 0);
  assert.equal(matchFirst.point.value, 1000);

  const matchLast = visualizer.getNearestPoint(380, 400, testData);
  assert.equal(matchLast.index, 2);
  assert.equal(matchLast.point.value, 3000);
});
