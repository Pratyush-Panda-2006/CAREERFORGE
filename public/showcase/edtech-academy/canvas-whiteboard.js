/**
 * EdTech Academy - Collaborative Freehand Vector Sketchpad & Whiteboard Canvas
 * Issue #2075 - Vector drawing engine with stroke smoothing, history stacks, SVG & JSON export.
 */

export class EdtechAcademyWhiteboardCanvas {
  /**
   * @param {Object} [options={}]
   * @param {HTMLCanvasElement} [options.canvas]
   * @param {number} [options.width=1200]
   * @param {number} [options.height=800]
   * @param {string} [options.backgroundColor='#0f172a']
   * @param {number} [options.maxHistory=50]
   * @param {number} [options.interpolationThreshold=8]
   * @param {number} [options.minPointDistance=1]
   * @param {string} [options.tool='pen']
   * @param {string} [options.color='#4f46e5']
   * @param {number} [options.strokeWidth=4]
   * @param {number} [options.opacity=1.0]
   * @param {boolean} [options.showGrid=false]
   */
  constructor(options = {}) {
    this.canvas = options.canvas || null;
    this.ctx = this.canvas && typeof this.canvas.getContext === 'function'
      ? this.canvas.getContext('2d')
      : null;

    this.width = options.width || (this.canvas ? this.canvas.width : 1200);
    this.height = options.height || (this.canvas ? this.canvas.height : 800);
    this.backgroundColor = options.backgroundColor || '#0f172a';
    this.maxHistory = options.maxHistory !== undefined ? Math.max(1, options.maxHistory) : 50;
    this.interpolationThreshold = options.interpolationThreshold || 8;
    this.minPointDistance = options.minPointDistance || 1;
    this.showGrid = Boolean(options.showGrid);

    // Brush & Tool Settings
    this.activeTool = this.validateTool(options.tool || 'pen');
    this.strokeColor = options.color || '#4f46e5';
    this.strokeWidth = this.clampNumber(options.strokeWidth !== undefined ? options.strokeWidth : 4, 1, 50);
    this.opacity = this.clampNumber(options.opacity !== undefined ? options.opacity : 1.0, 0, 1);

    // State collections
    this.strokes = [];
    this.currentStroke = null;
    this.undoStack = [];
    this.redoStack = [];

    // Event listeners map: eventName -> Set of listener functions
    this.listeners = new Map();

    if (this.canvas) {
      this.initCanvasDOM();
    }
  }

  // ==========================================
  // Event Emitter Implementation
  // ==========================================

