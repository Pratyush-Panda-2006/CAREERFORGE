/**
 * LuxuryRealmsWhiteboardCanvas
 * Collaborative freehand vector sketchpad & whiteboard canvas.
 */
export class LuxuryRealmsWhiteboardCanvas {
  constructor(canvasElement = null, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.width = options.width || (canvasElement ? canvasElement.clientWidth : 800);
    this.height = options.height || (canvasElement ? canvasElement.clientHeight : 600);

    this.currentTool = 'pen'; // 'pen', 'line', 'rectangle', 'eraser'
    this.currentColor = '#D4AF37';
    this.brushWidth = 4;
    this.isDrawing = false;
    this.maxHistory = options.maxHistory || 50;

    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;

    if (this.canvas) {
      this.initCanvas();
      this.bindEvents();
    }
  }

  initCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 800, height: 600 };
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.render();
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setColor(color) {
    this.currentColor = color;
  }

  setBrushWidth(width) {
    this.brushWidth = Math.max(1, Math.min(100, width));
  }

  startStroke(x, y) {
    this.isDrawing = true;
    this.currentStroke = {
      tool: this.currentTool,
      color: this.currentTool === 'eraser' ? '#0b0c10' : this.currentColor,
      width: this.brushWidth,
      points: [{ x, y }]
    };
    this.renderStroke(this.currentStroke);
  }

  addPoint(x, y) {
    if (!this.isDrawing || !this.currentStroke) return;

    const points = this.currentStroke.points;
    const lastPoint = points[points.length - 1];

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
      // Stroke smoothing interpolation
      if (dist > 3) {
        const midX = (lastPoint.x + x) / 2;
        const midY = (lastPoint.y + y) / 2;
        points.push({ x: midX, y: midY });
        points.push({ x, y });
      }
    } else {
      // For shapes (line, rectangle), points[1] tracks endpoint
      points[1] = { x, y };
    }

    this.render();
  }

  endStroke() {
    if (!this.isDrawing || !this.currentStroke) return;
    this.isDrawing = false;

    this.strokes.push(this.currentStroke);
    if (this.strokes.length > this.maxHistory) {
      this.strokes.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
    this.currentStroke = null;
    this.render();
  }

  undo() {
    if (this.strokes.length === 0) return false;
    const stroke = this.strokes.pop();
    this.redoStack.push(stroke);
    this.render();
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const stroke = this.redoStack.pop();
    this.strokes.push(stroke);
    this.render();
    return true;
  }

  clear() {
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.render();
  }

  renderStroke(stroke, targetCtx = this.ctx) {
    if (!targetCtx || !stroke || !stroke.points || stroke.points.length === 0) return;

    targetCtx.save();
    targetCtx.strokeStyle = stroke.color;
    targetCtx.lineWidth = stroke.width;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    const pts = stroke.points;

    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      targetCtx.beginPath();
      targetCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        targetCtx.lineTo(pts[i].x, pts[i].y);
      }
      targetCtx.stroke();
    } else if (stroke.tool === 'line') {
      const end = pts[1] || pts[0];
      targetCtx.beginPath();
      targetCtx.moveTo(pts[0].x, pts[0].y);
      targetCtx.lineTo(end.x, end.y);
      targetCtx.stroke();
    } else if (stroke.tool === 'rectangle') {
      const end = pts[1] || pts[0];
      targetCtx.strokeRect(pts[0].x, pts[0].y, end.x - pts[0].x, end.y - pts[0].y);
    }

    targetCtx.restore();
  }

  render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const stroke of this.strokes) {
      this.renderStroke(stroke);
    }

    if (this.currentStroke) {
      this.renderStroke(this.currentStroke);
    }
  }

  bindEvents() {
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

    const onStart = (e) => {
      const pos = getPos(e);
      this.startStroke(pos.x, pos.y);
    };

    const onMove = (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.addPoint(pos.x, pos.y);
    };

    const onEnd = () => {
      this.endStroke();
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onStart(e);
    }, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }

  exportSVG() {
    const width = this.width || 800;
    const height = this.height || 600;

    let elements = '';
    for (const stroke of this.strokes) {
      const pts = stroke.points;
      if (!pts || pts.length === 0) continue;

      if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 1; i < pts.length; i++) {
          d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
        }
        elements += `  <path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />\n`;
      } else if (stroke.tool === 'line') {
        const end = pts[1] || pts[0];
        elements += `  <line x1="${pts[0].x.toFixed(1)}" y1="${pts[0].y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" />\n`;
      } else if (stroke.tool === 'rectangle') {
        const end = pts[1] || pts[0];
        const x = Math.min(pts[0].x, end.x);
        const y = Math.min(pts[0].y, end.y);
        const w = Math.abs(end.x - pts[0].x);
        const h = Math.abs(end.y - pts[0].y);
        elements += `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" />\n`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${elements}</svg>`;
  }
}
