import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DocsPortalWhiteboardCanvas,
  WHITEBOARD_PALETTE,
  VALID_TOOLS,
  TOOL_ALIASES
} from './canvas-whiteboard.js';

test('1. Initialization defaults and palette constants', () => {
  const wb = new DocsPortalWhiteboardCanvas();

  // Test palette constants
  assert.equal(WHITEBOARD_PALETTE.terminalDark, '#090d16');
  assert.equal(WHITEBOARD_PALETTE.docBlue, '#3b82f6');
  assert.equal(WHITEBOARD_PALETTE.mintGreen, '#10b981');
  assert.equal(WHITEBOARD_PALETTE.amberWarning, '#f59e0b');
  assert.equal(WHITEBOARD_PALETTE.purpleSyntax, '#a855f7');
  assert.equal(WHITEBOARD_PALETTE.canvasWhite, '#f8fafc');
  assert.equal(WHITEBOARD_PALETTE.slateBorder, '#334155');

  assert.equal(DocsPortalWhiteboardCanvas.PALETTE.terminalDark, '#090d16');
  assert.equal(wb.palette.docBlue, '#3b82f6');

  // Test initialization defaults
  assert.equal(wb.currentTool, 'pen');
  assert.equal(wb.tool, 'pen');
  assert.equal(wb.color, WHITEBOARD_PALETTE.docBlue);
  assert.equal(wb.strokeWidth, 3);
  assert.equal(wb.opacity, 1.0);
  assert.equal(wb.backgroundColor, WHITEBOARD_PALETTE.terminalDark);
  assert.deepEqual(wb.strokes, []);
  assert.equal(wb.canUndo(), false);
  assert.equal(wb.canRedo(), false);
  assert.equal(wb.maxHistory, 50);

  // Custom options constructor
  const customWb = new DocsPortalWhiteboardCanvas({
    tool: 'circle',
    color: WHITEBOARD_PALETTE.mintGreen,
    strokeWidth: 8,
    opacity: 0.75,
    maxHistory: 20
  });
  assert.equal(customWb.tool, 'circle');
  assert.equal(customWb.color, WHITEBOARD_PALETTE.mintGreen);
  assert.equal(customWb.strokeWidth, 8);
  assert.equal(customWb.opacity, 0.75);
  assert.equal(customWb.maxHistory, 20);
});

test('2. Tool mutations, alias normalization, and error handling for invalid tools', () => {
  const wb = new DocsPortalWhiteboardCanvas();

  // Valid standard tools
  for (const tool of VALID_TOOLS) {
    wb.setTool(tool);
    assert.equal(wb.tool, tool);
  }

  // Alias normalization
  assert.equal(wb.normalizeTool('brush'), 'pen');
  assert.equal(wb.normalizeTool('pencil'), 'pen');
  assert.equal(wb.normalizeTool('line'), 'connector');
  assert.equal(wb.normalizeTool('arrow'), 'connector');
  assert.equal(wb.normalizeTool('sticky'), 'note');
  assert.equal(wb.normalizeTool('text'), 'note');
  assert.equal(wb.normalizeTool('rect'), 'rectangle');
  assert.equal(wb.normalizeTool('box'), 'rectangle');
  assert.equal(wb.normalizeTool('ellipse'), 'circle');
  assert.equal(wb.normalizeTool('round'), 'circle');

  wb.setTool('brush');
  assert.equal(wb.tool, 'pen');

  wb.setTool('arrow');
  assert.equal(wb.tool, 'connector');

  wb.setTool('box');
  assert.equal(wb.tool, 'rectangle');

  wb.setTool('sticky');
  assert.equal(wb.tool, 'note');

  // Error handling for invalid tools
  assert.throws(() => wb.setTool('laser'), /Invalid tool/);
  assert.throws(() => wb.setTool(''), /non-empty string/);
  assert.throws(() => wb.setTool('   '), /non-empty string/);
  assert.throws(() => wb.setTool(null), /string/);
  assert.throws(() => wb.setTool(123), /string/);
  assert.throws(() => wb.normalizeTool('unknown-gadget'), /Invalid tool/);
});

