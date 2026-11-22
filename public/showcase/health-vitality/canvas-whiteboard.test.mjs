import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HealthVitalityWhiteboardCanvas,
  PALETTE,
  TOOLS
} from './canvas-whiteboard.js';

test('initializes with clinical health & vitality defaults and respects configuration overrides', () => {
  const canvas = new HealthVitalityWhiteboardCanvas();
  assert.equal(canvas.tool, TOOLS.PEN);
  assert.equal(canvas.color, PALETTE.VIBRANT_TEAL);
  assert.equal(canvas.strokeWidth, 4);
  assert.equal(canvas.opacity, 1.0);
  assert.equal(canvas.maxHistory, 50);
  assert.equal(canvas.interpolateDistance, 8);
  assert.equal(canvas.smoothing, true);
  assert.equal(canvas.strokes.length, 0);
  assert.equal(canvas.canUndo, false);
  assert.equal(canvas.canRedo, false);

  const custom = new HealthVitalityWhiteboardCanvas({
    width: 1920,
    height: 1080,
    tool: TOOLS.HIGHLIGHTER,
    color: PALETTE.CLINICAL_EMERALD,
    strokeWidth: 12,
    opacity: 0.8,
    maxHistory: 20,
    interpolateDistance: 10,
    smoothing: false,
    background: '#0f172a'
  });
  assert.equal(custom.width, 1920);
  assert.equal(custom.height, 1080);
  assert.equal(custom.tool, TOOLS.HIGHLIGHTER);
  assert.equal(custom.color, PALETTE.CLINICAL_EMERALD);
  assert.equal(custom.strokeWidth, 12);
  assert.equal(custom.opacity, 0.8);
  assert.equal(custom.maxHistory, 20);
  assert.equal(custom.interpolateDistance, 10);
  assert.equal(custom.smoothing, false);
  assert.equal(custom.background, '#0f172a');
});

test('tool selection mutations update active tool and reject invalid tool names', () => {
  const canvas = new HealthVitalityWhiteboardCanvas();
  const validTools = ['pen', 'highlighter', 'eraser', 'line', 'rectangle', 'ellipse'];

  for (const tool of validTools) {
    assert.equal(canvas.setTool(tool), tool);
    assert.equal(canvas.tool, tool);
  }

  // Alias test: circle normalizes to ellipse
  assert.equal(canvas.setTool('circle'), TOOLS.ELLIPSE);
  assert.equal(canvas.tool, TOOLS.ELLIPSE);

  // Invalid tools fail with Error / TypeError
  for (const invalid of ['', 'spray', 'bucket', 'polygon', null, undefined, 123]) {
    assert.throws(() => canvas.setTool(invalid));
  }
});

test('brush properties (color, strokeWidth, opacity) validate and clamp properly', () => {
  const canvas = new HealthVitalityWhiteboardCanvas();

  // Color updates
  assert.equal(canvas.setColor('#10b981'), '#10b981');
  assert.equal(canvas.setColor('rgba(13, 148, 136, 0.5)'), 'rgba(13, 148, 136, 0.5)');
  assert.throws(() => canvas.setColor(''));
  assert.throws(() => canvas.setColor(null));
  assert.throws(() => canvas.setColor('invalid; injection'));

  // Stroke width bounds [1, 50]
  assert.equal(canvas.setStrokeWidth(25), 25);
  assert.equal(canvas.setStrokeWidth(0), 1);
  assert.equal(canvas.setStrokeWidth(-10), 1);
  assert.equal(canvas.setStrokeWidth(100), 50);
  assert.throws(() => canvas.setStrokeWidth('not-a-number'), /valid number/);

  // Opacity bounds [0.01, 1.0]
  assert.equal(canvas.setOpacity(0.5), 0.5);
  assert.equal(canvas.setOpacity(0), 0.01);
  assert.equal(canvas.setOpacity(-0.2), 0.01);
  assert.equal(canvas.setOpacity(1.5), 1.0);
  assert.throws(() => canvas.setOpacity('invalid'), /valid number/);
});

