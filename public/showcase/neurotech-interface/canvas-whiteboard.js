/**
 * Neurotech Interface - Collaborative Freehand Vector Sketchpad
 * Supports responsive stroke smoothing, undo/redo stacks, brush
 * color/width customization, and vector SVG export.
 */

const DEFAULT_COLOR = '#38bdf8';
const DEFAULT_WIDTH = 4;
const MAX_HISTORY = 50;

const COLOR_CHIPS = [
  '#38bdf8', '#34d399', '#fbbf24', '#f87171',
  '#a78bfa', '#fb923c', '#c4b5fd', '#ffffff'
];

export class NeurotechInterfaceWhiteboardCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.color = DEFAULT_COLOR;
    this.width = DEFAULT_WIDTH;
    this.tool = 'pen';
    this.history = [];      // undo stack of serialized strokes
    this.redoStack = [];    // redo stack
    this.currentStroke = []; // points of the stroke being drawn
    this.isDrawing = false;
    this.lastPoint = null;
  }

  // Interpolate intermediate points for smooth stroke rendering
  addPoint(x, y) {
    const point = { x, y, t: Date.now() };
    this.currentStroke.push(point);

    if (this.currentStroke.length >= 2) {
      this.renderStroke(this.currentStroke);
    }
    return point;
  }

  // Distance between two points
  static distance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  // Render a stroke with Catmull-Rom style smoothing via quadratic curves
  renderStroke(points) {
    if (points.length < 2) return;

    const ctx = this.ctx;
    if (!ctx || typeof ctx.beginPath !== 'function') return;

    ctx.save();
    ctx.strokeStyle = this.tool === 'eraser' ? '#030712' : this.color;
    ctx.lineWidth = this.tool === 'eraser' ? Math.max(this.width * 1.5, 12) : this.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = this.tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Smooth using quadratic curve through midpoints of consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
    }
    // Finish at last point
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    ctx.restore();
  }

  beginStroke(x, y) {
    this.isDrawing = true;
    this.currentStroke = [{ x, y, t: Date.now() }];
    this.redoStack = [];
  }

  continueStroke(x, y) {
    if (!this.isDrawing) return;
    this.addPoint(x, y);
  }

  endStroke() {
    if (!this.isDrawing || this.currentStroke.length === 0) {
      this.isDrawing = false;
      return;
    }
    this.history.push([...this.currentStroke]);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    this.currentStroke = [];
    this.isDrawing = false;
  }

  clear() {
    const ctx = this.ctx;
    if (ctx && typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.history = [];
    this.redoStack = [];
    this.currentStroke = [];
  }

  undo() {
    if (this.history.length === 0) return;
    const lastStroke = this.history.pop();
    this.redoStack.push(lastStroke);
    this.redrawAll();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const stroke = this.redoStack.pop();
    this.history.push(stroke);
    this.redrawAll();
  }

  redrawAll() {
    const ctx = this.ctx;
    if (!ctx || typeof ctx.clearRect !== 'function') return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const stroke of this.history) {
      this.renderStroke(stroke);
    }
  }

  setColor(color) {
    this.color = color;
  }

  setWidth(width) {
    this.width = Number(width);
  }

  setTool(tool) {
    this.tool = tool;
  }

  // Serialize all strokes into an SVG document string
  exportSVG() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const lines = [];

    for (const stroke of this.history) {
      if (stroke.length < 2) continue;
      let d = `M ${stroke[0].x} ${stroke[0].y}`;
      for (let i = 0; i < stroke.length - 1; i++) {
        const p0 = stroke[i];
        const p1 = stroke[i + 1];
        const mx = (p0.x + p1.x) / 2;
        const my = (p0.y + p1.y) / 2;
        d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`;
      }
      const last = stroke[stroke.length - 1];
      d += ` L ${last.x} ${last.y}`;
      lines.push(`<path d="${d}" stroke="${this.tool === 'eraser' ? '#030712' : this.color}" stroke-width="${this.tool === 'eraser' ? this.width * 1.5 : this.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#030712"/>
  ${lines.join('\n  ')}
</svg>`;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvasEl = document.getElementById('whiteboardCanvas');
    const statusEl = document.getElementById('canvasStatus');
    const colorPicker = document.getElementById('colorPicker');
    const widthSlider = document.getElementById('widthSlider');
    const widthVal = document.getElementById('widthVal');
    const colorChipsEl = document.getElementById('colorChips');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportBtn = document.getElementById('exportBtn');
    const toolBtns = document.querySelectorAll('.tool-btn');

    const whiteboard = new NeurotechInterfaceWhiteboardCanvas(canvasEl);

    // Render color chips
    COLOR_CHIPS.forEach((c) => {
      const chip = document.createElement('button');
      chip.className = `color-chip${c === DEFAULT_COLOR ? ' active' : ''}`;
      chip.style.backgroundColor = c;
      chip.setAttribute('aria-label', `Color ${c}`);
      chip.addEventListener('click', () => {
        document.querySelectorAll('.color-chip').forEach((ch) => ch.classList.remove('active'));
        chip.classList.add('active');
        colorPicker.value = c;
        whiteboard.setColor(c);
      });
      colorChipsEl.appendChild(chip);
    });

    colorPicker.addEventListener('input', (e) => {
      document.querySelectorAll('.color-chip').forEach((ch) => ch.classList.remove('active'));
      whiteboard.setColor(e.target.value);
    });

    widthSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      widthVal.textContent = `${val}px`;
      whiteboard.setWidth(val);
    });

    toolBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        toolBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        whiteboard.setTool(btn.getAttribute('data-tool'));
      });
    });

    // Pointer events for drawing
    const getPos = (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = canvasEl.width / rect.width;
      const scaleY = canvasEl.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const start = (e) => {
      const pos = getPos(e);
      whiteboard.beginStroke(pos.x, pos.y);
      statusEl.textContent = 'Drawing &bull; Freehand stroke active';
    };
    const move = (e) => {
      if (!whiteboard.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      whiteboard.continueStroke(pos.x, pos.y);
    };
    const end = () => {
      whiteboard.endStroke();
      statusEl.textContent = 'Stroke complete &bull; Undo/redo available';
    };

    canvasEl.addEventListener('pointerdown', start);
    canvasEl.addEventListener('pointermove', move);
    canvasEl.addEventListener('pointerup', end);
    canvasEl.addEventListener('pointercancel', end);
    canvasEl.addEventListener('touchstart', (e) => { start(e); }, { passive: false });
    canvasEl.addEventListener('touchmove', (e) => { move(e); }, { passive: false });
    canvasEl.addEventListener('touchend', end);

    undoBtn.addEventListener('click', () => { whiteboard.undo(); statusEl.textContent = 'Undo applied'; });
    redoBtn.addEventListener('click', () => { whiteboard.redo(); statusEl.textContent = 'Redo applied'; });
    clearBtn.addEventListener('click', () => { whiteboard.clear(); statusEl.textContent = 'Canvas cleared'; });
    exportBtn.addEventListener('click', () => {
      const svg = whiteboard.exportSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'neurotech-whiteboard.svg';
      a.click();
      URL.revokeObjectURL(url);
      statusEl.textContent = 'SVG exported';
    });
  });
}