test('3. Brush customization (color, strokeWidth, opacity) and numeric bounds clamping', () => {
  const wb = new DocsPortalWhiteboardCanvas();

  // Color mutation
  wb.setColor(WHITEBOARD_PALETTE.purpleSyntax);
  assert.equal(wb.color, WHITEBOARD_PALETTE.purpleSyntax);
  assert.throws(() => wb.setColor(''), /non-empty string/);
  assert.throws(() => wb.setColor(null), /string/);

  // StrokeWidth bounds clamping: range [1, 64]
  assert.equal(wb.clampStrokeWidth(12), 12);
  assert.equal(wb.clampStrokeWidth(0), 1);
  assert.equal(wb.clampStrokeWidth(-10), 1);
  assert.equal(wb.clampStrokeWidth(200), 64);
  assert.equal(wb.clampStrokeWidth('24'), 24);
  assert.equal(wb.clampStrokeWidth('invalid'), 3);

  wb.setStrokeWidth(500);
  assert.equal(wb.strokeWidth, 64);
  wb.setStrokeWidth(-5);
  assert.equal(wb.strokeWidth, 1);
  wb.setStrokeWidth(16);
  assert.equal(wb.strokeWidth, 16);

  // Opacity bounds clamping: range [0.05, 1.0]
  assert.equal(wb.clampOpacity(0.85), 0.85);
  assert.equal(wb.clampOpacity(0.01), 0.05);
  assert.equal(wb.clampOpacity(-0.5), 0.05);
  assert.equal(wb.clampOpacity(1.5), 1.0);
  assert.equal(wb.clampOpacity('0.4'), 0.4);
  assert.equal(wb.clampOpacity('abc'), 1.0);

  wb.setOpacity(2.5);
  assert.equal(wb.opacity, 1.0);
  wb.setOpacity(-0.2);
  assert.equal(wb.opacity, 0.05);
  wb.setOpacity(0.65);
  assert.equal(wb.opacity, 0.65);
});

test('4. Point distance interpolation generating intermediate points without gaps', () => {
  const wb = new DocsPortalWhiteboardCanvas();

  // Test straight horizontal segment interpolation
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 100, y: 0 };
  const interpolated = wb.interpolatePoints(p1, p2, 10);

  // 100px with 10px max spacing gives 11 points: 0, 10, 20, ..., 100
  assert.equal(interpolated.length, 11);
  assert.deepEqual(interpolated[0], { x: 0, y: 0 });
  assert.deepEqual(interpolated[10], { x: 100, y: 0 });

  // Verify no gaps exceed step distance
  for (let i = 0; i < interpolated.length - 1; i++) {
    const d = Math.hypot(
      interpolated[i + 1].x - interpolated[i].x,
      interpolated[i + 1].y - interpolated[i].y
    );
    assert.ok(d <= 10.01, `Gap between point ${i} and ${i + 1} exceeds max dist: ${d}`);
  }

  // With pressure
  const pPress1 = { x: 0, y: 0, pressure: 0.2 };
  const pPress2 = { x: 50, y: 50, pressure: 0.8 };
  const pressPoints = wb.interpolatePoints(pPress1, pPress2, 20);
  assert.ok(pressPoints.length >= 3);
  assert.equal(pressPoints[0].pressure, 0.2);
  assert.equal(pressPoints[pressPoints.length - 1].pressure, 0.8);

  // Edge cases: same point and small distance
  const samePt = wb.interpolatePoints({ x: 5, y: 5 }, { x: 5, y: 5 }, 10);
  assert.equal(samePt.length, 1);

  const shortDist = wb.interpolatePoints({ x: 0, y: 0 }, { x: 3, y: 4 }, 10);
  assert.equal(shortDist.length, 2);
});

