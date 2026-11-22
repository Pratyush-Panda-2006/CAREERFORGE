import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GamingEsportsWhiteboardCanvas,
  GamingEsportsHubWhiteboardCanvas,
  PALETTE,
  THEME_PALETTE,
  VALID_TOOLS,
  TOOL_ALIASES,
  normalizeTool,
  calculateDistance,
  interpolatePoints,
  catmullRomToBezier,
  pointsToSmoothSvgPath
} from './canvas-whiteboard.js';

test('1. Initialization defaults and palette constants', () => {
  // Theme palette constants verification
  assert.equal(PALETTE.neonCyan, '#00ffcc');
  assert.equal(PALETTE.electricPink, '#ff0055');
  assert.equal(PALETTE.amberGold, '#ffaa00');
  assert.equal(PALETTE.plasmaPurple, '#8b5cf6');
  assert.equal(PALETTE.matrixGreen, '#10b981');
  assert.equal(PALETTE.tacticalDark, '#0a0e17');
  assert.deepEqual(THEME_PALETTE, PALETTE);

  // Instantiation with defaults
  const whiteboard = new GamingEsportsWhiteboardCanvas(null);
  assert.equal(whiteboard.currentTool, 'pen');
  assert.equal(whiteboard.currentColor, PALETTE.neonCyan);
  assert.equal(whiteboard.strokeWidth, 3);
  assert.equal(whiteboard.opacity, 1.0);
  assert.equal(whiteboard.maxHistory, 50);
  assert.equal(whiteboard.backdrop, 'grid');
  assert.equal(whiteboard.backgroundColor, PALETTE.tacticalDark);
  assert.deepEqual(whiteboard.strokes, []);
  assert.deepEqual(whiteboard.redoStack, []);

  // Alias class verification
  const hubBoard = new GamingEsportsHubWhiteboardCanvas(null, {
    tool: 'route',
    color: PALETTE.electricPink,
    strokeWidth: 5,
    maxHistory: 20
  });
  assert.equal(hubBoard.currentTool, 'route');
  assert.equal(hubBoard.currentColor, '#ff0055');
  assert.equal(hubBoard.strokeWidth, 5);
  assert.equal(hubBoard.maxHistory, 20);
});

test('2. Tool mutations, alias normalization, and error handling for invalid tools', () => {
  const whiteboard = new GamingEsportsWhiteboardCanvas(null);

  // Valid canonical tools
  for (const tool of VALID_TOOLS) {
    assert.equal(whiteboard.setTool(tool), tool);
    assert.equal(whiteboard.currentTool, tool);
  }

  // Alias normalization
  assert.equal(whiteboard.setTool('brush'), 'pen');
  assert.equal(whiteboard.setTool('pencil'), 'pen');
  assert.equal(whiteboard.setTool('line'), 'route');
  assert.equal(whiteboard.setTool('arrow'), 'route');
  assert.equal(whiteboard.setTool('rect'), 'rectangle');
  assert.equal(whiteboard.setTool('box'), 'rectangle');
  assert.equal(whiteboard.setTool('marker'), 'ping');
  assert.equal(whiteboard.setTool('beacon'), 'ping');
  assert.equal(whiteboard.setTool('erase'), 'eraser');
  assert.equal(whiteboard.setTool('circ'), 'circle');

  // Case insensitivity and whitespace trimming
  assert.equal(whiteboard.setTool('  ROUTE  '), 'route');
  assert.equal(whiteboard.setTool('  PEN  '), 'pen');
  assert.equal(whiteboard.setTool('  RECTANGLE  '), 'rectangle');

  // Error handling for invalid tools
  assert.throws(() => whiteboard.setTool('laser-pointer'), /Invalid tool: "laser-pointer"/);
  assert.throws(() => whiteboard.setTool('unknown_weapon'), /Invalid tool: "unknown_weapon"/);
  assert.throws(() => whiteboard.setTool(''), /Invalid tool: ""/);
  assert.throws(() => whiteboard.setTool(12345), /Tool name must be a string/);
  assert.throws(() => whiteboard.setTool(null), /Tool name must be a string/);
});

