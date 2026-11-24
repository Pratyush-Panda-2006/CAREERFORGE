import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarWhiteboardCanvas } from './canvas-whiteboard.js';

test('AutomotiveHypercarWhiteboardCanvas - initializes with default values and settings', () => {
  const wb = new AutomotiveHypercarWhiteboardCanvas({ width: 800, height: 600, maxHistory: 10 });
  assert.strictEqual(wb.width, 800);
  assert.strictEqual(wb.height, 600);
  assert.strictEqual(wb.maxHistory, 10);
  assert.strictEqual(wb.currentTool, 'pen');
  assert.strictEqual(wb.currentColor, '#ef4444');
  assert.strictEqual(wb.currentWidth, 4);
  assert.strictEqual(wb.strokes.length, 0);
  assert.strictEqual(wb.redoStack.length, 0);
});

test('AutomotiveHypercarWhiteboardCanvas - calculates Euclidean distance accurately', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 3, y: 4 };
  const dist = AutomotiveHypercarWhiteboardCanvas.distance(p1, p2);
  assert.strictEqual(dist, 5);
});

test('AutomotiveHypercarWhiteboardCanvas - point distance interpolation calculates intermediate points', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 10, y: 0 };
  const step = 2;
  const interpolated = AutomotiveHypercarWhiteboardCanvas.interpolatePoints(p1, p2, step);

  assert.ok(Array.isArray(interpolated));
  assert.strictEqual(interpolated.length, 5);
  assert.deepStrictEqual(interpolated[0], { x: 2, y: 0 });
  assert.deepStrictEqual(interpolated[interpolated.length - 1], { x: 10, y: 0 });

  // Coinciding or very close points return target
  const close = AutomotiveHypercarWhiteboardCanvas.interpolatePoints(p1, { x: 1, y: 1 }, 5);
  assert.strictEqual(close.length, 1);
  assert.deepStrictEqual(close[0], { x: 1, y: 1 });
});

test('AutomotiveHypercarWhiteboardCanvas - smoothPoints filters high-frequency jitter with moving average', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 20 },
    { x: 20, y: 0 }
  ];
  const smoothed = AutomotiveHypercarWhiteboardCanvas.smoothPoints(points);
  assert.strictEqual(smoothed.length, 3);
  assert.deepStrictEqual(smoothed[0], { x: 0, y: 0 });
  // (0 + 20 + 20) / 4 = 10, (0 + 40 + 0) / 4 = 10
  assert.deepStrictEqual(smoothed[1], { x: 10, y: 10 });
  assert.deepStrictEqual(smoothed[2], { x: 20, y: 0 });
});

test('AutomotiveHypercarWhiteboardCanvas - stroke history and boundary limits', () => {
  const maxHistory = 3;
  const wb = new AutomotiveHypercarWhiteboardCanvas({ maxHistory });

  for (let i = 1; i <= 5; i++) {
    wb.startStroke(i * 10, i * 10);
    wb.addPoint(i * 10 + 5, i * 10 + 5);
    wb.endStroke();
  }

  // History must be strictly capped at maxHistory
  assert.strictEqual(wb.strokes.length, maxHistory);

  // Undo / Redo behavior
  const undone = wb.undo();
  assert.ok(undone);
  assert.strictEqual(wb.strokes.length, 2);
  assert.strictEqual(wb.redoStack.length, 1);

  const redone = wb.redo();
  assert.strictEqual(redone, undone);
  assert.strictEqual(wb.strokes.length, 3);
  assert.strictEqual(wb.redoStack.length, 0);

  // Clear resets strokes and redo stack
  wb.clear();
  assert.strictEqual(wb.strokes.length, 0);
  assert.strictEqual(wb.redoStack.length, 0);
});

test('AutomotiveHypercarWhiteboardCanvas - SVG path serialization exports valid elements', () => {
  const wb = new AutomotiveHypercarWhiteboardCanvas({ width: 600, height: 400 });

  // 1. Pen freehand stroke
  wb.setTool('pen');
  wb.setColor('#38bdf8');
  wb.setWidth(5);
  wb.startStroke(10, 20);
  wb.addPoint(50, 60);
  wb.addPoint(100, 120);
  wb.endStroke();

  // 2. Line stroke
  wb.setTool('line');
  wb.setColor('#22c55e');
  wb.setWidth(3);
  wb.startStroke(100, 100);
  wb.addPoint(200, 200);
  wb.endStroke();

  // 3. Rectangle stroke
  wb.setTool('rectangle');
  wb.setColor('#eab308');
  wb.setWidth(2);
  wb.startStroke(20, 30);
  wb.addPoint(80, 90);
  wb.endStroke();

  const svg = wb.exportSVG();
  assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('viewBox="0 0 600 400"'));
  assert.ok(svg.includes('<path d="M 10 20'));
  assert.ok(svg.includes('stroke="#38bdf8"'));
  assert.ok(svg.includes('<line x1="100" y1="100" x2="200" y2="200" stroke="#22c55e"'));
  assert.ok(svg.includes('<rect x="20" y="30" width="60" height="60"'));
  assert.ok(svg.includes('</svg>'));
});