test('5. Catmull-Rom smoothing and path generation', () => {
  const wb = new DocsPortalWhiteboardCanvas();

  // Few points
  assert.deepEqual(wb.catmullRomToBezier([]), []);
  assert.deepEqual(wb.catmullRomToBezier([{ x: 10, y: 10 }]), []);

  // 2 points form a linear Bezier segment
  const twoPoints = [{ x: 0, y: 0 }, { x: 30, y: 60 }];
  const seg2 = wb.catmullRomToBezier(twoPoints);
  assert.equal(seg2.length, 1);
  assert.deepEqual(seg2[0].end, { x: 30, y: 60 });
  assert.deepEqual(seg2[0].cp1, { x: 10, y: 20 });
  assert.deepEqual(seg2[0].cp2, { x: 20, y: 40 });

  // 4 points form 3 Bezier segments with Catmull-Rom tangents
  const points = [
    { x: 0, y: 0 },
    { x: 20, y: 40 },
    { x: 50, y: 80 },
    { x: 100, y: 120 }
  ];
  const beziers = wb.catmullRomToBezier(points);
  assert.equal(beziers.length, 3);

  // Each segment has valid control points and ends at next point
  for (let i = 0; i < beziers.length; i++) {
    assert.ok(beziers[i].cp1.x !== undefined && beziers[i].cp1.y !== undefined);
    assert.ok(beziers[i].cp2.x !== undefined && beziers[i].cp2.y !== undefined);
    assert.deepEqual(beziers[i].end, points[i + 1]);
  }

  // Test SVG path string generation
  const pathData = wb.generateBezierPath(points);
  assert.ok(pathData.startsWith('M 0 0'));
  assert.ok(pathData.includes('C'));
  // Contains 3 Bezier curves
  const cCount = (pathData.match(/ C /g) || []).length;
  assert.equal(cCount, 3);
});

test('6. Undo / Redo boundary limits and redo eviction on new stroke', () => {
  const wb = new DocsPortalWhiteboardCanvas({ maxHistory: 3 });

  // Initial state
  assert.equal(wb.canUndo(), false);
  assert.equal(wb.canRedo(), false);
  assert.equal(wb.undo(), false);
  assert.equal(wb.redo(), false);

  // Add 4 strokes (exceeding maxHistory of 3)
  wb.addStroke({ tool: 'pen', id: 's1', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] });
  wb.addStroke({ tool: 'rectangle', id: 's2', x: 20, y: 20, width: 50, height: 50 });
  wb.addStroke({ tool: 'circle', id: 's3', cx: 100, cy: 100, radius: 25 });
  wb.addStroke({ tool: 'note', id: 's4', x: 200, y: 200, text: 'Test' });

  assert.equal(wb.strokes.length, 4);
  assert.equal(wb.canUndo(), true);

  // Bounded capacity check: undo stack bounded to maxHistory = 3
  assert.equal(wb.historyLength, 3);

  // Undo 2 strokes
  wb.undo(); // removes s4
  assert.equal(wb.strokes.length, 3);
  assert.equal(wb.strokes[wb.strokes.length - 1].id, 's3');
  assert.equal(wb.canRedo(), true);

  wb.undo(); // removes s3
  assert.equal(wb.strokes.length, 2);
  assert.equal(wb.strokes[wb.strokes.length - 1].id, 's2');

  // Redo eviction on new stroke:
  // When a user adds a new stroke, any pending redo states must be cleared
  wb.addStroke({ tool: 'connector', id: 's5', from: { x: 0, y: 0 }, to: { x: 50, y: 50 } });
  assert.equal(wb.canRedo(), false);
  assert.equal(wb.redo(), false);
  assert.equal(wb.strokes.length, 3);
  assert.equal(wb.strokes[wb.strokes.length - 1].id, 's5');

  // Clear canvas saves state to undo
  wb.clear();
  assert.equal(wb.strokes.length, 0);
  assert.equal(wb.canUndo(), true);
  wb.undo();
  assert.equal(wb.strokes.length, 3);
});

