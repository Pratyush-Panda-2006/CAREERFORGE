import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RealEstateLuxeWhiteboardCanvas,
  PALETTE,
  VALID_TOOLS,
  TOOL_ALIASES
} from './canvas-whiteboard.js';

// --- Test Suite 1: Initialization defaults and palette constants ---
test('1. Initialization defaults and palette constants', async (t) => {
  await t.test('PALETTE contains luxury architectural aesthetic colors and is frozen', () => {
    assert(Object.isFrozen(PALETTE), 'PALETTE must be frozen');
    assert.equal(PALETTE.champagneGold, '#d4af37');
    assert.equal(PALETTE.platinumSilver, '#e2e8f0');
    assert.equal(PALETTE.warmSand, '#e5c396');
    assert.equal(PALETTE.sapphireBlue, '#2563eb');
    assert.equal(PALETTE.emeraldEstate, '#10b981');
    assert.equal(PALETTE.roseLuxe, '#f43f5e');
    assert.equal(PALETTE.obsidianNavy, '#0d0f12');
  });

  await t.test('VALID_TOOLS is frozen and includes all 6 core tools', () => {
    assert(Object.isFrozen(VALID_TOOLS), 'VALID_TOOLS must be frozen');
    assert.deepEqual([...VALID_TOOLS], ['pen', 'eraser', 'dimension', 'pin', 'rectangle', 'circle']);
  });

  await t.test('Instance initializes with correct default properties', () => {
    const canvas = new RealEstateLuxeWhiteboardCanvas();
    assert.equal(canvas.getTool(), 'pen');
    assert.equal(canvas.getColor(), PALETTE.champagneGold);
    assert.equal(canvas.getStrokeWidth(), 3);
    assert.equal(canvas.getOpacity(), 1.0);
    assert.equal(canvas.getScale(), 0.05);
    assert.equal(canvas.maxHistory, 50);
    assert.equal(canvas.canUndo(), false);
    assert.equal(canvas.canRedo(), false);
    assert.equal(canvas.getStrokes().length, 0);
  });

  await t.test('Constructor options override defaults cleanly', () => {
    const canvas = new RealEstateLuxeWhiteboardCanvas(null, {
      tool: 'rectangle',
      color: PALETTE.sapphireBlue,
      strokeWidth: 8,
      opacity: 0.85,
      scale: 0.1,
      maxHistory: 25,
      backdrop: 'penthouse-blueprint'
    });
    assert.equal(canvas.getTool(), 'rectangle');
    assert.equal(canvas.getColor(), PALETTE.sapphireBlue);
    assert.equal(canvas.getStrokeWidth(), 8);
    assert.equal(canvas.getOpacity(), 0.85);
    assert.equal(canvas.getScale(), 0.1);
    assert.equal(canvas.maxHistory, 25);
    assert.equal(canvas.getBackdrop(), 'penthouse-blueprint');
  });
});

// --- Test Suite 2: Tool mutations, alias normalization, and error handling ---
test('2. Tool mutations, alias normalization, and error handling for invalid tools', async (t) => {
  const canvas = new RealEstateLuxeWhiteboardCanvas();

  await t.test('Direct valid tool assignments work', () => {
    for (const tool of VALID_TOOLS) {
      assert.equal(canvas.setTool(tool), tool);
      assert.equal(canvas.getTool(), tool);
    }
  });

  await t.test('Alias normalization handles aliases and case insensitivity', () => {
    assert.equal(canvas.setTool('pencil'), 'pen');
    assert.equal(canvas.setTool('brush'), 'pen');
    assert.equal(canvas.setTool('DRAW'), 'pen');
    assert.equal(canvas.setTool('  freehand  '), 'pen');
    assert.equal(canvas.setTool('rubber'), 'eraser');
    assert.equal(canvas.setTool('ruler'), 'dimension');
    assert.equal(canvas.setTool('measure'), 'dimension');
    assert.equal(canvas.setTool('dim'), 'dimension');
    assert.equal(canvas.setTool('marker'), 'pin');
    assert.equal(canvas.setTool('point'), 'pin');
    assert.equal(canvas.setTool('box'), 'rectangle');
    assert.equal(canvas.setTool('rect'), 'rectangle');
    assert.equal(canvas.setTool('square'), 'rectangle');
    assert.equal(canvas.setTool('oval'), 'circle');
    assert.equal(canvas.setTool('ellipse'), 'circle');
    assert.equal(canvas.setTool('circ'), 'circle');
  });

  await t.test('Invalid tool string throws RangeError', () => {
    assert.throws(() => canvas.setTool('laser-pointer'), {
      name: 'RangeError'
    });
    assert.throws(() => canvas.setTool('spray'), {
      name: 'RangeError'
    });
  });

  await t.test('Non-string tool input throws TypeError', () => {
    assert.throws(() => canvas.setTool(null), { name: 'TypeError' });
    assert.throws(() => canvas.setTool(123), { name: 'TypeError' });
    assert.throws(() => canvas.setTool({}), { name: 'TypeError' });
  });
});

