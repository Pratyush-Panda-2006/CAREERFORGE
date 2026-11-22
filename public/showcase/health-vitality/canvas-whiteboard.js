/**
 * VitalityAI — Collaborative Freehand Vector Sketchpad & Whiteboard Canvas
 * Clinical & Rehabilitation Vector Drawing Engine
 * 
 * Supports anatomical sketching, rehabilitation range-of-motion diagrams,
 * and workout routing with point distance interpolation, stroke smoothing
 * (Catmull-Rom and Bezier curves), history management, and SVG/JSON serialization.
 */

export const PALETTE = Object.freeze({
  VIBRANT_TEAL: '#0d9488',
  CLINICAL_EMERALD: '#10b981',
  HEART_RED: '#ef4444',
  VITALITY_AMBER: '#f59e0b',
  SLATE_DARK: '#0f172a',
  PURE_WHITE: '#ffffff'
});

export const TOOLS = Object.freeze({
  PEN: 'pen',
  HIGHLIGHTER: 'highlighter',
  ERASER: 'eraser',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse'
});

const DEFAULT_OPTIONS = Object.freeze({
  width: 1200,
  height: 800,
  tool: TOOLS.PEN,
  color: PALETTE.VIBRANT_TEAL,
  strokeWidth: 4,
  opacity: 1.0,
  maxHistory: 50,
  interpolateDistance: 8,
  smoothing: true,
  background: '#061412'
});

export class HealthVitalityWhiteboardCanvas {
  #canvas;
  #ctx;
  #width;
  #height;
  #tool;
  #color;
  #strokeWidth;
  #opacity;
  #maxHistory;
  #interpolateDistance;
  #smoothing;
  #background;

  #strokes = [];
  #undoStack = [];
  #redoStack = [];
  #currentStroke = null;
  #listeners = new Map();