test('point distance interpolation inserts intermediate points across rapid mouse movements', () => {
  // Test static interpolation method
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 40, y: 0 };
  const maxDistance = 10;
  const interpolated = HealthVitalityWhiteboardCanvas.interpolatePoints(p1, p2, maxDistance);

  // Distance is 40, maxDistance is 10 -> 4 steps -> 3 intermediate + 1 end point = 4 points
  assert.equal(interpolated.length, 4);
  assert.deepEqual(interpolated[0], { x: 10, y: 0 });
  assert.deepEqual(interpolated[1], { x: 20, y: 0 });
  assert.deepEqual(interpolated[2], { x: 30, y: 0 });
  assert.deepEqual(interpolated[3], { x: 40, y: 0 });

  // When distance is below threshold, returns just p2
  const close = HealthVitalityWhiteboardCanvas.interpolatePoints({ x: 0, y: 0 }, { x: 3, y: 4 }, 10);
  assert.equal(close.length, 1);
  assert.deepEqual(close[0], { x: 3, y: 4 });

  // Test during live stroke drawing
  const canvas = new HealthVitalityWhiteboardCanvas({ interpolateDistance: 10 });
  canvas.startStroke(0, 0);
  const added = canvas.addPoint(50, 0);
  assert.ok(added.length > 1, 'Rapid stroke movement should interpolate multiple intermediate points');
  assert.equal(canvas.currentStroke.points.length, 1 + added.length);
  const stroke = canvas.endStroke();
  assert.equal(stroke.points[stroke.points.length - 1].x, 50);
});

test('stroke smoothing evaluates Catmull-Rom curves and formats smooth Bezier SVG paths', () => {
  const points = [
    { x: 10, y: 10 },
    { x: 50, y: 80 },
    { x: 100, y: 20 },
    { x: 150, y: 90 },
    { x: 200, y: 10 }
  ];

  // Catmull-Rom point computation
  const pt = HealthVitalityWhiteboardCanvas.catmullRomPoint(points[0], points[1], points[2], points[3], 0.5);
  assert.equal(typeof pt.x, 'number');
  assert.equal(typeof pt.y, 'number');
  assert.ok(!Number.isNaN(pt.x) && !Number.isNaN(pt.y));

  // Dense Catmull-Rom smoothing
  const smoothed = HealthVitalityWhiteboardCanvas.smoothPointsCatmullRom(points, 4);
  assert.ok(smoothed.length > points.length);
  assert.equal(smoothed[0].x, points[0].x);
  assert.equal(smoothed[smoothed.length - 1].x, points[points.length - 1].x);

  // SVG Bezier path serialization
  const svgPath = HealthVitalityWhiteboardCanvas.pointsToSvgPath(points, true);
  assert.ok(svgPath.startsWith('M 10 10'));
  assert.ok(svgPath.includes('Q '));
  assert.ok(svgPath.endsWith('L 200 10'));

  // Without smoothing
  const linearPath = HealthVitalityWhiteboardCanvas.pointsToSvgPath(points, false);
  assert.ok(linearPath.startsWith('M 10 10'));
  assert.ok(!linearPath.includes('Q '));
  assert.ok(linearPath.includes('L 50 80'));
});

test('undo and redo boundary limits behave predictably and strictly limit memory', () => {
  const maxHistory = 4;
  const canvas = new HealthVitalityWhiteboardCanvas({ maxHistory });

  // At initial empty state, undo/redo must fail gracefully
  assert.equal(canvas.undo(), false);
  assert.equal(canvas.redo(), false);
  assert.equal(canvas.strokes.length, 0);

  // Add 3 distinct strokes
  for (let i = 1; i <= 3; i++) {
    canvas.startStroke(i * 10, i * 10);
    canvas.addPoint(i * 10 + 5, i * 10 + 5);
    canvas.endStroke();
  }
  assert.equal(canvas.strokes.length, 3);
  assert.equal(canvas.canUndo, true);
  assert.equal(canvas.canRedo, false);

  // Undo once
  assert.equal(canvas.undo(), true);
  assert.equal(canvas.strokes.length, 2);
  assert.equal(canvas.canRedo, true);

  // Redo once
  assert.equal(canvas.redo(), true);
  assert.equal(canvas.strokes.length, 3);
  assert.equal(canvas.canRedo, false);

  // Undo all the way to empty
  assert.equal(canvas.undo(), true);
  assert.equal(canvas.undo(), true);
  assert.equal(canvas.undo(), true);
  assert.equal(canvas.strokes.length, 0);
  assert.equal(canvas.undo(), false, 'Undo at empty boundary should return false');

  // Redo all the way back
  assert.equal(canvas.redo(), true);
  assert.equal(canvas.redo(), true);
  assert.equal(canvas.redo(), true);
  assert.equal(canvas.strokes.length, 3);
  assert.equal(canvas.redo(), false, 'Redo at top boundary should return false');

  // Test history boundary limit: add 6 strokes when maxHistory is 4
  canvas.clear();
  for (let i = 0; i < 6; i++) {
    canvas.startStroke(i, i);
    canvas.addPoint(i + 1, i + 1);
    canvas.endStroke();
  }
  assert.equal(canvas.strokes.length, 6);
  assert.ok(canvas.historyCount <= maxHistory, `Undo stack must not exceed maxHistory (${maxHistory})`);

  // Testing clear() undo recovery
  canvas.clear();
  assert.equal(canvas.strokes.length, 0);
  assert.equal(canvas.undo(), true);
  assert.equal(canvas.strokes.length, 6, 'Clearing canvas should be undoable');
});

