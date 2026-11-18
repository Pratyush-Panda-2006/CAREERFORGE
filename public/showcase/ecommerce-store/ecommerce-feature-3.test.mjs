import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/ecommerce-store/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function loadContext() {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } },
      documentElement: { setAttribute: () => {} }
    },
    window: {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    console,
    Math,
    Date,
    JSON,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return context;
}

test('EcommerceStoreTelemetryVisualizer initializes correctly with default configuration', () => {
  const ctx = loadContext();
  const Visualizer = ctx.EcommerceStoreTelemetryVisualizer;
  assert.equal(typeof Visualizer, 'function');

  const viz = new Visualizer();
  assert.equal(viz.timeWindow, '24H');
  const data = viz.getDataForWindow('24H');
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 10);
});

test('normalizeData scales values accurately between 0.0 and 1.0', () => {
  const ctx = loadContext();
  const viz = new ctx.EcommerceStoreTelemetryVisualizer();

  const values = [100, 200, 300, 400, 500];
  const normalized = viz.normalizeData(values);

  assert.equal(normalized[0], 0.0);
  assert.equal(normalized[2], 0.5);
  assert.equal(normalized[4], 1.0);

  // Equal values edge case
  const uniform = viz.normalizeData([50, 50, 50]);
  assert.equal(uniform[0], 0.5);
});

test('interpolatePoints performs smooth numerical interpolation across data array', () => {
  const ctx = loadContext();
  const viz = new ctx.EcommerceStoreTelemetryVisualizer();

  const raw = [0, 10];
  const interpolated = viz.interpolatePoints(raw, 5);
  assert.equal(interpolated.length, 5);
  assert.equal(interpolated[0], 0);
  assert.equal(interpolated[4], 10);
  assert.equal(interpolated[2], 5);
});

test('calculateCoordinates maps normalized points to bounded canvas dimensions', () => {
  const ctx = loadContext();
  const viz = new ctx.EcommerceStoreTelemetryVisualizer();

  const points = [0.0, 0.5, 1.0];
  const coords = viz.calculateCoordinates(points, 400, 200, 20);

  assert.equal(coords.length, 3);
  // First point at left padding
  assert.equal(coords[0].x, 20);
  // Last point at right padding boundary (400 - 20 = 380)
  assert.equal(coords[2].x, 380);

  // Inverted Y: 0.0 value is at bottom (200 - 20 = 180), 1.0 is at top (20)
  assert.equal(coords[0].y, 180);
  assert.equal(coords[1].y, 100);
  assert.equal(coords[2].y, 20);
});

test('findNearestPoint identifies closest data coordinate to hover position', () => {
  const ctx = loadContext();
  const viz = new ctx.EcommerceStoreTelemetryVisualizer();

  const points = [10, 25, 40, 80, 120];
  // 5 points across width 400 with padding 20
  const nearestStart = viz.findNearestPoint(25, points, 400, 20);
  assert.equal(nearestStart.index, 0);
  assert.equal(nearestStart.value, 10);

  const nearestEnd = viz.findNearestPoint(375, points, 400, 20);
  assert.equal(nearestEnd.index, 4);
  assert.equal(nearestEnd.value, 120);
});
