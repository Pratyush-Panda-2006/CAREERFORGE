import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsWhiteboardCanvas } from './canvas-whiteboard.js';

describe('LuxuryRealmsWhiteboardCanvas Unit Tests', () => {
  it('should initialize with default settings and empty stroke history', () => {
    const canvas = new LuxuryRealmsWhiteboardCanvas(null, { width: 1000, height: 700 });
    assert.equal(canvas.currentTool, 'pen');
    assert.equal(canvas.currentColor, '#D4AF37');
    assert.equal(canvas.brushWidth, 4);
    assert.equal(canvas.strokes.length, 0);
    assert.equal(canvas.redoStack.length, 0);
  });

  it('should interpolate points for smooth freehand strokes when distance > 3', () => {
    const canvas = new LuxuryRealmsWhiteboardCanvas(null);
    canvas.startStroke(0, 0);
    assert.equal(canvas.currentStroke.points.length, 1);

    // Distance = 10 (> 3)
    canvas.addPoint(10, 0);
    // Should have added midpoint (5, 0) and endpoint (10, 0) -> total 3 points
    assert.equal(canvas.currentStroke.points.length, 3);
    assert.deepEqual(canvas.currentStroke.points[1], { x: 5, y: 0 });
    assert.deepEqual(canvas.currentStroke.points[2], { x: 10, y: 0 });

    // Distance = 1 (<= 3), should not add points
    canvas.addPoint(10.5, 0);
    assert.equal(canvas.currentStroke.points.length, 3);

    canvas.endStroke();
    assert.equal(canvas.strokes.length, 1);
  });

  it('should respect stroke history boundary limits (maxHistory)', () => {
    const maxHistory = 3;
    const canvas = new LuxuryRealmsWhiteboardCanvas(null, { maxHistory });

    for (let i = 0; i < 5; i++) {
      canvas.startStroke(i * 10, i * 10);
      canvas.addPoint(i * 10 + 20, i * 10 + 20);
      canvas.endStroke();
    }

    assert.equal(canvas.strokes.length, maxHistory);
  });

  it('should handle undo and redo stacks correctly', () => {
    const canvas = new LuxuryRealmsWhiteboardCanvas(null);
    canvas.startStroke(10, 10);
    canvas.addPoint(50, 50);
    canvas.endStroke();

    assert.equal(canvas.strokes.length, 1);

    // Undo
    const undone = canvas.undo();
    assert.equal(undone, true);
    assert.equal(canvas.strokes.length, 0);
    assert.equal(canvas.redoStack.length, 1);

    // Redo
    const redone = canvas.redo();
    assert.equal(redone, true);
    assert.equal(canvas.strokes.length, 1);
    assert.equal(canvas.redoStack.length, 0);

    // Clear
    canvas.clear();
    assert.equal(canvas.strokes.length, 0);
    assert.equal(canvas.redoStack.length, 0);
  });

  it('should serialize freehand, line, and rectangle strokes to valid SVG', () => {
    const canvas = new LuxuryRealmsWhiteboardCanvas(null, { width: 500, height: 400 });

    // Pen stroke
    canvas.setTool('pen');
    canvas.setColor('#D4AF37');
    canvas.setBrushWidth(3);
    canvas.startStroke(10, 20);
    canvas.addPoint(30, 40);
    canvas.endStroke();

    // Line stroke
    canvas.setTool('line');
    canvas.setColor('#FFFFFF');
    canvas.startStroke(0, 0);
    canvas.addPoint(100, 100);
    canvas.endStroke();

    // Rectangle stroke
    canvas.setTool('rectangle');
    canvas.setColor('#F43F5E');
    canvas.startStroke(50, 50);
    canvas.addPoint(150, 120);
    canvas.endStroke();

    const svg = canvas.exportSVG();

    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes('viewBox="0 0 500 400"'));
    assert.ok(svg.includes('<path d="M 10.0 20.0'));
    assert.ok(svg.includes('<line x1="0.0" y1="0.0" x2="100.0" y2="100.0"'));
    assert.ok(svg.includes('<rect x="50.0" y="50.0" width="100.0" height="70.0"'));
    assert.ok(svg.endsWith('</svg>'));
  });
});
