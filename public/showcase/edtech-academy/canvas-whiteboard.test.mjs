import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import { EdtechAcademyWhiteboardCanvas, initWhiteboardApp } from './canvas-whiteboard.js';

describe('EdtechAcademyWhiteboardCanvas - Core Architecture', () => {
  it('initializes with default options and tools', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.equal(wb.activeTool, 'pen');
    assert.equal(wb.strokeColor, '#4f46e5');
    assert.equal(wb.strokeWidth, 4);
    assert.equal(wb.opacity, 1.0);
    assert.equal(wb.backgroundColor, '#0f172a');
    assert.equal(wb.maxHistory, 50);
    assert.equal(wb.strokes.length, 0);
    assert.equal(wb.currentStroke, null);
    assert.equal(wb.undoStack.length, 0);
    assert.equal(wb.redoStack.length, 0);
  });

  it('accepts custom configuration options during instantiation', () => {
    const wb = new EdtechAcademyWhiteboardCanvas({
      width: 1920,
      height: 1080,
      backgroundColor: '#000000',
      maxHistory: 20,
      tool: 'rectangle',
      color: '#10b981',
      strokeWidth: 12,
      opacity: 0.75,
      interpolationThreshold: 6
    });

    assert.equal(wb.width, 1920);
    assert.equal(wb.height, 1080);
    assert.equal(wb.backgroundColor, '#000000');
    assert.equal(wb.maxHistory, 20);
    assert.equal(wb.activeTool, 'rectangle');
    assert.equal(wb.strokeColor, '#10b981');
    assert.equal(wb.strokeWidth, 12);
    assert.equal(wb.opacity, 0.75);
    assert.equal(wb.interpolationThreshold, 6);
  });

  it('returns null when initWhiteboardApp is invoked in headless Node environment', () => {
    assert.equal(initWhiteboardApp(), null);
  });
});

describe('EdtechAcademyWhiteboardCanvas - Tool & Brush Mutations', () => {
  it('supports mutating between all available tools in the palette', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    const tools = ['pen', 'eraser', 'line', 'rectangle', 'circle', 'ellipse'];

    for (const tool of tools) {
      const result = wb.setTool(tool);
      assert.equal(result, tool);
      assert.equal(wb.activeTool, tool);
    }
  });

  it('rejects invalid tool names with informative error', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.throws(() => {
      wb.setTool('spraycan');
    }, /Invalid tool "spraycan"/);
  });

  it('mutates color, stroke width, and opacity with clamping', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();

    wb.setColor('#f43f5e');
    assert.equal(wb.strokeColor, '#f43f5e');

    // Clamps stroke width between 1 and 50
    wb.setStrokeWidth(100);
    assert.equal(wb.strokeWidth, 50);
    wb.setStrokeWidth(-10);
    assert.equal(wb.strokeWidth, 1);
    wb.setStrokeWidth(8);
    assert.equal(wb.strokeWidth, 8);

    // Clamps opacity between 0.0 and 1.0
    wb.setOpacity(2.5);
    assert.equal(wb.opacity, 1.0);
    wb.setOpacity(-0.5);
    assert.equal(wb.opacity, 0.0);
    wb.setOpacity(0.65);
    assert.equal(wb.opacity, 0.65);
  });

  it('throws on invalid color or non-numeric width/opacity', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.throws(() => wb.setColor(''), /Color must be a non-empty string/);
    assert.throws(() => wb.setStrokeWidth('not-a-number'), /Stroke width must be a valid number/);
    assert.throws(() => wb.setOpacity('invalid'), /Opacity must be a valid number/);
  });
});

