import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyWhiteboardCanvas } from './canvas-whiteboard.js';

test('initialization with defaults and theme color palette constants', () => {
  const wb = new TravelOdysseyWhiteboardCanvas();
  assert.equal(wb.tool, 'pen');
  assert.equal(wb.color, TravelOdysseyWhiteboardCanvas.PALETTE.sunsetOrange);
  assert.equal(wb.strokeWidth, 4);
  assert.equal(wb.opacity, 1.0);
  assert.equal(wb.maxHistory, 50);
  assert.equal(wb.strokes.length, 0);
  assert.equal(wb.redoStack.length, 0);
  assert.equal(wb.canUndo, false);
  assert.equal(wb.canRedo, false);

  // Palette checks
  assert.equal(TravelOdysseyWhiteboardCanvas.PALETTE.sunsetOrange, '#f97316');
  assert.equal(TravelOdysseyWhiteboardCanvas.PALETTE.azureOcean, '#0284c7');
  assert.equal(TravelOdysseyWhiteboardCanvas.PALETTE.amber, '#f59e0b');
  assert.equal(TravelOdysseyWhiteboardCanvas.PALETTE.forestGreen, '#10b981');
});

test('tool selection mutations and validation', () => {
  const wb = new TravelOdysseyWhiteboardCanvas();
  const toolHistory = [];
  wb.on('tool:change', (change) => toolHistory.push(change));

  // Switch to eraser
  wb.setTool('eraser');
  assert.equal(wb.tool, 'eraser');

  // Switch to route with aliases
  wb.setTool('route');
  assert.equal(wb.tool, 'route');
  wb.setTool('route-line');
  assert.equal(wb.tool, 'route');

  // Switch to waypoint with aliases
  wb.setTool('waypoint');
  assert.equal(wb.tool, 'waypoint');
  wb.setTool('waypoint_marker');
  assert.equal(wb.tool, 'waypoint');

  // Switch to rectangle and circle
  wb.setTool('rectangle');
  assert.equal(wb.tool, 'rectangle');
  wb.setTool('geo-rectangle');
  assert.equal(wb.tool, 'rectangle');

  wb.setTool('circle');
  assert.equal(wb.tool, 'circle');
  wb.setTool('area-circle');
  assert.equal(wb.tool, 'circle');

  // Invalid tool names throw
  assert.throws(() => wb.setTool('laser-pointer'), /Unsupported tool/);
  assert.throws(() => wb.setTool(''), /Unsupported tool/);
  assert.throws(() => wb.setTool(123), /Tool must be a string/);

  // Verify events fired
  assert.ok(toolHistory.length > 0);
  assert.equal(toolHistory[0].previous, 'pen');
  assert.equal(toolHistory[0].current, 'eraser');
});

test('brush customization mutations (color, strokeWidth, opacity)', () => {
  const wb = new TravelOdysseyWhiteboardCanvas();
  let lastColorChange = null;
  let lastWidthChange = null;
  let lastOpacityChange = null;

  wb.on('color:change', (c) => { lastColorChange = c; });
  wb.on('strokeWidth:change', (w) => { lastWidthChange = w; });
  wb.on('opacity:change', (o) => { lastOpacityChange = o; });

  // Color mutations
  wb.setColor(TravelOdysseyWhiteboardCanvas.PALETTE.azureOcean);
  assert.equal(wb.color, '#0284c7');
  assert.deepEqual(lastColorChange, { previous: '#f97316', current: '#0284c7' });
  assert.throws(() => wb.setColor(''), /valid non-empty string/);
  assert.throws(() => wb.setColor(null), /valid non-empty string/);

  // Stroke width mutations with clamping (1 to 50)
  wb.setStrokeWidth(25);
  assert.equal(wb.strokeWidth, 25);
  assert.equal(lastWidthChange.current, 25);

  wb.setStrokeWidth(999);
  assert.equal(wb.strokeWidth, 50); // clamped to 50

  wb.setStrokeWidth(-10);
  assert.equal(wb.strokeWidth, 1); // clamped to 1
  assert.throws(() => wb.setStrokeWidth('not-a-number'), /valid number/);

  // Opacity mutations with clamping (0.05 to 1.0)
  wb.setOpacity(0.65);
  assert.equal(wb.opacity, 0.65);
  assert.equal(lastOpacityChange.current, 0.65);

  wb.setOpacity(2.5);
  assert.equal(wb.opacity, 1.0); // clamped to 1.0

  wb.setOpacity(0.001);
  assert.equal(wb.opacity, 0.05); // clamped to 0.05
  assert.throws(() => wb.setOpacity('invalid'), /valid number/);
});

