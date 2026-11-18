import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/agency-studio/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function createEnvironment() {
  const sandbox = {
    console,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    JSON,
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => []
    },
    window: {
      addEventListener: () => {}
    }
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(scriptCode, sandbox);
  sandbox.AgencyStudioTelemetryVisualizer = sandbox.AgencyStudioTelemetryVisualizer || sandbox.window?.AgencyStudioTelemetryVisualizer;
  return sandbox;
}

test('AgencyStudioTelemetryVisualizer initializes correctly with default state', () => {
  const env = createEnvironment();
  assert.ok(env.AgencyStudioTelemetryVisualizer, 'AgencyStudioTelemetryVisualizer must be defined');
  const visualizer = new env.AgencyStudioTelemetryVisualizer();
  assert.equal(visualizer.activeWindow, '24H');
  assert.ok(visualizer.datasets['24H']);
  assert.ok(visualizer.datasets['1H']);
  assert.ok(visualizer.datasets['7D']);
});

test('normalizeData scales metrics accurately between 0.0 and 1.0', () => {
  const env = createEnvironment();
  const visualizer = new env.AgencyStudioTelemetryVisualizer();

  const data = [10, 20, 30, 40, 50];
  const normalized = visualizer.normalizeData(data);

  assert.equal(normalized[0], 0.0);
  assert.equal(normalized[2], 0.5);
  assert.equal(normalized[4], 1.0);

  // Constant array edge case
  const uniform = visualizer.normalizeData([100, 100, 100]);
  assert.deepEqual(uniform, [0.5, 0.5, 0.5]);
});

test('interpolatePoints performs linear parametric math interpolation', () => {
  const env = createEnvironment();
  const visualizer = new env.AgencyStudioTelemetryVisualizer();

  const p0 = { x: 10, y: 20 };
  const p1 = { x: 50, y: 100 };

  const mid = visualizer.interpolatePoints(p0, p1, 0.5);
  assert.equal(mid.x, 30);
  assert.equal(mid.y, 60);

  const start = visualizer.interpolatePoints(p0, p1, 0);
  assert.equal(start.x, 10);
  assert.equal(start.y, 20);
});

test('calculateCoordinates maps normalized values within canvas boundaries', () => {
  const env = createEnvironment();
  const visualizer = new env.AgencyStudioTelemetryVisualizer(null, {
    padding: { top: 10, right: 10, bottom: 10, left: 10 }
  });

  const data = [0, 50, 100];
  const coords = visualizer.calculateCoordinates(data, 200, 100);

  assert.equal(coords.length, 3);
  // First coordinate: x is padding.left (10), y is max (height - padding.bottom = 90)
  assert.equal(coords[0].x, 10);
  assert.equal(coords[0].y, 90);

  // Last coordinate: x is width - padding.right (190), y is padding.top (10)
  assert.equal(coords[2].x, 190);
  assert.equal(coords[2].y, 10);
});

test('findNearestPoint identifies closest point based on mouse X position', () => {
  const env = createEnvironment();
  const visualizer = new env.AgencyStudioTelemetryVisualizer();

  const coords = [
    { x: 50, y: 30, raw: 10 },
    { x: 150, y: 60, raw: 25 },
    { x: 250, y: 40, raw: 40 }
  ];

  const closest = visualizer.findNearestPoint(coords, 140);
  assert.equal(closest.raw, 25);

  const closestFirst = visualizer.findNearestPoint(coords, 60);
  assert.equal(closestFirst.raw, 10);
});
