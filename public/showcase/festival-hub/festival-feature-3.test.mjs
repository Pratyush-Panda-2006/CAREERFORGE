import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubTelemetryVisualizer } from './telemetry-visualizer.js';

test('FestivalHubTelemetryVisualizer initializes with default 24H data points', () => {
  const visualizer = new FestivalHubTelemetryVisualizer();
  assert.equal(visualizer.timeWindow, '24H');
  assert.equal(visualizer.rawSeries.length, 24);
  assert.ok(visualizer.rawSeries[0].value > 0);
});

test('setTimeWindow updates time-series bucket size', () => {
  const visualizer = new FestivalHubTelemetryVisualizer();

  visualizer.setTimeWindow('1H');
  assert.equal(visualizer.timeWindow, '1H');
  assert.equal(visualizer.rawSeries.length, 12);

  visualizer.setTimeWindow('7D');
  assert.equal(visualizer.timeWindow, '7D');
  assert.equal(visualizer.rawSeries.length, 14);

  const invalid = visualizer.setTimeWindow('30D');
  assert.equal(invalid, false);
});

test('normalizeData scales metrics strictly within [0.0, 1.0] boundary', () => {
  const sample = [
    { timestamp: 1000, value: 200 },
    { timestamp: 2000, value: 400 },
    { timestamp: 3000, value: 600 }
  ];
  const visualizer = new FestivalHubTelemetryVisualizer({ data: sample });
  const normalized = visualizer.normalizeData();

  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].normalized, 0.0);
  assert.equal(normalized[1].normalized, 0.5);
  assert.equal(normalized[2].normalized, 1.0);

  // Check bounds
  const bounds = visualizer.getCoordinateBounds(sample);
  assert.equal(bounds.minVal, 200);
  assert.equal(bounds.maxVal, 600);
});

test('interpolate creates smooth sub-sample points with linear precision', () => {
  const sample = [
    { timestamp: 0, value: 100 },
    { timestamp: 100, value: 200 }
  ];
  const visualizer = new FestivalHubTelemetryVisualizer({ data: sample });
  const smoothed = visualizer.interpolate(sample, 5);

  assert.equal(smoothed.length, 5);
  assert.equal(smoothed[0].value, 100);
  assert.equal(smoothed[1].value, 125);
  assert.equal(smoothed[2].value, 150);
  assert.equal(smoothed[3].value, 175);
  assert.equal(smoothed[4].value, 200);
});

test('getCoordinateAt accurately calculates hit index and coordinates', () => {
  const sample = [
    { timestamp: 100, value: 50 },
    { timestamp: 200, value: 150 },
    { timestamp: 300, value: 250 }
  ];
  const visualizer = new FestivalHubTelemetryVisualizer({
    data: sample,
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  const hit = visualizer.getCoordinateAt(150, 50, 300, 100);
  assert.ok(hit);
  assert.equal(hit.index, 1);
  assert.equal(hit.value, 150);

  // Out of bounds hit returns null
  const outOfBounds = visualizer.getCoordinateAt(-10, 50, 300, 100);
  assert.equal(outOfBounds, null);
});

test('exportSVG generates valid SVG markup with linear gradients and path curves', () => {
  const visualizer = new FestivalHubTelemetryVisualizer();
  const svg = visualizer.exportSVG(500, 200);

  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('viewBox="0 0 500 200"'));
  assert.ok(svg.includes('linearGradient id="festivalLineGrad"'));
  assert.ok(svg.includes('<path d="M '));
  assert.ok(svg.includes('</svg>'));
});
