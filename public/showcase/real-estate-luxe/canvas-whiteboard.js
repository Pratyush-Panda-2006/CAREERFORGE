/**
 * Real Estate Luxe Whiteboard Canvas Engine
 * Architectural Floorplan Markup, Vector Spline Sketchpad & Collaborative Drawing Engine
 * Vanguard Estates Luxury Showcase
 */

export const PALETTE = Object.freeze({
  champagneGold: '#d4af37',
  platinumSilver: '#e2e8f0',
  warmSand: '#e5c396',
  sapphireBlue: '#2563eb',
  emeraldEstate: '#10b981',
  roseLuxe: '#f43f5e',
  obsidianNavy: '#0d0f12'
});

export const VALID_TOOLS = Object.freeze([
  'pen',
  'eraser',
  'dimension',
  'pin',
  'rectangle',
  'circle'
]);

export const TOOL_ALIASES = Object.freeze({
  pencil: 'pen',
  brush: 'pen',
  draw: 'pen',
  freehand: 'pen',
  erase: 'eraser',
  rubber: 'eraser',
  measure: 'dimension',
  ruler: 'dimension',
  dim: 'dimension',
  marker: 'pin',
  point: 'pin',
  location: 'pin',
  rect: 'rectangle',
  box: 'rectangle',
  square: 'rectangle',
  circ: 'circle',
  oval: 'circle',
  ellipse: 'circle'
});

/**
 * Escapes characters for safe XML/SVG embedding.
 */
function escapeXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class RealEstateLuxeWhiteboardCanvas {
  static PALETTE = PALETTE;
  static VALID_TOOLS = VALID_TOOLS;
  static TOOL_ALIASES = TOOL_ALIASES;

  #undoStack = [];
  #redoStack = [];
  #listeners = new Map();
  #isDrawing = false;
  #currentDraftStroke = null;
  #boundPointerDown = null;
  #boundPointerMove = null;
  #boundPointerUp = null;
  #boundPointerCancel = null;
  #boundResize = null;
  #pinCounter = 1;

  constructor(canvasElement = null, options = {}) {
    this.canvas = canvasElement;
    this.ctx = null;

    // Palette & Options
    this.palette = { ...PALETTE };
    this.width = options.width || (canvasElement?.width) || 1200;
    this.height = options.height || (canvasElement?.height) || 800;
    this.maxHistory = (typeof options.maxHistory === 'number' && options.maxHistory > 0) ? options.maxHistory : 50;
    this.scale = (typeof options.scale === 'number' && options.scale > 0) ? options.scale : 0.05; // 0.05m (5cm) per pixel
    this.interpolationDistance = (typeof options.interpolationDistance === 'number' && options.interpolationDistance > 0)
      ? options.interpolationDistance
      : 3;
    this.backdrop = options.backdrop || 'cad-grid'; // 'cad-grid', 'penthouse-blueprint', 'estate-plot', 'none'

    // Brush State
    this.minStrokeWidth = 1;
    this.maxStrokeWidth = 60;
    this.strokeWidth = 3;
    this.opacity = 1.0;
    this.currentColor = PALETTE.champagneGold;
    this.currentTool = 'pen';

    if (options.tool) {
      this.setTool(options.tool);
    }
    if (options.color) {
      this.setColor(options.color);
    }
    if (typeof options.strokeWidth === 'number') {
      this.setStrokeWidth(options.strokeWidth);
    }
    if (typeof options.opacity === 'number') {
      this.setOpacity(options.opacity);
    }

    if (this.canvas) {
      this.attach(this.canvas);
    }
  }

  // --- Tool & Brush Configuration ---

  normalizeTool(tool) {
    if (typeof tool !== 'string') {
      throw new TypeError('Tool must be a string.');
    }
    const clean = tool.trim().toLowerCase();
    const resolved = TOOL_ALIASES[clean] || clean;
    if (!VALID_TOOLS.includes(resolved)) {
      throw new RangeError(`Invalid tool: "${tool}". Supported tools: ${VALID_TOOLS.join(', ')}`);
    }
    return resolved;
  }

  setTool(tool) {
    const normalized = this.normalizeTool(tool);
    if (this.currentTool !== normalized) {
      const prev = this.currentTool;
      this.currentTool = normalized;
      this.emit('tool:change', { tool: normalized, previous: prev });
    }
    return this.currentTool;
  }

  getTool() {
    return this.currentTool;
  }

  setColor(color) {
    if (typeof color !== 'string' || !color.trim()) {
      throw new TypeError('Color must be a non-empty string.');
    }
    const trimmed = color.trim();
    // Support palette property names (e.g., 'champagneGold') or direct color strings
    const resolved = PALETTE[trimmed] || trimmed;
    this.currentColor = resolved;
    this.emit('color:change', { color: this.currentColor });
    return this.currentColor;
  }

  getColor() {
    return this.currentColor;
  }

  setStrokeWidth(width) {
    if (typeof width !== 'number' || !Number.isFinite(width)) {
      throw new TypeError('Stroke width must be a finite number.');
    }
    this.strokeWidth = Math.max(this.minStrokeWidth, Math.min(this.maxStrokeWidth, width));
    this.emit('brush:change', { strokeWidth: this.strokeWidth });
    return this.strokeWidth;
  }

  getStrokeWidth() {
    return this.strokeWidth;
  }

  setOpacity(opacity) {
    if (typeof opacity !== 'number' || !Number.isFinite(opacity)) {
      throw new TypeError('Opacity must be a finite number.');
    }
    this.opacity = Math.max(0, Math.min(1, opacity));
    this.emit('brush:change', { opacity: this.opacity });
    return this.opacity;
  }

  getOpacity() {
    return this.opacity;
  }

  setScale(scale) {
    if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
      throw new RangeError('Scale must be a positive finite number representing meters per pixel.');
    }
    this.scale = scale;
    this.emit('scale:change', { scale });
    return this.scale;
  }

  getScale() {
    return this.scale;
  }

  setBackdrop(backdrop) {
    const validBackdrops = ['cad-grid', 'penthouse-blueprint', 'estate-plot', 'none'];
    if (typeof backdrop !== 'string' || !validBackdrops.includes(backdrop)) {
      throw new RangeError(`Backdrop must be one of: ${validBackdrops.join(', ')}`);
    }
    this.backdrop = backdrop;
    this.render();
    this.emit('backdrop:change', { backdrop });
    return this.backdrop;
  }

  getBackdrop() {
    return this.backdrop;
  }

  // --- Math, Interpolation & Spline Geometry ---

  /**
   * Distance-based point interpolation: generates dense intermediate points between
   * p1 and p2 when distance exceeds dist to prevent gaps in fast strokes.
   */
  static interpolatePoints(p1, p2, dist = 2) {
    if (!p1 || typeof p1.x !== 'number' || typeof p1.y !== 'number' ||
        !p2 || typeof p2.x !== 'number' || typeof p2.y !== 'number' ||
        !Number.isFinite(p1.x) || !Number.isFinite(p1.y) ||
        !Number.isFinite(p2.x) || !Number.isFinite(p2.y)) {
      throw new TypeError('Points must have finite numeric x and y coordinates.');
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      return [{ x: p1.x, y: p1.y }];
    }

    const maxDist = (typeof dist === 'number' && Number.isFinite(dist) && dist > 0) ? dist : 2;
    if (distance <= maxDist) {
      return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
    }

    const steps = Math.ceil(distance / maxDist);
    const interpolated = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      interpolated.push({
        x: p1.x + dx * t,
        y: p1.y + dy * t
      });
    }
    return interpolated;
  }

  interpolatePoints(p1, p2, dist = this.interpolationDistance) {
    return RealEstateLuxeWhiteboardCanvas.interpolatePoints(p1, p2, dist);
  }

  /**
   * Converts a series of 2D points into smooth Catmull-Rom cubic Bezier spline segments.
   */
  static catmullRomToBezier(points) {
    if (!Array.isArray(points)) {
      throw new TypeError('Points must be an array.');
    }
    if (points.length < 2) {
      return [];
    }
    if (points.length === 2) {
      const p0 = points[0];
      const p1 = points[1];
      return [{
        start: { x: p0.x, y: p0.y },
        cp1: { x: p0.x + (p1.x - p0.x) / 3, y: p0.y + (p1.y - p0.y) / 3 },
        cp2: { x: p1.x - (p1.x - p0.x) / 3, y: p1.y - (p1.y - p0.y) / 3 },
        end: { x: p1.x, y: p1.y }
      }];
    }

    const curves = [];
    const n = points.length;

    for (let i = 0; i < n - 1; i++) {
      const p0 = (i === 0) ? points[0] : points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = (i === n - 2) ? points[n - 1] : points[i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      curves.push({
        start: { x: p1.x, y: p1.y },
        cp1: { x: cp1x, y: cp1y },
        cp2: { x: cp2x, y: cp2y },
        end: { x: p2.x, y: p2.y }
      });
    }
    return curves;
  }

  catmullRomToBezier(points) {
    return RealEstateLuxeWhiteboardCanvas.catmullRomToBezier(points);
  }

  /**
   * Generates SVG path 'd' string from points using Catmull-Rom cubic Bezier curves.
   */
  static catmullRomToPathData(points) {
    if (!Array.isArray(points) || points.length === 0) {
      return '';
    }
    if (points.length === 1) {
      return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    }
    const curves = RealEstateLuxeWhiteboardCanvas.catmullRomToBezier(points);
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (const c of curves) {
      d += ` C ${c.cp1.x.toFixed(2)} ${c.cp1.y.toFixed(2)}, ${c.cp2.x.toFixed(2)} ${c.cp2.y.toFixed(2)}, ${c.end.x.toFixed(2)} ${c.end.y.toFixed(2)}`;
    }
    return d;
  }

  catmullRomToPathData(points) {
    return RealEstateLuxeWhiteboardCanvas.catmullRomToPathData(points);
  }

  // --- History & Undo / Redo with Bounded Capacity ---

  addStroke(stroke) {
    if (!stroke || typeof stroke !== 'object') {
      throw new TypeError('Stroke must be an object.');
    }
    const tool = this.normalizeTool(stroke.tool);
    if (!Array.isArray(stroke.points) || stroke.points.length === 0) {
      throw new RangeError('Stroke must contain an array with at least one point.');
    }

    const cleanPoints = stroke.points.map(p => {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        throw new TypeError('Stroke points must have finite x and y coordinates.');
      }
      return { x: p.x, y: p.y };
    });

    const cleanStroke = {
      tool,
      color: typeof stroke.color === 'string' ? stroke.color : this.currentColor,
      strokeWidth: typeof stroke.strokeWidth === 'number' && Number.isFinite(stroke.strokeWidth)
        ? Math.max(this.minStrokeWidth, Math.min(this.maxStrokeWidth, stroke.strokeWidth))
        : this.strokeWidth,
      opacity: typeof stroke.opacity === 'number' && Number.isFinite(stroke.opacity)
        ? Math.max(0, Math.min(1, stroke.opacity))
        : this.opacity,
      points: cleanPoints,
      label: typeof stroke.label === 'string' ? stroke.label : undefined,
      scale: typeof stroke.scale === 'number' ? stroke.scale : this.scale
    };

    // Redo eviction on new stroke
    this.#redoStack = [];

    // Push to undo stack
    this.#undoStack.push(cleanStroke);

    // Bounded capacity eviction
    if (this.#undoStack.length > this.maxHistory) {
      this.#undoStack.shift();
    }

    this.render();
    this.emit('stroke:add', cleanStroke);
    this.emit('change', { strokes: this.getStrokes() });
    return cleanStroke;
  }

  undo() {
    if (this.#undoStack.length === 0) {
      return null;
    }
    const stroke = this.#undoStack.pop();
    this.#redoStack.push(stroke);
    this.render();
    this.emit('undo', stroke);
    this.emit('change', { strokes: this.getStrokes() });
    return stroke;
  }

  redo() {
    if (this.#redoStack.length === 0) {
      return null;
    }
    const stroke = this.#redoStack.pop();
    this.#undoStack.push(stroke);
    this.render();
    this.emit('redo', stroke);
    this.emit('change', { strokes: this.getStrokes() });
    return stroke;
  }

  canUndo() {
    return this.#undoStack.length > 0;
  }

  canRedo() {
    return this.#redoStack.length > 0;
  }

  getUndoStack() {
    return [...this.#undoStack];
  }

  getRedoStack() {
    return [...this.#redoStack];
  }

  getStrokes() {
    return this.#undoStack.map(s => ({
      ...s,
      points: s.points.map(p => ({ ...p }))
    }));
  }

  clear() {
    this.#undoStack = [];
    this.#redoStack = [];
    this.render();
    this.emit('clear');
    this.emit('change', { strokes: [] });
  }

  // --- Event Emitter ---

  on(event, handler) {
    if (typeof event !== 'string' || !event) {
      throw new TypeError('Event name must be a non-empty string.');
    }
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
    if (typeof event !== 'string' || !event) return;
    if (!this.#listeners.has(event)) return;
    if (handler) {
      this.#listeners.get(event).delete(handler);
      if (this.#listeners.get(event).size === 0) {
        this.#listeners.delete(event);
      }
    } else {
      this.#listeners.delete(event);
    }
  }

  emit(event, ...args) {
    if (typeof event !== 'string' || !this.#listeners.has(event)) return false;
    const handlers = Array.from(this.#listeners.get(event));
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
    return true;
  }

  // --- Serialization: SVG and JSON ---

  exportSVG() {
    const width = this.width;
    const height = this.height;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svg += `  <defs>\n`;
    svg += `    <style>\n`;
    svg += `      .luxe-canvas-bg { fill: ${PALETTE.obsidianNavy}; }\n`;
    svg += `      .luxe-grid { stroke: rgba(212, 175, 55, 0.08); stroke-width: 1; }\n`;
    svg += `      .luxe-grid-major { stroke: rgba(212, 175, 55, 0.2); stroke-width: 1.5; }\n`;
    svg += `      .luxe-text { font-family: 'Inter', system-ui, -apple-system, sans-serif; }\n`;
    svg += `    </style>\n`;
    svg += `  </defs>\n`;

    // Canvas background
    svg += `  <rect class="luxe-canvas-bg" width="100%" height="100%"/>\n`;

    // Backdrop rendering
    if (this.backdrop === 'cad-grid') {
      svg += `  <g id="backdrop-cad-grid">\n`;
      const step = 20;
      const major = 100;
      for (let x = 0; x <= width; x += step) {
        const cls = (x % major === 0) ? 'luxe-grid-major' : 'luxe-grid';
        svg += `    <line x1="${x}" y1="0" x2="${x}" y2="${height}" class="${cls}"/>\n`;
      }
      for (let y = 0; y <= height; y += step) {
        const cls = (y % major === 0) ? 'luxe-grid-major' : 'luxe-grid';
        svg += `    <line x1="0" y1="${y}" x2="${width}" y2="${y}" class="${cls}"/>\n`;
      }
      svg += `  </g>\n`;
    } else if (this.backdrop === 'penthouse-blueprint') {
      svg += `  <g id="backdrop-penthouse" opacity="0.3">\n`;
      svg += `    <rect x="100" y="80" width="${width - 200}" height="${height - 160}" fill="none" stroke="${PALETTE.champagneGold}" stroke-width="2" stroke-dasharray="8 4"/>\n`;
      svg += `    <text x="120" y="110" fill="${PALETTE.champagneGold}" class="luxe-text" font-size="12" letter-spacing="2">PENTHOUSE SUITE - MASTER LEVEL</text>\n`;
      svg += `    <line x1="100" y1="${height / 2}" x2="${width - 100}" y2="${height / 2}" stroke="${PALETTE.champagneGold}" stroke-width="1.5" stroke-dasharray="4 4"/>\n`;
      svg += `    <text x="120" y="${height / 2 - 10}" fill="${PALETTE.platinumSilver}" class="luxe-text" font-size="11">GRAND SALON &amp; SKY ATRIUM</text>\n`;
      svg += `    <text x="120" y="${height / 2 + 30}" fill="${PALETTE.platinumSilver}" class="luxe-text" font-size="11">INFINITY TERRACE &amp; PERGOLA</text>\n`;
      svg += `  </g>\n`;
    } else if (this.backdrop === 'estate-plot') {
      svg += `  <g id="backdrop-estate" opacity="0.3">\n`;
      svg += `    <polygon points="120,100 ${width - 150},80 ${width - 80},${height - 100} 180,${height - 120}" fill="none" stroke="${PALETTE.emeraldEstate}" stroke-width="2"/>\n`;
      svg += `    <text x="150" y="140" fill="${PALETTE.emeraldEstate}" class="luxe-text" font-size="12" letter-spacing="1">ESTATE BOUNDARY - LOT 42A</text>\n`;
      svg += `  </g>\n`;
    }

    // Strokes Group
    svg += `  <g id="luxe-canvas-strokes">\n`;
    for (const stroke of this.#undoStack) {
      if (!stroke.points || stroke.points.length === 0) continue;
      const col = escapeXML(stroke.color);
      const sw = stroke.strokeWidth;
      const op = stroke.opacity;

      if (stroke.tool === 'pen') {
        const d = this.catmullRomToPathData(stroke.points);
        svg += `    <path d="${d}" stroke="${col}" stroke-width="${sw}" stroke-opacity="${op}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      } else if (stroke.tool === 'eraser') {
        const d = this.catmullRomToPathData(stroke.points);
        svg += `    <path d="${d}" stroke="${PALETTE.obsidianNavy}" stroke-width="${sw * 1.5}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      } else if (stroke.tool === 'rectangle') {
        if (stroke.points.length < 2) continue;
        const p1 = stroke.points[0];
        const p2 = stroke.points[1];
        const rx = Math.min(p1.x, p2.x);
        const ry = Math.min(p1.y, p2.y);
        const rw = Math.abs(p2.x - p1.x);
        const rh = Math.abs(p2.y - p1.y);
        svg += `    <rect x="${rx.toFixed(2)}" y="${ry.toFixed(2)}" width="${rw.toFixed(2)}" height="${rh.toFixed(2)}" stroke="${col}" stroke-width="${sw}" stroke-opacity="${op}" fill="none"/>\n`;
      } else if (stroke.tool === 'circle') {
        if (stroke.points.length < 2) continue;
        const p1 = stroke.points[0];
        const p2 = stroke.points[1];
        const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        svg += `    <circle cx="${p1.x.toFixed(2)}" cy="${p1.y.toFixed(2)}" r="${radius.toFixed(2)}" stroke="${col}" stroke-width="${sw}" stroke-opacity="${op}" fill="none"/>\n`;
      } else if (stroke.tool === 'dimension') {
        if (stroke.points.length < 2) continue;
        const p1 = stroke.points[0];
        const p2 = stroke.points[1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distPx = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const perp = angle + Math.PI / 2;
        const tickLen = 8;
        const scale = stroke.scale || this.scale || 0.05;
        const distM = (distPx * scale).toFixed(2);
        const label = stroke.label || `${distM}m`;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        const tCos = Math.cos(perp) * tickLen;
        const tSin = Math.sin(perp) * tickLen;

        svg += `    <g class="luxe-dimension" stroke="${col}" stroke-opacity="${op}">\n`;
        svg += `      <line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke-width="${sw}"/>\n`;
        svg += `      <line x1="${(p1.x - tCos).toFixed(2)}" y1="${(p1.y - tSin).toFixed(2)}" x2="${(p1.x + tCos).toFixed(2)}" y2="${(p1.y + tSin).toFixed(2)}" stroke-width="${sw}"/>\n`;
        svg += `      <line x1="${(p2.x - tCos).toFixed(2)}" y1="${(p2.y - tSin).toFixed(2)}" x2="${(p2.x + tCos).toFixed(2)}" y2="${(p2.y + tSin).toFixed(2)}" stroke-width="${sw}"/>\n`;
        svg += `      <text x="${midX.toFixed(2)}" y="${(midY - 6).toFixed(2)}" fill="${col}" class="luxe-text" font-size="12" text-anchor="middle">${escapeXML(label)}</text>\n`;
        svg += `    </g>\n`;
      } else if (stroke.tool === 'pin') {
        const p = stroke.points[0];
        const label = stroke.label || '1';
        svg += `    <g class="luxe-pin">\n`;
        svg += `      <circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="12" fill="${col}" fill-opacity="${op}" stroke="${PALETTE.champagneGold}" stroke-width="2"/>\n`;
        svg += `      <text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" fill="${PALETTE.obsidianNavy}" class="luxe-text" font-size="11" font-weight="bold" text-anchor="middle" dominant-baseline="central">${escapeXML(label)}</text>\n`;
        svg += `    </g>\n`;
      }
    }
    svg += `  </g>\n`;
    svg += `</svg>`;
    return svg;
  }

  exportJSON({ pretty = false } = {}) {
    const payload = {
      version: '1.0.0',
      generator: 'RealEstateLuxeWhiteboardCanvas',
      timestamp: Date.now(),
      width: this.width,
      height: this.height,
      scale: this.scale,
      backdrop: this.backdrop,
      strokes: this.#undoStack.map(s => ({
        tool: s.tool,
        color: s.color,
        strokeWidth: s.strokeWidth,
        opacity: s.opacity,
        points: s.points.map(p => ({
          x: Math.round(p.x * 100) / 100,
          y: Math.round(p.y * 100) / 100
        })),
        label: s.label,
        scale: s.scale
      }))
    };
    return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }

  loadJSON(input) {
    let data;
    if (typeof input === 'string') {
      try {
        data = JSON.parse(input);
      } catch (err) {
        throw new Error(`Failed to parse JSON: ${err.message}`);
      }
    } else if (input && typeof input === 'object') {
      data = input;
    } else {
      throw new TypeError('Invalid JSON input: must be a JSON string or parsed object.');
    }

    if (!data || !Array.isArray(data.strokes)) {
      throw new Error('Invalid whiteboard data: missing "strokes" array.');
    }

    const validStrokes = [];
    for (let i = 0; i < data.strokes.length; i++) {
      const s = data.strokes[i];
      if (!s || typeof s !== 'object') {
        throw new Error(`Invalid stroke at index ${i}: not an object.`);
      }
      const tool = this.normalizeTool(s.tool);
      if (!Array.isArray(s.points) || s.points.length === 0) {
        throw new Error(`Invalid stroke at index ${i}: missing or empty points array.`);
      }
      const points = s.points.map((pt, pidx) => {
        if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number' || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
          throw new Error(`Invalid point in stroke ${i} at index ${pidx}.`);
        }
        return { x: pt.x, y: pt.y };
      });

      validStrokes.push({
        tool,
        color: typeof s.color === 'string' ? s.color : PALETTE.champagneGold,
        strokeWidth: (typeof s.strokeWidth === 'number' && Number.isFinite(s.strokeWidth))
          ? Math.max(this.minStrokeWidth, Math.min(this.maxStrokeWidth, s.strokeWidth))
          : 3,
        opacity: (typeof s.opacity === 'number' && Number.isFinite(s.opacity))
          ? Math.max(0, Math.min(1, s.opacity))
          : 1,
        points,
        label: typeof s.label === 'string' ? s.label : undefined,
        scale: typeof s.scale === 'number' && s.scale > 0 ? s.scale : this.scale
      });
    }

    if (typeof data.width === 'number' && data.width > 0) this.width = data.width;
    if (typeof data.height === 'number' && data.height > 0) this.height = data.height;
    if (typeof data.scale === 'number' && data.scale > 0) this.scale = data.scale;
    if (typeof data.backdrop === 'string') this.backdrop = data.backdrop;

    this.#undoStack = validStrokes.slice(-this.maxHistory);
    this.#redoStack = [];

    this.render();
    this.emit('load', { strokeCount: this.#undoStack.length });
    this.emit('change', { strokes: this.getStrokes() });
    return this.getStrokes();
  }

  // --- 2D Context Render Engine ---

  renderStroke(stroke, ctx = this.ctx) {
    if (!ctx || !stroke || !stroke.points || stroke.points.length === 0) return;

    ctx.save();
    try {
      const sw = stroke.strokeWidth ?? 3;
      const op = stroke.opacity ?? 1.0;
      const col = stroke.color || PALETTE.champagneGold;

      ctx.lineWidth = sw;
      ctx.globalAlpha = op;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        if (stroke.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = sw * 1.5;
        } else {
          ctx.strokeStyle = col;
          ctx.fillStyle = col;
        }

        ctx.beginPath();
        if (stroke.points.length === 1) {
          ctx.arc(stroke.points[0].x, stroke.points[0].y, sw / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          const curves = this.catmullRomToBezier(stroke.points);
          for (const c of curves) {
            ctx.bezierCurveTo(c.cp1.x, c.cp1.y, c.cp2.x, c.cp2.y, c.end.x, c.end.y);
          }
          ctx.stroke();
        }
      } else if (stroke.tool === 'rectangle') {
        if (stroke.points.length >= 2) {
          const p1 = stroke.points[0];
          const p2 = stroke.points[1];
          const x = Math.min(p1.x, p2.x);
          const y = Math.min(p1.y, p2.y);
          const w = Math.abs(p2.x - p1.x);
          const h = Math.abs(p2.y - p1.y);

          ctx.strokeStyle = col;
          ctx.beginPath();
          if (typeof ctx.rect === 'function') {
            ctx.rect(x, y, w, h);
            ctx.stroke();
          } else if (typeof ctx.strokeRect === 'function') {
            ctx.strokeRect(x, y, w, h);
          }
        }
      } else if (stroke.tool === 'circle') {
        if (stroke.points.length >= 2) {
          const p1 = stroke.points[0];
          const p2 = stroke.points[1];
          const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y);

          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (stroke.tool === 'dimension') {
        if (stroke.points.length >= 2) {
          const p1 = stroke.points[0];
          const p2 = stroke.points[1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const distPx = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          const perp = angle + Math.PI / 2;
          const tickLen = 8;
          const scale = stroke.scale || this.scale || 0.05;
          const distM = (distPx * scale).toFixed(2);
          const label = stroke.label || `${distM}m`;

          ctx.strokeStyle = col;
          ctx.fillStyle = col;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          const tCos = Math.cos(perp) * tickLen;
          const tSin = Math.sin(perp) * tickLen;

          ctx.moveTo(p1.x - tCos, p1.y - tSin);
          ctx.lineTo(p1.x + tCos, p1.y + tSin);

          ctx.moveTo(p2.x - tCos, p2.y - tSin);
          ctx.lineTo(p2.x + tCos, p2.y + tSin);
          ctx.stroke();

          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.font = '12px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          if (typeof ctx.fillText === 'function') {
            ctx.fillText(label, midX, midY - 6);
          }
        }
      } else if (stroke.tool === 'pin') {
        const p = stroke.points[0];
        const label = stroke.label || '1';
        const radius = 12;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();

        ctx.strokeStyle = PALETTE.champagneGold;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = PALETTE.obsidianNavy;
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (typeof ctx.fillText === 'function') {
          ctx.fillText(label, p.x, p.y);
        }
      }
    } finally {
      ctx.restore();
    }
  }

  renderBackdrop(ctx = this.ctx, width = this.width, height = this.height) {
    if (!ctx) return;
    ctx.save();
    try {
      // Base background
      ctx.fillStyle = PALETTE.obsidianNavy;
      if (typeof ctx.fillRect === 'function') {
        ctx.fillRect(0, 0, width, height);
      }

      if (this.backdrop === 'cad-grid') {
        const step = 20;
        const major = 100;
        for (let x = 0; x <= width; x += step) {
          ctx.strokeStyle = (x % major === 0) ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.06)';
          ctx.lineWidth = (x % major === 0) ? 1.5 : 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y += step) {
          ctx.strokeStyle = (y % major === 0) ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.06)';
          ctx.lineWidth = (y % major === 0) ? 1.5 : 1;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else if (this.backdrop === 'penthouse-blueprint') {
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect ? ctx.strokeRect(100, 80, width - 200, height - 160) : null;
        ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText?.('PENTHOUSE SUITE - MASTER LEVEL', 120, 110);
      } else if (this.backdrop === 'estate-plot') {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(120, 100);
        ctx.lineTo(width - 150, 80);
        ctx.lineTo(width - 80, height - 100);
        ctx.lineTo(180, height - 120);
        ctx.closePath?.();
        ctx.stroke();
      }
    } finally {
      ctx.restore();
    }
  }

  render(ctx = this.ctx) {
    if (!ctx) return;
    this.renderBackdrop(ctx, this.width, this.height);
    for (const stroke of this.#undoStack) {
      this.renderStroke(stroke, ctx);
    }
    if (this.#currentDraftStroke) {
      this.renderStroke(this.#currentDraftStroke, ctx);
    }
  }

  // --- DOM Interaction & High-DPI Display Binding ---

  attach(canvasElement) {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    if (typeof window !== 'undefined') {
      this.setupDPI();
      this.bindEvents();
    }
    this.render();
  }

  setupDPI() {
    if (!this.canvas) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = this.canvas.getBoundingClientRect();
    const displayWidth = rect.width > 0 ? rect.width : this.width;
    const displayHeight = rect.height > 0 ? rect.height : this.height;

    this.width = displayWidth;
    this.height = displayHeight;

    this.canvas.width = Math.round(displayWidth * dpr);
    this.canvas.height = Math.round(displayHeight * dpr);

    if (this.ctx && typeof this.ctx.scale === 'function') {
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
    }
  }

  bindEvents() {
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;

    this.canvas.style.touchAction = 'none';

    this.#boundPointerDown = (e) => this.#onPointerDown(e);
    this.#boundPointerMove = (e) => this.#onPointerMove(e);
    this.#boundPointerUp = (e) => this.#onPointerUp(e);
    this.#boundPointerCancel = (e) => this.#onPointerCancel(e);
    this.#boundResize = () => {
      this.setupDPI();
      this.render();
    };

    this.canvas.addEventListener('pointerdown', this.#boundPointerDown);
    this.canvas.addEventListener('pointermove', this.#boundPointerMove);
    this.canvas.addEventListener('pointerup', this.#boundPointerUp);
    this.canvas.addEventListener('pointercancel', this.#boundPointerCancel);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.#boundResize);
    }
  }

  destroy() {
    if (this.canvas && typeof this.canvas.removeEventListener === 'function') {
      if (this.#boundPointerDown) this.canvas.removeEventListener('pointerdown', this.#boundPointerDown);
      if (this.#boundPointerMove) this.canvas.removeEventListener('pointermove', this.#boundPointerMove);
      if (this.#boundPointerUp) this.canvas.removeEventListener('pointerup', this.#boundPointerUp);
      if (this.#boundPointerCancel) this.canvas.removeEventListener('pointercancel', this.#boundPointerCancel);
    }
    if (typeof window !== 'undefined' && this.#boundResize) {
      window.removeEventListener('resize', this.#boundResize);
    }
    this.#listeners.clear();
  }

  #getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  #onPointerDown(e) {
    if (e.button !== 0) return; // Only primary button
    this.canvas.setPointerCapture?.(e.pointerId);
    this.#isDrawing = true;

    const pt = this.#getCanvasCoordinates(e);

    if (this.currentTool === 'pin') {
      const pinLabel = String(this.#pinCounter++);
      this.addStroke({
        tool: 'pin',
        color: this.currentColor,
        strokeWidth: this.strokeWidth,
        opacity: this.opacity,
        points: [pt],
        label: pinLabel
      });
      this.#isDrawing = false;
      return;
    }

    this.#currentDraftStroke = {
      tool: this.currentTool,
      color: this.currentColor,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      points: [pt],
      scale: this.scale
    };

    this.emit('stroke:start', { point: pt, tool: this.currentTool });
    this.render();
  }

  #onPointerMove(e) {
    if (!this.#isDrawing || !this.#currentDraftStroke) return;

    const pt = this.#getCanvasCoordinates(e);
    const pts = this.#currentDraftStroke.points;

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      const lastPt = pts[pts.length - 1];
      const interpolated = this.interpolatePoints(lastPt, pt, this.interpolationDistance);
      // Skip the first point since it matches lastPt
      for (let i = 1; i < interpolated.length; i++) {
        pts.push(interpolated[i]);
      }
    } else {
      // Shape tools: update endpoint
      if (pts.length === 1) {
        pts.push(pt);
      } else {
        pts[1] = pt;
      }
    }

    this.emit('stroke:point', { point: pt });
    this.render();
  }

  #onPointerUp(e) {
    if (!this.#isDrawing) return;
    this.#isDrawing = false;
    this.canvas.releasePointerCapture?.(e.pointerId);

    if (this.#currentDraftStroke && this.#currentDraftStroke.points.length > 0) {
      const completed = { ...this.#currentDraftStroke };
      this.#currentDraftStroke = null;
      this.addStroke(completed);
      this.emit('stroke:end', completed);
    } else {
      this.#currentDraftStroke = null;
      this.render();
    }
  }

  #onPointerCancel(e) {
    if (!this.#isDrawing) return;
    this.#isDrawing = false;
    this.canvas.releasePointerCapture?.(e.pointerId);
    this.#currentDraftStroke = null;
    this.render();
  }
}

// Global browser mount if loaded via script tag
if (typeof window !== 'undefined') {
  window.RealEstateLuxeWhiteboardCanvas = RealEstateLuxeWhiteboardCanvas;
}
