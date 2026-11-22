import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CulinaryBistroWhiteboardCanvas,
  CULINARY_PALETTE,
  VALID_TOOLS,
  TOOL_ALIASES,
  interpolatePoints,
  catmullRomToBezier,
  parseCoord
} from './canvas-whiteboard.js';

test('1. Initialization defaults and palette constants', () => {
  // Verify warm gourmet bistro palette constants
  assert.equal(CULINARY_PALETTE.truffleDark, '#120c0a');
  assert.equal(CULINARY_PALETTE.saffronGold, '#eab308');
  assert.equal(CULINARY_PALETTE.paprikaRed, '#dc2626');
  assert.equal(CULINARY_PALETTE.sageGreen, '#84cc16');
  assert.equal(CULINARY_PALETTE.cremeWhite, '#fefce8');
  assert.equal(CULINARY_PALETTE.copperBronze, '#b45309');
  assert.equal(CULINARY_PALETTE.charcoalPlatter, '#1c1917');

  // Verify default class properties
  const board = new CulinaryBistroWhiteboardCanvas();
  assert.equal(board.tool, 'pen');
  assert.equal(board.color, '#eab308');
  assert.equal(board.strokeWidth, 4);
  assert.equal(board.opacity, 1.0);
  assert.equal(board.maxHistory, 50);
  assert.equal(board.template, 'plating');
  assert.equal(board.strokes.length, 0);
  assert.equal(board.redoStack.length, 0);
  assert.equal(board.canUndo, false);
  assert.equal(board.canRedo, false);

  // Verify constructor options override
  const custom = new CulinaryBistroWhiteboardCanvas(null, {
    tool: 'drizzle',
    color: '#dc2626',
    strokeWidth: 8,
    opacity: 0.8,
    maxHistory: 25,
    template: 'brigade'
  });
  assert.equal(custom.tool, 'drizzle');
  assert.equal(custom.color, '#dc2626');
  assert.equal(custom.strokeWidth, 8);
  assert.equal(custom.opacity, 0.8);
  assert.equal(custom.maxHistory, 25);
  assert.equal(custom.template, 'brigade');
});

test('2. Tool mutations, alias normalization, and error handling for invalid tools', () => {
  const board = new CulinaryBistroWhiteboardCanvas();

  // Test all valid primary tools
  for (const tool of VALID_TOOLS) {
    assert.equal(board.setTool(tool), tool);
    assert.equal(board.tool, tool);
    assert.equal(board.activeTool, tool);
    assert.equal(board.currentTool, tool);
  }

  // Test alias normalization
  assert.equal(board.setTool('brush'), 'pen');
  assert.equal(board.setTool('draw'), 'pen');
  assert.equal(board.setTool('sauce'), 'drizzle');
  assert.equal(board.setTool('piping'), 'drizzle');
  assert.equal(board.setTool('coulis'), 'drizzle');
  assert.equal(board.setTool('herb'), 'garnish');
  assert.equal(board.setTool('sprig'), 'garnish');
  assert.equal(board.setTool('rect'), 'rectangle');
  assert.equal(board.setTool('box'), 'rectangle');
  assert.equal(board.setTool('cloche'), 'circle');
  assert.equal(board.setTool('plate'), 'circle');
  assert.equal(board.setTool('erase'), 'eraser');
  assert.equal(board.setTool('rubber'), 'eraser');

  // Test case-insensitivity
  assert.equal(board.setTool('PEN'), 'pen');
  assert.equal(board.setTool('  Drizzle  '), 'drizzle');
  assert.equal(board.setTool('GARNISH'), 'garnish');

  // Test error handling for invalid tools
  assert.throws(() => board.setTool('laser'), /Invalid tool/);
  assert.throws(() => board.setTool('knife'), /Invalid tool/);
  assert.throws(() => board.setTool(''), /Invalid tool/);
  assert.throws(() => board.setTool(null), /TypeError/);
  assert.throws(() => board.setTool(123), /TypeError/);
});

