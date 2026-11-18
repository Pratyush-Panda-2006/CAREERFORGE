/**
 * Legal Smart Contracts - Collaborative Freehand Vector Sketchpad & Whiteboard Canvas
 * Issue #2171 - NSoC '26 Level 3 Feature
 */

export class LegalSmartContractsWhiteboardCanvas {
  constructor(options = {}) {
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.activeTool = options.tool || 'pen'; // 'pen' | 'eraser' | 'line' | 'rectangle'
    this.activeColor = options.color || '#38bdf8';
    this.strokeWidth = options.strokeWidth || 3;
    this.strokes = [];
    this.maxHistory = options.maxHistory || 100;
    this.currentStroke = null;
  }

  setTool(tool) {
    const validTools = ['pen', 'eraser', 'line', 'rectangle'];
    if (validTools.includes(tool)) {
      this.activeTool = tool;
    }
    return this.activeTool;
  }

  setColor(color) {
    if (typeof color === 'string') {
      this.activeColor = color;
    }
    return this.activeColor;
  }

  setStrokeWidth(width) {
    const w = Number(width);
    if (!isNaN(w) && w > 0) {
      this.strokeWidth = Math.min(50, Math.max(1, w));
    }
    return this.strokeWidth;
  }

  beginStroke(tool = this.activeTool, color = this.activeColor, width = this.strokeWidth) {
    this.currentStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tool,
      color: tool === 'eraser' ? '#0f172a' : color,
      width,
      points: []
    };
    return this.currentStroke;
  }

  addPoint(x, y) {
    if (!this.currentStroke) {
      this.beginStroke();
    }

    const pt = { x: Math.round(Number(x)), y: Math.round(Number(y)) };

    // Point distance interpolation
    if (this.currentStroke.points.length > 0) {
      const last = this.currentStroke.points[this.currentStroke.points.length - 1];
      const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
      pt.distanceFromPrev = Number(dist.toFixed(2));
    } else {
      pt.distanceFromPrev = 0;
    }

    this.currentStroke.points.push(pt);
    return pt;
  }

  endStroke() {
    if (!this.currentStroke || this.currentStroke.points.length === 0) {
      this.currentStroke = null;
      return null;
    }

    const finalized = this.currentStroke;
    this.strokes.push(finalized);
    if (this.strokes.length > this.maxHistory) {
      this.strokes.shift();
    }
    this.currentStroke = null;
    return finalized;
  }

  clear() {
    this.strokes = [];
    this.currentStroke = null;
    return true;
  }

  renderStroke(ctx, stroke) {
    if (!ctx || !stroke || !stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineWidth = stroke.width;
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'line' && stroke.points.length >= 2) {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (stroke.tool === 'rectangle' && stroke.points.length >= 2) {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      ctx.beginPath();
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  exportSVG() {
    const paths = this.strokes.map(st => {
      if (!st.points || st.points.length === 0) return '';

      if (st.tool === 'line' && st.points.length >= 2) {
        const start = st.points[0];
        const end = st.points[st.points.length - 1];
        return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${st.color}" stroke-width="${st.width}" stroke-linecap="round" />`;
      }

      if (st.tool === 'rectangle' && st.points.length >= 2) {
        const start = st.points[0];
        const end = st.points[st.points.length - 1];
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x);
        const h = Math.abs(end.y - start.y);
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${st.color}" stroke-width="${st.width}" />`;
      }

      const d = st.points.reduce((acc, pt, idx) => {
        return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
      }, '');
      return `<path d="${d}" fill="none" stroke="${st.color}" stroke-width="${st.width}" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
  ${paths}
</svg>`;
  }

  getStrokes() {
    return [...this.strokes];
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvasEl = document.getElementById('whiteboardCanvas');
    if (!canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    const board = new LegalSmartContractsWhiteboardCanvas({
      width: canvasEl.width,
      height: canvasEl.height
    });

    let isDrawing = false;

    function redrawAll() {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
      board.getStrokes().forEach(st => board.renderStroke(ctx, st));
      if (board.currentStroke) {
        board.renderStroke(ctx, board.currentStroke);
      }
    }

    canvasEl.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      board.beginStroke();
      board.addPoint(x, y);
      redrawAll();
    });

    canvasEl.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      board.addPoint(x, y);
      redrawAll();
    });

    const stopDrawing = () => {
      if (isDrawing) {
        isDrawing = false;
        board.endStroke();
        redrawAll();
      }
    };

    canvasEl.addEventListener('mouseup', stopDrawing);
    canvasEl.addEventListener('mouseleave', stopDrawing);

    document.querySelectorAll('[data-wb-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-wb-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        board.setTool(btn.getAttribute('data-wb-tool'));
      });
    });

    document.querySelectorAll('[data-wb-color]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('[data-wb-color]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        board.setColor(chip.getAttribute('data-wb-color'));
      });
    });

    document.getElementById('btnClearCanvas')?.addEventListener('click', () => {
      board.clear();
      redrawAll();
    });

    document.getElementById('btnExportSVG')?.addEventListener('click', () => {
      const svg = board.exportSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legal-whiteboard-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });

    redrawAll();
  });
}
