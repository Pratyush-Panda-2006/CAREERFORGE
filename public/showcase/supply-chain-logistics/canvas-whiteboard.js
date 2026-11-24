const COLORS = ['#1e3a8a', '#047857', '#b45309', '#b91c1c', '#1f2937'];
const TOOLS = ['pen', 'eraser', 'line', 'rectangle'];
const copy = (value) => structuredClone(value);

const number = (value, min, max) => {
  if (!Number.isFinite(value)) throw new TypeError('Coordinates and widths must be finite numbers.');
  return Math.max(min, Math.min(max, value));
};

const n = (value) => Math.round(value * 100) / 100;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const segmentDistance = (point, a, b) => {
  const length2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = length2 ? Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / length2)) : 0;
  return distance(point, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
};

export class SupplyChainLogisticsWhiteboardCanvas {
  #strokes = [];
  #undo = [];
  #redo = [];
  #draft = null;

  static WIDTH = 1000;
  static HEIGHT = 650;
  static HISTORY_LIMIT = 50;
  static POINT_LIMIT = 4096;

  get strokes() { return copy(this.#strokes); }
  get draft() { return copy(this.#draft); }
  get canUndo() { return this.#undo.length > 0; }
  get canRedo() { return this.#redo.length > 0; }

  beginStroke(tool = 'pen', color = COLORS[0], width = 5) {
    if (!TOOLS.includes(tool) || !COLORS.includes(color)) {
      throw new TypeError('Choose a supported tool and brush color.');
    }
    this.#draft = { tool, color, width: number(width, 1, 24), points: [] };
  }

  addPoint(x, y) {
    if (!this.#draft) throw new Error('Begin a stroke first.');
    const point = { x: number(x, 0, 1000), y: number(y, 0, 650) };
    const points = this.#draft.points;
    if (!points.length) {
      points.push(point);
      return true;
    }
    const last = points.at(-1);
    if (this.#draft.tool === 'line' || this.#draft.tool === 'rectangle') {
      points[1] = point;
      return true;
    }
    const gap = distance(last, point);
    if (gap < 1 || points.length >= SupplyChainLogisticsWhiteboardCanvas.POINT_LIMIT) {
      return false;
    }
    const steps = Math.ceil(gap / 8);
    if (points.length + steps > SupplyChainLogisticsWhiteboardCanvas.POINT_LIMIT) {
      return false;
    }
    for (let i = 1; i <= steps; i++) {
      points.push({
        x: last.x + (point.x - last.x) * i / steps,
        y: last.y + (point.y - last.y) * i / steps
      });
    }
    return true;
  }

  renderStroke(stroke = this.#draft) {
    if (!stroke?.points.length) return '';
    const points = stroke.points;
    const a = points[0];
    const b = points.at(-1);
    if (stroke.tool === 'rectangle') {
      return `M ${n(a.x)} ${n(a.y)} H ${n(b.x)} V ${n(b.y)} H ${n(a.x)} Z`;
    }
    if (stroke.tool === 'line') {
      return `M ${n(a.x)} ${n(a.y)} L ${n(b.x)} ${n(b.y)}`;
    }
    if (points.length === 1) {
      return `M ${n(a.x)} ${n(a.y)} l 0.01 0`;
    }
    const commands = [`M ${n(a.x)} ${n(a.y)}`];
    for (let i = 1; i < points.length; i++) {
      const next = points[i + 1] || points[i];
      commands.push(`Q ${n(points[i].x)} ${n(points[i].y)} ${n((points[i].x + next.x) / 2)} ${n((points[i].y + next.y) / 2)}`);
    }
    return commands.join(' ');
  }

  #commit(next) {
    this.#undo.push(this.#strokes);
    if (this.#undo.length > SupplyChainLogisticsWhiteboardCanvas.HISTORY_LIMIT) {
      this.#undo.shift();
    }
    this.#redo = [];
    this.#strokes = next;
  }

  finishStroke() {
    const stroke = this.#draft;
    this.#draft = null;
    if (!stroke?.points.length) return false;
    if (stroke.tool === 'eraser') {
      const next = this.#strokes.filter((candidate) => {
        let outline = candidate.points;
        if (candidate.tool === 'rectangle') {
          const a = outline[0], b = outline.at(-1);
          outline = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a];
        }
        const radius = stroke.width + candidate.width / 2;
        return !stroke.points.some((p) => outline.some((a, i) => segmentDistance(p, a, outline[i + 1] || a) <= radius));
      });
      if (next.length === this.#strokes.length) return false;
      this.#commit(next);
    } else {
      if (this.#strokes.length >= 500) {
        throw new RangeError('The board is full (500 strokes). Clear or erase strokes before drawing.');
      }
      this.#commit([...this.#strokes, stroke]);
    }
    return true;
  }

  cancelStroke() {
    this.#draft = null;
  }

  clear() {
    this.cancelStroke();
    if (this.#strokes.length) this.#commit([]);
  }

  undo() {
    this.cancelStroke();
    if (!this.canUndo) return false;
    this.#redo.push(this.#strokes);
    this.#strokes = this.#undo.pop();
    return true;
  }

  redo() {
    this.cancelStroke();
    if (!this.canRedo) return false;
    this.#undo.push(this.#strokes);
    this.#strokes = this.#redo.pop();
    return true;
  }

  exportSVG() {
    const paths = this.#strokes.map((stroke) =>
      `  <path d="${this.renderStroke(stroke)}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    );
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" width="1000" height="650">',
      '  <title>Supply Chain Logistics Route & Topology Sketch</title>',
      '  <rect width="1000" height="650" fill="white"/>',
      ...paths,
      '</svg>'
    ].join('\n');
  }
}

function mount(root) {
  const get = (id) => root.querySelector(`#${id}`);
  const board = new SupplyChainLogisticsWhiteboardCanvas();
  const canvas = get('board');
  const context = canvas.getContext('2d');
  const status = (text) => { get('status').textContent = text; };

  if (!context) {
    status('Drawing is unavailable in this browser. Try a modern browser with Canvas support.');
    return;
  }

  let tool = 'pen', color = COLORS[0], pointer = null, keyboardDrawing = false;
  const cursor = { x: 500, y: 325 };

  function draw() {
    context.setTransform(canvas.width / 1000, 0, 0, canvas.height / 650, 0, 0);
    context.clearRect(0, 0, 1000, 650);
    context.fillStyle = 'white';
    context.fillRect(0, 0, 1000, 650);

    for (const stroke of [...board.strokes, board.draft].filter((s) => s && s.tool !== 'eraser')) {
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.stroke(new Path2D(board.renderStroke(stroke)));
    }

    if (document.activeElement === canvas && pointer === null) {
      context.strokeStyle = '#1e293b';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(cursor.x - 12, cursor.y);
      context.lineTo(cursor.x + 12, cursor.y);
      context.moveTo(cursor.x, cursor.y - 12);
      context.lineTo(cursor.x, cursor.y + 12);
      context.stroke();
    }

    get('undo').disabled = !board.canUndo;
    get('redo').disabled = !board.canRedo;
    get('stroke-count').textContent = `${board.strokes.length} / 500 strokes`;
  }

  const resize = new ResizeObserver(() => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    draw();
  });
  resize.observe(canvas);

  function cancel() {
    board.cancelStroke();
    keyboardDrawing = false;
    if (pointer !== null && canvas.hasPointerCapture(pointer)) {
      canvas.releasePointerCapture(pointer);
    }
    pointer = null;
    draw();
  }

  function begin(x, y) {
    board.beginStroke(tool, color, Number(get('width').value));
    board.addPoint(x, y);
    draw();
  }

  function finish() {
    try {
      status(board.finishStroke() ? (tool === 'eraser' ? 'Stroke erased.' : 'Stroke added.') : 'No strokes changed.');
    } catch (error) {
      status(error.message);
    }
    draw();
  }

  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * 1000 / bounds.width,
      y: (event.clientY - bounds.top) * 650 / bounds.height
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (pointer !== null || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    cancel();
    canvas.focus({ preventScroll: true });
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    const p = point(event);
    begin(p.x, p.y);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer) return;
    for (const sample of event.getCoalescedEvents?.().length ? event.getCoalescedEvents() : [event]) {
      const p = point(sample);
      board.addPoint(p.x, p.y);
    }
    draw();
  });

  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointer) return;
    const p = point(event);
    board.addPoint(p.x, p.y);
    pointer = null;
    canvas.releasePointerCapture(event.pointerId);
    finish();
  });