test('7. Vector SVG export generation with valid XML elements', () => {
  const wb = new DocsPortalWhiteboardCanvas({ width: 1000, height: 700 });

  // Add various diagram elements: pen, rect, circle, note, connector
  wb.addStroke({
    tool: 'pen',
    points: [{ x: 10, y: 10 }, { x: 50, y: 80 }, { x: 120, y: 140 }],
    color: WHITEBOARD_PALETTE.docBlue,
    strokeWidth: 4
  });
  wb.addStroke({
    tool: 'rectangle',
    x: 150,
    y: 80,
    width: 200,
    height: 100,
    color: WHITEBOARD_PALETTE.mintGreen
  });
  wb.addStroke({
    tool: 'circle',
    cx: 450,
    cy: 200,
    radius: 40,
    color: WHITEBOARD_PALETTE.purpleSyntax
  });
  wb.addStroke({
    tool: 'connector',
    from: { x: 350, y: 130 },
    to: { x: 450, y: 160 },
    color: WHITEBOARD_PALETTE.docBlue
  });
  wb.addStroke({
    tool: 'note',
    x: 600,
    y: 100,
    width: 180,
    height: 80,
    color: WHITEBOARD_PALETTE.amberWarning,
    text: 'Architecture Note: Microservice V2'
  });

  const svg = wb.exportSVG();

  // Validate XML header and root SVG element
  assert.ok(svg.includes('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('viewBox="0 0 1000 700"'));
  assert.ok(svg.endsWith('</svg>'));

  // Validate XML elements generated for each tool
  assert.ok(svg.includes('<path d="M 10 10'), 'SVG should contain <path> for pen stroke');
  assert.ok(svg.includes('<rect x="150" y="80" width="200" height="100"'), 'SVG should contain <rect>');
  assert.ok(svg.includes('<circle cx="450" cy="200" r="40"'), 'SVG should contain <circle>');
  assert.ok(svg.includes('<polygon points='), 'SVG should contain <polygon> for connector arrow');
  assert.ok(svg.includes('<text x="610" y="130"'), 'SVG should contain <text> for sticky note');
  assert.ok(svg.includes('Architecture Note: Microservice V2'));
});

test('8. JSON export and import lifecycle', () => {
  const wb = new DocsPortalWhiteboardCanvas();

  wb.addStroke({
    tool: 'pen',
    id: 's_pen_1',
    points: [{ x: 5, y: 5 }, { x: 25, y: 35 }],
    color: WHITEBOARD_PALETTE.docBlue
  });
  wb.addStroke({
    tool: 'rectangle',
    id: 's_rect_1',
    x: 40,
    y: 40,
    width: 100,
    height: 60,
    color: WHITEBOARD_PALETTE.mintGreen
  });

  // Export JSON
  const jsonString = wb.exportJSON(true);
  assert.ok(typeof jsonString === 'string');

  const parsed = JSON.parse(jsonString);
  assert.equal(parsed.schema, 'docs-portal.whiteboard.v1');
  assert.equal(parsed.strokes.length, 2);
  assert.equal(parsed.strokes[0].id, 's_pen_1');
  assert.equal(parsed.strokes[1].id, 's_rect_1');

  // Load into fresh whiteboard instance
  const freshWb = new DocsPortalWhiteboardCanvas();
  freshWb.loadJSON(jsonString);

  assert.equal(freshWb.strokes.length, 2);
  assert.equal(freshWb.strokes[0].id, 's_pen_1');
  assert.equal(freshWb.strokes[1].id, 's_rect_1');
  assert.equal(freshWb.strokes[0].tool, 'pen');
  assert.equal(freshWb.strokes[1].tool, 'rectangle');

  // History stacks reset on load
  assert.equal(freshWb.canUndo(), false);
  assert.equal(freshWb.canRedo(), false);

  // Verify deep copy / immutability
  const originalStrokes = wb.strokes;
  originalStrokes[0].color = '#ffffff';
  assert.notEqual(wb.strokes[0].color, '#ffffff');

  // Test built-in templates
  const templateWb = new DocsPortalWhiteboardCanvas();
  assert.ok(templateWb.loadTemplate('api-flow'));
  assert.ok(templateWb.strokes.length >= 4);

  assert.ok(templateWb.loadTemplate('architecture'));
  assert.ok(templateWb.strokes.length >= 4);

  assert.ok(templateWb.loadTemplate('markdown-flow'));
  assert.ok(templateWb.strokes.length >= 4);

  assert.throws(() => templateWb.loadTemplate('unknown-template'), /Unknown template/);
});

test('9. Event emitter pattern (on, off, emit)', () => {
  const wb = new DocsPortalWhiteboardCanvas();
  const events = [];

  const changeHandler = (data) => events.push({ type: 'change', data });
  const toolHandler = (data) => events.push({ type: 'tool:change', data });

  wb.on('change', changeHandler);
  wb.on('tool:change', toolHandler);

  wb.setTool('circle');
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'tool:change');
  assert.equal(events[0].data.tool, 'circle');

  wb.addStroke({ tool: 'circle', cx: 50, cy: 50, radius: 20 });
  // 'change' and 'stroke:add' are emitted
  const changeEvents = events.filter(e => e.type === 'change');
  assert.ok(changeEvents.length >= 1);

  // Test unregistering listener with off()
  wb.off('tool:change', toolHandler);
  wb.setTool('rectangle');
  const toolChangeEventsAfter = events.filter(e => e.type === 'tool:change');
  assert.equal(toolChangeEventsAfter.length, 1); // No new tool:change event captured

  // Error handling for invalid event listener
  assert.throws(() => wb.on('', () => {}), /string/);
  assert.throws(() => wb.on('test', null), /function/);
});

test('10. Mock 2D context rendering execution without errors', () => {
  const wb = new DocsPortalWhiteboardCanvas();

  // Create a tracking mock 2D context
  const calls = [];
  const mockCtx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    closePath: () => calls.push('closePath'),
    moveTo: (x, y) => calls.push(`moveTo(${x},${y})`),
    lineTo: (x, y) => calls.push(`lineTo(${x},${y})`),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => calls.push(`bezierCurveTo(${x},${y})`),
    arc: (cx, cy, r) => calls.push(`arc(${cx},${cy},${r})`),
    rect: (x, y, w, h) => calls.push(`rect(${x},${y},${w},${h})`),
    fillRect: (x, y, w, h) => calls.push(`fillRect(${x},${y},${w},${h})`),
    strokeRect: (x, y, w, h) => calls.push(`strokeRect(${x},${y},${w},${h})`),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    fillText: (text, x, y) => calls.push(`fillText(${text},${x},${y})`),
    clearRect: (x, y, w, h) => calls.push(`clearRect(${x},${y},${w},${h})`),
    setLineDash: () => calls.push('setLineDash')
  };

  // 1. Render pen stroke
  wb.renderStroke({
    tool: 'pen',
    points: [{ x: 10, y: 10 }, { x: 30, y: 50 }, { x: 70, y: 90 }],
    color: '#3b82f6',
    strokeWidth: 3
  }, mockCtx);
  assert.ok(calls.includes('beginPath'));
  assert.ok(calls.includes('stroke'));

  // 2. Render rectangle stroke
  wb.renderStroke({
    tool: 'rectangle',
    x: 20,
    y: 20,
    width: 100,
    height: 80,
    color: '#10b981',
    fill: 'rgba(16, 185, 129, 0.2)'
  }, mockCtx);
  assert.ok(calls.some(c => c.startsWith('rect(20,20,100,80)')));

  // 3. Render circle stroke
  wb.renderStroke({
    tool: 'circle',
    cx: 200,
    cy: 200,
    radius: 50,
    color: '#a855f7'
  }, mockCtx);
  assert.ok(calls.some(c => c.startsWith('arc(200,200,50)')));

  // 4. Render connector stroke
  wb.renderStroke({
    tool: 'connector',
    from: { x: 10, y: 10 },
    to: { x: 100, y: 100 },
    color: '#3b82f6'
  }, mockCtx);
  assert.ok(calls.includes('lineTo(100,100)'));

  // 5. Render sticky note stroke
  wb.renderStroke({
    tool: 'note',
    x: 300,
    y: 150,
    width: 180,
    height: 90,
    color: '#f59e0b',
    text: 'Prisma Node'
  }, mockCtx);
  assert.ok(calls.some(c => c.startsWith('fillText(Prisma Node')));

  // 6. Full render() execution on whiteboard instance
  wb.loadTemplate('api-flow');
  assert.doesNotThrow(() => {
    wb.render(mockCtx);
  });
});
