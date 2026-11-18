import test from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioTelemetryVisualizer } from './telemetry-visualizer.js';

test('DeveloperPortfolioTelemetryVisualizer initializes with default 24H data series', () => {
  const visualizer = new DeveloperPortfolioTelemetryVisualizer();
  assert.equal(visualizer.timeWindow, '24H');
  assert.equal(visualizer.rawSeries.length, 24);
  assert.ok(visualizer.rawSeries[0].value > 0);
});

test('setTimeWindow correctly rescales time series bucket interval', () => {
  const visualizer = new DeveloperPortfolioTelemetryVisualizer();

  visualizer.setTimeWindow('1H');
  assert.equal(visualizer.timeWindow, '1H');
  assert.equal(visualizer.rawSeries.length, 12);

  visualizer.setTimeWindow('7D');
  assert.equal(visualizer.timeWindow, '7D');
  assert.equal(visualizer.rawSeries.length, 14);

  const invalid = visualizer.setTimeWindow('30D');
  assert.equal(invalid, false);
});

test('normalizeData constrains all values to [0.0, 1.0] domain', () => {
  const sample = [
    { timestamp: 100, value: 50 },
    { timestamp: 200, value: 100 },
    { timestamp: 300, value: 150 }
  ];
  const visualizer = new DeveloperPortfolioTelemetryVisualizer({ data: sample });
  const normalized = visualizer.normalizeData();

  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].normalized, 0.0);
  assert.equal(normalized[1].normalized, 0.5);
  assert.equal(normalized[2].normalized, 1.0);

  const bounds = visualizer.getCoordinateBounds(sample);
  assert.equal(bounds.minVal, 50);
  assert.equal(bounds.maxVal, 150);
});

test('interpolate smoothly interpolates sub-sample points', () => {
  const sample = [
    { timestamp: 0, value: 10 },
    { timestamp: 100, value: 30 }
  ];
  const visualizer = new DeveloperPortfolioTelemetryVisualizer({ data: sample });
  const interpolated = visualizer.interpolate(sample, 5);

  assert.equal(interpolated.length, 5);
  assert.equal(interpolated[0].value, 10);
  assert.equal(interpolated[2].value, 20); // Midpoint at index 2
  assert.equal(interpolated[4].value, 30);
});

test('getCoordinateAt identifies hover data points and coordinate mapping', () => {
  const sample = [
    { timestamp: 100, value: 20 },
    { timestamp: 200, value: 80 }
  ];
  const visualizer = new DeveloperPortfolioTelemetryVisualizer({
    data: sample,
    padding: { top: 10, right: 10, bottom: 10, left: 10 }
  });

  const width = 200;
  const height = 100;

  // Middle hover
  const hit = visualizer.getCoordinateAt(100, 50, width, height);
  assert.ok(hit);
  assert.ok(hit.index === 0 || hit.index === 1);

  // Out of bounds check
  const outOfBounds = visualizer.getCoordinateAt(5, 50, width, height);
  assert.equal(outOfBounds, null);
});

test('exportSVG produces valid standalone SVG visualizer markup', () => {
  const sample = [
    { timestamp: 1, value: 10 },
    { timestamp: 2, value: 40 },
    { timestamp: 3, value: 25 }
  ];
  const visualizer = new DeveloperPortfolioTelemetryVisualizer({ data: sample });
  const svg = visualizer.exportSVG(500, 200);

  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox="0 0 500 200"'));
  assert.ok(svg.includes('<path d="M'));
  assert.ok(svg.endsWith('</svg>'));
});
