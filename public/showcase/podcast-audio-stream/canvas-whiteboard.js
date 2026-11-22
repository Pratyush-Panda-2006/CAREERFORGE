const WIDTH = 960;
const HEIGHT = 540;
const MAX_OBJECTS = 100;
const MAX_HISTORY = 50;
const MAX_POINTS = 512;
const SPACING = 4;
const SVG_NS = 'http://www.w3.org/2000/svg';

const clamp = (value, max) => Math.min(max, Math.max(0, value));
const round = value => Math.round(value * 100) / 100;
const midpoint = (a, b) => ({ x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) });

function position(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Coordinates must be finite.');
  return { x: round(clamp(x, WIDTH)), y: round(clamp(y, HEIGHT)) };
}

function shapeProperties(shape) {
  const first = shape.points[0];
  const last = shape.points.at(-1);
  const paint = { fill: 'none', stroke: shape.color, 'stroke-width': shape.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  if (shape.tool === 'rectangle' && first.x !== last.x && first.y !== last.y) {
    return ['rect', { ...paint, x: Math.min(first.x, last.x), y: Math.min(first.y, last.y),
      width: Math.abs(last.x - first.x), height: Math.abs(last.y - first.y) }];
  }
  if (first.x === last.x && first.y === last.y && shape.points.length <= 2) {
    return ['circle', { cx: first.x, cy: first.y, r: shape.width / 2, fill: shape.color }];
  }
  let d = 'M ' + first.x + ' ' + first.y;
  if (shape.tool === 'pen') {
    for (let i = 1; i < shape.points.length - 1; i++) {
      const point = shape.points[i];
      const end = midpoint(point, shape.points[i + 1]);
      d += ' Q ' + point.x + ' ' + point.y + ' ' + end.x + ' ' + end.y;
    }
  }
  return ['path', { ...paint, d: d + ' L ' + last.x + ' ' + last.y }];
}

export class PodcastAudioStreamWhiteboardCanvas {
  #objects = [];
  #undo = [];
  #redo = [];
  #draft = null;
  #nextId = 1;

  get canUndo() { return this.#undo.length > 0; }
  get canRedo() { return this.#redo.length > 0; }

  #commit(objects) {
    this.#undo.push(this.#objects);
    if (this.#undo.length > MAX_HISTORY) this.#undo.shift();
    this.#objects = objects;
    this.#redo = [];
  }

  begin(tool, color, width) {
    if (!['pen', 'line', 'rectangle'].includes(tool)) throw new TypeError('Choose a drawing tool.');
    if (typeof color !== 'string' || !/^#[a-f0-9]{6}$/i.test(color)) throw new TypeError('Choose a valid color.');
    if (!Number.isInteger(width) || width < 1 || width > 24) throw new RangeError('Width must be 1 to 24.');
    if (this.#objects.length >= MAX_OBJECTS) throw new RangeError('Board full. Erase an object or clear the board.');
    this.#draft = { id: this.#nextId, tool, color, width, points: [] };
  }

  addPoint(x, y) {
    if (!this.#draft) return false;
    const point = position(x, y);
    const points = this.#draft.points;
    const last = points.at(-1);
    if (!last) points.push(point);
    else if (this.#draft.tool !== 'pen') points[1] = point;
    else {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.5) return false;
      const steps = Math.min(Math.ceil(distance / SPACING), MAX_POINTS - points.length);
      for (let i = 1; i <= steps; i++) {
        points.push(position(last.x + dx * i / steps, last.y + dy * i / steps));
      }
      if (steps === 0) points[points.length - 1] = point;
    }
    return true;
  }

  renderStroke() {
    if (!this.#draft?.points.length) return null;
    return shapeProperties(this.#draft);
  }

  finish() {
    if (!this.#draft?.points.length) return false;
    this.#commit([...this.#objects, this.#draft]);
    this.#draft = null;
    this.#nextId++;
    return true;
  }

  cancel() { this.#draft = null; }

  erase(ids) {
    const next = this.#objects.filter(shape => !ids.has(shape.id));
    if (next.length === this.#objects.length) return false;
    this.#commit(next);
    return true;
  }

  clear() {
    if (!this.#objects.length) return false;
    this.#commit([]);
    return true;
  }

  undo() {
    if (!this.canUndo) return false;
    this.#redo.push(this.#objects);
    this.#objects = this.#undo.pop();
    return true;
  }

  redo() {
    if (!this.canRedo) return false;
    this.#undo.push(this.#objects);
    this.#objects = this.#redo.pop();
    return true;
  }

  shapes() {
    return this.#objects.map(shape => ({ id: shape.id, geometry: shapeProperties(shape) }));
  }

  exportSVG() {
    const markup = this.#objects.map(shape => {
      const [tag, attributes] = shapeProperties(shape);
      const serialized = Object.entries(attributes).map(([key, value]) => key + '="' + value + '"').join(' ');
      return '<' + tag + ' ' + serialized + '/>';
    });
    return '<svg xmlns="' + SVG_NS + '" viewBox="0 0 ' + WIDTH + ' ' + HEIGHT + '">' + markup.join('') + '</svg>';
  }
}

if (typeof document !== 'undefined') {
  const model = new PodcastAudioStreamWhiteboardCanvas();
  const byId = id => document.getElementById(id);
  const board = byId('board');
  const layer = byId('shapes');
  const preview = byId('preview');
  const cursor = byId('cursor');
  const cursorPoint = { x: WIDTH / 2, y: HEIGHT / 2 };
  let gesture = null;

  const status = message => { byId('status').textContent = message; };
  const tool = () => document.querySelector('input[name="tool"]:checked').value;

  function element([tag, attributes]) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  function render() {
    const shapes = model.shapes();
    layer.replaceChildren(...shapes.map(({ id, geometry }) => {
      const node = element(geometry);
      node.dataset.id = String(id);
      return node;
    }));
    byId('count').textContent = shapes.length + ' / ' + MAX_OBJECTS + ' objects';
    byId('undo').disabled = !model.canUndo;
    byId('redo').disabled = !model.canRedo;
    byId('clear').disabled = !shapes.length;
  }

  function pointAt(clientX, clientY) {
    const point = new DOMPoint(clientX, clientY).matrixTransform(board.getScreenCTM().inverse());
    return position(point.x, point.y);
  }

  function hitAt(clientX, clientY) {
    const hit = document.elementFromPoint(clientX, clientY)?.closest('[data-id]');
    if (hit?.parentNode === layer) {
      gesture.erased.add(Number(hit.dataset.id));
      hit.style.visibility = 'hidden';
    }
  }

  function start(kind, point) {
    gesture = { kind, tool: tool(), erased: new Set() };
    if (gesture.tool !== 'eraser') {
      try {
        model.begin(gesture.tool, byId('color').value, Number(byId('width').value));
        draw(point);
      } catch (error) {
        gesture = null;
        status(error.message);
        return false;
      }
    }
    return true;
  }

  function draw(point) {
    if (model.addPoint(point.x, point.y)) preview.replaceChildren(element(model.renderStroke()));
  }

  function finish(cancel = false) {
    if (!gesture) return;
    let changed = false;
    const { kind, erased, tool: selected } = gesture;
    gesture = null;
    if (cancel) model.cancel();
    else if (selected === 'eraser') changed = model.erase(erased);
    else changed = model.finish();
    preview.replaceChildren();
    render();
    if (typeof kind === 'number' && board.hasPointerCapture(kind)) board.releasePointerCapture(kind);
    status(cancel ? 'Gesture cancelled.' : changed ? (selected === 'eraser' ? 'Objects erased.' : 'Object added.') : 'No object selected.');
  }

  board.addEventListener('pointerdown', event => {
    if (gesture || event.button !== 0) return;
    const point = pointAt(event.clientX, event.clientY);
    if (!start(event.pointerId, point)) return;
    board.setPointerCapture(event.pointerId);
    if (gesture.tool === 'eraser') hitAt(event.clientX, event.clientY);
  });
  board.addEventListener('pointermove', event => {
    if (gesture?.kind !== event.pointerId) return;
    if (gesture.tool === 'eraser') hitAt(event.clientX, event.clientY);
    else draw(pointAt(event.clientX, event.clientY));
  });
  board.addEventListener('pointerup', event => {
    if (gesture?.kind !== event.pointerId) return;
    if (gesture.tool !== 'eraser') draw(pointAt(event.clientX, event.clientY));
    finish();
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    board.addEventListener(type, event => { if (gesture?.kind === event.pointerId) finish(true); });
  }

  board.addEventListener('keydown', event => {
    const offsets = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (event.key === 'Escape' && gesture) {
      event.preventDefault();
      finish(true);
    } else if (offsets[event.key] && (!gesture || gesture.kind === 'keyboard')) {
      event.preventDefault();
      const [dx, dy] = offsets[event.key];
      const step = event.shiftKey ? 2 : 12;
      Object.assign(cursorPoint, position(cursorPoint.x + dx * step, cursorPoint.y + dy * step));
      cursor.setAttribute('cx', cursorPoint.x);
      cursor.setAttribute('cy', cursorPoint.y);
      if (gesture) draw(cursorPoint);
    } else if (event.key === ' ' && !event.repeat && (!gesture || gesture.kind === 'keyboard')) {
      event.preventDefault();
      if (gesture) finish();
      else if (start('keyboard', cursorPoint) && gesture.tool === 'eraser') {
        const screen = new DOMPoint(cursorPoint.x, cursorPoint.y).matrixTransform(board.getScreenCTM());
        hitAt(screen.x, screen.y);
        finish();
      }
    }
  });
  board.addEventListener('blur', () => { if (gesture?.kind === 'keyboard') finish(true); });

  for (const [id, message] of [['undo', 'Undid the last change.'], ['redo', 'Redid the last change.'], ['clear', 'Board cleared. Undo can restore it.']]) {
    byId(id).addEventListener('click', () => {
      if (gesture) finish(true);
      if (model[id]()) {
        render();
        status(message);
      }
    });
  }
  byId('width').addEventListener('input', event => { byId('width-value').textContent = event.target.value + ' px'; });
  byId('export').addEventListener('click', () => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([model.exportSVG()], { type: 'image/svg+xml' }));
    link.href = url;
    link.download = 'episode-whiteboard.svg';
    document.body.append(link);
    try {
      link.click();
      status('SVG export started.');
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  render();
}
