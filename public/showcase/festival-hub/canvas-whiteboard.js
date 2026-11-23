/**
 * Festival Hub Whiteboard Canvas
 * In-browser vector whiteboard and freehand sketching module.
 * Supports responsive stroke smoothing, undo/redo stacks, brush color/width customization, and vector SVG export.
 */

export class FestivalHubWhiteboardCanvas {
  constructor(canvasElement = null, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement && typeof canvasElement.getContext === 'function' ? canvasElement.getContext('2d') : null;
    this.width = options.width || (canvasElement ? canvasElement.width : 800) || 800;
    this.height = options.height || (canvasElement ? canvasElement.height : 600) || 600;

    this.currentTool = options.tool || 'pen'; // 'pen', 'eraser', 'line', 'rectangle'
    this.strokeColor = options.strokeColor || '#ff4081';
    this.strokeWidth = options.strokeWidth || 4;
    this.smoothing = options.smoothing !== undefined ? options.smoothing : true;
    this.backgroundColor = options.backgroundColor || '#12131c';

    this.strokes = []; // Completed strokes
    this.redoStack = []; // Redo history
    this.currentStroke = null;
    this.isDrawing = false;

    if (this.canvas) {
      this.initEvents();
      this.renderAll();
    }
  }

  setTool(tool) {
    const validTools = ['pen', 'eraser', 'line', 'rectangle'];
    if (validTools.includes(tool)) {
      this.currentTool = tool;
    }
  }

  setColor(color) {
    this.strokeColor = color;
  }

  setWidth(width) {
    this.strokeWidth = Math.max(1, Math.min(50, Number(width) || 1));
  }

  startStroke(x, y) {
    this.isDrawing = true;
    this.currentStroke = {
      tool: this.currentTool,
      color: this.currentTool === 'eraser' ? this.backgroundColor : this.strokeColor,
      width: this.currentTool === 'eraser' ? this.strokeWidth * 2 : this.strokeWidth,
      points: [{ x, y }]
    };
    this.redoStack = [];
    this.renderAll();
  }

  addPoint(x, y) {
    if (!this.isDrawing || !this.currentStroke) return;
    const pts = this.currentStroke.points;
    const lastPoint = pts[pts.length - 1];

    if (lastPoint) {
      const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
      if (this.smoothing && this.currentTool === 'pen' && dist < 2) {
        return; // Skip points too close for smoothing
      }
    }

    pts.push({ x, y });
    this.renderAll();
  }

  endStroke() {
    if (!this.isDrawing || !this.currentStroke) return;
    if (this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
    }
    this.currentStroke = null;
    this.isDrawing = false;
    this.renderAll();
  }

  undo() {
    if (this.strokes.length === 0) return null;
    const popped = this.strokes.pop();
    this.redoStack.push(popped);
    this.renderAll();
    return popped;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const restored = this.redoStack.pop();
    this.strokes.push(restored);
    this.renderAll();
    return restored;
  }

  clear() {
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.renderAll();
  }

  renderStroke(stroke, targetCtx = this.ctx) {
    if (!targetCtx || !stroke || !stroke.points || stroke.points.length === 0) return;

    targetCtx.save();
    targetCtx.strokeStyle = stroke.color;
    targetCtx.fillStyle = stroke.color;
    targetCtx.lineWidth = stroke.width;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    const pts = stroke.points;
    const tool = stroke.tool;

    if (tool === 'line') {
      const start = pts[0];
      const end = pts[pts.length - 1];
      targetCtx.beginPath();
      targetCtx.moveTo(start.x, start.y);
      targetCtx.lineTo(end.x, end.y);
      targetCtx.stroke();
    } else if (tool === 'rectangle') {
      const start = pts[0];
      const end = pts[pts.length - 1];
      const width = end.x - start.x;
      const height = end.y - start.y;
      targetCtx.beginPath();
      targetCtx.strokeRect(start.x, start.y, width, height);
    } else {
      // Pen or Eraser freehand
      if (pts.length === 1) {
        targetCtx.beginPath();
        targetCtx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
        targetCtx.fill();
      } else if (this.smoothing && pts.length > 2) {
        targetCtx.beginPath();
        targetCtx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          targetCtx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        targetCtx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        targetCtx.stroke();
      } else {
        targetCtx.beginPath();
        targetCtx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          targetCtx.lineTo(pts[i].x, pts[i].y);
        }
        targetCtx.stroke();
      }
    }

