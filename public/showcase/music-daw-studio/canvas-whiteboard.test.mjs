import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioWhiteboardCanvas } from './canvas-whiteboard.js';

test('MusicDawStudioWhiteboardCanvas - calculates Euclidean point distance accurately', () => {
  const dist = MusicDawStudioWhiteboardCanvas.calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
  assert.strictEqual(dist, 5);

  const zeroDist = MusicDawStudioWhiteboardCanvas.calculateDistance({ x: 10, y: 10 }, { x: 10, y: 10 });
  assert.strictEqual(zeroDist, 0);
});

test('MusicDawStudioWhiteboardCanvas - records points and creates finished stroke', () => {
  const board = new MusicDawStudioWhiteboardCanvas();
  board.startStroke(10, 20);
  board.addPoint(15, 25);
  board.addPoint(20, 30);
  const finished = board.endStroke();

  assert.strictEqual(finished.points.length, 3);
  assert.strictEqual(board.strokes.length, 1);
  assert.strictEqual(board.currentStroke, null);
});

test('MusicDawStudioWhiteboardCanvas - manages undo and redo history boundaries', () => {
  const board = new MusicDawStudioWhiteboardCanvas();
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

test('MusicDawStudioWhiteboardCanvas - serializes strokes into valid SVG markup', () => {
  const board = new MusicDawStudioWhiteboardCanvas({ width: 600, height: 400 });
  board.startStroke(10, 10, { color: '#8b5cf6', width: 2 });
  board.addPoint(50, 50);
  board.endStroke();

  const svg = board.exportSVG();
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('viewBox="0 0 600 400"'));
  assert.ok(svg.includes('stroke="#8b5cf6"'));
  assert.ok(svg.includes('d="M 10 10 L 50 50"'));
  assert.ok(svg.includes('</svg>'));
});
