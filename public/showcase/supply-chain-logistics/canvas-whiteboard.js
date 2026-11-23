/**
 * Supply Chain Logistics - Collaborative Freehand Vector Sketchpad & Whiteboard Canvas
 */

export class SupplyChainLogisticsWhiteboardCanvas {
  constructor(options = {}) {
    this.width = options.width || 800;
    this.height = options.height || 500;
    this.currentColor = options.color || '#38bdf8';
    this.currentWidth = options.width || 3;
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
  }

  static calculateDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Number(Math.sqrt(dx * dx + dy * dy).toFixed(2));
  }

  startStroke(x, y, color = null) {
    this.currentStroke = {
      color: color || this.currentColor,
      width: this.currentWidth,
      points: [{ x: Number(x), y: Number(y) }]
    };
    return this.currentStroke;
  }

  addPoint(x, y) {
    if (!this.currentStroke) return null;
    const pt = { x: Number(x), y: Number(y) };
    const last = this.currentStroke.points[this.currentStroke.points.length - 1];
    if (!last || SupplyChainLogisticsWhiteboardCanvas.calculateDistance(last, pt) >= 1.5) {
      this.currentStroke.points.push(pt);
    }
    return pt;
  }

  endStroke() {
    if (!this.currentStroke) return null;
    this.strokes.push(this.currentStroke);
    const finished = this.currentStroke;
    this.currentStroke = null;
    this.redoStack = [];
    return finished;
  }

  undo() {
    if (this.strokes.length === 0) return null;
    const item = this.strokes.pop();
    this.redoStack.push(item);
    return item;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const item = this.redoStack.pop();
    this.strokes.push(item);
    return item;
  }
}