// --- Test Suite 3: Brush customization and numeric bounds clamping ---
test('3. Brush customization (color, strokeWidth, opacity) and numeric bounds clamping', async (t) => {
  const canvas = new RealEstateLuxeWhiteboardCanvas();

  await t.test('Color customization accepts hex, rgb, and palette names', () => {
    assert.equal(canvas.setColor('#ff0055'), '#ff0055');
    assert.equal(canvas.setColor('rgb(10, 20, 30)'), 'rgb(10, 20, 30)');
    assert.equal(canvas.setColor('roseLuxe'), PALETTE.roseLuxe);
    assert.equal(canvas.setColor('emeraldEstate'), PALETTE.emeraldEstate);
  });

  await t.test('Invalid color throws TypeError', () => {
    assert.throws(() => canvas.setColor(''), { name: 'TypeError' });
    assert.throws(() => canvas.setColor(null), { name: 'TypeError' });
    assert.throws(() => canvas.setColor(12345), { name: 'TypeError' });
  });

  await t.test('Stroke width clamps within bounds [1, 60]', () => {
    assert.equal(canvas.setStrokeWidth(10), 10);
    assert.equal(canvas.setStrokeWidth(-5), 1, 'Negative width should clamp to 1');
    assert.equal(canvas.setStrokeWidth(0), 1, 'Zero width should clamp to 1');
    assert.equal(canvas.setStrokeWidth(120), 60, 'Width > 60 should clamp to 60');
  });

  await t.test('Non-finite stroke width throws TypeError', () => {
    assert.throws(() => canvas.setStrokeWidth(NaN), { name: 'TypeError' });
    assert.throws(() => canvas.setStrokeWidth(Infinity), { name: 'TypeError' });
    assert.throws(() => canvas.setStrokeWidth('5'), { name: 'TypeError' });
  });

  await t.test('Opacity clamps within bounds [0.0, 1.0]', () => {
    assert.equal(canvas.setOpacity(0.75), 0.75);
    assert.equal(canvas.setOpacity(-0.5), 0.0, 'Negative opacity should clamp to 0.0');
    assert.equal(canvas.setOpacity(1.5), 1.0, 'Opacity > 1.0 should clamp to 1.0');
  });

  await t.test('Non-finite opacity throws TypeError', () => {
    assert.throws(() => canvas.setOpacity(NaN), { name: 'TypeError' });
    assert.throws(() => canvas.setOpacity(Infinity), { name: 'TypeError' });
    assert.throws(() => canvas.setOpacity(null), { name: 'TypeError' });
  });

  await t.test('Scale sets positive finite values or throws RangeError', () => {
    assert.equal(canvas.setScale(0.02), 0.02);
    assert.throws(() => canvas.setScale(0), { name: 'RangeError' });
    assert.throws(() => canvas.setScale(-1), { name: 'RangeError' });
    assert.throws(() => canvas.setScale(NaN), { name: 'RangeError' });
  });
});

