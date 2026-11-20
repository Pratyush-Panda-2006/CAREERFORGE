import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingWhiteboardCanvas as Board } from './canvas-whiteboard.js';
const stroke = (board, tool = 'pen', points = [[10, 10], [30, 40]]) => {
  board.beginStroke(tool); points.forEach(([x, y]) => board.addPoint(x, y)); board.finishStroke();
};

test('points interpolate with bounded distance, ignore jitter and clamp to the logical sheet', () => {
  const b = new Board(); b.beginStroke(); b.addPoint(0, 0); b.addPoint(32, 0);
  assert.equal(b.draft.points.length, 5);
  assert.deepEqual(b.draft.points.at(-1), { x: 32, y: 0 });
  assert.equal(b.addPoint(32.1, 0), false);
  for (let i = 1; i < b.draft.points.length; i++) assert.ok(b.draft.points[i].x - b.draft.points[i - 1].x <= 8);
  b.addPoint(-10, 1000); assert.deepEqual(b.draft.points.at(-1), { x: 0, y: 650 });
  assert.throws(() => b.addPoint(NaN, 1)); assert.throws(() => b.addPoint(1, Infinity));
});
test('smoothing, taps, lines and reversed rectangles serialize to finite paths', () => {
  const b = new Board(); b.beginStroke(); b.addPoint(10, 10);
  assert.equal(b.renderStroke(), 'M 10 10 l 0.01 0'); b.addPoint(26, 10);
  assert.equal(b.renderStroke(), 'M 10 10 Q 18 10 22 10 Q 26 10 26 10');
  b.beginStroke('line'); b.addPoint(20, 20); b.addPoint(10, 5);
  assert.equal(b.renderStroke(), 'M 20 20 L 10 5');
  b.beginStroke('rectangle'); b.addPoint(40, 30); b.addPoint(10, 5);
  assert.equal(b.renderStroke(), 'M 40 30 H 10 V 5 H 40 Z');
});
test('undo/redo, branching edits, clear and cancellation preserve completed strokes', () => {
  const b = new Board(); assert.equal(b.undo(), false); assert.equal(b.redo(), false);
  stroke(b); const original = b.exportSVG();
  b.clear(); assert.equal(b.strokes.length, 0); b.undo(); assert.equal(b.exportSVG(), original);
  b.redo(); assert.equal(b.strokes.length, 0); b.undo(); stroke(b, 'line'); assert.equal(b.canRedo, false);
  b.beginStroke(); b.addPoint(100, 100); b.cancelStroke(); assert.equal(b.strokes.length, 2);
  b.strokes[0].points[0].x = 999; assert.equal(b.strokes[0].points[0].x, 10);
});
test('history and stroke point limits bound retained edits without phantom undo steps', () => {
  const b = new Board();
  for (let i = 0; i < 55; i++) stroke(b);
  let undone = 0; while (b.undo()) undone++;
  assert.equal(undone, Board.HISTORY_LIMIT); assert.equal(b.strokes.length, 5);
  b.beginStroke(); for (let i = 0; i < 5000; i++) b.addPoint(i % 2 ? 1000 : 0, 10);
  assert.ok(b.draft.points.length <= Board.POINT_LIMIT);
  const empty = new Board(); empty.beginStroke(); assert.equal(empty.finishStroke(), false); assert.equal(empty.canUndo, false);
});
test('stroke eraser hits segment interiors and rectangle edges, remains undoable', () => {
  const b = new Board(); stroke(b, 'line', [[10, 10], [90, 10]]);
  b.beginStroke('eraser'); b.addPoint(50, 11); assert.equal(b.finishStroke(), true);
  assert.equal(b.strokes.length, 0); b.undo(); assert.equal(b.strokes.length, 1);
  stroke(b, 'rectangle', [[100, 100], [200, 200]]);
  b.beginStroke('eraser'); b.addPoint(150, 150); assert.equal(b.finishStroke(), false);
  b.beginStroke('eraser'); b.addPoint(200, 150); b.finishStroke(); assert.equal(b.strokes.length, 1);
});
test('SVG includes completed vector paths only, with safe colors, widths and no external content', () => {
  const b = new Board(); stroke(b, 'rectangle'); b.beginStroke(); b.addPoint(80, 80);
  const svg = b.exportSVG(); assert.equal((svg.match(/<path/g) || []).length, 1);
  assert.match(svg, /viewBox="0 0 1000 650"/); assert.match(svg, /stroke="#22533b"/);
  assert.ok(!/<script|href=|foreignObject|NaN|Infinity/.test(svg));
  assert.throws(() => b.beginStroke('pen', 'red" onload="alert(1)'));
  assert.throws(() => b.beginStroke('other')); assert.throws(() => b.beginStroke('pen', '#22533b', Infinity));
});
