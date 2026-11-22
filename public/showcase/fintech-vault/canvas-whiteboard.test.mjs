import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FintechVaultWhiteboardCanvas,
  FINTECH_PALETTE,
  SUPPORTED_TOOLS,
  TOOL_ALIASES,
} from './canvas-whiteboard.js';

describe('FintechVaultWhiteboardCanvas Test Suite', () => {
  // 1. Initialization defaults and palette constants
  describe('1. Initialization & Palette Constants', () => {
    it('should expose the correct Midnight Executive fintech palette constants', () => {
      assert.equal(FINTECH_PALETTE.vaultNavy, '#081226');
      assert.equal(FINTECH_PALETTE.emeraldGreen, '#10b981');
      assert.equal(FINTECH_PALETTE.amberGold, '#f59e0b');
      assert.equal(FINTECH_PALETTE.azureBlue, '#0284c7');
      assert.equal(FINTECH_PALETTE.indigoSecurity, '#6366f1');
      assert.equal(FINTECH_PALETTE.roseAlert, '#ec4899');
      assert.equal(FINTECH_PALETTE.pureWhite, '#ffffff');

      assert.equal(FintechVaultWhiteboardCanvas.PALETTE, FINTECH_PALETTE);
      assert.throws(() => {
        FINTECH_PALETTE.emeraldGreen = '#000000';
      });
    });

    it('should instantiate with institutional default configurations', () => {
      const board = new FintechVaultWhiteboardCanvas();
      assert.equal(board.width, 1200);
      assert.equal(board.height, 800);
      assert.equal(board.currentTool, 'pen');
      assert.equal(board.currentColor, FINTECH_PALETTE.emeraldGreen);
      assert.equal(board.strokeWidth, 3);
      assert.equal(board.opacity, 1.0);
      assert.equal(board.nodeLabel, 'SECURITY_VAULT');
      assert.equal(board.maxHistory, 50);
      assert.equal(board.historyCount, 0);
      assert.equal(board.showGrid, true);
      assert.equal(board.backdropTemplate, 'none');
      assert.equal(board.canUndo, false);
      assert.equal(board.canRedo, false);
      assert.equal(board.canvas, null);
      assert.equal(board.ctx, null);
    });

    it('should accept custom initialization options', () => {
      const board = new FintechVaultWhiteboardCanvas({
        width: 1920,
        height: 1080,
        maxHistory: 25,
        tool: 'flow',
        color: FINTECH_PALETTE.azureBlue,
        strokeWidth: 5,
        opacity: 0.85,
        showGrid: false,
        template: 'payment-flow',
      });

      assert.equal(board.width, 1920);
      assert.equal(board.height, 1080);
      assert.equal(board.maxHistory, 25);
      assert.equal(board.currentTool, 'flow');
      assert.equal(board.currentColor, FINTECH_PALETTE.azureBlue);
      assert.equal(board.strokeWidth, 5);
      assert.equal(board.opacity, 0.85);
      assert.equal(board.showGrid, false);
      assert.equal(board.backdropTemplate, 'payment-flow');
    });
  });

  // 2. Tool mutations, alias normalization, and error handling
  describe('2. Tool Mutations & Alias Normalization', () => {
    it('should support all standard fintech tools', () => {
      const board = new FintechVaultWhiteboardCanvas();
      for (const tool of SUPPORTED_TOOLS) {
        board.setTool(tool);
        assert.equal(board.currentTool, tool);
      }
    });

    it('should normalize known aliases correctly', () => {
      const board = new FintechVaultWhiteboardCanvas();

      board.setTool('pencil');
      assert.equal(board.currentTool, 'pen');

      board.setTool('draw');
      assert.equal(board.currentTool, 'pen');

      board.setTool('line');
      assert.equal(board.currentTool, 'flow');

      board.setTool('arrow');
      assert.equal(board.currentTool, 'flow');

      board.setTool('badge');
      assert.equal(board.currentTool, 'node');

      board.setTool('box');
      assert.equal(board.currentTool, 'rectangle');

      board.setTool('rect');
      assert.equal(board.currentTool, 'rectangle');

      board.setTool('ellipse');
      assert.equal(board.currentTool, 'circle');

      board.setTool('delete');
      assert.equal(board.currentTool, 'eraser');
    });

    it('should be case-insensitive and trim whitespace on tool names', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.setTool('  FLOW  ');
      assert.equal(board.currentTool, 'flow');

      board.setTool('NODE');
      assert.equal(board.currentTool, 'node');
    });

    it('should reject invalid or unsupported tools with descriptive errors', () => {
      const board = new FintechVaultWhiteboardCanvas();
      assert.throws(() => board.setTool('laser'), /Unsupported tool "laser"/);
      assert.throws(() => board.setTool(''), /Invalid tool: must be a non-empty string/);
      assert.throws(() => board.setTool(null), /Invalid tool: must be a non-empty string/);
      assert.throws(() => board.setTool(123), /Invalid tool: must be a non-empty string/);
    });

    it('should emit tool:change event when tool changes', () => {
      const board = new FintechVaultWhiteboardCanvas();
      let eventPayload = null;
      board.on('tool:change', (e) => {
        eventPayload = e;
      });

      board.setTool('rectangle');
      assert.deepEqual(eventPayload, { tool: 'rectangle', previous: 'pen' });
    });
  });

  // 3. Brush customization and numeric bounds clamping
  describe('3. Brush Customization & Bounds Clamping', () => {
    it('should update color and emit color:change', () => {
      const board = new FintechVaultWhiteboardCanvas();
      let changedColor = null;
      board.on('color:change', (e) => {
        changedColor = e.color;
      });

      board.setColor(FINTECH_PALETTE.amberGold);
      assert.equal(board.currentColor, FINTECH_PALETTE.amberGold);
      assert.equal(changedColor, FINTECH_PALETTE.amberGold);

      assert.throws(() => board.setColor(''), /Color must be a valid CSS color string/);
      assert.throws(() => board.setColor(null), /Color must be a valid CSS color string/);
    });

    it('should clamp strokeWidth between 1 and 64', () => {
      const board = new FintechVaultWhiteboardCanvas();

      board.setStrokeWidth(12);
      assert.equal(board.strokeWidth, 12);

      board.setStrokeWidth(-10);
      assert.equal(board.strokeWidth, 1);

      board.setStrokeWidth(0);
      assert.equal(board.strokeWidth, 1);

      board.setStrokeWidth(120);
      assert.equal(board.strokeWidth, 64);

      board.setStrokeWidth('18');
      assert.equal(board.strokeWidth, 18);

      board.setStrokeWidth('not-a-number');
      assert.equal(board.strokeWidth, 3);
    });

    it('should clamp opacity between 0.0 and 1.0', () => {
      const board = new FintechVaultWhiteboardCanvas();

      board.setOpacity(0.65);
      assert.equal(board.opacity, 0.65);

      board.setOpacity(-0.5);
      assert.equal(board.opacity, 0.0);

      board.setOpacity(1.8);
      assert.equal(board.opacity, 1.0);

      board.setOpacity('0.33');
      assert.equal(board.opacity, 0.33);

      board.setOpacity('invalid');
      assert.equal(board.opacity, 1.0);
    });

    it('should configure node labels with sanitization', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.setNodeLabel('PAYMENT_GATEWAY', 'HSM_CORE');
      assert.equal(board.nodeLabel, 'PAYMENT_GATEWAY');
      assert.equal(board.nodeBadgeType, 'HSM_CORE');
    });
  });

  // 4. Point distance interpolation generating intermediate points without gaps
  describe('4. Point Distance Interpolation', () => {
    it('should return a single point when start and end are identical', () => {
      const p1 = { x: 50, y: 50 };
      const p2 = { x: 50, y: 50 };
      const points = FintechVaultWhiteboardCanvas.interpolatePoints(p1, p2, 5);
      assert.equal(points.length, 1);
      assert.deepEqual(points[0], { x: 50, y: 50 });
    });

    it('should return endpoints when distance is less than or equal to threshold', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 }; // distance = 5
      const points = FintechVaultWhiteboardCanvas.interpolatePoints(p1, p2, 5);
      assert.equal(points.length, 2);
      assert.deepEqual(points[0], { x: 0, y: 0 });
      assert.deepEqual(points[1], { x: 3, y: 4 });
    });

    it('should generate intermediate points such that no gap exceeds maxDistance', () => {
      const p1 = { x: 10, y: 20 };
      const p2 = { x: 110, y: 20 }; // distance = 100
      const maxDist = 8;
      const points = FintechVaultWhiteboardCanvas.interpolatePoints(p1, p2, maxDist);

      assert.ok(points.length > 10, 'Should generate multiple intermediate points');
      assert.deepEqual(points[0], p1);
      assert.deepEqual(points[points.length - 1], p2);

      // Verify that every segment gap is <= maxDist
      for (let i = 0; i < points.length - 1; i++) {
        const segDist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
        assert.ok(
          segDist <= maxDist + 0.01,
          `Segment gap ${segDist} between index ${i} and ${i + 1} exceeds maxDistance ${maxDist}`
        );
      }
    });

    it('should handle diagonal vectors and fractional coordinates cleanly', () => {
      const p1 = { x: 100.5, y: 50.25 };
      const p2 = { x: 300.75, y: 250.8 };
      const points = FintechVaultWhiteboardCanvas.interpolatePoints(p1, p2, 6);
      assert.ok(points.length > 40);

      for (let i = 0; i < points.length - 1; i++) {
        const segDist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
        assert.ok(segDist <= 6.01);
      }
    });
  });

  // 5. Catmull-Rom smoothing and path generation
  describe('5. Catmull-Rom Smoothing & Path Generation', () => {
    it('should return empty segment array for insufficient points', () => {
      assert.deepEqual(FintechVaultWhiteboardCanvas.catmullRomToBezier([]), []);
      assert.deepEqual(FintechVaultWhiteboardCanvas.catmullRomToBezier([{ x: 10, y: 10 }]), []);
    });

    it('should convert 2 points into 1 cubic Bezier segment', () => {
      const points = [{ x: 0, y: 0 }, { x: 30, y: 30 }];
      const segments = FintechVaultWhiteboardCanvas.catmullRomToBezier(points);
      assert.equal(segments.length, 1);
      assert.deepEqual(segments[0].p0, { x: 0, y: 0 });
      assert.deepEqual(segments[0].p1, { x: 30, y: 30 });
      assert.ok(segments[0].cp1 && segments[0].cp2);
    });

    it('should produce N-1 smooth Bezier segments for N points', () => {
      const points = [
        { x: 10, y: 10 },
        { x: 50, y: 100 },
        { x: 120, y: 80 },
        { x: 200, y: 150 },
        { x: 300, y: 120 },
      ];
      const segments = FintechVaultWhiteboardCanvas.catmullRomToBezier(points);
      assert.equal(segments.length, 4);

      for (let i = 0; i < segments.length; i++) {
        assert.deepEqual(segments[i].p0, points[i]);
        assert.deepEqual(segments[i].p1, points[i + 1]);
        assert.ok(Number.isFinite(segments[i].cp1.x));
        assert.ok(Number.isFinite(segments[i].cp1.y));
        assert.ok(Number.isFinite(segments[i].cp2.x));
        assert.ok(Number.isFinite(segments[i].cp2.y));
      }
    });

    it('should generate valid SVG path d string with Catmull-Rom Bezier curves', () => {
      const points = [
        { x: 20, y: 30 },
        { x: 60, y: 90 },
        { x: 120, y: 40 },
      ];
      const d = FintechVaultWhiteboardCanvas.pointsToSVGPath(points);
      assert.match(d, /^M 20\.00 30\.00/);
      assert.match(d, /C /);
      assert.ok(d.includes('60.00 90.00') || d.includes('120.00 40.00'));
    });
  });

  // 6. Undo / Redo boundary limits and redo eviction on new stroke
  describe('6. Undo / Redo Boundary Limits & Eviction', () => {
    it('should safely handle undo and redo on empty state', () => {
      const board = new FintechVaultWhiteboardCanvas();
      assert.equal(board.undo(), false);
      assert.equal(board.redo(), false);
      assert.equal(board.historyCount, 0);
    });

    it('should undo and redo strokes in exact LIFO order', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }] });
      board.addStroke({ tool: 'flow', start: { x: 0, y: 0 }, end: { x: 10, y: 10 } });
      board.addStroke({ tool: 'node', label: 'VAULT_A' });

      assert.equal(board.historyCount, 3);
      assert.equal(board.canUndo, true);
      assert.equal(board.canRedo, false);

      // Undo last
      assert.equal(board.undo(), true);
      assert.equal(board.historyCount, 2);
      assert.equal(board.canRedo, true);
      assert.equal(board.strokes[1].tool, 'flow');

      // Undo second
      assert.equal(board.undo(), true);
      assert.equal(board.historyCount, 1);
      assert.equal(board.strokes[0].tool, 'pen');

      // Redo back
      assert.equal(board.redo(), true);
      assert.equal(board.historyCount, 2);
      assert.equal(board.strokes[1].tool, 'flow');

      assert.equal(board.redo(), true);
      assert.equal(board.historyCount, 3);
      assert.equal(board.strokes[2].tool, 'node');
      assert.equal(board.canRedo, false);
    });

    it('should evict redo stack completely when a new stroke is added', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.addStroke({ tool: 'pen', points: [{ x: 0, y: 0 }] });
      board.addStroke({ tool: 'circle', cx: 50, cy: 50, radius: 20 });
      board.addStroke({ tool: 'rectangle', x: 10, y: 10, width: 40, height: 40 });

      assert.equal(board.historyCount, 3);

      board.undo(); // 2 strokes left, 1 in redo
      board.undo(); // 1 stroke left, 2 in redo
      assert.equal(board.redoStack.length, 2);
      assert.equal(board.canRedo, true);

      // Add a new stroke
      board.addStroke({ tool: 'flow', start: { x: 5, y: 5 }, end: { x: 25, y: 25 } });

      // Redo stack must be cleared
      assert.equal(board.redoStack.length, 0);
      assert.equal(board.canRedo, false);
      assert.equal(board.historyCount, 2);
    });

    it('should enforce maxHistory capacity by evicting oldest strokes', () => {
      const board = new FintechVaultWhiteboardCanvas({ maxHistory: 5 });

      for (let i = 1; i <= 8; i++) {
        board.addStroke({ tool: 'node', label: `NODE_${i}` });
      }

      assert.equal(board.historyCount, 5);
      assert.equal(board.strokes[0].label, 'NODE_4');
      assert.equal(board.strokes[4].label, 'NODE_8');
    });

    it('should clear all history on clear()', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.addStroke({ tool: 'pen' });
      board.addStroke({ tool: 'circle' });
      board.undo();

      assert.equal(board.clear(), true);
      assert.equal(board.historyCount, 0);
      assert.equal(board.canUndo, false);
      assert.equal(board.canRedo, false);
      assert.equal(board.clear(), false);
    });
  });

  // 7. Vector SVG export generation with valid XML elements
  describe('7. Vector SVG Export Generation', () => {
    it('should export valid XML SVG containing paths, texts, circles, and rects', () => {
      const board = new FintechVaultWhiteboardCanvas({ width: 1000, height: 700 });

      // Add pen stroke
      board.addStroke({
        tool: 'pen',
        color: FINTECH_PALETTE.emeraldGreen,
        strokeWidth: 4,
        opacity: 0.9,
        points: [{ x: 10, y: 10 }, { x: 50, y: 80 }, { x: 100, y: 60 }],
      });

      // Add flow stroke
      board.addStroke({
        tool: 'flow',
        color: FINTECH_PALETTE.azureBlue,
        strokeWidth: 3,
        start: { x: 100, y: 100 },
        end: { x: 250, y: 100 },
        label: 'TLS_SETTLEMENT',
      });

      // Add security node
      board.addStroke({
        tool: 'node',
        color: FINTECH_PALETTE.indigoSecurity,
        x: 300,
        y: 80,
        width: 180,
        height: 70,
        label: 'ESCROW_CORE',
        badgeType: 'KEYSTORE',
      });

      // Add boundary rectangle
      board.addStroke({
        tool: 'rectangle',
        color: FINTECH_PALETTE.amberGold,
        strokeWidth: 2,
        x: 50,
        y: 40,
        width: 500,
        height: 300,
        dashed: true,
        label: 'SECURITY_PERIMETER',
      });

      // Add enclave circle
      board.addStroke({
        tool: 'circle',
        color: FINTECH_PALETTE.roseAlert,
        strokeWidth: 2,
        cx: 600,
        cy: 200,
        radius: 45,
        label: 'HSM_TOKEN',
      });

      const svg = board.exportSVG();

      // Check root and namespace
      assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(svg.endsWith('</svg>'));
      assert.ok(svg.includes('viewBox="0 0 1000 700"'));

      // Check element types
      assert.ok(svg.includes('<defs>'));
      assert.ok(svg.includes('<marker id="arrow-'));
      assert.ok(svg.includes('<path d="M '));
      assert.ok(svg.includes('<text '));
      assert.ok(svg.includes('<circle '));
      assert.ok(svg.includes('<rect '));
      assert.ok(svg.includes('<line '));

      // Check fintech branding and palette colors
      assert.ok(svg.includes(FINTECH_PALETTE.vaultNavy));
      assert.ok(svg.includes(FINTECH_PALETTE.emeraldGreen));
      assert.ok(svg.includes(FINTECH_PALETTE.azureBlue));
      assert.ok(svg.includes(FINTECH_PALETTE.indigoSecurity));
      assert.ok(svg.includes('ESCROW_CORE'));
      assert.ok(svg.includes('KEYSTORE'));
      assert.ok(svg.includes('SECURITY_PERIMETER'));
      assert.ok(svg.includes('HSM_TOKEN'));
    });

    it('should properly escape XML entities in text labels', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.addStroke({
        tool: 'node',
        label: '<script>alert("hack")</script> & "val"',
        badgeType: 'TEST & <CORE>',
      });

      const svg = board.exportSVG();
      assert.ok(!svg.includes('<script>'));
      assert.ok(svg.includes('&lt;script&gt;'));
      assert.ok(svg.includes('&amp;'));
      assert.ok(svg.includes('&quot;'));
    });
  });

  // 8. JSON export and import lifecycle
  describe('8. JSON Export & Import Lifecycle', () => {
    it('should export canvas data to valid JSON string', () => {
      const board = new FintechVaultWhiteboardCanvas({ width: 1400, height: 900 });
      board.addStroke({ tool: 'pen', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] });
      board.addStroke({ tool: 'node', label: 'AUTH_GATE' });

      const json = board.exportJSON();
      assert.equal(typeof json, 'string');

      const parsed = JSON.parse(json);
      assert.equal(parsed.version, '1.0.0');
      assert.equal(parsed.generator, 'FintechVaultWhiteboardCanvas');
      assert.equal(parsed.theme, 'midnight-executive');
      assert.equal(parsed.dimensions.width, 1400);
      assert.equal(parsed.dimensions.height, 900);
      assert.equal(parsed.strokes.length, 2);
    });

    it('should load JSON data and restore strokes accurately', () => {
      const boardA = new FintechVaultWhiteboardCanvas();
      boardA.addStroke({ tool: 'flow', start: { x: 10, y: 10 }, end: { x: 50, y: 50 }, label: 'TRANSFER' });
      boardA.addStroke({ tool: 'circle', cx: 120, cy: 120, radius: 30, label: 'WALLET' });

      const exported = boardA.exportJSON();

      const boardB = new FintechVaultWhiteboardCanvas();
      const loaded = boardB.loadJSON(exported);

      assert.equal(loaded, true);
      assert.equal(boardB.historyCount, 2);
      assert.equal(boardB.strokes[0].tool, 'flow');
      assert.equal(boardB.strokes[0].label, 'TRANSFER');
      assert.equal(boardB.strokes[1].tool, 'circle');
      assert.equal(boardB.strokes[1].label, 'WALLET');
    });

    it('should reject malformed or invalid JSON payloads gracefully', () => {
      const board = new FintechVaultWhiteboardCanvas();

      assert.throws(() => board.loadJSON('{ broken json'), /Failed to parse JSON/);
      assert.throws(() => board.loadJSON(null), /loadJSON requires a valid JSON string or object/);
      assert.throws(() => board.loadJSON(123), /loadJSON requires a valid JSON string or object/);
      assert.throws(() => board.loadJSON({ notStrokes: true }), /missing "strokes" array/);
    });
  });

  // 9. Event emitter pattern (on, off, emit)
  describe('9. Event Emitter Pattern', () => {
    it('should register listeners, emit events, and pass payloads', () => {
      const board = new FintechVaultWhiteboardCanvas();
      let captured = null;

      board.on('test:event', (payload) => {
        captured = payload;
      });

      board.emit('test:event', { code: 200, status: 'SECURE' });
      assert.deepEqual(captured, { code: 200, status: 'SECURE' });
    });

    it('should unsubscribe using returned function or off()', () => {
      const board = new FintechVaultWhiteboardCanvas();
      let count = 0;
      const fn = () => count++;

      const unsubscribe = board.on('tick', fn);
      board.emit('tick');
      assert.equal(count, 1);

      unsubscribe();
      board.emit('tick');
      assert.equal(count, 1);

      board.on('tick', fn);
      board.emit('tick');
      assert.equal(count, 2);

      board.off('tick', fn);
      board.emit('tick');
      assert.equal(count, 2);
    });

    it('should isolate listener errors without crashing subsequent listeners', () => {
      const board = new FintechVaultWhiteboardCanvas();
      let secondExecuted = false;

      board.on('hazard', () => {
        throw new Error('Explosion');
      });
      board.on('hazard', () => {
        secondExecuted = true;
      });

      board.emit('hazard');
      assert.equal(secondExecuted, true);
    });
  });

  // 10. Mock 2D context rendering execution without errors
  describe('10. Mock 2D Context Render Engine', () => {
    function createMockCtx() {
      const calls = [];
      const record = (method, args) => calls.push({ method, args });

      return {
        calls,
        save: () => record('save', []),
        restore: () => record('restore', []),
        fillRect: (x, y, w, h) => record('fillRect', [x, y, w, h]),
        strokeRect: (x, y, w, h) => record('strokeRect', [x, y, w, h]),
        beginPath: () => record('beginPath', []),
        moveTo: (x, y) => record('moveTo', [x, y]),
        lineTo: (x, y) => record('lineTo', [x, y]),
        bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => record('bezierCurveTo', [cp1x, cp1y, cp2x, cp2y, x, y]),
        arc: (x, y, r, sa, ea) => record('arc', [x, y, r, sa, ea]),
        closePath: () => record('closePath', []),
        stroke: () => record('stroke', []),
        fill: () => record('fill', []),
        fillText: (text, x, y) => record('fillText', [text, x, y]),
        setLineDash: (segments) => record('setLineDash', [segments]),
        measureText: (text) => ({ width: text.length * 7 }),
      };
    }

    it('should render all stroke types onto mock context without throwing', () => {
      const board = new FintechVaultWhiteboardCanvas({ width: 800, height: 600 });
      const mockCtx = createMockCtx();

      // Pen stroke
      board.addStroke({
        tool: 'pen',
        points: [{ x: 10, y: 10 }, { x: 30, y: 40 }, { x: 80, y: 60 }, { x: 120, y: 100 }],
      });

      // Eraser stroke
      board.addStroke({
        tool: 'eraser',
        points: [{ x: 50, y: 50 }, { x: 60, y: 60 }],
      });

      // Flow arrow stroke
      board.addStroke({
        tool: 'flow',
        start: { x: 20, y: 20 },
        end: { x: 100, y: 20 },
        label: 'SETTLE',
      });

      // Node badge stroke
      board.addStroke({
        tool: 'node',
        x: 150,
        y: 80,
        width: 180,
        height: 70,
        label: 'VAULT_HSM',
        badgeType: 'HARDWARE',
      });

      // Rectangle stroke
      board.addStroke({
        tool: 'rectangle',
        x: 30,
        y: 30,
        width: 200,
        height: 150,
        dashed: true,
        label: 'ISOLATION_ZONE',
      });

      // Circle stroke
      board.addStroke({
        tool: 'circle',
        cx: 300,
        cy: 300,
        radius: 40,
        label: 'TOKEN',
      });

      // Render all strokes onto mock context
      assert.doesNotThrow(() => {
        board.render(mockCtx);
      });

      const methodNames = mockCtx.calls.map((c) => c.method);

      // Verify that canvas drawing methods were called
      assert.ok(methodNames.includes('save'));
      assert.ok(methodNames.includes('restore'));
      assert.ok(methodNames.includes('fillRect'));
      assert.ok(methodNames.includes('beginPath'));
      assert.ok(methodNames.includes('moveTo'));
      assert.ok(methodNames.includes('bezierCurveTo'));
      assert.ok(methodNames.includes('stroke'));
      assert.ok(methodNames.includes('fill'));
      assert.ok(methodNames.includes('fillText'));
      assert.ok(methodNames.includes('arc'));
      assert.ok(methodNames.includes('setLineDash'));
    });

    it('should render architecture templates onto mock context without throwing', () => {
      const board = new FintechVaultWhiteboardCanvas({ template: 'payment-flow' });
      const mockCtx = createMockCtx();

      assert.doesNotThrow(() => {
        board.render(mockCtx);
      });

      assert.ok(mockCtx.calls.length > 20);
    });
  });

  // 11. Headless Pointer Simulation
  describe('11. Headless Pointer Simulation', () => {
    it('should record freehand pen stroke across pointer down, move, and up', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.setTool('pen');

      board.handlePointerDown(10, 10);
      assert.equal(board.isDrawing, true);
      assert.ok(board.currentStroke);

      board.handlePointerMove(50, 50);
      board.handlePointerMove(100, 80);

      board.handlePointerUp(100, 80);
      assert.equal(board.isDrawing, false);
      assert.equal(board.currentStroke, null);
      assert.equal(board.historyCount, 1);

      const stroke = board.strokes[0];
      assert.equal(stroke.tool, 'pen');
      assert.ok(stroke.points.length >= 3);
    });

    it('should record rectangle shape across pointer interaction', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.setTool('rectangle');

      board.handlePointerDown(50, 50);
      board.handlePointerMove(150, 200);
      board.handlePointerUp(150, 200);

      assert.equal(board.historyCount, 1);
      const stroke = board.strokes[0];
      assert.equal(stroke.tool, 'rectangle');
      assert.equal(stroke.x, 50);
      assert.equal(stroke.y, 50);
      assert.equal(stroke.width, 100);
      assert.equal(stroke.height, 150);
    });

    it('should record flow arrow across pointer interaction', () => {
      const board = new FintechVaultWhiteboardCanvas();
      board.setTool('flow');

      board.handlePointerDown(20, 30);
      board.handlePointerMove(180, 120);
      board.handlePointerUp(180, 120);

      assert.equal(board.historyCount, 1);
      const stroke = board.strokes[0];
      assert.equal(stroke.tool, 'flow');
      assert.deepEqual(stroke.start, { x: 20, y: 30 });
      assert.deepEqual(stroke.end, { x: 180, y: 120 });
    });
  });
});