describe('EdtechAcademyWhiteboardCanvas - Point Distance Interpolation & Stroke Smoothing', () => {
  it('interpolates intermediate points when distance exceeds interpolation threshold', () => {
    const wb = new EdtechAcademyWhiteboardCanvas({ interpolationThreshold: 5 });
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 20, y: 0 };

    const intermediate = wb.interpolatePoints(p1, p2, 5);
    // Distance = 20, threshold = 5, steps = 4 -> points at t = 5/20, 10/20, 15/20
    assert.equal(intermediate.length, 3);
    assert.deepEqual(intermediate[0], { x: 5, y: 0 });
    assert.deepEqual(intermediate[1], { x: 10, y: 0 });
    assert.deepEqual(intermediate[2], { x: 15, y: 0 });
  });

  it('does not interpolate points when distance is within threshold', () => {
    const wb = new EdtechAcademyWhiteboardCanvas({ interpolationThreshold: 10 });
    const p1 = { x: 10, y: 10 };
    const p2 = { x: 13, y: 14 }; // distance = 5

    const intermediate = wb.interpolatePoints(p1, p2, 10);
    assert.equal(intermediate.length, 0);
  });

  it('interpolates freehand pen strokes seamlessly during addPoint calls', () => {
    const wb = new EdtechAcademyWhiteboardCanvas({ interpolationThreshold: 10, minPointDistance: 1 });
    wb.startStroke(0, 0);
    // Jumps from (0,0) to (30,0) - should inject intermediate points at x=10 and x=20
    wb.addPoint(30, 0);
    const stroke = wb.endStroke();

    assert.equal(stroke.points.length, 4);
    assert.deepEqual(stroke.points[0], { x: 0, y: 0 });
    assert.deepEqual(stroke.points[1], { x: 10, y: 0 });
    assert.deepEqual(stroke.points[2], { x: 20, y: 0 });
    assert.deepEqual(stroke.points[3], { x: 30, y: 0 });
  });

  it('updates shape destination endpoint rather than interpolating along segment', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    wb.setTool('rectangle');
    wb.startStroke(10, 10);
    wb.addPoint(50, 50);
    wb.addPoint(80, 90);
    const stroke = wb.endStroke();

    assert.equal(stroke.tool, 'rectangle');
    assert.equal(stroke.points.length, 2);
    assert.deepEqual(stroke.points[0], { x: 10, y: 10 });
    assert.deepEqual(stroke.points[1], { x: 80, y: 90 });
  });

  it('applies Chaikin corner-cutting smoothing to point coordinates', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    const sharpTriangle = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 20, y: 0 }
    ];

    const smoothed = wb.smoothPoints(sharpTriangle, 1);
    // Starts at first point and ends at last point
    assert.deepEqual(smoothed[0], { x: 0, y: 0 });
    assert.deepEqual(smoothed[smoothed.length - 1], { x: 20, y: 0 });
    // Intermediate vertex (10, 20) is softened into two new vertices
    assert.equal(smoothed.length, 6);
    assert.deepEqual(smoothed[1], { x: 2.5, y: 5 });
    assert.deepEqual(smoothed[2], { x: 7.5, y: 15 });
    assert.deepEqual(smoothed[3], { x: 12.5, y: 15 });
    assert.deepEqual(smoothed[4], { x: 17.5, y: 5 });
  });

  it('handles multi-iteration Chaikin smoothing and small arrays gracefully', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.deepEqual(wb.smoothPoints(null), []);
    assert.deepEqual(wb.smoothPoints([]), []);
    assert.deepEqual(wb.smoothPoints([{ x: 1, y: 1 }]), [{ x: 1, y: 1 }]);

    const twoPoints = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    assert.deepEqual(wb.smoothPoints(twoPoints, 2), twoPoints);

    const triangle = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
    const smoothed2 = wb.smoothPoints(triangle, 2);
    assert.ok(smoothed2.length > 6);
  });

  it('generates quadratic bezier SVG path data with smooth midpoint curves', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    const points = [
      { x: 10, y: 10 },
      { x: 30, y: 50 },
      { x: 70, y: 20 },
      { x: 100, y: 60 }
    ];

    const pathData = wb.getSvgPathData(points);
    assert.match(pathData, /^M 10 10/);
    assert.match(pathData, /Q/);
    assert.match(pathData, /L 100 60$/);
  });

  it('handles single point and two points in SVG path generation', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.equal(wb.getSvgPathData([]), '');
    assert.match(wb.getSvgPathData([{ x: 5, y: 5 }]), /^M 5 5 L 5\.1 5\.1/);
    assert.equal(wb.getSvgPathData([{ x: 5, y: 5 }, { x: 15, y: 25 }]), 'M 5 5 L 15 25');
  });
});

