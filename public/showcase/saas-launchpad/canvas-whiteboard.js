/**
 * SaaS Launchpad - Collaborative Freehand Vector Whiteboard & Architecture Canvas
 * NSoC '26 - Production-Grade Vector Engine with Catmull-Rom Bezier Splines
 */

export const SAAS_PALETTE = Object.freeze({
  obsidianDark: '#0b0f19',
  indigoPrimary: '#6366f1',
  violetAccent: '#8b5cf6',
  emeraldConversion: '#10b981',
  amberWarning: '#f59e0b',
  roseChurn: '#f43f5e',
  pureWhite: '#ffffff',
});

export const SUPPORTED_TOOLS = Object.freeze([
  'pen',
  'eraser',
  'arrow',
  'component',
  'rectangle',
  'circle',
]);

export const TOOL_ALIASES = Object.freeze({
  draw: 'pen',
  brush: 'pen',
  pencil: 'pen',
  freehand: 'pen',
  erase: 'eraser',
  rubber: 'eraser',
  delete: 'eraser',
  'line-arrow': 'arrow',
  pointer: 'arrow',
  vector: 'arrow',
  node: 'component',
  card: 'component',
  'box-node': 'component',
  service: 'component',
  module: 'component',
  rect: 'rectangle',
  box: 'rectangle',
  square: 'rectangle',
  ellipse: 'circle',
  oval: 'circle',
  round: 'circle',
});

export const TEMPLATE_PRESETS = Object.freeze([
  'none',
  'funnel',
  'flywheel',
  'cloud-arch',
]);

/**
 * Normalizes tool names and aliases, throwing descriptive errors on invalid tools.
 * @param {string} tool
 * @returns {string}
 */
export function normalizeTool(tool) {
  if (typeof tool !== 'string' || !tool.trim()) {
    throw new TypeError(`Tool name must be a non-empty string. Received: ${tool}`);
  }
  const clean = tool.trim().toLowerCase();
  if (SUPPORTED_TOOLS.includes(clean)) {
    return clean;
  }
  if (TOOL_ALIASES[clean]) {
    return TOOL_ALIASES[clean];
  }
  throw new Error(`Unsupported tool "${tool}". Supported tools: ${SUPPORTED_TOOLS.join(', ')}`);
}

/**
 * Numeric clamping helper.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

/**
 * Converts a hex color (#RRGGBB) to rgba string with custom alpha.
 * @param {string} hex
 * @param {number} alpha
 * @returns {string}
 */
export function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return hex || `rgba(99, 102, 241, ${alpha})`;
  }
  const cleaned = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length >= 6) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

/**
 * XML attribute escaping.
 * @param {string} str
 * @returns {string}
 */