test('3. Brush customization (color, strokeWidth, opacity) and numeric bounds clamping', () => {
  const whiteboard = new GamingEsportsWhiteboardCanvas(null);

  // Color mutations
  whiteboard.setColor(PALETTE.matrixGreen);
  assert.equal(whiteboard.currentColor, '#10b981');
  whiteboard.setColor(' #8b5cf6 ');
  assert.equal(whiteboard.currentColor, '#8b5cf6');
  // Invalid empty or non-string color should not overwrite
  whiteboard.setColor('');
  assert.equal(whiteboard.currentColor, '#8b5cf6');

  // Stroke width clamping [1, 100]
  whiteboard.setStrokeWidth(15);
  assert.equal(whiteboard.strokeWidth, 15);
  whiteboard.setStrokeWidth(0); // below min
  assert.equal(whiteboard.strokeWidth, 1);
  whiteboard.setStrokeWidth(-42); // negative
  assert.equal(whiteboard.strokeWidth, 1);
  whiteboard.setStrokeWidth(250); // above max
  assert.equal(whiteboard.strokeWidth, 100);
  whiteboard.setWidth(8); // setWidth alias
  assert.equal(whiteboard.strokeWidth, 8);

  // Opacity bounds clamping [0.01, 1.0]
  whiteboard.setOpacity(0.65);
  assert.equal(whiteboard.opacity, 0.65);
  whiteboard.setOpacity(-0.5); // below min
  assert.equal(whiteboard.opacity, 0.01);
  whiteboard.setOpacity(1.85); // above max
  assert.equal(whiteboard.opacity, 1.0);

  // Tactical ping label customization
  whiteboard.setPingLabel('defend a');
  assert.equal(whiteboard.pingLabel, 'DEFEND A');
  whiteboard.setPingLabel('');
  assert.equal(whiteboard.pingLabel, 'PING');
});

test('4. Point distance interpolation generating intermediate points without gaps', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 30, y: 40 };

  // Calculate Euclidean distance (3-4-5 triangle = 50)
  assert.equal(calculateDistance(p1, p2), 50);

  // Interpolation with max gap = 10
  const points = interpolatePoints(p1, p2, 10);
  assert.ok(points.length >= 6); // steps = 5, points = 6
  assert.equal(points[0].x, 0);
  assert.equal(points[0].y, 0);
  assert.equal(points[points.length - 1].x, 30);
  assert.equal(points[points.length - 1].y, 40);

  // Verify that no consecutive points have a distance greater than maxDist
  for (let i = 0; i < points.length - 1; i++) {
    const dist = calculateDistance(points[i], points[i + 1]);
    assert.ok(dist <= 10.001, `Gap between points ${i} and ${i+1} exceeds max: ${dist}`);
  }

  // Segment shorter than max distance returns just start and end
  const shortSegment = interpolatePoints({ x: 0, y: 0 }, { x: 2, y: 2 }, 10);
  assert.equal(shortSegment.length, 2);
  assert.equal(shortSegment[0].x, 0);
  assert.equal(shortSegment[1].x, 2);

  // Edge cases with null points
  assert.deepEqual(interpolatePoints(null, null), []);
  assert.deepEqual(interpolatePoints({ x: 5, y: 5 }, null), [{ x: 5, y: 5 }]);
  assert.deepEqual(interpolatePoints(null, { x: 8, y: 8 }), [{ x: 8, y: 8 }]);
});

test('5. Catmull-Rom smoothing and path generation', () => {
  const rawPoints = [
    { x: 0, y: 0 },
    { x: 20, y: 50 },
    { x: 60, y: 30 },
    { x: 100, y: 80 }
  ];

  const curves = catmullRomToBezier(rawPoints);
  assert.equal(curves.length, 3);

  // Validate control point structures
  for (const seg of curves) {
    assert.ok(Number.isFinite(seg.cp1.x));
    assert.ok(Number.isFinite(seg.cp1.y));
    assert.ok(Number.isFinite(seg.cp2.x));
    assert.ok(Number.isFinite(seg.cp2.y));
    assert.ok(Number.isFinite(seg.end.x));
    assert.ok(Number.isFinite(seg.end.y));
  }

  // End point of last segment should equal last input point
  assert.equal(curves[curves.length - 1].end.x, 100);
  assert.equal(curves[curves.length - 1].end.y, 80);

  // SVG smooth path generation
  const pathD = pointsToSmoothSvgPath(rawPoints);
  assert.ok(pathD.startsWith('M 0.00 0.00'));
  assert.ok(pathD.includes('C '));
  assert.ok(pathD.endsWith('100.00 80.00'));

  // Single point path
  assert.equal(pointsToSmoothSvgPath([{ x: 10, y: 20 }]), 'M 10.00 20.00');
  assert.equal(pointsToSmoothSvgPath([]), '');
});

