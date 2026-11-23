/**
 * Automotive Hypercar - Vector Whiteboard & Freehand Sketchpad Module
 * Implements vector stroke capture, responsive smoothing, history stacks (undo/redo),
 * geometric shape construction (lines, rectangles), and SVG serialization.
 */

export class AutomotiveHypercarWhiteboardCanvas {
  /**
   * @param {Object} [options]
   * @param {number} [options.width=1200]
   * @param {number} [options.height=800]
   * @param {number} [options.maxHistory=50]
   */
  constructor(options = {}) {
    this.width = options.width || 1200;
    this.height = options.height || 800;
    this.maxHistory = options.maxHistory || 50;

    // Tool options: 'pen' | 'eraser' | 'line' | 'rectangle'
    this.currentTool = 'pen';
    this.currentColor = '#ef4444'; // Hypercar red default
    this.currentWidth = 4;

    // Stroke history
    this.strokes = [];
    this.redoStack = [];

    // Active in-progress stroke
    this.activeStroke = null;
  }

  /**
   * Set active tool
   * @param {'pen' | 'eraser' | 'line' | 'rectangle'} tool
   */
  setTool(tool) {
    const validTools = ['pen', 'eraser', 'line', 'rectangle'];
    if (validTools.includes(tool)) {
      this.currentTool = tool;
    }
  }

  /**
   * Set stroke color
   * @param {string} color
   */
  setColor(color) {
    if (typeof color === 'string' && color.trim()) {
      this.currentColor = color.trim();
    }
  }

  /**
   * Set stroke line width
   * @param {number} width
   */
  setWidth(width) {
    const parsed = Number(width);
    if (!Number.isNaN(parsed) && parsed > 0) {
      this.currentWidth = Math.max(1, Math.min(64, parsed));
    }
  }

