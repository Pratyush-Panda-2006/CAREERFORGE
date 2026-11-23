/**
 * Docs Portal Whiteboard Canvas & Technical Architecture Diagrammer
 * Collaborative freehand vector sketchpad with Catmull-Rom spline smoothing,
 * bounded history, SVG/JSON serialization, and mockable 2D rendering engine.
 *
 * Part of NSoC '26 Docs Portal Showcase.
 */

export const WHITEBOARD_PALETTE = Object.freeze({
  terminalDark: '#090d16',
  docBlue: '#3b82f6',
  mintGreen: '#10b981',
  amberWarning: '#f59e0b',
  purpleSyntax: '#a855f7',
  canvasWhite: '#f8fafc',
  slateBorder: '#334155'
});

export const VALID_TOOLS = Object.freeze([
  'pen',
  'eraser',
  'connector',
  'note',
  'rectangle',
  'circle'
]);

export const TOOL_ALIASES = Object.freeze({
  brush: 'pen',
  pencil: 'pen',
  draw: 'pen',
  freehand: 'pen',
  line: 'connector',
  arrow: 'connector',
  wire: 'connector',
  sticky: 'note',
  text: 'note',
  card: 'note',
  rect: 'rectangle',
  box: 'rectangle',
  square: 'rectangle',
  oval: 'circle',
  ellipse: 'circle',
  round: 'circle'
});

/**
 * Escapes characters for safe inclusion in SVG / XML attributes and text.
 */
