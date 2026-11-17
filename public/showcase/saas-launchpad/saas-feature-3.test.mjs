import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadTelemetryVisualizer } from './telemetry-visualizer.js';

test('SaasLaunchpadTelemetryVisualizer initializes with default 24H data series', () => {
  const visualizer = new SaasLaunchpadTelemetryVisualizer();
  assert.equal(visualizer.timeWindow, '24H');
  assert.equal(visualizer.rawSeries.length, 24);
  assert.ok(visualizer.rawSeries[0].value > 0);
});

test('setTimeWindow correctly rescales time series bucket interval', () => {
  const visualizer = new SaasLaunchpadTelemetryVisualizer();

  visualizer.setTimeWindow('1H');
  assert.equal(visualizer.timeWindow, '1H');
  assert.equal(visualizer.rawSeries.length, 12);

  visualizer.setTimeWindow('7D');
  assert.equal(visualizer.timeWindow, '7D');
  assert.equal(visualizer.rawSeries.length, 14);

  const invalid = visualizer.setTimeWindow('90D');
  assert.equal(invalid, false);
});

test('normalizeData constrains all values to [0.0, 1.0] domain', () => {
  const sample = [
    { timestamp: 100, value: 50 },
    { timestamp: 200, value: 100 },
    { timestamp: 300, value: 150 }
  ];
  const visualizer = new SaasLaunchpadTelemetryVisualizer({ data: sample });
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
  const visualizer = new SaasLaunchpadTelemetryVisualizer({ data: sample });
  const res = visualizer.interpolate(sample, 5);

  assert.equal(res.length, 5);
  assert.equal(res[0].value, 10);
  assert.equal(res[1].value, 15);
  assert.equal(res[2].value, 20);
  assert.equal(res[3].value, 25);
  assert.equal(res[4].value, 30);
});

test('getCoordinateAt identifies hover data points and coordinate mapping', () => {
  const sample = [
    { timestamp: 100, value: 90 },
    { timestamp: 200, value: 95 },
    { timestamp: 300, value: 99 }
  ];
  const visualizer = new SaasLaunchpadTelemetryVisualizer({
    data: sample,
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  const hit = visualizer.getCoordinateAt(150, 40, 300, 100);
  assert.ok(hit);
  assert.equal(hit.index, 1);
  assert.equal(hit.value, 95);

  const nullHit = visualizer.getCoordinateAt(-50, 40, 300, 100);
  assert.equal(nullHit, null);
});

test('exportSVG produces valid standalone SVG visualizer markup', () => {
  const visualizer = new SaasLaunchpadTelemetryVisualizer();
  const svg = visualizer.exportSVG(600, 260);

  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('viewBox="0 0 600 260"'));
  assert.ok(svg.includes('linearGradient id="saasLineGrad"'));
  assert.ok(svg.includes('<path d="M '));
  assert.ok(svg.includes('</svg>'));
});
