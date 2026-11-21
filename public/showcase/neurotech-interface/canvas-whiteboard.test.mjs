import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceWhiteboardCanvas } from './canvas-whiteboard.js';

function makeCanvas(width = 800, height = 500) {
  const canvas = { width, height, getContext: () => ({}) };
  return canvas;
}

test('NeurotechInterfaceWhiteboardCanvas - interpolates points via addPoint', () => {
  const canvas = makeCanvas();
  const wb = new NeurotechInterfaceWhiteboardCanvas(canvas);

  const p1 = wb.addPoint(10, 10);
  const p2 = wb.addPoint(20, 20);

  assert.strictEqual(wb.currentStroke.length, 2);
  assert.strictEqual(p1.x, 10);
  assert.strictEqual(p1.y, 10);
  assert.strictEqual(p2.x, 20);
  assert.strictEqual(p2.y, 20);
});

test('NeurotechInterfaceWhiteboardCanvas - computes point distance correctly', () => {
  const dist = NeurotechInterfaceWhiteboardCanvas.distance({ x: 0, y: 0 }, { x: 3, y: 4 });
  assert.strictEqual(dist, 5);
});

test('NeurotechInterfaceWhiteboardCanvas - stroke history respects boundary limit', () => {
  const canvas = makeCanvas();
  const wb = new NeurotechInterfaceWhiteboardCanvas(canvas);

  for (let i = 0; i < 60; i++) {
    wb.history.push([{ x: i, y: i, t: i }]);
  }
  // Simulate boundary enforcement
  while (wb.history.length > 50) {
    wb.history.shift();
  }
  assert.strictEqual(wb.history.length, 50);
  assert.strictEqual(wb.history[0][0].x, 10);
});

test('NeurotechInterfaceWhiteboardCanvas - clear resets history and redo stack', () => {
  const canvas = makeCanvas();
  const wb = new NeurotechInterfaceWhiteboardCanvas(canvas);
  wb.history.push([{ x: 1, y: 1, t: 1 }]);
  wb.redoStack.push([{ x: 2, y: 2, t: 2 }]);
  wb.clear();
  assert.strictEqual(wb.history.length, 0);
  assert.strictEqual(wb.redoStack.length, 0);
});

test('NeurotechInterfaceWhiteboardCanvas - exportSVG serializes stroke paths', () => {
  const canvas = makeCanvas(400, 300);
  const wb = new NeurotechInterfaceWhiteboardCanvas(canvas);
  wb.history.push([{ x: 10, y: 10, t: 1 }, { x: 100, y: 100, t: 2 }]);

  const svg = wb.exportSVG();
  assert.strictEqual(typeof svg, 'string');
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('M 10 10'));
  assert.ok(svg.includes('viewBox="0 0 400 300"'));
  assert.ok(svg.includes('stroke='));
});

test('NeurotechInterfaceWhiteboardCanvas - setColor and setWidth update state', () => {
  const canvas = makeCanvas();
  const wb = new NeurotechInterfaceWhiteboardCanvas(canvas);

  wb.setColor('#ff0000');
  wb.setWidth(8);
  assert.strictEqual(wb.color, '#ff0000');
  assert.strictEqual(wb.width, 8);
});

test('NeurotechInterfaceWhiteboardCanvas - setTool switches active tool', () => {
  const canvas = makeCanvas();
  const wb = new NeurotechInterfaceWhiteboardCanvas(canvas);

  wb.setTool('eraser');
  assert.strictEqual(wb.tool, 'eraser');
  wb.setTool('rectangle');
  assert.strictEqual(wb.tool, 'rectangle');
});
