/**
 * GamingEsportsWhiteboardCanvas
 * Production-grade vector whiteboard & collaborative esports strategy sketchpad for Gaming Esports Hub.
 * Features:
 * - Catmull-Rom spline smoothing to cubic Bezier curve control points
 * - Distance-based point interpolation without gaps
 * - Tactical esports tools: pen, eraser, ping, route, rectangle, circle
 * - Cyberpunk / neon esports palette
 * - Bounded Undo / Redo history with capacity eviction
 * - Vector SVG export with valid XML (<svg>, <path>, <text>, <circle>, <rect>)
 * - JSON serialization and hydration lifecycle
 * - Event emitter pattern (on, off, emit)
 * - Mockable 2D canvas context render engine
 * - DevicePixelRatio High-DPI handling & responsive PointerEvent bindings
 */

export const PALETTE = {
  neonCyan: '#00ffcc',
  electricPink: '#ff0055',
  amberGold: '#ffaa00',
  plasmaPurple: '#8b5cf6',
  matrixGreen: '#10b981',
  tacticalDark: '#0a0e17'
};

export const THEME_PALETTE = PALETTE;

export const VALID_TOOLS = ['pen', 'eraser', 'ping', 'route', 'rectangle', 'circle'];

export const TOOL_ALIASES = {
  brush: 'pen',
  pencil: 'pen',
  freehand: 'pen',
  draw: 'pen',
  erase: 'eraser',
  marker: 'ping',
  beacon: 'ping',
  point: 'ping',
  target: 'ping',
  line: 'route',
  arrow: 'route',
  path: 'route',
  rect: 'rectangle',
  box: 'rectangle',
  square: 'rectangle',
  circ: 'circle',
  oval: 'circle',
  ring: 'circle'
};

/**
 * Normalizes tool name and resolves aliases.
 * Throws error on invalid tool input.
 * @param {string} tool
 * @returns {string}
 */
export function normalizeTool(tool) {
  if (typeof tool !== 'string') {
    throw new TypeError(`Tool name must be a string, received ${typeof tool}`);
  }
  const clean = tool.trim().toLowerCase();
  if (VALID_TOOLS.includes(clean)) {
    return clean;
  }
  if (TOOL_ALIASES[clean]) {
    return TOOL_ALIASES[clean];
  }
  throw new Error(`Invalid tool: "${tool}". Supported tools: ${VALID_TOOLS.join(', ')}`);
}

/**
 * Calculates Euclidean distance between two 2D points.
 * @param {{x: number, y: number}} p1
 * @param {{x: number, y: number}} p2
 * @returns {number}
 */
export function calculateDistance(p1, p2) {
  if (!p1 || !p2) return 0;
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Interpolates points between p1 and p2 such that no adjacent points
 * are separated by more than maxDist.
 * @param {{x: number, y: number}} p1
 * @param {{x: number, y: number}} p2
 * @param {number} [dist=5]
 * @returns {Array<{x: number, y: number}>}
 */
export function interpolatePoints(p1, p2, dist = 5) {
  if (!p1 && !p2) return [];
  if (!p1) return [{ x: p2.x, y: p2.y }];
  if (!p2) return [{ x: p1.x, y: p1.y }];

  const maxDist = Math.max(0.1, Number(dist) || 5);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const totalDist = Math.hypot(dx, dy);

  if (totalDist <= maxDist) {
    return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
  }

  const steps = Math.ceil(totalDist / maxDist);
  const interpolated = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    interpolated.push({
      x: Number((p1.x + dx * t).toFixed(3)),
      y: Number((p1.y + dy * t).toFixed(3))
    });
  }
  return interpolated;
}

/**
 * Converts a sequence of points into smooth cubic Bezier curve segments
 * using Catmull-Rom spline control points.
 * @param {Array<{x: number, y: number}>} points
 * @returns {Array<{cp1: {x: number, y: number}, cp2: {x: number, y: number}, end: {x: number, y: number}}>}
 */