test('point distance interpolation generates intermediate points without gaps', () => {
  const wb = new TravelOdysseyWhiteboardCanvas({ interpolateDistance: 10, minDistance: 2 });

  // Direct interpolation helper test
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 0, y: 40 };
  const intermediate = wb.interpolatePoints(p1, p2, 10);
  assert.equal(intermediate.length, 4);
  assert.deepEqual(intermediate, [
    { x: 0, y: 10 },
    { x: 0, y: 20 },
    { x: 0, y: 30 },
    { x: 0, y: 40 },
  ]);

  // Points within minDistance / maxDistance
  const pClose = { x: 0, y: 5 };
  const withinDist = wb.interpolatePoints(p1, pClose, 10);
  assert.equal(withinDist.length, 1);
  assert.deepEqual(withinDist, [{ x: 0, y: 5 }]);

  // Freehand stroke interpolation during drawing
  wb.startStroke(0, 0);
  wb.addPoint(0, 50);
  const activeStroke = wb.currentStroke;
  // Should have starting point (0, 0) plus 5 interpolated points up to (0, 50)
  assert.ok(activeStroke.points.length >= 5);
  assert.equal(activeStroke.points[0].y, 0);
  assert.equal(activeStroke.points[activeStroke.points.length - 1].y, 50);

  // Successive distance between consecutive points should be <= interpolateDistance (10)
  for (let i = 1; i < activeStroke.points.length; i++) {
    const prev = activeStroke.points[i - 1];
    const curr = activeStroke.points[i];
    const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    assert.ok(d <= 10.01, `Segment ${i} distance ${d} exceeds max interpolate distance`);
  }

  wb.endStroke();
});

test('stroke smoothing computes smooth Catmull-Rom Bezier curves', () => {
  const wb = new TravelOdysseyWhiteboardCanvas({ smoothing: true, smoothingTension: 0.5 });

  const rawPoints = [
    { x: 0, y: 0 },
    { x: 20, y: 50 },
    { x: 40, y: 20 },
    { x: 60, y: 80 },
    { x: 80, y: 10 },
  ];

  // Catmull-Rom to Bezier transformation
  const bezierSegments = wb.catmullRomToBezier(rawPoints, 0.5);
  assert.equal(bezierSegments.length, 4); // 5 points = 4 segments

  // Each segment has p0, cp1, cp2, p1
  for (let i = 0; i < bezierSegments.length; i++) {
    const seg = bezierSegments[i];
    assert.ok(seg.p0 && seg.cp1 && seg.cp2 && seg.p1);
    assert.equal(seg.p0.x, rawPoints[i].x);
    assert.equal(seg.p1.x, rawPoints[i + 1].x);
    // Control points should lie within the geometric scope of the segment neighborhood
    assert.ok(Number.isFinite(seg.cp1.x) && Number.isFinite(seg.cp1.y));
    assert.ok(Number.isFinite(seg.cp2.x) && Number.isFinite(seg.cp2.y));
  }

  // pointsToSvgPath with smoothing generates cubic Bezier curves ('C')
  const smoothedPath = wb.pointsToSvgPath(rawPoints, { smoothing: true });
  assert.ok(smoothedPath.startsWith('M 0 0'));
  assert.ok(smoothedPath.includes('C'), 'Smoothed path must contain cubic Bezier "C" commands');

  // pointsToSvgPath without smoothing generates linear segments ('L')
  const linearPath = wb.pointsToSvgPath(rawPoints, { smoothing: false });
  assert.ok(linearPath.startsWith('M 0 0'));
  assert.ok(linearPath.includes('L'), 'Non-smoothed path must contain linear "L" commands');
  assert.ok(!linearPath.includes('C'), 'Non-smoothed path must not contain "C" commands');
});