  /**
   * Subscribes a listener to an event.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
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
   * Unsubscribes a listener from an event.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emits an event to all subscribed listeners.
   * @param {string} event
   * @param {...*} args
   */
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      for (const handler of Array.from(this.listeners.get(event))) {
        try {
          handler(...args);
        } catch (err) {
          if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
            console.error(`Error in event listener for "${event}":`, err);
          }
        }
      }
    }
  }

  // ==========================================
  // Tool & Brush Customization
  // ==========================================

  /**
   * Validates tool name.
   * Allowed: 'pen', 'eraser', 'line', 'rectangle', 'circle', 'ellipse'
   * @param {string} tool
   * @returns {string}
   */
  validateTool(tool) {
    const normalized = String(tool || '').toLowerCase();
    const validTools = ['pen', 'eraser', 'line', 'rectangle', 'circle', 'ellipse'];
    if (!validTools.includes(normalized)) {
      throw new Error(`Invalid tool "${tool}". Allowed tools: ${validTools.join(', ')}`);
    }
    return normalized;
  }

  /**
   * Sets active drawing tool.
   * @param {string} tool
   * @returns {string}
   */
  setTool(tool) {
    this.activeTool = this.validateTool(tool);
    this.emit('tool:change', { tool: this.activeTool });
    return this.activeTool;
  }

  /**
   * Sets active brush color.
   * @param {string} color
   * @returns {string}
   */
  setColor(color) {
    if (!color || typeof color !== 'string') {
      throw new Error('Color must be a non-empty string');
    }
    this.strokeColor = color;
    this.emit('color:change', { color: this.strokeColor });
    return this.strokeColor;
  }

  /**
   * Sets brush stroke width (clamped 1-50px).
   * @param {number} width
   * @returns {number}
   */
  setStrokeWidth(width) {
    const num = Number(width);
    if (Number.isNaN(num)) {
      throw new TypeError('Stroke width must be a valid number');
    }
    this.strokeWidth = this.clampNumber(num, 1, 50);
    this.emit('size:change', { strokeWidth: this.strokeWidth });
    return this.strokeWidth;
  }

  /**
   * Sets brush opacity (clamped 0.0 - 1.0).
   * @param {number} opacity
   * @returns {number}
   */
  setOpacity(opacity) {
    const num = Number(opacity);
    if (Number.isNaN(num)) {
      throw new TypeError('Opacity must be a valid number');
    }
    this.opacity = this.clampNumber(num, 0, 1);
    this.emit('opacity:change', { opacity: this.opacity });
    return this.opacity;
  }

  // ==========================================
  // Vector Drawing Engine & Interpolation
  // ==========================================

  /**
   * Begins a new stroke.
   * @param {number} x
   * @param {number} y
   * @param {Object} [options={}]
   * @returns {Object} Newly created stroke
   */
  startStroke(x, y, options = {}) {
    const ptX = Number(x);
    const ptY = Number(y);
    if (Number.isNaN(ptX) || Number.isNaN(ptY)) {
      throw new TypeError('Coordinates x and y must be numbers');
    }

    const tool = options.tool ? this.validateTool(options.tool) : this.activeTool;
    const color = options.color || this.strokeColor;
    const strokeWidth = options.strokeWidth !== undefined
      ? this.clampNumber(Number(options.strokeWidth), 1, 50)
      : this.strokeWidth;
    const opacity = options.opacity !== undefined
      ? this.clampNumber(Number(options.opacity), 0, 1)
      : this.opacity;

    this.currentStroke = {
      id: options.id || `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tool,
      color,
      strokeWidth,
      opacity,
      points: [{ x: ptX, y: ptY }],
      timestamp: Date.now()
    };

    if (this.ctx) {
      this.renderAll();
    }

    this.emit('stroke:start', { stroke: this.currentStroke });
    return this.currentStroke;
  }

  /**
   * Computes linear interpolated points between two coordinates when distance exceeds threshold.
   * @param {{x: number, y: number}} p1
   * @param {{x: number, y: number}} p2
   * @param {number} [maxDistance]
   * @returns {Array<{x: number, y: number}>}
   */
  interpolatePoints(p1, p2, maxDistance = this.interpolationThreshold) {
    if (!p1 || !p2) return [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= maxDistance) return [];

    const steps = Math.floor(distance / maxDistance);
    const interpolated = [];
    for (let i = 1; i <= steps; i++) {
      const t = (i * maxDistance) / distance;
      if (t < 1) {
        interpolated.push({
          x: Math.round((p1.x + dx * t) * 100) / 100,
          y: Math.round((p1.y + dy * t) * 100) / 100
        });
      }
    }
    return interpolated;
  }

  /**
   * Adds a point to the in-progress stroke with distance interpolation.
   * @param {number} x
   * @param {number} y
   * @returns {Object|null}
   */
  addPoint(x, y) {
    if (!this.currentStroke) return null;

    const ptX = Number(x);
    const ptY = Number(y);
    if (Number.isNaN(ptX) || Number.isNaN(ptY)) {
      throw new TypeError('Coordinates x and y must be numbers');
    }

    const points = this.currentStroke.points;
    const lastPoint = points[points.length - 1];
    const isFreehand = this.currentStroke.tool === 'pen' || this.currentStroke.tool === 'eraser';

    if (isFreehand) {
      const dist = Math.hypot(ptX - lastPoint.x, ptY - lastPoint.y);
      if (dist < this.minPointDistance) {
        return lastPoint;
      }

      const intermediate = this.interpolatePoints(lastPoint, { x: ptX, y: ptY }, this.interpolationThreshold);
      for (const pt of intermediate) {
        points.push(pt);
      }
      points.push({ x: ptX, y: ptY });
    } else {
      // Shape tools (line, rectangle, circle, ellipse): replace/update destination endpoint
      if (points.length === 1) {
        points.push({ x: ptX, y: ptY });
      } else {
        points[points.length - 1] = { x: ptX, y: ptY };
      }
    }

    if (this.ctx) {
      this.renderAll();
    }

    const currentPoint = { x: ptX, y: ptY };
    this.emit('stroke:point', { point: currentPoint, stroke: this.currentStroke });
    return currentPoint;
  }

  /**
   * Concludes active stroke, commits it to canvas strokes and history.
   * @returns {Object|null} Finalized stroke
   */
  endStroke() {
    if (!this.currentStroke) return null;

    const finalized = this.currentStroke;
    const isShape = finalized.tool !== 'pen' && finalized.tool !== 'eraser';

    // If shape has only 1 point, synthesize a 0-distance second point
    if (isShape && finalized.points.length === 1) {
      finalized.points.push({ ...finalized.points[0] });
    }

    // Save previous state to undo stack before appending new stroke
    this.saveHistoryState();

    this.strokes.push(finalized);
    this.currentStroke = null;

    if (this.ctx) {
      this.renderAll();
    }

    this.emit('stroke:end', finalized);
    this.emit('change', { type: 'stroke', stroke: finalized });
    return finalized;
  }

  /**
   * Applies Chaikin's corner-cutting algorithm to smooth an array of coordinates.
   * @param {Array<{x: number, y: number}>} points
   * @param {number} [iterations=1]
   * @returns {Array<{x: number, y: number}>}
   */
  smoothPoints(points, iterations = 1) {
    if (!Array.isArray(points) || points.length <= 2) {
      return points ? points.map((p) => ({ ...p })) : [];
    }

    let current = points;
    for (let iter = 0; iter < iterations; iter++) {
      const smoothed = [current[0]];
      for (let i = 0; i < current.length - 1; i++) {
        const p0 = current[i];
        const p1 = current[i + 1];
        const q = {
          x: Math.round((0.75 * p0.x + 0.25 * p1.x) * 100) / 100,
          y: Math.round((0.75 * p0.y + 0.25 * p1.y) * 100) / 100
        };
        const r = {
          x: Math.round((0.25 * p0.x + 0.75 * p1.x) * 100) / 100,
          y: Math.round((0.25 * p0.y + 0.75 * p1.y) * 100) / 100
        };
        smoothed.push(q, r);
      }
      smoothed.push(current[current.length - 1]);
      current = smoothed;
    }
    return current;
  }

  /**
   * Converts point array into smooth SVG path data string using quadratic bezier midpoints.
   * @param {Array<{x: number, y: number}>} points
   * @returns {string}
   */
  getSvgPathData(points) {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const midX = ((points[i].x + points[i + 1].x) / 2).toFixed(2);
      const midY = ((points[i].y + points[i + 1].y) / 2).toFixed(2);
      d += ` Q ${points[i].x} ${points[i].y}, ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  // ==========================================
  // History & Undo / Redo Stacks
  // ==========================================

  /**
   * Clones stroke array deeply.
   * @param {Array<Object>} strokes
   * @returns {Array<Object>}
   */
  cloneStrokes(strokes) {
    return JSON.parse(JSON.stringify(strokes || []));
  }

  /**
   * Pushes current state snapshot to undo stack and flushes redo stack.
   */
  saveHistoryState() {
    this.undoStack.push(this.cloneStrokes(this.strokes));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  /**
   * Reverts last stroke/action. Respects stack boundary limits.
   * @returns {boolean} True if state was restored, false if boundary reached.
   */
  undo() {
    if (this.undoStack.length === 0) {
      return false;
    }

    this.redoStack.push(this.cloneStrokes(this.strokes));
    this.strokes = this.undoStack.pop();

    if (this.ctx) {
      this.renderAll();
    }

    this.emit('undo', { strokes: this.strokes });
    this.emit('change', { type: 'undo', strokes: this.strokes });
    return true;
  }

  /**
   * Re-applies previously undone stroke/action. Respects stack boundary limits.
   * @returns {boolean} True if state was restored, false if boundary reached.
   */
  redo() {
    if (this.redoStack.length === 0) {
      return false;
    }

    this.undoStack.push(this.cloneStrokes(this.strokes));
    this.strokes = this.redoStack.pop();

    if (this.ctx) {
      this.renderAll();
    }

    this.emit('redo', { strokes: this.strokes });
    this.emit('change', { type: 'redo', strokes: this.strokes });
    return true;
  }

  /**
   * Clears all strokes on the whiteboard.
   * @returns {boolean} True if cleared, false if already empty.
   */
  clear() {
    if (this.strokes.length === 0 && !this.currentStroke) {
      return false;
    }

    this.saveHistoryState();
    this.strokes = [];
    this.currentStroke = null;

    if (this.ctx) {
      this.renderAll();
    }

    this.emit('clear');
    this.emit('change', { type: 'clear' });
    return true;
  }

  // ==========================================
  // Rendering Engine
  // ==========================================

  /**
   * Renders a single vector stroke to the specified 2D canvas context.
   * @param {Object} stroke
   * @param {CanvasRenderingContext2D} [ctx=this.ctx]
   */
  renderStroke(stroke, ctx = this.ctx) {
    if (!ctx || !stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
      return;
    }

    const points = stroke.points;
    ctx.save();
    ctx.lineWidth = stroke.strokeWidth || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1.0;

    const isEraser = stroke.tool === 'eraser';
    ctx.strokeStyle = isEraser ? this.backgroundColor : (stroke.color || '#4f46e5');

    if (stroke.tool === 'pen' || isEraser) {
      if (points.length === 1) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, Math.max(0.5, (stroke.strokeWidth || 2) / 2), 0, Math.PI * 2);
        ctx.fill();
      } else if (points.length === 2) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const midX = (points[i].x + points[i + 1].x) / 2;
          const midY = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
      }
    } else if (stroke.tool === 'line') {
      const p0 = points[0];
      const p1 = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    } else if (stroke.tool === 'rectangle') {
      const p0 = points[0];
      const p1 = points[points.length - 1];
      const x = Math.min(p0.x, p1.x);
      const y = Math.min(p0.y, p1.y);
      const w = Math.abs(p1.x - p0.x);
      const h = Math.abs(p1.y - p0.y);
      ctx.beginPath();
      ctx.strokeRect(x, y, w, h);
    } else if (stroke.tool === 'circle' || stroke.tool === 'ellipse') {
      const p0 = points[0];
      const p1 = points[points.length - 1];
      const cx = (p0.x + p1.x) / 2;
      const cy = (p0.y + p1.y) / 2;
      const rx = Math.max(0.1, Math.abs(p1.x - p0.x) / 2);
      const ry = Math.max(0.1, Math.abs(p1.y - p0.y) / 2);
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else {
        // Fallback for older contexts
        const r = Math.hypot(rx, ry);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders background, grid, all committed strokes and active in-progress stroke.
   * @param {CanvasRenderingContext2D} [ctx=this.ctx]
   */
  renderAll(ctx = this.ctx) {
    if (!ctx) return;

    ctx.save();
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.showGrid) {
      this.renderGrid(ctx);
    }

    for (const stroke of this.strokes) {
      this.renderStroke(stroke, ctx);
    }

    if (this.currentStroke) {
      this.renderStroke(this.currentStroke, ctx);
    }

    ctx.restore();
  }

  /**
   * Renders a subtle coordinate dot grid on the whiteboard.
   * @param {CanvasRenderingContext2D} ctx
   */
  renderGrid(ctx) {
    const spacing = 32;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = spacing; x < this.width; x += spacing) {
      for (let y = spacing; y < this.height; y += spacing) {
        ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
      }
    }
    ctx.restore();
  }

  // ==========================================
  // Serialization: SVG & JSON Export / Import
  // ==========================================

  /**
   * Serializes all strokes into a valid SVG markup string.
   * @param {Object} [options={}]
   * @param {boolean} [options.includeBackground=true]
   * @param {number} [options.width]
   * @param {number} [options.height]
   * @returns {string} Serialized SVG string
   */
  exportSVG(options = {}) {
    const width = options.width || this.width;
    const height = options.height || this.height;
    const includeBg = options.includeBackground !== false;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

    if (includeBg) {
      svg += `  <rect width="100%" height="100%" fill="${this.backgroundColor}"/>\n`;
    }

    for (const stroke of this.strokes) {
      const pts = stroke.points;
      if (!pts || pts.length === 0) continue;

      const isEraser = stroke.tool === 'eraser';
      const color = isEraser ? this.backgroundColor : (stroke.color || '#4f46e5');
      const sw = stroke.strokeWidth || 1;
      const op = stroke.opacity !== undefined ? stroke.opacity : 1.0;

      if (stroke.tool === 'pen' || isEraser) {
        const pathData = this.getSvgPathData(pts);
        svg += `  <path d="${pathData}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>\n`;
      } else if (stroke.tool === 'line') {
        const p0 = pts[0];
        const p1 = pts[pts.length - 1];
        svg += `  <path d="M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}"/>\n`;
      } else if (stroke.tool === 'rectangle') {
        const p0 = pts[0];
        const p1 = pts[pts.length - 1];
        const x = Math.min(p0.x, p1.x);
        const y = Math.min(p0.y, p1.y);
        const w = Math.abs(p1.x - p0.x);
        const h = Math.abs(p1.y - p0.y);
        svg += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" opacity="${op}"/>\n`;
      } else if (stroke.tool === 'circle' || stroke.tool === 'ellipse') {
        const p0 = pts[0];
        const p1 = pts[pts.length - 1];
        const cx = (p0.x + p1.x) / 2;
        const cy = (p0.y + p1.y) / 2;
        const rx = Math.max(0.1, Math.abs(p1.x - p0.x) / 2);
        const ry = Math.max(0.1, Math.abs(p1.y - p0.y) / 2);
        svg += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${op}"/>\n`;
      }
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Serializes vector stroke array and canvas configuration into a JSON string.
   * @param {Object} [options={}]
   * @param {boolean} [options.pretty=false]
   * @returns {string}
   */
  exportJSON(options = {}) {
    const payload = {
      version: '1.0.0',
      generator: 'EdtechAcademyWhiteboardCanvas',
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      strokeCount: this.strokes.length,
      strokes: this.cloneStrokes(this.strokes)
    };
    return options.pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }

  /**
   * Restores canvas from a JSON string or stroke array object.
   * @param {string|Array<Object>|Object} data
   * @returns {boolean} True if successfully restored
   */
  loadJSON(data) {
    if (!data) {
      throw new Error('Data to load must not be null or undefined');
    }

    let parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch (err) {
        throw new Error(`Failed to parse whiteboard JSON: ${err.message}`);
      }
    }

    let loadedStrokes = [];
    if (Array.isArray(parsed)) {
      loadedStrokes = parsed;
    } else if (parsed && Array.isArray(parsed.strokes)) {
      loadedStrokes = parsed.strokes;
      if (parsed.backgroundColor) this.backgroundColor = parsed.backgroundColor;
      if (parsed.width) this.width = parsed.width;
      if (parsed.height) this.height = parsed.height;
    } else {
      throw new Error('Invalid JSON format: expected an array of strokes or object with strokes array');
    }

    // Save previous state to undo stack before loading new content
    this.saveHistoryState();

    this.strokes = this.cloneStrokes(loadedStrokes);
    this.currentStroke = null;

    if (this.ctx) {
      this.renderAll();
    }

    this.emit('load', { strokes: this.strokes });
    this.emit('change', { type: 'load', strokes: this.strokes });
    return true;
  }

  // ==========================================
  // DOM & Canvas Event Binding
  // ==========================================

  /**
   * Attaches canvas DOM element and sets up event bindings.
   * @param {HTMLCanvasElement} canvas
   */
  attachCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.initCanvasDOM();
  }

  /**
   * Configures canvas dimensions with high-DPI (Retina) backing scale support.
   */
  setupHiDPI() {
    if (!this.canvas) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = this.canvas.getBoundingClientRect();
    const displayWidth = rect.width > 0 ? rect.width : this.width;
    const displayHeight = rect.height > 0 ? rect.height : this.height;

    this.width = displayWidth;
    this.height = displayHeight;

    this.canvas.width = Math.round(displayWidth * dpr);
    this.canvas.height = Math.round(displayHeight * dpr);

    if (this.ctx) {
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
    }
    this.renderAll();
  }

  /**
   * Extracts canvas-relative coordinates from MouseEvent or TouchEvent.
   * @param {MouseEvent|Touch} e
   * @returns {{x: number, y: number}}
   */
  getCanvasCoordinates(e) {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top)
    };
  }

  /**
   * Initializes interactive mouse and touch events on attached canvas.
   */
  initCanvasDOM() {
    if (!this.canvas || typeof window === 'undefined') return;

    let isDrawing = false;

    const onPointerDown = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      isDrawing = true;
      this.startStroke(x, y);
    };

    const onPointerMove = (clientX, clientY) => {
      if (!isDrawing) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.addPoint(x, y);
    };

    const onPointerUp = () => {
      if (!isDrawing) return;
      isDrawing = false;
      this.endStroke();
    };

    // Mouse Event Listeners
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      onPointerDown(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      onPointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      onPointerUp();
    });

    // Touch Event Listeners (Mobile & Tablet Support)
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        onPointerDown(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!isDrawing) return;
      if (e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        onPointerMove(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      onPointerUp();
    });

    // Initialize HiDPI and render base canvas
    this.setupHiDPI();
  }

  /**
   * Clamps a number between min and max bounds.
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clampNumber(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }
}

// Global browser window attachment
if (typeof window !== 'undefined') {
  window.EdtechAcademyWhiteboardCanvas = EdtechAcademyWhiteboardCanvas;
}

// ==========================================
// Browser Interactive Toolbar & App Controller
// ==========================================

export function initWhiteboardApp() {
  if (typeof document === 'undefined') return null;

  const canvasEl = document.getElementById('whiteboard-canvas');
  if (!canvasEl) return null;

  const whiteboard = new EdtechAcademyWhiteboardCanvas({
    canvas: canvasEl,
    backgroundColor: '#0f172a',
    tool: 'pen',
    color: '#4f46e5',
    strokeWidth: 4,
    opacity: 1.0,
    showGrid: true
  });

  // Tool buttons
  const toolBtns = document.querySelectorAll('[data-tool]');
  toolBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      whiteboard.setTool(tool);
      toolBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Color chips & picker
  const colorChips = document.querySelectorAll('[data-color]');
  const customColorInput = document.getElementById('custom-color-picker');
  const brushPreview = document.getElementById('brush-preview-dot');

  const updateBrushPreview = () => {
    if (brushPreview) {
      brushPreview.style.backgroundColor = whiteboard.strokeColor;
      brushPreview.style.width = `${Math.min(32, Math.max(4, whiteboard.strokeWidth))}px`;
      brushPreview.style.height = `${Math.min(32, Math.max(4, whiteboard.strokeWidth))}px`;
      brushPreview.style.opacity = whiteboard.opacity;
    }
  };

  colorChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const col = chip.getAttribute('data-color');
      whiteboard.setColor(col);
      if (customColorInput) customColorInput.value = col;
      colorChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      updateBrushPreview();
    });
  });

  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      whiteboard.setColor(e.target.value);
      colorChips.forEach((c) => c.classList.remove('active'));
      updateBrushPreview();
    });
  }

  // Stroke width slider
  const sizeSlider = document.getElementById('stroke-width-slider');
  const sizeLabel = document.getElementById('stroke-width-label');
  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      whiteboard.setStrokeWidth(val);
      if (sizeLabel) sizeLabel.textContent = `${val}px`;
      updateBrushPreview();
    });
  }

  // Opacity slider
  const opacitySlider = document.getElementById('opacity-slider');
  const opacityLabel = document.getElementById('opacity-label');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const val = Number(e.target.value) / 100;
      whiteboard.setOpacity(val);
      if (opacityLabel) opacityLabel.textContent = `${Math.round(val * 100)}%`;
      updateBrushPreview();
    });
  }

  // Undo / Redo / Clear / Grid
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnClear = document.getElementById('btn-clear');
  const btnGrid = document.getElementById('btn-grid-toggle');

  if (btnUndo) {
    btnUndo.addEventListener('click', () => whiteboard.undo());
  }
  if (btnRedo) {
    btnRedo.addEventListener('click', () => whiteboard.redo());
  }
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Clear entire whiteboard canvas?')) {
        whiteboard.clear();
      }
    });
  }
  if (btnGrid) {
    btnGrid.addEventListener('click', () => {
      whiteboard.showGrid = !whiteboard.showGrid;
      btnGrid.classList.toggle('active', whiteboard.showGrid);
      whiteboard.renderAll();
    });
  }

  // Status updates
  const statusTool = document.getElementById('status-tool');
  const statusStrokes = document.getElementById('status-strokes');
  const statusHistory = document.getElementById('status-history');
  const statusCoords = document.getElementById('status-coords');

  const updateStatus = () => {
    if (statusTool) statusTool.textContent = whiteboard.activeTool.toUpperCase();
    if (statusStrokes) statusStrokes.textContent = `${whiteboard.strokes.length} strokes`;
    if (statusHistory) statusHistory.textContent = `Undo: ${whiteboard.undoStack.length} | Redo: ${whiteboard.redoStack.length}`;
  };

  whiteboard.on('change', updateStatus);
  whiteboard.on('tool:change', updateStatus);

  canvasEl.addEventListener('mousemove', (e) => {
    if (statusCoords) {
      const coords = whiteboard.getCanvasCoordinates(e);
      statusCoords.textContent = `X: ${coords.x}, Y: ${coords.y}`;
    }
  });

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      if (e.shiftKey) {
        whiteboard.redo();
      } else {
        whiteboard.undo();
      }
      e.preventDefault();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      whiteboard.redo();
      e.preventDefault();
    }
  });

  // Export SVG download
  const btnExportSvg = document.getElementById('btn-export-svg');
  if (btnExportSvg) {
    btnExportSvg.addEventListener('click', () => {
      const svg = whiteboard.exportSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Export PNG download
  const btnExportPng = document.getElementById('btn-export-png');
  if (btnExportPng) {
    btnExportPng.addEventListener('click', () => {
      if (!whiteboard.canvas) return;
      const url = whiteboard.canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${Date.now()}.png`;
      a.click();
    });
  }

  // Export JSON download
  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const json = whiteboard.exportJSON({ pretty: true });
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Import JSON
  const btnImportJson = document.getElementById('btn-import-json');
  const fileInput = document.getElementById('json-file-input');
  if (btnImportJson && fileInput) {
    btnImportJson.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          whiteboard.loadJSON(evt.target.result);
        } catch (err) {
          alert(`Failed to load JSON: ${err.message}`);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // Handle Window Resize
  window.addEventListener('resize', () => {
    whiteboard.setupHiDPI();
  });

  updateBrushPreview();
  updateStatus();
  return whiteboard;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhiteboardApp);
  } else {
    initWhiteboardApp();
  }
}