// --- Test Suite 4: Point distance interpolation ---
test('4. Point distance interpolation generating intermediate points without gaps', async (t) => {
  const canvas = new RealEstateLuxeWhiteboardCanvas();

  await t.test('Generates intermediate points when distance exceeds dist step', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 100, y: 0 };
    const maxDist = 10;
    const points = canvas.interpolatePoints(p1, p2, maxDist);

    assert(points.length >= 11, 'Should generate at least 11 points for 100px segment with step 10');
    assert.equal(points[0].x, 0);
    assert.equal(points[0].y, 0);
    assert.equal(points[points.length - 1].x, 100);
    assert.equal(points[points.length - 1].y, 0);

    // Verify distance between every pair of consecutive points is <= maxDist
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      assert(d <= maxDist + 1e-9, `Point gap at index ${i} (${d}) exceeds maxDist (${maxDist})`);
    }
  });

  await t.test('Returns start and end points directly when distance is within dist step', () => {
    const p1 = { x: 5, y: 5 };
    const p2 = { x: 8, y: 9 }; // distance is 5
    const points = canvas.interpolatePoints(p1, p2, 10);
    assert.equal(points.length, 2);
    assert.deepEqual(points[0], p1);
    assert.deepEqual(points[1], p2);
  });

  await t.test('Returns single point if start and end are identical', () => {
    const p = { x: 42, y: 42 };
    const points = canvas.interpolatePoints(p, p, 5);
    assert.equal(points.length, 1);
    assert.deepEqual(points[0], p);
  });

  await t.test('Rejects invalid point coordinates with TypeError', () => {
    assert.throws(() => canvas.interpolatePoints(null, { x: 1, y: 1 }), { name: 'TypeError' });
    assert.throws(() => canvas.interpolatePoints({ x: 1 }, { x: 1, y: 1 }), { name: 'TypeError' });
    assert.throws(() => canvas.interpolatePoints({ x: NaN, y: 0 }, { x: 1, y: 1 }), { name: 'TypeError' });
  });
});

// --- Test Suite 5: Catmull-Rom smoothing and path generation ---
test('5. Catmull-Rom smoothing and path generation', async (t) => {
  const canvas = new RealEstateLuxeWhiteboardCanvas();

  await t.test('catmullRomToBezier returns empty array for < 2 points', () => {
    assert.deepEqual(canvas.catmullRomToBezier([]), []);
    assert.deepEqual(canvas.catmullRomToBezier([{ x: 10, y: 10 }]), []);
  });

  await t.test('catmullRomToBezier returns 1 segment for 2 points', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 30, y: 0 };
    const curves = canvas.catmullRomToBezier([p0, p1]);
    assert.equal(curves.length, 1);
    assert.deepEqual(curves[0].start, p0);
    assert.deepEqual(curves[0].end, p1);
    assert.equal(curves[0].cp1.x, 10);
    assert.equal(curves[0].cp2.x, 20);
  });

  await t.test('catmullRomToBezier generates n-1 continuous curves for n points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 20 },
      { x: 100, y: 0 },
      { x: 150, y: 50 }
    ];
    const curves = canvas.catmullRomToBezier(points);
    assert.equal(curves.length, 3);

    // Verify curve continuity: curve[i].end matches curve[i+1].start
    for (let i = 0; i < curves.length - 1; i++) {
      assert.deepEqual(curves[i].end, curves[i + 1].start);
    }
  });

  await t.test('catmullRomToPathData produces valid SVG path string', () => {
    assert.equal(canvas.catmullRomToPathData([]), '');
    const single = canvas.catmullRomToPathData([{ x: 10, y: 20 }]);
    assert.equal(single, 'M 10.00 20.00 L 10.00 20.00');

    const multi = canvas.catmullRomToPathData([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 0 }
    ]);
    assert(multi.startsWith('M 0.00 0.00 C '));
    assert(multi.includes('50.00 50.00'));
    assert(multi.endsWith('100.00 0.00'));
  });
});