  /**
   * Calculates Euclidean distance between two 2D points
   * @param {{x: number, y: number}} p1
   * @param {{x: number, y: number}} p2
   * @returns {number}
   */
  static distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.hypot(dx, dy);
  }

  /**
   * Interpolate intermediate points between p1 and p2 based on step distance
   * @param {{x: number, y: number}} p1
   * @param {{x: number, y: number}} p2
   * @param {number} [step=2]
   * @returns {Array<{x: number, y: number}>}
   */
  static interpolatePoints(p1, p2, step = 2) {
    const dist = AutomotiveHypercarWhiteboardCanvas.distance(p1, p2);
    if (dist <= step || step <= 0) {
      return [{ x: p2.x, y: p2.y }];
    }

    const count = Math.floor(dist / step);
    const points = [];
    for (let i = 1; i <= count; i++) {
      const t = (i * step) / dist;
      points.push({
        x: Number((p1.x + (p2.x - p1.x) * t).toFixed(2)),
        y: Number((p1.y + (p2.y - p1.y) * t).toFixed(2))
      });
    }

    // Ensure target end point is represented
    const last = points[points.length - 1];
    if (!last || last.x !== p2.x || last.y !== p2.y) {
      points.push({ x: Number(p2.x.toFixed(2)), y: Number(p2.y.toFixed(2)) });
    }

    return points;
  }

  /**
   * Smooth point list using moving average smoothing
   * @param {Array<{x: number, y: number}>} points
   * @returns {Array<{x: number, y: number}>}
   */
  static smoothPoints(points) {
    if (!points || points.length <= 2) return points ? [...points] : [];
    const smoothed = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      smoothed.push({
        x: Number(((prev.x + curr.x * 2 + next.x) / 4).toFixed(2)),
        y: Number(((prev.y + curr.y * 2 + next.y) / 4).toFixed(2))
      });
    }

    smoothed.push(points[points.length - 1]);
    return smoothed;
  }

  /**
   * Start a new stroke at (x, y)
   * @param {number} x
   * @param {number} y
   */
  startStroke(x, y) {
    const pt = { x: Number(x) || 0, y: Number(y) || 0 };
    this.activeStroke = {
      tool: this.currentTool,
      color: this.currentTool === 'eraser' ? '#0b0f19' : this.currentColor,
      width: this.currentTool === 'eraser' ? this.currentWidth * 3 : this.currentWidth,
      points: [pt],
      startPoint: { ...pt },
      endPoint: { ...pt }
    };
    return this.activeStroke;
  }

  /**
   * Add a point to the currently active stroke
   * @param {number} x
   * @param {number} y
   */
  addPoint(x, y) {
    if (!this.activeStroke) {
      return this.startStroke(x, y);
    }

    const pt = { x: Number(x) || 0, y: Number(y) || 0 };
    this.activeStroke.endPoint = pt;

    if (this.activeStroke.tool === 'pen' || this.activeStroke.tool === 'eraser') {
      const lastPt = this.activeStroke.points[this.activeStroke.points.length - 1];
      if (!lastPt || AutomotiveHypercarWhiteboardCanvas.distance(lastPt, pt) >= 1.5) {
        this.activeStroke.points.push(pt);
      }
    }
    return this.activeStroke;
  }

  /**
   * Finalize and commit active stroke to history stack
   */
  endStroke() {
    if (!this.activeStroke) return null;

    if (this.activeStroke.tool === 'pen' || this.activeStroke.tool === 'eraser') {
      if (this.activeStroke.points.length > 2) {
        this.activeStroke.points = AutomotiveHypercarWhiteboardCanvas.smoothPoints(this.activeStroke.points);
      }
    }

    const finalized = this.activeStroke;
    this.strokes.push(finalized);
    if (this.strokes.length > this.maxHistory) {
      this.strokes.shift();
    }

    // Clear redo history on new action
    this.redoStack = [];
    this.activeStroke = null;
    return finalized;
  }

  /**
   * Undo last committed stroke
   * @returns {Object|null}
   */
  undo() {
    if (this.strokes.length === 0) return null;
    const popped = this.strokes.pop();
    this.redoStack.push(popped);
    return popped;
  }

  /**
   * Redo previously undone stroke
   * @returns {Object|null}
   */
  redo() {
    if (this.redoStack.length === 0) return null;
    const item = this.redoStack.pop();
    this.strokes.push(item);
    return item;
  }

  /**
   * Clear all strokes
   */
  clear() {
    if (this.strokes.length > 0) {
      this.strokes = [];
      this.redoStack = [];
      this.activeStroke = null;
      return true;
    }
    return false;
  }

  /**
   * Render an individual stroke onto a 2D canvas context
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} stroke
   */
  renderStroke(ctx, stroke) {
    if (!ctx || !stroke) return;

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (stroke.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(stroke.startPoint.x, stroke.startPoint.y);
      ctx.lineTo(stroke.endPoint.x, stroke.endPoint.y);
      ctx.stroke();
    } else if (stroke.tool === 'rectangle') {
      const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
      const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
      const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x);
      const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y);
      ctx.beginPath();
      ctx.strokeRect(x, y, w, h);
    } else {
      // Pen or eraser freehand path
      const pts = stroke.points;
      if (!pts || pts.length === 0) {
        ctx.restore();
        return;
      }

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length; i++) {
          const midX = (pts[i - 1].x + pts[i].x) / 2;
          const midY = (pts[i - 1].y + pts[i].y) / 2;
          ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Render all history strokes and active stroke to canvas context
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);

    for (const stroke of this.strokes) {
      this.renderStroke(ctx, stroke);
    }

    if (this.activeStroke) {
      this.renderStroke(ctx, this.activeStroke);
    }
  }

  /**
   * Convert a single stroke into an SVG path or shape XML string
   * @param {Object} stroke
   * @returns {string}
   */
  strokeToSVG(stroke) {
    if (!stroke) return '';

    if (stroke.tool === 'line') {
      return `<line x1="${stroke.startPoint.x}" y1="${stroke.startPoint.y}" x2="${stroke.endPoint.x}" y2="${stroke.endPoint.y}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" />`;
    }

    if (stroke.tool === 'rectangle') {
      const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
      const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
      const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x);
      const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" />`;
    }

    const pts = stroke.points;
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) {
      return `<circle cx="${pts[0].x}" cy="${pts[0].y}" r="${stroke.width / 2}" fill="${stroke.color}" />`;
    }

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const midX = ((pts[i - 1].x + pts[i].x) / 2).toFixed(2);
      const midY = ((pts[i - 1].y + pts[i].y) / 2).toFixed(2);
      d += ` Q ${pts[i - 1].x} ${pts[i - 1].y}, ${midX} ${midY}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;

    return `<path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" />`;
  }

  /**
   * Export all strokes to vector SVG XML string
   * @returns {string}
   */
  exportSVG() {
    const elements = this.strokes
      .filter((s) => s.tool !== 'eraser') // SVG export omits erased background strokes
      .map((s) => this.strokeToSVG(s))
      .filter(Boolean)
      .join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
  <!-- Automotive Hypercar Vector Whiteboard Export -->
  <rect width="100%" height="100%" fill="#0b0f19"/>
  ${elements}
</svg>`;
  }
}

// Client-side DOM initialization when in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboardCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const whiteboard = new AutomotiveHypercarWhiteboardCanvas({
      width: canvas.width,
      height: canvas.height,
      maxHistory: 50
    });

    // Make instance accessible for debugging / testing
    window.hypercarWhiteboard = whiteboard;

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      whiteboard.width = canvas.width;
      whiteboard.height = canvas.height;
      ctx.scale(dpr, dpr);
      whiteboard.render(ctx);
    }

    // Tools UI binding
    const toolButtons = document.querySelectorAll('[data-tool]');
    toolButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toolButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        whiteboard.setTool(btn.getAttribute('data-tool'));
      });
    });

    // Color swatches binding
    const colorSwatches = document.querySelectorAll('[data-color]');
    colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.getAttribute('data-color');
        whiteboard.setColor(color);
      });
    });

    const customColorInput = document.getElementById('customColorPicker');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        colorSwatches.forEach((s) => s.classList.remove('active'));
        whiteboard.setColor(e.target.value);
      });
    }

    // Stroke width slider
    const widthSlider = document.getElementById('strokeWidthSlider');
    const widthValDisplay = document.getElementById('strokeWidthVal');
    if (widthSlider) {
      widthSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        whiteboard.setWidth(val);
        if (widthValDisplay) widthValDisplay.textContent = `${val}px`;
      });
    }

    // Action buttons: Undo, Redo, Clear, Export SVG
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        whiteboard.undo();
        whiteboard.render(ctx);
      });
    }

    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => {
        whiteboard.redo();
        whiteboard.render(ctx);
      });
    }

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear the entire hypercar sketchpad?')) {
          whiteboard.clear();
          whiteboard.render(ctx);
        }
      });
    }

    const exportBtn = document.getElementById('exportSvgBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const svgContent = whiteboard.exportSVG();
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hypercar-sketch-${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Drawing interaction handlers
    let isDrawing = false;

    function getCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function onPointerDown(e) {
      e.preventDefault();
      isDrawing = true;
      const { x, y } = getCoords(e);
      whiteboard.startStroke(x, y);
      whiteboard.render(ctx);
    }

    function onPointerMove(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const { x, y } = getCoords(e);
      whiteboard.addPoint(x, y);
      whiteboard.render(ctx);
    }

    function onPointerUp(e) {
      if (!isDrawing) return;
      e.preventDefault();
      isDrawing = false;
      whiteboard.endStroke();
      whiteboard.render(ctx);
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp, { passive: false });

    // Initial render
    whiteboard.render(ctx);
  });
}
