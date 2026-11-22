import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeveloperPortfolioWhiteboardCanvas,
  THEME_PALETTE,
  SUPPORTED_TOOLS,
  TOOL_ALIASES
} from './canvas-whiteboard.js';

/**
 * Creates a mock 2D context tracking all canvas operation invocations
 */
function createMockContext() {
  const operations = [];
  const ctx = {
    operations,
    save: () => operations.push({ method: 'save' }),
    restore: () => operations.push({ method: 'restore' }),
    beginPath: () => operations.push({ method: 'beginPath' }),
    closePath: () => operations.push({ method: 'closePath' }),
    moveTo: (x, y) => operations.push({ method: 'moveTo', x, y }),
    lineTo: (x, y) => operations.push({ method: 'lineTo', x, y }),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) =>
      operations.push({ method: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y }),
    stroke: () => operations.push({ method: 'stroke' }),
    fill: () => operations.push({ method: 'fill' }),
    strokeRect: (x, y, w, h) => operations.push({ method: 'strokeRect', x, y, w, h }),
    fillRect: (x, y, w, h) => operations.push({ method: 'fillRect', x, y, w, h }),
    clearRect: (x, y, w, h) => operations.push({ method: 'clearRect', x, y, w, h }),
    arc: (x, y, r, sa, ea) => operations.push({ method: 'arc', x, y, r, sa, ea }),
    fillText: (text, x, y) => operations.push({ method: 'fillText', text, x, y }),
    roundRect: (x, y, w, h, r) => operations.push({ method: 'roundRect', x, y, w, h, r }),
    setTransform: (a, b, c, d, e, f) => operations.push({ method: 'setTransform', a, b, c, d, e, f }),
    set strokeStyle(val) { operations.push({ prop: 'strokeStyle', value: val }); },
    set fillStyle(val) { operations.push({ prop: 'fillStyle', value: val }); },
    set lineWidth(val) { operations.push({ prop: 'lineWidth', value: val }); },
    set globalAlpha(val) { operations.push({ prop: 'globalAlpha', value: val }); },
    set lineCap(val) { operations.push({ prop: 'lineCap', value: val }); },
    set lineJoin(val) { operations.push({ prop: 'lineJoin', value: val }); },
    set font(val) { operations.push({ prop: 'font', value: val }); },
    set textAlign(val) { operations.push({ prop: 'textAlign', value: val }); },
    set textBaseline(val) { operations.push({ prop: 'textBaseline', value: val }); }
  };
  return ctx;
}

/**
 * Creates a mock canvas element capable of accepting pointer events
 */
