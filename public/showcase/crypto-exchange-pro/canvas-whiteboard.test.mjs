import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProWhiteboardCanvas } from './canvas-whiteboard.js';

test('CryptoExchangeProWhiteboardCanvas calculates distance and point interpolation accurately', () => {
  const whiteboard = new CryptoExchangeProWhiteboardCanvas(null);

  const p1 = { x: 0, y: 0 };
  const p2 = { x: 30, y: 40 };

  const dist = whiteboard.calculateDistance(p1, p2);
  assert.equal(dist, 50);

  const midpoint = whiteboard.interpolatePoint(p1, p2, 0.5);
  assert.equal(midpoint.x, 15);
  assert.equal(midpoint.y, 20);

  const quarter = whiteboard.interpolatePoint(p1, p2, 0.25);
  assert.equal(quarter.x, 7.5);
  assert.equal(quarter.y, 10);
});

test('CryptoExchangeProWhiteboardCanvas handles smoothing and point filtering', () => {
  const whiteboard = new CryptoExchangeProWhiteboardCanvas(null, { smoothingFactor: 0.5 });

  const rawPoints = [
    { x: 0, y: 0 },
    { x: 10, y: 20 },
    { x: 20, y: 0 }
  ];

  const smoothed = whiteboard.smoothPoints(rawPoints);
  assert.equal(smoothed.length, 3);
  assert.equal(smoothed[0].x, 0);
  assert.equal(smoothed[0].y, 0);
  // Midpoint smoothed between 20 and average of neighbors (0 + 0)/2 = 0 => 20 * 0.5 + 0 = 10
  assert.equal(smoothed[1].x, 10);
  assert.equal(smoothed[1].y, 10);
  assert.equal(smoothed[2].x, 20);
  assert.equal(smoothed[2].y, 0);
});

test('CryptoExchangeProWhiteboardCanvas enforces stroke history boundary limits', () => {
  const maxHistory = 5;
  const whiteboard = new CryptoExchangeProWhiteboardCanvas(null, { maxHistory });

  for (let i = 0; i < 8; i++) {
    whiteboard.startStroke(i * 10, i * 10);
    whiteboard.addPoint(i * 10 + 5, i * 10 + 5);
    whiteboard.endStroke();
  }

  assert.equal(whiteboard.strokes.length, maxHistory);
  // Oldest remaining stroke should start at x = 30 (from index 3 of 0..7)
  assert.equal(whiteboard.strokes[0].points[0].x, 30);
});

test('CryptoExchangeProWhiteboardCanvas supports undo and redo operations', () => {
  const whiteboard = new CryptoExchangeProWhiteboardCanvas(null);

  whiteboard.startStroke(10, 10);
  whiteboard.addPoint(20, 20);
  whiteboard.endStroke();

  whiteboard.startStroke(30, 30);
  whiteboard.addPoint(40, 40);
  whiteboard.endStroke();

  assert.equal(whiteboard.strokes.length, 2);

  // Undo
  const undoResult1 = whiteboard.undo();
  assert.equal(undoResult1, true);
  assert.equal(whiteboard.strokes.length, 1);
  assert.equal(whiteboard.redoStack.length, 1);

  // Redo
  const redoResult1 = whiteboard.redo();
  assert.equal(redoResult1, true);
  assert.equal(whiteboard.strokes.length, 2);
  assert.equal(whiteboard.redoStack.length, 0);

  // Clear
  whiteboard.clear();
  assert.equal(whiteboard.strokes.length, 0);
  assert.equal(whiteboard.redoStack.length, 0);
  assert.equal(whiteboard.undo(), false);
  assert.equal(whiteboard.redo(), false);
});

test('CryptoExchangeProWhiteboardCanvas serializes strokes to valid SVG elements', () => {
  const whiteboard = new CryptoExchangeProWhiteboardCanvas(null, { color: '#10b981', width: 4 });

  // 1. Pen stroke
  whiteboard.currentTool = 'pen';
  whiteboard.startStroke(5, 5);
  whiteboard.addPoint(15, 25);
  whiteboard.addPoint(35, 45);
  whiteboard.endStroke();

  // 2. Line stroke
  whiteboard.currentTool = 'line';
  whiteboard.startStroke(0, 0);
  whiteboard.addPoint(100, 100);
  whiteboard.endStroke();

  // 3. Rectangle stroke
  whiteboard.currentTool = 'rectangle';
  whiteboard.startStroke(20, 30);
  whiteboard.addPoint(80, 90);
  whiteboard.endStroke();

  const svgOutput = whiteboard.exportSVG(800, 600);
  assert.ok(svgOutput.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svgOutput.includes('<path d="M '));
  assert.ok(svgOutput.includes('<line x1="0.00" y1="0.00" x2="100.00" y2="100.00"'));
  assert.ok(svgOutput.includes('<rect x="20.00" y="30.00" width="60.00" height="60.00"'));
  assert.ok(svgOutput.includes('stroke="#10b981"'));
});
