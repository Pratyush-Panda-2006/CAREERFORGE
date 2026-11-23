/**
 * DeveloperPortfolioWhiteboardCanvas
 * Production-grade vector whiteboard & system architecture sketchpad for developer-portfolio.
 * Features:
 * - Developer IDE dark syntax theme palette
 * - Vector tools: pen, eraser, arrow, component (microservice node), rectangle, circle
 * - Distance-based point interpolation without gaps
 * - Catmull-Rom spline to cubic Bezier curve smoothing
 * - Bounded undo/redo history with capacity eviction
 * - Valid XML SVG export (<svg>...<path>...<text>...<circle>...)
 * - JSON serialization & import lifecycle
 * - Event emitter pattern (on, off, emit)
 * - Mockable 2D context render engine
 * - PointerEvent / MouseEvent / touch and High-DPI devicePixelRatio handling
 * - Architectural backdrop templates: Microservices Cluster, ERD Database Schema, Event Bus Pipeline
 */

export const THEME_PALETTE = Object.freeze({
  ideBackground: '#0d1117',
  reactCyan: '#38bdf8',
  nodeGreen: '#22c55e',
  rustOrange: '#ea580c',
  typeScriptBlue: '#2563eb',
  syntaxPink: '#f43f5e',
  pureWhite: '#ffffff'
});

export const SUPPORTED_TOOLS = Object.freeze([
  'pen',
  'eraser',
  'arrow',
  'component',
  'rectangle',
  'circle'
]);

export const TOOL_ALIASES = Object.freeze({
  pen: 'pen',
  brush: 'pen',
  draw: 'pen',
  freehand: 'pen',
  pencil: 'pen',
  eraser: 'eraser',
  erase: 'eraser',
  delete: 'eraser',
  arrow: 'arrow',
  pointer: 'arrow',
  vector: 'arrow',
  line: 'arrow',
  component: 'component',
  node: 'component',
  service: 'component',
  module: 'component',
  box: 'component',
  rectangle: 'rectangle',
  rect: 'rectangle',
  square: 'rectangle',
  circle: 'circle',
  circ: 'circle',
  oval: 'circle',
  ellipse: 'circle'
});