export function catmullRomToBezier(points) {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (points.length === 1) {
    return [{ cp1: { ...points[0] }, cp2: { ...points[0] }, end: { ...points[0] } }];
  }
  if (points.length === 2) {
    return [{
      cp1: {
        x: Number(((points[0].x * 2 + points[1].x) / 3).toFixed(3)),
        y: Number(((points[0].y * 2 + points[1].y) / 3).toFixed(3))
      },
      cp2: {
        x: Number(((points[0].x + points[1].x * 2) / 3).toFixed(3)),
        y: Number(((points[0].y + points[1].y * 2) / 3).toFixed(3))
      },
      end: { ...points[1] }
    }];
  }

  const curves = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1 = {
      x: Number((p1.x + (p2.x - p0.x) / 6).toFixed(3)),
      y: Number((p1.y + (p2.y - p0.y) / 6).toFixed(3))
    };
    const cp2 = {
      x: Number((p2.x - (p3.x - p1.x) / 6).toFixed(3)),
      y: Number((p2.y - (p3.y - p1.y) / 6).toFixed(3))
    };
    curves.push({ cp1, cp2, end: { ...p2 } });
  }
  return curves;
}

/**
 * Builds an SVG path string from points using Catmull-Rom Bezier curves.
 * @param {Array<{x: number, y: number}>} points
 * @returns {string}
 */
export function pointsToSmoothSvgPath(points) {
  if (!Array.isArray(points) || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }
  const curves = catmullRomToBezier(points);
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (const seg of curves) {
    d += ` C ${seg.cp1.x.toFixed(2)} ${seg.cp1.y.toFixed(2)}, ${seg.cp2.x.toFixed(2)} ${seg.cp2.y.toFixed(2)}, ${seg.end.x.toFixed(2)} ${seg.end.y.toFixed(2)}`;
  }
  return d;
}

export class GamingEsportsWhiteboardCanvas {
  /**
   * @param {HTMLCanvasElement|null} canvas
   * @param {Object} [options={}]
   */
  constructor(canvas = null, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;

    // Configuration & limits
    this.maxHistory = Math.max(1, Math.min(500, Number(options.maxHistory) || 50));
    this.minPointDistance = Math.max(1, Number(options.minPointDistance) || 3);
    this.backgroundColor = options.backgroundColor || PALETTE.tacticalDark;
    this.backdrop = options.backdrop || 'grid'; // 'grid', 'moba', 'defusal', 'blank'

    // Brush & Tool state
    this.currentTool = normalizeTool(options.tool || 'pen');
    this.currentColor = options.color || PALETTE.neonCyan;
    this.strokeWidth = Math.max(1, Math.min(100, Number(options.strokeWidth ?? options.width ?? 3)));
    this.opacity = Math.max(0.01, Math.min(1.0, Number(options.opacity ?? 1.0)));
    this.pingLabel = options.pingLabel || 'PING';

    // Canvas dimensions
    this.width = options.width || (canvas ? canvas.width : 900);
    this.height = options.height || (canvas ? canvas.height : 540);

    // Drawing state
    this.isDrawing = false;
    this.currentStroke = null;

    // History stacks
    this.strokes = [];
    this.redoStack = [];

    // Event listeners map
    this._listeners = new Map();

    // Initialize DOM handlers if running in a browser environment
    if (this.canvas) {
      this.initEvents();
      this.resize();
    }
  }

  // --- EVENT EMITTER PATTERN ---

  /**
   * Register an event listener.
   * @param {string} event
   * @param {Function} listener
   */
  on(event, listener) {
    if (typeof listener !== 'function') return this;
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(listener);
    return this;
  }

  /**
   * Unregister an event listener.
   * @param {string} event
   * @param {Function} [listener]
   */
  off(event, listener) {
    if (!this._listeners.has(event)) return this;
    if (!listener) {
      this._listeners.delete(event);
    } else {
      this._listeners.get(event).delete(listener);
    }
    return this;
  }

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   * @param {...*} args
   */
  emit(event, ...args) {
    if (!this._listeners.has(event)) return false;
    for (const listener of Array.from(this._listeners.get(event))) {
      try {
        listener(...args);
      } catch (err) {
        console.error(`Error in whiteboard event listener [${event}]:`, err);
      }
    }
    return true;
  }

  // --- TOOL & BRUSH MUTATIONS ---

  /**
   * Set active drawing tool with alias normalization and validation.
   * @param {string} tool
   * @returns {string}
   */
  setTool(tool) {
    const nextTool = normalizeTool(tool);
    this.currentTool = nextTool;
    this.emit('tool:change', this.currentTool);
    return this.currentTool;
  }

