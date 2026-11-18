import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsWhiteboardCanvas } from './canvas-whiteboard.js';

test('LegalSmartContractsWhiteboardCanvas - initializes with default properties', () => {
  const board = new LegalSmartContractsWhiteboardCanvas();
  assert.strictEqual(board.width, 800);
  assert.strictEqual(board.height, 600);
  assert.strictEqual(board.activeTool, 'pen');
  assert.strictEqual(board.activeColor, '#38bdf8');
  assert.strictEqual(board.strokes.length, 0);
});

test('LegalSmartContractsWhiteboardCanvas - adds points and computes distance interpolation', () => {
  const board = new LegalSmartContractsWhiteboardCanvas();
  board.beginStroke('pen', '#38bdf8', 3);

  const pt1 = board.addPoint(10, 10);
  assert.strictEqual(pt1.x, 10);
  assert.strictEqual(pt1.y, 10);
  assert.strictEqual(pt1.distanceFromPrev, 0);

  const pt2 = board.addPoint(13, 14);
  // hypot(3, 4) = 5
  assert.strictEqual(pt2.distanceFromPrev, 5);
});

test('LegalSmartContractsWhiteboardCanvas - finalizes strokes and bounds stroke history to maxHistory', () => {
  const board = new LegalSmartContractsWhiteboardCanvas({ maxHistory: 3 });

  for (let i = 0; i < 5; i++) {
    board.beginStroke();
    board.addPoint(i * 10, i * 10);
    board.addPoint(i * 10 + 5, i * 10 + 5);
    board.endStroke();
  }

  assert.strictEqual(board.getStrokes().length, 3);
});

test('LegalSmartContractsWhiteboardCanvas - exports strokes as valid SVG markup', () => {
  const board = new LegalSmartContractsWhiteboardCanvas({ width: 500, height: 400 });

  // Add a line stroke
  board.beginStroke('line', '#38bdf8', 2);
  board.addPoint(0, 0);
  board.addPoint(100, 100);
  board.endStroke();

  // Add a rectangle stroke
  board.beginStroke('rectangle', '#22c55e', 4);
  board.addPoint(20, 20);
  board.addPoint(80, 60);
  board.endStroke();

  const svg = board.exportSVG();
  assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('<line x1="0" y1="0" x2="100" y2="100"'));
  assert.ok(svg.includes('<rect x="20" y="20" width="60" height="40"'));
  assert.ok(svg.includes('</svg>'));
});