describe('EdtechAcademyWhiteboardCanvas - Undo / Redo History & Boundary Limits', () => {
  it('manages undo and redo stacks through multiple drawing steps', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();

    wb.startStroke(10, 10);
    wb.addPoint(20, 20);
    wb.endStroke();

    wb.startStroke(30, 30);
    wb.addPoint(40, 40);
    wb.endStroke();

    assert.equal(wb.strokes.length, 2);
    assert.equal(wb.undoStack.length, 2);

    // Undo second stroke
    const undone1 = wb.undo();
    assert.equal(undone1, true);
    assert.equal(wb.strokes.length, 1);
    assert.equal(wb.redoStack.length, 1);

    // Undo first stroke
    const undone2 = wb.undo();
    assert.equal(undone2, true);
    assert.equal(wb.strokes.length, 0);
    assert.equal(wb.redoStack.length, 2);

    // Redo first stroke
    const redone1 = wb.redo();
    assert.equal(redone1, true);
    assert.equal(wb.strokes.length, 1);

    // Redo second stroke
    const redone2 = wb.redo();
    assert.equal(redone2, true);
    assert.equal(wb.strokes.length, 2);
  });

  it('respects undo boundary limit when history stack is empty', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.equal(wb.undo(), false);
    assert.equal(wb.strokes.length, 0);

    wb.startStroke(5, 5);
    wb.endStroke();
    assert.equal(wb.undo(), true);
    assert.equal(wb.undo(), false); // Boundary reached
  });

  it('respects redo boundary limit when redo stack is empty', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.equal(wb.redo(), false);

    wb.startStroke(10, 10);
    wb.endStroke();
    assert.equal(wb.redo(), false); // Nothing undone yet

    wb.undo();
    assert.equal(wb.redo(), true);
    assert.equal(wb.redo(), false); // Redo stack now empty
  });

  it('enforces maximum history limit capping undoStack size', () => {
    const maxHistory = 4;
    const wb = new EdtechAcademyWhiteboardCanvas({ maxHistory });

    for (let i = 0; i < 10; i++) {
      wb.startStroke(i * 10, i * 10);
      wb.endStroke();
    }

    assert.equal(wb.strokes.length, 10);
    assert.equal(wb.undoStack.length, maxHistory);

    // Can only undo up to maxHistory times
    for (let i = 0; i < maxHistory; i++) {
      assert.equal(wb.undo(), true);
    }
    assert.equal(wb.undo(), false);
  });

  it('clears canvas and enables restoring via undo', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    wb.startStroke(10, 10);
    wb.endStroke();
    assert.equal(wb.strokes.length, 1);

    wb.clear();
    assert.equal(wb.strokes.length, 0);

    // Undo should restore previous strokes
    wb.undo();
    assert.equal(wb.strokes.length, 1);
  });

  it('returns false when clear is called on an already empty canvas', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.equal(wb.clear(), false);
  });
});

describe('EdtechAcademyWhiteboardCanvas - Serialization (SVG & JSON)', () => {
  it('serializes all supported shapes into valid SVG markup string', () => {
    const wb = new EdtechAcademyWhiteboardCanvas({ width: 800, height: 600 });

    // Pen stroke
    wb.setTool('pen');
    wb.setColor('#6366f1');
    wb.setStrokeWidth(4);
    wb.startStroke(10, 10);
    wb.addPoint(50, 50);
    wb.addPoint(100, 30);
    wb.endStroke();

    // Eraser stroke
    wb.setTool('eraser');
    wb.startStroke(20, 20);
    wb.addPoint(60, 60);
    wb.endStroke();

    // Line shape
    wb.setTool('line');
    wb.setColor('#ec4899');
    wb.startStroke(0, 0);
    wb.addPoint(200, 150);
    wb.endStroke();

    // Rectangle shape
    wb.setTool('rectangle');
    wb.setColor('#10b981');
    wb.startStroke(100, 100);
    wb.addPoint(300, 250);
    wb.endStroke();

    // Ellipse shape
    wb.setTool('ellipse');
    wb.setColor('#f59e0b');
    wb.startStroke(400, 300);
    wb.addPoint(500, 400);
    wb.endStroke();

    const svg = wb.exportSVG();

    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /viewBox="0 0 800 600"/);
    assert.match(svg, /<rect width="100%" height="100%" fill="#0f172a"\/>/);
    assert.match(svg, /<path d="M 10 10[\s\S]*L 100 30" fill="none" stroke="#6366f1"/);
    assert.match(svg, /stroke="#0f172a"/); // Eraser rendered in bg color
    assert.match(svg, /<path d="M 0 0 L 200 150"/);
    assert.match(svg, /<rect x="100" y="100" width="200" height="150"/);
    assert.match(svg, /<ellipse cx="450" cy="350" rx="50" ry="50"/);
    assert.match(svg, /<\/svg>$/);
  });

  it('exports and restores complete canvas vector state via JSON', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    wb.startStroke(15, 25, { color: '#8b5cf6', strokeWidth: 6, tool: 'pen' });
    wb.addPoint(35, 45);
    wb.endStroke();

    const originalPointsCount = wb.strokes[0].points.length;
    const jsonString = wb.exportJSON({ pretty: true });
    assert.equal(typeof jsonString, 'string');
    assert.match(jsonString, /EdtechAcademyWhiteboardCanvas/);

    const wb2 = new EdtechAcademyWhiteboardCanvas();
    assert.equal(wb2.strokes.length, 0);

    wb2.loadJSON(jsonString);
    assert.equal(wb2.strokes.length, 1);
    assert.equal(wb2.strokes[0].color, '#8b5cf6');
    assert.equal(wb2.strokes[0].strokeWidth, 6);
    assert.equal(wb2.strokes[0].points.length, originalPointsCount);
  });

  it('supports loadJSON from a raw array of stroke objects', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    const rawStrokes = [
      {
        id: 'test_1',
        tool: 'line',
        color: '#ffffff',
        strokeWidth: 2,
        opacity: 1,
        points: [{ x: 0, y: 0 }, { x: 50, y: 50 }]
      }
    ];

    wb.loadJSON(rawStrokes);
    assert.equal(wb.strokes.length, 1);
    assert.equal(wb.strokes[0].id, 'test_1');
  });

  it('throws helpful errors when attempting to load invalid JSON data', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    assert.throws(() => wb.loadJSON(null), /must not be null/);
    assert.throws(() => wb.loadJSON('{ invalid json'), /Failed to parse whiteboard JSON/);
    assert.throws(() => wb.loadJSON({ invalidProp: 123 }), /Invalid JSON format/);
  });
});

