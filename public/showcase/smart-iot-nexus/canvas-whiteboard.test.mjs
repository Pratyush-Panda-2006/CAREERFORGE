import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusWhiteboardCanvas } from './canvas-whiteboard.js';

test('SmartIotNexusWhiteboardCanvas - calculates Euclidean point distance accurately', () => {
  const dist = SmartIotNexusWhiteboardCanvas.calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
  assert.strictEqual(dist, 5);

  const zeroDist = SmartIotNexusWhiteboardCanvas.calculateDistance({ x: 10, y: 10 }, { x: 10, y: 10 });
  assert.strictEqual(zeroDist, 0);
});

test('SmartIotNexusWhiteboardCanvas - records points and creates finished stroke', () => {
  const board = new SmartIotNexusWhiteboardCanvas();
  board.startStroke(10, 20);
  board.addPoint(15, 25);
  board.addPoint(20, 30);
  const finished = board.endStroke();

  assert.strictEqual(finished.points.length, 3);
  assert.strictEqual(board.strokes.length, 1);
  assert.strictEqual(board.currentStroke, null);
});

test('SmartIotNexusWhiteboardCanvas - manages undo and redo history boundaries', () => {
  const board = new SmartIotNexusWhiteboardCanvas();
  board.startStroke(0, 0);
  board.addPoint(5, 5);
  board.endStroke();

  assert.strictEqual(board.strokes.length, 1);
  assert.strictEqual(board.undo(), true);
  assert.strictEqual(board.strokes.length, 0);
  assert.strictEqual(board.undo(), false);

  assert.strictEqual(board.redo(), true);
  assert.strictEqual(board.strokes.length, 1);
  assert.strictEqual(board.redo(), false);
});

test('SmartIotNexusWhiteboardCanvas - serializes strokes into valid SVG markup', () => {
  const board = new SmartIotNexusWhiteboardCanvas({ width: 600, height: 400 });
  board.startStroke(10, 10, { color: '#06b6d4', width: 2 });
  board.addPoint(50, 50);
  board.endStroke();

  const svg = board.exportSVG();
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('viewBox="0 0 600 400"'));
  assert.ok(svg.includes('stroke="#06b6d4"'));
  assert.ok(svg.includes('d="M 10 10 L 50 50"'));
  assert.ok(svg.includes('</svg>'));
});
