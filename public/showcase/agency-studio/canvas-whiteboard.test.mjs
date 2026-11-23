import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AgencyStudioWhiteboardCanvas,
  AGENCY_PALETTE,
  SUPPORTED_TOOLS,
  TOOL_ALIASES,
} from './canvas-whiteboard.js';

describe('AgencyStudioWhiteboardCanvas', () => {
  test('1. Initialization defaults and palette constants', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
    assert.equal(wb.tool, 'pen');
    assert.equal(wb.color, AGENCY_PALETTE.neonCoral);
    assert.equal(wb.strokeWidth, 4);
    assert.equal(wb.opacity, 1.0);
    assert.equal(wb.maxHistory, 50);
    assert.ok(SUPPORTED_TOOLS.includes('pen'));
    assert.ok(SUPPORTED_TOOLS.includes('eraser'));
    assert.ok(SUPPORTED_TOOLS.includes('arrow'));
    assert.equal(AGENCY_PALETTE.studioDark, '#0e1117');
    assert.equal(AGENCY_PALETTE.neonCoral, '#ff4d6d');
  });

  test('2. Tool mutations, alias normalization, and error handling', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
    wb.setTool('arrow');
    assert.equal(wb.tool, 'arrow');

    wb.setTool('brush');
    assert.equal(wb.tool, 'pen');

    wb.setTool('storyboard');
    assert.equal(wb.tool, 'component');

    assert.throws(() => wb.setTool('laser'), /Unsupported tool/);
    assert.throws(() => wb.setTool(''), /Unsupported tool/);
  });

  test('3. Brush customization and numeric bounds clamping', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
    wb.setColor('#00f2fe');
    assert.equal(wb.color, '#00f2fe');

    assert.throws(() => wb.setColor(''), /Color must be a valid hex string/);

    wb.setStrokeWidth(100);
    assert.equal(wb.strokeWidth, 50);

    wb.setStrokeWidth(-5);
    assert.equal(wb.strokeWidth, 1);

    wb.setOpacity(2.5);
    assert.equal(wb.opacity, 1.0);

    wb.setOpacity(-0.5);
    assert.equal(wb.opacity, 0.0);
  });

  test('4. Point distance interpolation', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
    const pts = wb.interpolatePoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
    assert.ok(pts.length >= 10);
    assert.equal(pts[0].x, 0);
    assert.equal(pts[pts.length - 1].x, 100);

    const close = wb.interpolatePoints({ x: 0, y: 0 }, { x: 2, y: 0 }, 5);
    assert.equal(close.length, 2);
  });

  test('5. Catmull-Rom smoothing and path generation', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
    const segs = wb.catmullRomToBezier([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
      { x: 150, y: 50 },
    ]);
    assert.equal(segs.length, 3);
    assert.ok(segs[0].cp1x !== undefined);
  });

  test('6. Undo / Redo boundary limits and redo eviction', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
    wb.beginStroke(10, 10);
    wb.extendStroke(20, 20);
    wb.endStroke();

    assert.equal(wb.strokes.length, 1);
    assert.equal(wb.canUndo(), true);

    wb.undo();
    assert.equal(wb.strokes.length, 0);
    assert.equal(wb.canRedo(), true);

    wb.redo();
    assert.equal(wb.strokes.length, 1);

    wb.undo();
    wb.beginStroke(50, 50);
    wb.endStroke();
    assert.equal(wb.canRedo(), false); // evicted redo stack
  });

  test('7. Vector SVG export generation with valid XML elements', () => {
    const wb = new AgencyStudioWhiteboardCanvas({ width: 800, height: 600 });
    wb.setTool('rectangle');
    wb.beginStroke(50, 50);
    wb.extendStroke(200, 150);
    wb.endStroke();

    wb.setTool('circle');
    wb.beginStroke(300, 300);
    wb.extendStroke(400, 400);
    wb.endStroke();

    const svg = wb.exportSVG();
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.includes('<rect'));
    assert.ok(svg.includes('<circle'));
    assert.ok(svg.endsWith('</svg>'));
  });

  test('8. JSON export and import lifecycle', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
    wb.beginStroke(0, 0);
    wb.extendStroke(10, 10);
    wb.endStroke();

    const json = wb.exportJSON();
    const restored = new AgencyStudioWhiteboardCanvas();
    restored.loadJSON(json);

    assert.equal(restored.strokes.length, 1);
    assert.throws(() => restored.loadJSON('{"invalid": true}'), /strokes array expected/);
  });

  test('9. Event emitter pattern', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
    let fired = false;
    const unsub = wb.on('tool:change', (data) => {
      fired = true;
      assert.equal(data.tool, 'eraser');
    });

    wb.setTool('eraser');
    assert.equal(fired, true);

    fired = false;
    unsub();
    wb.setTool('pen');
    assert.equal(fired, false);
  });

  test('10. Mock 2D context rendering execution', () => {
    const wb = new AgencyStudioWhiteboardCanvas();
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
      arc: () => calls.push('arc'),
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
});