test('draws geometric shapes (lines, rectangles, ellipses) accurately', () => {
  const canvas = new HealthVitalityWhiteboardCanvas();

  // Line tool
  canvas.setTool(TOOLS.LINE);
  canvas.startStroke(10, 20);
  canvas.addPoint(100, 200);
  const lineStroke = canvas.endStroke();
  assert.equal(lineStroke.tool, TOOLS.LINE);
  assert.equal(lineStroke.points.length, 2);
  assert.deepEqual(lineStroke.points[0], { x: 10, y: 20 });
  assert.deepEqual(lineStroke.points[1], { x: 100, y: 200 });

  // Rectangle tool
  canvas.setTool(TOOLS.RECTANGLE);
  canvas.startStroke(30, 40);
  canvas.addPoint(150, 120);
  const rectStroke = canvas.endStroke();
  assert.equal(rectStroke.tool, TOOLS.RECTANGLE);
  assert.equal(rectStroke.points.length, 2);

  // Ellipse tool
  canvas.setTool(TOOLS.ELLIPSE);
  canvas.startStroke(50, 50);
  canvas.addPoint(150, 100);
  const ellipseStroke = canvas.endStroke();
  assert.equal(ellipseStroke.tool, TOOLS.ELLIPSE);
  assert.equal(ellipseStroke.points.length, 2);
});

test('exportSVG generates valid SVG markup with accurate element tags and styles', () => {
  const canvas = new HealthVitalityWhiteboardCanvas({ width: 800, height: 600, background: '#061412' });

  // 1. Pen stroke
  canvas.setTool(TOOLS.PEN);
  canvas.setColor('#0d9488');
  canvas.setStrokeWidth(6);
  canvas.startStroke(10, 10);
  canvas.addPoint(20, 20);
  canvas.addPoint(30, 15);
  canvas.endStroke();

  // 2. Highlighter stroke
  canvas.setTool(TOOLS.HIGHLIGHTER);
  canvas.setColor('#10b981');
  canvas.startStroke(40, 40);
  canvas.addPoint(80, 40);
  canvas.endStroke();

  // 3. Line
  canvas.setTool(TOOLS.LINE);
  canvas.setColor('#ef4444');
  canvas.startStroke(100, 100);
  canvas.addPoint(200, 200);
  canvas.endStroke();

  // 4. Rectangle
  canvas.setTool(TOOLS.RECTANGLE);
  canvas.setColor('#f59e0b');
  canvas.startStroke(150, 150);
  canvas.addPoint(250, 250);
  canvas.endStroke();

  // 5. Ellipse
  canvas.setTool(TOOLS.ELLIPSE);
  canvas.setColor('#0d9488');
  canvas.startStroke(300, 300);
  canvas.addPoint(400, 360);
  canvas.endStroke();

  const svg = canvas.exportSVG();
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('viewBox="0 0 800 600"'));
  assert.ok(svg.includes('width="800"'));
  assert.ok(svg.includes('height="600"'));
  assert.ok(svg.includes('<rect width="100%" height="100%" fill="#061412"'));
  assert.ok(svg.includes('<path d="M 10 10'));
  assert.ok(svg.includes('stroke="#0d9488"'));
  assert.ok(svg.includes('<line x1="100" y1="100" x2="200" y2="200"'));
  assert.ok(svg.includes('<rect x="150" y="150" width="100" height="100"'));
  assert.ok(svg.includes('<ellipse cx="350" cy="330" rx="50" ry="30"'));
  assert.ok(svg.endsWith('</svg>'));

  // Eraser stroke in SVG
  canvas.setTool(TOOLS.ERASER);
  canvas.startStroke(50, 50);
  canvas.addPoint(90, 90);
  canvas.endStroke();
  const eraserSvg = canvas.exportSVG();
  assert.ok(eraserSvg.includes('stroke="#061412"'));

  // SVG export with transparent background
  const transparentSvg = canvas.exportSVG({ background: 'none' });
  assert.ok(!transparentSvg.includes('<rect width="100%" height="100%" fill='));
});