test('3. Brush customization (color, strokeWidth, opacity) and numeric bounds clamping', () => {
  const board = new CulinaryBistroWhiteboardCanvas();

  // Color customization
  assert.equal(board.setColor('#dc2626'), '#dc2626');
  assert.equal(board.setColor('#FFF'), '#fff');
  assert.equal(board.setColor('paprikaRed'), '#dc2626');
  assert.equal(board.setColor('saffronGold'), '#eab308');
  assert.equal(board.setColor('rgba(234, 179, 8, 0.5)'), 'rgba(234, 179, 8, 0.5)');

  // Color error handling & safety
  assert.throws(() => board.setColor('invalid_color_code'), /Invalid color/);
  assert.throws(() => board.setColor('<script>alert(1)</script>'), /Malicious/);
  assert.throws(() => board.setColor(''), /empty/);
  assert.throws(() => board.setColor(null), /TypeError/);

  // Stroke width numeric bounds clamping [1, 64]
  assert.equal(board.setStrokeWidth(12), 12);
  assert.equal(board.setStrokeWidth(100), 64);
  assert.equal(board.setStrokeWidth(0.2), 1);
  assert.equal(board.setWidth(20), 20); // Alias check
  assert.throws(() => board.setStrokeWidth(-5), /RangeError/);
  assert.throws(() => board.setStrokeWidth(0), /RangeError/);
  assert.throws(() => board.setStrokeWidth(NaN), /RangeError/);
  assert.throws(() => board.setStrokeWidth(Infinity), /RangeError/);

  // Opacity bounds clamping [0.05, 1.0]
  assert.equal(board.setOpacity(0.65), 0.65);
  assert.equal(board.setOpacity(1.5), 1.0);
  assert.equal(board.setOpacity(-0.5), 0.05);
  assert.throws(() => board.setOpacity(NaN), /RangeError/);
  assert.throws(() => board.setOpacity(Infinity), /RangeError/);
});

test('4. Point distance interpolation generating intermediate points without gaps', () => {
  // Test interpolation between points with Euclidean distance 30 and step 5
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 30, y: 0 };
  const points = interpolatePoints(p1, p2, 5);

  assert.equal(points.length, 6);
  assert.deepEqual(points[points.length - 1], { x: 30, y: 0 });

  // Verify that the distance between consecutive points does not exceed dist
  let previous = p1;
  for (const pt of points) {
    const d = Math.hypot(pt.x - previous.x, pt.y - previous.y);
    assert.ok(d <= 5.001, `Distance ${d} exceeds step 5`);
    previous = pt;
  }

  // Diagonal interpolation
  const diag = interpolatePoints({ x: 10, y: 10 }, { x: 50, y: 40 }, 8);
  assert.equal(diag.length, Math.ceil(50 / 8));
  assert.equal(diag.at(-1).x, 50);
  assert.equal(diag.at(-1).y, 40);

  // Array coord format support [x, y]
  const arrPoints = interpolatePoints([0, 0], [10, 0], 5);
  assert.equal(arrPoints.length, 2);

  // Zero-distance returns empty array
  assert.deepEqual(interpolatePoints({ x: 5, y: 5 }, { x: 5, y: 5 }, 5), []);

  // Validation
  assert.throws(() => interpolatePoints({ x: 0, y: 0 }, { x: 10, y: 10 }, 0), /RangeError/);
  assert.throws(() => interpolatePoints({ x: 0, y: 0 }, { x: 10, y: 10 }, -2), /RangeError/);
  assert.throws(() => interpolatePoints([NaN, 0], [10, 10]), /TypeError/);
});

test('5. Catmull-Rom smoothing and path generation', () => {
  const points = [
    { x: 10, y: 10 },
    { x: 40, y: 30 },
    { x: 80, y: 20 },
    { x: 120, y: 60 }
  ];

  const segments = catmullRomToBezier(points, 0.5);
  assert.equal(segments.length, 3);

  for (const seg of segments) {
    assert.ok(Number.isFinite(seg.start.x) && Number.isFinite(seg.start.y));
    assert.ok(Number.isFinite(seg.cp1.x) && Number.isFinite(seg.cp1.y));
    assert.ok(Number.isFinite(seg.cp2.x) && Number.isFinite(seg.cp2.y));
    assert.ok(Number.isFinite(seg.end.x) && Number.isFinite(seg.end.y));
  }

  // First segment starts at points[0] and ends at points[1]
  assert.deepEqual(segments[0].start, { x: 10, y: 10 });
  assert.deepEqual(segments[0].end, { x: 40, y: 30 });

  // Degenerate inputs
  assert.deepEqual(catmullRomToBezier([]), []);
  assert.deepEqual(catmullRomToBezier([{ x: 10, y: 10 }]), []);
});