  /**
   * Set active stroke color.
   * @param {string} color
   * @returns {string}
   */
  setColor(color) {
    if (typeof color === 'string' && color.trim()) {
      this.currentColor = color.trim();
      this.emit('color:change', this.currentColor);
    }
    return this.currentColor;
  }

  /**
   * Set stroke width with boundary clamping [1, 100].
   * @param {number} width
   * @returns {number}
   */
  setStrokeWidth(width) {
    const num = Number(width);
    if (Number.isFinite(num)) {
      this.strokeWidth = Math.max(1, Math.min(100, Math.round(num)));
      this.emit('width:change', this.strokeWidth);
    }
    return this.strokeWidth;
  }

  /**
   * Alias for setStrokeWidth.
   * @param {number} width
   * @returns {number}
   */
  setWidth(width) {
    return this.setStrokeWidth(width);
  }

  /**
   * Set stroke opacity with boundary clamping [0.01, 1.0].
   * @param {number} opacity
   * @returns {number}
   */
  setOpacity(opacity) {
    const num = Number(opacity);
    if (Number.isFinite(num)) {
      this.opacity = Math.max(0.01, Math.min(1.0, Number(num.toFixed(2))));
      this.emit('opacity:change', this.opacity);
    }
    return this.opacity;
  }

  /**
   * Set tactical ping badge label (e.g. DEFEND, ATTACK, DANGER).
   * @param {string} label
   */
  setPingLabel(label) {
    if (typeof label === 'string') {
      this.pingLabel = label.trim().toUpperCase() || 'PING';
    }
    return this.pingLabel;
  }

  /**
   * Set backdrop template.
   * @param {'grid'|'moba'|'defusal'|'blank'} backdrop
   */
  setBackdrop(backdrop) {
    const clean = String(backdrop || 'blank').toLowerCase().trim();
    if (['grid', 'moba', 'defusal', 'blank'].includes(clean)) {
      this.backdrop = clean;
      this.emit('backdrop:change', this.backdrop);
      this.redraw();
    }
    return this.backdrop;
  }

  // --- DRAWING & STROKE LIFECYCLE ---

  /**
   * Start a new stroke at coordinates (x, y).
   * @param {number} x
   * @param {number} y
   * @returns {Object}
   */
  startStroke(x, y) {
    this.isDrawing = true;
    this.redoStack = []; // Evict redo history on new action

    const pt = { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
    this.currentStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tool: this.currentTool,
      color: this.currentColor,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      label: this.pingLabel,
      points: [pt],
      startX: pt.x,
      startY: pt.y,
      endX: pt.x,
      endY: pt.y,
      timestamp: Date.now()
    };

    this.emit('stroke:start', this.currentStroke);
    return this.currentStroke;
  }