function escapeXml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class DocsPortalWhiteboardCanvas {
  static PALETTE = WHITEBOARD_PALETTE;
  static VALID_TOOLS = VALID_TOOLS;
  static TOOL_ALIASES = TOOL_ALIASES;

  #tool = 'pen';
  #color = WHITEBOARD_PALETTE.docBlue;
  #strokeWidth = 3;
  #opacity = 1.0;
  #backgroundColor = WHITEBOARD_PALETTE.terminalDark;
  #strokes = [];
  #undoStack = [];
  #redoStack = [];
  #maxHistory = 50;
  #listeners = new Map();

  // Canvas DOM properties
  #canvas = null;
  #ctx = null;
  #isDrawing = false;
  #currentStroke = null;
  #width = 1200;
  #height = 800;
  #boundHandlers = null;

  constructor(options = {}) {
    this.#maxHistory = Math.max(1, Math.min(Number(options.maxHistory) || 50, 500));
    this.#width = Math.max(100, Number(options.width) || 1200);
    this.#height = Math.max(100, Number(options.height) || 800);

    if (options.tool) {
      this.setTool(options.tool);
    }
    if (options.color) {
      this.setColor(options.color);
    }
    if (options.strokeWidth !== undefined) {
      this.setStrokeWidth(options.strokeWidth);
    }
    if (options.opacity !== undefined) {
      this.setOpacity(options.opacity);
    }
    if (options.backgroundColor) {
      this.#backgroundColor = String(options.backgroundColor);
    }

    if (options.canvas) {
      this.attach(options.canvas);
    }
  }

  // Getters
  get palette() { return WHITEBOARD_PALETTE; }
  get currentTool() { return this.#tool; }
  get tool() { return this.#tool; }
  get color() { return this.#color; }
  get strokeWidth() { return this.#strokeWidth; }
  get opacity() { return this.#opacity; }
  get backgroundColor() { return this.#backgroundColor; }
  get maxHistory() { return this.#maxHistory; }
  get width() { return this.#width; }
  get height() { return this.#height; }
  get canvas() { return this.#canvas; }
  get ctx() { return this.#ctx; }
  get strokes() { return this.#strokes.map(s => this.#cloneStroke(s)); }
  get historyLength() { return this.#undoStack.length; }

  // Tool & Brush Customization
  normalizeTool(toolName) {
    if (typeof toolName !== 'string' || !toolName.trim()) {
      throw new TypeError('Tool name must be a non-empty string.');
    }
    const clean = toolName.trim().toLowerCase();
    const resolved = TOOL_ALIASES[clean] || clean;
    if (!VALID_TOOLS.includes(resolved)) {
      throw new Error(`Invalid tool "${toolName}". Valid tools: ${VALID_TOOLS.join(', ')}`);
    }
    return resolved;
  }

  setTool(toolName) {
    const prev = this.#tool;
    this.#tool = this.normalizeTool(toolName);
    if (prev !== this.#tool) {
      this.emit('tool:change', { tool: this.#tool, previous: prev });
    }
    return this;
  }

  setColor(colorStr) {
    if (typeof colorStr !== 'string' || !colorStr.trim()) {
      throw new TypeError('Color must be a valid non-empty string.');
    }
    const prev = this.#color;
    this.#color = colorStr.trim();
    if (prev !== this.#color) {
      this.emit('color:change', { color: this.#color, previous: prev });
    }
    return this;
  }

  clampStrokeWidth(width) {
    const num = Number(width);
    if (Number.isNaN(num)) return 3;
    return Math.min(Math.max(Math.round(num), 1), 64);
  }

  setStrokeWidth(width) {
    const prev = this.#strokeWidth;
    this.#strokeWidth = this.clampStrokeWidth(width);
    if (prev !== this.#strokeWidth) {
      this.emit('strokeWidth:change', { strokeWidth: this.#strokeWidth, previous: prev });
    }
    return this;
  }

  clampOpacity(opacity) {
    const num = Number(opacity);
    if (Number.isNaN(num)) return 1.0;
    return Math.min(Math.max(Number(num.toFixed(2)), 0.05), 1.0);
  }

  setOpacity(opacity) {
    const prev = this.#opacity;
    this.#opacity = this.clampOpacity(opacity);
    if (prev !== this.#opacity) {
      this.emit('opacity:change', { opacity: this.#opacity, previous: prev });
    }
    return this;
  }

  setBackgroundColor(color) {
    this.#backgroundColor = String(color);
    this.render();
    return this;
  }

  // Point Interpolation
  interpolatePoints(p1, p2, dist = 5) {
    if (!p1 && !p2) return [];
    if (!p1) return [{ ...p2 }];
    if (!p2) return [{ ...p1 }];

    const stepDist = Math.max(Number(dist) || 5, 0.5);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const totalDist = Math.hypot(dx, dy);

    if (totalDist === 0) {
      return [{ ...p1 }];
    }
    if (totalDist <= stepDist) {
      return [{ ...p1 }, { ...p2 }];
    }

    const steps = Math.ceil(totalDist / stepDist);
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = {
        x: Number((p1.x + dx * t).toFixed(2)),
        y: Number((p1.y + dy * t).toFixed(2))
      };
      if (p1.pressure !== undefined && p2.pressure !== undefined) {
        pt.pressure = Number((p1.pressure + (p2.pressure - p1.pressure) * t).toFixed(2));
      }
      points.push(pt);
    }
    return points;
  }

  // Catmull-Rom to Cubic Bezier Curve Generation
  catmullRomToBezier(points) {
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }

    const n = points.length;
    const beziers = [];

    if (n === 2) {
      const p0 = points[0];
      const p1 = points[1];
      beziers.push({
        cp1: {
          x: Number((p0.x + (p1.x - p0.x) / 3).toFixed(2)),
          y: Number((p0.y + (p1.y - p0.y) / 3).toFixed(2))
        },
        cp2: {
          x: Number((p0.x + (2 * (p1.x - p0.x)) / 3).toFixed(2)),
          y: Number((p0.y + (2 * (p1.y - p0.y)) / 3).toFixed(2))
        },
        end: { x: p1.x, y: p1.y }
      });
      return beziers;
    }

    for (let i = 0; i < n - 1; i++) {
      const pPrev = i > 0 ? points[i - 1] : points[i];
      const pCurr = points[i];
      const pNext = points[i + 1];
      const pAfter = i + 2 < n ? points[i + 2] : points[i + 1];

      const cp1x = Number((pCurr.x + (pNext.x - pPrev.x) / 6).toFixed(2));
      const cp1y = Number((pCurr.y + (pNext.y - pPrev.y) / 6).toFixed(2));
      const cp2x = Number((pNext.x - (pAfter.x - pCurr.x) / 6).toFixed(2));
      const cp2y = Number((pNext.y - (pAfter.y - pCurr.y) / 6).toFixed(2));

      beziers.push({
        cp1: { x: cp1x, y: cp1y },
        cp2: { x: cp2x, y: cp2y },
        end: { x: pNext.x, y: pNext.y }
      });
    }

    return beziers;
  }

  generateBezierPath(points) {
    if (!Array.isArray(points) || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
    }
    const beziers = this.catmullRomToBezier(points);
    let d = `M ${points[0].x} ${points[0].y}`;
    for (const b of beziers) {
      d += ` C ${b.cp1.x} ${b.cp1.y}, ${b.cp2.x} ${b.cp2.y}, ${b.end.x} ${b.end.y}`;
    }
    return d;
  }

  // Stroke Management & Undo / Redo
  #cloneStroke(stroke) {
    if (!stroke) return null;
    return JSON.parse(JSON.stringify(stroke));
  }

  addStroke(stroke) {
    if (!stroke || typeof stroke !== 'object') {
      throw new TypeError('Stroke must be an object.');
    }

    const tool = stroke.tool ? this.normalizeTool(stroke.tool) : this.#tool;
    const preparedStroke = {
      id: stroke.id || `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tool,
      color: stroke.color || (tool === 'eraser' ? this.#backgroundColor : this.#color),
      strokeWidth: stroke.strokeWidth !== undefined ? this.clampStrokeWidth(stroke.strokeWidth) : this.#strokeWidth,
      opacity: stroke.opacity !== undefined ? this.clampOpacity(stroke.opacity) : this.#opacity,
      timestamp: stroke.timestamp || Date.now(),
      ...stroke
    };
    preparedStroke.tool = tool;

    // Snapshot for undo
    this.#undoStack.push(this.strokes);
    if (this.#undoStack.length > this.#maxHistory) {
      this.#undoStack.shift();
    }

    // Evict redo stack upon new stroke
    this.#redoStack = [];

    this.#strokes.push(preparedStroke);

    this.emit('stroke:add', preparedStroke);
    this.emit('change', { strokes: this.strokes });

    this.render();
    return preparedStroke;
  }

  undo() {
    if (!this.canUndo()) return false;

    // Save current state to redo
    this.#redoStack.push(this.strokes);

    // Restore previous state
    this.#strokes = this.#undoStack.pop();

    this.emit('undo', { strokes: this.strokes });
    this.emit('change', { strokes: this.strokes });

    this.render();
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;

    // Save current state to undo
    this.#undoStack.push(this.strokes);

    // Restore state from redo
    this.#strokes = this.#redoStack.pop();

    this.emit('redo', { strokes: this.strokes });
    this.emit('change', { strokes: this.strokes });

    this.render();
    return true;
  }

  canUndo() {
    return this.#undoStack.length > 0;
  }

  canRedo() {
    return this.#redoStack.length > 0;
  }

  clear() {
    if (this.#strokes.length === 0) return false;

    this.#undoStack.push(this.strokes);
    if (this.#undoStack.length > this.#maxHistory) {
      this.#undoStack.shift();
    }
    this.#redoStack = [];

    this.#strokes = [];

    this.emit('clear', {});
    this.emit('change', { strokes: [] });

    this.render();
    return true;
  }

  // Event Emitter (on, off, emit)
  on(event, handler) {
    if (typeof event !== 'string' || !event.trim() || typeof handler !== 'function') {
      throw new TypeError('Event name must be a non-empty string and handler must be a function.');
    }
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(handler);
    return this;
  }

  off(event, handler) {
    if (!this.#listeners.has(event)) return this;
    if (!handler) {
      this.#listeners.delete(event);
    } else {
      this.#listeners.get(event).delete(handler);
    }
    return this;
  }

  emit(event, ...args) {
    if (!this.#listeners.has(event)) return false;
    const handlers = Array.from(this.#listeners.get(event));
    for (const fn of handlers) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
    return true;
  }

  // Mockable 2D Render Engine
  renderStroke(stroke, ctx) {
    if (!stroke || !ctx) return;

    if (typeof ctx.save === 'function') ctx.save();

    const tool = stroke.tool || 'pen';
    const width = stroke.strokeWidth || 3;
    const opacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;
    const color = stroke.color || WHITEBOARD_PALETTE.docBlue;

    if (ctx.lineWidth !== undefined) ctx.lineWidth = width;
    if (ctx.strokeStyle !== undefined) ctx.strokeStyle = color;
    if (ctx.fillStyle !== undefined) ctx.fillStyle = stroke.fill || color;
    if (ctx.globalAlpha !== undefined) ctx.globalAlpha = opacity;
    if (ctx.lineCap !== undefined) ctx.lineCap = 'round';
    if (ctx.lineJoin !== undefined) ctx.lineJoin = 'round';

    switch (tool) {
      case 'pen': {
        const points = stroke.points || [];
        if (points.length === 0) break;
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(points[0].x, points[0].y);

        if (points.length === 1) {
          if (typeof ctx.arc === 'function') {
            ctx.arc(points[0].x, points[0].y, Math.max(1, width / 2), 0, Math.PI * 2);
          }
          if (typeof ctx.fill === 'function') ctx.fill();
        } else if (points.length === 2) {
          if (typeof ctx.lineTo === 'function') ctx.lineTo(points[1].x, points[1].y);
          if (typeof ctx.stroke === 'function') ctx.stroke();
        } else {
          const beziers = this.catmullRomToBezier(points);
          for (const b of beziers) {
            if (typeof ctx.bezierCurveTo === 'function') {
              ctx.bezierCurveTo(b.cp1.x, b.cp1.y, b.cp2.x, b.cp2.y, b.end.x, b.end.y);
            }
          }
          if (typeof ctx.stroke === 'function') ctx.stroke();
        }
        break;
      }

      case 'eraser': {
        const points = stroke.points || [];
        if (points.length === 0) break;
        if (ctx.globalCompositeOperation !== undefined) {
          ctx.globalCompositeOperation = 'destination-out';
        }
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(points[0].x, points[0].y);

        if (points.length === 1) {
          if (typeof ctx.arc === 'function') {
            ctx.arc(points[0].x, points[0].y, width, 0, Math.PI * 2);
          }
          if (typeof ctx.fill === 'function') ctx.fill();
        } else {
          const beziers = this.catmullRomToBezier(points);
          for (const b of beziers) {
            if (typeof ctx.bezierCurveTo === 'function') {
              ctx.bezierCurveTo(b.cp1.x, b.cp1.y, b.cp2.x, b.cp2.y, b.end.x, b.end.y);
            }
          }
          if (typeof ctx.stroke === 'function') ctx.stroke();
        }
        break;
      }

      case 'rectangle': {
        const rx = stroke.x !== undefined ? stroke.x : 0;
        const ry = stroke.y !== undefined ? stroke.y : 0;
        const rw = stroke.width !== undefined ? stroke.width : 100;
        const rh = stroke.height !== undefined ? stroke.height : 60;
        const x = Math.min(rx, rx + rw);
        const y = Math.min(ry, ry + rh);
        const w = Math.abs(rw);
        const h = Math.abs(rh);

        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.rect === 'function') {
          ctx.rect(x, y, w, h);
        }
        if (stroke.fill && typeof ctx.fill === 'function') {
          ctx.fillStyle = stroke.fill;
          ctx.fill();
        }
        if (typeof ctx.stroke === 'function') ctx.stroke();
        break;
      }

      case 'circle': {
        const cx = stroke.cx !== undefined ? stroke.cx : (stroke.x || 0);
        const cy = stroke.cy !== undefined ? stroke.cy : (stroke.y || 0);
        const r = Math.abs(stroke.radius !== undefined ? stroke.radius : (stroke.r || 40));

        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.arc === 'function') {
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
        if (stroke.fill && typeof ctx.fill === 'function') {
          ctx.fillStyle = stroke.fill;
          ctx.fill();
        }
        if (typeof ctx.stroke === 'function') ctx.stroke();
        break;
      }

      case 'connector': {
        const from = stroke.from || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
        const to = stroke.to || (stroke.points && stroke.points[stroke.points.length - 1]) || { x: 100, y: 100 };

        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(from.x, from.y);
        if (typeof ctx.lineTo === 'function') ctx.lineTo(to.x, to.y);
        if (typeof ctx.stroke === 'function') ctx.stroke();

        // Arrow head
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const headLen = Math.max(width * 3, 10);
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(to.x, to.y);
        if (typeof ctx.lineTo === 'function') {
          ctx.lineTo(
            to.x - headLen * Math.cos(angle - Math.PI / 6),
            to.y - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            to.x - headLen * Math.cos(angle + Math.PI / 6),
            to.y - headLen * Math.sin(angle + Math.PI / 6)
          );
        }
        if (typeof ctx.closePath === 'function') ctx.closePath();
        if (typeof ctx.fill === 'function') {
          ctx.fillStyle = color;
          ctx.fill();
        }
        break;
      }

      case 'note': {
        const x = stroke.x !== undefined ? stroke.x : 100;
        const y = stroke.y !== undefined ? stroke.y : 100;
        const w = stroke.width || 180;
        const h = stroke.height || 100;

        // Card body
        if (typeof ctx.fillStyle !== 'undefined') {
          ctx.fillStyle = stroke.fill || 'rgba(30, 41, 59, 0.9)';
        }
        if (typeof ctx.fillRect === 'function') {
          ctx.fillRect(x, y, w, h);
        }
        if (typeof ctx.strokeStyle !== 'undefined') {
          ctx.strokeStyle = color || WHITEBOARD_PALETTE.amberWarning;
        }
        if (typeof ctx.strokeRect === 'function') {
          ctx.strokeRect(x, y, w, h);
        }

        // Header accent bar
        if (typeof ctx.fillStyle !== 'undefined') {
          ctx.fillStyle = color || WHITEBOARD_PALETTE.amberWarning;
        }
        if (typeof ctx.fillRect === 'function') {
          ctx.fillRect(x, y, w, 6);
        }

        // Note text
        if (stroke.text && typeof ctx.fillText === 'function') {
          if (ctx.fillStyle !== undefined) ctx.fillStyle = stroke.textColor || WHITEBOARD_PALETTE.canvasWhite;
          if (ctx.font !== undefined) ctx.font = '13px monospace, sans-serif';
          ctx.fillText(stroke.text.slice(0, 40), x + 10, y + 30);
          if (stroke.text.length > 40) {
            ctx.fillText(stroke.text.slice(40, 80), x + 10, y + 48);
          }
        }
        break;
      }

      default:
        break;
    }

    if (typeof ctx.restore === 'function') ctx.restore();
  }

  render(targetCtx = this.#ctx) {
    if (!targetCtx) return;

    const w = this.#width;
    const h = this.#height;

    // Clear background
    if (typeof targetCtx.clearRect === 'function') {
      targetCtx.clearRect(0, 0, w, h);
    }
    if (typeof targetCtx.fillStyle !== 'undefined' && typeof targetCtx.fillRect === 'function') {
      targetCtx.fillStyle = this.#backgroundColor;
      targetCtx.fillRect(0, 0, w, h);
    }

    // Technical grid pattern
    this.#renderGrid(targetCtx, w, h);

    // Render all saved strokes
    for (const stroke of this.#strokes) {
      this.renderStroke(stroke, targetCtx);
    }

    // Render live in-progress stroke if drawing
    if (this.#currentStroke) {
      this.renderStroke(this.#currentStroke, targetCtx);
    }
  }

  #renderGrid(ctx, w, h) {
    if (typeof ctx.beginPath !== 'function' || typeof ctx.stroke !== 'function') return;
    if (typeof ctx.save === 'function') ctx.save();

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;

    const gridSize = 30;
    ctx.beginPath();
    for (let x = 0; x <= w; x += gridSize) {
      if (typeof ctx.moveTo === 'function') ctx.moveTo(x, 0);
      if (typeof ctx.lineTo === 'function') ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += gridSize) {
      if (typeof ctx.moveTo === 'function') ctx.moveTo(0, y);
      if (typeof ctx.lineTo === 'function') ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (typeof ctx.restore === 'function') ctx.restore();
  }

  // Serialization: SVG Export
  exportSVG(options = {}) {
    const width = options.width || this.#width;
    const height = options.height || this.#height;
    const background = options.background || this.#backgroundColor;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svg += `  <rect width="100%" height="100%" fill="${background}"/>\n`;

    // Grid backdrop
    svg += `  <defs>\n`;
    svg += `    <pattern id="wb-grid" width="30" height="30" patternUnits="userSpaceOnUse">\n`;
    svg += `      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(51, 65, 85, 0.25)" stroke-width="1"/>\n`;
    svg += `    </pattern>\n`;
    svg += `  </defs>\n`;
    svg += `  <rect width="100%" height="100%" fill="url(#wb-grid)"/>\n`;

    for (const stroke of this.#strokes) {
      const tool = stroke.tool || 'pen';
      const width = stroke.strokeWidth || 3;
      const opacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;
      const color = stroke.color || WHITEBOARD_PALETTE.docBlue;

      switch (tool) {
        case 'pen': {
          const points = stroke.points || [];
          if (points.length === 0) break;
          const d = this.generateBezierPath(points);
          svg += `  <path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>\n`;
          break;
        }

        case 'eraser': {
          const points = stroke.points || [];
          if (points.length === 0) break;
          const d = this.generateBezierPath(points);
          svg += `  <path d="${d}" stroke="${background}" stroke-width="${width * 2}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="1.0"/>\n`;
          break;
        }

        case 'rectangle': {
          const rx = stroke.x !== undefined ? stroke.x : 0;
          const ry = stroke.y !== undefined ? stroke.y : 0;
          const rw = stroke.width !== undefined ? stroke.width : 100;
          const rh = stroke.height !== undefined ? stroke.height : 60;
          const x = Math.min(rx, rx + rw);
          const y = Math.min(ry, ry + rh);
          const w = Math.abs(rw);
          const h = Math.abs(rh);
          const fill = stroke.fill || 'rgba(59, 130, 246, 0.12)';
          svg += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${color}" stroke-width="${width}" fill="${fill}" rx="6" opacity="${opacity}"/>\n`;
          break;
        }

        case 'circle': {
          const cx = stroke.cx !== undefined ? stroke.cx : (stroke.x || 0);
          const cy = stroke.cy !== undefined ? stroke.cy : (stroke.y || 0);
          const r = Math.abs(stroke.radius !== undefined ? stroke.radius : (stroke.r || 40));
          const fill = stroke.fill || 'rgba(16, 185, 129, 0.12)';
          svg += `  <circle cx="${cx}" cy="${cy}" r="${r}" stroke="${color}" stroke-width="${width}" fill="${fill}" opacity="${opacity}"/>\n`;
          break;
        }

        case 'connector': {
          const from = stroke.from || (stroke.points && stroke.points[0]) || { x: 0, y: 0 };
          const to = stroke.to || (stroke.points && stroke.points[stroke.points.length - 1]) || { x: 100, y: 100 };
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const headLen = Math.max(width * 3, 10);
          const p1x = (to.x - headLen * Math.cos(angle - Math.PI / 6)).toFixed(2);
          const p1y = (to.y - headLen * Math.sin(angle - Math.PI / 6)).toFixed(2);
          const p2x = (to.x - headLen * Math.cos(angle + Math.PI / 6)).toFixed(2);
          const p2y = (to.y - headLen * Math.sin(angle + Math.PI / 6)).toFixed(2);

          svg += `  <g class="connector" opacity="${opacity}">\n`;
          svg += `    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>\n`;
          svg += `    <polygon points="${to.x},${to.y} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}"/>\n`;
          svg += `  </g>\n`;
          break;
        }

        case 'note': {
          const x = stroke.x !== undefined ? stroke.x : 100;
          const y = stroke.y !== undefined ? stroke.y : 100;
          const w = stroke.width || 180;
          const h = stroke.height || 100;
          const fill = stroke.fill || 'rgba(30, 41, 59, 0.9)';
          const text = escapeXml(stroke.text || '');

          svg += `  <g class="sticky-note" opacity="${opacity}">\n`;
          svg += `    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${color}" stroke-width="${width}" rx="6"/>\n`;
          svg += `    <rect x="${x}" y="${y}" width="${w}" height="6" fill="${color}" rx="2"/>\n`;
          if (text) {
            svg += `    <text x="${x + 10}" y="${y + 30}" fill="${stroke.textColor || WHITEBOARD_PALETTE.canvasWhite}" font-family="monospace, sans-serif" font-size="13">${text}</text>\n`;
          }
          svg += `  </g>\n`;
          break;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }

  // Serialization: JSON Export & Import
  exportJSON(pretty = false) {
    const payload = {
      schema: 'docs-portal.whiteboard.v1',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dimensions: { width: this.#width, height: this.#height },
      backgroundColor: this.#backgroundColor,
      strokes: this.strokes
    };
    return JSON.stringify(payload, null, pretty ? 2 : 0);
  }

  loadJSON(jsonInput) {
    let data = jsonInput;
    if (typeof jsonInput === 'string') {
      try {
        data = JSON.parse(jsonInput);
      } catch (err) {
        throw new Error(`Failed to parse JSON whiteboard data: ${err.message}`);
      }
    }

    if (!data || typeof data !== 'object') {
      throw new TypeError('Invalid whiteboard data: must be an object.');
    }

    let strokeList = [];
    if (Array.isArray(data.strokes)) {
      strokeList = data.strokes;
    } else if (Array.isArray(data)) {
      strokeList = data;
    } else {
      throw new Error('Whiteboard JSON missing valid strokes array.');
    }

    // Reset history stacks
    this.#undoStack = [];
    this.#redoStack = [];

    // Load validated strokes
    this.#strokes = strokeList.map((s) => ({
      ...s,
      tool: this.normalizeTool(s.tool || 'pen'),
      strokeWidth: this.clampStrokeWidth(s.strokeWidth !== undefined ? s.strokeWidth : 3),
      opacity: this.clampOpacity(s.opacity !== undefined ? s.opacity : 1.0),
      color: s.color || WHITEBOARD_PALETTE.docBlue
    }));

    if (data.backgroundColor) {
      this.#backgroundColor = String(data.backgroundColor);
    }
    if (data.dimensions?.width) {
      this.#width = Number(data.dimensions.width);
    }
    if (data.dimensions?.height) {
      this.#height = Number(data.dimensions.height);
    }

    this.emit('load', { strokes: this.strokes });
    this.emit('change', { strokes: this.strokes });

    this.render();
    return true;
  }

  // Built-in Architectural Templates
  loadTemplate(templateKey) {
    const key = String(templateKey).toLowerCase().replace(/[^a-z]/g, '');

    let templateStrokes = [];
    if (key.includes('api') || key.includes('gateway')) {
      templateStrokes = this.#createApiFlowTemplate();
    } else if (key.includes('arch') || key.includes('system')) {
      templateStrokes = this.#createArchitectureTemplate();
    } else if (key.includes('mark') || key.includes('flow')) {
      templateStrokes = this.#createMarkdownFlowTemplate();
    } else {
      throw new Error(`Unknown template "${templateKey}". Available: api-flow, architecture, markdown-flow`);
    }

    this.loadJSON({
      dimensions: { width: this.#width, height: this.#height },
      backgroundColor: this.#backgroundColor,
      strokes: templateStrokes
    });
    return true;
  }

  #createApiFlowTemplate() {
    return [
      { id: 't_node_1', tool: 'note', x: 80, y: 140, width: 200, height: 90, color: WHITEBOARD_PALETTE.docBlue, text: 'Client Application [Web/SDK]', fill: '#1e293b' },
      { id: 't_conn_1', tool: 'connector', from: { x: 280, y: 185 }, to: { x: 420, y: 185 }, color: WHITEBOARD_PALETTE.docBlue, strokeWidth: 3 },
      { id: 't_node_2', tool: 'rectangle', x: 420, y: 130, width: 220, height: 110, color: WHITEBOARD_PALETTE.mintGreen, fill: 'rgba(16, 185, 129, 0.1)', strokeWidth: 2 },
      { id: 't_note_2', tool: 'note', x: 440, y: 155, width: 180, height: 60, color: WHITEBOARD_PALETTE.mintGreen, text: 'API Gateway / Rate Limiter', fill: '#0f172a' },
      { id: 't_conn_2', tool: 'connector', from: { x: 640, y: 185 }, to: { x: 780, y: 140 }, color: WHITEBOARD_PALETTE.purpleSyntax, strokeWidth: 3 },
      { id: 't_conn_3', tool: 'connector', from: { x: 640, y: 185 }, to: { x: 780, y: 250 }, color: WHITEBOARD_PALETTE.amberWarning, strokeWidth: 3 },
      { id: 't_node_3', tool: 'rectangle', x: 780, y: 90, width: 220, height: 90, color: WHITEBOARD_PALETTE.purpleSyntax, fill: 'rgba(168, 85, 247, 0.1)', strokeWidth: 2 },
      { id: 't_note_3', tool: 'note', x: 800, y: 110, width: 180, height: 50, color: WHITEBOARD_PALETTE.purpleSyntax, text: 'Auth Service (OAuth2 / JWT)', fill: '#0f172a' },
      { id: 't_node_4', tool: 'circle', cx: 890, cy: 290, radius: 60, color: WHITEBOARD_PALETTE.amberWarning, fill: 'rgba(245, 158, 11, 0.12)', strokeWidth: 2 },
      { id: 't_note_4', tool: 'note', x: 810, y: 270, width: 160, height: 45, color: WHITEBOARD_PALETTE.amberWarning, text: 'Redis Key-Value Cache', fill: '#0f172a' }
    ];
  }

  #createArchitectureTemplate() {
    return [
      { id: 't_arch_1', tool: 'rectangle', x: 100, y: 120, width: 240, height: 160, color: WHITEBOARD_PALETTE.docBlue, fill: 'rgba(59, 130, 246, 0.08)', strokeWidth: 2 },
      { id: 't_arch_note1', tool: 'note', x: 120, y: 150, width: 200, height: 80, color: WHITEBOARD_PALETTE.docBlue, text: 'Edge Router & Global CDN', fill: '#1e293b' },
      { id: 't_arch_conn1', tool: 'connector', from: { x: 340, y: 200 }, to: { x: 480, y: 200 }, color: WHITEBOARD_PALETTE.mintGreen, strokeWidth: 3 },
      { id: 't_arch_2', tool: 'rectangle', x: 480, y: 100, width: 260, height: 200, color: WHITEBOARD_PALETTE.mintGreen, fill: 'rgba(16, 185, 129, 0.08)', strokeWidth: 2 },
      { id: 't_arch_note2', tool: 'note', x: 510, y: 140, width: 200, height: 80, color: WHITEBOARD_PALETTE.mintGreen, text: 'Core Microservices Pods', fill: '#1e293b' },
      { id: 't_arch_conn2', tool: 'connector', from: { x: 740, y: 200 }, to: { x: 880, y: 200 }, color: WHITEBOARD_PALETTE.purpleSyntax, strokeWidth: 3 },
      { id: 't_arch_3', tool: 'circle', cx: 960, cy: 200, radius: 75, color: WHITEBOARD_PALETTE.purpleSyntax, fill: 'rgba(168, 85, 247, 0.1)', strokeWidth: 2 },
      { id: 't_arch_note3', tool: 'note', x: 880, y: 180, width: 160, height: 45, color: WHITEBOARD_PALETTE.purpleSyntax, text: 'Distributed Cluster DB', fill: '#0f172a' }
    ];
  }

  #createMarkdownFlowTemplate() {
    return [
      { id: 't_md_1', tool: 'note', x: 80, y: 160, width: 220, height: 80, color: WHITEBOARD_PALETTE.docBlue, text: 'Markdown Source / AST Node', fill: '#1e293b' },
      { id: 't_md_c1', tool: 'connector', from: { x: 300, y: 200 }, to: { x: 440, y: 200 }, color: WHITEBOARD_PALETTE.docBlue, strokeWidth: 3 },
      { id: 't_md_2', tool: 'rectangle', x: 440, y: 140, width: 240, height: 120, color: WHITEBOARD_PALETTE.amberWarning, fill: 'rgba(245, 158, 11, 0.1)', strokeWidth: 2 },
      { id: 't_md_note2', tool: 'note', x: 460, y: 170, width: 200, height: 60, color: WHITEBOARD_PALETTE.amberWarning, text: 'Markdown Parser & AST Validator', fill: '#0f172a' },
      { id: 't_md_c2', tool: 'connector', from: { x: 680, y: 200 }, to: { x: 820, y: 200 }, color: WHITEBOARD_PALETTE.mintGreen, strokeWidth: 3 },
      { id: 't_md_3', tool: 'circle', cx: 900, cy: 200, radius: 70, color: WHITEBOARD_PALETTE.mintGreen, fill: 'rgba(16, 185, 129, 0.1)', strokeWidth: 2 },
      { id: 't_md_note3', tool: 'note', x: 830, y: 180, width: 140, height: 45, color: WHITEBOARD_PALETTE.mintGreen, text: 'Clean HTML Render', fill: '#0f172a' }
    ];
  }

  // DOM Event Binding & Canvas Lifecycle
  attach(canvasElement) {
    if (!canvasElement) return this;
    this.#canvas = canvasElement;
    this.#ctx = canvasElement.getContext('2d');

    this.setupHiDPI();

    const onPointerDown = (e) => this.#handlePointerDown(e);
    const onPointerMove = (e) => this.#handlePointerMove(e);
    const onPointerUp = (e) => this.#handlePointerUp(e);
    const onResize = () => this.setupHiDPI();

    canvasElement.addEventListener('pointerdown', onPointerDown);
    canvasElement.addEventListener('pointermove', onPointerMove);
    canvasElement.addEventListener('pointerup', onPointerUp);
    canvasElement.addEventListener('pointercancel', onPointerUp);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
    }

    this.#boundHandlers = {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onResize
    };

    this.render();
    return this;
  }

  detach() {
    if (this.#canvas && this.#boundHandlers) {
      this.#canvas.removeEventListener('pointerdown', this.#boundHandlers.onPointerDown);
      this.#canvas.removeEventListener('pointermove', this.#boundHandlers.onPointerMove);
      this.#canvas.removeEventListener('pointerup', this.#boundHandlers.onPointerUp);
      this.#canvas.removeEventListener('pointercancel', this.#boundHandlers.onPointerUp);

      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.#boundHandlers.onResize);
      }
    }
    this.#boundHandlers = null;
    this.#canvas = null;
    this.#ctx = null;
    return this;
  }

  setupHiDPI() {
    if (!this.#canvas) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = this.#canvas.getBoundingClientRect();
    const displayWidth = rect.width > 0 ? rect.width : this.#width;
    const displayHeight = rect.height > 0 ? rect.height : this.#height;

    this.#canvas.width = Math.round(displayWidth * dpr);
    this.#canvas.height = Math.round(displayHeight * dpr);

    if (this.#ctx && typeof this.#ctx.scale === 'function') {
      this.#ctx.resetTransform?.();
      this.#ctx.scale(dpr, dpr);
    }

    this.#width = displayWidth;
    this.#height = displayHeight;
    this.render();
  }

  #getCanvasPoint(e) {
    if (!this.#canvas) return { x: e.clientX, y: e.clientY };
    const rect = this.#canvas.getBoundingClientRect();
    return {
      x: Number((e.clientX - rect.left).toFixed(2)),
      y: Number((e.clientY - rect.top).toFixed(2)),
      pressure: e.pressure !== undefined ? Number(e.pressure.toFixed(2)) : 0.5
    };
  }

  #handlePointerDown(e) {
    if (e.button !== 0) return;
    this.#isDrawing = true;
    const pt = this.#getCanvasPoint(e);

    const tool = this.#tool;
    if (tool === 'pen' || tool === 'eraser') {
      this.#currentStroke = {
        tool,
        color: tool === 'eraser' ? this.#backgroundColor : this.#color,
        strokeWidth: this.#strokeWidth,
        opacity: this.#opacity,
        points: [pt]
      };
    } else if (tool === 'rectangle') {
      this.#currentStroke = {
        tool,
        color: this.#color,
        strokeWidth: this.#strokeWidth,
        opacity: this.#opacity,
        fill: `${this.#color}22`,
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
        originX: pt.x,
        originY: pt.y
      };
    } else if (tool === 'circle') {
      this.#currentStroke = {
        tool,
        color: this.#color,
        strokeWidth: this.#strokeWidth,
        opacity: this.#opacity,
        fill: `${this.#color}22`,
        cx: pt.x,
        cy: pt.y,
        radius: 0,
        originX: pt.x,
        originY: pt.y
      };
    } else if (tool === 'connector') {
      this.#currentStroke = {
        tool,
        color: this.#color,
        strokeWidth: this.#strokeWidth,
        opacity: this.#opacity,
        from: { x: pt.x, y: pt.y },
        to: { x: pt.x, y: pt.y }
      };
    } else if (tool === 'note') {
      const text = (typeof window !== 'undefined' && window.prompt)
        ? window.prompt('Enter note text:', 'Architecture Note')
        : 'Note';
      if (text) {
        this.addStroke({
          tool: 'note',
          color: this.#color,
          x: pt.x,
          y: pt.y,
          width: 180,
          height: 90,
          text
        });
      }
      this.#isDrawing = false;
      return;
    }

    this.emit('stroke:start', { point: pt, tool });
    this.render();
  }

  #handlePointerMove(e) {
    if (!this.#isDrawing || !this.#currentStroke) return;
    const pt = this.#getCanvasPoint(e);
    const stroke = this.#currentStroke;

    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      const lastPt = stroke.points[stroke.points.length - 1];
      const interpolated = this.interpolatePoints(lastPt, pt, 4);
      // skip first duplicate point
      for (let i = 1; i < interpolated.length; i++) {
        stroke.points.push(interpolated[i]);
      }
    } else if (stroke.tool === 'rectangle') {
      stroke.width = pt.x - stroke.originX;
      stroke.height = pt.y - stroke.originY;
    } else if (stroke.tool === 'circle') {
      stroke.radius = Math.round(Math.hypot(pt.x - stroke.originX, pt.y - stroke.originY));
    } else if (stroke.tool === 'connector') {
      stroke.to = { x: pt.x, y: pt.y };
    }

    this.render();
  }

  #handlePointerUp(e) {
    if (!this.#isDrawing || !this.#currentStroke) return;
    this.#isDrawing = false;
    const finishedStroke = this.#currentStroke;
    this.#currentStroke = null;

    // Validate minimum dimensions
    if (finishedStroke.tool === 'rectangle' && (Math.abs(finishedStroke.width) < 3 || Math.abs(finishedStroke.height) < 3)) {
      this.render();
      return;
    }
    if (finishedStroke.tool === 'circle' && finishedStroke.radius < 3) {
      this.render();
      return;
    }
    if (finishedStroke.tool === 'connector') {
      const d = Math.hypot(finishedStroke.to.x - finishedStroke.from.x, finishedStroke.to.y - finishedStroke.from.y);
      if (d < 5) {
        this.render();
        return;
      }
    }

    this.addStroke(finishedStroke);
    this.emit('stroke:end', finishedStroke);
  }
}