function escapeXml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class DeveloperPortfolioWhiteboardCanvas {
  static PALETTE = THEME_PALETTE;
  static TOOLS = SUPPORTED_TOOLS;
  static ALIASES = TOOL_ALIASES;

  constructor(canvasOrOptions = null, options = {}) {
    let canvas = null;
    let opts = options;
    if (canvasOrOptions && typeof canvasOrOptions.getContext === 'function') {
      canvas = canvasOrOptions;
    } else if (canvasOrOptions && typeof canvasOrOptions === 'object' && !Array.isArray(canvasOrOptions)) {
      opts = { ...canvasOrOptions, ...options };
    }

    this.palette = { ...THEME_PALETTE };
    this.width = Number(opts.width) || (canvas && canvas.width ? canvas.width : 1200);
    this.height = Number(opts.height) || (canvas && canvas.height ? canvas.height : 800);
    this.maxHistory = typeof opts.maxHistory === 'number' && opts.maxHistory > 0 ? opts.maxHistory : 50;
    this.showGrid = opts.showGrid !== false;

    this.strokes = [];
    this.redoStack = [];
    this.activeStroke = null;
    this.isDrawing = false;
    this.listeners = new Map();

    // Default brush state
    this._tool = 'pen';
    this._color = THEME_PALETTE.reactCyan;
    this._strokeWidth = 3;
    this._opacity = 1.0;

    if (opts.tool) this.setTool(opts.tool);
    if (opts.color) this.setColor(opts.color);
    if (opts.strokeWidth !== undefined) this.setStrokeWidth(opts.strokeWidth);
    if (opts.opacity !== undefined) this.setOpacity(opts.opacity);

    // Canvas & context binding
    this.canvas = canvas;
    this.ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
    this._boundListeners = [];

    if (this.canvas) {
      this.bindEvents();
      this.resize(this.width, this.height);
    }
  }

  get tool() {
    return this._tool;
  }

  set tool(val) {
    this.setTool(val);
  }

  get color() {
    return this._color;
  }

  set color(val) {
    this.setColor(val);
  }

  get strokeWidth() {
    return this._strokeWidth;
  }

  set strokeWidth(val) {
    this.setStrokeWidth(val);
  }

  get opacity() {
    return this._opacity;
  }

  set opacity(val) {
    this.setOpacity(val);
  }

  get canUndo() {
    return this.strokes.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get history() {
    return this.strokes.map(s => ({ ...s }));
  }

  /**
   * Tool mutation & alias normalization
   */
  normalizeTool(tool) {
    if (typeof tool !== 'string' || !tool.trim()) {
      throw new TypeError(`Tool name must be a non-empty string. Supported tools: ${SUPPORTED_TOOLS.join(', ')}`);
    }
    const key = tool.trim().toLowerCase();
    if (TOOL_ALIASES[key]) {
      return TOOL_ALIASES[key];
    }
    throw new TypeError(`Invalid tool: "${tool}". Supported tools: ${SUPPORTED_TOOLS.join(', ')}`);
  }

  setTool(tool) {
    const normalized = this.normalizeTool(tool);
    const previous = this._tool;
    this._tool = normalized;
    this.emit('tool:change', { tool: normalized, previous });
    this.emit('change', { type: 'tool', tool: normalized });
    return this._tool;
  }

  /**
   * Brush customization with bounds clamping
   */
  setColor(color) {
    if (typeof color !== 'string' || !color.trim()) {
      throw new TypeError('Color must be a non-empty string');
    }
    const trimmed = color.trim();
    let resolved = trimmed;
    if (this.palette[trimmed]) {
      resolved = this.palette[trimmed];
    }
    this._color = resolved;
    this.emit('color:change', this._color);
    this.emit('change', { type: 'color', color: this._color });
    return this._color;
  }

  setStrokeWidth(width) {
    const num = Number(width);
    if (Number.isNaN(num)) {
      throw new TypeError('strokeWidth must be a valid number');
    }
    // Clamp between 1 and 50
    const clamped = Math.min(50, Math.max(1, Math.round(num)));
    this._strokeWidth = clamped;
    this.emit('change', { type: 'strokeWidth', strokeWidth: clamped });
    return this._strokeWidth;
  }

  setOpacity(opacity) {
    const num = Number(opacity);
    if (Number.isNaN(num)) {
      throw new TypeError('opacity must be a valid number');
    }
    // Clamp between 0.0 and 1.0
    const clamped = Math.min(1.0, Math.max(0.0, Number(num.toFixed(2))));
    this._opacity = clamped;
    this.emit('change', { type: 'opacity', opacity: clamped });
    return this._opacity;
  }

  /**
   * Distance-based point interpolation: interpolatePoints(p1, p2, dist)
   * Generates intermediate points between p1 and p2 such that the distance
   * between any adjacent points is <= dist without gaps.
   */
  interpolatePoints(p1, p2, dist = 5) {
    if (!p1 || !p2 || typeof p1.x !== 'number' || typeof p1.y !== 'number' || typeof p2.x !== 'number' || typeof p2.y !== 'number') {
      throw new TypeError('Points must have numeric x and y coordinates');
    }
    const maxDist = Math.max(0.1, Number(dist) || 5);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      return [{ x: p1.x, y: p1.y }];
    }

    const steps = Math.max(1, Math.ceil(distance / maxDist));
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: Number((p1.x + dx * t).toFixed(2)),
        y: Number((p1.y + dy * t).toFixed(2))
      });
    }
    return points;
  }

  /**
   * Catmull-Rom spline to cubic Bezier control points conversion
   * Returns array of cubic Bezier segments: { start, cp1, cp2, end }
   */
  catmullRomToBezier(points, tension = 1) {
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }
    if (points.length === 2) {
      const [p0, p1] = points;
      return [{
        start: { x: p0.x, y: p0.y },
        cp1: {
          x: Number((p0.x + (p1.x - p0.x) / 3).toFixed(2)),
          y: Number((p0.y + (p1.y - p0.y) / 3).toFixed(2))
        },
        cp2: {
          x: Number((p1.x - (p1.x - p0.x) / 3).toFixed(2)),
          y: Number((p1.y - (p1.y - p0.y) / 3).toFixed(2))
        },
        end: { x: p1.x, y: p1.y }
      }];
    }

    const t = Math.max(0.01, Number(tension) || 1);
    const segments = [];
    const n = points.length;

    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : { x: 2 * points[0].x - points[1].x, y: 2 * points[0].y - points[1].y };
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < n ? points[i + 2] : { x: 2 * points[n - 1].x - points[n - 2].x, y: 2 * points[n - 1].y - points[n - 2].y };

      const cp1 = {
        x: Number((p1.x + (p2.x - p0.x) / (6 * t)).toFixed(2)),
        y: Number((p1.y + (p2.y - p0.y) / (6 * t)).toFixed(2))
      };
      const cp2 = {
        x: Number((p2.x - (p3.x - p1.x) / (6 * t)).toFixed(2)),
        y: Number((p2.y - (p3.y - p1.y) / (6 * t)).toFixed(2))
      };

      segments.push({
        start: { x: p1.x, y: p1.y },
        cp1,
        cp2,
        end: { x: p2.x, y: p2.y }
      });
    }

    return segments;
  }

  /**
   * Generates SVG path string using Catmull-Rom smoothing
   */
  catmullRomToPath(points, tension = 1) {
    if (!Array.isArray(points) || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    const segments = this.catmullRomToBezier(points, tension);
    let d = `M ${points[0].x} ${points[0].y}`;
    for (const seg of segments) {
      d += ` C ${seg.cp1.x} ${seg.cp1.y}, ${seg.cp2.x} ${seg.cp2.y}, ${seg.end.x} ${seg.end.y}`;
    }
    return d;
  }

  /**
   * Internal stroke creator and validator
   */
  createStroke(partial = {}) {
    const tool = this.normalizeTool(partial.tool || this._tool);
    const stroke = {
      id: partial.id || `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tool,
      color: partial.color || this._color,
      strokeWidth: typeof partial.strokeWidth === 'number' ? partial.strokeWidth : this._strokeWidth,
      opacity: typeof partial.opacity === 'number' ? partial.opacity : this._opacity,
      timestamp: partial.timestamp || Date.now()
    };

    if (tool === 'pen' || tool === 'eraser') {
      stroke.points = Array.isArray(partial.points)
        ? partial.points.map(p => ({ x: Number(p.x), y: Number(p.y) }))
        : [];
    } else {
      stroke.startPoint = partial.startPoint
        ? { x: Number(partial.startPoint.x), y: Number(partial.startPoint.y) }
        : { x: 0, y: 0 };
      stroke.endPoint = partial.endPoint
        ? { x: Number(partial.endPoint.x), y: Number(partial.endPoint.y) }
        : { x: 0, y: 0 };
      if (tool === 'component') {
        stroke.label = partial.label || 'Microservice Node';
        stroke.sublabel = partial.sublabel || 'Port 8080';
      }
    }

    return stroke;
  }

  /**
   * Bounded undo / redo with capacity eviction
   */
  addStroke(stroke) {
    const validated = this.createStroke(stroke);
    this.strokes.push(validated);
    this.redoStack = []; // Evict redo stack on new stroke

    // Capacity eviction
    while (this.strokes.length > this.maxHistory) {
      this.strokes.shift(); // Evict oldest stroke
    }

    this.emit('stroke:add', validated);
    this.emit('change', { type: 'add', stroke: validated });
    this.render();
    return validated;
  }

  undo() {
    if (this.strokes.length === 0) return null;
    const stroke = this.strokes.pop();
    this.redoStack.push(stroke);
    this.emit('undo', stroke);
    this.emit('change', { type: 'undo', stroke });
    this.render();
    return stroke;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const stroke = this.redoStack.pop();
    this.strokes.push(stroke);
    this.emit('redo', stroke);
    this.emit('change', { type: 'redo', stroke });
    this.render();
    return stroke;
  }

  clear() {
    if (this.strokes.length === 0) return false;
    this.strokes = [];
    this.redoStack = [];
    this.emit('clear');
    this.emit('change', { type: 'clear' });
    this.render();
    return true;
  }

  /**
   * Event Emitter: on, off, emit
   */
  on(event, handler) {
    if (typeof handler !== 'function') throw new TypeError('Event handler must be a function');
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.listeners.has(event)) return;
    if (!handler) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event).delete(handler);
    }
  }

  emit(event, ...args) {
    if (!this.listeners.has(event)) return;
    for (const handler of [...this.listeners.get(event)]) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Error in "${event}" listener:`, err);
      }
    }
  }

  /**
   * SVG export producing valid XML: <svg>...<path>...<text>...<circle>...
   */
  exportSVG(options = {}) {
    const width = options.width || this.width;
    const height = options.height || this.height;
    const includeBackground = options.includeBackground !== false;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    xml += `  <defs>\n`;
    xml += `    <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">\n`;
    xml += `      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.5"/>\n`;
    xml += `    </filter>\n`;
    xml += `  </defs>\n`;

    if (includeBackground) {
      xml += `  <rect width="100%" height="100%" fill="${THEME_PALETTE.ideBackground}"/>\n`;
    }

    for (const stroke of this.strokes) {
      xml += this.strokeToSVG(stroke);
    }

    xml += `</svg>`;
    return xml;
  }

  strokeToSVG(stroke) {
    const color = stroke.color || THEME_PALETTE.reactCyan;
    const strokeWidth = stroke.strokeWidth || 3;
    const opacity = typeof stroke.opacity === 'number' ? stroke.opacity : 1.0;

    switch (stroke.tool) {
      case 'pen': {
        const d = this.catmullRomToPath(stroke.points);
        return `  <path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>\n`;
      }

      case 'eraser': {
        const d = this.catmullRomToPath(stroke.points);
        return `  <path d="${d}" fill="none" stroke="${THEME_PALETTE.ideBackground}" stroke-width="${strokeWidth * 3}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      }

      case 'arrow': {
        const start = stroke.startPoint || { x: 0, y: 0 };
        const end = stroke.endPoint || { x: 0, y: 0 };
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = Math.max(12, strokeWidth * 3.5);
        const p1 = {
          x: Number((end.x - headLen * Math.cos(angle - Math.PI / 6)).toFixed(2)),
          y: Number((end.y - headLen * Math.sin(angle - Math.PI / 6)).toFixed(2))
        };
        const p2 = {
          x: Number((end.x - headLen * Math.cos(angle + Math.PI / 6)).toFixed(2)),
          y: Number((end.y - headLen * Math.sin(angle + Math.PI / 6)).toFixed(2))
        };
        return `  <g class="arrow-stroke" opacity="${opacity}">\n` +
               `    <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>\n` +
               `    <polygon points="${end.x},${end.y} ${p1.x},${p1.y} ${p2.x},${p2.y}" fill="${color}"/>\n` +
               `  </g>\n`;
      }

      case 'rectangle': {
        const start = stroke.startPoint || { x: 0, y: 0 };
        const end = stroke.endPoint || { x: 0, y: 0 };
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x);
        const h = Math.abs(end.y - start.y);
        return `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>\n`;
      }

      case 'circle': {
        const start = stroke.startPoint || { x: 0, y: 0 };
        const end = stroke.endPoint || { x: 0, y: 0 };
        const radius = Number(Math.hypot(end.x - start.x, end.y - start.y).toFixed(2));
        return `  <circle cx="${start.x}" cy="${start.y}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>\n`;
      }

      case 'component': {
        const start = stroke.startPoint || { x: 0, y: 0 };
        const end = stroke.endPoint || { x: 0, y: 0 };
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.max(140, Math.abs(end.x - start.x));
        const h = Math.max(70, Math.abs(end.y - start.y));
        const label = stroke.label || 'Microservice Node';
        return `  <g class="component-node" opacity="${opacity}">\n` +
               `    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#161b22" stroke="${color}" stroke-width="${strokeWidth}"/>\n` +
               `    <line x1="${x}" y1="${y + 24}" x2="${x + w}" y2="${y + 24}" stroke="${color}" stroke-opacity="0.3" stroke-width="1"/>\n` +
               `    <circle cx="${x}" cy="${y + h / 2}" r="4" fill="${color}"/>\n` +
               `    <circle cx="${x + w}" cy="${y + h / 2}" r="4" fill="${color}"/>\n` +
               `    <circle cx="${x + w / 2}" cy="${y}" r="4" fill="${color}"/>\n` +
               `    <circle cx="${x + w / 2}" cy="${y + h}" r="4" fill="${color}"/>\n` +
               `    <text x="${x + w / 2}" y="${y + 16}" fill="${color}" font-family="Fira Code, monospace" font-size="11" font-weight="bold" text-anchor="middle">${escapeXml(label)}</text>\n` +
               `  </g>\n`;
      }

      default:
        return '';
    }
  }

  /**
   * JSON serialization & load lifecycle
   */
  exportJSON(pretty = true) {
    const data = {
      schemaVersion: '1.0.0',
      app: 'developer-portfolio-canvas-whiteboard',
      width: this.width,
      height: this.height,
      theme: THEME_PALETTE,
      strokes: this.strokes.map(s => ({ ...s })),
      exportedAt: new Date().toISOString()
    };
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  loadJSON(jsonOrObject) {
    let parsed = jsonOrObject;
    if (typeof jsonOrObject === 'string') {
      try {
        parsed = JSON.parse(jsonOrObject);
      } catch (e) {
        throw new Error(`Failed to parse whiteboard JSON: ${e.message}`);
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new TypeError('Loaded whiteboard data must be a valid JSON object');
    }

    if (!Array.isArray(parsed.strokes)) {
      throw new TypeError('Whiteboard data missing valid "strokes" array');
    }

    if (typeof parsed.width === 'number' && parsed.width > 0) {
      this.width = parsed.width;
    }
    if (typeof parsed.height === 'number' && parsed.height > 0) {
      this.height = parsed.height;
    }

    const loadedStrokes = parsed.strokes.map(s => this.createStroke(s));
    this.strokes = loadedStrokes;
    this.redoStack = [];

    this.emit('load', { count: this.strokes.length });
    this.emit('change', { type: 'load', strokes: this.strokes });
    this.render();
    return true;
  }

  /**
   * Mockable 2D context render engine: renderStroke(stroke, ctx)
   */
  renderStroke(stroke, ctx) {
    if (!stroke || !ctx) return;
    ctx.save();

    try {
      ctx.globalAlpha = typeof stroke.opacity === 'number' ? stroke.opacity : 1.0;
      ctx.lineWidth = typeof stroke.strokeWidth === 'number' ? stroke.strokeWidth : 3;
      ctx.strokeStyle = stroke.color || THEME_PALETTE.reactCyan;
      ctx.fillStyle = stroke.color || THEME_PALETTE.reactCyan;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (stroke.tool) {
        case 'pen': {
          if (!stroke.points || stroke.points.length === 0) break;
          if (stroke.points.length === 1) {
            ctx.beginPath();
            ctx.arc(stroke.points[0].x, stroke.points[0].y, Math.max(1, stroke.strokeWidth / 2), 0, Math.PI * 2);
            ctx.fill();
          } else {
            const segments = this.catmullRomToBezier(stroke.points);
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (const seg of segments) {
              ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
            }
            ctx.stroke();
          }
          break;
        }

        case 'eraser': {
          if (!stroke.points || stroke.points.length === 0) break;
          ctx.strokeStyle = THEME_PALETTE.ideBackground;
          ctx.lineWidth = stroke.strokeWidth * 3;
          if (stroke.points.length === 1) {
            ctx.fillStyle = THEME_PALETTE.ideBackground;
            ctx.beginPath();
            ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.strokeWidth * 1.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const segments = this.catmullRomToBezier(stroke.points);
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (const seg of segments) {
              ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
            }
            ctx.stroke();
          }
          break;
        }

        case 'arrow': {
          const start = stroke.startPoint || { x: 0, y: 0 };
          const end = stroke.endPoint || { x: 0, y: 0 };
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const headLen = Math.max(12, stroke.strokeWidth * 3.5);
          const p1 = {
            x: end.x - headLen * Math.cos(angle - Math.PI / 6),
            y: end.y - headLen * Math.sin(angle - Math.PI / 6)
          };
          const p2 = {
            x: end.x - headLen * Math.cos(angle + Math.PI / 6),
            y: end.y - headLen * Math.sin(angle + Math.PI / 6)
          };
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.closePath();
          ctx.fill();
          break;
        }

        case 'rectangle': {
          const start = stroke.startPoint || { x: 0, y: 0 };
          const end = stroke.endPoint || { x: 0, y: 0 };
          const x = Math.min(start.x, end.x);
          const y = Math.min(start.y, end.y);
          const w = Math.abs(end.x - start.x);
          const h = Math.abs(end.y - start.y);
          ctx.strokeRect(x, y, w, h);
          break;
        }

        case 'circle': {
          const start = stroke.startPoint || { x: 0, y: 0 };
          const end = stroke.endPoint || { x: 0, y: 0 };
          const radius = Math.hypot(end.x - start.x, end.y - start.y);
          ctx.beginPath();
          ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'component': {
          const start = stroke.startPoint || { x: 0, y: 0 };
          const end = stroke.endPoint || { x: 0, y: 0 };
          const x = Math.min(start.x, end.x);
          const y = Math.min(start.y, end.y);
          const w = Math.max(140, Math.abs(end.x - start.x));
          const h = Math.max(70, Math.abs(end.y - start.y));

          ctx.fillStyle = '#161b22';
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 6);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
          }

          // Header divider
          ctx.beginPath();
          ctx.moveTo(x, y + 24);
          ctx.lineTo(x + w, y + 24);
          ctx.stroke();

          // Connection port dots
          ctx.fillStyle = stroke.color;
          const ports = [
            { x, y: y + h / 2 },
            { x: x + w, y: y + h / 2 },
            { x: x + w / 2, y },
            { x: x + w / 2, y: y + h }
          ];
          for (const p of ports) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Label
          ctx.font = 'bold 11px "Fira Code", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(stroke.label || 'Microservice Node', x + w / 2, y + 13);
          break;
        }
      }
    } finally {
      ctx.restore();
    }
  }

  renderGrid(ctx) {
    if (!this.showGrid || !ctx) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    const step = 28;
    for (let x = step; x < this.width; x += step) {
      for (let y = step; y < this.height; y += step) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    ctx.restore();
  }

  render(targetCtx = this.ctx) {
    if (!targetCtx) return;
    targetCtx.clearRect(0, 0, this.width, this.height);

    this.renderGrid(targetCtx);

    for (const stroke of this.strokes) {
      this.renderStroke(stroke, targetCtx);
    }

    if (this.activeStroke) {
      this.renderStroke(this.activeStroke, targetCtx);
    }
  }

  /**
   * Architecture Backdrop Templates
   */
  loadTemplate(templateKey) {
    const key = String(templateKey).toLowerCase().trim();
    this.strokes = [];
    this.redoStack = [];

    if (key === 'microservices' || key === 'microservices-cluster') {
      const gw = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.reactCyan,
        strokeWidth: 2,
        startPoint: { x: 120, y: 180 },
        endPoint: { x: 280, y: 260 },
        label: 'API Gateway :443'
      });
      const auth = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.syntaxPink,
        strokeWidth: 2,
        startPoint: { x: 420, y: 90 },
        endPoint: { x: 580, y: 170 },
        label: 'Auth Service :8081'
      });
      const order = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.nodeGreen,
        strokeWidth: 2,
        startPoint: { x: 420, y: 270 },
        endPoint: { x: 580, y: 350 },
        label: 'Order Service :8082'
      });
      const redis = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.rustOrange,
        strokeWidth: 2,
        startPoint: { x: 720, y: 90 },
        endPoint: { x: 880, y: 170 },
        label: 'Redis Cache :6379'
      });
      const pay = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.typeScriptBlue,
        strokeWidth: 2,
        startPoint: { x: 720, y: 270 },
        endPoint: { x: 880, y: 350 },
        label: 'Payment Engine :8083'
      });

      const a1 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.pureWhite,
        strokeWidth: 2,
        startPoint: { x: 280, y: 210 },
        endPoint: { x: 420, y: 130 }
      });
      const a2 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.pureWhite,
        strokeWidth: 2,
        startPoint: { x: 280, y: 230 },
        endPoint: { x: 420, y: 310 }
      });
      const a3 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.pureWhite,
        strokeWidth: 2,
        startPoint: { x: 580, y: 130 },
        endPoint: { x: 720, y: 130 }
      });
      const a4 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.pureWhite,
        strokeWidth: 2,
        startPoint: { x: 580, y: 310 },
        endPoint: { x: 720, y: 310 }
      });

      this.strokes = [gw, auth, order, redis, pay, a1, a2, a3, a4];
    } else if (key === 'erd' || key === 'erd-schema') {
      const users = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.typeScriptBlue,
        strokeWidth: 2,
        startPoint: { x: 100, y: 120 },
        endPoint: { x: 270, y: 220 },
        label: 'Table: Users (PK: id)'
      });
      const orders = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.nodeGreen,
        strokeWidth: 2,
        startPoint: { x: 420, y: 120 },
        endPoint: { x: 600, y: 220 },
        label: 'Table: Orders (FK: user_id)'
      });
      const items = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.rustOrange,
        strokeWidth: 2,
        startPoint: { x: 740, y: 120 },
        endPoint: { x: 920, y: 220 },
        label: 'Table: Order_Items'
      });
      const rel1 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.reactCyan,
        strokeWidth: 2,
        startPoint: { x: 270, y: 170 },
        endPoint: { x: 420, y: 170 }
      });
      const rel2 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.reactCyan,
        strokeWidth: 2,
        startPoint: { x: 600, y: 170 },
        endPoint: { x: 740, y: 170 }
      });

      this.strokes = [users, orders, items, rel1, rel2];
    } else if (key === 'eventbus' || key === 'event-bus' || key === 'pipeline') {
      const prod = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.reactCyan,
        strokeWidth: 2,
        startPoint: { x: 100, y: 180 },
        endPoint: { x: 260, y: 260 },
        label: 'Event Producer Node'
      });
      const kafka = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.rustOrange,
        strokeWidth: 2,
        startPoint: { x: 380, y: 180 },
        endPoint: { x: 560, y: 260 },
        label: 'Kafka Event Stream'
      });
      const worker = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.nodeGreen,
        strokeWidth: 2,
        startPoint: { x: 680, y: 100 },
        endPoint: { x: 860, y: 180 },
        label: 'Worker: ETL Ingestion'
      });
      const analytics = this.createStroke({
        tool: 'component',
        color: THEME_PALETTE.syntaxPink,
        strokeWidth: 2,
        startPoint: { x: 680, y: 260 },
        endPoint: { x: 860, y: 340 },
        label: 'Sink: Realtime Telemetry'
      });
      const e1 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.pureWhite,
        strokeWidth: 2,
        startPoint: { x: 260, y: 220 },
        endPoint: { x: 380, y: 220 }
      });
      const e2 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.pureWhite,
        strokeWidth: 2,
        startPoint: { x: 560, y: 210 },
        endPoint: { x: 680, y: 140 }
      });
      const e3 = this.createStroke({
        tool: 'arrow',
        color: THEME_PALETTE.pureWhite,
        strokeWidth: 2,
        startPoint: { x: 560, y: 230 },
        endPoint: { x: 680, y: 300 }
      });

      this.strokes = [prod, kafka, worker, analytics, e1, e2, e3];
    }

    this.emit('template:change', { template: key, count: this.strokes.length });
    this.emit('change', { type: 'template', template: key });
    this.render();
    return this.strokes.length;
  }

  /**
   * DOM event listener binding (PointerEvent / MouseEvent, touch, resize, High-DPI devicePixelRatio)
   */
  bindEvents() {
    if (!this.canvas) return;

    const getCanvasPoint = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      let clientX = e.clientX;
      let clientY = e.clientY;

      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      const scaleX = this.width / (rect.width || this.width);
      const scaleY = this.height / (rect.height || this.height);

      return {
        x: Number(((clientX - rect.left) * scaleX).toFixed(2)),
        y: Number(((clientY - rect.top) * scaleY).toFixed(2))
      };
    };

    const handlePointerDown = (e) => {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      const pos = getCanvasPoint(e);
      this.isDrawing = true;

      if (this._tool === 'pen' || this._tool === 'eraser') {
        this.activeStroke = this.createStroke({
          tool: this._tool,
          color: this._color,
          strokeWidth: this._strokeWidth,
          opacity: this._opacity,
          points: [pos]
        });
      } else {
        this.activeStroke = this.createStroke({
          tool: this._tool,
          color: this._color,
          strokeWidth: this._strokeWidth,
          opacity: this._opacity,
          startPoint: pos,
          endPoint: pos
        });
      }

      this.emit('stroke:start', this.activeStroke);
      this.render();
    };

    const handlePointerMove = (e) => {
      if (!this.isDrawing || !this.activeStroke) return;
      if (typeof e.preventDefault === 'function') e.preventDefault();
      const pos = getCanvasPoint(e);

      if (this._tool === 'pen' || this._tool === 'eraser') {
        const lastPoint = this.activeStroke.points[this.activeStroke.points.length - 1];
        const interpolated = this.interpolatePoints(lastPoint, pos, 5);
        this.activeStroke.points.push(...interpolated.slice(1));
      } else {
        this.activeStroke.endPoint = pos;
      }

      this.emit('stroke:point', pos);
      this.render();
    };

    const handlePointerUp = (e) => {
      if (!this.isDrawing || !this.activeStroke) return;
      if (typeof e.preventDefault === 'function') e.preventDefault();
      this.isDrawing = false;
      const finished = this.activeStroke;
      this.activeStroke = null;
      this.addStroke(finished);
      this.emit('stroke:end', finished);
    };

    const addListener = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts);
      this._boundListeners.push({ target, type, fn });
    };

    addListener(this.canvas, 'pointerdown', handlePointerDown);
    addListener(this.canvas, 'pointermove', handlePointerMove);
    addListener(this.canvas, 'pointerup', handlePointerUp);
    addListener(this.canvas, 'pointercancel', handlePointerUp);
    addListener(this.canvas, 'pointerleave', handlePointerUp);

    // Touch event fallback support
    addListener(this.canvas, 'touchstart', handlePointerDown, { passive: false });
    addListener(this.canvas, 'touchmove', handlePointerMove, { passive: false });
    addListener(this.canvas, 'touchend', handlePointerUp);

    if (typeof window !== 'undefined') {
      const handleResize = () => {
        this.resize(this.width, this.height);
      };
      addListener(window, 'resize', handleResize);
    }
  }

  resize(width, height) {
    if (width) this.width = Number(width);
    if (height) this.height = Number(height);

    if (this.canvas) {
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      this.canvas.width = Math.floor(this.width * dpr);
      this.canvas.height = Math.floor(this.height * dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      if (this.ctx && typeof this.ctx.setTransform === 'function') {
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    this.render();
  }

  exportPNG() {
    if (this.canvas && typeof this.canvas.toDataURL === 'function') {
      return this.canvas.toDataURL('image/png');
    }
    return null;
  }

  destroy() {
    for (const { target, type, fn } of this._boundListeners) {
      target.removeEventListener(type, fn);
    }
    this._boundListeners = [];
    this.listeners.clear();
  }
}
