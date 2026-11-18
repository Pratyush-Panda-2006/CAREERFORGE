import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelTelemetryVisualizer } from './telemetry-visualizer.js';

test('CybersecuritySentinelTelemetryVisualizer initializes with default 24H data series', () => {
  const visualizer = new CybersecuritySentinelTelemetryVisualizer();
  assert.equal(visualizer.timeWindow, '24H');
  assert.equal(visualizer.rawSeries.length, 24);
  assert.ok(visualizer.rawSeries[0].value > 0);
  assert.ok(visualizer.rawSeries[0].anomaliesCount >= 0);
});

test('setTimeWindow correctly rescales time series bucket interval', () => {
  const visualizer = new CybersecuritySentinelTelemetryVisualizer();

  visualizer.setTimeWindow('1H');
  assert.equal(visualizer.timeWindow, '1H');
  assert.equal(visualizer.rawSeries.length, 12);

  visualizer.setTimeWindow('7D');
  assert.equal(visualizer.timeWindow, '7D');
  assert.equal(visualizer.rawSeries.length, 14);

  const invalid = visualizer.setTimeWindow('45D');
  assert.equal(invalid, false);
});

test('normalizeData constrains all values to [0.0, 1.0] domain', () => {
  const sample = [
    { timestamp: 100, value: 500 },
    { timestamp: 200, value: 1000 },
    { timestamp: 300, value: 1500 }
  ];
  const visualizer = new CybersecuritySentinelTelemetryVisualizer({ data: sample });
  const normalized = visualizer.normalizeData();

  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].normalized, 0.0);
  assert.equal(normalized[1].normalized, 0.5);
  assert.equal(normalized[2].normalized, 1.0);

  const bounds = visualizer.getCoordinateBounds(sample);
  assert.equal(bounds.minVal, 500);
  assert.equal(bounds.maxVal, 1500);
});

test('interpolate smoothly interpolates target count points', () => {
  const sample = [
    { timestamp: 100, value: 100 },
    { timestamp: 200, value: 200 }
  ];
  const visualizer = new CybersecuritySentinelTelemetryVisualizer({ data: sample });
  const interpolated = visualizer.interpolate(sample, 5);

  assert.equal(interpolated.length, 5);
  assert.equal(interpolated[0].value, 100);
  assert.equal(interpolated[2].value, 150);
  assert.equal(interpolated[4].value, 200);
  assert.equal(interpolated[2].normalized, 0.5);
});

test('findNearestPoint matches closest point given mouse X within padding', () => {
  const sample = [
    { timestamp: 100, value: 300 },
    { timestamp: 200, value: 600 },
    { timestamp: 300, value: 900 }
  ];
  const visualizer = new CybersecuritySentinelTelemetryVisualizer({
    data: sample,
    padding: { top: 10, right: 10, bottom: 10, left: 10 }
  });

  const width = 120; // plot width = 100
  // mouse at x = 10 (left boundary) -> index 0
  const first = visualizer.findNearestPoint(10, width);
  assert.equal(first.index, 0);
  assert.equal(first.point.value, 300);

  // mouse at x = 60 (middle) -> index 1
  const mid = visualizer.findNearestPoint(60, width);
  assert.equal(mid.index, 1);
  assert.equal(mid.point.value, 600);

  // mouse at x = 110 (right boundary) -> index 2
  const last = visualizer.findNearestPoint(110, width);
  assert.equal(last.index, 2);
  assert.equal(last.point.value, 900);
});

test('renderSVG generates valid SVG markup with gradient fill and stroke path', () => {
  const visualizer = new CybersecuritySentinelTelemetryVisualizer();
  const svg = visualizer.renderSVG(500, 200);

  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('</svg>'));
  assert.ok(svg.includes('<path'));
  assert.ok(svg.includes('linearGradient'));
  assert.ok(svg.includes('stroke="#10b981"'));
});
