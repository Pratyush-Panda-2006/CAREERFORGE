/**
 * Fitness Crossfit Pro - Collaborative Freehand Vector Sketchpad & Whiteboard Canvas
 * Issue #2156 - NSoC '26 Level 3 Feature
 */

export class FitnessCrossfitProWhiteboardCanvas {
  constructor(options = {}) {
    this.width = options.width || 800;
    this.height = options.height || 500;
    this.currentColor = options.color || '#ef4444';
    this.currentWidth = options.strokeWidth || 3;
    this.currentTool = options.tool || 'pen'; // 'pen', 'eraser', 'line'

    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.maxHistory = options.maxHistory || 50;
  }

  static calculateDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Number(Math.sqrt(dx * dx + dy * dy).toFixed(2));
  }

  startStroke(x, y, options = {}) {
    const color = this.currentTool === 'eraser' ? '#0f172a' : (options.color || this.currentColor);
    const width = this.currentTool === 'eraser' ? 20 : (options.width || this.currentWidth);

    this.currentStroke = {
      tool: this.currentTool,
      color,
      width,
      points: [{ x: Number(x), y: Number(y) }]
    };
    return this.currentStroke;
  }

  addPoint(x, y) {
    if (!this.currentStroke) return null;
    const pt = { x: Number(x), y: Number(y) };
    const last = this.currentStroke.points[this.currentStroke.points.length - 1];

    // Filter points with minimal movement
    if (!last || FitnessCrossfitProWhiteboardCanvas.calculateDistance(last, pt) >= 1.5) {
      this.currentStroke.points.push(pt);
    }
    return pt;
  }

  endStroke() {
    if (!this.currentStroke) return null;
    const finished = this.currentStroke;
    this.strokes.push(finished);
    this.currentStroke = null;
    this.redoStack = []; // Clear redo stack on new action

    if (this.strokes.length > this.maxHistory) {
      this.strokes.shift();
    }
    return finished;
  }

  undo() {
    if (this.strokes.length === 0) return false;
    const popped = this.strokes.pop();
    this.redoStack.push(popped);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const restored = this.redoStack.pop();
    this.strokes.push(restored);
    return true;
  }

  clear() {
    if (this.strokes.length > 0) {
      this.redoStack = [...this.strokes];
      this.strokes = [];
      return true;
    }
    return false;
  }

  renderStroke(stroke, ctx) {
    if (!ctx || !stroke || !stroke.points || stroke.points.length === 0) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  exportSVG() {
    const paths = this.strokes.map(s => {
      if (!s.points || s.points.length === 0) return '';
      const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      return `<path d="${d}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
  <rect width="100%" height="100%" fill="#0f172a" />
  ${paths}
</svg>`;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboardCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const board = new FitnessCrossfitProWhiteboardCanvas({ width: canvas.width, height: canvas.height });

    let isDrawing = false;

    function redraw() {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      board.strokes.forEach(s => board.renderStroke(s, ctx));
      if (board.currentStroke) {
        board.renderStroke(board.currentStroke, ctx);
      }
    }

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      isDrawing = true;
      board.startStroke(x, y);
      redraw();
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      board.addPoint(x, y);
      redraw();
    });

    window.addEventListener('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        board.endStroke();
        redraw();
      }
    });

    // Tool Controls
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        board.currentTool = btn.getAttribute('data-tool');
      });
    });

    document.querySelectorAll('.color-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        board.currentColor = chip.getAttribute('data-color');
      });
    });

    document.getElementById('undoBtn')?.addEventListener('click', () => {
      board.undo();
      redraw();
    });

    document.getElementById('redoBtn')?.addEventListener('click', () => {
      board.redo();
      redraw();
    });

    document.getElementById('clearBtn')?.addEventListener('click', () => {
      board.clear();
      redraw();
    });

    document.getElementById('exportSvgBtn')?.addEventListener('click', () => {
      const svg = board.exportSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crossfit-whiteboard-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });

    redraw();
  });
}