  canvas.addEventListener('pointercancel', (event) => {
    if (event.pointerId === pointer) {
      cancel();
      status('Drawing canceled.');
    }
  });

  canvas.addEventListener('lostpointercapture', () => {
    if (pointer !== null) cancel();
  });

  canvas.addEventListener('focus', draw);
  canvas.addEventListener('blur', () => {
    if (keyboardDrawing) cancel();
    else draw();
  });

  canvas.addEventListener('keydown', (event) => {
    if (pointer !== null) return;
    const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (steps[event.key]) {
      event.preventDefault();
      const step = event.shiftKey ? 50 : 10;
      cursor.x = number(cursor.x + steps[event.key][0] * step, 0, 1000);
      cursor.y = number(cursor.y + steps[event.key][1] * step, 0, 650);
      if (keyboardDrawing) board.addPoint(cursor.x, cursor.y);
      get('cursor-position').textContent = `Keyboard cursor: ${cursor.x}, ${cursor.y}`;
      draw();
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat) return;
      keyboardDrawing = !keyboardDrawing;
      if (keyboardDrawing) {
        begin(cursor.x, cursor.y);
        status('Drawing started. Move with arrow keys, then press Space to finish.');
      } else {
        finish();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      status('Drawing canceled.');
    }
  });

  for (const button of root.querySelectorAll('[data-tool]')) {
    button.addEventListener('click', () => {
      cancel();
      tool = button.dataset.tool;
      for (const option of root.querySelectorAll('[data-tool]')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      status(tool === 'eraser' ? 'Erase stroke: touch or drag across a stroke to remove it whole.' : `${button.textContent} selected.`);
    });
  }

  for (const button of root.querySelectorAll('[data-color]')) {
    button.addEventListener('click', () => {
      color = button.dataset.color;
      for (const option of root.querySelectorAll('[data-color]')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      status(`${button.getAttribute('aria-label')} selected.`);
    });
  }

  get('width').addEventListener('input', () => {
    get('width-value').textContent = get('width').value;
  });

  get('undo').addEventListener('click', () => {
    cancel();
    board.undo();
    status('Last change undone.');
    draw();
  });

  get('redo').addEventListener('click', () => {
    cancel();
    board.redo();
    status('Change restored.');
    draw();
  });

  get('clear').addEventListener('click', () => {
    cancel();
    board.clear();
    status('Board cleared. Undo restores it.');
    draw();
  });

  get('export').addEventListener('click', () => {
    cancel();
    const url = URL.createObjectURL(new Blob([board.exportSVG()], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supply-chain-sketch.svg';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('SVG export downloaded.');
  });

  draw();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-logistics-board]');
  if (root) mount(root);
}
