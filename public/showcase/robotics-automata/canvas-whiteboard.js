/**
 * Robotics Automata - Vector Whiteboard & Freehand Sketchpad Canvas
 * Responsive stroke smoothing, undo/redo stacks, brush customization, SVG export.
 */

export class RoboticsAutomataWhiteboardCanvas {
  constructor(options = {}) {
    this.canvasId = options.canvasId || 'cwCanvas';
    this.strokeColor = options.strokeColor || '#000000';
    this.strokeWidth = options.strokeWidth || 4;
    this.tool = options.tool || 'pen';
    this.maxHistory = options.maxHistory || 100;
    this.smoothing = options.smoothing !== undefined ? options.smoothing : 0.4;
    this.history = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.lastPoint = null;
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
  }

  init(canvas) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    this.ctx = ctx;
    this.resize();
    this._drawBase();
    return this;
  }

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this._redraw();
  }

  _drawBase() {
    if (!this.ctx) return;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _redraw() {
    if (!this.ctx) return;
    this._drawBase();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    for (const stroke of this.history) {
      this._drawStroke(stroke);
    }
    if (this.currentStroke) {
      this._drawStroke(this.currentStroke, true);
    }
  }

  _drawStroke(stroke, temp = false) {
    if (!this.ctx || !stroke.points || stroke.points.length < 1) return;
    this.ctx.save();
    this.ctx.strokeStyle = stroke.color || this.strokeColor;
    this.ctx.lineWidth = stroke.width || this.strokeWidth;
    this.ctx.globalAlpha = temp ? 0.6 : 1;
    const pts = stroke.points;
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      const prev = pts[i - 1];
      const cpX = (prev.x + p.x) / 2;
      const cpY = (prev.y + p.y) / 2;
      this.ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
    }
    if (pts.length === 1) {
      this.ctx.lineTo(pts[0].x + 0.01, pts[0].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  _smoothPoint(prev, curr, t) {
    if (!prev) return curr;
    return {
      x: prev.x + (curr.x - prev.x) * t,
      y: prev.y + (curr.y - prev.y) * t
    };
  }

  _distance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  addPoint(x, y, final = false) {
    const pt = { x, y, t: Date.now() };
    if (!this.currentStroke) {
      this.currentStroke = { points: [], color: this.strokeColor, width: this.strokeWidth, tool: this.tool };
    }
    let smoothed = pt;
    if (this.lastPoint) {
      smoothed = this._smoothPoint(this.lastPoint, pt, this.smoothing);
    }
    this.currentStroke.points.push(smoothed);
    this.lastPoint = pt;
    if (final) {
      this.history.push(this.currentStroke);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      this.redoStack = [];
      this.currentStroke = null;
      this.lastPoint = null;
    }
    this._redraw();
    return smoothed;
  }

  startStroke(x, y) {
    this.isDrawing = true;
    this.lastPoint = null;
    this.addPoint(x, y);
  }

  continueStroke(x, y) {
    if (!this.isDrawing) return;
    this.addPoint(x, y);
  }

  endStroke() {
    if (!this.isDrawing) return;
    this.addPoint(0, 0, true);
    this.isDrawing = false;
  }

  clear() {
    this.history = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.lastPoint = null;
    this._redraw();
  }

  undo() {
    if (this.history.length === 0) return null;
    const last = this.history.pop();
    this.redoStack.push(last);
    this._redraw();
    return last;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const last = this.redoStack.pop();
    this.history.push(last);
    this._redraw();
    return last;
  }

  exportSVG() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const w = this.canvas ? this.canvas.width / dpr : 800;
    const h = this.canvas ? this.canvas.height / dpr : 600;
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
      `<rect width="100%" height="100%" fill="#ffffff"/>`];
    for (const stroke of this.history) {
      if (!stroke.points || stroke.points.length < 1) continue;
      const pts = stroke.points;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const p = pts[i];
        const cpX = (prev.x + p.x) / 2;
        const cpY = (prev.y + p.y) / 2;
        d += ` Q ${prev.x} ${prev.y} ${cpX} ${cpY}`;
      }
      parts.push(`<path d="${d}" fill="none" stroke="${stroke.color || this.strokeColor}" stroke-width="${stroke.width || this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    parts.push('</svg>');
    return parts.join('\n');
  }

  downloadSVG(filename = 'whiteboard.svg') {
    const svg = this.exportSVG();
    if (!svg) return false;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  getHistory() {
    return this.history.map(s => ({ ...s, points: [...s.points] }));
  }

  setTool(tool) {
    this.tool = tool;
  }

  setColor(color) {
    this.strokeColor = color;
  }

  setWidth(width) {
    this.strokeWidth = Number(width);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('cwCanvas');
    const whiteboard = new RoboticsAutomataWhiteboardCanvas();
    whiteboard.init(canvas);

    const statusEl = document.getElementById('cwStatus');
    const widthInput = document.getElementById('cwWidth');
    const widthVal = document.getElementById('cwWidthVal');

    let activeToolBtn = document.querySelector('.cw-tool-btn.active');
    let activeColorChip = document.querySelector('.cw-color-chip.active');

    function setTool(btn) {
      if (activeToolBtn) activeToolBtn.classList.remove('active');
      activeToolBtn = btn;
      btn.classList.add('active');
      whiteboard.setTool(btn.dataset.tool);
      if (statusEl) statusEl.textContent = `Tool: ${btn.dataset.tool}`;
    }

    function setColor(btn) {
      if (activeColorChip) activeColorChip.classList.remove('active');
      activeColorChip = btn;
      btn.classList.add('active');
      whiteboard.setColor(btn.dataset.color);
    }

    document.querySelectorAll('.cw-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => setTool(btn));
    });

    document.querySelectorAll('.cw-color-chip').forEach(btn => {
      btn.addEventListener('click', () => setColor(btn));
    });

    if (widthInput) {
      widthInput.addEventListener('input', () => {
        whiteboard.setWidth(widthInput.value);
        if (widthVal) widthVal.textContent = widthInput.value;
      });
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1);
      return { x, y };
    }

    function onStart(e) {
      e.preventDefault();
      const { x, y } = getPos(e.touches ? e.touches[0] : e);
      whiteboard.startStroke(x, y);
      canvas.classList.add('drawing');
    }

    function onMove(e) {
      if (!whiteboard.isDrawing) return;
      e.preventDefault();
      const { x, y } = getPos(e.touches ? e.touches[0] : e);
      whiteboard.continueStroke(x, y);
    }

    function onEnd() {
      whiteboard.endStroke();
      canvas.classList.remove('drawing');
    }

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);

    document.getElementById('cwUndo')?.addEventListener('click', () => {
      whiteboard.undo();
      if (statusEl) statusEl.textContent = 'Undo';
    });
    document.getElementById('cwRedo')?.addEventListener('click', () => {
      whiteboard.redo();
      if (statusEl) statusEl.textContent = 'Redo';
    });
    document.getElementById('cwClear')?.addEventListener('click', () => {
      whiteboard.clear();
      if (statusEl) statusEl.textContent = 'Cleared';
    });
    document.getElementById('cwExport')?.addEventListener('click', () => {
      const ok = whiteboard.downloadSVG();
      if (statusEl) statusEl.textContent = ok ? 'SVG exported' : 'Export failed';
    });

    window.addEventListener('resize', () => whiteboard.resize());
  });
}
