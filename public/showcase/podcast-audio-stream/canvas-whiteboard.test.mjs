import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamWhiteboardCanvas as Board } from './canvas-whiteboard.js';

function mark(board, tool, from, to) {
  board.begin(tool, '#f2bb70', 5);
  board.addPoint(...from);
  if (to) board.addPoint(...to);
  assert.equal(board.finish(), true);
}

test('interpolates a sparse pen move and preserves its final endpoint', () => {
  const board = new Board();
  board.begin('pen', '#f2bb70', 5);
  board.addPoint(0, 0);
  board.addPoint(20, 0);
  const [tag, attributes] = board.renderStroke();
  assert.equal(tag, 'path');
  assert.equal((attributes.d.match(/ Q /g) || []).length, 4);
  assert.ok(attributes.d.startsWith('M 0 0 Q 4 0 6 0'));
  assert.ok(attributes.d.endsWith('L 20 0'));
  assert.equal(board.finish(), true);
  assert.deepEqual(board.shapes()[0].geometry, [tag, attributes]);
});

test('renders reversed rectangles, clamped lines and single-point marks', () => {
  const board = new Board();
  mark(board, 'rectangle', [80, 90], [30, 10]);
  mark(board, 'line', [-5, 20], [1000, 600]);
  mark(board, 'pen', [50, 60]);
  const [rect, line, dot] = board.shapes().map(shape => shape.geometry);
  assert.deepEqual([rect[0], rect[1].x, rect[1].y, rect[1].width, rect[1].height], ['rect', 30, 10, 50, 80]);
  assert.equal(line[1].d, 'M 0 20 L 960 540');
  assert.deepEqual(dot, ['circle', { cx: 50, cy: 60, r: 2.5, fill: '#f2bb70' }]);
});

test('erases several objects in a single undo step and clears redo after a new edit', () => {
  const board = new Board();
  for (let i = 0; i < 3; i++) mark(board, 'pen', [i, i]);
  assert.equal(board.erase(new Set([1, 3])), true);
  assert.deepEqual(board.shapes().map(shape => shape.id), [2]);
  assert.equal(board.undo(), true);
  assert.deepEqual(board.shapes().map(shape => shape.id), [1, 2, 3]);
  assert.equal(board.redo(), true);
  assert.deepEqual(board.shapes().map(shape => shape.id), [2]);
  assert.equal(board.undo(), true);
  mark(board, 'line', [2, 0], [5, 3]);
  assert.equal(board.redo(), false);
});

test('bounds undo to 50 edits and the scene to 100 objects', () => {
  const board = new Board();
  for (let i = 0; i < 100; i++) mark(board, 'pen', [i, i]);
  assert.throws(() => board.begin('pen', '#f2bb70', 5), /Board full/);
  for (let i = 0; i < 50; i++) assert.equal(board.undo(), true);
  assert.equal(board.undo(), false);
  assert.equal(board.shapes().length, 50);
  for (let i = 0; i < 50; i++) assert.equal(board.redo(), true);
  assert.equal(board.redo(), false);
  assert.equal(board.shapes().length, 100);
});

test('keeps long pen paths bounded through the final move', () => {
  const board = new Board();
  board.begin('pen', '#f2bb70', 5);
  for (let i = 0; i < 60; i++) board.addPoint(i % 2 ? 960 : 0, i);
  const d = board.renderStroke()[1].d;
  assert.equal((d.match(/ Q /g) || []).length, 510);
  assert.ok(d.endsWith('L 960 59'));
});

test('exports stable editable SVG and restores the exact scene after undoing clear', () => {
  const board = new Board();
  mark(board, 'line', [9, 12], [23, 45]);
  const expected = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><path fill="none" stroke="#f2bb70" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M 9 12 L 23 45"/></svg>';
  assert.equal(board.exportSVG(), expected);
  board.shapes()[0].geometry[1].d = 'changed';
  assert.equal(board.exportSVG(), expected);
  assert.equal(board.clear(), true);
  assert.equal(board.clear(), false);
  assert.equal(board.undo(), true);
  assert.equal(board.exportSVG(), expected);
});

test('ignores cancelled or empty strokes and rejects invalid settings and coordinates', () => {
  const board = new Board();
  assert.throws(() => board.begin('pen', 'invalid', 5), /valid color/);
  assert.throws(() => board.begin('pen', '#f2bb70', 0), /Width/);
  board.begin('pen', '#f2bb70', 5);
  assert.equal(board.finish(), false);
  assert.throws(() => board.addPoint(NaN, 20), /finite/);
  board.addPoint(5, 3);
  board.cancel();
  assert.equal(board.renderStroke(), null);
  assert.equal(board.canUndo, false);
});
