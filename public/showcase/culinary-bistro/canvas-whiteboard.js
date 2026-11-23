/**
 * Culinary Bistro - Haute Plating & Kitchen Flow Vector Whiteboard Canvas
 * Production-grade collaborative freehand vector sketchpad & plating layout engine.
 * 
 * Features:
 * - Gourmet bistro palette constants
 * - Tools: pen, eraser, drizzle, garnish, rectangle, circle (with alias normalization)
 * - Distance-based point interpolation avoiding gaps during rapid strokes
 * - Catmull-Rom spline to cubic Bezier curve smoothing
 * - Bounded Undo / Redo history with capacity eviction
 * - Valid vector SVG export (<path>, <circle>, <rect>, <text>)
 * - Structured JSON export & loading lifecycle
 * - Decoupled Event Emitter (on, off, emit)
 * - Mockable 2D Canvas context rendering engine
 * - High-DPI devicePixelRatio and multi-touch/pointer support
 */

export const CULINARY_PALETTE = Object.freeze({
  truffleDark: '#120c0a',
  saffronGold: '#eab308',
  paprikaRed: '#dc2626',
  sageGreen: '#84cc16',
  cremeWhite: '#fefce8',
  copperBronze: '#b45309',
  charcoalPlatter: '#1c1917'
});

export const VALID_TOOLS = Object.freeze([
  'pen',
  'eraser',
  'drizzle',
  'garnish',
  'rectangle',
  'circle'
]);

export const TOOL_ALIASES = Object.freeze({
  brush: 'pen',
  draw: 'pen',
  pencil: 'pen',
  marker: 'pen',
  erase: 'eraser',
  rubber: 'eraser',
  scraper: 'eraser',
  sauce: 'drizzle',
  piping: 'drizzle',
  reduction: 'drizzle',
  coulis: 'drizzle',
  herb: 'garnish',
  sprig: 'garnish',
  leaf: 'garnish',
  callout: 'garnish',
  microgreen: 'garnish',
  flower: 'garnish',
  rect: 'rectangle',
  box: 'rectangle',
  station: 'rectangle',
  square: 'rectangle',
  circ: 'circle',
  cloche: 'circle',
  plate: 'circle',
  oval: 'circle',
  round: 'circle'
});

/**
 * Normalizes input point into { x, y } with numeric validation.
 * @param {Object|Array} p
 * @returns {{x: number, y: number}}
 */
export function parseCoord(p) {
  if (Array.isArray(p)) {
    if (p.length < 2) {
      throw new TypeError('Point array must contain at least 2 elements [x, y]');
    }
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || isNaN(x) || isNaN(y)) {
      throw new TypeError('Point coordinates must be finite numbers');
    }
    return { x, y };
  }

  if (p && typeof p === 'object') {
    const rawX = p.x !== undefined ? p.x : p[0];
    const rawY = p.y !== undefined ? p.y : p[1];
    const x = Number(rawX);
    const y = Number(rawY);
    if (!Number.isFinite(x) || !Number.isFinite(y) || isNaN(x) || isNaN(y)) {
      throw new TypeError('Point coordinates must be finite numbers');
    }
    return { x, y };
  }

  throw new TypeError('Invalid point: expected object {x, y} or array [x, y]');
}

/**
 * Creates a dual-accessible point object { x, y, 0: x, 1: y }
 * @param {number} x
 * @param {number} y
 * @returns {Object}
 */
export function createPoint(x, y) {
  const pt = { x, y };
  Object.defineProperty(pt, 0, { value: x, enumerable: false, configurable: true });
  Object.defineProperty(pt, 1, { value: y, enumerable: false, configurable: true });
  return pt;
}

/**
 * Calculates intermediate points between p1 and p2 such that spacing does not exceed dist.
 * Guaranteed to reach endpoint p2 without gaps.
 * @param {Object|Array} p1
 * @param {Object|Array} p2
 * @param {number} dist Step distance (must be > 0)
 * @returns {Array<Object>}
 */
export function interpolatePoints(p1, p2, dist = 5) {
  const pt1 = parseCoord(p1);
  const pt2 = parseCoord(p2);
  const step = Number(dist);

  if (!Number.isFinite(step) || step <= 0 || isNaN(step)) {
    throw new RangeError('Interpolation distance step must be a positive finite number');
  }

  const dx = pt2.x - pt1.x;
  const dy = pt2.y - pt1.y;
  const totalDist = Math.hypot(dx, dy);

  if (totalDist === 0) {
    return [];
  }

  const count = Math.ceil(totalDist / step);
  const result = [];
  for (let i = 1; i <= count; i++) {
    const t = Math.min(1, i / count);
    const x = Number((pt1.x + dx * t).toFixed(3));
    const y = Number((pt1.y + dy * t).toFixed(3));
    result.push(createPoint(x, y));
  }
  return result;
}

/**
 * Converts a sequence of points into cubic Bezier curve segments via Catmull-Rom formulation.
 * @param {Array<Object|Array>} points
 * @param {number} tension Spline tension factor (default 0.5)
 * @returns {Array<{start: Object, cp1: Object, cp2: Object, end: Object}>}
 */