  /**
   * Add a point to the active stroke.
   * Interpolates points when distance exceeds minPointDistance.
   * @param {number} x
   * @param {number} y
   */
  addPoint(x, y) {
    if (!this.isDrawing || !this.currentStroke) return;

    const pt = { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
    const pts = this.currentStroke.points;
    const lastPt = pts[pts.length - 1];

    if (this.currentTool === 'pen' || this.currentTool === 'eraser' || this.currentTool === 'route') {
      const dist = calculateDistance(lastPt, pt);
      if (dist >= this.minPointDistance) {
        pts.push(pt);
      }
    }

    this.currentStroke.endX = pt.x;
    this.currentStroke.endY = pt.y;
    this.emit('stroke:add', { x: pt.x, y: pt.y, stroke: this.currentStroke });
  }

  /**
   * Complete active stroke, commit to strokes history with capacity eviction.
   * @returns {Object|null}
   */
  endStroke() {
    if (!this.isDrawing || !this.currentStroke) return null;
    this.isDrawing = false;

    const finished = this.currentStroke;
    this.currentStroke = null;

    this.strokes.push(finished);

    // Bounded history: evict oldest stroke when exceeding maxHistory
    if (this.strokes.length > this.maxHistory) {
      this.strokes.shift();
    }

    this.emit('stroke:end', finished);
    return finished;
  }

  // --- UNDO / REDO / CLEAR ---

  /**
   * Undo most recent stroke.
   * @returns {boolean}
   */
  undo() {
    if (this.strokes.length === 0) return false;
    const stroke = this.strokes.pop();
    this.redoStack.push(stroke);
    this.emit('undo', { stroke, remaining: this.strokes.length });
    this.redraw();
    return true;
  }

  /**
   * Redo most recently undone stroke.
   * @returns {boolean}
   */
  redo() {
    if (this.redoStack.length === 0) return false;
    const stroke = this.redoStack.pop();
    this.strokes.push(stroke);
    this.emit('redo', { stroke, remaining: this.redoStack.length });
    this.redraw();
    return true;
  }

  /**
   * Clear all strokes.
   * @returns {boolean}
   */
  clear() {
    if (this.strokes.length === 0 && this.redoStack.length === 0) return false;
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.isDrawing = false;
    this.emit('clear');
    this.redraw();
    return true;
  }

  // --- POINT INTERPOLATION & SMOOTHING DELEGATES ---

  interpolatePoints(p1, p2, dist = 5) {
    return interpolatePoints(p1, p2, dist);
  }

  static interpolatePoints(p1, p2, dist = 5) {
    return interpolatePoints(p1, p2, dist);
  }

  catmullRomToBezier(points) {
    return catmullRomToBezier(points);
  }

  // --- MOCKABLE 2D CONTEXT RENDER ENGINE ---

  /**
   * Renders a stroke onto a 2D canvas context.
   * Tolerates both (stroke, ctx) and (ctx, stroke) signatures for maximum developer ergonomic compatibility.
   * @param {Object} arg1
   * @param {Object} [arg2]
   */
  renderStroke(arg1, arg2) {
    let stroke, ctx;
    if (arg1 && typeof arg1.beginPath === 'function') {
      ctx = arg1;
      stroke = arg2;
    } else {
      stroke = arg1;
      ctx = arg2 || this.ctx;
    }

    if (!stroke || !ctx) return;

    ctx.save();
    ctx.lineWidth = stroke.strokeWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = stroke.opacity ?? 1.0;
    ctx.strokeStyle = stroke.color || PALETTE.neonCyan;

    if (stroke.tool === 'pen') {
      const pts = stroke.points;
      if (pts && pts.length > 0) {
        ctx.beginPath();
        if (pts.length === 1) {
          ctx.arc(pts[0].x, pts[0].y, Math.max(1, (stroke.strokeWidth || 3) / 2), 0, Math.PI * 2);
          ctx.fillStyle = stroke.color || PALETTE.neonCyan;
          ctx.fill();
        } else {
          ctx.moveTo(pts[0].x, pts[0].y);
          const curves = catmullRomToBezier(pts);
          for (const seg of curves) {
            ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
          }
          ctx.stroke();
        }
      }
    } else if (stroke.tool === 'eraser') {
      ctx.lineWidth = (stroke.strokeWidth || 3) * 4;
      ctx.strokeStyle = this.backgroundColor;
      const pts = stroke.points;
      if (pts && pts.length > 0) {
        ctx.beginPath();
        if (pts.length === 1) {
          ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = this.backgroundColor;
          ctx.fill();
        } else {
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();
        }
      }
    } else if (stroke.tool === 'route') {
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([8, 5]);
      }
      ctx.beginPath();
      const pts = stroke.points;
      if (pts && pts.length > 1) {
        ctx.moveTo(pts[0].x, pts[0].y);
        const curves = catmullRomToBezier(pts);
        for (const seg of curves) {
          ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
        }
        ctx.stroke();
        const pLast = pts[pts.length - 1];
        const pPrev = pts[pts.length - 2] || pts[0];
        const angle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
        this._renderArrowHead(ctx, pLast.x, pLast.y, angle, stroke.color, stroke.strokeWidth);
      } else {
        ctx.moveTo(stroke.startX, stroke.startY);
        ctx.lineTo(stroke.endX, stroke.endY);
        ctx.stroke();
        const angle = Math.atan2(stroke.endY - stroke.startY, stroke.endX - stroke.startX);
        this._renderArrowHead(ctx, stroke.endX, stroke.endY, angle, stroke.color, stroke.strokeWidth);
      }
    } else if (stroke.tool === 'ping') {
      const x = stroke.startX;
      const y = stroke.startY;

      // Outer radar pulse circle
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Inner solid target node
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();

      // Crosshair ticks
      ctx.beginPath();
      ctx.moveTo(x - 22, y); ctx.lineTo(x - 12, y);
      ctx.moveTo(x + 12, y); ctx.lineTo(x + 22, y);
      ctx.moveTo(x, y - 22); ctx.lineTo(x, y - 12);
      ctx.moveTo(x, y + 12); ctx.lineTo(x, y + 22);
      ctx.stroke();

      // Tactical text label
      if (typeof ctx.fillText === 'function') {
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.fillStyle = stroke.color;
        if (ctx.textAlign !== undefined) ctx.textAlign = 'center';
        ctx.fillText(stroke.label || 'PING', x, y - 26);
      }
    } else if (stroke.tool === 'rectangle') {
      const rx = Math.min(stroke.startX, stroke.endX);
      const ry = Math.min(stroke.startY, stroke.endY);
      const rw = Math.abs(stroke.endX - stroke.startX);
      const rh = Math.abs(stroke.endY - stroke.startY);

      ctx.beginPath();
      ctx.strokeRect(rx, ry, rw, rh);

      // Subtle tactical area fill
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = (stroke.opacity ?? 1.0) * 0.15;
      ctx.fillRect(rx, ry, rw, rh);
    } else if (stroke.tool === 'circle') {
      const radius = calculateDistance(
        { x: stroke.startX, y: stroke.startY },
        { x: stroke.endX, y: stroke.endY }
      );
      ctx.beginPath();
      ctx.arc(stroke.startX, stroke.startY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Subtle zone fill
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = (stroke.opacity ?? 1.0) * 0.15;
      ctx.fill();
    }

    ctx.restore();
  }

  _renderArrowHead(ctx, x, y, angle, color, strokeWidth) {
    const headLen = Math.max(10, (strokeWidth || 3) * 3);
    ctx.save();
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - headLen * Math.cos(angle - Math.PI / 6),
      y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x - headLen * Math.cos(angle + Math.PI / 6),
      y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Redraw all committed strokes, backdrop, and active stroke.
   */
  redraw() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.save();
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw tactical template backdrop
    this._renderBackdrop(this.ctx, this.width, this.height);

    // Draw historical strokes
    for (const stroke of this.strokes) {
      this.renderStroke(stroke, this.ctx);
    }

    // Draw active stroke in progress
    if (this.currentStroke) {
      this.renderStroke(this.currentStroke, this.ctx);
    }

    this.ctx.restore();
  }

  _renderBackdrop(ctx, w, h) {
    if (this.backdrop === 'grid') {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.06)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y);
        ctx.stroke();
      }
      // Grid coordinates
      ctx.fillStyle = 'rgba(0, 255, 204, 0.2)';
      ctx.font = '9px monospace';
      for (let x = step * 2; x < w; x += step * 3) {
        for (let y = step * 2; y < h; y += step * 3) {
          ctx.fillText(`${Math.round(x)},${Math.round(y)}`, x + 3, y - 3);
        }
      }
      ctx.restore();
    } else if (this.backdrop === 'moba') {
      ctx.save();
      // River diagonal
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 36;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.9);
      ctx.lineTo(w, h * 0.1);
      ctx.stroke();

      // Top Lane
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.9);
      ctx.lineTo(w * 0.1, h * 0.15);
      ctx.lineTo(w * 0.9, h * 0.15);
      ctx.stroke();

      // Mid Lane
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.9);
      ctx.lineTo(w * 0.9, h * 0.15);
      ctx.stroke();

      // Bot Lane
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.9);
      ctx.lineTo(w * 0.9, h * 0.9);
      ctx.lineTo(w * 0.9, h * 0.15);
      ctx.stroke();

      // Bases
      ctx.fillStyle = 'rgba(0, 255, 204, 0.3)';
      ctx.beginPath(); ctx.arc(w * 0.1, h * 0.9, 32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
      ctx.beginPath(); ctx.arc(w * 0.9, h * 0.15, 32, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (this.backdrop === 'defusal') {
      ctx.save();
      // Site A Box
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.7, h * 0.2, w * 0.18, h * 0.25);
      ctx.fillStyle = 'rgba(255, 170, 0, 0.1)';
      ctx.fillRect(w * 0.7, h * 0.2, w * 0.18, h * 0.25);
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('SITE A', w * 0.75, h * 0.34);

      // Site B Box
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.5)';
      ctx.strokeRect(w * 0.12, h * 0.2, w * 0.18, h * 0.25);
      ctx.fillStyle = 'rgba(0, 255, 204, 0.1)';
      ctx.fillRect(w * 0.12, h * 0.2, w * 0.18, h * 0.25);
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('SITE B', w * 0.17, h * 0.34);

      // Mid corridor
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.42, h * 0.15, w * 0.16, h * 0.65);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '12px sans-serif';
      ctx.fillText('MID CORRIDOR', w * 0.44, h * 0.48);

      // T / CT Spawns
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillText('[T SPAWN]', w * 0.46, h * 0.88);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fillText('[CT SPAWN]', w * 0.45, h * 0.08);
      ctx.restore();
    }
  }

  // --- SVG EXPORT ENGINE ---

  /**
   * Serialize individual stroke to valid XML SVG element.
   * @param {Object} stroke
   * @returns {string}
   */
  strokeToSVG(stroke) {
    if (!stroke) return '';

    if (stroke.tool === 'pen') {
      const pts = stroke.points;
      if (!pts || pts.length === 0) return '';
      if (pts.length === 1) {
        return `<circle cx="${pts[0].x.toFixed(2)}" cy="${pts[0].y.toFixed(2)}" r="${(stroke.strokeWidth / 2).toFixed(2)}" fill="${stroke.color}" opacity="${stroke.opacity}" />`;
      }
      const d = pointsToSmoothSvgPath(pts);
      return `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${stroke.opacity}" />`;
    }

    if (stroke.tool === 'eraser') {
      const pts = stroke.points;
      if (!pts || pts.length === 0) return '';
      const d = pointsToSmoothSvgPath(pts);
      return `<path d="${d}" stroke="${this.backgroundColor}" stroke-width="${stroke.strokeWidth * 4}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`;
    }

    if (stroke.tool === 'route') {
      const pts = stroke.points;
      let d = '';
      let endX = stroke.endX;
      let endY = stroke.endY;
      let angle = 0;

      if (pts && pts.length > 1) {
        d = pointsToSmoothSvgPath(pts);
        const pLast = pts[pts.length - 1];
        const pPrev = pts[pts.length - 2] || pts[0];
        endX = pLast.x;
        endY = pLast.y;
        angle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
      } else {
        d = `M ${stroke.startX.toFixed(2)} ${stroke.startY.toFixed(2)} L ${stroke.endX.toFixed(2)} ${stroke.endY.toFixed(2)}`;
        angle = Math.atan2(stroke.endY - stroke.startY, stroke.endX - stroke.startX);
      }

      const headLen = Math.max(10, stroke.strokeWidth * 3);
      const a1x = (endX - headLen * Math.cos(angle - Math.PI / 6)).toFixed(2);
      const a1y = (endY - headLen * Math.sin(angle - Math.PI / 6)).toFixed(2);
      const a2x = (endX - headLen * Math.cos(angle + Math.PI / 6)).toFixed(2);
      const a2y = (endY - headLen * Math.sin(angle + Math.PI / 6)).toFixed(2);

      return `<g class="tactical-route" opacity="${stroke.opacity}">
        <path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" stroke-dasharray="8,5" stroke-linecap="round" fill="none" />
        <polygon points="${endX.toFixed(2)},${endY.toFixed(2)} ${a1x},${a1y} ${a2x},${a2y}" fill="${stroke.color}" />
      </g>`;
    }

    if (stroke.tool === 'ping') {
      const x = stroke.startX.toFixed(2);
      const y = stroke.startY.toFixed(2);
      const label = stroke.label || 'PING';
      return `<g class="tactical-ping" opacity="${stroke.opacity}">
        <circle cx="${x}" cy="${y}" r="16" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" fill="none" />
        <circle cx="${x}" cy="${y}" r="6" fill="${stroke.color}" />
        <line x1="${(stroke.startX - 22).toFixed(2)}" y1="${y}" x2="${(stroke.startX - 12).toFixed(2)}" y2="${y}" stroke="${stroke.color}" stroke-width="1.5" />
        <line x1="${(stroke.startX + 12).toFixed(2)}" y1="${y}" x2="${(stroke.startX + 22).toFixed(2)}" y2="${y}" stroke="${stroke.color}" stroke-width="1.5" />
        <line x1="${x}" y1="${(stroke.startY - 22).toFixed(2)}" x2="${x}" y2="${(stroke.startY - 12).toFixed(2)}" stroke="${stroke.color}" stroke-width="1.5" />
        <line x1="${x}" y1="${(stroke.startY + 12).toFixed(2)}" x2="${x}" y2="${(stroke.startY + 22).toFixed(2)}" stroke="${stroke.color}" stroke-width="1.5" />
        <text x="${x}" y="${(stroke.startY - 26).toFixed(2)}" fill="${stroke.color}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">${label}</text>
      </g>`;
    }

    if (stroke.tool === 'rectangle') {
      const rx = Math.min(stroke.startX, stroke.endX).toFixed(2);
      const ry = Math.min(stroke.startY, stroke.endY).toFixed(2);
      const rw = Math.abs(stroke.endX - stroke.startX).toFixed(2);
      const rh = Math.abs(stroke.endY - stroke.startY).toFixed(2);
      return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" fill="${stroke.color}" fill-opacity="${(stroke.opacity * 0.15).toFixed(2)}" opacity="${stroke.opacity}" rx="2" />`;
    }

    if (stroke.tool === 'circle') {
      const radius = calculateDistance(
        { x: stroke.startX, y: stroke.startY },
        { x: stroke.endX, y: stroke.endY }
      ).toFixed(2);
      return `<circle cx="${stroke.startX.toFixed(2)}" cy="${stroke.startY.toFixed(2)}" r="${radius}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" fill="${stroke.color}" fill-opacity="${(stroke.opacity * 0.15).toFixed(2)}" opacity="${stroke.opacity}" />`;
    }

    return '';
  }

  /**
   * Export entire whiteboard as a valid, self-contained SVG document string.
   * @param {number} [width]
   * @param {number} [height]
   * @returns {string}
   */
  exportSVG(width, height) {
    const w = width || this.width;
    const h = height || this.height;

    const strokeElements = this.strokes
      .map(stroke => this.strokeToSVG(stroke))
      .filter(Boolean)
      .join('\n    ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${this.backgroundColor}" />
    ${strokeElements}
</svg>`;
  }

  // --- JSON EXPORT & HYDRATION ---

  /**
   * Export canvas state to JSON string.
   * @param {boolean} [pretty=false]
   * @returns {string}
   */
  exportJSON(pretty = false) {
    const payload = {
      version: '1.0.0',
      schema: 'gaming-esports-hub-whiteboard',
      timestamp: Date.now(),
      canvas: {
        width: this.width,
        height: this.height,
        backgroundColor: this.backgroundColor,
        backdrop: this.backdrop
      },
      settings: {
        tool: this.currentTool,
        color: this.currentColor,
        strokeWidth: this.strokeWidth,
        opacity: this.opacity,
        pingLabel: this.pingLabel
      },
      strokes: structuredClone(this.strokes)
    };
    return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }

  /**
   * Restore canvas state from JSON string or object.
   * @param {string|Object} jsonInput
   * @returns {boolean}
   */
  loadJSON(jsonInput) {
    if (!jsonInput) {
      throw new Error('Cannot load empty JSON payload');
    }

    let data;
    if (typeof jsonInput === 'string') {
      try {
        data = JSON.parse(jsonInput);
      } catch (err) {
        throw new Error(`Invalid JSON format: ${err.message}`);
      }
    } else if (typeof jsonInput === 'object') {
      data = jsonInput;
    } else {
      throw new TypeError(`Expected JSON string or object, got ${typeof jsonInput}`);
    }

    if (!data || !Array.isArray(data.strokes)) {
      throw new Error('Invalid whiteboard data: missing strokes array');
    }

    this.strokes = structuredClone(data.strokes);
    this.redoStack = [];

    if (data.canvas) {
      if (data.canvas.backdrop) this.backdrop = data.canvas.backdrop;
      if (data.canvas.backgroundColor) this.backgroundColor = data.canvas.backgroundColor;
      if (data.canvas.width) this.width = data.canvas.width;
      if (data.canvas.height) this.height = data.canvas.height;
    }

    if (data.settings) {
      if (data.settings.tool) this.currentTool = normalizeTool(data.settings.tool);
      if (data.settings.color) this.currentColor = data.settings.color;
      if (data.settings.strokeWidth) this.strokeWidth = data.settings.strokeWidth;
      if (data.settings.opacity !== undefined) this.opacity = data.settings.opacity;
      if (data.settings.pingLabel) this.pingLabel = data.settings.pingLabel;
    }

    this.emit('load', { strokesCount: this.strokes.length, data });
    this.redraw();
    return true;
  }

  // --- TELEMETRY & DIAGNOSTICS ---

  getMetrics() {
    return {
      totalStrokes: this.strokes.length,
      redoAvailable: this.redoStack.length,
      currentTool: this.currentTool,
      currentColor: this.currentColor,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      backdrop: this.backdrop
    };
  }

  // --- DOM EVENT LISTENERS & RESIZE ENGINE ---

  /**
   * Resizes canvas to match container or specified dimensions with High-DPI support.
   * @param {number} [width]
   * @param {number} [height]
   */
  resize(width, height) {
    if (!this.canvas) return;

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    let w = width;
    let h = height;

    if (!w || !h) {
      if (typeof this.canvas.getBoundingClientRect === 'function') {
        const rect = this.canvas.getBoundingClientRect();
        w = rect.width || this.width || 900;
        h = rect.height || this.height || 540;
      } else {
        w = this.width || 900;
        h = this.height || 540;
      }
    }

    this.width = Math.round(w);
    this.height = Math.round(h);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);

    if (this.ctx) {
      if (typeof this.ctx.setTransform === 'function') {
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else if (typeof this.ctx.scale === 'function') {
        this.ctx.scale(dpr, dpr);
      }
    }

    this.redraw();
  }

  /**
   * Binds pointer and touch events.
   */
  initEvents() {
    if (!this.canvas) return;

    const getPos = (e) => {
      if (typeof this.canvas.getBoundingClientRect !== 'function') {
        return { x: e.clientX || 0, y: e.clientY || 0 };
      }
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const onStart = (e) => {
      e.preventDefault();
      if (this.canvas.setPointerCapture && e.pointerId) {
        try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
      const pos = getPos(e);
      this.startStroke(pos.x, pos.y);
      this.redraw();
    };

    const onMove = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.addPoint(pos.x, pos.y);
      this.redraw();
    };

    const onEnd = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      if (this.canvas.releasePointerCapture && e.pointerId) {
        try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      this.endStroke();
      this.redraw();
    };

    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      this.canvas.addEventListener('pointerdown', onStart);
      this.canvas.addEventListener('pointermove', onMove);
      this.canvas.addEventListener('pointerup', onEnd);
      this.canvas.addEventListener('pointercancel', onEnd);
    } else if (this.canvas.addEventListener) {
      this.canvas.addEventListener('mousedown', onStart);
      this.canvas.addEventListener('mousemove', onMove);
      this.canvas.addEventListener('mouseup', onEnd);

      this.canvas.addEventListener('touchstart', onStart, { passive: false });
      this.canvas.addEventListener('touchmove', onMove, { passive: false });
      this.canvas.addEventListener('touchend', onEnd, { passive: false });
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      this._resizeHandler = () => this.resize();
      window.addEventListener('resize', this._resizeHandler);
    }
  }

  // --- DOWNLOAD HELPERS ---

  downloadSVG(filename = 'gaming-esports-strategy-board.svg') {
    if (typeof document === 'undefined') return;
    const svgContent = this.exportSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadJSON(filename = 'gaming-esports-strategy-board.json') {
    if (typeof document === 'undefined') return;
    const jsonContent = this.exportJSON(true);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadPNG(filename = 'gaming-esports-strategy-board.png') {
    if (!this.canvas || typeof this.canvas.toDataURL !== 'function' || typeof document === 'undefined') return;
    const dataUrl = this.canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  destroy() {
    if (this._resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this._listeners) {
      this._listeners.clear();
    }
  }
}

// Export aliases for flexible imports
export const GamingEsportsHubWhiteboardCanvas = GamingEsportsWhiteboardCanvas;
export default GamingEsportsWhiteboardCanvas;
