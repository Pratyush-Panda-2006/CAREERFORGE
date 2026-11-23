/**
 * AerospaceOrbiterWhiteboardCanvas
 * Collaborative freehand vector sketchpad & whiteboard canvas for Aerospace Orbiter.
 * Supports responsive stroke smoothing, stroke undo/redo stacks,
 * brush color/width customization, vector shapes (line, rectangle, circle), and vector SVG export.
 */

export class AerospaceOrbiterWhiteboardCanvas {
  /**
   * @param {HTMLCanvasElement|null} canvas
   * @param {Object} options
   */
  constructor(canvas = null, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.maxHistory = options.maxHistory || 50;
    this.smoothingFactor = options.smoothingFactor ?? 0.25;

    // Tool state
    this.currentTool = options.tool || 'pen'; // 'pen', 'eraser', 'line', 'rectangle', 'circle'
    this.currentColor = options.color || '#38bdf8';
    this.currentWidth = options.width || 3;

    // Drawing state
    this.isDrawing = false;
    this.currentStroke = null;

    // History stacks
    this.strokes = [];
    this.redoStack = [];

    // Background color for canvas & eraser
    this.backgroundColor = options.backgroundColor || '#090a0f';

    if (this.canvas) {
      this.initEvents();
      this.resize();
    }
  }

  /**
   * Sets canvas dimensions and redraws
   */
  resize(width, height) {
    if (!this.canvas) return;
    if (width && height) {
      this.canvas.width = width;
      this.canvas.height = height;
    } else {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = (rect.width || 900) * dpr;
      this.canvas.height = (rect.height || 560) * dpr;
      if (this.ctx) {
        this.ctx.scale(dpr, dpr);
      }
    }
    this.redraw();
  }

  /**
   * Bind event listeners for drawing
   */
  initEvents() {
    if (!this.canvas) return;

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const start = (e) => {
      e.preventDefault();
      const pos = getPos(e);
      this.startStroke(pos.x, pos.y);
    };

    const move = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.addPoint(pos.x, pos.y);
      this.redraw();
    };