test('6. Undo / Redo boundary limits and redo eviction on new stroke', () => {
  const board = new CulinaryBistroWhiteboardCanvas(null, { maxHistory: 3 });

  // Draw stroke 1
  board.beginStroke(10, 10);
  board.addPoint(20, 20);
  board.endStroke();
  assert.equal(board.strokes.length, 1);
  assert.equal(board.canUndo, true);
  assert.equal(board.canRedo, false);

  // Draw stroke 2
  board.beginStroke(30, 30);
  board.addPoint(40, 40);
  board.endStroke();
  assert.equal(board.strokes.length, 2);

  // Undo stroke 2
  assert.equal(board.undo(), true);
  assert.equal(board.strokes.length, 1);
  assert.equal(board.redoStack.length, 1);
  assert.equal(board.canRedo, true);

  // Redo stroke 2
  assert.equal(board.redo(), true);
  assert.equal(board.strokes.length, 2);
  assert.equal(board.redoStack.length, 0);

  // Undo again and draw a NEW stroke -> evicts redo stack!
  board.undo();
  assert.equal(board.redoStack.length, 1);

  board.beginStroke(50, 50);
  board.addPoint(60, 60);
  board.endStroke();
  assert.equal(board.redoStack.length, 0, 'Redo stack must be evicted on new stroke');
  assert.equal(board.redo(), false);

  // Max history capacity eviction
  board.beginStroke(70, 70); board.endStroke();
  board.beginStroke(80, 80); board.endStroke();
  assert.equal(board.strokes.length, 3, 'Must not exceed maxHistory=3');

  // Cancel stroke does not pollute strokes
  board.beginStroke(90, 90);
  board.cancelStroke();
  assert.equal(board.strokes.length, 3);
  assert.equal(board.isDrawing, false);
});

test('7. Vector SVG export generation with valid XML elements', () => {
  const board = new CulinaryBistroWhiteboardCanvas(null, { template: 'plating' });

  // Draw pen stroke
  board.setTool('pen');
  board.setColor('#eab308');
  board.beginStroke(10, 10);
  board.addPoint(50, 60);
  board.addPoint(90, 110);
  board.endStroke();

  // Draw sauce drizzle
  board.setTool('drizzle');
  board.setColor('#dc2626');
  board.beginStroke(100, 100);
  board.addPoint(140, 130);
  board.addPoint(180, 120);
  board.endStroke();

  // Draw garnish callout
  board.setTool('garnish');
  board.setColor('#84cc16');
  board.beginStroke(200, 200);
  board.addPoint(240, 180);
  board.endStroke();

  // Draw station rectangle
  board.setTool('rectangle');
  board.beginStroke(300, 300);
  board.addPoint(400, 400);
  board.endStroke();

  // Draw circle plate
  board.setTool('circle');
  board.beginStroke(500, 500);
  board.addPoint(550, 550);
  board.endStroke();

  const svg = board.exportSVG();

  // Valid XML root
  assert.ok(svg.startsWith('<?xml') || svg.startsWith('<svg'));
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.endsWith('</svg>'));

  // Contains required vector elements
  assert.ok(svg.includes('<path '), 'SVG must contain path elements');
  assert.ok(svg.includes('<circle '), 'SVG must contain circle elements');
  assert.ok(svg.includes('<rect '), 'SVG must contain rect elements');
  assert.ok(svg.includes('<text '), 'SVG must contain text elements');

  // Verify gourmet bistro colors present in SVG
  assert.ok(svg.includes('#eab308'));
  assert.ok(svg.includes('#dc2626'));
  assert.ok(svg.includes('#84cc16'));

  // Ensure no NaNs or unescaped scripts
  assert.ok(!svg.includes('NaN'));
  assert.ok(!svg.includes('undefined'));
  assert.ok(!svg.includes('<script'));
});