// --- Test Suite 6: Undo / Redo boundary limits and redo eviction on new stroke ---
test('6. Undo / Redo boundary limits and redo eviction on new stroke', async (t) => {
  await t.test('Undo and redo manage stroke history accurately', () => {
    const canvas = new RealEstateLuxeWhiteboardCanvas();

    const s1 = canvas.addStroke({
      tool: 'pen',
      color: PALETTE.champagneGold,
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }]
    });
    const s2 = canvas.addStroke({
      tool: 'rectangle',
      color: PALETTE.platinumSilver,
      points: [{ x: 0, y: 0 }, { x: 50, y: 50 }]
    });

    assert.equal(canvas.getStrokes().length, 2);
    assert.equal(canvas.canUndo(), true);
    assert.equal(canvas.canRedo(), false);

    // Undo s2
    const undone = canvas.undo();
    assert.equal(undone.tool, 'rectangle');
    assert.equal(canvas.getStrokes().length, 1);
    assert.equal(canvas.canUndo(), true);
    assert.equal(canvas.canRedo(), true);

    // Redo s2
    const redone = canvas.redo();
    assert.equal(redone.tool, 'rectangle');
    assert.equal(canvas.getStrokes().length, 2);
    assert.equal(canvas.canRedo(), false);
  });

  await t.test('Boundary limits: undo on empty and redo on empty return null safely', () => {
    const canvas = new RealEstateLuxeWhiteboardCanvas();
    assert.equal(canvas.undo(), null);
    assert.equal(canvas.redo(), null);
  });

  await t.test('Redo eviction: adding a new stroke after undo discards future redo history', () => {
    const canvas = new RealEstateLuxeWhiteboardCanvas();
    canvas.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }] });
    canvas.addStroke({ tool: 'pen', points: [{ x: 2, y: 2 }] });

    canvas.undo(); // now 1 stroke in undo, 1 in redo
    assert.equal(canvas.canRedo(), true);

    // Draw brand new stroke
    canvas.addStroke({ tool: 'circle', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] });

    assert.equal(canvas.canRedo(), false, 'Redo stack must be evicted after new stroke');
    assert.equal(canvas.redo(), null);
    assert.equal(canvas.getStrokes().length, 2);
    assert.equal(canvas.getStrokes()[1].tool, 'circle');
  });

  await t.test('Bounded capacity eviction: shifts oldest strokes when exceeding maxHistory', () => {
    const canvas = new RealEstateLuxeWhiteboardCanvas(null, { maxHistory: 3 });
    canvas.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }], label: 'first' });
    canvas.addStroke({ tool: 'pen', points: [{ x: 2, y: 2 }], label: 'second' });
    canvas.addStroke({ tool: 'pen', points: [{ x: 3, y: 3 }], label: 'third' });
    canvas.addStroke({ tool: 'pen', points: [{ x: 4, y: 4 }], label: 'fourth' });

    assert.equal(canvas.getStrokes().length, 3);
    assert.equal(canvas.getStrokes()[0].label, 'second', 'First stroke should have been evicted');
    assert.equal(canvas.getStrokes()[2].label, 'fourth');
  });

  await t.test('Clear resets undo and redo stacks', () => {
    const canvas = new RealEstateLuxeWhiteboardCanvas();
    canvas.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }] });
    canvas.clear();
    assert.equal(canvas.getStrokes().length, 0);
    assert.equal(canvas.canUndo(), false);
    assert.equal(canvas.canRedo(), false);
  });
});