describe('EdtechAcademyWhiteboardCanvas - Event Emitter Subscription & Notification', () => {
  it('dispatches stroke lifecycle and change events', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    const eventsTriggered = [];

    wb.on('stroke:start', ({ stroke }) => eventsTriggered.push(`start:${stroke.tool}`));
    wb.on('stroke:point', ({ point }) => eventsTriggered.push(`point:${point.x},${point.y}`));
    wb.on('stroke:end', (stroke) => eventsTriggered.push(`end:${stroke.tool}`));
    wb.on('change', (payload) => eventsTriggered.push(`change:${payload.type}`));

    wb.startStroke(5, 5);
    wb.addPoint(6, 6);
    wb.endStroke();

    assert.ok(eventsTriggered.includes('start:pen'));
    assert.ok(eventsTriggered.includes('point:6,6'));
    assert.ok(eventsTriggered.includes('end:pen'));
    assert.ok(eventsTriggered.includes('change:stroke'));
  });

  it('allows unsubscribing listener functions cleanly', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    let counter = 0;
    const unsub = wb.on('stroke:start', () => {
      counter++;
    });

    wb.startStroke(1, 1);
    assert.equal(counter, 1);

    unsub();
    wb.startStroke(2, 2);
    assert.equal(counter, 1); // Should not increment again
  });

  it('catches listener errors without halting remaining listeners', () => {
    const wb = new EdtechAcademyWhiteboardCanvas();
    let successCalled = false;

    wb.on('test-event', () => {
      throw new Error('Listener failed intentional error');
    });
    wb.on('test-event', () => {
      successCalled = true;
    });

    wb.emit('test-event');
    assert.equal(successCalled, true);
  });
});

describe('EdtechAcademyWhiteboardCanvas - Mock Canvas Rendering', () => {
  it('renders strokes without errors when simulated 2D context is supplied', () => {
    const calls = [];
    const mockCtx = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      beginPath: () => calls.push('beginPath'),
      moveTo: (x, y) => calls.push(`moveTo(${x},${y})`),
      lineTo: (x, y) => calls.push(`lineTo(${x},${y})`),
      quadraticCurveTo: () => calls.push('quadraticCurveTo'),
      stroke: () => calls.push('stroke'),
      strokeRect: () => calls.push('strokeRect'),
      fillRect: () => calls.push('fillRect'),
      arc: () => calls.push('arc'),
      ellipse: () => calls.push('ellipse'),
      fill: () => calls.push('fill')
    };

    const wb = new EdtechAcademyWhiteboardCanvas({ showGrid: true });
    wb.setTool('rectangle');
    wb.startStroke(10, 10);
    wb.addPoint(50, 50);
    const stroke = wb.endStroke();

    wb.renderStroke(stroke, mockCtx);
    assert.ok(calls.includes('save'));
    assert.ok(calls.includes('strokeRect'));
    assert.ok(calls.includes('restore'));

    wb.renderAll(mockCtx);
    assert.ok(calls.includes('fillRect'));
  });
});