test('8. JSON export and import lifecycle', () => {
  const board1 = new CulinaryBistroWhiteboardCanvas(null, {
    tool: 'drizzle',
    color: '#84cc16',
    strokeWidth: 6,
    opacity: 0.9,
    template: 'brigade'
  });

  board1.beginStroke(20, 20);
  board1.addPoint(60, 80);
  board1.addPoint(100, 140);
  board1.endStroke();

  board1.setTool('garnish');
  board1.beginStroke(150, 150);
  board1.addPoint(180, 120);
  board1.endStroke();

  const jsonStr = board1.exportJSON();
  assert.ok(typeof jsonStr === 'string');

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.theme, 'culinary-bistro');
  assert.equal(parsed.strokes.length, 2);

  // Import into a second board
  const board2 = new CulinaryBistroWhiteboardCanvas();
  assert.equal(board2.loadJSON(jsonStr), true);

  assert.equal(board2.strokes.length, 2);
  assert.equal(board2.template, 'brigade');
  assert.equal(board2.strokes[0].tool, 'drizzle');
  assert.equal(board2.strokes[1].tool, 'garnish');
  assert.equal(board2.strokes[0].points[0].x, 20);

  // Invalid JSON handling
  assert.throws(() => board2.loadJSON('{ broken json'), /Failed to parse/);
  assert.throws(() => board2.loadJSON({ notStrokes: [] }), /missing strokes/);
  assert.throws(() => board2.loadJSON(null), /TypeError/);
});

test('9. Event emitter pattern (on, off, emit)', () => {
  const board = new CulinaryBistroWhiteboardCanvas();
  let callCount = 0;
  let lastPayload = null;

  const handler = (payload) => {
    callCount++;
    lastPayload = payload;
  };

  // Register listener
  const unsubscribe = board.on('customEvent', handler);
  board.emit('customEvent', { chef: 'Gabriel' });
  assert.equal(callCount, 1);
  assert.deepEqual(lastPayload, { chef: 'Gabriel' });

  // Unsubscribe
  unsubscribe();
  board.emit('customEvent', { chef: 'Auguste' });
  assert.equal(callCount, 1, 'Handler should not fire after unsubscribe');

  // Built-in toolChange event
  let toolEvent = null;
  board.on('toolChange', (e) => { toolEvent = e; });
  board.setTool('drizzle');
  assert.deepEqual(toolEvent, { tool: 'drizzle', previous: 'pen' });

  // Built-in stroke events
  let strokeEnded = null;
  board.on('strokeEnd', (s) => { strokeEnded = s; });
  board.beginStroke(10, 10);
  board.endStroke();
  assert.ok(strokeEnded !== null);
  assert.equal(strokeEnded.tool, 'drizzle');
});

test('10. Mock 2D context rendering execution without errors', () => {
  const board = new CulinaryBistroWhiteboardCanvas();

  // Create a comprehensive mock CanvasRenderingContext2D
  const calls = [];
  const mockCtx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    moveTo: (x, y) => calls.push(`moveTo(${x},${y})`),
    lineTo: (x, y) => calls.push(`lineTo(${x},${y})`),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => calls.push(`bezierCurveTo(${x},${y})`),
    quadraticCurveTo: (cpx, cpy, x, y) => calls.push(`quadraticCurveTo(${x},${y})`),
    arc: (x, y, r) => calls.push(`arc(${x},${y},${r})`),
    strokeRect: (x, y, w, h) => calls.push(`strokeRect(${x},${y},${w},${h})`),
    fillRect: (x, y, w, h) => calls.push(`fillRect(${x},${y},${w},${h})`),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    fillText: (text, x, y) => calls.push(`fillText(${text},${x},${y})`),
    setLineDash: (dash) => calls.push(`setLineDash(${dash})`),
    scale: (x, y) => calls.push(`scale(${x},${y})`),
    clearRect: (x, y, w, h) => calls.push(`clearRect(${x},${y},${w},${h})`),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: ''
  };

  // Test renderStroke for every tool
  const tools = ['pen', 'eraser', 'drizzle', 'garnish', 'rectangle', 'circle'];
  for (const tool of tools) {
    const stroke = {
      tool,
      color: '#eab308',
      strokeWidth: 4,
      opacity: 1,
      startX: 10,
      startY: 10,
      endX: 50,
      endY: 50,
      points: [{ x: 10, y: 10 }, { x: 30, y: 30 }, { x: 50, y: 50 }]
    };

    // Test (stroke, ctx) signature
    assert.doesNotThrow(() => board.renderStroke(stroke, mockCtx));

    // Test (ctx, stroke) signature
    assert.doesNotThrow(() => board.renderStroke(mockCtx, stroke));
  }

  // Test full redraw with backdrop
  board.setTemplate('plating');
  assert.doesNotThrow(() => board.redraw(mockCtx));

  board.setTemplate('brigade');
  assert.doesNotThrow(() => board.redraw(mockCtx));

  assert.ok(calls.length > 0, 'Mock context should have received drawing calls');
});