// --- Test Suite 7: Vector SVG export generation with valid XML elements ---
test('7. Vector SVG export generation with valid XML elements', async (t) => {
  const canvas = new RealEstateLuxeWhiteboardCanvas(null, { width: 1000, height: 600 });

  // Add one stroke of each tool type
  canvas.addStroke({
    tool: 'pen',
    color: PALETTE.champagneGold,
    strokeWidth: 4,
    opacity: 0.9,
    points: [{ x: 10, y: 10 }, { x: 50, y: 40 }, { x: 90, y: 20 }]
  });

  canvas.addStroke({
    tool: 'eraser',
    strokeWidth: 10,
    points: [{ x: 20, y: 20 }, { x: 30, y: 30 }]
  });

  canvas.addStroke({
    tool: 'rectangle',
    color: PALETTE.emeraldEstate,
    strokeWidth: 2,
    points: [{ x: 100, y: 100 }, { x: 250, y: 200 }]
  });

  canvas.addStroke({
    tool: 'circle',
    color: PALETTE.sapphireBlue,
    strokeWidth: 3,
    points: [{ x: 300, y: 300 }, { x: 350, y: 300 }]
  });

  canvas.addStroke({
    tool: 'dimension',
    color: PALETTE.platinumSilver,
    strokeWidth: 2,
    scale: 0.05,
    points: [{ x: 400, y: 100 }, { x: 500, y: 100 }],
    label: '5.00m & VIP'
  });

  canvas.addStroke({
    tool: 'pin',
    color: PALETTE.roseLuxe,
    points: [{ x: 600, y: 150 }],
    label: 'Pin #1 <Penthouse>'
  });

  const svg = canvas.exportSVG();

  await t.test('SVG has valid wrapper and XML namespace attributes', () => {
    assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), 'Must start with <svg and xmlns');
    assert(svg.endsWith('</svg>'), 'Must end with </svg>');
    assert(svg.includes('viewBox="0 0 1000 600"'));
    assert(svg.includes('width="1000"'));
    assert(svg.includes('height="600"'));
  });

  await t.test('SVG contains all required element types', () => {
    assert(svg.includes('<path '), 'Must contain <path> elements');
    assert(svg.includes('<rect '), 'Must contain <rect> elements');
    assert(svg.includes('<circle '), 'Must contain <circle> elements');
    assert(svg.includes('<line '), 'Must contain <line> elements');
    assert(svg.includes('<text '), 'Must contain <text> elements');
  });

  await t.test('XML special characters are escaped safely in SVG text', () => {
    assert(svg.includes('5.00m &amp; VIP'), 'Ampersand must be escaped');
    assert(svg.includes('Pin #1 &lt;Penthouse&gt;'), 'Angle brackets must be escaped');
    assert(!svg.includes('Pin #1 <Penthouse>'), 'Raw unescaped angle brackets must not exist in text');
  });
});

// --- Test Suite 8: JSON export and import lifecycle ---
test('8. JSON export and import lifecycle', async (t) => {
  const canvas1 = new RealEstateLuxeWhiteboardCanvas(null, {
    scale: 0.08,
    backdrop: 'penthouse-blueprint'
  });

  canvas1.addStroke({
    tool: 'pen',
    color: PALETTE.roseLuxe,
    strokeWidth: 5,
    opacity: 0.8,
    points: [{ x: 15.2, y: 22.4 }, { x: 80.9, y: 95.1 }]
  });
  canvas1.addStroke({
    tool: 'dimension',
    color: PALETTE.champagneGold,
    strokeWidth: 2,
    points: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
    label: '8.00m'
  });

  await t.test('exportJSON produces valid JSON string with schema metadata', () => {
    const jsonStr = canvas1.exportJSON();
    assert.equal(typeof jsonStr, 'string');
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.version, '1.0.0');
    assert.equal(parsed.generator, 'RealEstateLuxeWhiteboardCanvas');
    assert.equal(parsed.scale, 0.08);
    assert.equal(parsed.backdrop, 'penthouse-blueprint');
    assert.equal(parsed.strokes.length, 2);
  });

  await t.test('loadJSON roundtrip restores strokes and canvas metadata identically', () => {
    const jsonStr = canvas1.exportJSON();
    const canvas2 = new RealEstateLuxeWhiteboardCanvas();
    canvas2.loadJSON(jsonStr);

    assert.equal(canvas2.getStrokes().length, 2);
    assert.equal(canvas2.getScale(), 0.08);
    assert.equal(canvas2.getBackdrop(), 'penthouse-blueprint');
    assert.equal(canvas2.getStrokes()[0].tool, 'pen');
    assert.equal(canvas2.getStrokes()[0].color, PALETTE.roseLuxe);
    assert.equal(canvas2.getStrokes()[1].tool, 'dimension');
    assert.equal(canvas2.getStrokes()[1].label, '8.00m');
    assert.equal(canvas2.canRedo(), false, 'Redo stack should be clean after load');
  });

  await t.test('loadJSON throws error on malformed JSON or invalid schema', () => {
    const canvas = new RealEstateLuxeWhiteboardCanvas();
    assert.throws(() => canvas.loadJSON('{ broken json '), { name: 'Error' });
    assert.throws(() => canvas.loadJSON({ notWhiteboard: true }), { name: 'Error' });
    assert.throws(() => canvas.loadJSON({ strokes: [{ tool: 'invalid-tool', points: [{ x: 1, y: 1 }] }] }), { name: 'RangeError' });
    assert.throws(() => canvas.loadJSON({ strokes: [{ tool: 'pen', points: [] }] }), { name: 'Error' });
  });
});