test('handles invalid drawing invocations and prevents XML attribute injections', () => {
  const canvas = new HealthVitalityWhiteboardCanvas();

  // addPoint without active stroke
  assert.throws(() => canvas.addPoint(10, 20), /No active stroke/);

  // Invalid non-numeric coordinates
  assert.throws(() => canvas.startStroke('abc', 10), /Stroke coordinates must be numeric/);
  assert.throws(() => canvas.startStroke(10, null), /Stroke coordinates must be numeric/);

  canvas.startStroke(10, 20);
  assert.throws(() => canvas.addPoint('invalid', 30), /Point coordinates must be numeric/);
  canvas.endStroke();

  // XML injection in colors or background
  canvas.setBackground('"><script>alert(1)</script>');
  const svg = canvas.exportSVG();
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
});

test('exportJSON and loadJSON perform seamless roundtrip vector serialization', () => {
  const canvas = new HealthVitalityWhiteboardCanvas({ width: 1000, height: 700 });

  canvas.setTool(TOOLS.PEN);
  canvas.setColor(PALETTE.VIBRANT_TEAL);
  canvas.startStroke(25, 30);
  canvas.addPoint(50, 60);
  canvas.endStroke();

  canvas.setTool(TOOLS.RECTANGLE);
  canvas.setColor(PALETTE.HEART_RED);
  canvas.startStroke(100, 120);
  canvas.addPoint(220, 180);
  canvas.endStroke();

  const jsonStr = canvas.exportJSON({ indent: true });
  assert.equal(typeof jsonStr, 'string');
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.schema, 'health-vitality-whiteboard');
  assert.equal(parsed.strokes.length, 2);
  assert.equal(parsed.strokes[0].tool, TOOLS.PEN);
  assert.equal(parsed.strokes[1].tool, TOOLS.RECTANGLE);

  // Restore into a fresh canvas
  const canvas2 = new HealthVitalityWhiteboardCanvas();
  assert.equal(canvas2.strokes.length, 0);
  const success = canvas2.loadJSON(jsonStr);
  assert.equal(success, true);
  assert.equal(canvas2.strokes.length, 2);
  assert.equal(canvas2.strokes[0].tool, TOOLS.PEN);
  assert.equal(canvas2.strokes[0].color, PALETTE.VIBRANT_TEAL);
  assert.equal(canvas2.strokes[1].tool, TOOLS.RECTANGLE);
  assert.equal(canvas2.strokes[1].color, PALETTE.HEART_RED);

  // Supports loading raw array of strokes directly
  const canvas3 = new HealthVitalityWhiteboardCanvas();
  canvas3.loadJSON(parsed.strokes);
  assert.equal(canvas3.strokes.length, 2);

  // Error handling for corrupt input
  assert.throws(() => canvas3.loadJSON('{ invalid json ... }'), /Failed to parse JSON/);
  assert.throws(() => canvas3.loadJSON({ wrong: 'schema' }), /Invalid whiteboard data format/);
});

test('event emitter dispatches and unbinds events accurately', () => {
  const canvas = new HealthVitalityWhiteboardCanvas();
  const events = [];

  const unsubTool = canvas.on('tool:change', (t) => events.push(`tool:${t}`));
  const unsubColor = canvas.on('color:change', (c) => events.push(`color:${c}`));
  canvas.on('stroke:start', () => events.push('stroke:start'));
  canvas.on('stroke:end', () => events.push('stroke:end'));
  canvas.on('change', (e) => events.push(`change:${e.action}`));

  canvas.setTool(TOOLS.LINE);
  canvas.setColor(PALETTE.VITALITY_AMBER);
  canvas.startStroke(10, 10);
  canvas.addPoint(20, 20);
  canvas.endStroke();

  assert.ok(events.includes('tool:line'));
  assert.ok(events.includes(`color:${PALETTE.VITALITY_AMBER}`));
  assert.ok(events.includes('stroke:start'));
  assert.ok(events.includes('stroke:end'));
  assert.ok(events.includes('change:stroke:end'));

  // Test unsubscribe
  unsubTool();
  canvas.setTool(TOOLS.PEN);
  assert.ok(!events.includes('tool:pen'));
});
