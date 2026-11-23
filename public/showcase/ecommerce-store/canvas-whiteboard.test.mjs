import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  EcommerceStoreWhiteboardCanvas,
  COMMERCE_PALETTE,
  VALID_TOOLS,
  TOOL_ALIASES,
  BACKDROP_TEMPLATES
} from './canvas-whiteboard.js';

describe('EcommerceStoreWhiteboardCanvas', () => {
  let whiteboard;

  beforeEach(() => {
    whiteboard = new EcommerceStoreWhiteboardCanvas({
      width: 1200,
      height: 800,
      maxHistory: 50
    });
  });

  // 1. Initialization defaults and palette constants
  describe('1. Initialization defaults and palette constants', () => {
    it('exposes frozen luxury modern commerce palette with exact hex codes', () => {
      assert.equal(COMMERCE_PALETTE.merchantDark, '#0f172a');
      assert.equal(COMMERCE_PALETTE.emeraldCheckout, '#10b981');
      assert.equal(COMMERCE_PALETTE.amberDeal, '#f59e0b');
      assert.equal(COMMERCE_PALETTE.indigoCart, '#6366f1');
      assert.equal(COMMERCE_PALETTE.roseDiscount, '#f43f5e');
      assert.equal(COMMERCE_PALETTE.pureWhite, '#ffffff');
      assert.equal(COMMERCE_PALETTE.slateGrid, '#334155');

      assert.deepEqual(EcommerceStoreWhiteboardCanvas.PALETTE, COMMERCE_PALETTE);
      assert.deepEqual(whiteboard.palette, COMMERCE_PALETTE);
    });

    it('initializes with production defaults', () => {
      assert.equal(whiteboard.getTool(), 'pen');
      assert.equal(whiteboard.currentTool, 'pen');
      assert.equal(whiteboard.getStrokeColor(), COMMERCE_PALETTE.emeraldCheckout);
      assert.equal(whiteboard.getStrokeWidth(), 3);
      assert.equal(whiteboard.getOpacity(), 1.0);
      assert.equal(whiteboard.backdropTemplate, 'none');
      assert.equal(whiteboard.strokes.length, 0);
      assert.equal(whiteboard.maxHistory, 50);
      assert.equal(whiteboard.canUndo(), false);
      assert.equal(whiteboard.canRedo(), false);
    });

    it('defines supported tools and backdrop templates', () => {
      const requiredTools = ['pen', 'eraser', 'arrow', 'component', 'rectangle', 'circle'];
      for (const t of requiredTools) {
        assert.ok(VALID_TOOLS.includes(t), `VALID_TOOLS should contain ${t}`);
      }
      assert.ok(BACKDROP_TEMPLATES.includes('checkout-funnel'));
      assert.ok(BACKDROP_TEMPLATES.includes('merchandising-grid'));
      assert.ok(BACKDROP_TEMPLATES.includes('product-showcase'));
    });
  });

  // 2. Tool mutations, alias normalization, and error handling for invalid tools
  describe('2. Tool mutations, alias normalization, and error handling', () => {
    it('switches between valid tools and emits tool:change event', () => {
      const toolEvents = [];
      whiteboard.on('tool:change', (e) => toolEvents.push(e));

      whiteboard.setTool('rectangle');
      assert.equal(whiteboard.getTool(), 'rectangle');

      whiteboard.setTool('circle');
      assert.equal(whiteboard.getTool(), 'circle');

      whiteboard.setTool('arrow');
      assert.equal(whiteboard.getTool(), 'arrow');

      whiteboard.setTool('component');
      assert.equal(whiteboard.getTool(), 'component');

      assert.equal(toolEvents.length, 4);
      assert.equal(toolEvents[0].tool, 'rectangle');
      assert.equal(toolEvents[0].previousTool, 'pen');
    });

    it('normalizes tool aliases and casing accurately', () => {
      assert.equal(whiteboard.setTool('pencil'), 'pen');
      assert.equal(whiteboard.setTool('BRUSH'), 'pen');
      assert.equal(whiteboard.setTool('erase'), 'eraser');
      assert.equal(whiteboard.setTool('rubber'), 'eraser');
      assert.equal(whiteboard.setTool('rect'), 'rectangle');
      assert.equal(whiteboard.setTool('box'), 'rectangle');
      assert.equal(whiteboard.setTool('square'), 'rectangle');
      assert.equal(whiteboard.setTool('ellipse'), 'circle');
      assert.equal(whiteboard.setTool('dot'), 'circle');
      assert.equal(whiteboard.setTool('card'), 'component');
      assert.equal(whiteboard.setTool('widget'), 'component');
      assert.equal(whiteboard.setTool('line-arrow'), 'arrow');
    });

    it('rejects unsupported or invalid tools with descriptive errors', () => {
      assert.throws(() => {
        whiteboard.setTool('laser-pointer');
      }, /Invalid tool "laser-pointer"/);

      assert.throws(() => {
        whiteboard.setTool('');
      }, TypeError);

      assert.throws(() => {
        whiteboard.setTool(null);
      }, TypeError);
    });
  });

  // 3. Brush customization (color, strokeWidth, opacity) and numeric bounds clamping
  describe('3. Brush customization and numeric bounds clamping', () => {
    it('updates stroke color with validation', () => {
      const colors = [];
      whiteboard.on('color:change', (e) => colors.push(e.color));

      whiteboard.setColor(COMMERCE_PALETTE.indigoCart);
      assert.equal(whiteboard.getStrokeColor(), '#6366f1');

      whiteboard.setColor(COMMERCE_PALETTE.amberDeal);
      assert.equal(whiteboard.getStrokeColor(), '#f59e0b');

      assert.deepEqual(colors, ['#6366f1', '#f59e0b']);

      assert.throws(() => whiteboard.setColor(''), TypeError);
      assert.throws(() => whiteboard.setColor(null), TypeError);
    });

    it('clamps stroke width within [1, 100]', () => {
      whiteboard.setWidth(15);
      assert.equal(whiteboard.getStrokeWidth(), 15);

      // Below lower bound
      whiteboard.setWidth(-10);
      assert.equal(whiteboard.getStrokeWidth(), 1);

      whiteboard.setWidth(0);
      assert.equal(whiteboard.getStrokeWidth(), 1);

      // Above upper bound
      whiteboard.setWidth(250);
      assert.equal(whiteboard.getStrokeWidth(), 100);

      // Fallback on NaN
      whiteboard.setWidth('non-number');
      assert.equal(whiteboard.getStrokeWidth(), 1);
    });

    it('clamps opacity within [0, 1]', () => {
      whiteboard.setOpacity(0.65);
      assert.equal(whiteboard.getOpacity(), 0.65);

      // Underflow
      whiteboard.setOpacity(-0.5);
      assert.equal(whiteboard.getOpacity(), 0);

      // Overflow
      whiteboard.setOpacity(2.5);
      assert.equal(whiteboard.getOpacity(), 1.0);
    });

    it('switches backdrop template and emits template:change', () => {
      let triggered = null;
      whiteboard.on('template:change', (e) => (triggered = e.template));

      whiteboard.setBackdropTemplate('checkout-funnel');
      assert.equal(whiteboard.backdropTemplate, 'checkout-funnel');
      assert.equal(triggered, 'checkout-funnel');

      assert.throws(() => {
        whiteboard.setBackdropTemplate('invalid-template');
      }, /Invalid backdrop template/);
    });
  });

  // 4. Point distance interpolation generating intermediate points without gaps
  describe('4. Point distance interpolation', () => {
    it('generates intermediate points when distance exceeds threshold', () => {
      const p1 = { x: 0, y: 0, pressure: 0.2 };
      const p2 = { x: 30, y: 40, pressure: 0.8 }; // distance = 50
      const interpolated = whiteboard.interpolatePoints(p1, p2, 10);

      // With distance = 50 and step = 10, intermediate points are created
      assert.ok(interpolated.length >= 5, `Expected >= 5 points, got ${interpolated.length}`);
      assert.equal(interpolated[0].x, 0);
      assert.equal(interpolated[0].y, 0);
      assert.equal(interpolated[interpolated.length - 1].x, 30);
      assert.equal(interpolated[interpolated.length - 1].y, 40);

      // Verify no two adjacent points are separated by more than step threshold
      for (let i = 0; i < interpolated.length - 1; i++) {
        const segDist = Math.hypot(
          interpolated[i + 1].x - interpolated[i].x,
          interpolated[i + 1].y - interpolated[i].y
        );
        assert.ok(segDist <= 10.01, `Segment distance ${segDist} exceeds max allowed 10`);
      }
    });

    it('handles identical or close points without division by zero', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 100, y: 100 };
      const result = whiteboard.interpolatePoints(p1, p2, 5);
      assert.equal(result.length, 2);
      assert.equal(result[0].x, 100);
      assert.equal(result[1].x, 100);
    });

    it('handles edge cases with missing or partial point coordinates', () => {
      const res1 = whiteboard.interpolatePoints(null, { x: 10, y: 10 });
      assert.deepEqual(res1, []);

      const p1 = { x: 5, y: 5 };
      const res2 = whiteboard.interpolatePoints(p1, null);
      assert.deepEqual(res2, [{ x: 5, y: 5 }]);
    });
  });

  // 5. Catmull-Rom smoothing and path generation
  describe('5. Catmull-Rom smoothing and path generation', () => {
    it('produces cubic Bezier spline segments from discrete points', () => {
      const points = [
        { x: 10, y: 10 },
        { x: 50, y: 90 },
        { x: 100, y: 40 },
        { x: 160, y: 120 }
      ];

      const segments = whiteboard.catmullRomToBezier(points, 0.5);
      assert.equal(segments.length, 4); // M + 3 cubic curves
      assert.equal(segments[0].type, 'M');
      assert.equal(segments[0].point.x, 10);
      assert.equal(segments[0].point.y, 10);

      for (let i = 1; i < segments.length; i++) {
        assert.equal(segments[i].type, 'C');
        assert.ok(Number.isFinite(segments[i].cp1.x));
        assert.ok(Number.isFinite(segments[i].cp1.y));
        assert.ok(Number.isFinite(segments[i].cp2.x));
        assert.ok(Number.isFinite(segments[i].cp2.y));
        assert.ok(Number.isFinite(segments[i].end.x));
        assert.ok(Number.isFinite(segments[i].end.y));
      }
    });

    it('generates smooth SVG path string starting with M and containing C commands', () => {
      const points = [
        { x: 20, y: 30 },
        { x: 60, y: 80 },
        { x: 110, y: 50 }
      ];

      const pathString = whiteboard.generateSmoothPath(points);
      assert.ok(pathString.startsWith('M 20 30'));
      assert.ok(pathString.includes('C '));
    });

    it('handles degenerate point counts gracefully', () => {
      assert.equal(whiteboard.generateSmoothPath([]), '');
      assert.equal(whiteboard.generateSmoothPath([{ x: 15, y: 25 }]), 'M 15 25');
      assert.equal(whiteboard.generateSmoothPath([{ x: 0, y: 0 }, { x: 50, y: 50 }]), 'M 0 0 L 50 50');
    });
  });

  // 6. Undo / Redo boundary limits and redo eviction on new stroke
  describe('6. Undo / Redo boundary limits and redo eviction', () => {
    it('handles undo and redo with proper state tracking', () => {
      const s1 = whiteboard.addStroke({ tool: 'pen', points: [{ x: 10, y: 10 }] });
      const s2 = whiteboard.addStroke({ tool: 'rectangle', startPoint: { x: 20, y: 20 }, endPoint: { x: 60, y: 60 } });
      const s3 = whiteboard.addStroke({ tool: 'circle', startPoint: { x: 50, y: 50 }, endPoint: { x: 80, y: 80 } });

      assert.equal(whiteboard.strokes.length, 3);
      assert.equal(whiteboard.canUndo(), true);
      assert.equal(whiteboard.canRedo(), false);

      const undone = whiteboard.undo();
      assert.equal(undone.id, s3.id);
      assert.equal(whiteboard.strokes.length, 2);
      assert.equal(whiteboard.canRedo(), true);

      const redone = whiteboard.redo();
      assert.equal(redone.id, s3.id);
      assert.equal(whiteboard.strokes.length, 3);
      assert.equal(whiteboard.canRedo(), false);
    });

    it('clears redo stack upon adding a new stroke (redo eviction)', () => {
      whiteboard.addStroke({ tool: 'pen', points: [{ x: 10, y: 10 }] });
      whiteboard.addStroke({ tool: 'pen', points: [{ x: 20, y: 20 }] });

      whiteboard.undo();
      assert.equal(whiteboard.canRedo(), true);
      assert.equal(whiteboard.redoStack.length, 1);

      // Adding a new stroke must evict the redo stack
      whiteboard.addStroke({ tool: 'arrow', startPoint: { x: 0, y: 0 }, endPoint: { x: 50, y: 50 } });
      assert.equal(whiteboard.canRedo(), false);
      assert.equal(whiteboard.redoStack.length, 0);
    });

    it('enforces boundary limits and does not throw on empty stacks', () => {
      assert.equal(whiteboard.undo(), null);
      assert.equal(whiteboard.redo(), null);

      whiteboard.addStroke({ tool: 'pen', points: [{ x: 5, y: 5 }] });
      whiteboard.undo();
      assert.equal(whiteboard.undo(), null); // boundary check
    });

    it('enforces capacity eviction when strokes exceed maxHistory', () => {
      const smallHistoryCanvas = new EcommerceStoreWhiteboardCanvas({ maxHistory: 3 });

      const s1 = smallHistoryCanvas.addStroke({ tool: 'pen', points: [{ x: 1, y: 1 }] });
      const s2 = smallHistoryCanvas.addStroke({ tool: 'pen', points: [{ x: 2, y: 2 }] });
      const s3 = smallHistoryCanvas.addStroke({ tool: 'pen', points: [{ x: 3, y: 3 }] });
      assert.equal(smallHistoryCanvas.strokes.length, 3);

      const s4 = smallHistoryCanvas.addStroke({ tool: 'pen', points: [{ x: 4, y: 4 }] });
      assert.equal(smallHistoryCanvas.strokes.length, 3);
      assert.equal(smallHistoryCanvas.strokes[0].id, s2.id); // s1 evicted!

      const s5 = smallHistoryCanvas.addStroke({ tool: 'pen', points: [{ x: 5, y: 5 }] });
      assert.equal(smallHistoryCanvas.strokes.length, 3);
      assert.equal(smallHistoryCanvas.strokes[0].id, s3.id); // s2 evicted!
    });
  });

  // 7. Vector SVG export generation with valid XML elements
  describe('7. Vector SVG export generation with valid XML elements', () => {
    it('produces valid XML with path, text, circle, and rect elements', () => {
      whiteboard.setBackdropTemplate('checkout-funnel');

      // Pen stroke
      whiteboard.addStroke({
        tool: 'pen',
        color: COMMERCE_PALETTE.emeraldCheckout,
        strokeWidth: 4,
        points: [{ x: 10, y: 10 }, { x: 50, y: 60 }, { x: 90, y: 20 }]
      });

      // Rectangle stroke
      whiteboard.addStroke({
        tool: 'rectangle',
        color: COMMERCE_PALETTE.indigoCart,
        strokeWidth: 2,
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 250, y: 200 }
      });

      // Circle stroke
      whiteboard.addStroke({
        tool: 'circle',
        color: COMMERCE_PALETTE.amberDeal,
        strokeWidth: 3,
        startPoint: { x: 300, y: 100 },
        endPoint: { x: 360, y: 160 }
      });

      // Arrow stroke
      whiteboard.addStroke({
        tool: 'arrow',
        color: COMMERCE_PALETTE.roseDiscount,
        strokeWidth: 3,
        startPoint: { x: 50, y: 300 },
        endPoint: { x: 150, y: 300 }
      });

      // Component stroke
      whiteboard.addStroke({
        tool: 'component',
        componentType: 'product-card',
        text: 'Limited Edition Sneakers',
        color: COMMERCE_PALETTE.emeraldCheckout,
        startPoint: { x: 400, y: 300 },
        endPoint: { x: 600, y: 450 }
      });

      const svg = whiteboard.exportSVG();

      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
      assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(svg.includes('viewBox="0 0 1200 800"'));

      // Validate required XML elements
      assert.ok(svg.includes('<path '), 'SVG must contain <path> elements');
      assert.ok(svg.includes('<circle '), 'SVG must contain <circle> elements');
      assert.ok(svg.includes('<rect '), 'SVG must contain <rect> elements');
      assert.ok(svg.includes('<text '), 'SVG must contain <text> elements');
      assert.ok(svg.includes('Limited Edition Sneakers'), 'Component title must appear in text element');

      // Basic XML tag pairing balance check
      const openSvg = (svg.match(/<svg/g) || []).length;
      const closeSvg = (svg.match(/<\/svg>/g) || []).length;
      assert.equal(openSvg, closeSvg);

      const openG = (svg.match(/<g[\s>]/g) || []).length;
      const closeG = (svg.match(/<\/g>/g) || []).length;
      assert.equal(openG, closeG);
    });

    it('escapes XML reserved characters in text attributes and labels', () => {
      whiteboard.addStroke({
        tool: 'component',
        text: 'Save 20% & Get "Free" Shipping <VIP>',
        startPoint: { x: 10, y: 10 },
        endPoint: { x: 200, y: 120 }
      });

      const svg = whiteboard.exportSVG();
      assert.ok(svg.includes('&amp;'));
      assert.ok(svg.includes('&quot;'));
      assert.ok(svg.includes('&lt;VIP&gt;'));
      assert.ok(!svg.includes('<VIP>'));
    });
  });

  // 8. JSON export and import lifecycle
  describe('8. JSON export and import lifecycle', () => {
    it('serializes and deserializes canvas state faithfully', () => {
      whiteboard.setBackdropTemplate('merchandising-grid');
      whiteboard.addStroke({
        tool: 'pen',
        color: COMMERCE_PALETTE.amberDeal,
        strokeWidth: 5,
        opacity: 0.85,
        points: [{ x: 12, y: 34 }, { x: 56, y: 78 }]
      });
      whiteboard.addStroke({
        tool: 'component',
        componentType: 'checkout-btn',
        text: 'EXPRESS CHECKOUT',
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 300, y: 180 }
      });

      const serialized = whiteboard.exportJSON({ pretty: true });
      assert.ok(typeof serialized === 'string');

      const parsed = JSON.parse(serialized);
      assert.equal(parsed.appName, 'EcommerceStoreWhiteboardCanvas');
      assert.equal(parsed.version, '1.0.0');
      assert.equal(parsed.backdropTemplate, 'merchandising-grid');
      assert.equal(parsed.strokes.length, 2);

      // Rehydrate in a second canvas instance
      const restored = new EcommerceStoreWhiteboardCanvas();
      const loadResult = restored.loadJSON(serialized);

      assert.equal(loadResult, true);
      assert.equal(restored.backdropTemplate, 'merchandising-grid');
      assert.equal(restored.strokes.length, 2);
      assert.equal(restored.strokes[0].tool, 'pen');
      assert.equal(restored.strokes[0].color, COMMERCE_PALETTE.amberDeal);
      assert.equal(restored.strokes[1].text, 'EXPRESS CHECKOUT');
      assert.equal(restored.canRedo(), false);
    });

    it('rejects malformed JSON strings and invalid schema structures', () => {
      assert.throws(() => {
        whiteboard.loadJSON('{ broken json ...');
      }, /Failed to parse JSON/);

      assert.throws(() => {
        whiteboard.loadJSON({ foo: 'bar' }); // missing strokes array
      }, /Invalid whiteboard data: missing "strokes" array/);

      assert.throws(() => {
        whiteboard.loadJSON(12345);
      }, TypeError);
    });
  });

  // 9. Event emitter pattern (on, off, emit)
  describe('9. Event emitter pattern', () => {
    it('notifies subscribers and allows clean unsubscription', () => {
      let callCount = 0;
      const handler = () => {
        callCount++;
      };

      const unsubscribe = whiteboard.on('stroke:added', handler);
      whiteboard.addStroke({ tool: 'pen', points: [{ x: 0, y: 0 }] });
      assert.equal(callCount, 1);

      whiteboard.addStroke({ tool: 'pen', points: [{ x: 10, y: 10 }] });
      assert.equal(callCount, 2);

      // Unsubscribe via returned function
      unsubscribe();
      whiteboard.addStroke({ tool: 'pen', points: [{ x: 20, y: 20 }] });
      assert.equal(callCount, 2);

      // Unsubscribe via off()
      whiteboard.on('custom:test', handler);
      whiteboard.emit('custom:test');
      assert.equal(callCount, 3);
      whiteboard.off('custom:test', handler);
      whiteboard.emit('custom:test');
      assert.equal(callCount, 3);
    });

    it('isolates listener errors so subsequent listeners execute safely', () => {
      let secondListenerRan = false;
      whiteboard.on('safe-test', () => {
        throw new Error('Listener failure');
      });
      whiteboard.on('safe-test', () => {
        secondListenerRan = true;
      });

      whiteboard.emit('safe-test');
      assert.equal(secondListenerRan, true);
    });
  });

  // 10. Mock 2D context rendering execution without errors
  describe('10. Mock 2D context rendering execution without errors', () => {
    it('executes full render lifecycle against mockable 2D context across all tools and templates', () => {
      const calls = [];
      const createMockCtx = () => ({
        save: () => calls.push('save'),
        restore: () => calls.push('restore'),
        beginPath: () => calls.push('beginPath'),
        moveTo: (x, y) => calls.push(`moveTo(${x},${y})`),
        lineTo: (x, y) => calls.push(`lineTo(${x},${y})`),
        bezierCurveTo: () => calls.push('bezierCurveTo'),
        arc: () => calls.push('arc'),
        rect: () => calls.push('rect'),
        fillRect: () => calls.push('fillRect'),
        strokeRect: () => calls.push('strokeRect'),
        clearRect: () => calls.push('clearRect'),
        stroke: () => calls.push('stroke'),
        fill: () => calls.push('fill'),
        fillText: (txt) => calls.push(`fillText(${txt})`),
        setLineDash: () => calls.push('setLineDash'),
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        lineCap: 'round',
        lineJoin: 'round',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        font: ''
      });

      const mockCtx = createMockCtx();

      // Add a stroke for every supported tool
      whiteboard.addStroke({ tool: 'pen', points: [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 30, y: 40 }] });
      whiteboard.addStroke({ tool: 'eraser', points: [{ x: 5, y: 5 }, { x: 15, y: 25 }] });
      whiteboard.addStroke({ tool: 'arrow', startPoint: { x: 10, y: 10 }, endPoint: { x: 50, y: 50 } });
      whiteboard.addStroke({ tool: 'rectangle', startPoint: { x: 60, y: 60 }, endPoint: { x: 120, y: 120 } });
      whiteboard.addStroke({ tool: 'circle', startPoint: { x: 130, y: 130 }, endPoint: { x: 180, y: 180 } });
      whiteboard.addStroke({ tool: 'component', componentType: 'product-card', text: 'Tote Bag', startPoint: { x: 200, y: 200 }, endPoint: { x: 350, y: 320 } });

      // Render with no template
      assert.doesNotThrow(() => {
        whiteboard.render(mockCtx);
      });
      assert.ok(calls.includes('save'));
      assert.ok(calls.includes('restore'));
      assert.ok(calls.includes('beginPath'));
      assert.ok(calls.includes('stroke'));

      // Render with checkout-funnel backdrop
      whiteboard.setBackdropTemplate('checkout-funnel');
      assert.doesNotThrow(() => {
        whiteboard.render(mockCtx);
      });
      assert.ok(calls.includes('fillText(CHECKOUT FUNNEL ARCHITECTURE)'));

      // Render with merchandising-grid backdrop
      whiteboard.setBackdropTemplate('merchandising-grid');
      assert.doesNotThrow(() => {
        whiteboard.render(mockCtx);
      });
      assert.ok(calls.includes('fillText(MERCHANDISING CAMPAIGN GRID)'));

      // Render with product-showcase backdrop
      whiteboard.setBackdropTemplate('product-showcase');
      assert.doesNotThrow(() => {
        whiteboard.render(mockCtx);
      });
      assert.ok(calls.includes('fillText(PRODUCT SHOWCASE WIREFRAME)'));
    });
  });
});