// --- Test Suite 9: Event emitter pattern (on, off, emit) ---
test('9. Event emitter pattern (on, off, emit)', async (t) => {
  const canvas = new RealEstateLuxeWhiteboardCanvas();

  await t.test('on registers listener and emit passes arguments correctly', () => {
    let callCount = 0;
    let receivedPayload = null;

    canvas.on('custom:event', (data) => {
      callCount++;
      receivedPayload = data;
    });

    const emitted = canvas.emit('custom:event', { testId: 42 });
    assert.equal(emitted, true);
    assert.equal(callCount, 1);
    assert.equal(receivedPayload.testId, 42);
  });

  await t.test('Unsubscribe function returned by on() deregisters listener', () => {
    let count = 0;
    const unsub = canvas.on('unsub:test', () => count++);
    canvas.emit('unsub:test');
    assert.equal(count, 1);

    unsub();
    canvas.emit('unsub:test');
    assert.equal(count, 1, 'Listener should not fire after unsubscribe');
  });

  await t.test('off() removes listener by function reference or clears event', () => {
    let countA = 0;
    let countB = 0;
    const handlerA = () => countA++;
    const handlerB = () => countB++;

    canvas.on('multi:event', handlerA);
    canvas.on('multi:event', handlerB);

    canvas.off('multi:event', handlerA);
    canvas.emit('multi:event');
    assert.equal(countA, 0);
    assert.equal(countB, 1);

    canvas.off('multi:event');
    canvas.emit('multi:event');
    assert.equal(countB, 1, 'All handlers for event should be cleared');
  });

  await t.test('Lifecycle events fire during canvas operations', () => {
    const events = [];
    canvas.on('stroke:add', (s) => events.push(`add:${s.tool}`));
    canvas.on('undo', (s) => events.push(`undo:${s.tool}`));
    canvas.on('redo', (s) => events.push(`redo:${s.tool}`));
    canvas.on('tool:change', (e) => events.push(`tool:${e.tool}`));
    canvas.on('color:change', (e) => events.push(`color:${e.color}`));
    canvas.on('clear', () => events.push('clear'));

    canvas.setTool('circle');
    canvas.setColor('sapphireBlue');
    canvas.addStroke({ tool: 'circle', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] });
    canvas.undo();
    canvas.redo();
    canvas.clear();

    assert(events.includes('tool:circle'));
    assert(events.includes(`color:${PALETTE.sapphireBlue}`));
    assert(events.includes('add:circle'));
    assert(events.includes('undo:circle'));
    assert(events.includes('redo:circle'));
    assert(events.includes('clear'));
  });
});

