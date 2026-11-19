export const BOARD = Object.freeze({ width: 1000, height: 625, maxStrokes: 80, maxPoints: 1024, paper: '#f3f0e8' });
const TOOLS = ['pen', 'eraser', 'line', 'rectangle'];
const rounded = value => Math.round(value * 10) / 10;
function point(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Point coordinates must be finite numbers.');
  return [rounded(Math.max(0, Math.min(BOARD.width, x))), rounded(Math.max(0, Math.min(BOARD.height, y)))];
}
export function interpolatePoints(from, to, step = 4) {
  if (!Array.isArray(from) || from.length !== 2 || !Array.isArray(to) || to.length !== 2) throw new TypeError('Points must contain two coordinates.');
  if (!Number.isFinite(step) || step < 0.1 || step > 64) throw new RangeError('Interpolation spacing must be 0.1–64 units.');
  const a = point(...from), b = point(...to), distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const count = Math.ceil(distance / step);
  if (count > BOARD.maxPoints) throw new RangeError('Interpolation would exceed the point limit.');
  return Array.from({ length: count }, (_, i) => [rounded(a[0] + (b[0] - a[0]) * (i + 1) / count), rounded(a[1] + (b[1] - a[1]) * (i + 1) / count)]);
}
function pathData(points) {
  let path = `M ${points[0].join(' ')}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    path += ` Q ${a.join(' ')} ${rounded((a[0] + b[0]) / 2)} ${rounded((a[1] + b[1]) / 2)}`;
  }
  return `${path} L ${points.at(-1).join(' ')}`;
}
function svgShape(stroke, color = stroke.color) {
  const p = stroke.points, common = `fill="none" stroke="${color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round"`;
  if (stroke.tool === 'rectangle') return `<rect x="${Math.min(p[0][0], p[1][0])}" y="${Math.min(p[0][1], p[1][1])}" width="${rounded(Math.abs(p[1][0] - p[0][0]))}" height="${rounded(Math.abs(p[1][1] - p[0][1]))}" ${common}/>`;
  if (p.length === 1) return `<circle cx="${p[0][0]}" cy="${p[0][1]}" r="${stroke.width / 2}" fill="${color}"/>`;
  const path = stroke.tool === 'line' ? `M ${p[0].join(' ')} L ${p[1].join(' ')}` : pathData(p);
  return `<path d="${path}" ${common}/>`;
}
function paintShape(context, stroke) {
  const p = stroke.points;
  if (stroke.tool === 'rectangle' && p.length < 2) return;
  context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  context.lineCap = 'round'; context.lineJoin = 'round'; context.lineWidth = stroke.width;
  context.strokeStyle = stroke.color; context.fillStyle = stroke.color;
  context.beginPath();
  if (stroke.tool === 'rectangle') {
    context.strokeRect(Math.min(p[0][0], p[1][0]), Math.min(p[0][1], p[1][1]), Math.abs(p[1][0] - p[0][0]), Math.abs(p[1][1] - p[0][1]));
  } else if (p.length === 1) {
    context.arc(p[0][0], p[0][1], stroke.width / 2, 0, Math.PI * 2); context.fill();
  } else {
    context.moveTo(...p[0]);
    if (stroke.tool === 'line') context.lineTo(...p[1]);
    else {
      for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i]; context.quadraticCurveTo(...a, rounded((a[0] + b[0]) / 2), rounded((a[1] + b[1]) / 2)); }
      context.lineTo(...p.at(-1));
    }
    context.stroke();
  }
}

export class NonprofitImpactWhiteboardCanvas {
  #history = []; #redo = []; #draft = null;
  #settings = { tool: 'pen', color: '#224e3f', width: 4 };
  getSummary() { return { ...this.#settings, strokes: this.#history.length, redo: this.#redo.length, drawing: Boolean(this.#draft), points: this.#draft?.points.length ?? 0 }; }
  setTool(tool) { if (!TOOLS.includes(tool)) throw new TypeError('Unknown drawing tool.'); this.cancelStroke(); this.#settings.tool = tool; }
  setColor(color) { if (typeof color !== 'string' || !/^#[a-f0-9]{6}$/i.test(color)) throw new TypeError('Choose a six-digit hex color.'); this.cancelStroke(); this.#settings.color = color.toLowerCase(); }
  setWidth(width) { if (!Number.isInteger(width) || width < 1 || width > 24) throw new RangeError('Brush width must be 1–24.'); this.cancelStroke(); this.#settings.width = width; }
  addPoint(x, y) {
    const next = point(x, y);
    if (!this.#draft) { this.#draft = { ...this.#settings, points: [next] }; return 1; }
    const points = this.#draft.points;
    if (['line', 'rectangle'].includes(this.#draft.tool)) { if (points.length === 1) points.push(next); else points[1] = next; return 1; }
    const last = points.at(-1);
    if (Math.hypot(next[0] - last[0], next[1] - last[1]) < 1) return 0;
    const added = interpolatePoints(last, next);
    if (points.length + added.length > BOARD.maxPoints) throw new RangeError('This stroke is too long. Finish it and begin another.');
    points.push(...added); return added.length;
  }
  finishStroke() {
    if (!this.#draft) return false;
    const { tool, points } = this.#draft;
    if (['line', 'rectangle'].includes(tool) && (points.length < 2 || Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]) < 1 || (tool === 'rectangle' && (Math.abs(points[1][0] - points[0][0]) < 1 || Math.abs(points[1][1] - points[0][1]) < 1)))) { this.#draft = null; return false; }
    if (this.#history.length >= BOARD.maxStrokes) throw new RangeError('The board holds 80 marks. Undo or clear to make room.');
    this.#history.push(this.#draft); this.#draft = null; this.#redo = []; return true;
  }
  cancelStroke() { const pending = Boolean(this.#draft); this.#draft = null; return pending; }
  undo() { if (this.cancelStroke()) return true; if (!this.#history.length) return false; this.#redo.push(this.#history.pop()); return true; }
  redo() { if (this.cancelStroke()) return false; if (!this.#redo.length) return false; this.#history.push(this.#redo.pop()); return true; }
  clear() { this.#history = []; this.#redo = []; this.#draft = null; }
  renderStroke(context, draftOnly = false) {
    context.save();
    try {
      context.setTransform(1, 0, 0, 1, 0, 0); context.globalAlpha = 1;
      if (!draftOnly) { context.clearRect(0, 0, BOARD.width, BOARD.height); for (const stroke of this.#history) paintShape(context, stroke); }
      else if (this.#draft) paintShape(context, this.#draft);
    } finally { context.restore(); }
  }
  exportSVG() {
    let content = '', masks = '';
    this.#history.forEach((stroke, i) => {
      if (stroke.tool === 'eraser') {
        const id = `field-erase-${i}`;
        masks += `<mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="${BOARD.width}" height="${BOARD.height}" mask-type="luminance"><rect width="100%" height="100%" fill="white"/>${svgShape(stroke, '#000000')}</mask>`;
        content = `<g mask="url(#${id})">${content}</g>`;
      } else content += svgShape(stroke);
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${BOARD.width}" height="${BOARD.height}" viewBox="0 0 ${BOARD.width} ${BOARD.height}"><title>Nonprofit Impact field sketch</title><defs>${masks}</defs><rect width="100%" height="100%" fill="${BOARD.paper}"/>${content}</svg>`;
  }
}