export function catmullRomToBezier(points, tension = 0.5) {
  if (!Array.isArray(points) || points.length < 2) {
    return [];
  }

  const pts = points.map(parseCoord);
  const segments = [];
  const n = pts.length;
  const factor = (1 - tension) / 6;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < n - 2 ? pts[i + 2] : pts[i + 1];

    const cp1x = p1.x + (p2.x - p0.x) * factor;
    const cp1y = p1.y + (p2.y - p0.y) * factor;
    const cp2x = p2.x - (p3.x - p1.x) * factor;
    const cp2y = p2.y - (p3.y - p1.y) * factor;

    segments.push({
      start: p1,
      cp1: createPoint(Number(cp1x.toFixed(3)), Number(cp1y.toFixed(3))),
      cp2: createPoint(Number(cp2x.toFixed(3)), Number(cp2y.toFixed(3))),
      end: p2
    });
  }

  return segments;
}

/**
 * Escapes characters for safe XML/SVG embedding
 * @param {string} str
 * @returns {string}
 */
export function escapeXml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Validates and normalizes tool name.
 * @param {string} tool
 * @returns {string}
 */
export function normalizeTool(tool) {
  if (typeof tool !== 'string') {
    throw new TypeError('Tool name must be a string');
  }
  const clean = tool.trim().toLowerCase();
  if (VALID_TOOLS.includes(clean)) {
    return clean;
  }
  if (TOOL_ALIASES[clean]) {
    return TOOL_ALIASES[clean];
  }
  throw new Error(`Invalid tool "${tool}". Supported tools: ${VALID_TOOLS.join(', ')}`);
}

/**
 * CulinaryBistroWhiteboardCanvas
 * Core collaborative sketchpad and plating layout engine.
 */
export class CulinaryBistroWhiteboardCanvas {
  static PALETTE = CULINARY_PALETTE;
  static VALID_TOOLS = VALID_TOOLS;
  static TOOL_ALIASES = TOOL_ALIASES;

  /**
   * @param {HTMLCanvasElement|Object|null} canvasOrOptions
   * @param {Object} [options]
   */
  constructor(canvasOrOptions = null, options = {}) {
    let opts = options;
    let canvas = null;

    if (canvasOrOptions && (typeof canvasOrOptions.getContext === 'function' || canvasOrOptions.tagName === 'CANVAS')) {
      canvas = canvasOrOptions;
    } else if (canvasOrOptions && typeof canvasOrOptions === 'object') {
      opts = { ...canvasOrOptions, ...options };
      canvas = opts.canvas || null;
    }

    this.canvas = canvas;
    this.ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;

    // Viewport dimensions
    this.width = opts.width || 960;
    this.height = opts.height || 640;

    // Drawing configuration
    this.tool = opts.tool ? normalizeTool(opts.tool) : 'pen';
    this.activeTool = this.tool;
    this.currentTool = this.tool;

    this.color = opts.color || CULINARY_PALETTE.saffronGold;
    this.activeColor = this.color;
    this.currentColor = this.color;

    this.strokeWidth = opts.strokeWidth || opts.width || 4;
    this.widthValue = this.strokeWidth;
    this.currentWidth = this.strokeWidth;

    this.opacity = opts.opacity !== undefined ? opts.opacity : 1.0;
    this.backgroundColor = opts.backgroundColor || CULINARY_PALETTE.truffleDark;

    // History & State
    this.maxHistory = opts.maxHistory || 50;
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.isDrawing = false;

    // Backdrop template: 'plating' | 'brigade' | 'clean'
    this.template = opts.template || 'plating';

    // Interpolation distance threshold
    this.interpolationThreshold = opts.interpolationThreshold || 6;

    // Event Emitter map
    this.listeners = new Map();

    // Initialize DOM binding if canvas exists
    if (this.canvas) {
      this.initEvents();
      this.resize(this.width, this.height);
    }
  }

  // ==========================================
  // Tool & Brush Customization
  // ==========================================

  /**
   * Updates active drawing tool with alias normalization and error checking.
   * @param {string} tool
   * @returns {string}
   */
  setTool(tool) {
    const normalized = normalizeTool(tool);
    const prev = this.tool;
    this.tool = normalized;
    this.activeTool = normalized;
    this.currentTool = normalized;
    this.emit('toolChange', { tool: normalized, previous: prev });
    return normalized;
  }

  getTool() {
    return this.tool;
  }