test('vector stroke lifecycle and shape tools', () => {
  const wb = new TravelOdysseyWhiteboardCanvas();
  let startFired = false;
  let endFired = false;

  wb.on('stroke:start', () => { startFired = true; });
  wb.on('stroke:end', () => { endFired = true; });

  // 1. Pen freehand stroke
  wb.setTool('pen');
  wb.startStroke(10, 10, { color: '#f97316', strokeWidth: 5 });
  wb.addPoint(15, 20);
  wb.addPoint(30, 40);
  const stroke1 = wb.endStroke();

  assert.ok(startFired);
  assert.ok(endFired);
  assert.equal(stroke1.tool, 'pen');
  assert.equal(stroke1.color, '#f97316');
  assert.equal(stroke1.strokeWidth, 5);
  assert.ok(stroke1.points.length >= 3);
  assert.equal(wb.strokes.length, 1);

  // 2. Route Line stroke with waypoint anchors
  wb.setTool('route');
  wb.startStroke(50, 50);
  wb.addPoint(100, 120);
  const routeStroke = wb.endStroke();
  assert.equal(routeStroke.tool, 'route');
  assert.equal(wb.strokes.length, 2);

  // 3. Geo Rectangle stroke
  wb.setTool('rectangle');
  wb.startStroke(20, 20);
  wb.addPoint(120, 80);
  const rectStroke = wb.endStroke();
  assert.equal(rectStroke.tool, 'rectangle');
  assert.deepEqual(rectStroke.startPoint, { x: 20, y: 20 });
  assert.deepEqual(rectStroke.endPoint, { x: 120, y: 80 });

  // 4. Area Circle stroke
  wb.setTool('circle');
  wb.startStroke(100, 100);
  wb.addPoint(150, 100); // radius 50
  const circleStroke = wb.endStroke();
  assert.equal(circleStroke.tool, 'circle');
  assert.deepEqual(circleStroke.startPoint, { x: 100, y: 100 });
  assert.deepEqual(circleStroke.endPoint, { x: 150, y: 100 });

  // 5. Waypoint Marker stroke with custom label
  wb.setTool('waypoint');
  wb.startStroke(200, 250, { label: 'Mount Fuji Basecamp' });
  const wpStroke = wb.endStroke();
  assert.equal(wpStroke.tool, 'waypoint');
  assert.equal(wpStroke.label, 'Mount Fuji Basecamp');
});

test('undo and redo boundary limits', () => {
  const wb = new TravelOdysseyWhiteboardCanvas({ maxHistory: 3 });

  // 1. Boundary check: Empty undo/redo does not throw
  assert.equal(wb.undo(), null);
  assert.equal(wb.redo(), null);
  assert.equal(wb.canUndo, false);
  assert.equal(wb.canRedo, false);

  // 2. Draw 2 strokes
  wb.startStroke(0, 0); wb.endStroke();
  wb.startStroke(10, 10); wb.endStroke();
  assert.equal(wb.strokes.length, 2);
  assert.equal(wb.canUndo, true);
  assert.equal(wb.canRedo, false);

  // 3. Undo one stroke
  const undone = wb.undo();
  assert.ok(undone);
  assert.equal(wb.strokes.length, 1);
  assert.equal(wb.redoStack.length, 1);
  assert.equal(wb.canRedo, true);

  // 4. Redo the stroke
  const redone = wb.redo();
  assert.ok(redone);
  assert.equal(wb.strokes.length, 2);
  assert.equal(wb.redoStack.length, 0);
  assert.equal(wb.canRedo, false);

  // Redo beyond boundary limit returns null
  assert.equal(wb.redo(), null);

  // 5. Drawing a new stroke after undo clears the redo stack
  wb.undo();
  assert.equal(wb.redoStack.length, 1);
  wb.startStroke(99, 99); wb.endStroke();
  assert.equal(wb.redoStack.length, 0, 'New stroke must clear the redo stack');

  // 6. Max history boundary limit enforcement
  // Add 4 more strokes on maxHistory = 3
  wb.clear();
  for (let i = 1; i <= 6; i++) {
    wb.startStroke(i * 10, i * 10);
    wb.endStroke();
  }
  // Stack size must not exceed maxHistory (3)
  assert.equal(wb.strokes.length, 3);
  // Oldest strokes were shifted out, keeping the last 3
  assert.equal(wb.strokes[0].startPoint.x, 40);
  assert.equal(wb.strokes[1].startPoint.x, 50);
  assert.equal(wb.strokes[2].startPoint.x, 60);
});