  /**
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    this.#canvas = config.canvas || null;
    this.#width = Number(config.width) || DEFAULT_OPTIONS.width;
    this.#height = Number(config.height) || DEFAULT_OPTIONS.height;
    this.#tool = this.#validateTool(config.tool);
    this.#color = this.#validateColor(config.color);
    this.#strokeWidth = this.#clamp(Number(config.strokeWidth) || DEFAULT_OPTIONS.strokeWidth, 1, 50);
    this.#opacity = this.#clamp(Number(config.opacity) !== undefined ? Number(config.opacity) : 1.0, 0.01, 1.0);
    this.#maxHistory = Math.max(1, Math.min(200, Number(config.maxHistory) || DEFAULT_OPTIONS.maxHistory));
    this.#interpolateDistance = Math.max(1, Number(config.interpolateDistance) || DEFAULT_OPTIONS.interpolateDistance);
    this.#smoothing = Boolean(config.smoothing);
    this.#background = config.background || DEFAULT_OPTIONS.background;

    if (this.#canvas && typeof this.#canvas.getContext === 'function') {
      this.#ctx = this.#canvas.getContext('2d');
      if (this.#canvas.width && this.#canvas.height) {
        this.#width = this.#canvas.width;
        this.#height = this.#canvas.height;
      }
    }
  }

  // Getters
  get canvas() { return this.#canvas; }
  get ctx() { return this.#ctx; }
  get width() { return this.#width; }
  get height() { return this.#height; }
  get tool() { return this.#tool; }
  get color() { return this.#color; }
  get strokeWidth() { return this.#strokeWidth; }
  get opacity() { return this.#opacity; }
  get maxHistory() { return this.#maxHistory; }
  get interpolateDistance() { return this.#interpolateDistance; }
  get smoothing() { return this.#smoothing; }
  get background() { return this.#background; }
  get currentStroke() { return this.#currentStroke ? this.#cloneStroke(this.#currentStroke) : null; }
  get strokes() { return this.#strokes.map((s) => this.#cloneStroke(s)); }
  get historyCount() { return this.#undoStack.length; }
  get redoCount() { return this.#redoStack.length; }
  get canUndo() { return this.#undoStack.length > 0; }
  get canRedo() { return this.#redoStack.length > 0; }

  // Setters with validation
  setTool(tool) {
    this.#tool = this.#validateTool(tool);
    this.emit('tool:change', this.#tool);
    return this.#tool;
  }

  setColor(color) {
    this.#color = this.#validateColor(color);
    this.emit('color:change', this.#color);
    return this.#color;
  }

  setStrokeWidth(width) {
    const val = Number(width);
    if (Number.isNaN(val)) throw new TypeError('Stroke width must be a valid number.');
    this.#strokeWidth = this.#clamp(val, 1, 50);
    this.emit('width:change', this.#strokeWidth);
    return this.#strokeWidth;
  }

  setOpacity(opacity) {
    const val = Number(opacity);
    if (Number.isNaN(val)) throw new TypeError('Opacity must be a valid number.');
    this.#opacity = this.#clamp(val, 0.01, 1.0);
    this.emit('opacity:change', this.#opacity);
    return this.#opacity;
  }

  setSmoothing(enabled) {
    this.#smoothing = Boolean(enabled);
    this.emit('smoothing:change', this.#smoothing);
    return this.#smoothing;
  }

  setInterpolateDistance(dist) {
    const val = Number(dist);
    if (Number.isNaN(val) || val <= 0) throw new TypeError('Interpolation distance must be a positive number.');
    this.#interpolateDistance = val;
    return this.#interpolateDistance;
  }

  setBackground(bg) {
    this.#background = String(bg);
    this.render();
    this.emit('background:change', this.#background);
    return this.#background;
  }

  // --- Point Interpolation & Curve Smoothing Algorithms ---

  /**
   * Linearly interpolates intermediate points between p1 and p2 when distance exceeds maxDistance.
   * @param {{x: number, y: number}} p1 Start point
   * @param {{x: number, y: number}} p2 End point
   * @param {number} maxDistance Maximum allowed distance before adding intermediate points
   * @returns {Array<{x: number, y: number}>} Array containing interpolated points and p2
   */
  static interpolatePoints(p1, p2, maxDistance = 8) {
    if (!p1 || !p2) return [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= maxDistance || maxDistance <= 0) {
      return [{ x: p2.x, y: p2.y }];
    }

    const segments = Math.ceil(distance / maxDistance);
    const points = [];
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      points.push({
        x: Number((p1.x + dx * t).toFixed(2)),
        y: Number((p1.y + dy * t).toFixed(2))
      });
    }
    return points;
  }

  /**
   * Catmull-Rom spline interpolation calculation for 4 control points at parameter t [0, 1].
   */
  static catmullRomPoint(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  }

  /**
   * Smooths an array of points using Catmull-Rom spline interpolation.
   * @param {Array<{x: number, y: number}>} points 
   * @param {number} samplesPerSegment Number of sample points per segment
   * @returns {Array<{x: number, y: number}>}
   */
  static smoothPointsCatmullRom(points, samplesPerSegment = 4) {
    if (!Array.isArray(points) || points.length < 3) {
      return Array.isArray(points) ? points.map((p) => ({ ...p })) : [];
    }
    const result = [];
    const n = points.length;

    for (let i = 0; i < n - 1; i++) {
      const p0 = i === 0 ? points[0] : points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < n ? points[i + 2] : p2;

      for (let s = 0; s < samplesPerSegment; s++) {
        const t = s / samplesPerSegment;
        result.push(HealthVitalityWhiteboardCanvas.catmullRomPoint(p0, p1, p2, p3, t));
      }
    }
    result.push({ ...points[n - 1] });
    return result;
  }

  /**
   * Converts a series of freehand points into a smooth SVG path command string using midpoint Quadratic Beziers.
   * @param {Array<{x: number, y: number}>} points
   * @param {boolean} smooth
   * @returns {string}
   */
  static pointsToSvgPath(points, smooth = true) {
    if (!Array.isArray(points) || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }
    if (points.length === 2 || !smooth) {
      return points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const cp = points[i];
      const next = points[i + 1];
      const midX = Number(((cp.x + next.x) / 2).toFixed(2));
      const midY = Number(((cp.y + next.y) / 2).toFixed(2));
      d += ` Q ${cp.x} ${cp.y} ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  // --- Drawing Lifecycle Methods ---

  /**
   * Starts a new stroke at (x, y).
   * @param {number} x
   * @param {number} y
   * @param {Object} [options]
   * @returns {Object} Newly created stroke
   */
  startStroke(x, y, options = {}) {
    if (x === null || y === null || x === undefined || y === undefined || typeof x === 'boolean' || typeof y === 'boolean') {
      throw new TypeError('Stroke coordinates must be numeric.');
    }
    const px = Number(x);
    const py = Number(y);
    if (Number.isNaN(px) || Number.isNaN(py)) {
      throw new TypeError('Stroke coordinates must be numeric.');
    }

    const tool = options.tool ? this.#validateTool(options.tool) : this.#tool;
    const color = options.color ? this.#validateColor(options.color) : this.#color;
    const strokeWidth = options.strokeWidth !== undefined
      ? this.#clamp(Number(options.strokeWidth), 1, 50)
      : this.#strokeWidth;
    const opacity = options.opacity !== undefined
      ? this.#clamp(Number(options.opacity), 0.01, 1.0)
      : this.#opacity;

    this.#currentStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tool,
      color,
      width: strokeWidth,
      opacity,
      smoothing: options.smoothing !== undefined ? Boolean(options.smoothing) : this.#smoothing,
      points: [{ x: px, y: py }],
      createdAt: Date.now()
    };

    this.emit('stroke:start', this.#cloneStroke(this.#currentStroke));
    return this.#cloneStroke(this.#currentStroke);
  }

  /**
   * Adds a point to the active stroke with point distance interpolation.
   * @param {number} x
   * @param {number} y
   * @returns {Array<{x: number, y: number}>} Added points
   */
  addPoint(x, y) {
    if (!this.#currentStroke) {
      throw new Error('No active stroke in progress. Call startStroke first.');
    }
    if (x === null || y === null || x === undefined || y === undefined || typeof x === 'boolean' || typeof y === 'boolean') {
      throw new TypeError('Point coordinates must be numeric.');
    }
    const px = Number(x);
    const py = Number(y);
    if (Number.isNaN(px) || Number.isNaN(py)) {
      throw new TypeError('Point coordinates must be numeric.');
    }

    const lastPoint = this.#currentStroke.points[this.#currentStroke.points.length - 1];
    let addedPoints = [];

    // Interpolate points for freehand tools (pen, highlighter, eraser)
    const isFreehand = [TOOLS.PEN, TOOLS.HIGHLIGHTER, TOOLS.ERASER].includes(this.#currentStroke.tool);
    if (isFreehand && this.#interpolateDistance > 0 && lastPoint) {
      addedPoints = HealthVitalityWhiteboardCanvas.interpolatePoints(lastPoint, { x: px, y: py }, this.#interpolateDistance);
      for (const pt of addedPoints) {
        this.#currentStroke.points.push(pt);
      }
    } else {
      // For shapes (line, rectangle, ellipse), replace or update endpoint
      if (!isFreehand && this.#currentStroke.points.length > 1) {
        this.#currentStroke.points[1] = { x: px, y: py };
        addedPoints = [{ x: px, y: py }];
      } else {
        const pt = { x: px, y: py };
        this.#currentStroke.points.push(pt);
        addedPoints = [pt];
      }
    }

    if (this.#ctx) {
      this.render();
    }

    this.emit('stroke:point', {
      strokeId: this.#currentStroke.id,
      addedPoints: addedPoints.map((p) => ({ ...p })),
      currentPoint: { x: px, y: py }
    });

    return addedPoints;
  }

  /**
   * Ends the active stroke, saves to history, and clears redo stack.
   * @returns {Object|null} Completed stroke
   */
  endStroke() {
    if (!this.#currentStroke) return null;

    const completed = this.#currentStroke;
    this.#currentStroke = null;

    // Apply smoothing if enabled and freehand
    if (completed.smoothing && [TOOLS.PEN, TOOLS.HIGHLIGHTER].includes(completed.tool) && completed.points.length > 3) {
      completed.smoothedPoints = HealthVitalityWhiteboardCanvas.smoothPointsCatmullRom(completed.points, 3);
    }

    // Save previous state for undo
    this.#pushHistoryState();
    this.#strokes.push(completed);
    this.#redoStack = [];

    if (this.#ctx) {
      this.render();
    }

    this.emit('stroke:end', this.#cloneStroke(completed));
    this.emit('change', { action: 'stroke:end', strokeCount: this.#strokes.length });
    return this.#cloneStroke(completed);
  }

  /**
   * Renders a single stroke on the specified 2D rendering context or current canvas.
   * @param {Object} stroke Stroke definition
   * @param {CanvasRenderingContext2D} [targetCtx] Context to render onto
   */
  renderStroke(stroke, targetCtx = this.#ctx) {
    if (!targetCtx || !stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
      return;
    }

    targetCtx.save();

    const isHighlighter = stroke.tool === TOOLS.HIGHLIGHTER;
    const isEraser = stroke.tool === TOOLS.ERASER;

    targetCtx.lineWidth = isHighlighter ? stroke.width * 2.5 : stroke.width;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    if (isEraser) {
      targetCtx.globalCompositeOperation = 'destination-out';
      targetCtx.strokeStyle = 'rgba(0,0,0,1)';
      targetCtx.globalAlpha = 1.0;
    } else if (isHighlighter) {
      targetCtx.globalCompositeOperation = 'source-over';
      targetCtx.strokeStyle = stroke.color;
      targetCtx.globalAlpha = (stroke.opacity || 1.0) * 0.35;
    } else {
      targetCtx.globalCompositeOperation = 'source-over';
      targetCtx.strokeStyle = stroke.color;
      targetCtx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1.0;
    }

    const pts = (stroke.smoothing && stroke.smoothedPoints) ? stroke.smoothedPoints : stroke.points;

    switch (stroke.tool) {
      case TOOLS.PEN:
      case TOOLS.HIGHLIGHTER:
      case TOOLS.ERASER: {
        if (pts.length === 1) {
          targetCtx.fillStyle = stroke.color;
          targetCtx.beginPath();
          targetCtx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
          targetCtx.fill();
        } else if (pts.length === 2 || !stroke.smoothing) {
          targetCtx.beginPath();
          targetCtx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            targetCtx.lineTo(pts[i].x, pts[i].y);
          }
          targetCtx.stroke();
        } else {
          targetCtx.beginPath();
          targetCtx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length - 1; i++) {
            const cp = pts[i];
            const next = pts[i + 1];
            const midX = (cp.x + next.x) / 2;
            const midY = (cp.y + next.y) / 2;
            targetCtx.quadraticCurveTo(cp.x, cp.y, midX, midY);
          }
          const last = pts[pts.length - 1];
          targetCtx.lineTo(last.x, last.y);
          targetCtx.stroke();
        }
        break;
      }

      case TOOLS.LINE: {
        const start = pts[0];
        const end = pts[pts.length - 1];
        targetCtx.beginPath();
        targetCtx.moveTo(start.x, start.y);
        targetCtx.lineTo(end.x, end.y);
        targetCtx.stroke();
        break;
      }

      case TOOLS.RECTANGLE: {
        const start = pts[0];
        const end = pts[pts.length - 1];
        const rx = Math.min(start.x, end.x);
        const ry = Math.min(start.y, end.y);
        const rw = Math.abs(end.x - start.x);
        const rh = Math.abs(end.y - start.y);
        targetCtx.beginPath();
        targetCtx.strokeRect(rx, ry, rw, rh);
        break;
      }

      case TOOLS.ELLIPSE: {
        const start = pts[0];
        const end = pts[pts.length - 1];
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        if (rx > 0 && ry > 0) {
          targetCtx.beginPath();
          targetCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          targetCtx.stroke();
        }
        break;
      }
    }

    targetCtx.restore();
  }

  /**
   * Clears and redraws entire canvas including completed strokes and active stroke.
   */
  render() {
    if (!this.#ctx) return;

    this.#ctx.save();
    this.#ctx.clearRect(0, 0, this.#width, this.#height);

    if (this.#background && this.#background !== 'transparent' && this.#background !== 'none') {
      this.#ctx.fillStyle = this.#background;
      this.#ctx.fillRect(0, 0, this.#width, this.#height);
    }

    for (const stroke of this.#strokes) {
      this.renderStroke(stroke, this.#ctx);
    }

    if (this.#currentStroke) {
      this.renderStroke(this.#currentStroke, this.#ctx);
    }

    this.#ctx.restore();
  }

  // --- History & State Management ---

  #pushHistoryState() {
    this.#undoStack.push(this.#strokes.map((s) => this.#cloneStroke(s)));
    if (this.#undoStack.length > this.#maxHistory) {
      this.#undoStack.shift();
    }
  }

  /**
   * Undoes the last stroke or action.
   * @returns {boolean} True if undone, false if at boundary limit
   */
  undo() {
    if (this.#undoStack.length === 0) {
      return false;
    }

    // Save current strokes to redo stack
    this.#redoStack.push(this.#strokes.map((s) => this.#cloneStroke(s)));
    if (this.#redoStack.length > this.#maxHistory) {
      this.#redoStack.shift();
    }

    const previousState = this.#undoStack.pop();
    this.#strokes = previousState.map((s) => this.#cloneStroke(s));

    if (this.#ctx) {
      this.render();
    }

    this.emit('undo', { strokeCount: this.#strokes.length });
    this.emit('change', { action: 'undo', strokeCount: this.#strokes.length });
    return true;
  }

  /**
   * Redoes the last undone stroke or action.
   * @returns {boolean} True if redone, false if at boundary limit
   */
  redo() {
    if (this.#redoStack.length === 0) {
      return false;
    }

    // Save current to undo stack
    this.#pushHistoryState();

    const nextState = this.#redoStack.pop();
    this.#strokes = nextState.map((s) => this.#cloneStroke(s));

    if (this.#ctx) {
      this.render();
    }

    this.emit('redo', { strokeCount: this.#strokes.length });
    this.emit('change', { action: 'redo', strokeCount: this.#strokes.length });
    return true;
  }

  /**
   * Clears the whiteboard canvas.
   */
  clear() {
    if (this.#strokes.length === 0 && !this.#currentStroke) {
      return;
    }

    this.#pushHistoryState();
    this.#strokes = [];
    this.#redoStack = [];
    this.#currentStroke = null;

    if (this.#ctx) {
      this.render();
    }

    this.emit('clear', {});
    this.emit('change', { action: 'clear', strokeCount: 0 });
  }

  // --- Export & Serialization ---

  /**
   * Serializes all strokes into valid SVG markup string.
   * @param {Object} [options]
   * @returns {string} SVG markup
   */
  exportSVG(options = {}) {
    const width = Number(options.width) || this.#width;
    const height = Number(options.height) || this.#height;
    const bg = options.background !== undefined ? options.background : this.#background;

    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`
    ];

    if (bg && bg !== 'none' && bg !== 'transparent') {
      parts.push(`  <rect width="100%" height="100%" fill="${this.#escapeXml(bg)}" />`);
    }

    for (const stroke of this.#strokes) {
      if (!Array.isArray(stroke.points) || stroke.points.length === 0) continue;
      const pts = stroke.points;
      const color = this.#escapeXml(stroke.color);
      const strokeWidth = stroke.width;
      const opacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;

      switch (stroke.tool) {
        case TOOLS.PEN: {
          const d = HealthVitalityWhiteboardCanvas.pointsToSvgPath(pts, stroke.smoothing);
          parts.push(`  <path d="${d}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${opacity}" />`);
          break;
        }

        case TOOLS.HIGHLIGHTER: {
          const d = HealthVitalityWhiteboardCanvas.pointsToSvgPath(pts, stroke.smoothing);
          const hWidth = strokeWidth * 2.5;
          const hOpacity = Number((opacity * 0.35).toFixed(3));
          parts.push(`  <path d="${d}" stroke="${color}" stroke-width="${hWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${hOpacity}" />`);
          break;
        }

        case TOOLS.ERASER: {
          const d = HealthVitalityWhiteboardCanvas.pointsToSvgPath(pts, stroke.smoothing);
          const eWidth = strokeWidth * 2.5;
          const eColor = bg && bg !== 'none' && bg !== 'transparent' ? bg : '#ffffff';
          parts.push(`  <path d="${d}" stroke="${this.#escapeXml(eColor)}" stroke-width="${eWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`);
          break;
        }

        case TOOLS.LINE: {
          const p1 = pts[0];
          const p2 = pts[pts.length - 1];
          parts.push(`  <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${opacity}" />`);
          break;
        }

        case TOOLS.RECTANGLE: {
          const p1 = pts[0];
          const p2 = pts[pts.length - 1];
          const rx = Math.min(p1.x, p2.x);
          const ry = Math.min(p1.y, p2.y);
          const rw = Math.abs(p2.x - p1.x);
          const rh = Math.abs(p2.y - p1.y);
          parts.push(`  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round" fill="none" opacity="${opacity}" rx="2" />`);
          break;
        }

        case TOOLS.ELLIPSE: {
          const p1 = pts[0];
          const p2 = pts[pts.length - 1];
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const rx = Math.abs(p2.x - p1.x) / 2;
          const ry = Math.abs(p2.y - p1.y) / 2;
          if (rx > 0 && ry > 0) {
            parts.push(`  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}" />`);
          }
          break;
        }
      }
    }

    parts.push('</svg>');
    return parts.join('\n');
  }

  /**
   * Serializes vector stroke array and canvas metadata to JSON string.
   * @param {Object} [options]
   * @returns {string} JSON string
   */
  exportJSON(options = {}) {
    const payload = {
      version: '1.0',
      schema: 'health-vitality-whiteboard',
      metadata: {
        width: this.#width,
        height: this.#height,
        strokeCount: this.#strokes.length,
        exportedAt: new Date().toISOString()
      },
      strokes: this.#strokes.map((s) => this.#cloneStroke(s))
    };
    return options.indent ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }

  /**
   * Restores canvas from serialized JSON data or stroke array.
   * @param {string|Object|Array} data
   * @returns {boolean} True if restored successfully
   */
  loadJSON(data) {
    let parsed;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch (err) {
        throw new Error(`Failed to parse JSON whiteboard data: ${err.message}`);
      }
    } else {
      parsed = data;
    }

    let strokesToLoad = [];
    if (Array.isArray(parsed)) {
      strokesToLoad = parsed;
    } else if (parsed && Array.isArray(parsed.strokes)) {
      strokesToLoad = parsed.strokes;
      if (parsed.metadata?.width && parsed.metadata?.height) {
        this.#width = Number(parsed.metadata.width) || this.#width;
        this.#height = Number(parsed.metadata.height) || this.#height;
      }
    } else {
      throw new TypeError('Invalid whiteboard data format: expected an array of strokes or an object with strokes property.');
    }

    // Validate and sanitize imported strokes
    const validatedStrokes = strokesToLoad.map((stroke, index) => {
      if (!stroke || typeof stroke !== 'object') {
        throw new TypeError(`Stroke at index ${index} is not an object.`);
      }
      return {
        id: stroke.id || `stroke_imported_${index}_${Date.now()}`,
        tool: this.#validateTool(stroke.tool || TOOLS.PEN),
        color: this.#validateColor(stroke.color || PALETTE.VIBRANT_TEAL),
        width: this.#clamp(Number(stroke.width) || 4, 1, 50),
        opacity: this.#clamp(Number(stroke.opacity) !== undefined ? Number(stroke.opacity) : 1.0, 0.01, 1.0),
        smoothing: Boolean(stroke.smoothing),
        points: Array.isArray(stroke.points) ? stroke.points.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : [],
        createdAt: stroke.createdAt || Date.now()
      };
    });

    this.#pushHistoryState();
    this.#strokes = validatedStrokes;
    this.#redoStack = [];
    this.#currentStroke = null;

    if (this.#ctx) {
      this.render();
    }

    this.emit('load', { strokeCount: this.#strokes.length });
    this.emit('change', { action: 'load', strokeCount: this.#strokes.length });
    return true;
  }

  // --- Event Emitter Pattern ---

  /**
   * Subscribes to an event.
   * @param {string} event Event name
   * @param {Function} handler Callback
   * @returns {Function} Unsubscribe function
   */
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

  /**
   * Unsubscribes from an event.
   * @param {string} event Event name
   * @param {Function} handler Callback
   */
  off(event, handler) {
    if (this.#listeners.has(event)) {
      this.#listeners.get(event).delete(handler);
    }
  }

  /**
   * Emits an event to registered listeners.
   * @param {string} event Event name
   * @param {...*} args Arguments
   */
  emit(event, ...args) {
    if (this.#listeners.has(event)) {
      for (const fn of this.#listeners.get(event)) {
        try {
          fn(...args);
        } catch (err) {
          console.error(`Error in whiteboard event listener for "${event}":`, err);
        }
      }
    }
  }

  // --- Private Helpers ---

  #validateTool(tool) {
    if (!tool || typeof tool !== 'string') {
      throw new TypeError(`Tool must be a string. Received: ${tool}`);
    }
    const normalized = tool.toLowerCase().trim();
    if (normalized === 'circle') return TOOLS.ELLIPSE;
    const valid = Object.values(TOOLS);
    if (!valid.includes(normalized)) {
      throw new Error(`Invalid tool "${tool}". Supported tools: ${valid.join(', ')}`);
    }
    return normalized;
  }

  #validateColor(color) {
    if (!color || typeof color !== 'string') {
      throw new TypeError('Color must be a valid string.');
    }
    const trimmed = color.trim();
    const isHex = /^#[0-9a-fA-F]{3,8}$/.test(trimmed);
    const isFunc = /^(rgb|rgba|hsl|hsla)\(/.test(trimmed);
    const isNamed = /^[a-zA-Z]+$/.test(trimmed);
    if (!isHex && !isFunc && !isNamed) {
      throw new Error(`Invalid color representation: "${color}"`);
    }
    return trimmed;
  }

  #clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  #cloneStroke(stroke) {
    return {
      ...stroke,
      points: stroke.points.map((p) => ({ ...p })),
      smoothedPoints: stroke.smoothedPoints ? stroke.smoothedPoints.map((p) => ({ ...p })) : undefined
    };
  }

  #escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// --- Interactive DOM Mount & Binding ---

/**
 * Initializes and binds HealthVitalityWhiteboardCanvas to the DOM interface.
 * @param {HTMLElement} rootContainer
 */
export function mountWhiteboardApp(rootContainer) {
  if (!rootContainer || typeof document === 'undefined') return null;

  const canvasEl = rootContainer.querySelector('#whiteboard-canvas');
  if (!canvasEl) return null;

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const canvasWrap = rootContainer.querySelector('.canvas-viewport') || canvasEl.parentElement;

  function resizeCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    const width = Math.max(400, Math.floor(rect.width));
    const height = Math.max(300, Math.floor(rect.height || (window.innerHeight - 160)));

    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;
    canvasEl.style.width = `${width}px`;
    canvasEl.style.height = `${height}px`;

    const ctx = canvasEl.getContext('2d');
    ctx.scale(dpr, dpr);
    engine.render();
  }

  const engine = new HealthVitalityWhiteboardCanvas({
    canvas: canvasEl,
    width: canvasEl.width || 1200,
    height: canvasEl.height || 800,
    strokeWidth: 4,
    color: PALETTE.VIBRANT_TEAL
  });

  // Scale context for Hi-DPI
  const ctx = canvasEl.getContext('2d');
  ctx.scale(dpr, dpr);

  // Resize handling
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', resizeCanvas);
  }

  // Pointer drawing events
  let isDrawing = false;

  function getCanvasCoords(event) {
    const rect = canvasEl.getBoundingClientRect();
    const clientX = event.clientX !== undefined ? event.clientX : (event.touches && event.touches[0].clientX);
    const clientY = event.clientY !== undefined ? event.clientY : (event.touches && event.touches[0].clientY);
    return {
      x: Number((clientX - rect.left).toFixed(1)),
      y: Number((clientY - rect.top).toFixed(1))
    };
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    canvasEl.setPointerCapture(e.pointerId);
    isDrawing = true;
    const { x, y } = getCanvasCoords(e);
    engine.startStroke(x, y);
  });

  canvasEl.addEventListener('pointermove', (e) => {
    const { x, y } = getCanvasCoords(e);
    const coordsEl = rootContainer.querySelector('#canvas-coords');
    if (coordsEl) coordsEl.textContent = `${Math.round(x)}, ${Math.round(y)} px`;

    if (!isDrawing) return;
    engine.addPoint(x, y);
  });

  function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;
    if (e && e.pointerId) {
      try { canvasEl.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    engine.endStroke();
    updateUI();
  }

  canvasEl.addEventListener('pointerup', stopDrawing);
  canvasEl.addEventListener('pointercancel', stopDrawing);

  // Toolbar bindings
  const toolButtons = rootContainer.querySelectorAll('[data-tool]');
  toolButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      engine.setTool(tool);
      toolButtons.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // Color presets & input
  const colorSwatches = rootContainer.querySelectorAll('[data-color]');
  const customColorInput = rootContainer.querySelector('#custom-color');

  colorSwatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      engine.setColor(color);
      colorSwatches.forEach((s) => s.classList.toggle('active', s === swatch));
      if (customColorInput) customColorInput.value = color;
    });
  });

  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      const color = e.target.value;
      engine.setColor(color);
      colorSwatches.forEach((s) => s.classList.toggle('active', s.dataset.color === color));
    });
  }

  // Stroke width slider
  const widthSlider = rootContainer.querySelector('#stroke-width-slider');
  const widthDisplay = rootContainer.querySelector('#stroke-width-display');
  const brushPreviewDot = rootContainer.querySelector('#brush-preview-dot');

  if (widthSlider) {
    widthSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      engine.setStrokeWidth(val);
      if (widthDisplay) widthDisplay.textContent = `${val}px`;
      if (brushPreviewDot) {
        brushPreviewDot.style.width = `${Math.max(4, Math.min(32, val))}px`;
        brushPreviewDot.style.height = `${Math.max(4, Math.min(32, val))}px`;
      }
    });
  }

  // Opacity slider
  const opacitySlider = rootContainer.querySelector('#opacity-slider');
  const opacityDisplay = rootContainer.querySelector('#opacity-display');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const val = Number(e.target.value) / 100;
      engine.setOpacity(val);
      if (opacityDisplay) opacityDisplay.textContent = `${Math.round(val * 100)}%`;
    });
  }

  // Smoothing toggle
  const smoothingToggle = rootContainer.querySelector('#smoothing-toggle');
  if (smoothingToggle) {
    smoothingToggle.addEventListener('change', (e) => {
      engine.setSmoothing(e.target.checked);
    });
  }

  // Undo / Redo / Clear
  const undoBtn = rootContainer.querySelector('#btn-undo');
  const redoBtn = rootContainer.querySelector('#btn-redo');
  const clearBtn = rootContainer.querySelector('#btn-clear');

  if (undoBtn) undoBtn.addEventListener('click', () => { engine.undo(); updateUI(); });
  if (redoBtn) redoBtn.addEventListener('click', () => { engine.redo(); updateUI(); });
  if (clearBtn) clearBtn.addEventListener('click', () => { engine.clear(); updateUI(); });

  // Export SVG
  const exportSvgBtn = rootContainer.querySelector('#btn-export-svg');
  if (exportSvgBtn) {
    exportSvgBtn.addEventListener('click', () => {
      const svg = engine.exportSVG();
      downloadBlob(svg, 'vitality-whiteboard-sketch.svg', 'image/svg+xml');
      showNotification('SVG exported successfully!');
    });
  }

  // Export PNG
  const exportPngBtn = rootContainer.querySelector('#btn-export-png');
  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', () => {
      canvasEl.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, 'vitality-whiteboard-sketch.png', 'image/png');
          showNotification('PNG downloaded successfully!');
        }
      });
    });
  }

  // Export JSON
  const exportJsonBtn = rootContainer.querySelector('#btn-export-json');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      const json = engine.exportJSON({ indent: true });
      downloadBlob(json, 'vitality-whiteboard-vector.json', 'application/json');
      showNotification('JSON vector data exported!');
    });
  }

  // Import JSON file
  const importJsonInput = rootContainer.querySelector('#import-json-file');
  if (importJsonInput) {
    importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          engine.loadJSON(evt.target.result);
          updateUI();
          showNotification(`Imported ${file.name} successfully!`);
        } catch (err) {
          showNotification(`Import failed: ${err.message}`, true);
        }
      };
      reader.readAsText(file);
    });
  }

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, P, H, E, L, R, C)
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          engine.redo();
        } else {
          engine.undo();
        }
        updateUI();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        engine.redo();
        updateUI();
        e.preventDefault();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'p': selectTool(TOOLS.PEN); break;
          case 'h': selectTool(TOOLS.HIGHLIGHTER); break;
          case 'e': selectTool(TOOLS.ERASER); break;
          case 'l': selectTool(TOOLS.LINE); break;
          case 'r': selectTool(TOOLS.RECTANGLE); break;
          case 'c': selectTool(TOOLS.ELLIPSE); break;
        }
      }
    });
  }

  function selectTool(tool) {
    engine.setTool(tool);
    toolButtons.forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
  }

  function updateUI() {
    if (undoBtn) undoBtn.disabled = !engine.canUndo;
    if (redoBtn) redoBtn.disabled = !engine.canRedo;
    const strokeCountEl = rootContainer.querySelector('#stroke-count');
    if (strokeCountEl) strokeCountEl.textContent = `${engine.strokes.length} strokes`;
  }

  function showNotification(msg, isError = false) {
    const notifyEl = rootContainer.querySelector('#toast-notification');
    if (notifyEl) {
      notifyEl.textContent = msg;
      notifyEl.style.borderColor = isError ? '#ef4444' : '#10b981';
      notifyEl.classList.add('visible');
      setTimeout(() => notifyEl.classList.remove('visible'), 3200);
    }
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Template backgrounds (Anatomy outline, Rehabilitation grid, Workout route)
  const templateSelect = rootContainer.querySelector('#template-select');
  if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const overlay = rootContainer.querySelector('#canvas-template-overlay');
      if (overlay) {
        overlay.className = `template-overlay template-${val}`;
      }
    });
  }

  updateUI();
  return engine;
}

// Auto mount if in browser environment
if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-health-vitality-canvas]');
  if (root) {
    mountWhiteboardApp(root);
  }
}