  /**
   * Sets active brush color with safety and format validation.
   * @param {string} color
   * @returns {string}
   */
  setColor(color) {
    if (typeof color !== 'string') {
      throw new TypeError('Color must be a string');
    }
    const trimmed = color.trim();
    if (!trimmed) {
      throw new Error('Color cannot be empty');
    }

    if (/<script|onload|onerror|javascript:/i.test(trimmed)) {
      throw new Error('Malicious color string rejected');
    }

    if (/[<>"'`\\]/.test(trimmed)) {
      throw new Error(`Invalid or unsafe color format: ${color}`);
    }

    // Check if color is a theme palette property key
    if (CULINARY_PALETTE[trimmed]) {
      const paletteColor = CULINARY_PALETTE[trimmed];
      this.color = paletteColor;
      this.activeColor = paletteColor;
      this.currentColor = paletteColor;
      this.emit('colorChange', { color: paletteColor });
      return paletteColor;
    }

    const hexMatch = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    const rgbMatch = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+\s*)?\)$/i;
    const hslMatch = /^hsla?\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(\s*,\s*[\d.]+\s*)?\)$/i;
    const validNamedColors = [
      'transparent', 'black', 'white', 'red', 'green', 'blue',
      'yellow', 'gold', 'orange', 'purple', 'brown', 'gray', 'grey'
    ];

    if (!hexMatch.test(trimmed) && !rgbMatch.test(trimmed) && !hslMatch.test(trimmed) && !validNamedColors.includes(trimmed.toLowerCase())) {
      throw new Error(`Invalid color format: "${color}"`);
    }

    const normalized = trimmed.toLowerCase();
    this.color = normalized;
    this.activeColor = normalized;
    this.currentColor = normalized;
    this.emit('colorChange', { color: normalized });
    return normalized;
  }

  getColor() {
    return this.color;
  }

  /**
   * Sets brush stroke width clamped between [1, 64].
   * @param {number} width
   * @returns {number}
   */
  setStrokeWidth(width) {
    const num = Number(width);
    if (!Number.isFinite(num) || isNaN(num) || num <= 0) {
      throw new RangeError('Stroke width must be a positive finite number');
    }
    const clamped = Math.min(64, Math.max(1, Math.round(num)));
    this.strokeWidth = clamped;
    this.widthValue = clamped;
    this.currentWidth = clamped;
    this.emit('strokeWidthChange', { width: clamped });
    this.emit('brushChange', { width: clamped, color: this.color, opacity: this.opacity });
    return clamped;
  }

  setWidth(width) {
    return this.setStrokeWidth(width);
  }

  getStrokeWidth() {
    return this.strokeWidth;
  }

  /**
   * Sets opacity clamped between [0.05, 1.0].
   * @param {number} opacity
   * @returns {number}
   */
  setOpacity(opacity) {
    const num = Number(opacity);
    if (!Number.isFinite(num) || isNaN(num)) {
      throw new RangeError('Opacity must be a finite number between 0 and 1');
    }
    const clamped = Number(Math.min(1.0, Math.max(0.05, num)).toFixed(3));
    this.opacity = clamped;
    this.emit('opacityChange', { opacity: clamped });
    this.emit('brushChange', { width: this.strokeWidth, color: this.color, opacity: clamped });
    return clamped;
  }

  getOpacity() {
    return this.opacity;
  }

  /**
   * Sets template backdrop ('plating', 'brigade', 'clean')
   * @param {string} template
   */
  setTemplate(template) {
    const valid = ['plating', 'brigade', 'clean'];
    if (valid.includes(template)) {
      this.template = template;
      this.emit('templateChange', { template });
      this.redraw();
    }
    return this.template;
  }

  getTemplate() {
    return this.template;
  }

  setMaxHistory(limit) {
    const num = Number(limit);
    if (Number.isFinite(num) && num > 0) {
      this.maxHistory = Math.round(num);
    }
    return this.maxHistory;
  }

  // ==========================================
  // Drawing Lifecycle & Stroke Management
  // ==========================================

  /**
   * Begins a new stroke at coordinates (x, y)
   * @param {number|string} [x=0]
   * @param {number|string} [y=0]
   * @param {Object} [options={}]
   * @returns {Object}
   */
  beginStroke(x = 0, y = 0, options = {}) {
    let startX = 0;
    let startY = 0;

    if (typeof x === 'string') {
      if (x) this.setTool(x);
      if (typeof y === 'string') this.setColor(y);
      if (typeof options === 'number') this.setStrokeWidth(options);
    } else {
      const numX = Number(x);
      const numY = Number(y);
      if (!Number.isFinite(numX) || !Number.isFinite(numY) || isNaN(numX) || isNaN(numY)) {
        throw new TypeError('Stroke coordinates must be finite numbers');
      }
      startX = numX;
      startY = numY;
    }

    this.isDrawing = true;
    this.redoStack = []; // Evict redo branch on new stroke start

    const tool = options.tool || this.tool;
    const color = options.color || this.color;
    const width = options.strokeWidth || options.width || this.strokeWidth;
    const opacity = options.opacity !== undefined ? options.opacity : this.opacity;
    const label = options.label || (tool === 'garnish' ? '🌿 Micro-herb Garnish' : '');

    const startPt = createPoint(startX, startY);

    this.currentStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool,
      color,
      strokeWidth: width,
      width,
      opacity,
      label,
      points: [startPt],
      startX,
      startY,
      endX: startX,
      endY: startY,
      timestamp: Date.now()
    };

    this.emit('strokeStart', this.currentStroke);
    return this.currentStroke;
  }

  startStroke(x, y, options) {
    return this.beginStroke(x, y, options);
  }

  /**
   * Adds a point to current stroke with distance interpolation
   * @param {number} x
   * @param {number} y
   * @returns {Object}
   */
  addPoint(x, y) {
    const numX = Number(x);
    const numY = Number(y);
    if (!Number.isFinite(numX) || !Number.isFinite(numY) || isNaN(numX) || isNaN(numY)) {
      throw new TypeError('Point coordinates must be finite numbers');
    }

    if (!this.isDrawing || !this.currentStroke) {
      this.beginStroke(numX, numY);
      return this.currentStroke.points[0];
    }

    const newPt = createPoint(numX, numY);
    const pts = this.currentStroke.points;
    const lastPt = pts[pts.length - 1];

    if (['pen', 'drizzle', 'eraser'].includes(this.currentStroke.tool)) {
      const dist = Math.hypot(numX - lastPt.x, numY - lastPt.y);
      if (dist >= 1) {
        if (dist > this.interpolationThreshold) {
          const intermediates = interpolatePoints(lastPt, newPt, this.interpolationThreshold);
          for (const p of intermediates) {
            pts.push(p);
          }
        } else {
          pts.push(newPt);
        }
      }
    } else {
      // Geometric shapes (rectangle, circle) or garnish endpoints
      this.currentStroke.endX = numX;
      this.currentStroke.endY = numY;
      if (pts.length === 1) {
        pts.push(newPt);
      } else {
        pts[pts.length - 1] = newPt;
      }
    }

    this.currentStroke.endX = numX;
    this.currentStroke.endY = numY;

    this.emit('strokePoint', { point: newPt, stroke: this.currentStroke });
    if (this.ctx && this.canvas) {
      this.redraw();
    }
    return newPt;
  }

  /**
   * Finishes active stroke, applies smoothing, pushes to history, evicts oldest if bounded.
   * @returns {Object|null}
   */
  endStroke() {
    if (!this.isDrawing || !this.currentStroke) {
      return null;
    }
    this.isDrawing = false;
    const stroke = this.currentStroke;
    this.currentStroke = null;

    if (!stroke.points || stroke.points.length === 0) {
      return null;
    }

    // Generate Catmull-Rom Bezier segments for freehand curves
    if (['pen', 'drizzle'].includes(stroke.tool) && stroke.points.length >= 2) {
      stroke.bezierSegments = catmullRomToBezier(stroke.points);
    }

    this.strokes.push(stroke);
    this.redoStack = []; // Redo branch eviction on committed stroke

    // Enforce history boundary limits
    while (this.strokes.length > this.maxHistory) {
      this.strokes.shift();
    }

    this.emit('strokeEnd', stroke);
    this.emit('change', { action: 'stroke', stroke });

    if (this.ctx && this.canvas) {
      this.redraw();
    }
    return stroke;
  }

  finishStroke() {
    return this.endStroke();
  }

  /**
   * Cancels currently active uncommitted draft stroke.
   * @returns {boolean}
   */
  cancelStroke() {
    if (!this.isDrawing || !this.currentStroke) {
      return false;
    }
    this.isDrawing = false;
    this.currentStroke = null;
    this.emit('strokeCancel');
    if (this.ctx && this.canvas) {
      this.redraw();
    }
    return true;
  }

  // ==========================================
  // Undo, Redo, Clear
  // ==========================================

  /**
   * Undoes the last stroke
   * @returns {boolean}
   */
  undo() {
    if (this.strokes.length === 0) {
      return false;
    }
    const popped = this.strokes.pop();
    this.redoStack.push(popped);
    this.emit('undo', popped);
    this.emit('change', { action: 'undo', stroke: popped });
    if (this.ctx && this.canvas) {
      this.redraw();
    }
    return true;
  }

  /**
   * Redoes the most recently undone stroke
   * @returns {boolean}
   */
  redo() {
    if (this.redoStack.length === 0) {
      return false;
    }
    const restored = this.redoStack.pop();
    this.strokes.push(restored);
    this.emit('redo', restored);
    this.emit('change', { action: 'redo', stroke: restored });
    if (this.ctx && this.canvas) {
      this.redraw();
    }
    return true;
  }

  get canUndo() {
    return this.strokes.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Clears all strokes and redo history
   * @returns {boolean}
   */
  clear() {
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.isDrawing = false;
    this.emit('clear');
    this.emit('change', { action: 'clear' });
    if (this.ctx && this.canvas) {
      this.redraw();
    }
    return true;
  }

  // ==========================================
  // Point Interpolation & Spline Smoothing
  // ==========================================

  interpolatePoints(p1, p2, dist = 5) {
    return interpolatePoints(p1, p2, dist);
  }

  catmullRomToBezier(points, tension = 0.5) {
    return catmullRomToBezier(points, tension);
  }

  // ==========================================
  // 2D Canvas Rendering Engine
  // ==========================================

  /**
   * Renders a single stroke onto a Canvas 2D context.
   * Supports both (stroke, ctx) and (ctx, stroke) call signatures.
   * @param {Object} a
   * @param {Object} [b]
   */
  renderStroke(a, b) {
    let stroke = a;
    let ctx = b;

    if (a && typeof a.beginPath === 'function') {
      ctx = a;
      stroke = b;
    }

    if (!ctx) ctx = this.ctx;
    if (!ctx || !stroke) return;

    const tool = stroke.tool || 'pen';
    const color = stroke.color || CULINARY_PALETTE.saffronGold;
    const width = stroke.strokeWidth || stroke.width || 4;
    const opacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;
    const pts = stroke.points || [];

    if (typeof ctx.save === 'function') ctx.save();
    if (ctx.globalAlpha !== undefined) ctx.globalAlpha = opacity;
    if (ctx.lineWidth !== undefined) ctx.lineWidth = width;
    if (ctx.lineCap !== undefined) ctx.lineCap = 'round';
    if (ctx.lineJoin !== undefined) ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      if (ctx.globalCompositeOperation !== undefined) {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#000000';

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, width * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (pts.length > 1) {
        ctx.lineWidth = width * 3;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
    } else if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (pts.length >= 2) {
        const segments = stroke.bezierSegments || catmullRomToBezier(pts);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        if (segments.length > 0) {
          for (const seg of segments) {
            if (typeof ctx.bezierCurveTo === 'function') {
              ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
            } else {
              ctx.lineTo(seg.end.x, seg.end.y);
            }
          }
        } else {
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
        }
        ctx.stroke();
      }
    } else if (tool === 'drizzle') {
      // Velvety gourmet sauce drizzle with glossy reduction beads at endpoints
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, width * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (pts.length >= 2) {
        const segments = stroke.bezierSegments || catmullRomToBezier(pts);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const seg of segments) {
          if (typeof ctx.bezierCurveTo === 'function') {
            ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
          } else {
            ctx.lineTo(seg.end.x, seg.end.y);
          }
        }
        ctx.stroke();

        // Sauce reduction droplets
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, width * 0.8, 0, Math.PI * 2);
        ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, width * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (tool === 'garnish') {
      // Culinary microgreen garnish with leaf stem, flower buds, and callout text
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      const startX = stroke.startX || (pts[0] ? pts[0].x : 0);
      const startY = stroke.startY || (pts[0] ? pts[0].y : 0);
      const endX = stroke.endX !== undefined ? stroke.endX : (pts[pts.length - 1] ? pts[pts.length - 1].x : startX + 24);
      const endY = stroke.endY !== undefined ? stroke.endY : (pts[pts.length - 1] ? pts[pts.length - 1].y : startY - 24);

      // Microgreen curved stem
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const midX = (startX + endX) / 2 + 10;
      const midY = (startY + endY) / 2 - 10;
      if (typeof ctx.quadraticCurveTo === 'function') {
        ctx.quadraticCurveTo(midX, midY, endX, endY);
      } else {
        ctx.lineTo(endX, endY);
      }
      ctx.stroke();

      // Delicate edible flower/leaf buds
      ctx.beginPath();
      ctx.arc(endX, endY, Math.max(3, width), 0, Math.PI * 2);
      ctx.arc(midX, midY, Math.max(2, width * 0.7), 0, Math.PI * 2);
      ctx.fill();

      // Plating callout label
      if (typeof ctx.fillText === 'function') {
        ctx.font = '12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(stroke.label || '🌿 Micro-herb Garnish', endX + 8, endY - 6);
      }
    } else if (tool === 'rectangle') {
      ctx.strokeStyle = color;
      const startX = stroke.startX || (pts[0] ? pts[0].x : 0);
      const startY = stroke.startY || (pts[0] ? pts[0].y : 0);
      const endX = stroke.endX !== undefined ? stroke.endX : (pts[pts.length - 1] ? pts[pts.length - 1].x : startX);
      const endY = stroke.endY !== undefined ? stroke.endY : (pts[pts.length - 1] ? pts[pts.length - 1].y : startY);

      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const w = Math.abs(endX - startX);
      const h = Math.abs(endY - startY);

      ctx.beginPath();
      if (typeof ctx.strokeRect === 'function') {
        ctx.strokeRect(x, y, w, h);
      } else if (typeof ctx.rect === 'function') {
        ctx.rect(x, y, w, h);
        ctx.stroke();
      }
    } else if (tool === 'circle') {
      ctx.strokeStyle = color;
      const startX = stroke.startX || (pts[0] ? pts[0].x : 0);
      const startY = stroke.startY || (pts[0] ? pts[0].y : 0);
      const endX = stroke.endX !== undefined ? stroke.endX : (pts[pts.length - 1] ? pts[pts.length - 1].x : startX);
      const endY = stroke.endY !== undefined ? stroke.endY : (pts[pts.length - 1] ? pts[pts.length - 1].y : startY);

      const radius = Math.hypot(endX - startX, endY - startY);
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (typeof ctx.restore === 'function') ctx.restore();
  }

  /**
   * Draws template backdrops (Plating Guide, Brigade Flow, Clean Slate)
   * @param {Object} ctx
   * @param {number} width
   * @param {number} height
   */
  drawTemplateBackdrop(ctx, width, height) {
    if (!ctx) return;

    if (this.template === 'plating') {
      if (typeof ctx.save === 'function') ctx.save();
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.lineWidth = 1.5;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([5, 5]);

      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);

      // Concentric plating guideline circles
      ctx.beginPath();
      ctx.arc(cx, cy, minDim * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, minDim * 0.22, 0, Math.PI * 2);
      ctx.stroke();

      // Plating focal center crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy);
      ctx.lineTo(cx + 24, cy);
      ctx.moveTo(cx, cy - 24);
      ctx.lineTo(cx, cy + 24);
      ctx.stroke();

      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
      if (typeof ctx.fillText === 'function') {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
        ctx.font = '11px "Playfair Display", serif';
        ctx.fillText('LUMIÈRE ARTISANAL PLATING RIM', cx - 95, cy + minDim * 0.42 + 20);
        ctx.fillText('FOCAL CENTER', cx - 38, cy - minDim * 0.22 - 10);
      }
      if (typeof ctx.restore === 'function') ctx.restore();
    } else if (this.template === 'brigade') {
      if (typeof ctx.save === 'function') ctx.save();
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
      ctx.lineWidth = 1;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 4]);

      // Kitchen station dividers
      const x1 = width * 0.33;
      const x2 = width * 0.66;
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, height);
      ctx.moveTo(x2, 0);
      ctx.lineTo(x2, height);
      ctx.stroke();

      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
      if (typeof ctx.fillText === 'function') {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.5)';
        ctx.font = '12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('SAUTÉ & GRILL STATION', width * 0.1, 32);
        ctx.fillText('THE PASS / EXPEDITION', width * 0.42, 32);
        ctx.fillText('GARDE MANGER & PASTRY', width * 0.73, 32);
      }
      if (typeof ctx.restore === 'function') ctx.restore();
    }
  }

  /**
   * Redraws all elements on canvas
   * @param {Object} [targetCtx]
   */
  redraw(targetCtx) {
    const ctx = targetCtx || this.ctx;
    if (!ctx) return;

    const w = this.width || 960;
    const h = this.height || 640;

    if (typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, w, h);
    }

    if (typeof ctx.fillRect === 'function') {
      ctx.fillStyle = this.backgroundColor || CULINARY_PALETTE.truffleDark;
      ctx.fillRect(0, 0, w, h);
    }

    this.drawTemplateBackdrop(ctx, w, h);

    for (const stroke of this.strokes) {
      this.renderStroke(stroke, ctx);
    }

    if (this.currentStroke) {
      this.renderStroke(this.currentStroke, ctx);
    }
  }

  // ==========================================
  // SVG Vector Export
  // ==========================================

  /**
   * Converts a stroke into an SVG XML element string.
   * @param {Object} stroke
   * @returns {string}
   */
  strokeToSVG(stroke) {
    if (!stroke) return '';
    const tool = stroke.tool || 'pen';
    const color = stroke.color || CULINARY_PALETTE.saffronGold;
    const width = stroke.strokeWidth || stroke.width || 4;
    const opacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;
    const pts = stroke.points || [];

    if (tool === 'pen' || tool === 'eraser') {
      const strokeColor = tool === 'eraser' ? (this.backgroundColor || CULINARY_PALETTE.truffleDark) : color;
      const strokeW = tool === 'eraser' ? width * 3 : width;

      if (pts.length === 0) return '';
      if (pts.length === 1) {
        return `<circle cx="${pts[0].x.toFixed(2)}" cy="${pts[0].y.toFixed(2)}" r="${(strokeW / 2).toFixed(2)}" fill="${strokeColor}" opacity="${opacity}" />`;
      }

      const segments = stroke.bezierSegments || catmullRomToBezier(pts);
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      if (segments.length > 0) {
        for (const seg of segments) {
          d += ` C ${seg.cp1.x.toFixed(2)} ${seg.cp1.y.toFixed(2)}, ${seg.cp2.x.toFixed(2)} ${seg.cp2.y.toFixed(2)}, ${seg.end.x.toFixed(2)} ${seg.end.y.toFixed(2)}`;
        }
      } else {
        for (let i = 1; i < pts.length; i++) {
          d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
        }
      }

      return `<path d="${d}" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${opacity}" />`;
    }

    if (tool === 'drizzle') {
      if (pts.length === 0) return '';
      if (pts.length === 1) {
        return `<circle cx="${pts[0].x.toFixed(2)}" cy="${pts[0].y.toFixed(2)}" r="${(width * 0.9).toFixed(2)}" fill="${color}" opacity="${opacity}" />`;
      }

      const segments = stroke.bezierSegments || catmullRomToBezier(pts);
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (const seg of segments) {
        d += ` C ${seg.cp1.x.toFixed(2)} ${seg.cp1.y.toFixed(2)}, ${seg.cp2.x.toFixed(2)} ${seg.cp2.y.toFixed(2)}, ${seg.end.x.toFixed(2)} ${seg.end.y.toFixed(2)}`;
      }

      const p0 = pts[0];
      const pn = pts[pts.length - 1];
      const beadR = (width * 0.8).toFixed(2);

      return `<g class="culinary-drizzle" opacity="${opacity}">
    <path d="${d}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="${p0.x.toFixed(2)}" cy="${p0.y.toFixed(2)}" r="${beadR}" fill="${color}" />
    <circle cx="${pn.x.toFixed(2)}" cy="${pn.y.toFixed(2)}" r="${beadR}" fill="${color}" />
  </g>`;
    }

    if (tool === 'garnish') {
      const startX = stroke.startX || (pts[0] ? pts[0].x : 0);
      const startY = stroke.startY || (pts[0] ? pts[0].y : 0);
      const endX = stroke.endX !== undefined ? stroke.endX : (pts[pts.length - 1] ? pts[pts.length - 1].x : startX + 24);
      const endY = stroke.endY !== undefined ? stroke.endY : (pts[pts.length - 1] ? pts[pts.length - 1].y : startY - 24);
      const midX = (startX + endX) / 2 + 10;
      const midY = (startY + endY) / 2 - 10;
      const label = escapeXml(stroke.label || '🌿 Micro-herb Garnish');

      return `<g class="culinary-garnish" opacity="${opacity}">
    <path d="M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none" />
    <circle cx="${endX.toFixed(2)}" cy="${endY.toFixed(2)}" r="${Math.max(3, width)}" fill="${color}" />
    <circle cx="${midX.toFixed(2)}" cy="${midY.toFixed(2)}" r="${Math.max(2, (width * 0.7)).toFixed(2)}" fill="${color}" />
    <text x="${(endX + 8).toFixed(2)}" y="${(endY - 6).toFixed(2)}" fill="${color}" font-family="sans-serif" font-size="12">${label}</text>
  </g>`;
    }

    if (tool === 'rectangle') {
      const startX = stroke.startX || (pts[0] ? pts[0].x : 0);
      const startY = stroke.startY || (pts[0] ? pts[0].y : 0);
      const endX = stroke.endX !== undefined ? stroke.endX : (pts[pts.length - 1] ? pts[pts.length - 1].x : startX);
      const endY = stroke.endY !== undefined ? stroke.endY : (pts[pts.length - 1] ? pts[pts.length - 1].y : startY);

      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const w = Math.abs(endX - startX);
      const h = Math.abs(endY - startY);

      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" stroke="${color}" stroke-width="${width}" fill="none" rx="2" opacity="${opacity}" />`;
    }

    if (tool === 'circle') {
      const startX = stroke.startX || (pts[0] ? pts[0].x : 0);
      const startY = stroke.startY || (pts[0] ? pts[0].y : 0);
      const endX = stroke.endX !== undefined ? stroke.endX : (pts[pts.length - 1] ? pts[pts.length - 1].x : startX);
      const endY = stroke.endY !== undefined ? stroke.endY : (pts[pts.length - 1] ? pts[pts.length - 1].y : startY);
      const radius = Math.hypot(endX - startX, endY - startY);

      return `<circle cx="${startX.toFixed(2)}" cy="${startY.toFixed(2)}" r="${radius.toFixed(2)}" stroke="${color}" stroke-width="${width}" fill="none" opacity="${opacity}" />`;
    }

    return '';
  }

  /**
   * Generates valid, self-contained SVG XML markup.
   * @param {Object} [options]
   * @returns {string}
   */
  exportSVG(options = {}) {
    const width = options.width || this.width || 960;
    const height = options.height || this.height || 640;
    const bg = options.backgroundColor || this.backgroundColor || CULINARY_PALETTE.truffleDark;
    const template = options.template !== undefined ? options.template : this.template;

    const elements = [];
    elements.push(`<rect width="100%" height="100%" fill="${bg}" />`);

    if (template === 'plating') {
      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      elements.push(`<g id="template-plating" stroke="rgba(234, 179, 8, 0.2)" stroke-dasharray="5,5" fill="none">
    <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(minDim * 0.42).toFixed(2)}" stroke-width="1.5" />
    <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(minDim * 0.22).toFixed(2)}" stroke-width="1.5" />
    <line x1="${(cx - 24).toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(cx + 24).toFixed(2)}" y2="${cy.toFixed(2)}" />
    <line x1="${cx.toFixed(2)}" y1="${(cy - 24).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(cy + 24).toFixed(2)}" />
    <text x="${cx.toFixed(2)}" y="${(cy + minDim * 0.42 + 20).toFixed(2)}" fill="rgba(234, 179, 8, 0.45)" font-size="11" text-anchor="middle" font-family="sans-serif">LUMIÈRE ARTISANAL PLATING RIM</text>
  </g>`);
    } else if (template === 'brigade') {
      elements.push(`<g id="template-brigade" stroke="rgba(234, 179, 8, 0.15)" stroke-dasharray="4,4" fill="none">
    <line x1="${(width * 0.33).toFixed(2)}" y1="0" x2="${(width * 0.33).toFixed(2)}" y2="${height.toFixed(2)}" />
    <line x1="${(width * 0.66).toFixed(2)}" y1="0" x2="${(width * 0.66).toFixed(2)}" y2="${height.toFixed(2)}" />
    <text x="${(width * 0.16).toFixed(2)}" y="32" fill="rgba(234, 179, 8, 0.5)" font-size="12" text-anchor="middle" font-family="sans-serif">SAUTÉ &amp; GRILL</text>
    <text x="${(width * 0.5).toFixed(2)}" y="32" fill="rgba(234, 179, 8, 0.5)" font-size="12" text-anchor="middle" font-family="sans-serif">THE PASS / PLATING</text>
    <text x="${(width * 0.83).toFixed(2)}" y="32" fill="rgba(234, 179, 8, 0.5)" font-size="12" text-anchor="middle" font-family="sans-serif">GARDE MANGER &amp; PASTRY</text>
  </g>`);
    }

    for (const stroke of this.strokes) {
      const el = this.strokeToSVG(stroke);
      if (el) elements.push(el);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${elements.join('\n  ')}
</svg>`;
  }

  // ==========================================
  // JSON Serialization Lifecycle
  // ==========================================

  /**
   * Serializes sketchpad state into formatted JSON string.
   * @param {number} [indent=2]
   * @returns {string}
   */
  exportJSON(indent = 2) {
    const payload = {
      version: 1,
      app: 'CulinaryBistroWhiteboardCanvas',
      theme: 'culinary-bistro',
      width: this.width,
      height: this.height,
      template: this.template,
      palette: CULINARY_PALETTE,
      settings: {
        tool: this.tool,
        color: this.color,
        strokeWidth: this.strokeWidth,
        opacity: this.opacity,
        maxHistory: this.maxHistory
      },
      strokes: this.strokes.map(s => ({
        id: s.id,
        tool: s.tool,
        color: s.color,
        strokeWidth: s.strokeWidth,
        width: s.strokeWidth,
        opacity: s.opacity,
        label: s.label,
        startX: s.startX,
        startY: s.startY,
        endX: s.endX,
        endY: s.endY,
        points: (s.points || []).map(p => ({ x: p.x, y: p.y })),
        timestamp: s.timestamp
      }))
    };
    return JSON.stringify(payload, null, indent);
  }

  toJSON() {
    return JSON.parse(this.exportJSON(0));
  }

  /**
   * Loads whiteboard strokes and settings from JSON string or object.
   * @param {string|Object} jsonOrObject
   * @returns {boolean}
   */
  loadJSON(jsonOrObject) {
    let data;
    if (typeof jsonOrObject === 'string') {
      try {
        data = JSON.parse(jsonOrObject);
      } catch (err) {
        throw new Error(`Failed to parse whiteboard JSON: ${err.message}`);
      }
    } else if (jsonOrObject && typeof jsonOrObject === 'object') {
      data = jsonOrObject;
    } else {
      throw new TypeError('loadJSON requires a valid JSON string or object');
    }

    if (!data || !Array.isArray(data.strokes)) {
      throw new Error('Invalid whiteboard data format: missing strokes array');
    }

    if (data.width && typeof data.width === 'number') this.width = data.width;
    if (data.height && typeof data.height === 'number') this.height = data.height;
    if (data.template && typeof data.template === 'string') this.template = data.template;

    if (data.settings) {
      if (data.settings.tool) this.setTool(data.settings.tool);
      if (data.settings.color) this.setColor(data.settings.color);
      if (data.settings.strokeWidth) this.setStrokeWidth(data.settings.strokeWidth);
      if (data.settings.opacity !== undefined) this.setOpacity(data.settings.opacity);
    }

    this.strokes = data.strokes.map(s => {
      const pts = Array.isArray(s.points) ? s.points.map(p => createPoint(Number(p.x), Number(p.y))) : [];
      const stroke = {
        id: s.id || `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tool: s.tool || 'pen',
        color: s.color || this.color,
        strokeWidth: s.strokeWidth || s.width || this.strokeWidth,
        width: s.strokeWidth || s.width || this.strokeWidth,
        opacity: s.opacity !== undefined ? s.opacity : 1.0,
        label: s.label || '',
        startX: s.startX !== undefined ? s.startX : (pts[0] ? pts[0].x : 0),
        startY: s.startY !== undefined ? s.startY : (pts[0] ? pts[0].y : 0),
        endX: s.endX !== undefined ? s.endX : (pts[pts.length - 1] ? pts[pts.length - 1].x : 0),
        endY: s.endY !== undefined ? s.endY : (pts[pts.length - 1] ? pts[pts.length - 1].y : 0),
        points: pts,
        timestamp: s.timestamp || Date.now()
      };
      if (['pen', 'drizzle'].includes(stroke.tool) && pts.length >= 2) {
        stroke.bezierSegments = catmullRomToBezier(pts);
      }
      return stroke;
    });

    this.redoStack = [];
    this.currentStroke = null;
    this.isDrawing = false;

    this.emit('load', data);
    this.emit('change', { action: 'load', data });

    if (this.ctx && this.canvas) {
      this.redraw();
    }
    return true;
  }

  // ==========================================
  // Event Emitter Pattern
  // ==========================================

  /**
   * Subscribes to an event. Returns an unsubscribe function.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function}
   */
  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Event handler must be a function');
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribes handler from event.
   * @param {string} event
   * @param {Function} handler
   * @returns {boolean}
   */
  off(event, handler) {
    if (!this.listeners.has(event)) return false;
    return this.listeners.get(event).delete(handler);
  }

  /**
   * Emits an event with optional arguments.
   * @param {string} event
   * @param  {...any} args
   * @returns {boolean}
   */
  emit(event, ...args) {
    if (!this.listeners.has(event)) return false;
    for (const handler of this.listeners.get(event)) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
    return true;
  }

  // ==========================================
  // DOM Event Listeners & High-DPI Canvas Binding
  // ==========================================

  /**
   * Binds pointer and mouse drawing events to the attached canvas.
   */
  initEvents() {
    if (!this.canvas) return;

    const getCanvasPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const scaleX = (this.canvas.width / dpr) / (rect.width || 1);
      const scaleY = (this.canvas.height / dpr) / (rect.height || 1);

      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      this.beginStroke(pos.x, pos.y);
      if (this.canvas.setPointerCapture && e.pointerId) {
        try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
    };

    const onMove = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      this.addPoint(pos.x, pos.y);
    };

    const onUp = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      this.endStroke();
      if (this.canvas.releasePointerCapture && e.pointerId) {
        try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };

    if (typeof window !== 'undefined' && window.PointerEvent) {
      this.canvas.addEventListener('pointerdown', onDown);
      this.canvas.addEventListener('pointermove', onMove);
      this.canvas.addEventListener('pointerup', onUp);
      this.canvas.addEventListener('pointercancel', onUp);
    } else {
      this.canvas.addEventListener('mousedown', onDown);
      this.canvas.addEventListener('mousemove', onMove);
      this.canvas.addEventListener('mouseup', onUp);
      this.canvas.addEventListener('mouseleave', onUp);
      this.canvas.addEventListener('touchstart', onDown, { passive: false });
      this.canvas.addEventListener('touchmove', onMove, { passive: false });
      this.canvas.addEventListener('touchend', onUp, { passive: false });
    }

    if (typeof window !== 'undefined') {
      this._resizeHandler = () => this.resize();
      window.addEventListener('resize', this._resizeHandler);
    }
  }

  /**
   * Resizes canvas buffer with devicePixelRatio backing store scaling.
   * @param {number} [width]
   * @param {number} [height]
   */
  resize(width, height) {
    if (!this.canvas) return;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const w = width || this.canvas.parentElement?.clientWidth || this.width || 960;
    const h = height || this.canvas.parentElement?.clientHeight || this.height || 640;

    this.width = w;
    this.height = h;

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    if (this.ctx && typeof this.ctx.scale === 'function') {
      if (typeof this.ctx.setTransform === 'function') {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      this.ctx.scale(dpr, dpr);
    }

    this.redraw();
  }

  /**
   * Telemetry and state summary
   * @returns {Object}
   */
  getMetrics() {
    return {
      strokes: this.strokes.length,
      redo: this.redoStack.length,
      tool: this.tool,
      color: this.color,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      template: this.template,
      isDrawing: this.isDrawing
    };
  }

  getSummary() {
    return this.getMetrics();
  }

  /**
   * Clean up listeners
   */
  destroy() {
    this.listeners.clear();
    if (typeof window !== 'undefined' && this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
  }
}

export default CulinaryBistroWhiteboardCanvas;