export function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class SaaSLaunchpadWhiteboardCanvas {
  static PALETTE = SAAS_PALETTE;
  static SUPPORTED_TOOLS = SUPPORTED_TOOLS;
  static TOOL_ALIASES = TOOL_ALIASES;

  #listeners = new Map();
  #undoStack = [];
  #redoStack = [];
  #currentStroke = null;
  #boundPointerDown = null;
  #boundPointerMove = null;
  #boundPointerUp = null;
  #boundPointerCancel = null;
  #boundResize = null;
  #resizeObserver = null;

  constructor(options = {}) {
    this.width = options.width || 1200;
    this.height = options.height || 800;
    this.maxHistory = options.maxHistory || 50;

    this.tool = 'pen';
    this.color = SAAS_PALETTE.indigoPrimary;
    this.strokeWidth = 3;
    this.opacity = 1.0;
    this.template = options.template || 'none';

    this.strokes = [];
    this.canvas = null;
    this.ctx = options.ctx || null;

    if (options.tool) this.setTool(options.tool);
    if (options.color) this.setColor(options.color);
    if (options.strokeWidth !== undefined) this.setStrokeWidth(options.strokeWidth);
    if (options.opacity !== undefined) this.setOpacity(options.opacity);

    if (options.canvas) {
      this.mount(options.canvas);
    }
  }

  get palette() {
    return SAAS_PALETTE;
  }

  get canUndo() {
    return this.#undoStack.length > 0;
  }

  get canRedo() {
    return this.#redoStack.length > 0;
  }

  get undoStackDepth() {
    return this.#undoStack.length;
  }

  get redoStackDepth() {
    return this.#redoStack.length;
  }

  // --- Tool & Brush Customization ---

  setTool(tool) {
    const prev = this.tool;
    this.tool = normalizeTool(tool);
    this.emit('tool:change', { tool: this.tool, previousTool: prev });
    return this;
  }

  setColor(color) {
    if (typeof color !== 'string' || !color.trim()) {
      throw new TypeError('Color must be a valid non-empty string.');
    }
    this.color = color.trim();
    this.emit('brush:change', { color: this.color, strokeWidth: this.strokeWidth, opacity: this.opacity });
    return this;
  }

  setStrokeWidth(width) {
    this.strokeWidth = clamp(width, 1, 50);
    this.emit('brush:change', { color: this.color, strokeWidth: this.strokeWidth, opacity: this.opacity });
    return this;
  }

  setOpacity(opacity) {
    this.opacity = clamp(opacity, 0.0, 1.0);
    this.emit('brush:change', { color: this.color, strokeWidth: this.strokeWidth, opacity: this.opacity });
    return this;
  }

  setTemplate(template) {
    const valid = TEMPLATE_PRESETS.includes(template) ? template : 'none';
    this.template = valid;
    this.emit('template:change', { template: this.template });
    this.render();
    return this;
  }

  // --- Distance-Based Point Interpolation ---

  /**
   * Generates intermediate points between p1 and p2 such that no two points
   * exceed the specified distance threshold.
   * @param {{x: number, y: number}} p1
   * @param {{x: number, y: number}} p2
   * @param {number} dist
   * @returns {Array<{x: number, y: number}>}
   */
  interpolatePoints(p1, p2, dist = 5) {
    if (!p1 && !p2) return [];
    if (!p1) return [{ x: p2.x, y: p2.y }];
    if (!p2) return [{ x: p1.x, y: p1.y }];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d = Math.hypot(dx, dy);

    if (d === 0) {
      return [{ x: p1.x, y: p1.y }];
    }

    const stepDist = Math.max(0.5, dist);
    if (d <= stepDist) {
      return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
    }

    const steps = Math.ceil(d / stepDist);
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: p1.x + dx * t,
        y: p1.y + dy * t,
      });
    }
    return points;
  }

  // --- Smooth Curve Generation (Catmull-Rom to Cubic Bezier) ---

  /**
   * Converts an array of Catmull-Rom points into cubic Bezier curve segments.
   * Formula:
   *  cp1 = p1 + (p2 - p0) / 6
   *  cp2 = p2 - (p3 - p1) / 6
   * @param {Array<{x: number, y: number}>} points
   * @returns {Array<{p0: {x: number, y: number}, cp1: {x: number, y: number}, cp2: {x: number, y: number}, p1: {x: number, y: number}}>}
   */
  catmullRomToBezier(points) {
    if (!Array.isArray(points) || points.length < 2) return [];

    if (points.length === 2) {
      const p1 = points[0];
      const p2 = points[1];
      return [{
        p0: p1,
        cp1: { x: p1.x + (p2.x - p1.x) / 3, y: p1.y + (p2.y - p1.y) / 3 },
        cp2: { x: p1.x + 2 * (p2.x - p1.x) / 3, y: p1.y + 2 * (p2.y - p1.y) / 3 },
        p1: p2,
      }];
    }

    const curves = [];
    const n = points.length;

    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < n ? points[i + 2] : p2;

      const cp1 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6,
      };
      const cp2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6,
      };

      curves.push({ p0: p1, cp1, cp2, p1: p2 });
    }

    return curves;
  }

  /**
   * Generates a smooth SVG path definition string (`d` attribute) using Catmull-Rom splines.
   * @param {Array<{x: number, y: number}>} points
   * @returns {string}
   */
  generateSmoothPath(points) {
    if (!Array.isArray(points) || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    }

    const curves = this.catmullRomToBezier(points);
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (const c of curves) {
      d += ` C ${c.cp1.x.toFixed(2)} ${c.cp1.y.toFixed(2)}, ${c.cp2.x.toFixed(2)} ${c.cp2.y.toFixed(2)}, ${c.p1.x.toFixed(2)} ${c.p1.y.toFixed(2)}`;
    }
    return d;
  }

  // --- Stroke Addition & Bounded History Management ---

  /**
   * Adds a completed stroke, clears redo history, and evicts oldest items if capacity is exceeded.
   * @param {Object} stroke
   * @returns {this}
   */
  addStroke(stroke) {
    if (!stroke || typeof stroke !== 'object') {
      throw new TypeError('Stroke must be an object.');
    }

    const tool = normalizeTool(stroke.tool || this.tool);
    const sanitized = {
      id: stroke.id || `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tool,
      color: stroke.color || this.color,
      strokeWidth: clamp(stroke.strokeWidth ?? this.strokeWidth, 1, 50),
      opacity: clamp(stroke.opacity ?? this.opacity, 0.0, 1.0),
      points: Array.isArray(stroke.points) ? stroke.points.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : [],
      start: stroke.start ? { x: Number(stroke.start.x) || 0, y: Number(stroke.start.y) || 0 } : undefined,
      end: stroke.end ? { x: Number(stroke.end.x) || 0, y: Number(stroke.end.y) || 0 } : undefined,
      title: typeof stroke.title === 'string' ? stroke.title : undefined,
      subtitle: typeof stroke.subtitle === 'string' ? stroke.subtitle : undefined,
      fill: stroke.fill,
      timestamp: stroke.timestamp || Date.now(),
    };

    this.strokes.push(sanitized);

    this.#undoStack.push({ type: 'add', stroke: sanitized });
    if (this.#undoStack.length > this.maxHistory) {
      this.#undoStack.shift();
    }
    // New stroke evicts all redo history
    this.#redoStack = [];

    this.emit('stroke:add', sanitized);
    this.emit('change', { strokes: this.strokes.length });
    this.render();
    return this;
  }

  undo() {
    if (this.#undoStack.length === 0) return false;
    const action = this.#undoStack.pop();

    if (action.type === 'add') {
      const idx = this.strokes.indexOf(action.stroke);
      if (idx !== -1) {
        this.strokes.splice(idx, 1);
      }
      this.#redoStack.push(action);
    } else if (action.type === 'clear') {
      this.strokes = [...action.previousStrokes];
      this.#redoStack.push(action);
    }

    this.emit('undo', { action, strokes: this.strokes.length });
    this.emit('change', { strokes: this.strokes.length });
    this.render();
    return true;
  }

  redo() {
    if (this.#redoStack.length === 0) return false;
    const action = this.#redoStack.pop();

    if (action.type === 'add') {
      this.strokes.push(action.stroke);
      this.#undoStack.push(action);
    } else if (action.type === 'clear') {
      this.#undoStack.push({ type: 'clear', previousStrokes: [...this.strokes] });
      this.strokes = [];
    }

    this.emit('redo', { action, strokes: this.strokes.length });
    this.emit('change', { strokes: this.strokes.length });
    this.render();
    return true;
  }

  clear() {
    if (this.strokes.length === 0) return;
    this.#undoStack.push({ type: 'clear', previousStrokes: [...this.strokes] });
    if (this.#undoStack.length > this.maxHistory) {
      this.#undoStack.shift();
    }
    this.#redoStack = [];
    this.strokes = [];

    this.emit('clear');
    this.emit('change', { strokes: 0 });
    this.render();
  }

  // --- Event Emitter Pattern (on, off, emit, once) ---

  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Event handler must be a function.');
    }
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this.#listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.#listeners.delete(event);
      }
    }
    return this;
  }

  emit(event, ...args) {
    const handlers = this.#listeners.get(event);
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[SaaS Whiteboard Canvas] Listener error for "${event}":`, err);
        }
      }
    }
    return this;
  }

  once(event, handler) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      handler(...args);
    });
    return unsubscribe;
  }

  // --- Mockable 2D Context Render Engine ---

  /**
   * Renders the entire whiteboard scene onto a 2D canvas context.
   * Can be executed with a mock context in Node.js test environments.
   * @param {CanvasRenderingContext2D|Object} ctx
   */
  render(ctx = this.ctx) {
    if (!ctx) return;

    if (typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, this.width, this.height);
    }

    // Canvas background
    ctx.save();
    try {
      if (typeof ctx.fillRect === 'function') {
        ctx.fillStyle = SAAS_PALETTE.obsidianDark;
        ctx.fillRect(0, 0, this.width, this.height);
      }

      // Render architectural backdrop if selected
      this.renderBackdrop(ctx);

      // Render all completed strokes
      for (const stroke of this.strokes) {
        this.renderStroke(stroke, ctx);
      }

      // Render active live stroke preview if currently drawing
      if (this.#currentStroke) {
        this.renderStroke(this.#currentStroke, ctx);
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * Renders template guidelines and architectural diagrams.
   * @param {CanvasRenderingContext2D|Object} ctx
   */
  renderBackdrop(ctx) {
    if (!ctx || this.template === 'none') return;

    ctx.save();
    try {
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([6, 6]);
      }
      ctx.lineWidth = 1;

      if (this.template === 'funnel') {
        // SaaS Acquisition Funnel Blueprint
        const stages = [
          { label: 'TOP OF FUNNEL (Ads & SEO Visitors)', count: '100,000 / mo', w: 800, y: 120 },
          { label: 'LEAD GENERATION (Trial Signups - 15%)', count: '15,000 / mo', w: 660, y: 220 },
          { label: 'ONBOARDING (Workspace Setup - 65%)', count: '9,750 / mo', w: 520, y: 320 },
          { label: 'ACTIVATION (Core Feature Value - 60%)', count: '5,850 / mo', w: 380, y: 420 },
          { label: 'CONVERSION (Paid SaaS Annual - 35%)', count: '2,047 / mo', w: 260, y: 520 },
        ];

        const cx = this.width / 2;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.28)';
        ctx.fillStyle = 'rgba(99, 102, 241, 0.04)';

        for (const s of stages) {
          const x = cx - s.w / 2;
          if (typeof ctx.fillRect === 'function') ctx.fillRect(x, s.y, s.w, 60);
          if (typeof ctx.strokeRect === 'function') ctx.strokeRect(x, s.y, s.w, 60);

          if (typeof ctx.fillText === 'function') {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(s.label, x + 16, s.y + 26);
            ctx.fillStyle = SAAS_PALETTE.emeraldConversion;
            ctx.fillText(s.count, x + s.w - 110, s.y + 26);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.04)';
          }
        }
      } else if (this.template === 'flywheel') {
        // PLG Flywheel Blueprint
        const cx = this.width / 2;
        const cy = this.height / 2;
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';

        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          if (typeof ctx.arc === 'function') {
            ctx.arc(cx, cy, 220, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 90, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        if (typeof ctx.fillText === 'function') {
          ctx.fillStyle = SAAS_PALETTE.pureWhite;
          ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText('PLG RETENTION HUB', cx - 65, cy + 4);

          ctx.fillStyle = '#a78bfa';
          ctx.fillText('1. Frictionless Sign-up & Discovery ↗', cx + 110, cy - 130);
          ctx.fillText('2. Rapid Aha! Activation ↘', cx + 110, cy + 150);
          ctx.fillText('3. Collaborative Viral Loops ↙', cx - 310, cy + 150);
          ctx.fillText('4. Expansion & Self-Serve Upgrades ↖', cx - 310, cy - 130);
        }
      } else if (this.template === 'cloud-arch') {
        // Multi-Tenant Cloud Architecture Blueprint
        const tiers = [
          { title: 'TIER 1: Edge CDN & Anycast Routing (Cloudflare)', y: 100, color: 'rgba(56, 189, 248, 0.25)' },
          { title: 'TIER 2: API Gateway & OAuth2 Identity Token Verification', y: 240, color: 'rgba(99, 102, 241, 0.25)' },
          { title: 'TIER 3: Multi-Tenant Microservice Pods (Autoscaled K8s)', y: 380, color: 'rgba(139, 92, 246, 0.25)' },
          { title: 'TIER 4: Sharded Database (CockroachDB + Redis Cluster)', y: 520, color: 'rgba(16, 185, 129, 0.25)' },
        ];

        for (const t of tiers) {
          ctx.strokeStyle = t.color;
          if (typeof ctx.strokeRect === 'function') {
            ctx.strokeRect(100, t.y, this.width - 200, 80);
          }
          if (typeof ctx.fillText === 'function') {
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(t.title, 120, t.y + 28);
          }
        }
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * Renders an individual vector stroke on the canvas context.
   * @param {Object} stroke
   * @param {CanvasRenderingContext2D|Object} ctx
   */
  renderStroke(stroke, ctx = this.ctx) {
    if (!ctx || !stroke) return;

    ctx.save();
    try {
      const tool = normalizeTool(stroke.tool || 'pen');
      const opacity = clamp(stroke.opacity ?? 1, 0, 1);
      ctx.globalAlpha = opacity;
      ctx.lineWidth = stroke.strokeWidth || 3;
      ctx.strokeStyle = stroke.color || SAAS_PALETTE.indigoPrimary;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (tool === 'pen') {
        const points = stroke.points || [];
        if (points.length === 0) return;

        if (points.length === 1) {
          ctx.fillStyle = stroke.color || SAAS_PALETTE.indigoPrimary;
          if (typeof ctx.beginPath === 'function') ctx.beginPath();
          if (typeof ctx.arc === 'function') {
            ctx.arc(points[0].x, points[0].y, Math.max(1, (stroke.strokeWidth || 3) / 2), 0, Math.PI * 2);
          }
          if (typeof ctx.fill === 'function') ctx.fill();
        } else {
          const curves = this.catmullRomToBezier(points);
          if (typeof ctx.beginPath === 'function') ctx.beginPath();
          if (typeof ctx.moveTo === 'function') ctx.moveTo(points[0].x, points[0].y);

          for (const c of curves) {
            if (typeof ctx.bezierCurveTo === 'function') {
              ctx.bezierCurveTo(c.cp1.x, c.cp1.y, c.cp2.x, c.cp2.y, c.p1.x, c.p1.y);
            } else if (typeof ctx.lineTo === 'function') {
              ctx.lineTo(c.p1.x, c.p1.y);
            }
          }
          if (typeof ctx.stroke === 'function') ctx.stroke();
        }
      } else if (tool === 'eraser') {
        const points = stroke.points || [];
        if (points.length === 0) return;

        if (ctx.globalCompositeOperation !== undefined) {
          ctx.globalCompositeOperation = 'destination-out';
        }
        ctx.lineWidth = (stroke.strokeWidth || 6) * 3;

        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
          if (typeof ctx.lineTo === 'function') ctx.lineTo(points[i].x, points[i].y);
        }
        if (typeof ctx.stroke === 'function') ctx.stroke();
      } else if (tool === 'rectangle') {
        const start = stroke.start || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const end = stroke.end || (stroke.points && stroke.points[stroke.points.length - 1]) || start;
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.max(1, Math.abs(end.x - start.x));
        const h = Math.max(1, Math.abs(end.y - start.y));

        ctx.fillStyle = stroke.fill || hexToRgba(stroke.color || SAAS_PALETTE.indigoPrimary, 0.12);

        if (typeof ctx.roundRect === 'function') {
          if (typeof ctx.beginPath === 'function') ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          if (typeof ctx.fill === 'function') ctx.fill();
          if (typeof ctx.stroke === 'function') ctx.stroke();
        } else {
          if (typeof ctx.fillRect === 'function') ctx.fillRect(x, y, w, h);
          if (typeof ctx.strokeRect === 'function') ctx.strokeRect(x, y, w, h);
        }
      } else if (tool === 'circle') {
        const start = stroke.start || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const end = stroke.end || (stroke.points && stroke.points[stroke.points.length - 1]) || start;
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const rx = Math.max(1, Math.abs(end.x - start.x) / 2);
        const ry = Math.max(1, Math.abs(end.y - start.y) / 2);

        ctx.fillStyle = stroke.fill || hexToRgba(stroke.color || SAAS_PALETTE.indigoPrimary, 0.12);

        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        } else if (typeof ctx.arc === 'function') {
          ctx.arc(cx, cy, Math.max(rx, ry), 0, Math.PI * 2);
        }
        if (typeof ctx.fill === 'function') ctx.fill();
        if (typeof ctx.stroke === 'function') ctx.stroke();
      } else if (tool === 'arrow') {
        const start = stroke.start || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const end = stroke.end || (stroke.points && stroke.points[stroke.points.length - 1]) || start;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = Math.max(12, (stroke.strokeWidth || 3) * 3);

        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(start.x, start.y);
        if (typeof ctx.lineTo === 'function') ctx.lineTo(end.x, end.y);
        if (typeof ctx.stroke === 'function') ctx.stroke();

        ctx.fillStyle = stroke.color || SAAS_PALETTE.indigoPrimary;
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(end.x, end.y);
        if (typeof ctx.lineTo === 'function') {
          ctx.lineTo(
            end.x - headLen * Math.cos(angle - Math.PI / 6),
            end.y - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            end.x - headLen * Math.cos(angle + Math.PI / 6),
            end.y - headLen * Math.sin(angle + Math.PI / 6)
          );
        }
        if (typeof ctx.closePath === 'function') ctx.closePath();
        if (typeof ctx.fill === 'function') ctx.fill();
      } else if (tool === 'component') {
        const start = stroke.start || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const end = stroke.end || (stroke.points && stroke.points[stroke.points.length - 1]) || start;
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.max(Math.abs(end.x - start.x), 160);
        const h = Math.max(Math.abs(end.y - start.y), 74);

        // Glassmorphic Node Card
        ctx.fillStyle = stroke.fill || 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = stroke.color || SAAS_PALETTE.violetAccent;
        ctx.lineWidth = Math.max(1.5, stroke.strokeWidth || 2);

        if (typeof ctx.roundRect === 'function') {
          if (typeof ctx.beginPath === 'function') ctx.beginPath();
          ctx.roundRect(x, y, w, h, 8);
          if (typeof ctx.fill === 'function') ctx.fill();
          if (typeof ctx.stroke === 'function') ctx.stroke();
        } else {
          if (typeof ctx.fillRect === 'function') ctx.fillRect(x, y, w, h);
          if (typeof ctx.strokeRect === 'function') ctx.strokeRect(x, y, w, h);
        }

        // Conversion Status Indicator Pill
        ctx.fillStyle = SAAS_PALETTE.emeraldConversion;
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.arc === 'function') {
          ctx.arc(x + 16, y + 20, 4.5, 0, Math.PI * 2);
          if (typeof ctx.fill === 'function') ctx.fill();
        }

        // Title and Subtitle labels
        if (typeof ctx.fillText === 'function') {
          ctx.fillStyle = SAAS_PALETTE.pureWhite;
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(stroke.title || 'SaaS Service Pod', x + 28, y + 24);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(stroke.subtitle || 'Active • 99.99% SLA • Node', x + 16, y + 48);
        }
      }
    } finally {
      ctx.restore();
    }
  }

  // --- Vector SVG Export ---

  /**
   * Produces a fully self-contained, valid XML SVG string representing all vectors.
   * @param {Object} options
   * @returns {string}
   */
  exportSVG(options = {}) {
    const width = options.width || this.width;
    const height = options.height || this.height;

    let elements = [];

    // Background rect
    elements.push(`  <rect width="100%" height="100%" fill="${SAAS_PALETTE.obsidianDark}" />`);

    // Architectural backdrop in SVG if active
    if (this.template === 'funnel') {
      elements.push('  <!-- Funnel Template Guide -->');
      const stages = [
        { label: 'TOP OF FUNNEL (Ads &amp; SEO Visitors)', count: '100k/mo', w: 800, y: 120 },
        { label: 'LEAD GENERATION (Trial Signups - 15%)', count: '15k/mo', w: 660, y: 220 },
        { label: 'ONBOARDING (Workspace Setup - 65%)', count: '9.75k/mo', w: 520, y: 320 },
        { label: 'ACTIVATION (Core Value Moment - 60%)', count: '5.85k/mo', w: 380, y: 420 },
        { label: 'CONVERSION (Paid SaaS Annual - 35%)', count: '2.05k/mo', w: 260, y: 520 },
      ];
      const cx = width / 2;
      for (const s of stages) {
        const x = cx - s.w / 2;
        elements.push(`  <rect x="${x}" y="${s.y}" width="${s.w}" height="60" fill="rgba(99, 102, 241, 0.05)" stroke="rgba(99, 102, 241, 0.25)" stroke-dasharray="6,6" rx="4" />`);
        elements.push(`  <text x="${x + 16}" y="${s.y + 34}" fill="#94a3b8" font-family="sans-serif" font-size="12">${s.label}</text>`);
      }
    } else if (this.template === 'flywheel') {
      elements.push('  <!-- Flywheel Template Guide -->');
      const cx = width / 2;
      const cy = height / 2;
      elements.push(`  <circle cx="${cx}" cy="${cy}" r="220" fill="none" stroke="rgba(139, 92, 246, 0.25)" stroke-dasharray="6,6" />`);
      elements.push(`  <circle cx="${cx}" cy="${cy}" r="90" fill="none" stroke="rgba(139, 92, 246, 0.35)" />`);
      elements.push(`  <text x="${cx - 65}" y="${cy + 5}" fill="${SAAS_PALETTE.pureWhite}" font-family="sans-serif" font-size="13" font-weight="bold">PLG RETENTION HUB</text>`);
    } else if (this.template === 'cloud-arch') {
      elements.push('  <!-- Cloud Architecture Template Guide -->');
      const tiers = [
        { title: 'TIER 1: Edge CDN &amp; Anycast Routing', y: 100 },
        { title: 'TIER 2: API Gateway &amp; OAuth2 Identity', y: 240 },
        { title: 'TIER 3: Microservice Pods (K8s Cluster)', y: 380 },
        { title: 'TIER 4: Sharded DB &amp; Cache Cluster', y: 520 },
      ];
      for (const t of tiers) {
        elements.push(`  <rect x="100" y="${t.y}" width="${width - 200}" height="80" fill="none" stroke="rgba(99, 102, 241, 0.2)" stroke-dasharray="6,6" rx="6" />`);
        elements.push(`  <text x="120" y="${t.y + 36}" fill="#cbd5e1" font-family="sans-serif" font-size="12" font-weight="bold">${t.title}</text>`);
      }
    }

    // Render strokes
    for (const stroke of this.strokes) {
      const tool = normalizeTool(stroke.tool || 'pen');
      const color = escapeXml(stroke.color || SAAS_PALETTE.indigoPrimary);
      const width = stroke.strokeWidth || 3;
      const opacity = clamp(stroke.opacity ?? 1, 0, 1);

      if (tool === 'pen') {
        const pathData = this.generateSmoothPath(stroke.points || []);
        if (pathData) {
          elements.push(`  <path d="${pathData}" stroke="${color}" stroke-width="${width}" fill="none" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" />`);
        }
      } else if (tool === 'eraser') {
        const pathData = this.generateSmoothPath(stroke.points || []);
        if (pathData) {
          elements.push(`  <path d="${pathData}" stroke="${SAAS_PALETTE.obsidianDark}" stroke-width="${width * 3}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`);
        }
      } else if (tool === 'rectangle') {
        const start = stroke.start || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const end = stroke.end || (stroke.points && stroke.points[stroke.points.length - 1]) || start;
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.max(1, Math.abs(end.x - start.x));
        const h = Math.max(1, Math.abs(end.y - start.y));
        const fill = escapeXml(stroke.fill || hexToRgba(stroke.color || SAAS_PALETTE.indigoPrimary, 0.12));

        elements.push(`  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" />`);
      } else if (tool === 'circle') {
        const start = stroke.start || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const end = stroke.end || (stroke.points && stroke.points[stroke.points.length - 1]) || start;
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const rx = Math.max(1, Math.abs(end.x - start.x) / 2);
        const ry = Math.max(1, Math.abs(end.y - start.y) / 2);
        const fill = escapeXml(stroke.fill || hexToRgba(stroke.color || SAAS_PALETTE.indigoPrimary, 0.12));

        if (rx === ry) {
          elements.push(`  <circle cx="${cx}" cy="${cy}" r="${rx}" fill="${fill}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" />`);
        } else {
          elements.push(`  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" />`);
        }
      } else if (tool === 'arrow') {
        const start = stroke.start || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const end = stroke.end || (stroke.points && stroke.points[stroke.points.length - 1]) || start;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = Math.max(12, (stroke.strokeWidth || 3) * 3);

        const p1x = end.x - headLen * Math.cos(angle - Math.PI / 6);
        const p1y = end.y - headLen * Math.sin(angle - Math.PI / 6);
        const p2x = end.x - headLen * Math.cos(angle + Math.PI / 6);
        const p2y = end.y - headLen * Math.sin(angle + Math.PI / 6);

        elements.push(`  <g class="saas-arrow" opacity="${opacity}">`);
        elements.push(`    <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`);
        elements.push(`    <polygon points="${end.x},${end.y} ${p1x.toFixed(2)},${p1y.toFixed(2)} ${p2x.toFixed(2)},${p2y.toFixed(2)}" fill="${color}" />`);
        elements.push('  </g>');
      } else if (tool === 'component') {
        const start = stroke.start || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const end = stroke.end || (stroke.points && stroke.points[stroke.points.length - 1]) || start;
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.max(Math.abs(end.x - start.x), 160);
        const h = Math.max(Math.abs(end.y - start.y), 74);
        const title = escapeXml(stroke.title || 'SaaS Service Pod');
        const subtitle = escapeXml(stroke.subtitle || 'Active • 99.99% SLA • Node');

        elements.push(`  <g class="saas-component" opacity="${opacity}">`);
        elements.push(`    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="rgba(15, 23, 42, 0.9)" stroke="${color}" stroke-width="${width}" />`);
        elements.push(`    <circle cx="${x + 16}" cy="${y + 20}" r="4.5" fill="${SAAS_PALETTE.emeraldConversion}" />`);
        elements.push(`    <text x="${x + 28}" y="${y + 24}" fill="${SAAS_PALETTE.pureWhite}" font-family="sans-serif" font-size="12" font-weight="bold">${title}</text>`);
        elements.push(`    <text x="${x + 16}" y="${y + 48}" fill="#94a3b8" font-family="sans-serif" font-size="10">${subtitle}</text>`);
        elements.push('  </g>');
      }
    }

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      ...elements,
      '</svg>',
    ].join('\n');
  }

  // --- JSON Serialization & Restoration Lifecycle ---

  /**
   * Serializes current whiteboard canvas to structured JSON string.
   * @param {boolean} pretty
   * @returns {string}
   */
  exportJSON(pretty = true) {
    const data = {
      version: '1.0.0',
      timestamp: Date.now(),
      width: this.width,
      height: this.height,
      template: this.template,
      palette: SAAS_PALETTE,
      strokes: this.strokes.map((s) => ({
        id: s.id,
        tool: s.tool,
        color: s.color,
        strokeWidth: s.strokeWidth,
        opacity: s.opacity,
        points: s.points ? s.points.map((p) => ({ x: p.x, y: p.y })) : undefined,
        start: s.start ? { x: s.start.x, y: s.start.y } : undefined,
        end: s.end ? { x: s.end.x, y: s.end.y } : undefined,
        title: s.title,
        subtitle: s.subtitle,
        fill: s.fill,
        timestamp: s.timestamp,
      })),
    };

    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  /**
   * Restores state from a JSON string or object.
   * @param {string|Object} jsonInput
   * @returns {this}
   */
  loadJSON(jsonInput) {
    let data;
    if (typeof jsonInput === 'string') {
      try {
        data = JSON.parse(jsonInput);
      } catch (err) {
        throw new Error(`Failed to parse whiteboard JSON: ${err.message}`);
      }
    } else if (typeof jsonInput === 'object' && jsonInput !== null) {
      data = jsonInput;
    } else {
      throw new TypeError('loadJSON requires a valid JSON string or object.');
    }

    if (!Array.isArray(data.strokes)) {
      throw new Error('Invalid whiteboard JSON format: missing "strokes" array.');
    }

    const validatedStrokes = data.strokes.map((s, idx) => {
      const tool = normalizeTool(s.tool || 'pen');
      return {
        id: s.id || `stroke-${Date.now()}-${idx}`,
        tool,
        color: typeof s.color === 'string' ? s.color : SAAS_PALETTE.indigoPrimary,
        strokeWidth: clamp(s.strokeWidth ?? 3, 1, 50),
        opacity: clamp(s.opacity ?? 1, 0, 1),
        points: Array.isArray(s.points) ? s.points.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : [],
        start: s.start ? { x: Number(s.start.x) || 0, y: Number(s.start.y) || 0 } : undefined,
        end: s.end ? { x: Number(s.end.x) || 0, y: Number(s.end.y) || 0 } : undefined,
        title: typeof s.title === 'string' ? s.title : undefined,
        subtitle: typeof s.subtitle === 'string' ? s.subtitle : undefined,
        fill: s.fill,
        timestamp: s.timestamp || Date.now(),
      };
    });

    if (data.width && typeof data.width === 'number') this.width = data.width;
    if (data.height && typeof data.height === 'number') this.height = data.height;
    if (data.template && typeof data.template === 'string') this.template = data.template;

    this.strokes = validatedStrokes;
    this.#undoStack = [];
    this.#redoStack = [];

    this.emit('load', { strokesCount: this.strokes.length });
    this.emit('change', { strokes: this.strokes.length });
    this.render();
    return this;
  }

  // --- DOM Event Listener Binding & High-DPI devicePixelRatio ---

  /**
   * Attaches whiteboard interactive drawing listeners to an HTMLCanvasElement.
   * @param {HTMLCanvasElement} canvasElement
   * @returns {this}
   */
  mount(canvasElement) {
    if (!canvasElement) {
      throw new TypeError('mount() expects an HTMLCanvasElement.');
    }

    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.resize();

    // Event listener functions with lexical binding
    this.#boundPointerDown = (e) => this.#onPointerDown(e);
    this.#boundPointerMove = (e) => this.#onPointerMove(e);
    this.#boundPointerUp = (e) => this.#onPointerUp(e);
    this.#boundPointerCancel = (e) => this.#onPointerCancel(e);
    this.#boundResize = () => this.resize();

    this.canvas.addEventListener('pointerdown', this.#boundPointerDown);
    this.canvas.addEventListener('pointermove', this.#boundPointerMove);
    this.canvas.addEventListener('pointerup', this.#boundPointerUp);
    this.canvas.addEventListener('pointercancel', this.#boundPointerCancel);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.#boundResize);
    }

    if (typeof ResizeObserver !== 'undefined' && this.canvas) {
      this.#resizeObserver = new ResizeObserver(() => this.resize());
      this.#resizeObserver.observe(this.canvas);
    }

    this.render();
    return this;
  }

  /**
   * Resizes canvas buffer with devicePixelRatio for ultra-crisp Retina rendering.
   */
  resize() {
    if (!this.canvas) return;

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = this.canvas.getBoundingClientRect();
    const displayWidth = rect.width > 0 ? rect.width : this.width;
    const displayHeight = rect.height > 0 ? rect.height : this.height;

    this.width = displayWidth;
    this.height = displayHeight;

    this.canvas.width = Math.round(displayWidth * dpr);
    this.canvas.height = Math.round(displayHeight * dpr);

    this.ctx = this.canvas.getContext('2d');
    if (this.ctx && typeof this.ctx.scale === 'function') {
      this.ctx.scale(dpr, dpr);
    }

    this.render();
  }

  /**
   * Removes all DOM listeners and cleans up observers.
   */
  destroy() {
    if (this.canvas) {
      if (this.#boundPointerDown) this.canvas.removeEventListener('pointerdown', this.#boundPointerDown);
      if (this.#boundPointerMove) this.canvas.removeEventListener('pointermove', this.#boundPointerMove);
      if (this.#boundPointerUp) this.canvas.removeEventListener('pointerup', this.#boundPointerUp);
      if (this.#boundPointerCancel) this.canvas.removeEventListener('pointercancel', this.#boundPointerCancel);
    }

    if (typeof window !== 'undefined' && this.#boundResize) {
      window.removeEventListener('resize', this.#boundResize);
    }

    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }

    this.#listeners.clear();
    this.canvas = null;
    this.ctx = null;
  }

  // --- Pointer Event Handlers ---

  #getCanvasPoint(e) {
    if (!this.canvas) return { x: e.clientX || 0, y: e.clientY || 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  #onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Only primary button
    if (this.canvas && typeof this.canvas.setPointerCapture === 'function') {
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        // Fallback gracefully if capture fails
      }
    }

    const pos = this.#getCanvasPoint(e);
    const tool = this.tool;

    this.#currentStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tool,
      color: this.color,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      points: [pos],
      start: pos,
      end: pos,
      timestamp: Date.now(),
    };

    if (tool === 'component') {
      this.#currentStroke.title = 'API Gateway Router';
      this.#currentStroke.subtitle = 'Active • 99.99% SLA • Node';
    }

    this.emit('stroke:start', { point: pos, tool });
    this.render();
  }

  #onPointerMove(e) {
    if (!this.#currentStroke) return;

    const currentPos = this.#getCanvasPoint(e);
    const tool = this.#currentStroke.tool;

    if (tool === 'pen' || tool === 'eraser') {
      const lastPoint = this.#currentStroke.points[this.#currentStroke.points.length - 1];
      // Interpolate intermediate points to prevent angular gaps during quick pointer sweeps
      const intermediate = this.interpolatePoints(lastPoint, currentPos, 4);
      if (intermediate.length > 1) {
        this.#currentStroke.points.push(...intermediate.slice(1));
      }
    } else {
      // Shapes and vectors update endpoint
      this.#currentStroke.end = currentPos;
    }

    this.render();
  }

  #onPointerUp(e) {
    if (!this.#currentStroke) return;

    if (this.canvas && typeof this.canvas.releasePointerCapture === 'function') {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }

    const finalPos = this.#getCanvasPoint(e);
    const tool = this.#currentStroke.tool;

    if (tool === 'pen' || tool === 'eraser') {
      const lastPoint = this.#currentStroke.points[this.#currentStroke.points.length - 1];
      const intermediate = this.interpolatePoints(lastPoint, finalPos, 4);
      if (intermediate.length > 1) {
        this.#currentStroke.points.push(...intermediate.slice(1));
      }
    } else {
      this.#currentStroke.end = finalPos;
    }

    const strokeToAdd = this.#currentStroke;
    this.#currentStroke = null;

    this.addStroke(strokeToAdd);
    this.emit('stroke:end', strokeToAdd);
  }

  #onPointerCancel(e) {
    if (!this.#currentStroke) return;

    if (this.canvas && typeof this.canvas.releasePointerCapture === 'function') {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }

    this.#currentStroke = null;
    this.render();
  }
}

// Browser bootstrap
if (typeof document !== 'undefined') {
  const defaultMount = document.querySelector('[data-saas-whiteboard]');
  if (defaultMount && defaultMount instanceof HTMLCanvasElement) {
    window.saasWhiteboardInstance = new SaaSLaunchpadWhiteboardCanvas({ canvas: defaultMount });
  }
}