    targetCtx.restore();
  }

  renderAll() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const stroke of this.strokes) {
      this.renderStroke(stroke, this.ctx);
    }

    if (this.currentStroke) {
      this.renderStroke(this.currentStroke, this.ctx);
    }
  }

  interpolatePoints(p1, p2, maxDistance = 5) {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (dist <= maxDistance) return [p1, p2];

    const steps = Math.ceil(dist / maxDistance);
    const interpolated = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      interpolated.push({
        x: Number((p1.x + (p2.x - p1.x) * t).toFixed(2)),
        y: Number((p1.y + (p2.y - p1.y) * t).toFixed(2))
      });
    }
    return interpolated;
  }

  strokeToSVGElement(stroke) {
    if (!stroke || !stroke.points || stroke.points.length === 0) return '';
    const { tool, color, width, points: pts } = stroke;

    if (tool === 'line') {
      const start = pts[0];
      const end = pts[pts.length - 1];
      return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`;
    }

    if (tool === 'rectangle') {
      const start = pts[0];
      const end = pts[pts.length - 1];
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" />`;
    }

    // Pen or Eraser
    if (pts.length === 1) {
      return `<circle cx="${pts[0].x}" cy="${pts[0].y}" r="${width / 2}" fill="${color}" />`;
    }

    let d = `M ${pts[0].x} ${pts[0].y}`;
    if (this.smoothing && pts.length > 2) {
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
        const yc = ((pts[i].y + pts[i + 1].y) / 2).toFixed(1);
        d += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
      }
      d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    } else {
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x} ${pts[i].y}`;
      }
    }

    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" />`;
  }

  exportSVG() {
    const elements = this.strokes.map(s => this.strokeToSVGElement(s)).join('\n  ');
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
  <rect width="100%" height="100%" fill="${this.backgroundColor}" />
  ${elements}
</svg>`;
  }

  initEvents() {
    if (!this.canvas) return;

    const getCoords = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top) * scaleY)
      };
    };

    const handleStart = (e) => {
      e.preventDefault();
      const coords = getCoords(e);
      this.startStroke(coords.x, coords.y);
    };

    const handleMove = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const coords = getCoords(e);
      this.addPoint(coords.x, coords.y);
    };

    const handleEnd = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      this.endStroke();
    };

    this.canvas.addEventListener('mousedown', handleStart);
    this.canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    this.canvas.addEventListener('touchstart', handleStart, { passive: false });
    this.canvas.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  }
}

// Auto-mount when executed in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboardCanvas');
    if (!canvas) return;

    const whiteboard = new FestivalHubWhiteboardCanvas(canvas, {
      width: 1000,
      height: 600
    });

    // Tool switching
    const toolBtns = document.querySelectorAll('[data-tool]');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        whiteboard.setTool(btn.getAttribute('data-tool'));
      });
    });

    // Color chips
    const colorChips = document.querySelectorAll('.color-chip');
    colorChips.forEach(chip => {
      chip.addEventListener('click', () => {
        colorChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const color = chip.getAttribute('data-color');
        whiteboard.setColor(color);
        const colorPicker = document.getElementById('customColorPicker');
        if (colorPicker) colorPicker.value = color;
      });
    });

    const customColor = document.getElementById('customColorPicker');
    if (customColor) {
      customColor.addEventListener('input', (e) => {
        whiteboard.setColor(e.target.value);
        colorChips.forEach(c => c.classList.remove('active'));
      });
    }

    // Brush width slider
    const widthSlider = document.getElementById('brushWidthSlider');
    const widthVal = document.getElementById('brushWidthVal');
    if (widthSlider) {
      widthSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        whiteboard.setWidth(val);
        if (widthVal) widthVal.textContent = `${val}px`;
      });
    }

    // Actions
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', () => whiteboard.undo());

    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) redoBtn.addEventListener('click', () => whiteboard.redo());

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => whiteboard.clear());

    const exportBtn = document.getElementById('exportSvgBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const svgString = whiteboard.exportSVG();
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `festival-hub-sketch-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    window._whiteboardInstance = whiteboard;
  });
}
