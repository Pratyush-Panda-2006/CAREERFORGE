/**
 * Sonora AI Voice Studio - Collaborative Freehand Vector Sketchpad & Whiteboard Canvas
 * NSoC '26 - Self-contained vector engine with stroke smoothing, undo/redo, and SVG export.
 */

export const AVS_PALETTE = Object.freeze({
  studioDark: '#0a0f1a',
  cyan: '#00f2fe',
  coral: '#ff4d6d',
  violet: '#7928ca',
  mint: '#06d6a0',
  canvasWhite: '#ffffff',
});

export const AVS_SUPPORTED_TOOLS = Object.freeze(['pen', 'eraser', 'line', 'rectangle']);

const AVS_TOOL_ALIASES = Object.freeze({
  draw: 'pen', brush: 'pen', pencil: 'pen', freehand: 'pen',
  erase: 'eraser', rubber: 'eraser', delete: 'eraser',
  line: 'line', straight: 'line',
  rect: 'rectangle', box: 'rectangle', frame: 'rectangle',
});

function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }

export class AiVoiceStudioWhiteboardCanvas {
  constructor(options = {}) {
    this.canvas = options.canvas || null;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : (options.ctx || null);
    this.width = options.width || (this.canvas ? this.canvas.width : 1200);
    this.height = options.height || (this.canvas ? this.canvas.height : 800);

    this.tool = 'pen';
    this.color = options.color || AVS_PALETTE.cyan;
    this.strokeWidth = clamp(options.strokeWidth || 4, 1, 50);
    this.opacity = clamp(options.opacity !== undefined ? options.opacity : 1.0, 0, 1);
    this.maxHistory = options.maxHistory || 50;

    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.events = new Map();

    if (this.canvas) this.initDOM();
  }

  get historyDepth() { return this.strokes.length; }

  setTool(tool) {
    const raw = String(tool || '').toLowerCase().trim();
    const resolved = AVS_TOOL_ALIASES[raw] || raw;
    if (!AVS_SUPPORTED_TOOLS.includes(resolved)) {
      throw new Error(`Unsupported tool: "${tool}". Supported: ${AVS_SUPPORTED_TOOLS.join(', ')}`);
    }
    const prev = this.tool;
    this.tool = resolved;
    this.emit('tool:change', { tool: resolved, previous: prev });
  }

  setColor(hex) {
    if (!hex || typeof hex !== 'string') throw new Error('Color must be a valid hex string');
    const prev = this.color;
    this.color = hex;
    this.emit('color:change', { color: hex, previous: prev });
  }

  setStrokeWidth(w) {
    this.strokeWidth = clamp(Number(w) || 4, 1, 50);
    this.emit('width:change', { width: this.strokeWidth });
  }

