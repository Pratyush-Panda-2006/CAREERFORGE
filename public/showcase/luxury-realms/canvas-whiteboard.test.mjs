import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsWhiteboardCanvas } from './canvas-whiteboard.js';

describe('LuxuryRealmsWhiteboardCanvas', () => {
  it('records freehand stroke points accurately', () => {
    const wb = new LuxuryRealmsWhiteboardCanvas();
    wb.startStroke(10, 10);
    wb.addPoint(20, 20);
    const finished = wb.endStroke();
    assert.equal(finished.points.length, 2);
    assert.equal(wb.strokes.length, 1);
  });

  it('manages undo and redo stacks reliably', () => {
    const wb = new LuxuryRealmsWhiteboardCanvas();
    wb.startStroke(5, 5);
    wb.endStroke();
    assert.equal(wb.strokes.length, 1);
    wb.undo();
    assert.equal(wb.strokes.length, 0);
    wb.redo();
    assert.equal(wb.strokes.length, 1);
  });

  it('calculates Euclidean distance between points', () => {
    const dist = LuxuryRealmsWhiteboardCanvas.calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
    assert.equal(dist, 5.0);
  });
});