// --- Test Suite 10: Mock 2D context rendering execution without errors ---
test('10. Mock 2D context rendering execution without errors', async (t) => {
  const canvas = new RealEstateLuxeWhiteboardCanvas();

  // Create a spy mock 2D context
  const mockCalls = [];
  const mockCtx = {
    save: () => mockCalls.push('save'),
    restore: () => mockCalls.push('restore'),
    beginPath: () => mockCalls.push('beginPath'),
    closePath: () => mockCalls.push('closePath'),
    moveTo: (x, y) => mockCalls.push(`moveTo(${x},${y})`),
    lineTo: (x, y) => mockCalls.push(`lineTo(${x},${y})`),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => mockCalls.push('bezierCurveTo'),
    arc: (x, y, r) => mockCalls.push(`arc(${x},${y},${r})`),
    rect: (x, y, w, h) => mockCalls.push(`rect(${x},${y},${w},${h})`),
    strokeRect: (x, y, w, h) => mockCalls.push(`strokeRect(${x},${y},${w},${h})`),
    fillRect: (x, y, w, h) => mockCalls.push(`fillRect(${x},${y},${w},${h})`),
    stroke: () => mockCalls.push('stroke'),
    fill: () => mockCalls.push('fill'),
    fillText: (text, x, y) => mockCalls.push(`fillText(${text},${x},${y})`),
    set strokeStyle(v) {},
    set fillStyle(v) {},
    set lineWidth(v) {},
    set globalAlpha(v) {},
    set lineCap(v) {},
    set lineJoin(v) {},
    set font(v) {},
    set textAlign(v) {},
    set textBaseline(v) {},
    set globalCompositeOperation(v) {}
  };

  await t.test('Renders pen stroke using smooth bezier curves', () => {
    mockCalls.length = 0;
    const stroke = {
      tool: 'pen',
      color: PALETTE.champagneGold,
      strokeWidth: 3,
      opacity: 1,
      points: [{ x: 10, y: 10 }, { x: 30, y: 30 }, { x: 50, y: 10 }]
    };
    canvas.renderStroke(stroke, mockCtx);
    assert(mockCalls.includes('save'));
    assert(mockCalls.includes('beginPath'));
    assert(mockCalls.includes('bezierCurveTo'));
    assert(mockCalls.includes('stroke'));
    assert(mockCalls.includes('restore'));
  });

  await t.test('Renders eraser stroke without errors', () => {
    mockCalls.length = 0;
    const stroke = {
      tool: 'eraser',
      strokeWidth: 8,
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }]
    };
    canvas.renderStroke(stroke, mockCtx);
    assert(mockCalls.includes('save'));
    assert(mockCalls.includes('stroke'));
    assert(mockCalls.includes('restore'));
  });

  await t.test('Renders rectangle stroke with rect geometry', () => {
    mockCalls.length = 0;
    const stroke = {
      tool: 'rectangle',
      color: PALETTE.emeraldEstate,
      strokeWidth: 2,
      points: [{ x: 0, y: 0 }, { x: 100, y: 80 }]
    };
    canvas.renderStroke(stroke, mockCtx);
    assert(mockCalls.includes('save'));
    assert(mockCalls.some(c => c.startsWith('rect(0,0,100,80)')));
    assert(mockCalls.includes('restore'));
  });

  await t.test('Renders circle stroke with arc', () => {
    mockCalls.length = 0;
    const stroke = {
      tool: 'circle',
      color: PALETTE.sapphireBlue,
      strokeWidth: 2,
      points: [{ x: 50, y: 50 }, { x: 80, y: 50 }]
    };
    canvas.renderStroke(stroke, mockCtx);
    assert(mockCalls.includes('save'));
    assert(mockCalls.some(c => c.startsWith('arc(50,50,30)')));
    assert(mockCalls.includes('restore'));
  });

  await t.test('Renders dimension line with ticks and text measurement', () => {
    mockCalls.length = 0;
    const stroke = {
      tool: 'dimension',
      color: PALETTE.warmSand,
      strokeWidth: 2,
      scale: 0.05,
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }]
    };
    canvas.renderStroke(stroke, mockCtx);
    assert(mockCalls.includes('save'));
    assert(mockCalls.includes('stroke'));
    assert(mockCalls.some(c => c.startsWith('fillText(5.00m')));
    assert(mockCalls.includes('restore'));
  });

  await t.test('Renders luxury inspection pin with center label', () => {
    mockCalls.length = 0;
    const stroke = {
      tool: 'pin',
      color: PALETTE.roseLuxe,
      points: [{ x: 150, y: 200 }],
      label: '42'
    };
    canvas.renderStroke(stroke, mockCtx);
    assert(mockCalls.includes('save'));
    assert(mockCalls.includes('fill'));
    assert(mockCalls.includes('stroke'));
    assert(mockCalls.some(c => c.startsWith('fillText(42,150,200)')));
    assert(mockCalls.includes('restore'));
  });

  await t.test('Full canvas render() executes backdrop and all queued strokes cleanly', () => {
    mockCalls.length = 0;
    canvas.clear();
    canvas.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] });
    canvas.addStroke({ tool: 'circle', points: [{ x: 10, y: 10 }, { x: 20, y: 10 }] });
    canvas.render(mockCtx);
    assert(mockCalls.length > 10, 'renderAll should execute series of canvas drawing calls');
  });
});