test('6. Undo / Redo boundary limits and redo eviction on new stroke', () => {
  const maxHistory = 4;
  const whiteboard = new GamingEsportsWhiteboardCanvas(null, { maxHistory });

  // Commit 6 strokes (exceeding maxHistory of 4)
  for (let i = 1; i <= 6; i++) {
    whiteboard.startStroke(i * 10, i * 10);
    whiteboard.addPoint(i * 10 + 5, i * 10 + 5);
    whiteboard.endStroke();
  }

  // History capacity eviction: length must be capped at 4
  assert.equal(whiteboard.strokes.length, 4);
  // Oldest remaining stroke should be stroke #3 (from i = 3..6)
  assert.equal(whiteboard.strokes[0].startX, 30);
  assert.equal(whiteboard.strokes[3].startX, 60);

  // Undo operation
  assert.equal(whiteboard.undo(), true);
  assert.equal(whiteboard.strokes.length, 3);
  assert.equal(whiteboard.redoStack.length, 1);

  assert.equal(whiteboard.undo(), true);
  assert.equal(whiteboard.strokes.length, 2);
  assert.equal(whiteboard.redoStack.length, 2);

  // Redo operation
  assert.equal(whiteboard.redo(), true);
  assert.equal(whiteboard.strokes.length, 3);
  assert.equal(whiteboard.redoStack.length, 1);

  // Redo eviction on new stroke creation
  whiteboard.startStroke(99, 99);
  whiteboard.addPoint(100, 100);
  whiteboard.endStroke();

  assert.equal(whiteboard.redoStack.length, 0); // Redo stack must be evicted
  assert.equal(whiteboard.strokes.length, 4);
  assert.equal(whiteboard.strokes[3].startX, 99);

  // Exhaust undo stack
  assert.equal(whiteboard.undo(), true);
  assert.equal(whiteboard.undo(), true);
  assert.equal(whiteboard.undo(), true);
  assert.equal(whiteboard.undo(), true);
  assert.equal(whiteboard.strokes.length, 0);
  assert.equal(whiteboard.undo(), false); // Empty strokes undo returns false

  // Clear canvas
  whiteboard.redo();
  assert.equal(whiteboard.strokes.length, 1);
  assert.equal(whiteboard.clear(), true);
  assert.equal(whiteboard.strokes.length, 0);
  assert.equal(whiteboard.redoStack.length, 0);
  assert.equal(whiteboard.clear(), false); // Consecutive clear returns false
});

test('7. Vector SVG export generation with valid XML elements', () => {
  const whiteboard = new GamingEsportsWhiteboardCanvas(null, {
    width: 800,
    height: 600,
    color: PALETTE.neonCyan
  });

  // 1. Pen stroke (generates <path>)
  whiteboard.setTool('pen');
  whiteboard.startStroke(10, 10);
  whiteboard.addPoint(30, 40);
  whiteboard.addPoint(60, 20);
  whiteboard.endStroke();

  // 2. Ping marker (generates <circle> and <text>)
  whiteboard.setTool('ping');
  whiteboard.setColor(PALETTE.electricPink);
  whiteboard.setPingLabel('DEFEND B');
  whiteboard.startStroke(250, 180);
  whiteboard.endStroke();

  // 3. Route arrow (generates <path> and <polygon>)
  whiteboard.setTool('route');
  whiteboard.setColor(PALETTE.amberGold);
  whiteboard.startStroke(100, 100);
  whiteboard.addPoint(150, 120);
  whiteboard.addPoint(200, 200);
  whiteboard.endStroke();

  // 4. Rectangle zone (generates <rect>)
  whiteboard.setTool('rectangle');
  whiteboard.setColor(PALETTE.matrixGreen);
  whiteboard.startStroke(300, 300);
  whiteboard.addPoint(450, 400);
  whiteboard.endStroke();

  // 5. Circle AoE (generates <circle>)
  whiteboard.setTool('circle');
  whiteboard.setColor(PALETTE.plasmaPurple);
  whiteboard.startStroke(500, 200);
  whiteboard.addPoint(540, 200);
  whiteboard.endStroke();

  const svg = whiteboard.exportSVG(800, 600);

  // Validate XML root and dimensions
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('viewBox="0 0 800 600"'));
  assert.ok(svg.endsWith('</svg>'));

  // Validate required XML element tags
  assert.ok(svg.includes('<path d="M '));
  assert.ok(svg.includes('<circle '));
  assert.ok(svg.includes('<text '));
  assert.ok(svg.includes('DEFEND B'));
  assert.ok(svg.includes('<rect '));
  assert.ok(svg.includes('<polygon points='));
  assert.ok(svg.includes('stroke="#00ffcc"'));
  assert.ok(svg.includes('stroke="#ff0055"'));
  assert.ok(svg.includes('stroke="#ffaa00"'));
});

