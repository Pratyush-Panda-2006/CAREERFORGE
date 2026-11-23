/**
 * Travel Odyssey - Collaborative Freehand Vector Sketchpad & Whiteboard Canvas
 * Modular vector drawing engine with stroke smoothing, waypoint routing, and SVG/JSON serialization.
 * Part of CareerForge Travel Odyssey Showcase (NSoC '26)
 */

export class TravelOdysseyWhiteboardCanvas {
  /**
   * Travel Odyssey thematic color palette presets
   */
  static PALETTE = Object.freeze({
    sunsetOrange: '#f97316',
    azureOcean: '#0284c7',
    amber: '#f59e0b',
    forestGreen: '#10b981',
    warmSand: '#fef3c7',
    midnightNavy: '#0b132b',
    mistWhite: '#f8fafc',
  });

  /**
   * Supported whiteboard tools
   */
  static TOOLS = Object.freeze({
    PEN: 'pen',
    ERASER: 'eraser',
    ROUTE: 'route',
    WAYPOINT: 'waypoint',
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
  });

  #tool = 'pen';
  #color = TravelOdysseyWhiteboardCanvas.PALETTE.sunsetOrange;
  #strokeWidth = 4;
  #opacity = 1.0;
  #maxHistory = 50;
  #interpolateDistance = 8;
  #minDistance = 2;
  #smoothing = true;
  #smoothingTension = 0.5;
  #backgroundColor = TravelOdysseyWhiteboardCanvas.PALETTE.midnightNavy;
  #showGrid = true;

  #strokes = [];
  #redoStack = [];
  #currentStroke = null;
  #listeners = new Map();
  #waypointCounter = 1;

  /**
   * @param {Object} [options={}] Configuration options
   */
  constructor(options = {}) {
    if (options.tool) this.setTool(options.tool);
    if (options.color) this.setColor(options.color);
    if (options.strokeWidth !== undefined) this.setStrokeWidth(options.strokeWidth);
    if (options.opacity !== undefined) this.setOpacity(options.opacity);
    if (options.maxHistory !== undefined) this.setMaxHistory(options.maxHistory);
    if (options.interpolateDistance !== undefined) this.#interpolateDistance = Math.max(0, Number(options.interpolateDistance) || 0);
    if (options.minDistance !== undefined) this.#minDistance = Math.max(0, Number(options.minDistance) || 0);
    if (options.smoothing !== undefined) this.#smoothing = Boolean(options.smoothing);
    if (options.smoothingTension !== undefined) this.#smoothingTension = Number(options.smoothingTension) || 0.5;
    if (options.backgroundColor !== undefined) this.#backgroundColor = options.backgroundColor;
    if (options.showGrid !== undefined) this.#showGrid = Boolean(options.showGrid);

    this.width = Number(options.width) || 1200;
    this.height = Number(options.height) || 800;

    this.canvas = null;
    this.ctx = null;

    if (options.canvas) {
      this.attachCanvas(options.canvas);
    }
  }

  // --- Getters & Setters ---