test('clear and state reset', () => {
  const wb = new TravelOdysseyWhiteboardCanvas();
  let clearEventCount = 0;
  wb.on('clear', () => { clearEventCount++; });

  wb.startStroke(1, 1); wb.endStroke();
  wb.startStroke(2, 2); wb.endStroke();
  assert.equal(wb.strokes.length, 2);

  wb.clear();
  assert.equal(wb.strokes.length, 0);
  assert.equal(wb.redoStack.length, 0);
  assert.equal(wb.canUndo, false);
  assert.equal(clearEventCount, 1);

  // Subsequent clear on empty canvas is no-op
  wb.clear();
  assert.equal(clearEventCount, 1);
});

test('SVG path serialization validation', () => {
  const wb = new TravelOdysseyWhiteboardCanvas({
    width: 800,
    height: 600,
    backgroundColor: '#0b132b',
  });

  // Empty canvas produces valid SVG root
  const emptySvg = wb.exportSVG();
  assert.match(emptySvg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 800 600"/);
  assert.match(emptySvg, /<\/svg>$/);
  assert.match(emptySvg, /<rect width="100%" height="100%" fill="#0b132b"/);

  // Add multiple tools
  wb.setTool('pen');
  wb.setColor('#f97316');
  wb.startStroke(10, 10);
  wb.addPoint(50, 50);
  wb.endStroke();

  wb.setTool('route');
  wb.setColor('#0284c7');
  wb.startStroke(100, 100);
  wb.addPoint(200, 250);
  wb.endStroke();

  wb.setTool('rectangle');
  wb.setColor('#f59e0b');
  wb.startStroke(300, 300);
  wb.addPoint(450, 400);
  wb.endStroke();

  wb.setTool('circle');
  wb.setColor('#10b981');
  wb.startStroke(500, 500);
  wb.addPoint(550, 500);
  wb.endStroke();

  wb.setTool('waypoint');
  wb.setColor('#f97316');
  wb.startStroke(600, 400, { label: 'Basecamp Alpha' });
  wb.endStroke();

  wb.setTool('eraser');
  wb.startStroke(30, 30);
  wb.addPoint(40, 40);
  wb.endStroke();

  const fullSvg = wb.exportSVG();

  // Validate elements
  assert.ok(fullSvg.includes('<path d="M 10 10'), 'Must contain pen path');
  assert.ok(fullSvg.includes('stroke="#f97316"'), 'Must contain sunset orange stroke');
  assert.ok(fullSvg.includes('stroke-dasharray='), 'Must contain dashed route line');
  assert.ok(fullSvg.includes('<rect x="300" y="300" width="150" height="100"'), 'Must contain rect');
  assert.ok(fullSvg.includes('<circle cx="500" cy="500" r="50"'), 'Must contain circle');
  assert.ok(fullSvg.includes('Basecamp Alpha'), 'Must contain waypoint label');
  assert.ok(fullSvg.includes('<g class="waypoint-node"'), 'Must contain waypoint group');
  assert.ok(fullSvg.includes('stroke="#0b132b"'), 'Eraser path must match background color');

  // Verify XML tag balance
  const openTags = (fullSvg.match(/<svg/g) || []).length;
  const closeTags = (fullSvg.match(/<\/svg>/g) || []).length;
  assert.equal(openTags, closeTags);
});

test('JSON export and import lifecycle', () => {
  const wb = new TravelOdysseyWhiteboardCanvas({ width: 1000, height: 700 });

  wb.setTool('pen');
  wb.setColor('#f97316');
  wb.startStroke(20, 30);
  wb.addPoint(60, 80);
  wb.endStroke();

  wb.setTool('waypoint');
  wb.startStroke(150, 200, { label: 'Summit Shelter' });
  wb.endStroke();

  // Export to JSON string
  const jsonStr = wb.exportJSON();
  assert.equal(typeof jsonStr, 'string');

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.appName, 'TravelOdysseyWhiteboardCanvas');
  assert.equal(parsed.width, 1000);
  assert.equal(parsed.height, 700);
  assert.equal(parsed.strokes.length, 2);

  // Restore into a fresh canvas
  const wbRestored = new TravelOdysseyWhiteboardCanvas();
  let loadEventFired = false;
  wbRestored.on('load', (strokes) => {
    loadEventFired = true;
    assert.equal(strokes.length, 2);
  });

  wbRestored.loadJSON(jsonStr);
  assert.ok(loadEventFired);
  assert.equal(wbRestored.strokes.length, 2);
  assert.equal(wbRestored.strokes[0].tool, 'pen');
  assert.equal(wbRestored.strokes[1].tool, 'waypoint');
  assert.equal(wbRestored.strokes[1].label, 'Summit Shelter');

  // Load from raw array of strokes
  const wbArrayLoad = new TravelOdysseyWhiteboardCanvas();
  wbArrayLoad.loadJSON(parsed.strokes);
  assert.equal(wbArrayLoad.strokes.length, 2);

  // Malformed JSON throws
  assert.throws(() => wbRestored.loadJSON('{bad:json}'), /Failed to parse whiteboard JSON/);
  assert.throws(() => wbRestored.loadJSON(12345), /must be an array of strokes or an object/);
});

