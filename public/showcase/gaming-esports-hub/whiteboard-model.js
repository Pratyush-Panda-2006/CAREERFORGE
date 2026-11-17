export const WIDTH = 900;
export const HEIGHT = 520;
export const clamp = (n, max) => Math.min(max, Math.max(0, n));
export const toBoardPoint = (x, y, rect) => ({
  x: clamp((x - rect.left) * WIDTH / rect.width, WIDTH),
  y: clamp((y - rect.top) * HEIGHT / rect.height, HEIGHT),
});

function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = dx || dy ? Math.min(1, Math.max(0, ((p.x-a.x)*dx + (p.y-a.y)*dy)/(dx*dx+dy*dy))) : 0;
  return Math.hypot(p.x-a.x-t*dx, p.y-a.y-t*dy);
}

export function hitTest(shapes, point) {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (shape.kind === 'marker') {
      if (Math.hypot(point.x-shape.x, point.y-shape.y) <= 23) return i;
    } else if (shape.points.length === 1) {
      if (Math.hypot(point.x-shape.points[0].x, point.y-shape.points[0].y) <= shape.width/2+8) return i;
    } else {
      for (let j = 1; j < shape.points.length; j++) {
        if (segmentDistance(point, shape.points[j-1], shape.points[j]) <= shape.width/2+8) return i;
      }
    }
  }
  return -1;
}

export class StrategyBoard {
  shapes = [];
  history = [];
  commit(next) {
    if (next.length > 200 || JSON.stringify(next) === JSON.stringify(this.shapes)) return false;
    this.history.push(structuredClone(this.shapes));
    if (this.history.length > 30) this.history.shift();
    this.shapes = structuredClone(next);
    return true;
  }
  undo() {
    if (!this.history.length) return false;
    this.shapes = this.history.pop();
    return true;
  }
}
