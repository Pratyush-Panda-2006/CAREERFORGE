import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridWhiteboardCanvas } from './canvas-whiteboard.js';

test('RenewableMicrogridWhiteboardCanvas - calculates Euclidean point distance accurately', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 3, y: 4 };
  assert.strictEqual(RenewableMicrogridWhiteboardCanvas.calculateDistance(p1, p2), 5);

  const p3 = { x: 10, y: 15 };
  const p4 = { x: 12, y: 19 };
  assert.strictEqual(RenewableMicrogridWhiteboardCanvas.calculateDistance(p3, p4), 4.47);
});

test('RenewableMicrogridWhiteboardCanvas - records points and creates finished stroke', () => {
  const board = new RenewableMicrogridWhiteboardCanvas();
  board.startStroke(10, 20);
  assert.strictEqual(board.currentStroke.points.length, 1);

  board.addPoint(15, 25);
  board.addPoint(20, 30);
  assert.strictEqual(board.currentStroke.points.length, 3);

  const finished = board.endStroke();
  assert.strictEqual(finished.points.length, 3);
  assert.strictEqual(board.strokes.length, 1);
  assert.strictEqual(board.currentStroke, null);
});

test('RenewableMicrogridWhiteboardCanvas - manages undo and redo history boundaries', () => {
  const board = new RenewableMicrogridWhiteboardCanvas();
  assert.strictEqual(board.undo(), false);

  board.startStroke(0, 0);
  board.endStroke();
  board.startStroke(10, 10);
  board.endStroke();

  assert.strictEqual(board.strokes.length, 2);
  assert.strictEqual(board.undo(), true);
  assert.strictEqual(board.strokes.length, 1);
  assert.strictEqual(board.redo(), true);
  assert.strictEqual(board.strokes.length, 2);
  assert.strictEqual(board.redo(), false);

  assert.strictEqual(board.clear(), true);
  assert.strictEqual(board.strokes.length, 0);
});

test('RenewableMicrogridWhiteboardCanvas - serializes strokes into valid SVG markup', () => {
  const board = new RenewableMicrogridWhiteboardCanvas();
  board.startStroke(10, 20);
  board.addPoint(30, 40);
  board.endStroke();

  const svg = board.exportSVG();
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox="0 0 900 520"'));
  assert.ok(svg.includes('<path d="M 10 20 L 30 40"'));
  assert.ok(svg.endsWith('</svg>'));
});
