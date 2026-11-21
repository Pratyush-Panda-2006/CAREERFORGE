/**
 * Renewable Microgrid - Collaborative Freehand Vector Sketchpad & Whiteboard Canvas
 * Issue #2131 - NSoC '26 Level 3 Feature
 */

export class RenewableMicrogridWhiteboardCanvas {
  constructor(options = {}) {
    this.width = options.width || 900;
    this.height = options.height || 520;
    this.currentColor = options.color || '#10b981';
    this.currentWidth = options.strokeWidth || 3;
    this.currentTool = options.tool || 'pen';

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
    const color = this.currentTool === 'eraser' ? '#090d16' : (options.color || this.currentColor);
    const width = this.currentTool === 'eraser' ? 24 : (options.width || this.currentWidth);

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

    if (!last || RenewableMicrogridWhiteboardCanvas.calculateDistance(last, pt) >= 1.5) {
      this.currentStroke.points.push(pt);
    }
    return pt;
  }

  endStroke() {
    if (!this.currentStroke) return null;
    const finished = this.currentStroke;
    this.strokes.push(finished);
    this.currentStroke = null;
    this.redoStack = [];

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

  redrawAll(ctx) {
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    for (const s of this.strokes) {
      this.renderStroke(s, ctx);
    }
    if (this.currentStroke) {
      this.renderStroke(this.currentStroke, ctx);
    }
  }

  exportSVG() {
    let pathElements = '';
    for (const stroke of this.strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      let d = `M ${stroke.points[0].x} ${stroke.points[0].y}`;
      for (let i = 1; i < stroke.points.length; i++) {
        d += ` L ${stroke.points[i].x} ${stroke.points[i].y}`;
      }
      pathElements += `  <path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">\n  <rect width="100%" height="100%" fill="#090d16" />\n${pathElements}</svg>`;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboardCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const board = new RenewableMicrogridWhiteboardCanvas({
      width: canvas.width,
      height: canvas.height
    });

    let isDrawing = false;

    function getCoords(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const { x, y } = getCoords(e);
      board.startStroke(x, y);
      board.redrawAll(ctx);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const { x, y } = getCoords(e);
      board.addPoint(x, y);
      board.redrawAll(ctx);
    });

    window.addEventListener('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        board.endStroke();
        board.redrawAll(ctx);
      }
    });

    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        board.currentTool = btn.dataset.tool;
      });
    });

    document.querySelectorAll('.color-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        board.currentColor = chip.dataset.color;
        board.currentTool = 'pen';
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        document.querySelector('.tool-btn[data-tool="pen"]')?.classList.add('active');
      });
    });

    document.getElementById('undoBtn')?.addEventListener('click', () => {
      board.undo();
      board.redrawAll(ctx);
    });

    document.getElementById('redoBtn')?.addEventListener('click', () => {
      board.redo();
      board.redrawAll(ctx);
    });

    document.getElementById('clearBtn')?.addEventListener('click', () => {
      board.clear();
      board.redrawAll(ctx);
    });

    document.getElementById('exportSvgBtn')?.addEventListener('click', () => {
      const svg = board.exportSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'renewable-microgrid-whiteboard.svg';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
}
