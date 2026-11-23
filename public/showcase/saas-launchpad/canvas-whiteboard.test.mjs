import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SaaSLaunchpadWhiteboardCanvas,
  SAAS_PALETTE,
  SUPPORTED_TOOLS,
  normalizeTool,
  clamp,
  hexToRgba,
  escapeXml,
} from './canvas-whiteboard.js';

function createMockContext() {
  const operations = [];
  return {
    operations,
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    beginPath: () => operations.push('beginPath'),
    closePath: () => operations.push('closePath'),
    moveTo: (x, y) => operations.push(['moveTo', x, y]),
    lineTo: (x, y) => operations.push(['lineTo', x, y]),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => operations.push(['bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y]),
    arc: (x, y, r, sa, ea) => operations.push(['arc', x, y, r, sa, ea]),
    ellipse: (x, y, rx, ry, rot, sa, ea) => operations.push(['ellipse', x, y, rx, ry, rot, sa, ea]),
    roundRect: (x, y, w, h, r) => operations.push(['roundRect', x, y, w, h, r]),
    rect: (x, y, w, h) => operations.push(['rect', x, y, w, h]),
    stroke: () => operations.push('stroke'),
    fill: () => operations.push('fill'),
    strokeRect: (x, y, w, h) => operations.push(['strokeRect', x, y, w, h]),
    fillRect: (x, y, w, h) => operations.push(['fillRect', x, y, w, h]),
    clearRect: (x, y, w, h) => operations.push(['clearRect', x, y, w, h]),
    fillText: (text, x, y) => operations.push(['fillText', text, x, y]),
    setLineDash: (dash) => operations.push(['setLineDash', dash]),
    scale: (sx, sy) => operations.push(['scale', sx, sy]),
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',
  };
}

describe('SaaSLaunchpadWhiteboardCanvas (Issue #2039)', () => {
  // 1. Initialization defaults and palette constants
  describe('1. Initialization defaults and palette constants', () => {
    it('provides all official SaaS brand palette hex codes', () => {
      assert.equal(SAAS_PALETTE.obsidianDark, '#0b0f19');
      assert.equal(SAAS_PALETTE.indigoPrimary, '#6366f1');
      assert.equal(SAAS_PALETTE.violetAccent, '#8b5cf6');
      assert.equal(SAAS_PALETTE.emeraldConversion, '#10b981');
      assert.equal(SAAS_PALETTE.amberWarning, '#f59e0b');
      assert.equal(SAAS_PALETTE.roseChurn, '#f43f5e');
      assert.equal(SAAS_PALETTE.pureWhite, '#ffffff');

      assert.deepEqual(SaaSLaunchpadWhiteboardCanvas.PALETTE, SAAS_PALETTE);
    });

    it('initializes instance with canonical defaults', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      assert.equal(board.width, 1200);
      assert.equal(board.height, 800);
      assert.equal(board.tool, 'pen');
      assert.equal(board.color, SAAS_PALETTE.indigoPrimary);
      assert.equal(board.strokeWidth, 3);
      assert.equal(board.opacity, 1.0);
      assert.equal(board.template, 'none');
      assert.deepEqual(board.strokes, []);
      assert.equal(board.canUndo, false);
      assert.equal(board.canRedo, false);
      assert.deepEqual(board.palette, SAAS_PALETTE);
    });

    it('accepts custom initialization options', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas({
        width: 1920,
        height: 1080,
        tool: 'rectangle',
        color: SAAS_PALETTE.emeraldConversion,
        strokeWidth: 8,
        opacity: 0.75,
        template: 'funnel',
        maxHistory: 20,
      });

      assert.equal(board.width, 1920);
      assert.equal(board.height, 1080);
      assert.equal(board.tool, 'rectangle');
      assert.equal(board.color, SAAS_PALETTE.emeraldConversion);
      assert.equal(board.strokeWidth, 8);
      assert.equal(board.opacity, 0.75);
      assert.equal(board.template, 'funnel');
      assert.equal(board.maxHistory, 20);
    });
  });

  // 2. Tool mutations, alias normalization, and error handling for invalid tools
  describe('2. Tool mutations, alias normalization, and error handling', () => {
    it('sets all officially supported tools directly', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      for (const tool of SUPPORTED_TOOLS) {
        board.setTool(tool);
        assert.equal(board.tool, tool);
      }
    });

    it('normalizes common aliases correctly', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();

      board.setTool('draw');
      assert.equal(board.tool, 'pen');

      board.setTool('BRUSH');
      assert.equal(board.tool, 'pen');

      board.setTool('erase');
      assert.equal(board.tool, 'eraser');

      board.setTool('rubber');
      assert.equal(board.tool, 'eraser');

      board.setTool('pointer');
      assert.equal(board.tool, 'arrow');

      board.setTool('vector');
      assert.equal(board.tool, 'arrow');

      board.setTool('node');
      assert.equal(board.tool, 'component');

      board.setTool('card');
      assert.equal(board.tool, 'component');

      board.setTool('box');
      assert.equal(board.tool, 'rectangle');

      board.setTool('square');
      assert.equal(board.tool, 'rectangle');

      board.setTool('ellipse');
      assert.equal(board.tool, 'circle');

      board.setTool('oval');
      assert.equal(board.tool, 'circle');
    });

    it('throws errors on unsupported or invalid tool names', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      assert.throws(() => board.setTool('magic-wand'), /Unsupported tool/);
      assert.throws(() => board.setTool('star'), /Unsupported tool/);
      assert.throws(() => board.setTool(''), /non-empty string/);
      assert.throws(() => board.setTool(null), /non-empty string/);
      assert.throws(() => board.setTool(123), /non-empty string/);
      assert.throws(() => normalizeTool('laser'), /Unsupported tool/);
    });
  });

  // 3. Brush customization and numeric bounds clamping
  describe('3. Brush customization and numeric bounds clamping', () => {
    it('updates color and validates input', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      board.setColor(SAAS_PALETTE.roseChurn);
      assert.equal(board.color, '#f43f5e');

      assert.throws(() => board.setColor(''), /Color must be a valid non-empty string/);
      assert.throws(() => board.setColor(null), /Color must be a valid non-empty string/);
    });

    it('clamps stroke width between 1 and 50', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      board.setStrokeWidth(15);
      assert.equal(board.strokeWidth, 15);

      board.setStrokeWidth(-10);
      assert.equal(board.strokeWidth, 1);

      board.setStrokeWidth(0);
      assert.equal(board.strokeWidth, 1);

      board.setStrokeWidth(100);
      assert.equal(board.strokeWidth, 50);

      board.setStrokeWidth('not-a-number');
      assert.equal(board.strokeWidth, 1);
    });

    it('clamps opacity strictly between 0.0 and 1.0', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      board.setOpacity(0.4);
      assert.equal(board.opacity, 0.4);

      board.setOpacity(-0.5);
      assert.equal(board.opacity, 0.0);

      board.setOpacity(1.8);
      assert.equal(board.opacity, 1.0);
    });

    it('verifies clamp and hexToRgba utility helpers', () => {
      assert.equal(clamp(25, 1, 50), 25);
      assert.equal(clamp(-5, 0, 10), 0);
      assert.equal(clamp(15, 0, 10), 10);

      const rgba = hexToRgba('#6366f1', 0.5);
      assert.equal(rgba, 'rgba(99, 102, 241, 0.5)');

      const shortRgba = hexToRgba('#fff', 0.8);
      assert.equal(shortRgba, 'rgba(255, 255, 255, 0.8)');
    });
  });

  // 4. Point distance interpolation generating intermediate points without gaps
  describe('4. Point distance interpolation', () => {
    it('returns single point when endpoints coincide', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      const points = board.interpolatePoints({ x: 20, y: 20 }, { x: 20, y: 20 }, 5);
      assert.equal(points.length, 1);
      assert.deepEqual(points[0], { x: 20, y: 20 });
    });

    it('returns both points if distance is within threshold', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      const points = board.interpolatePoints({ x: 10, y: 10 }, { x: 13, y: 14 }, 10);
      assert.equal(points.length, 2);
      assert.deepEqual(points[0], { x: 10, y: 10 });
      assert.deepEqual(points[1], { x: 13, y: 14 });
    });

    it('interpolates points without gaps for fast cursor movements', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      // Distance is 100 along x axis, max dist is 10 => 11 points spaced by 10
      const points = board.interpolatePoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
      assert.equal(points.length, 11);
      assert.equal(points[0].x, 0);
      assert.equal(points[5].x, 50);
      assert.equal(points[10].x, 100);

      // Verify no two adjacent points exceed distance threshold
      for (let i = 0; i < points.length - 1; i++) {
        const segDist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
        assert.ok(segDist <= 10.0001, `Segment distance ${segDist} exceeds max threshold`);
      }
    });

    it('handles diagonal vector moves cleanly', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      const points = board.interpolatePoints({ x: 0, y: 0 }, { x: 30, y: 40 }, 5); // hypot = 50 => 11 points
      assert.equal(points.length, 11);
      assert.equal(points[0].x, 0);
      assert.equal(points[0].y, 0);
      assert.equal(points[10].x, 30);
      assert.equal(points[10].y, 40);
    });
  });

  // 5. Catmull-Rom smoothing and path generation
  describe('5. Catmull-Rom smoothing and path generation', () => {
    it('returns empty array for less than 2 points', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      assert.deepEqual(board.catmullRomToBezier([]), []);
      assert.deepEqual(board.catmullRomToBezier([{ x: 10, y: 10 }]), []);
      assert.equal(board.generateSmoothPath([]), '');
      assert.equal(board.generateSmoothPath([{ x: 10, y: 10 }]), 'M 10.00 10.00');
    });

    it('converts two points to a single Bezier line segment', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      const curves = board.catmullRomToBezier([
        { x: 0, y: 0 },
        { x: 30, y: 30 },
      ]);
      assert.equal(curves.length, 1);
      assert.deepEqual(curves[0].p0, { x: 0, y: 0 });
      assert.deepEqual(curves[0].p1, { x: 30, y: 30 });
      assert.equal(curves[0].cp1.x, 10);
      assert.equal(curves[0].cp2.x, 20);
    });

    it('calculates smooth Catmull-Rom Bezier control points for multi-point paths', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      const points = [
        { x: 0, y: 0 },
        { x: 20, y: 40 },
        { x: 60, y: 30 },
        { x: 100, y: 80 },
      ];

      const curves = board.catmullRomToBezier(points);
      assert.equal(curves.length, 3);

      for (const curve of curves) {
        assert.ok(curve.cp1 && typeof curve.cp1.x === 'number');
        assert.ok(curve.cp2 && typeof curve.cp2.y === 'number');
        assert.ok(curve.p1 && typeof curve.p1.x === 'number');
      }

      const svgPath = board.generateSmoothPath(points);
      assert.ok(svgPath.startsWith('M 0.00 0.00'));
      assert.ok(svgPath.includes('C '));
      // Should have 3 cubic Bezier segments
      const cMatches = svgPath.match(/C /g);
      assert.equal(cMatches.length, 3);
    });
  });

  // 6. Undo / Redo boundary limits and redo eviction on new stroke
  describe('6. Undo / Redo boundary limits and redo eviction', () => {
    it('manages undo and redo stacks through additions', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas({ maxHistory: 3 });

      board.addStroke({ tool: 'pen', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] });
      assert.equal(board.strokes.length, 1);
      assert.equal(board.canUndo, true);
      assert.equal(board.canRedo, false);

      board.addStroke({ tool: 'rectangle', start: { x: 0, y: 0 }, end: { x: 50, y: 50 } });
      assert.equal(board.strokes.length, 2);

      // Undo one stroke
      const undone = board.undo();
      assert.equal(undone, true);
      assert.equal(board.strokes.length, 1);
      assert.equal(board.canRedo, true);

      // Redo stroke
      const redone = board.redo();
      assert.equal(redone, true);
      assert.equal(board.strokes.length, 2);
      assert.equal(board.canRedo, false);
    });

    it('evicts redo history when a new stroke is recorded', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      board.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }] });
      board.addStroke({ tool: 'pen', points: [{ x: 2, y: 2 }] });

      board.undo();
      assert.equal(board.canRedo, true);

      // New action evicts redo stack
      board.addStroke({ tool: 'circle', start: { x: 0, y: 0 }, end: { x: 20, y: 20 } });
      assert.equal(board.canRedo, false);
      assert.equal(board.strokes.length, 2);
    });

    it('enforces maximum history capacity bounds through oldest item eviction', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas({ maxHistory: 3 });

      for (let i = 1; i <= 5; i++) {
        board.addStroke({ id: `stroke-${i}`, tool: 'pen', points: [{ x: i, y: i }] });
      }

      assert.equal(board.strokes.length, 5);
      assert.equal(board.undoStackDepth, 3); // Max capacity 3 preserved

      // Undoing 3 times should exhaust undo stack
      assert.equal(board.undo(), true);
      assert.equal(board.undo(), true);
      assert.equal(board.undo(), true);
      assert.equal(board.undo(), false); // Empty stack
      assert.equal(board.canUndo, false);
      assert.equal(board.strokes.length, 2); // Initial 2 strokes remain un-undone
    });

    it('supports clear action with full undo restoration', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      board.addStroke({ tool: 'pen', points: [{ x: 5, y: 5 }] });
      board.addStroke({ tool: 'pen', points: [{ x: 10, y: 10 }] });

      board.clear();
      assert.equal(board.strokes.length, 0);
      assert.equal(board.canUndo, true);

      board.undo();
      assert.equal(board.strokes.length, 2);
    });
  });

  // 7. Vector SVG export generation with valid XML elements
  describe('7. Vector SVG export generation with valid XML elements', () => {
    it('produces valid XML SVG string containing all required vector elements', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas({ width: 1000, height: 700 });

      // Add diverse tools
      board.addStroke({
        tool: 'pen',
        color: SAAS_PALETTE.indigoPrimary,
        strokeWidth: 4,
        points: [{ x: 10, y: 10 }, { x: 50, y: 80 }, { x: 120, y: 40 }],
      });

      board.addStroke({
        tool: 'rectangle',
        color: SAAS_PALETTE.emeraldConversion,
        start: { x: 200, y: 100 },
        end: { x: 350, y: 220 },
      });

      board.addStroke({
        tool: 'circle',
        color: SAAS_PALETTE.amberWarning,
        start: { x: 400, y: 100 },
        end: { x: 500, y: 200 },
      });

      board.addStroke({
        tool: 'arrow',
        color: SAAS_PALETTE.violetAccent,
        start: { x: 150, y: 300 },
        end: { x: 300, y: 300 },
      });

      board.addStroke({
        tool: 'component',
        color: SAAS_PALETTE.violetAccent,
        title: 'Auth Microservice',
        subtitle: 'OAuth2 • JWT Guard',
        start: { x: 550, y: 300 },
        end: { x: 730, y: 380 },
      });

      board.addStroke({
        tool: 'eraser',
        strokeWidth: 5,
        points: [{ x: 80, y: 80 }, { x: 90, y: 90 }],
      });

      const svg = board.exportSVG();

      // Validate XML structure
      assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(svg.endsWith('</svg>'));
      assert.ok(svg.includes('viewBox="0 0 1000 700"'));

      // Validate required elements
      assert.ok(svg.includes('<path d="M 10.00 10.00'), 'Includes smooth vector <path>');
      assert.ok(svg.includes('<rect x="200" y="100"'), 'Includes vector <rect>');
      assert.ok(svg.includes('<circle cx="450" cy="150"'), 'Includes vector <circle>');
      assert.ok(svg.includes('<g class="saas-arrow"'), 'Includes vector arrow group');
      assert.ok(svg.includes('<polygon points="300,300'), 'Includes arrow polygon head');
      assert.ok(svg.includes('<g class="saas-component"'), 'Includes component card');
      assert.ok(svg.includes('Auth Microservice</text>'), 'Includes component <text>');
      assert.ok(svg.includes('OAuth2 • JWT Guard</text>'), 'Includes component subtitle <text>');
    });

    it('escapes XML special characters safely in SVG export', () => {
      assert.equal(escapeXml('<script>alert("xss & fun")</script>'), '&lt;script&gt;alert(&quot;xss &amp; fun&quot;)&lt;/script&gt;');
      assert.equal(escapeXml(null), '');
    });
  });

  // 8. JSON export and import lifecycle
  describe('8. JSON export and import lifecycle', () => {
    it('serializes and deserializes whiteboard state flawlessly', () => {
      const original = new SaaSLaunchpadWhiteboardCanvas({
        width: 1400,
        height: 900,
        template: 'flywheel',
      });

      original.addStroke({
        id: 'stroke-alpha',
        tool: 'component',
        title: 'Stripe Billing Webhook',
        subtitle: 'Conversion Processor',
        start: { x: 100, y: 150 },
        end: { x: 280, y: 230 },
      });

      original.addStroke({
        id: 'stroke-beta',
        tool: 'arrow',
        start: { x: 280, y: 190 },
        end: { x: 420, y: 190 },
      });

      const jsonStr = original.exportJSON();
      assert.ok(typeof jsonStr === 'string');

      const clone = new SaaSLaunchpadWhiteboardCanvas();
      clone.loadJSON(jsonStr);

      assert.equal(clone.width, 1400);
      assert.equal(clone.height, 900);
      assert.equal(clone.template, 'flywheel');
      assert.equal(clone.strokes.length, 2);
      assert.equal(clone.strokes[0].id, 'stroke-alpha');
      assert.equal(clone.strokes[0].title, 'Stripe Billing Webhook');
      assert.equal(clone.strokes[1].tool, 'arrow');
    });

    it('throws informative errors for malformed or missing JSON', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      assert.throws(() => board.loadJSON('{ invalid json'), /Failed to parse whiteboard JSON/);
      assert.throws(() => board.loadJSON({ wrong: 'schema' }), /missing "strokes" array/);
      assert.throws(() => board.loadJSON(null), /loadJSON requires a valid JSON string or object/);
    });
  });

  // 9. Event emitter pattern (on, off, emit)
  describe('9. Event emitter pattern', () => {
    it('registers and emits events with arguments', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      const events = [];

      board.on('tool:change', (payload) => events.push(['tool', payload]));
      board.on('brush:change', (payload) => events.push(['brush', payload]));
      board.on('stroke:add', (stroke) => events.push(['add', stroke]));

      board.setTool('rectangle');
      board.setColor(SAAS_PALETTE.emeraldConversion);
      board.addStroke({ tool: 'rectangle', start: { x: 0, y: 0 }, end: { x: 10, y: 10 } });

      assert.equal(events.length, 3);
      assert.equal(events[0][0], 'tool');
      assert.equal(events[0][1].tool, 'rectangle');
      assert.equal(events[1][0], 'brush');
      assert.equal(events[1][1].color, SAAS_PALETTE.emeraldConversion);
      assert.equal(events[2][0], 'add');
      assert.equal(events[2][1].tool, 'rectangle');
    });

    it('unsubscribes listeners cleanly via off and returned unsubscribe callback', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      let callCount = 0;

      const handler = () => { callCount++; };
      board.on('test-event', handler);
      board.emit('test-event');
      assert.equal(callCount, 1);

      board.off('test-event', handler);
      board.emit('test-event');
      assert.equal(callCount, 1);

      // Unsubscribe callback
      const unsubscribe = board.on('test-event-2', () => { callCount += 10; });
      board.emit('test-event-2');
      assert.equal(callCount, 11);

      unsubscribe();
      board.emit('test-event-2');
      assert.equal(callCount, 11);
    });

    it('supports once() for one-time event subscriptions', () => {
      const board = new SaaSLaunchpadWhiteboardCanvas();
      let triggers = 0;

      board.once('ping', () => { triggers++; });
      board.emit('ping');
      board.emit('ping');
      assert.equal(triggers, 1);
    });
  });

  // 10. Mock 2D context rendering execution without errors
  describe('10. Mock 2D context rendering execution', () => {
    it('renders all strokes onto mock canvas 2D context without runtime errors', () => {
      const mockCtx = createMockContext();
      const board = new SaaSLaunchpadWhiteboardCanvas({ ctx: mockCtx, template: 'funnel' });

      board.addStroke({
        tool: 'pen',
        points: [{ x: 10, y: 10 }, { x: 25, y: 40 }, { x: 80, y: 60 }],
      });

      board.addStroke({
        tool: 'eraser',
        points: [{ x: 30, y: 30 }, { x: 40, y: 40 }],
      });

      board.addStroke({
        tool: 'rectangle',
        start: { x: 10, y: 10 },
        end: { x: 100, y: 80 },
      });

      board.addStroke({
        tool: 'circle',
        start: { x: 120, y: 10 },
        end: { x: 200, y: 90 },
      });

      board.addStroke({
        tool: 'arrow',
        start: { x: 200, y: 50 },
        end: { x: 300, y: 120 },
      });

      board.addStroke({
        tool: 'component',
        title: 'Redis Cluster',
        subtitle: 'Sub-millisecond latency',
        start: { x: 320, y: 50 },
        end: { x: 500, y: 140 },
      });

      assert.doesNotThrow(() => {
        board.render(mockCtx);
      });

      assert.ok(mockCtx.operations.length > 20);
      assert.ok(mockCtx.operations.includes('save'));
      assert.ok(mockCtx.operations.includes('restore'));
      assert.ok(mockCtx.operations.includes('stroke'));
      assert.ok(mockCtx.operations.includes('fill'));
    });

    it('renders alternative templates (flywheel and cloud-arch) cleanly', () => {
      const mockCtx = createMockContext();
      const board = new SaaSLaunchpadWhiteboardCanvas({ ctx: mockCtx });

      board.setTemplate('flywheel');
      assert.doesNotThrow(() => board.render(mockCtx));

      board.setTemplate('cloud-arch');
      assert.doesNotThrow(() => board.render(mockCtx));
    });
  });
});