test('8. JSON export and import lifecycle', () => {
  const whiteboard = new GamingEsportsWhiteboardCanvas(null, {
    tool: 'route',
    color: PALETTE.electricPink,
    strokeWidth: 6,
    backdrop: 'defusal'
  });

  // Create two distinct strokes
  whiteboard.startStroke(50, 60);
  whiteboard.addPoint(70, 80);
  whiteboard.endStroke();

  whiteboard.setTool('rectangle');
  whiteboard.setColor(PALETTE.matrixGreen);
  whiteboard.startStroke(100, 100);
  whiteboard.addPoint(200, 150);
  whiteboard.endStroke();

  // Export JSON
  const jsonStr = whiteboard.exportJSON(true);
  assert.ok(typeof jsonStr === 'string');
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.schema, 'gaming-esports-hub-whiteboard');
  assert.equal(parsed.canvas.backdrop, 'defusal');
  assert.equal(parsed.strokes.length, 2);

  // Clear current board
  whiteboard.clear();
  assert.equal(whiteboard.strokes.length, 0);

  // Re-hydrate / load from exported JSON string
  const loaded = whiteboard.loadJSON(jsonStr);
  assert.equal(loaded, true);
  assert.equal(whiteboard.strokes.length, 2);
  assert.equal(whiteboard.strokes[0].tool, 'route');
  assert.equal(whiteboard.strokes[1].tool, 'rectangle');
  assert.equal(whiteboard.backdrop, 'defusal');

  // Load from parsed object directly
  whiteboard.loadJSON(parsed);
  assert.equal(whiteboard.strokes.length, 2);

  // Validate error cases
  assert.throws(() => whiteboard.loadJSON(''), /Cannot load empty JSON/);
  assert.throws(() => whiteboard.loadJSON('{ corrupted json: '), /Invalid JSON format/);
  assert.throws(() => whiteboard.loadJSON({ invalidPayload: true }), /missing strokes array/);
  assert.throws(() => whiteboard.loadJSON(12345), /Expected JSON string or object/);
});

test('9. Event emitter pattern (on, off, emit)', () => {
  const whiteboard = new GamingEsportsWhiteboardCanvas(null);

  const eventsLog = [];
  const onStart = (stroke) => eventsLog.push({ event: 'start', id: stroke.id });
  const onEnd = (stroke) => eventsLog.push({ event: 'end', id: stroke.id });
  const onTool = (tool) => eventsLog.push({ event: 'tool', tool });
  const onColor = (color) => eventsLog.push({ event: 'color', color });
  const onUndo = (data) => eventsLog.push({ event: 'undo', remaining: data.remaining });

  whiteboard.on('stroke:start', onStart);
  whiteboard.on('stroke:end', onEnd);
  whiteboard.on('tool:change', onTool);
  whiteboard.on('color:change', onColor);
  whiteboard.on('undo', onUndo);

  // Trigger events
  whiteboard.setTool('route');
  whiteboard.setColor(PALETTE.amberGold);
  whiteboard.startStroke(10, 20);
  whiteboard.endStroke();
  whiteboard.undo();

  assert.equal(eventsLog.length, 5);
  assert.equal(eventsLog[0].event, 'tool');
  assert.equal(eventsLog[0].tool, 'route');
  assert.equal(eventsLog[1].event, 'color');
  assert.equal(eventsLog[1].color, PALETTE.amberGold);
  assert.equal(eventsLog[2].event, 'start');
  assert.equal(eventsLog[3].event, 'end');
  assert.equal(eventsLog[4].event, 'undo');

  // Test off() unregistering
  whiteboard.off('tool:change', onTool);
  whiteboard.setTool('rectangle');
  // Log length should remain 5 because onTool was detached
  assert.equal(eventsLog.length, 5);

  // Custom emit
  let customReceived = false;
  whiteboard.on('tactical:radar', (val) => { customReceived = val; });
  whiteboard.emit('tactical:radar', true);
  assert.equal(customReceived, true);
});