  get tool() { return this.#tool; }
  get color() { return this.#color; }
  get strokeWidth() { return this.#strokeWidth; }
  get opacity() { return this.#opacity; }
  get maxHistory() { return this.#maxHistory; }
  get interpolateDistance() { return this.#interpolateDistance; }
  get minDistance() { return this.#minDistance; }
  get smoothing() { return this.#smoothing; }
  get backgroundColor() { return this.#backgroundColor; }
  get showGrid() { return this.#showGrid; }

  get strokes() { return this.#strokes.map((s) => this.#cloneStroke(s)); }
  get redoStack() { return this.#redoStack.map((s) => this.#cloneStroke(s)); }
  get currentStroke() { return this.#currentStroke ? this.#cloneStroke(this.#currentStroke) : null; }
  get canUndo() { return this.#strokes.length > 0; }
  get canRedo() { return this.#redoStack.length > 0; }

  set backgroundColor(val) {
    this.#backgroundColor = val;
    this.render();
  }

  set showGrid(val) {
    this.#showGrid = Boolean(val);
    this.render();
  }

  /**
   * Set current drawing tool
   * @param {string} tool - 'pen' | 'eraser' | 'route' | 'waypoint' | 'rectangle' | 'circle'
   */
  setTool(tool) {
    const normalized = TravelOdysseyWhiteboardCanvas.normalizeTool(tool);
    if (this.#tool !== normalized) {
      const prev = this.#tool;
      this.#tool = normalized;
      this.emit('tool:change', { previous: prev, current: normalized });
    }
    return this;
  }

  /**
   * Set brush stroke color
   * @param {string} color - CSS color string
   */
  setColor(color) {
    if (typeof color !== 'string' || !color.trim()) {
      throw new TypeError('Color must be a valid non-empty string.');
    }
    const prev = this.#color;
    this.#color = color.trim();
    this.emit('color:change', { previous: prev, current: this.#color });
    return this;
  }

  /**
   * Set stroke width in pixels (clamped between 1 and 50)
   * @param {number} width
   */
  setStrokeWidth(width) {
    const num = Number(width);
    if (Number.isNaN(num)) throw new TypeError('Stroke width must be a valid number.');
    const clamped = Math.max(1, Math.min(50, Math.round(num)));
    if (this.#strokeWidth !== clamped) {
      const prev = this.#strokeWidth;
      this.#strokeWidth = clamped;
      this.emit('strokeWidth:change', { previous: prev, current: clamped });
    }
    return this;
  }

  /**
   * Set brush opacity (clamped between 0.05 and 1.0)
   * @param {number} opacity
   */
  setOpacity(opacity) {
    const num = Number(opacity);
    if (Number.isNaN(num)) throw new TypeError('Opacity must be a valid number.');
    const clamped = Math.max(0.05, Math.min(1.0, Math.round(num * 100) / 100));
    if (this.#opacity !== clamped) {
      const prev = this.#opacity;
      this.#opacity = clamped;
      this.emit('opacity:change', { previous: prev, current: clamped });
    }
    return this;
  }

  /**
   * Set maximum history limit for undo stack
   * @param {number} limit
   */
  setMaxHistory(limit) {
    const num = Number(limit);
    if (Number.isNaN(num) || num < 1) throw new RangeError('Max history must be at least 1.');
    this.#maxHistory = Math.floor(num);
    if (this.#strokes.length > this.#maxHistory) {
      this.#strokes.splice(0, this.#strokes.length - this.#maxHistory);
    }
    return this;
  }

  // --- Normalization Helpers ---

  static normalizeTool(name) {
    if (typeof name !== 'string') {
      throw new TypeError('Tool must be a string.');
    }
    const clean = name.trim().toLowerCase().replace(/[-_]/g, '');
    switch (clean) {
      case 'pen':
        return TravelOdysseyWhiteboardCanvas.TOOLS.PEN;
      case 'eraser':
        return TravelOdysseyWhiteboardCanvas.TOOLS.ERASER;
      case 'route':
      case 'routeline':
        return TravelOdysseyWhiteboardCanvas.TOOLS.ROUTE;
      case 'waypoint':
      case 'waypointmarker':
        return TravelOdysseyWhiteboardCanvas.TOOLS.WAYPOINT;
      case 'rectangle':
      case 'georectangle':
        return TravelOdysseyWhiteboardCanvas.TOOLS.RECTANGLE;
      case 'circle':
      case 'areacircle':
        return TravelOdysseyWhiteboardCanvas.TOOLS.CIRCLE;
      default:
        throw new Error(
          `Unsupported tool "${name}". Valid tools: pen, eraser, route, waypoint, rectangle, circle.`
        );
    }
  }

  // --- Point Interpolation & Smoothing Algorithms ---

  /**
   * Interpolate intermediate points between p1 and p2 when spacing exceeds maxDistance
   * @param {{x: number, y: number}} p1
   * @param {{x: number, y: number}} p2
   * @param {number} maxDistance
   * @returns {Array<{x: number, y: number}>} Array of interpolated points (excluding p1, including p2)
   */
  interpolatePoints(p1, p2, maxDistance = this.#interpolateDistance) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    if (maxDistance <= 0 || dist <= maxDistance) {
      return [{ x: p2.x, y: p2.y }];
    }

    const steps = Math.ceil(dist / maxDistance);
    const result = [];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      result.push({
        x: Math.round((p1.x + dx * t) * 100) / 100,
        y: Math.round((p1.y + dy * t) * 100) / 100,
      });
    }
    return result;
  }

  /**
   * Converts a sequence of 2D points into smooth cubic Bezier curve segments using Catmull-Rom splines
   * @param {Array<{x: number, y: number}>} points
   * @param {number} [tension=0.5] Spline tension parameter
   * @returns {Array<{p0: {x:number, y:number}, cp1: {x:number, y:number}, cp2: {x:number, y:number}, p1: {x:number, y:number}}>}
   */
  catmullRomToBezier(points, tension = this.#smoothingTension) {
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }

    const n = points.length;
    if (n === 2) {
      const p0 = points[0];
      const p1 = points[1];
      return [{
        p0,
        cp1: { x: p0.x + (p1.x - p0.x) / 3, y: p0.y + (p1.y - p0.y) / 3 },
        cp2: { x: p1.x - (p1.x - p0.x) / 3, y: p1.y - (p1.y - p0.y) / 3 },
        p1,
      }];
    }

    const segments = [];
    const k = tension / 3;

    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < n - 2 ? points[i + 2] : p2;

      const cp1 = {
        x: Math.round((p1.x + (p2.x - p0.x) * k) * 100) / 100,
        y: Math.round((p1.y + (p2.y - p0.y) * k) * 100) / 100,
      };

      const cp2 = {
        x: Math.round((p2.x - (p3.x - p1.x) * k) * 100) / 100,
        y: Math.round((p2.y - (p3.y - p1.y) * k) * 100) / 100,
      };

      segments.push({ p0: p1, cp1, cp2, p1: p2 });
    }

    return segments;
  }

  /**
   * Generates a valid SVG path data string (`d="..."`) from points with optional smoothing
   * @param {Array<{x: number, y: number}>} points
   * @param {Object} [options={}]
   * @returns {string} SVG path d attribute string
   */
  pointsToSvgPath(points, options = {}) {
    if (!Array.isArray(points) || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} l 0.01 0.01`;
    }

    const smoothing = options.smoothing !== undefined ? options.smoothing : this.#smoothing;
    const tension = options.tension !== undefined ? options.tension : this.#smoothingTension;

    if (!smoothing || points.length < 3) {
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
      return d;
    }

    const segments = this.catmullRomToBezier(points, tension);
    let d = `M ${points[0].x} ${points[0].y}`;
    for (const seg of segments) {
      d += ` C ${seg.cp1.x} ${seg.cp1.y}, ${seg.cp2.x} ${seg.cp2.y}, ${seg.p1.x} ${seg.p1.y}`;
    }
    return d;
  }

  // --- Vector Stroke Lifecycle ---

  /**
   * Start a new vector stroke
   * @param {number} x
   * @param {number} y
   * @param {Object} [options={}]
   * @returns {Object} Active stroke
   */
  startStroke(x, y, options = {}) {
    const px = Math.round(Number(x) * 100) / 100;
    const py = Math.round(Number(y) * 100) / 100;

    const tool = options.tool ? TravelOdysseyWhiteboardCanvas.normalizeTool(options.tool) : this.#tool;
    const color = options.color || this.#color;
    const strokeWidth = options.strokeWidth !== undefined ? Number(options.strokeWidth) : this.#strokeWidth;
    const opacity = options.opacity !== undefined ? Number(options.opacity) : this.#opacity;

    let waypointLabel = null;
    if (tool === TravelOdysseyWhiteboardCanvas.TOOLS.WAYPOINT) {
      waypointLabel = options.label || `Waypoint ${this.#waypointCounter++}`;
    }

    this.#currentStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tool,
      color,
      strokeWidth,
      opacity,
      smoothing: this.#smoothing,
      points: [{ x: px, y: py }],
      startPoint: { x: px, y: py },
      endPoint: { x: px, y: py },
      label: waypointLabel,
      timestamp: Date.now(),
    };

    this.emit('stroke:start', this.currentStroke);
    this.render();
    return this.currentStroke;
  }

  /**
   * Add a point to the active stroke with distance interpolation
   * @param {number} x
   * @param {number} y
   * @returns {Object|null}
   */
  addPoint(x, y) {
    if (!this.#currentStroke) return null;

    const px = Math.round(Number(x) * 100) / 100;
    const py = Math.round(Number(y) * 100) / 100;

    const stroke = this.#currentStroke;
    stroke.endPoint = { x: px, y: py };

    const isFreehand =
      stroke.tool === TravelOdysseyWhiteboardCanvas.TOOLS.PEN ||
      stroke.tool === TravelOdysseyWhiteboardCanvas.TOOLS.ERASER ||
      stroke.tool === TravelOdysseyWhiteboardCanvas.TOOLS.ROUTE;

    if (isFreehand) {
      const lastPoint = stroke.points[stroke.points.length - 1];
      const dist = Math.hypot(px - lastPoint.x, py - lastPoint.y);

      if (dist >= this.#minDistance) {
        const interpolated = this.interpolatePoints(lastPoint, { x: px, y: py }, this.#interpolateDistance);
        stroke.points.push(...interpolated);
      }
    } else {
      // Shape tools: update endPoint
      stroke.points = [stroke.startPoint, stroke.endPoint];
    }

    this.emit('stroke:point', { stroke: this.currentStroke, point: { x: px, y: py } });
    this.render();
    return this.currentStroke;
  }

  /**
   * End the current stroke and commit to stroke list
   * @returns {Object|null} Committed stroke
   */
  endStroke() {
    if (!this.#currentStroke) return null;

    const stroke = this.#currentStroke;
    this.#currentStroke = null;

    // Prune identical points
    if (stroke.points.length > 1) {
      const cleaned = [stroke.points[0]];
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        const prev = cleaned[cleaned.length - 1];
        if (p.x !== prev.x || p.y !== prev.y) {
          cleaned.push(p);
        }
      }
      stroke.points = cleaned;
    }

    this.#strokes.push(stroke);

    // Enforce history boundary limit
    if (this.#strokes.length > this.#maxHistory) {
      this.#strokes.splice(0, this.#strokes.length - this.#maxHistory);
    }

    // New action invalidates redo stack
    this.#redoStack = [];

    this.emit('stroke:end', this.#cloneStroke(stroke));
    this.emit('change', { action: 'add', stroke: this.#cloneStroke(stroke) });
    this.render();
    return this.#cloneStroke(stroke);
  }

  // --- History Stack Operations ---

  /**
   * Undo latest stroke
   * @returns {Object|null} Undone stroke or null if empty
   */
  undo() {
    if (this.#strokes.length === 0) return null;

    const stroke = this.#strokes.pop();
    this.#redoStack.push(stroke);

    this.emit('undo', this.#cloneStroke(stroke));
    this.emit('change', { action: 'undo', stroke: this.#cloneStroke(stroke) });
    this.render();
    return this.#cloneStroke(stroke);
  }

  /**
   * Redo previously undone stroke
   * @returns {Object|null} Redone stroke or null if empty
   */
  redo() {
    if (this.#redoStack.length === 0) return null;

    const stroke = this.#redoStack.pop();
    this.#strokes.push(stroke);

    // Enforce history boundary limit
    if (this.#strokes.length > this.#maxHistory) {
      this.#strokes.splice(0, this.#strokes.length - this.#maxHistory);
    }

    this.emit('redo', this.#cloneStroke(stroke));
    this.emit('change', { action: 'redo', stroke: this.#cloneStroke(stroke) });
    this.render();
    return this.#cloneStroke(stroke);
  }

  /**
   * Clear all strokes from the canvas
   * @returns {this}
   */
  clear() {
    if (this.#strokes.length === 0 && this.#redoStack.length === 0 && !this.#currentStroke) {
      return this;
    }

    const previous = this.strokes;
    this.#strokes = [];
    this.#redoStack = [];
    this.#currentStroke = null;
    this.#waypointCounter = 1;

    this.emit('clear', previous);
    this.emit('change', { action: 'clear', previousCount: previous.length });
    this.render();
    return this;
  }

  // --- Rendering Pipeline ---

  /**
   * Render a single vector stroke to a canvas 2D context
   * @param {Object} [stroke]
   * @param {CanvasRenderingContext2D} [ctx]
   */
  renderStroke(stroke = this.#currentStroke, ctx = this.ctx) {
    if (!stroke || !ctx) return;

    ctx.save();

    switch (stroke.tool) {
      case TravelOdysseyWhiteboardCanvas.TOOLS.PEN: {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = stroke.opacity;

        if (stroke.points.length <= 1) {
          const pt = stroke.points[0] || stroke.startPoint;
          ctx.fillStyle = stroke.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, stroke.strokeWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (stroke.smoothing && stroke.points.length >= 3) {
          const segments = this.catmullRomToBezier(stroke.points, this.#smoothingTension);
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (const seg of segments) {
            ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.p1.x, seg.p1.y);
          }
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        }
        break;
      }

      case TravelOdysseyWhiteboardCanvas.TOOLS.ERASER: {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = stroke.strokeWidth * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.points.length <= 1) {
          const pt = stroke.points[0] || stroke.startPoint;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (stroke.strokeWidth * 1.5) / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        }
        break;
      }

      case TravelOdysseyWhiteboardCanvas.TOOLS.ROUTE: {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = stroke.opacity;
        ctx.setLineDash([stroke.strokeWidth * 2.5, stroke.strokeWidth * 1.5]);

        if (stroke.points.length <= 1) {
          const pt = stroke.points[0] || stroke.startPoint;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, stroke.strokeWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (stroke.smoothing && stroke.points.length >= 3) {
          const segments = this.catmullRomToBezier(stroke.points, this.#smoothingTension);
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (const seg of segments) {
            ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.p1.x, seg.p1.y);
          }
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        }

        // Draw destination anchor nodes
        ctx.setLineDash([]);
        if (stroke.points.length > 0) {
          const pStart = stroke.points[0];
          const pEnd = stroke.points[stroke.points.length - 1];

          // Origin waypoint marker
          ctx.fillStyle = stroke.color;
          ctx.beginPath();
          ctx.arc(pStart.x, pStart.y, Math.max(stroke.strokeWidth * 0.9, 4), 0, Math.PI * 2);
          ctx.fill();

          // Destination waypoint marker (ring + center dot)
          ctx.beginPath();
          ctx.arc(pEnd.x, pEnd.y, Math.max(stroke.strokeWidth * 1.4, 6), 0, Math.PI * 2);
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pEnd.x, pEnd.y, Math.max(stroke.strokeWidth * 0.7, 3), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case TravelOdysseyWhiteboardCanvas.TOOLS.WAYPOINT: {
        const pt = stroke.startPoint || stroke.points[0];
        const r = Math.max(stroke.strokeWidth * 2.5, 12);

        // Outer beacon ring
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = stroke.opacity * 0.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        // Pin body
        ctx.fillStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Label badge
        if (stroke.label) {
          ctx.font = 'bold 12px "Outfit", system-ui, sans-serif';
          const textMetrics = ctx.measureText(stroke.label);
          const badgeWidth = textMetrics.width + 12;
          const badgeHeight = 20;
          const badgeX = pt.x - badgeWidth / 2;
          const badgeY = pt.y + r + 6;

          ctx.fillStyle = 'rgba(11, 19, 43, 0.85)';
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4) : ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(stroke.label, pt.x, badgeY + badgeHeight / 2);
        }
        break;
      }

      case TravelOdysseyWhiteboardCanvas.TOOLS.RECTANGLE: {
        const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
        const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
        const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x);
        const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y);

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.globalAlpha = stroke.opacity;

        // Semi-transparent geo fill
        ctx.fillStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity * 0.15;
        ctx.fillRect(x, y, w, h);

        ctx.globalAlpha = stroke.opacity;
        ctx.strokeRect(x, y, w, h);
        break;
      }

      case TravelOdysseyWhiteboardCanvas.TOOLS.CIRCLE: {
        const dx = stroke.endPoint.x - stroke.startPoint.x;
        const dy = stroke.endPoint.y - stroke.startPoint.y;
        const radius = Math.hypot(dx, dy);

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.strokeWidth;
        ctx.globalAlpha = stroke.opacity;

        // Semi-transparent perimeter fill
        ctx.fillStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity * 0.15;
        ctx.beginPath();
        ctx.arc(stroke.startPoint.x, stroke.startPoint.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = stroke.opacity;
        ctx.stroke();
        break;
      }

      default:
        break;
    }

    ctx.restore();
  }

  /**
   * Render subtle travel coordinate grid
   * @param {CanvasRenderingContext2D} ctx
   */
  renderGrid(ctx = this.ctx) {
    if (!this.#showGrid || !ctx) return;

    ctx.save();
    const step = 40;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x <= this.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Redraw all committed and active strokes
   * @returns {this}
   */
  render() {
    if (!this.ctx || !this.canvas) return this;

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    ctx.scale(dpr, dpr);

    if (this.#backgroundColor) {
      ctx.fillStyle = this.#backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    this.renderGrid(ctx);

    for (const stroke of this.#strokes) {
      this.renderStroke(stroke, ctx);
    }

    if (this.#currentStroke) {
      this.renderStroke(this.#currentStroke, ctx);
    }

    ctx.restore();
    return this;
  }

  // --- Serialization & Export ---

  /**
   * Serializes all strokes into valid SVG markup string
   * @param {Object} [options={}]
   * @param {boolean} [options.includeBackground=true]
   * @returns {string} SVG XML markup string
   */
  exportSVG(options = {}) {
    const includeBg = options.includeBackground !== false;
    const w = this.width;
    const h = this.height;

    const elements = [];

    if (includeBg && this.#backgroundColor) {
      elements.push(
        `  <rect width="100%" height="100%" fill="${this.#escapeXml(this.#backgroundColor)}" />`
      );
    }

    if (this.#showGrid && options.includeGrid) {
      elements.push('  <g class="whiteboard-grid" stroke="rgba(56,189,248,0.1)" stroke-width="0.5">');
      for (let x = 0; x <= w; x += 40) elements.push(`    <line x1="${x}" y1="0" x2="${x}" y2="${h}" />`);
      for (let y = 0; y <= h; y += 40) elements.push(`    <line x1="0" y1="${y}" x2="${w}" y2="${y}" />`);
      elements.push('  </g>');
    }

    for (const stroke of this.#strokes) {
      const color = this.#escapeXml(stroke.color);
      const width = stroke.strokeWidth;
      const opacity = stroke.opacity;

      switch (stroke.tool) {
        case TravelOdysseyWhiteboardCanvas.TOOLS.PEN: {
          const d = this.pointsToSvgPath(stroke.points, { smoothing: stroke.smoothing });
          if (d) {
            elements.push(
              `  <path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />`
            );
          }
          break;
        }

        case TravelOdysseyWhiteboardCanvas.TOOLS.ERASER: {
          const d = this.pointsToSvgPath(stroke.points, { smoothing: false });
          if (d) {
            const eraserColor = this.#escapeXml(this.#backgroundColor || '#0b132b');
            elements.push(
              `  <path d="${d}" fill="none" stroke="${eraserColor}" stroke-width="${width * 1.5}" stroke-linecap="round" stroke-linejoin="round" />`
            );
          }
          break;
        }

        case TravelOdysseyWhiteboardCanvas.TOOLS.ROUTE: {
          const d = this.pointsToSvgPath(stroke.points, { smoothing: stroke.smoothing });
          const dash = `${width * 2.5},${width * 1.5}`;
          if (d) {
            elements.push(
              `  <path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />`
            );
          }
          if (stroke.points.length > 0) {
            const p0 = stroke.points[0];
            const pn = stroke.points[stroke.points.length - 1];
            elements.push(
              `  <circle cx="${p0.x}" cy="${p0.y}" r="${Math.max(width * 0.9, 4)}" fill="${color}" opacity="${opacity}" />`
            );
            elements.push(
              `  <circle cx="${pn.x}" cy="${pn.y}" r="${Math.max(width * 1.4, 6)}" fill="none" stroke="${color}" stroke-width="2" opacity="${opacity}" />`
            );
            elements.push(
              `  <circle cx="${pn.x}" cy="${pn.y}" r="${Math.max(width * 0.7, 3)}" fill="${color}" opacity="${opacity}" />`
            );
          }
          break;
        }

        case TravelOdysseyWhiteboardCanvas.TOOLS.WAYPOINT: {
          const pt = stroke.startPoint || stroke.points[0];
          const r = Math.max(width * 2.5, 12);
          elements.push(`  <g class="waypoint-node" transform="translate(${pt.x}, ${pt.y})">`);
          elements.push(`    <circle r="${r * 1.5}" fill="none" stroke="${color}" stroke-width="2" opacity="${opacity * 0.4}" />`);
          elements.push(`    <circle r="${r}" fill="${color}" opacity="${opacity}" />`);
          elements.push(`    <circle r="${r * 0.35}" fill="#ffffff" />`);
          if (stroke.label) {
            elements.push(
              `    <text y="${r + 18}" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="12" font-weight="bold" fill="#ffffff">${this.#escapeXml(stroke.label)}</text>`
            );
          }
          elements.push('  </g>');
          break;
        }

        case TravelOdysseyWhiteboardCanvas.TOOLS.RECTANGLE: {
          const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
          const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
          const wRect = Math.abs(stroke.endPoint.x - stroke.startPoint.x);
          const hRect = Math.abs(stroke.endPoint.y - stroke.startPoint.y);
          elements.push(
            `  <rect x="${x}" y="${y}" width="${wRect}" height="${hRect}" fill="${color}" fill-opacity="${opacity * 0.15}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" />`
          );
          break;
        }

        case TravelOdysseyWhiteboardCanvas.TOOLS.CIRCLE: {
          const dx = stroke.endPoint.x - stroke.startPoint.x;
          const dy = stroke.endPoint.y - stroke.startPoint.y;
          const radius = Math.round(Math.hypot(dx, dy) * 100) / 100;
          elements.push(
            `  <circle cx="${stroke.startPoint.x}" cy="${stroke.startPoint.y}" r="${radius}" fill="${color}" fill-opacity="${opacity * 0.15}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" />`
          );
          break;
        }

        default:
          break;
      }
    }

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
      ...elements,
      '</svg>',
    ].join('\n');
  }

  /**
   * Serializes whiteboard vector stroke array to JSON string
   * @param {number|boolean} [indent=0]
   * @returns {string} JSON string
   */
  exportJSON(indent = 0) {
    const payload = {
      version: 1,
      appName: 'TravelOdysseyWhiteboardCanvas',
      width: this.width,
      height: this.height,
      backgroundColor: this.#backgroundColor,
      strokes: this.strokes,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload, null, indent ? 2 : 0);
  }

  /**
   * Restores canvas strokes from JSON string, object or stroke array
   * @param {string|Object|Array} data
   * @returns {this}
   */
  loadJSON(data) {
    let parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch (err) {
        throw new TypeError(`Failed to parse whiteboard JSON: ${err.message}`);
      }
    }

    let loadedStrokes = [];
    if (Array.isArray(parsed)) {
      loadedStrokes = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.strokes)) {
        loadedStrokes = parsed.strokes;
      }
      if (parsed.width) this.width = Number(parsed.width) || this.width;
      if (parsed.height) this.height = Number(parsed.height) || this.height;
      if (parsed.backgroundColor) this.#backgroundColor = parsed.backgroundColor;
    } else {
      throw new TypeError('Whiteboard data must be an array of strokes or an object containing strokes.');
    }

    // Validate and sanitize strokes
    this.#strokes = loadedStrokes.map((s, idx) => ({
      id: s.id || `stroke-loaded-${idx}`,
      tool: s.tool ? TravelOdysseyWhiteboardCanvas.normalizeTool(s.tool) : 'pen',
      color: typeof s.color === 'string' ? s.color : this.#color,
      strokeWidth: Number(s.strokeWidth) || this.#strokeWidth,
      opacity: Number(s.opacity) || this.#opacity,
      smoothing: s.smoothing !== undefined ? Boolean(s.smoothing) : this.#smoothing,
      points: Array.isArray(s.points) ? s.points.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : [],
      startPoint: s.startPoint ? { x: Number(s.startPoint.x) || 0, y: Number(s.startPoint.y) || 0 } : (s.points && s.points[0] ? s.points[0] : { x: 0, y: 0 }),
      endPoint: s.endPoint ? { x: Number(s.endPoint.x) || 0, y: Number(s.endPoint.y) || 0 } : (s.points && s.points[s.points.length - 1] ? s.points[s.points.length - 1] : { x: 0, y: 0 }),
      label: s.label || null,
      timestamp: s.timestamp || Date.now(),
    }));

    // Cap at max history
    if (this.#strokes.length > this.#maxHistory) {
      this.#strokes.splice(0, this.#strokes.length - this.#maxHistory);
    }

    this.#redoStack = [];
    this.#currentStroke = null;

    this.emit('load', this.strokes);
    this.emit('change', { action: 'load', count: this.#strokes.length });
    this.render();
    return this;
  }

  // --- Event Emitter Pattern ---

  /**
   * Subscribe to an event
   * @param {string} event
   * @param {Function} listener
   * @returns {this}
   */
  on(event, listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(listener);
    return this;
  }

  /**
   * Unsubscribe from an event
   * @param {string} event
   * @param {Function} listener
   * @returns {this}
   */
  off(event, listener) {
    if (this.#listeners.has(event)) {
      this.#listeners.get(event).delete(listener);
      if (this.#listeners.get(event).size === 0) {
        this.#listeners.delete(event);
      }
    }
    return this;
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event
   * @param {...*} args
   * @returns {boolean} True if any listener was called
   */
  emit(event, ...args) {
    const listeners = this.#listeners.get(event);
    if (!listeners || listeners.size === 0) return false;
    for (const fn of [...listeners]) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`Error in whiteboard listener for "${event}":`, err);
      }
    }
    return true;
  }

  // --- DOM & Canvas Binding ---

  /**
   * Attach an HTML <canvas> element to the engine
   * @param {HTMLCanvasElement} canvas
   */
  attachCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    this.#bindPointerEvents();
    return this;
  }

  /**
   * Handle responsive high-DPI scaling
   */
  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

    const displayWidth = rect.width > 0 ? rect.width : this.width;
    const displayHeight = rect.height > 0 ? rect.height : this.height;

    this.width = displayWidth;
    this.height = displayHeight;

    this.canvas.width = Math.round(displayWidth * dpr);
    this.canvas.height = Math.round(displayHeight * dpr);

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
    this.render();
  }

  #bindPointerEvents() {
    if (!this.canvas || typeof window === 'undefined') return;

    let isDrawing = false;

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      isDrawing = true;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {}
      const { x, y } = getPos(e);
      this.startStroke(x, y);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!isDrawing) return;
      const { x, y } = getPos(e);
      this.addPoint(x, y);
    });

    const stopDrawing = (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {}
      this.endStroke();
    };

    this.canvas.addEventListener('pointerup', stopDrawing);
    this.canvas.addEventListener('pointercancel', stopDrawing);
  }

  // --- Internal Utilities ---

  #cloneStroke(stroke) {
    return {
      ...stroke,
      points: stroke.points.map((p) => ({ ...p })),
      startPoint: { ...stroke.startPoint },
      endPoint: { ...stroke.endPoint },
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

// --- Browser Auto-Mount Helper ---

export function mountWhiteboard(root) {
  if (!root) return null;

  const canvas = root.querySelector('canvas');
  if (!canvas) return null;

  const engine = new TravelOdysseyWhiteboardCanvas({
    canvas,
    width: canvas.clientWidth || 1000,
    height: canvas.clientHeight || 650,
  });

  // Tool buttons
  const toolButtons = root.querySelectorAll('[data-tool]');
  toolButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      engine.setTool(tool);
    });
  });

  engine.on('tool:change', ({ current }) => {
    toolButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tool') === current);
    });
    canvas.setAttribute('data-active-tool', current);
  });

  // Color swatches & picker
  const colorSwatches = root.querySelectorAll('[data-color]');
  colorSwatches.forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      engine.setColor(color);
      const colorInput = root.querySelector('#custom-color');
      if (colorInput) colorInput.value = color;
    });
  });

  const customColorInput = root.querySelector('#custom-color');
  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      engine.setColor(e.target.value);
    });
  }

  engine.on('color:change', ({ current }) => {
    colorSwatches.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-color') === current);
    });
    const indicator = root.querySelector('#active-color-indicator');
    if (indicator) indicator.style.backgroundColor = current;
  });

  // Stroke width slider
  const widthSlider = root.querySelector('#stroke-width-slider');
  const widthDisplay = root.querySelector('#stroke-width-val');
  if (widthSlider) {
    widthSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      engine.setStrokeWidth(val);
      if (widthDisplay) widthDisplay.textContent = `${val}px`;
    });
  }

  // Opacity slider
  const opacitySlider = root.querySelector('#opacity-slider');
  const opacityDisplay = root.querySelector('#opacity-val');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      engine.setOpacity(val);
      if (opacityDisplay) opacityDisplay.textContent = `${Math.round(val * 100)}%`;
    });
  }

  // Action buttons
  const undoBtn = root.querySelector('#btn-undo');
  const redoBtn = root.querySelector('#btn-redo');
  const clearBtn = root.querySelector('#btn-clear');
  const exportSvgBtn = root.querySelector('#btn-export-svg');
  const exportJsonBtn = root.querySelector('#btn-export-json');
  const downloadPngBtn = root.querySelector('#btn-download-png');
  const loadJsonInput = root.querySelector('#input-load-json');

  if (undoBtn) undoBtn.addEventListener('click', () => engine.undo());
  if (redoBtn) redoBtn.addEventListener('click', () => engine.redo());
  if (clearBtn) clearBtn.addEventListener('click', () => engine.clear());

  const updateHistoryState = () => {
    if (undoBtn) undoBtn.disabled = !engine.canUndo;
    if (redoBtn) redoBtn.disabled = !engine.canRedo;
    const strokeCountBadge = root.querySelector('#stroke-count-badge');
    if (strokeCountBadge) strokeCountBadge.textContent = `${engine.strokes.length} strokes`;
  };

  engine.on('change', updateHistoryState);
  updateHistoryState();

  // Export SVG download
  if (exportSvgBtn) {
    exportSvgBtn.addEventListener('click', () => {
      const svg = engine.exportSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travel-odyssey-itinerary-${Date.now()}.svg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  // Export JSON download
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      const json = engine.exportJSON(2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travel-odyssey-sketch-${Date.now()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  // Download PNG
  if (downloadPngBtn && canvas) {
    downloadPngBtn.addEventListener('click', () => {
      try {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `travel-odyssey-whiteboard-${Date.now()}.png`;
        a.click();
      } catch (err) {
        console.error('PNG export error:', err);
      }
    });
  }

  // Load JSON file upload
  if (loadJsonInput) {
    loadJsonInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            engine.loadJSON(evt.target.result);
          } catch (err) {
            alert(`Could not load itinerary JSON: ${err.message}`);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        engine.redo();
      } else {
        e.preventDefault();
        engine.undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      engine.redo();
    }
  });

  // Responsive resize
  window.addEventListener('resize', () => {
    engine.resizeCanvas();
  });

  return engine;
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-travel-odyssey-whiteboard]');
  if (root) {
    mountWhiteboard(root);
  }
}