  interpolatePoints(p1, p2, dist = 5) {
    if (!p1 || !p2) return [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= dist || distance === 0) return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
    const count = Math.ceil(distance / dist);
    const pts = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      pts.push({ x: Math.round(p1.x + dx * t), y: Math.round(p1.y + dy * t) });
    }
    return pts;
  }

  catmullRomToBezier(points) {
    if (!points || points.length < 2) return [];
    if (points.length === 2) {
      return [{
        cp1x: points[0].x, cp1y: points[0].y,
        cp2x: points[1].x, cp2y: points[1].y,
        x: points[1].x, y: points[1].y,
      }];
    }
    const segments = [];
    const p = points;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = i > 0 ? p[i - 1] : p[i];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = i < p.length - 2 ? p[i + 2] : p2;
      segments.push({
        cp1x: p1.x + (p2.x - p0.x) / 6,
        cp1y: p1.y + (p2.y - p0.y) / 6,
        cp2x: p2.x - (p3.x - p1.x) / 6,
        cp2y: p2.y - (p3.y - p1.y) / 6,
        x: p2.x, y: p2.y,
      });
    }
    return segments;
  }

  beginStroke(x, y) {
    this.currentStroke = {
      tool: this.tool, color: this.color, width: this.strokeWidth,
      opacity: this.opacity, points: [{ x, y }], timestamp: Date.now(),
    };
    this.emit('stroke:start', this.currentStroke);
  }

  extendStroke(x, y) {
    if (!this.currentStroke) return;
    const pts = this.currentStroke.points;
    const last = pts[pts.length - 1];
    if (this.tool === 'pen' || this.tool === 'eraser') {
      const interp = this.interpolatePoints(last, { x, y }, 4);
      pts.push(...interp.slice(1));
    } else {
      pts[1] = { x, y };
    }
    this.render();
    this.emit('stroke:move', this.currentStroke);
  }

  endStroke() {
    if (!this.currentStroke) return null;
    const stroke = this.currentStroke;
    this.currentStroke = null;
    this.strokes.push(stroke);
    this.redoStack = [];
    if (this.strokes.length > this.maxHistory) this.strokes.shift();
    this.render();
    this.emit('stroke:end', stroke);
    this.emit('change', { action: 'stroke', stroke });
    return stroke;
  }

  undo() {
    if (!this.canUndo()) return null;
    const popped = this.strokes.pop();
    this.redoStack.push(popped);
    this.render();
    this.emit('undo', popped);
    this.emit('change', { action: 'undo', stroke: popped });
    return popped;
  }

  redo() {
    if (!this.canRedo()) return null;
    const restored = this.redoStack.pop();
    this.strokes.push(restored);
    this.render();
    this.emit('redo', restored);
    this.emit('change', { action: 'redo', stroke: restored });
    return restored;
  }

  canUndo() { return this.strokes.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  clear() {
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.render();
    this.emit('clear');
    this.emit('change', { action: 'clear' });
  }

  renderStroke(stroke, ctx = this.ctx) {
    if (!ctx || !stroke || !stroke.points || stroke.points.length === 0) return;
    ctx.save();
    ctx.strokeStyle = stroke.tool === 'eraser' ? AVS_PALETTE.studioDark : stroke.color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = stroke.width;
    ctx.globalAlpha = stroke.opacity;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const pts = stroke.points;
    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      const segs = this.catmullRomToBezier(pts);
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (const seg of segs) ctx.bezierCurveTo(seg.cp1x, seg.cp1y, seg.cp2x, seg.cp2y, seg.x, seg.y);
      ctx.stroke();
    } else if (stroke.tool === 'line') {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
    } else if (stroke.tool === 'rectangle') {
      const x = Math.min(pts[0].x, pts[1].x);
      const y = Math.min(pts[0].y, pts[1].y);
      const w = Math.abs(pts[1].x - pts[0].x);
      const h = Math.abs(pts[1].y - pts[0].y);
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
  }

  render(ctx = this.ctx) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = AVS_PALETTE.studioDark;
    ctx.fillRect(0, 0, this.width, this.height);
    for (const stroke of this.strokes) this.renderStroke(stroke, ctx);
    if (this.currentStroke) this.renderStroke(this.currentStroke, ctx);
    ctx.restore();
  }

  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(handler);
    return () => this.off(event, handler);
  }
  off(event, handler) {
    if (!this.events.has(event)) return;
    this.events.set(event, this.events.get(event).filter(h => h !== handler));
  }
  emit(event, ...args) {
    if (!this.events.has(event)) return;
    for (const h of this.events.get(event)) {
      try { h(...args); } catch { /* preserve other listeners */ }
    }
  }

  addPoint(x, y) {
    if (!this.currentStroke) this.beginStroke(x, y);
    else this.extendStroke(x, y);
  }

  exportSVG() {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">\n`;
    svg += `  <rect width="100%" height="100%" fill="${AVS_PALETTE.studioDark}"/>\n`;
    for (const s of this.strokes) {
      const color = s.tool === 'eraser' ? AVS_PALETTE.studioDark : s.color;
      const pts = s.points;
      if (!pts || pts.length === 0) continue;
      if (s.tool === 'pen' || s.tool === 'eraser') {
        const segs = this.catmullRomToBezier(pts);
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (const seg of segs) {
          d += ` C ${seg.cp1x.toFixed(1)} ${seg.cp1y.toFixed(1)}, ${seg.cp2x.toFixed(1)} ${seg.cp2y.toFixed(1)}, ${seg.x} ${seg.y}`;
        }
        svg += `  <path d="${d}" fill="none" stroke="${color}" stroke-width="${s.width}" opacity="${s.opacity}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      } else if (s.tool === 'line') {
        svg += `  <line x1="${pts[0].x}" y1="${pts[0].y}" x2="${pts[1].x}" y2="${pts[1].y}" stroke="${color}" stroke-width="${s.width}" opacity="${s.opacity}" stroke-linecap="round"/>\n`;
      } else if (s.tool === 'rectangle') {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[1].x - pts[0].x);
        const h = Math.abs(pts[1].y - pts[0].y);
        svg += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${s.width}" opacity="${s.opacity}" rx="8"/>\n`;
      }
    }
    svg += `</svg>`;
    return svg;
  }

  initDOM() {
    let isDrawing = false;
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY),
      };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      isDrawing = true;
      const pos = getPos(e);
      this.beginStroke(pos.x, pos.y);
      this.canvas.setPointerCapture?.(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      this.extendStroke(pos.x, pos.y);
    });

    const finish = () => {
      if (isDrawing) { isDrawing = false; this.endStroke(); }
    };

    this.canvas.addEventListener('pointerup', finish);
    this.canvas.addEventListener('pointercancel', finish);
    this.canvas.addEventListener('pointerleave', finish);
  }
}