function mountWhiteboard() {
  const byId = id => document.getElementById(id), canvas = byId('board'), cache = document.createElement('canvas');
  canvas.width = cache.width = BOARD.width; canvas.height = cache.height = BOARD.height;
  const context = canvas.getContext('2d'), cached = cache.getContext('2d');
  const report = (message, error = false) => { byId('notice').textContent = message; byId('notice').classList.toggle('error', error); byId('notice').setAttribute('role', error ? 'alert' : 'status'); };
  if (!context || !cached) { report('Canvas drawing is unavailable in this browser.', true); document.querySelectorAll('button,input').forEach(control => control.disabled = true); return; }
  const model = new NonprofitImpactWhiteboardCanvas();
  let pointer = null, frame = 0, cursor = [500, 312.5], keyboard = true;
  function refresh() {
    const state = model.getSummary();
    byId('count').textContent = `${state.strokes} / ${BOARD.maxStrokes} marks`;
    byId('undo').disabled = !state.strokes && !state.drawing; byId('redo').disabled = !state.redo || state.drawing;
    byId('clear').disabled = !state.strokes && !state.drawing; byId('export').disabled = !state.strokes || state.drawing;
    byId('brush-value').textContent = `${state.width} px`; byId('coordinates').textContent = `${Math.round(cursor[0])}, ${Math.round(cursor[1])}`;
    document.querySelectorAll('[data-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tool === state.tool)));
    document.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === state.color)));
    canvas.dataset.tool = state.tool;
  }
  function paint() {
    frame = 0; context.clearRect(0, 0, BOARD.width, BOARD.height); context.drawImage(cache, 0, 0); model.renderStroke(context, true);
    if (keyboard && document.activeElement === canvas && pointer === null) { context.save(); context.strokeStyle = '#7a8276'; context.lineWidth = 1; context.beginPath(); context.moveTo(cursor[0] - 7, cursor[1]); context.lineTo(cursor[0] + 7, cursor[1]); context.moveTo(cursor[0], cursor[1] - 7); context.lineTo(cursor[0], cursor[1] + 7); context.stroke(); context.restore(); }
    refresh();
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(paint); refresh(); }
  function updateCache() { model.renderStroke(cached); schedule(); }
  function release() { const id = pointer; pointer = null; if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); }
  function finish() {
    release();
    try { const added = model.finishStroke(); updateCache(); report(added ? 'Mark added. Undo and SVG export are ready.' : 'Drag to give the shape a size.'); }
    catch (error) { model.cancelStroke(); updateCache(); report(error.message, true); }
  }
  function cancel() { release(); const hadDraft = model.cancelStroke(); schedule(); if (hadDraft) report('Unfinished mark cancelled. Your drawing is unchanged.'); }
  function position(event) { const rect = canvas.getBoundingClientRect(); return point((event.clientX - rect.left) / rect.width * BOARD.width, (event.clientY - rect.top) / rect.height * BOARD.height); }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointer !== null || !event.isPrimary) return;
    event.preventDefault(); keyboard = false; canvas.focus({ preventScroll: true }); model.cancelStroke(); cursor = position(event); model.addPoint(...cursor); pointer = event.pointerId; canvas.setPointerCapture(pointer); schedule();
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    cursor = position(event);
    try { model.addPoint(...cursor); schedule(); }
    catch (error) { finish(); report(error.message, true); }
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    cursor = position(event);
    try { model.addPoint(...cursor); } catch (error) { report(error.message, true); }
    finish();
  });
  canvas.addEventListener('pointercancel', event => { if (event.pointerId === pointer) cancel(); });
  canvas.addEventListener('lostpointercapture', event => { if (event.pointerId === pointer) cancel(); });
  canvas.addEventListener('focus', schedule); canvas.addEventListener('blur', schedule);
  canvas.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); if (event.key.toLowerCase() === 'y' || event.shiftKey) model.redo(); else model.undo(); updateCache(); report('Drawing history updated.'); return; }
    if (pointer !== null) return;
    if (event.key === 'Escape') { event.preventDefault(); cancel(); return; }
    if (event.key === 'Enter') { event.preventDefault(); keyboard = true; if (model.getSummary().drawing) finish(); else { model.addPoint(...cursor); schedule(); report('Mark started. Move with arrows; Enter finishes, Escape cancels.'); } return; }
    const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (movement) {
      event.preventDefault(); keyboard = true; const step = event.shiftKey ? 20 : 5; cursor = point(cursor[0] + movement[0] * step, cursor[1] + movement[1] * step);
      try { if (model.getSummary().drawing) model.addPoint(...cursor); } catch (error) { finish(); report(error.message, true); }
      schedule();
    }
    if (event.key === 'Home') { event.preventDefault(); keyboard = true; if (!model.getSummary().drawing) cursor = [500, 312.5]; schedule(); }
  });
  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => { cancel(); model.setTool(button.dataset.tool); schedule(); report(`${button.textContent} selected.`); }));
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => { cancel(); model.setColor(button.dataset.color); byId('color').value = button.dataset.color; schedule(); report('Brush color updated.'); }));
  byId('color').addEventListener('input', event => { cancel(); model.setColor(event.target.value); schedule(); });
  byId('brush').addEventListener('input', event => { cancel(); model.setWidth(event.target.valueAsNumber); schedule(); });
  function historyAction(id, action) { const ownedFocus = document.activeElement === byId(id); release(); action(); updateCache(); if (ownedFocus && byId(id).disabled) canvas.focus({ preventScroll: true }); }
  byId('undo').addEventListener('click', () => { historyAction('undo', () => model.undo()); report('Undo applied.'); });
  byId('redo').addEventListener('click', () => { historyAction('redo', () => model.redo()); report('Redo applied.'); });
  byId('clear').addEventListener('click', () => { if (confirm('Clear this drawing and its undo history?')) { historyAction('clear', () => model.clear()); report('Drawing cleared. Brush settings are retained.'); } else report('Drawing kept.'); });
  byId('export').addEventListener('click', () => {
    const link = document.createElement('a'); let url;
    try { url = URL.createObjectURL(new Blob([model.exportSVG()], { type: 'image/svg+xml;charset=utf-8' })); link.href = url; link.download = 'nonprofit-field-sketch.svg'; document.body.append(link); link.click(); report('SVG download started. It includes the completed marks and erasing.'); }
    catch { report('Export could not start. Your drawing is retained; try again.', true); }
    finally { link.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  });
  updateCache();
}
if (typeof document !== 'undefined' && document.getElementById('board')) mountWhiteboard();