test('10. Mock 2D context rendering execution without errors', () => {
  const calls = [];
  const mockCtx = {
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    beginPath() { calls.push('beginPath'); },
    moveTo(x, y) { calls.push(`moveTo(${x},${y})`); },
    lineTo(x, y) { calls.push(`lineTo(${x},${y})`); },
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { calls.push(`bezierCurveTo(${x},${y})`); },
    stroke() { calls.push('stroke'); },
    fill() { calls.push('fill'); },
    arc(x, y, r) { calls.push(`arc(${x},${y},${r})`); },
    strokeRect(x, y, w, h) { calls.push(`strokeRect(${x},${y},${w},${h})`); },
    fillRect(x, y, w, h) { calls.push(`fillRect(${x},${y},${w},${h})`); },
    fillText(text, x, y) { calls.push(`fillText(${text},${x},${y})`); },
    setLineDash(pattern) { calls.push(`setLineDash(${pattern})`); },
    closePath() { calls.push('closePath'); },
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    globalAlpha: 1,
    font: '',
    textAlign: ''
  };

  const whiteboard = new GamingEsportsWhiteboardCanvas(null);

  // Render pen stroke
  const penStroke = {
    tool: 'pen',
    color: '#00ffcc',
    strokeWidth: 3,
    opacity: 1,
    points: [{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }]
  };
  whiteboard.renderStroke(penStroke, mockCtx);
  assert.ok(calls.includes('save'));
  assert.ok(calls.includes('bezierCurveTo(30,30)'));
  assert.ok(calls.includes('restore'));

  // Test flipped signature (ctx, stroke)
  const prevCount = calls.length;
  whiteboard.renderStroke(mockCtx, penStroke);
  assert.ok(calls.length > prevCount);

  // Render eraser stroke
  const eraserStroke = {
    tool: 'eraser',
    strokeWidth: 5,
    points: [{ x: 5, y: 5 }, { x: 15, y: 15 }]
  };
  whiteboard.renderStroke(eraserStroke, mockCtx);

  // Render tactical ping stroke
  const pingStroke = {
    tool: 'ping',
    color: '#ff0055',
    startX: 100,
    startY: 120,
    label: 'ALERT'
  };
  whiteboard.renderStroke(pingStroke, mockCtx);
  assert.ok(calls.some(c => c.includes('fillText(ALERT,100,94)')));

  // Render route arrow stroke
  const routeStroke = {
    tool: 'route',
    color: '#ffaa00',
    strokeWidth: 4,
    startX: 50,
    startY: 50,
    endX: 120,
    endY: 90,
    points: [{ x: 50, y: 50 }, { x: 120, y: 90 }]
  };
  whiteboard.renderStroke(routeStroke, mockCtx);

  // Render rectangle stroke
  const rectStroke = {
    tool: 'rectangle',
    color: '#10b981',
    startX: 10,
    startY: 10,
    endX: 60,
    endY: 80
  };
  whiteboard.renderStroke(rectStroke, mockCtx);

  // Render circle stroke
  const circleStroke = {
    tool: 'circle',
    color: '#8b5cf6',
    startX: 200,
    startY: 200,
    endX: 250,
    endY: 200
  };
  whiteboard.renderStroke(circleStroke, mockCtx);

  // Telemetry metrics
  const metrics = whiteboard.getMetrics();
  assert.equal(typeof metrics.totalStrokes, 'number');
  assert.equal(typeof metrics.currentTool, 'string');
});
