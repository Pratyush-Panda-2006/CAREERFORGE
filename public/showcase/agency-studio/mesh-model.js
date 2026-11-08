const STEP = 1 / 120;
export class ParticleMesh {
  constructor(width, height, rng = Math.random) { this.rng = rng; this.resize(width, height); }
  resize(width, height) {
    if (![width, height].every(value => Number.isFinite(value) && value > 0 && value <= 16384)) throw new Error('Invalid mesh dimensions.');
    this.width = width; this.height = height; this.time = 0; this.accumulator = 0;
    const count = Math.min(72, Math.max(18, Math.round(width * height / 14000)));
    const columns = Math.min(count, Math.max(2, Math.round(Math.sqrt(count * width / height))));
    const rows = Math.ceil(count / columns);
    this.nodes = Array.from({ length: count }, (_, index) => {
      const homeX = (index % columns + 0.5) / columns * width;
      const homeY = (Math.floor(index / columns) + 0.5) / rows * height;
      const random = this.rng();
      return { homeX, homeY, x: homeX, y: homeY, vx: 0, vy: 0, phase: (Number.isFinite(random) ? Math.min(1, Math.max(0, random)) : 0) * Math.PI * 2 };
    });
    this.edges = [];
    const degrees = new Array(count).fill(0);
    const candidates = [];
    for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
      const distance = Math.hypot(this.nodes[a].x - this.nodes[b].x, this.nodes[a].y - this.nodes[b].y);
      if (distance <= 190) candidates.push({ a, b, rest: distance });
    }
    candidates.sort((a, b) => a.rest - b.rest);
    for (const edge of candidates) if (degrees[edge.a] < 3 && degrees[edge.b] < 3) {
      this.edges.push(edge); degrees[edge.a]++; degrees[edge.b]++;
    }
  }
  advance(delta, pointer = null) {
    if (!Number.isFinite(delta) || delta < 0) throw new Error('Invalid mesh delta.');
    this.accumulator += Math.min(delta, 0.1);
    const cursor = pointer && [pointer.x, pointer.y, pointer.vx, pointer.vy].every(Number.isFinite) ? pointer : null;
    while (this.accumulator + 1e-12 >= STEP) {
      this.step(STEP, cursor); this.accumulator = Math.max(0, this.accumulator - STEP);
    }
  }
  step(dt, pointer) {
    this.time += dt;
    const forces = this.nodes.map(node => ({
      x: (node.homeX + Math.sin(this.time * 0.55 + node.phase) * 10 - node.x) * 5,
      y: (node.homeY + Math.cos(this.time * 0.4 + node.phase) * 8 - node.y) * 5
    }));
    for (const { a, b, rest } of this.edges) {
      const dx = this.nodes[b].x - this.nodes[a].x, dy = this.nodes[b].y - this.nodes[a].y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const strength = (distance - rest) * 1.5;
      forces[a].x += dx / distance * strength; forces[a].y += dy / distance * strength;
      forces[b].x -= dx / distance * strength; forces[b].y -= dy / distance * strength;
    }
    this.nodes.forEach((node, index) => {
      const force = forces[index];
      if (pointer) {
        const dx = node.x - pointer.x, dy = node.y - pointer.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        if (distance < 145) {
          const strength = (1 - distance / 145) * (180 + Math.min(1200, Math.hypot(pointer.vx, pointer.vy)) * 0.2);
          force.x += dx / distance * strength; force.y += dy / distance * strength;
        }
      }
      const damping = Math.exp(-3 * dt);
      node.vx = (node.vx + force.x * dt) * damping; node.vy = (node.vy + force.y * dt) * damping;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > 120) { node.vx *= 120 / speed; node.vy *= 120 / speed; }
      node.x = Math.min(this.width + 12, Math.max(-12, node.x + node.vx * dt));
      node.y = Math.min(this.height + 12, Math.max(-12, node.y + node.vy * dt));
    });
  }
}

export function canvasScale(width, height, dpr) {
  return Math.min(Math.max(0.1, Number.isFinite(dpr) ? dpr : 1), 2, Math.sqrt(2_000_000 / (width * height)));
}