test('event emitter pattern: on, off, and emit', () => {
  const wb = new TravelOdysseyWhiteboardCanvas();
  let callCount = 0;
  const listener = (data) => {
    callCount += data.increment;
  };

  wb.on('custom-ping', listener);
  wb.emit('custom-ping', { increment: 5 });
  assert.equal(callCount, 5);

  wb.emit('custom-ping', { increment: 3 });
  assert.equal(callCount, 8);

  // Unsubscribe
  wb.off('custom-ping', listener);
  wb.emit('custom-ping', { increment: 10 });
  assert.equal(callCount, 8, 'Unsubscribed listener must not be called');
});

test('renderStroke with mock 2D context executes without errors', () => {
  const wb = new TravelOdysseyWhiteboardCanvas();
  const operations = [];

  const mockCtx = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    beginPath: () => operations.push('beginPath'),
    moveTo: (x, y) => operations.push(`moveTo(${x},${y})`),
    lineTo: (x, y) => operations.push(`lineTo(${x},${y})`),
    bezierCurveTo: () => operations.push('bezierCurveTo'),
    arc: () => operations.push('arc'),
    stroke: () => operations.push('stroke'),
    fill: () => operations.push('fill'),
    fillRect: () => operations.push('fillRect'),
    strokeRect: () => operations.push('strokeRect'),
    setLineDash: (d) => operations.push(`setLineDash(${d.join(',')})`),
    measureText: (text) => ({ width: text.length * 8 }),
    fillText: (text) => operations.push(`fillText(${text})`),
  };

  wb.startStroke(10, 10);
  wb.addPoint(50, 50);
  wb.addPoint(80, 90);
  const stroke = wb.endStroke();

  wb.renderStroke(stroke, mockCtx);
  assert.ok(operations.includes('save'));
  assert.ok(operations.includes('restore'));
  assert.ok(operations.includes('stroke'));
});