    const end = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      this.endStroke();
      this.redraw();
    };

    this.canvas.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    this.canvas.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: false });
  }

  /**
   * Calculate Euclidean distance between two points
   */
  calculateDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Interpolate between two points with factor t (0 to 1)
   */
  interpolatePoint(p1, p2, t = 0.5) {
    if (!p1 && !p2) return { x: 0, y: 0 };
    if (!p1) return { x: p2.x, y: p2.y };
    if (!p2) return { x: p1.x, y: p1.y };
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  }

  /**
   * Smooth a sequence of points using neighbor weighting
   */
  smoothPoints(points) {
    if (!points || points.length < 3) return points ? [...points] : [];
    const smoothed = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const smoothedPoint = {
        x: curr.x * (1 - this.smoothingFactor) + ((prev.x + next.x) / 2) * this.smoothingFactor,
        y: curr.y * (1 - this.smoothingFactor) + ((prev.y + next.y) / 2) * this.smoothingFactor
      };
      smoothed.push(smoothedPoint);
    }
    smoothed.push(points[points.length - 1]);
    return smoothed;
  }

  /**
   * Start a new stroke at (x, y)
   */
  startStroke(x, y) {
    this.isDrawing = true;
    this.redoStack = []; // Reset redo stack on new action

    this.currentStroke = {
      tool: this.currentTool,
      color: this.currentTool === 'eraser' ? this.backgroundColor : this.currentColor,
      width: this.currentTool === 'eraser' ? this.currentWidth * 3 : this.currentWidth,
      points: [{ x, y }],
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      timestamp: Date.now()
    };
  }

  /**
   * Add a coordinate point to current active stroke
   */
  addPoint(x, y) {
    if (!this.isDrawing || !this.currentStroke) return;

    if (this.currentStroke.tool === 'pen' || this.currentStroke.tool === 'eraser') {
      const pts = this.currentStroke.points;
      const lastPoint = pts[pts.length - 1];

      // Avoid adding redundant zero-distance points
      if (lastPoint && this.calculateDistance(lastPoint, { x, y }) < 1) {
        return;
      }

      pts.push({ x, y });
    } else {
      // Shape tools (line, rectangle, circle) update end coordinates
      this.currentStroke.endX = x;
      this.currentStroke.endY = y;
    }
  }

  /**
   * Finalize the active stroke and commit to stroke history
   */
  endStroke() {
    if (!this.isDrawing || !this.currentStroke) {
      this.isDrawing = false;
      return null;
    }

    if (this.currentStroke.tool === 'pen' || this.currentStroke.tool === 'eraser') {
      if (this.currentStroke.points.length > 2) {
        this.currentStroke.points = this.smoothPoints(this.currentStroke.points);
      }
    }

    this.strokes.push(this.currentStroke);

    // Enforce history boundary limits
    if (this.strokes.length > this.maxHistory) {
      this.strokes.shift();
    }

    const completed = this.currentStroke;
    this.currentStroke = null;
    this.isDrawing = false;
    return completed;
  }

  /**
   * Undo the most recent stroke
   */
  undo() {
    if (this.strokes.length === 0) return false;
    const stroke = this.strokes.pop();
    this.redoStack.push(stroke);
    this.redraw();
    return true;
  }

  /**
   * Redo the most recently undone stroke
   */
  redo() {
    if (this.redoStack.length === 0) return false;
    const stroke = this.redoStack.pop();
    this.strokes.push(stroke);
    this.redraw();
    return true;
  }

  /**
   * Clear all committed strokes
   */
  clear() {
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.isDrawing = false;
    this.redraw();
  }

  /**
   * Render an individual stroke onto the given canvas context
   */
  renderStroke(ctx = this.ctx, stroke = this.currentStroke) {
    if (!ctx || !stroke) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      const pts = stroke.points;
      if (!pts || pts.length === 0) {
        ctx.restore();
        return;
      }

      ctx.beginPath();
      if (pts.length === 1) {
        ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
    } else if (stroke.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(stroke.startX, stroke.startY);
      ctx.lineTo(stroke.endX, stroke.endY);
      ctx.stroke();
    } else if (stroke.tool === 'rectangle') {
      const x = Math.min(stroke.startX, stroke.endX);
      const y = Math.min(stroke.startY, stroke.endY);
      const w = Math.abs(stroke.endX - stroke.startX);
      const h = Math.abs(stroke.endY - stroke.startY);
      ctx.beginPath();
      ctx.strokeRect(x, y, w, h);
    } else if (stroke.tool === 'circle') {
      const radius = this.calculateDistance(
        { x: stroke.startX, y: stroke.startY },
        { x: stroke.endX, y: stroke.endY }
      );
      ctx.beginPath();
      ctx.arc(stroke.startX, stroke.startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Redraw all committed strokes and active stroke
   */
  redraw() {
    if (!this.ctx || !this.canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Draw orbital telemetry grid
    this.drawGrid(this.ctx, width, height);

    for (const stroke of this.strokes) {
      this.renderStroke(this.ctx, stroke);
    }

    if (this.currentStroke) {
      this.renderStroke(this.ctx, this.currentStroke);
    }
  }

  /**
   * Draw subtle aerospace orbital grid lines
   */
  drawGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Serialize a stroke to an SVG element string
   */
  strokeToSVG(stroke) {
    if (!stroke) return '';

    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      const pts = stroke.points;
      if (!pts || pts.length === 0) return '';
      if (pts.length === 1) {
        return `<circle cx="${pts[0].x.toFixed(2)}" cy="${pts[0].y.toFixed(2)}" r="${(stroke.width / 2).toFixed(2)}" fill="${stroke.color}" />`;
      }

      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
      }
      return `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`;
    }

    if (stroke.tool === 'line') {
      return `<line x1="${stroke.startX.toFixed(2)}" y1="${stroke.startY.toFixed(2)}" x2="${stroke.endX.toFixed(2)}" y2="${stroke.endY.toFixed(2)}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" />`;
    }

    if (stroke.tool === 'rectangle') {
      const x = Math.min(stroke.startX, stroke.endX);
      const y = Math.min(stroke.startY, stroke.endY);
      const w = Math.abs(stroke.endX - stroke.startX);
      const h = Math.abs(stroke.endY - stroke.startY);
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" rx="2" />`;
    }

    if (stroke.tool === 'circle') {
      const radius = this.calculateDistance(
        { x: stroke.startX, y: stroke.startY },
        { x: stroke.endX, y: stroke.endY }
      );
      return `<circle cx="${stroke.startX.toFixed(2)}" cy="${stroke.startY.toFixed(2)}" r="${radius.toFixed(2)}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" />`;
    }

    return '';
  }

  /**
   * Export all strokes as an SVG markup string
   */
  exportSVG(width = 900, height = 560) {
    const canvasWidth = this.canvas ? this.canvas.width / (window.devicePixelRatio || 1) : width;
    const canvasHeight = this.canvas ? this.canvas.height / (window.devicePixelRatio || 1) : height;

    const svgElements = this.strokes
      .map(stroke => this.strokeToSVG(stroke))
      .filter(Boolean)
      .join('\n    ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
    <rect width="100%" height="100%" fill="${this.backgroundColor}" />
    ${svgElements}
</svg>`;
  }

  /**
   * Trigger download of SVG file in browser
   */
  downloadSVG(filename = 'aerospace-orbiter-whiteboard.svg') {
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

  /**
   * Metrics and telemetry for diagnostics
   */
  getMetrics() {
    return {
      totalStrokes: this.strokes.length,
      redoAvailable: this.redoStack.length,
      currentTool: this.currentTool,
      currentColor: this.currentColor,
      currentWidth: this.currentWidth
    };
  }
}