function createMockCanvas(width = 1200, height = 800) {
  const ctx = createMockContext();
  const listeners = new Map();
  return {
    width,
    height,
    style: {},
    getContext: (type) => (type === '2d' ? ctx : null),
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener: (type, fn) => {
      if (!listeners.has(type)) return;
      const list = listeners.get(type).filter(h => h !== fn);
      listeners.set(type, list);
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    _ctx: ctx,
    _listeners: listeners
  };
}

describe('DeveloperPortfolioWhiteboardCanvas', () => {
  let whiteboard;

  beforeEach(() => {
    whiteboard = new DeveloperPortfolioWhiteboardCanvas({ width: 1200, height: 800 });
  });

  // 1. Initialization defaults and palette constants
  describe('1. Initialization defaults and palette constants', () => {
    it('exports all developer IDE dark syntax palette colors correctly', () => {
      assert.equal(THEME_PALETTE.ideBackground, '#0d1117');
      assert.equal(THEME_PALETTE.reactCyan, '#38bdf8');
      assert.equal(THEME_PALETTE.nodeGreen, '#22c55e');
      assert.equal(THEME_PALETTE.rustOrange, '#ea580c');
      assert.equal(THEME_PALETTE.typeScriptBlue, '#2563eb');
      assert.equal(THEME_PALETTE.syntaxPink, '#f43f5e');
      assert.equal(THEME_PALETTE.pureWhite, '#ffffff');

      assert.deepEqual(DeveloperPortfolioWhiteboardCanvas.PALETTE, THEME_PALETTE);
    });

    it('initializes with standard defaults when no canvas is supplied', () => {
      assert.equal(whiteboard.width, 1200);
      assert.equal(whiteboard.height, 800);
      assert.equal(whiteboard.tool, 'pen');
      assert.equal(whiteboard.color, THEME_PALETTE.reactCyan);
      assert.equal(whiteboard.strokeWidth, 3);
      assert.equal(whiteboard.opacity, 1.0);
      assert.equal(whiteboard.canUndo, false);
      assert.equal(whiteboard.canRedo, false);
      assert.equal(whiteboard.strokes.length, 0);
      assert.equal(whiteboard.maxHistory, 50);
    });

    it('accepts custom configuration options in constructor', () => {
      const custom = new DeveloperPortfolioWhiteboardCanvas({
        width: 1600,
        height: 900,
        tool: 'rectangle',
        color: THEME_PALETTE.nodeGreen,
        strokeWidth: 8,
        opacity: 0.65,
        maxHistory: 25
      });
      assert.equal(custom.width, 1600);
      assert.equal(custom.height, 900);
      assert.equal(custom.tool, 'rectangle');
      assert.equal(custom.color, THEME_PALETTE.nodeGreen);
      assert.equal(custom.strokeWidth, 8);
      assert.equal(custom.opacity, 0.65);
      assert.equal(custom.maxHistory, 25);
    });
  });

  // 2. Tool mutations, alias normalization, and error handling for invalid tools
  describe('2. Tool mutations, alias normalization, and error handling', () => {
    it('sets all officially supported tools directly', () => {
      for (const tool of SUPPORTED_TOOLS) {
        whiteboard.setTool(tool);
        assert.equal(whiteboard.tool, tool);
      }
    });

    it('normalizes common aliases, trims whitespace, and ignores casing', () => {
      whiteboard.setTool('  BRUSH ');
      assert.equal(whiteboard.tool, 'pen');

      whiteboard.setTool('draw');
      assert.equal(whiteboard.tool, 'pen');

      whiteboard.setTool('ERASE');
      assert.equal(whiteboard.tool, 'eraser');

      whiteboard.setTool('pointer');
      assert.equal(whiteboard.tool, 'arrow');

      whiteboard.setTool('node');
      assert.equal(whiteboard.tool, 'component');

      whiteboard.setTool('service');
      assert.equal(whiteboard.tool, 'component');

      whiteboard.setTool('rect');
      assert.equal(whiteboard.tool, 'rectangle');

      whiteboard.setTool('oval');
      assert.equal(whiteboard.tool, 'circle');
    });

    it('throws TypeError with descriptive message on invalid or empty tool names', () => {
      assert.throws(() => whiteboard.setTool('laser'), /Invalid tool: "laser"/);
      assert.throws(() => whiteboard.setTool(''), /non-empty string/);
      assert.throws(() => whiteboard.setTool(null), /non-empty string/);
      assert.throws(() => whiteboard.setTool(123), /non-empty string/);
    });
  });

  // 3. Brush customization and numeric bounds clamping
  describe('3. Brush customization and numeric bounds clamping', () => {
    it('updates color with valid hex code or named palette identifier', () => {
      whiteboard.setColor('#f43f5e');
      assert.equal(whiteboard.color, '#f43f5e');

      whiteboard.setColor('nodeGreen');
      assert.equal(whiteboard.color, THEME_PALETTE.nodeGreen);

      whiteboard.setColor('rustOrange');
      assert.equal(whiteboard.color, THEME_PALETTE.rustOrange);

      assert.throws(() => whiteboard.setColor(''), /non-empty string/);
      assert.throws(() => whiteboard.setColor(null), /non-empty string/);
    });

    it('clamps stroke width between 1 and 50', () => {
      whiteboard.setStrokeWidth(12);
      assert.equal(whiteboard.strokeWidth, 12);

      whiteboard.setStrokeWidth(-10);
      assert.equal(whiteboard.strokeWidth, 1);

      whiteboard.setStrokeWidth(0);
      assert.equal(whiteboard.strokeWidth, 1);

      whiteboard.setStrokeWidth(999);
      assert.equal(whiteboard.strokeWidth, 50);

      assert.throws(() => whiteboard.setStrokeWidth('not-a-number'), /valid number/);
    });

    it('clamps opacity between 0.0 and 1.0', () => {
      whiteboard.setOpacity(0.42);
      assert.equal(whiteboard.opacity, 0.42);

      whiteboard.setOpacity(-0.5);
      assert.equal(whiteboard.opacity, 0.0);

      whiteboard.setOpacity(1.8);
      assert.equal(whiteboard.opacity, 1.0);

      assert.throws(() => whiteboard.setOpacity(NaN), /valid number/);
    });
  });

  // 4. Point distance interpolation generating intermediate points without gaps
  describe('4. Point distance interpolation without gaps', () => {
    it('generates intermediate points so adjacent distance is <= dist', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 100, y: 0 };
      const dist = 10;
      const points = whiteboard.interpolatePoints(p1, p2, dist);

      assert.equal(points.length, 11);
      assert.deepEqual(points[0], { x: 0, y: 0 });
      assert.deepEqual(points[points.length - 1], { x: 100, y: 0 });

      for (let i = 0; i < points.length - 1; i++) {
        const stepDist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
        assert.ok(stepDist <= dist + 0.01, `Step ${i} to ${i + 1} exceeds max dist: ${stepDist}`);
      }
    });

    it('handles identical points without duplicating steps', () => {
      const p = { x: 42, y: 84 };
      const points = whiteboard.interpolatePoints(p, p, 5);
      assert.equal(points.length, 1);
      assert.deepEqual(points[0], p);
    });

    it('handles diagonal vector moves properly', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 30, y: 40 }; // Distance = 50
      const dist = 15;
      const points = whiteboard.interpolatePoints(p1, p2, dist);

      assert.equal(points.length, 5); // 50 / 15 ceil = 4 steps -> 5 points
      assert.deepEqual(points[0], { x: 0, y: 0 });
      assert.deepEqual(points[points.length - 1], { x: 30, y: 40 });

      for (let i = 0; i < points.length - 1; i++) {
        const stepDist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
        assert.ok(stepDist <= dist + 0.01);
      }
    });

    it('validates coordinates and throws TypeError if non-numeric', () => {
      assert.throws(() => whiteboard.interpolatePoints(null, { x: 0, y: 0 }), /numeric/);
      assert.throws(() => whiteboard.interpolatePoints({ x: 'a', y: 0 }, { x: 1, y: 1 }), /numeric/);
    });
  });

  // 5. Catmull-Rom smoothing and path generation
  describe('5. Catmull-Rom smoothing and path generation', () => {
    it('returns empty bezier segments for less than 2 points', () => {
      assert.deepEqual(whiteboard.catmullRomToBezier([]), []);
      assert.deepEqual(whiteboard.catmullRomToBezier([{ x: 10, y: 10 }]), []);
    });

    it('produces a single linear bezier segment for 2 points', () => {
      const segments = whiteboard.catmullRomToBezier([
        { x: 0, y: 0 },
        { x: 30, y: 30 }
      ]);
      assert.equal(segments.length, 1);
      assert.deepEqual(segments[0].start, { x: 0, y: 0 });
      assert.deepEqual(segments[0].end, { x: 30, y: 30 });
      assert.equal(typeof segments[0].cp1.x, 'number');
      assert.equal(typeof segments[0].cp2.x, 'number');
    });

    it('produces smooth cubic Bezier segments for multiple points', () => {
      const points = [
        { x: 10, y: 10 },
        { x: 50, y: 80 },
        { x: 90, y: 20 },
        { x: 130, y: 100 }
      ];
      const segments = whiteboard.catmullRomToBezier(points);
      assert.equal(segments.length, 3);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        assert.deepEqual(seg.start, points[i]);
        assert.deepEqual(seg.end, points[i + 1]);
        assert.ok(Number.isFinite(seg.cp1.x) && Number.isFinite(seg.cp1.y));
        assert.ok(Number.isFinite(seg.cp2.x) && Number.isFinite(seg.cp2.y));
      }
    });

    it('generates valid SVG path data using catmullRomToPath', () => {
      const points = [
        { x: 20, y: 20 },
        { x: 60, y: 50 },
        { x: 100, y: 20 }
      ];
      const pathData = whiteboard.catmullRomToPath(points);
      assert.ok(pathData.startsWith('M 20 20'));
      assert.ok(pathData.includes('C '));
      assert.ok(pathData.endsWith('100 20'));
    });
  });

  // 6. Undo / Redo boundary limits and redo eviction on new stroke
  describe('6. Undo / Redo boundary limits and redo eviction on new stroke', () => {
    it('manages undo and redo stacks correctly', () => {
      const s1 = whiteboard.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] });
      const s2 = whiteboard.addStroke({ tool: 'rectangle', startPoint: { x: 5, y: 5 }, endPoint: { x: 15, y: 15 } });

      assert.equal(whiteboard.strokes.length, 2);
      assert.equal(whiteboard.canUndo, true);
      assert.equal(whiteboard.canRedo, false);

      const undone = whiteboard.undo();
      assert.equal(undone.id, s2.id);
      assert.equal(whiteboard.strokes.length, 1);
      assert.equal(whiteboard.canUndo, true);
      assert.equal(whiteboard.canRedo, true);

      const redone = whiteboard.redo();
      assert.equal(redone.id, s2.id);
      assert.equal(whiteboard.strokes.length, 2);
      assert.equal(whiteboard.canRedo, false);
    });

    it('evicts redo stack when a new stroke is drawn after undo', () => {
      whiteboard.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }] });
      whiteboard.addStroke({ tool: 'circle', startPoint: { x: 5, y: 5 }, endPoint: { x: 10, y: 10 } });

      whiteboard.undo();
      assert.equal(whiteboard.canRedo, true);

      // Draw new stroke
      whiteboard.addStroke({ tool: 'arrow', startPoint: { x: 0, y: 0 }, endPoint: { x: 20, y: 20 } });
      assert.equal(whiteboard.canRedo, false);
      assert.equal(whiteboard.redo(), null);
    });

    it('enforces capacity eviction when strokes exceed maxHistory limit', () => {
      const limited = new DeveloperPortfolioWhiteboardCanvas({ maxHistory: 3 });
      const created = [];
      for (let i = 0; i < 5; i++) {
        created.push(limited.addStroke({ tool: 'pen', points: [{ x: i, y: i }] }));
      }

      assert.equal(limited.strokes.length, 3);
      // First two strokes must have been evicted (FIFO order)
      assert.equal(limited.strokes[0].id, created[2].id);
      assert.equal(limited.strokes[1].id, created[3].id);
      assert.equal(limited.strokes[2].id, created[4].id);
    });

    it('returns null on undo when empty and redo when empty without errors', () => {
      assert.equal(whiteboard.undo(), null);
      assert.equal(whiteboard.redo(), null);
    });

    it('clears canvas and resets stacks', () => {
      whiteboard.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }] });
      assert.equal(whiteboard.clear(), true);
      assert.equal(whiteboard.strokes.length, 0);
      assert.equal(whiteboard.canUndo, false);
      assert.equal(whiteboard.clear(), false);
    });
  });

  // 7. Vector SVG export generation with valid XML elements
  describe('7. Vector SVG export generation with valid XML elements', () => {
    it('produces valid XML with <svg>, <path>, <text>, <circle>, <rect>', () => {
      whiteboard.addStroke({
        tool: 'pen',
        color: THEME_PALETTE.reactCyan,
        strokeWidth: 3,
        points: [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 100, y: 20 }]
      });

      whiteboard.addStroke({
        tool: 'component',
        color: THEME_PALETTE.nodeGreen,
        strokeWidth: 2,
        startPoint: { x: 150, y: 100 },
        endPoint: { x: 300, y: 180 },
        label: 'Auth Microservice'
      });

      whiteboard.addStroke({
        tool: 'rectangle',
        color: THEME_PALETTE.rustOrange,
        strokeWidth: 2,
        startPoint: { x: 400, y: 100 },
        endPoint: { x: 500, y: 200 }
      });

      whiteboard.addStroke({
        tool: 'circle',
        color: THEME_PALETTE.typeScriptBlue,
        strokeWidth: 2,
        startPoint: { x: 600, y: 150 },
        endPoint: { x: 650, y: 150 }
      });

      whiteboard.addStroke({
        tool: 'arrow',
        color: THEME_PALETTE.pureWhite,
        strokeWidth: 2,
        startPoint: { x: 300, y: 140 },
        endPoint: { x: 400, y: 140 }
      });

      const svg = whiteboard.exportSVG();

      assert.ok(svg.includes('<?xml version="1.0" encoding="UTF-8"?>'));
      assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(svg.includes('<path '));
      assert.ok(svg.includes('<text '));
      assert.ok(svg.includes('Auth Microservice'));
      assert.ok(svg.includes('<circle '));
      assert.ok(svg.includes('<rect '));
      assert.ok(svg.includes('<polygon '));
      assert.ok(svg.includes('</svg>'));
    });
  });

  // 8. JSON export and import lifecycle
  describe('8. JSON export and import lifecycle', () => {
    it('serializes strokes to JSON and restores state seamlessly', () => {
      whiteboard.addStroke({
        tool: 'pen',
        color: THEME_PALETTE.reactCyan,
        strokeWidth: 4,
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }]
      });

      whiteboard.addStroke({
        tool: 'component',
        color: THEME_PALETTE.rustOrange,
        strokeWidth: 2,
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 260, y: 180 },
        label: 'Payment Gateway'
      });

      const jsonStr = whiteboard.exportJSON();
      assert.equal(typeof jsonStr, 'string');

      const parsed = JSON.parse(jsonStr);
      assert.equal(parsed.schemaVersion, '1.0.0');
      assert.equal(parsed.strokes.length, 2);

      const targetBoard = new DeveloperPortfolioWhiteboardCanvas();
      targetBoard.loadJSON(jsonStr);

      assert.equal(targetBoard.strokes.length, 2);
      assert.equal(targetBoard.strokes[0].tool, 'pen');
      assert.equal(targetBoard.strokes[1].tool, 'component');
      assert.equal(targetBoard.strokes[1].label, 'Payment Gateway');
      assert.equal(targetBoard.canRedo, false);
    });

    it('rejects corrupted or invalid JSON schemas', () => {
      assert.throws(() => whiteboard.loadJSON('{ corrupted json...'), /Failed to parse whiteboard JSON/);
      assert.throws(() => whiteboard.loadJSON({ invalid: true }), /missing valid "strokes" array/);
      assert.throws(() => whiteboard.loadJSON(null), /must be a valid JSON object/);
    });
  });

  // 9. Event emitter pattern (on, off, emit)
  describe('9. Event emitter pattern', () => {
    it('subscribes and receives events, and unsubscribes properly', () => {
      let callCount = 0;
      let lastTool = null;

      const unsubscribe = whiteboard.on('tool:change', (data) => {
        callCount++;
        lastTool = data.tool;
      });

      whiteboard.setTool('rectangle');
      assert.equal(callCount, 1);
      assert.equal(lastTool, 'rectangle');

      whiteboard.setTool('circle');
      assert.equal(callCount, 2);
      assert.equal(lastTool, 'circle');

      unsubscribe();
      whiteboard.setTool('pen');
      assert.equal(callCount, 2); // Unsubscribed, no longer called
    });

    it('supports off() with specific handler and all handlers', () => {
      let triggered = false;
      const handler = () => { triggered = true; };

      whiteboard.on('clear', handler);
      whiteboard.off('clear', handler);
      whiteboard.emit('clear');
      assert.equal(triggered, false);

      whiteboard.on('test-event', () => {});
      whiteboard.off('test-event'); // Clear all
      assert.equal(whiteboard.listeners.has('test-event'), false);
    });

    it('emits change events across mutations', () => {
      const actions = [];
      whiteboard.on('change', (e) => actions.push(e.type));

      whiteboard.setColor('#ffffff');
      whiteboard.setStrokeWidth(5);
      whiteboard.setOpacity(0.8);
      whiteboard.setTool('arrow');
      whiteboard.addStroke({ tool: 'arrow', startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 10 } });
      whiteboard.undo();
      whiteboard.redo();

      assert.ok(actions.includes('color'));
      assert.ok(actions.includes('strokeWidth'));
      assert.ok(actions.includes('opacity'));
      assert.ok(actions.includes('tool'));
      assert.ok(actions.includes('add'));
      assert.ok(actions.includes('undo'));
      assert.ok(actions.includes('redo'));
    });
  });

  // 10. Mock 2D context rendering execution without errors
  describe('10. Mock 2D context rendering execution without errors', () => {
    it('renders strokes using mock 2D context without exceptions', () => {
      const mockCanvas = createMockCanvas(1200, 800);
      const canvasBoard = new DeveloperPortfolioWhiteboardCanvas(mockCanvas);

      canvasBoard.addStroke({
        tool: 'pen',
        points: [{ x: 10, y: 10 }, { x: 20, y: 30 }, { x: 40, y: 50 }]
      });

      canvasBoard.addStroke({
        tool: 'eraser',
        points: [{ x: 15, y: 15 }, { x: 25, y: 35 }]
      });

      canvasBoard.addStroke({
        tool: 'arrow',
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 200, y: 200 }
      });

      canvasBoard.addStroke({
        tool: 'rectangle',
        startPoint: { x: 50, y: 50 },
        endPoint: { x: 150, y: 150 }
      });

      canvasBoard.addStroke({
        tool: 'circle',
        startPoint: { x: 300, y: 300 },
        endPoint: { x: 350, y: 300 }
      });

      canvasBoard.addStroke({
        tool: 'component',
        startPoint: { x: 400, y: 100 },
        endPoint: { x: 560, y: 180 },
        label: 'Cluster Worker Node'
      });

      assert.doesNotThrow(() => {
        canvasBoard.render();
      });

      const ops = mockCanvas._ctx.operations;
      assert.ok(ops.length > 0);
      assert.ok(ops.some(op => op.method === 'clearRect'));
      assert.ok(ops.some(op => op.method === 'beginPath'));
      assert.ok(ops.some(op => op.method === 'bezierCurveTo'));
      assert.ok(ops.some(op => op.method === 'strokeRect'));
      assert.ok(ops.some(op => op.method === 'arc'));
      assert.ok(ops.some(op => op.method === 'fillText'));
    });

    it('loads and renders architectural backdrop templates successfully', () => {
      const templates = ['microservices', 'erd', 'eventbus'];
      for (const t of templates) {
        const count = whiteboard.loadTemplate(t);
        assert.ok(count > 0, `Template ${t} should produce strokes`);
        assert.ok(whiteboard.strokes.length > 0);

        const mockCtx = createMockContext();
        assert.doesNotThrow(() => {
          whiteboard.render(mockCtx);
        });
      }
    });

    it('handles interactive pointer drawing lifecycle on mock canvas', () => {
      const mockCanvas = createMockCanvas(1200, 800);
      const board = new DeveloperPortfolioWhiteboardCanvas(mockCanvas, { tool: 'pen' });

      const listeners = mockCanvas._listeners;
      assert.ok(listeners.has('pointerdown'));
      assert.ok(listeners.has('pointermove'));
      assert.ok(listeners.has('pointerup'));

      const downListeners = listeners.get('pointerdown');
      const moveListeners = listeners.get('pointermove');
      const upListeners = listeners.get('pointerup');

      // Simulate drawing a stroke
      downListeners[0]({ clientX: 50, clientY: 50 });
      assert.equal(board.isDrawing, true);
      assert.ok(board.activeStroke);

      moveListeners[0]({ clientX: 70, clientY: 70 });
      assert.ok(board.activeStroke.points.length > 1);

      upListeners[0]({ clientX: 70, clientY: 70 });
      assert.equal(board.isDrawing, false);
      assert.equal(board.activeStroke, null);
      assert.equal(board.strokes.length, 1);

      board.destroy();
      assert.equal(board.listeners.size, 0);
    });

    it('resizes canvas and handles devicePixelRatio scaling', () => {
      const mockCanvas = createMockCanvas(800, 600);
      const board = new DeveloperPortfolioWhiteboardCanvas(mockCanvas);

      board.resize(1000, 700);
      assert.equal(board.width, 1000);
      assert.equal(board.height, 700);
      assert.equal(mockCanvas.style.width, '1000px');
      assert.equal(mockCanvas.style.height, '700px');
    });
  });
});
