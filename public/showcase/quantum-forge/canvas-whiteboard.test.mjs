import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeWhiteboardCanvas, QF_PALETTE, QF_SUPPORTED_TOOLS } from './canvas-whiteboard.js';

describe('QuantumForgeWhiteboardCanvas', () => {
  test('1. Initialization defaults and palette constants', () => {
    const wb = new QuantumForgeWhiteboardCanvas();
    assert.equal(wb.tool, 'pen');
    assert.equal(wb.color, QF_PALETTE.cyan);
    assert.equal(wb.strokeWidth, 4);
    assert.equal(wb.opacity, 1.0);
    assert.equal(wb.maxHistory, 50);
    assert.ok(QF_SUPPORTED_TOOLS.includes('pen'));
    assert.ok(QF_SUPPORTED_TOOLS.includes('eraser'));
    assert.ok(QF_SUPPORTED_TOOLS.includes('line'));
    assert.ok(QF_SUPPORTED_TOOLS.includes('rectangle'));
    assert.equal(QF_PALETTE.quantumDark, '#05070a');
    assert.equal(QF_PALETTE.cyan, '#00f2fe');
  });

  test('2. Tool mutations, alias normalization, and error handling', () => {
    const wb = new QuantumForgeWhiteboardCanvas();
    wb.setTool('rectangle');
    assert.equal(wb.tool, 'rectangle');
    wb.setTool('brush');
    assert.equal(wb.tool, 'pen');
    wb.setTool('freehand');
    assert.equal(wb.tool, 'pen');
    wb.setTool('box');
    assert.equal(wb.tool, 'rectangle');
    assert.throws(() => wb.setTool('laser'), /Unsupported tool/);
    assert.throws(() => wb.setTool(''), /Unsupported tool/);
  });

  test('3. Point distance interpolation', () => {
    const wb = new QuantumForgeWhiteboardCanvas();
    const pts = wb.interpolatePoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
    assert.ok(pts.length >= 10);
    assert.equal(pts[0].x, 0);
    assert.equal(pts[pts.length - 1].x, 100);

    const close = wb.interpolatePoints({ x: 0, y: 0 }, { x: 2, y: 0 }, 5);
    assert.equal(close.length, 2);

    const diagonal = wb.interpolatePoints({ x: 0, y: 0 }, { x: 30, y: 40 }, 10);
    assert.ok(diagonal.length >= 5);
    assert.equal(diagonal[0].x, 0);
    assert.equal(diagonal[0].y, 0);
    assert.equal(diagonal[diagonal.length - 1].x, 30);
    assert.equal(diagonal[diagonal.length - 1].y, 40);
  });

  test('4. Stroke history boundary limits and redo eviction', () => {
    const wb = new QuantumForgeWhiteboardCanvas({ maxHistory: 3 });
    wb.beginStroke(10, 10); wb.endStroke();
    wb.beginStroke(20, 20); wb.endStroke();
    wb.beginStroke(30, 30); wb.endStroke();
    assert.equal(wb.strokes.length, 3);

    wb.beginStroke(40, 40); wb.endStroke();
    assert.equal(wb.strokes.length, 3);
    assert.equal(wb.canUndo(), true);

    wb.undo();
    assert.equal(wb.strokes.length, 2);
    assert.equal(wb.canRedo(), true);

    wb.redo();
    assert.equal(wb.strokes.length, 3);

    wb.undo();
    wb.beginStroke(50, 50); wb.endStroke();
    assert.equal(wb.canRedo(), false);
  });

  test('5. Clear resets strokes and redo stack', () => {
    const wb = new QuantumForgeWhiteboardCanvas();
    wb.beginStroke(0, 0); wb.extendStroke(10, 10); wb.endStroke();
    wb.undo();
    assert.equal(wb.canRedo(), true);
    wb.clear();
    assert.equal(wb.strokes.length, 0);
    assert.equal(wb.redoStack.length, 0);
    assert.equal(wb.canUndo(), false);
    assert.equal(wb.canRedo(), false);
  });

  test('6. Vector SVG export generation with valid XML elements', () => {
    const wb = new QuantumForgeWhiteboardCanvas({ width: 800, height: 600 });
    wb.setTool('rectangle');
    wb.beginStroke(50, 50);
    wb.extendStroke(200, 150);
    wb.endStroke();

    wb.setTool('line');
    wb.beginStroke(300, 300);
    wb.extendStroke(400, 400);
    wb.endStroke();

    const svg = wb.exportSVG();
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.includes('<rect'));
    assert.ok(svg.includes('<line'));
    assert.ok(svg.includes('stroke="#00f2fe"') || svg.includes("stroke='#00f2fe'"));
    assert.ok(svg.endsWith('</svg>'));
  });

  test('7. Mock 2D context rendering execution', () => {
    const wb = new QuantumForgeWhiteboardCanvas();
    const calls = [];
    const mockCtx = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      beginPath: () => calls.push('beginPath'),
      moveTo: () => calls.push('moveTo'),
      lineTo: () => calls.push('lineTo'),
      stroke: () => calls.push('stroke'),
      strokeRect: () => calls.push('strokeRect'),
      fillRect: () => calls.push('fillRect'),
      bezierCurveTo: () => calls.push('bezierCurveTo'),
    };

    wb.beginStroke(10, 10);
    wb.extendStroke(20, 20);
    wb.endStroke();
    wb.render(mockCtx);

    assert.ok(calls.includes('save'));
    assert.ok(calls.includes('restore'));
    assert.ok(calls.includes('stroke'));
  });

  test('8. addPoint starts and extends strokes', () => {
    const wb = new QuantumForgeWhiteboardCanvas();
    wb.addPoint(5, 5);
    assert.ok(wb.currentStroke);
    assert.equal(wb.currentStroke.points.length, 1);

    wb.addPoint(15, 15);
    assert.ok(wb.currentStroke.points.length > 1);

    wb.endStroke();
    assert.equal(wb.strokes.length, 1);
    assert.equal(wb.canUndo(), true);
  });
});
