const MAX_BYTES = 1_000_000;
const copy = (value) => JSON.parse(JSON.stringify(value));
const bytes = (text) => new TextEncoder().encode(text).length;
const own = (value, key) => Object.hasOwn(value, key);
const replayText = (snapshots, playhead) => JSON.stringify({ version: 1, playhead, snapshots }, null, 2);

// Validate without invoking accessors or toJSON; snapshots contain finite JSON only.
function cloneJson(value, ancestors = new Set(), depth = 0, budget = { nodes: 0 }) {
  if (++budget.nodes > 10000 || depth > 48) throw new RangeError('State exceeds the 10,000-value or 48-level limit.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (typeof value !== 'object') throw new TypeError('State must contain only finite JSON values.');
  if (ancestors.has(value)) throw new TypeError('State cannot contain a cycle.');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('State must use plain JSON objects.');
  if (Object.getOwnPropertySymbols(value).length) throw new TypeError('Symbol properties are not JSON.');
  if (Array.isArray(value) && value.length > 10000) throw new RangeError('State has too many array entries.');
  ancestors.add(value);
  const output = Array.isArray(value) ? [] : {};
  const keys = Array.isArray(value) ? Array.from({ length: value.length }, (_, index) => String(index)) : Object.keys(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !own(descriptor, 'value')) throw new TypeError('Sparse arrays and accessors are not supported.');
    Object.defineProperty(output, key, { value: cloneJson(descriptor.value, ancestors, depth + 1, budget), enumerable: true, writable: true, configurable: true });
  }
  ancestors.delete(value);
  return output;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function actionName(action) {
  if (typeof action !== 'string' || !action.trim() || action.trim().length > 120) throw new TypeError('Action must be 1–120 characters.');
  return action.trim();
}
const pointer = (key) => String(key).replace(/~/g, '~0').replace(/\//g, '~1');
function diffValues(before, after, path, changes) {
  if (Object.is(before, after)) return;
  const container = (value) => value !== null && typeof value === 'object';
  if (!container(before) || !container(after) || Array.isArray(before) !== Array.isArray(after)) {
    changes.push({ type: 'changed', path, before, after }); return;
  }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  for (const key of keys) {
    const next = `${path}/${pointer(key)}`;
    if (!own(before, key)) changes.push({ type: 'added', path: next, after: after[key] });
    else if (!own(after, key)) changes.push({ type: 'removed', path: next, before: before[key] });
    else diffValues(before[key], after[key], next, changes);
  }
}

export class AutomotiveHypercarStateDebugger {
  #snapshots = [];
  #index = -1;
  #maxSnapshots;
  #clock;
  constructor({ maxSnapshots = 200, clock = () => new Date().toISOString() } = {}) {
    if (!Number.isInteger(maxSnapshots) || maxSnapshots < 1 || maxSnapshots > 500) throw new RangeError('Snapshot limit must be 1–500.');
    if (typeof clock !== 'function') throw new TypeError('Clock must be a function.');
    this.#maxSnapshots = maxSnapshots; this.#clock = clock;
  }
  get length() { return this.#snapshots.length; }
  get index() { return this.#index; }
  get history() { return copy(this.#snapshots); }
  get current() { return this.#index < 0 ? null : copy(this.#snapshots[this.#index]); }
  recordSnapshot(action, state) {
    const snapshot = { action: actionName(action), at: this.#clock(), state: cloneJson(state) };
    if (typeof snapshot.at !== 'string' || !Number.isFinite(Date.parse(snapshot.at))) throw new TypeError('Snapshot time is invalid.');
    // Validate before truncating the future or evicting old history.
    const next = [...this.#snapshots.slice(0, this.#index + 1), freeze(snapshot)].slice(-this.#maxSnapshots);
    if (bytes(replayText(next, next.length - 1)) > MAX_BYTES) throw new RangeError('Replay exceeds the 1 MB limit.');
    this.#snapshots = next; this.#index = next.length - 1;
    return this.current;
  }
  jumpToStep(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) throw new RangeError('Choose an existing snapshot index.');
    this.#index = index; return this.current;
  }
  computeDiff(before, after) {
    const changes = [];
    diffValues(cloneJson(before), cloneJson(after), '', changes);
    return changes;
  }
  exportReplay() { return replayText(this.#snapshots, this.#index); }
  importReplay(text) {
    if (typeof text !== 'string' || bytes(text) > MAX_BYTES) throw new RangeError('Paste a JSON replay of at most 1 MB.');
    let data;
    try { data = JSON.parse(text); } catch { throw new TypeError('Replay is not valid JSON.'); }
    if (!data || data.version !== 1 || !Array.isArray(data.snapshots) || data.snapshots.length > this.#maxSnapshots
      || Object.keys(data).sort().join(',') !== 'playhead,snapshots,version'
      || !Number.isInteger(data.playhead) || data.playhead < (data.snapshots.length ? 0 : -1) || data.playhead >= data.snapshots.length) throw new TypeError('Replay version, history or playhead is invalid.');
    const next = data.snapshots.map((row) => {
      if (!row || Object.keys(row).sort().join(',') !== 'action,at,state' || typeof row.at !== 'string' || !Number.isFinite(Date.parse(row.at))) throw new TypeError('Replay contains an invalid snapshot.');
      return freeze({ action: actionName(row.action), at: row.at, state: cloneJson(row.state) });
    });
    if (bytes(replayText(next, data.playhead)) > MAX_BYTES) throw new RangeError('Formatted replay exceeds the 1 MB limit.');
    this.#snapshots = next; this.#index = data.playhead;
    return this.current;
  }
}

function mountRecorder() {
  const root = document.querySelector('[data-state-recorder]');
  if (!root) return;
  const recorder = new AutomotiveHypercarStateDebugger();
  const get = (id) => root.querySelector(`#${id}`);
  const message = (text, error = false) => { get('notice').textContent = text; get('notice').setAttribute('role', error ? 'alert' : 'status'); };
  function render() {
    const selected = recorder.current, history = recorder.history;
    get('count').textContent = `${history.length} / 200 snapshots`;
    get('position').textContent = selected ? `Step ${recorder.index + 1} of ${history.length}` : 'No snapshot selected';
    get('playhead').max = String(Math.max(0, history.length - 1)); get('playhead').value = String(Math.max(0, recorder.index)); get('playhead').disabled = !selected;
    get('previous').disabled = recorder.index <= 0; get('next').disabled = recorder.index >= history.length - 1;
    get('selected-state').textContent = selected ? JSON.stringify(selected.state, null, 2) : 'Record a state to begin.';
    get('branch-note').textContent = recorder.index < history.length - 1 ? 'Recording here replaces the later snapshots.' : 'New snapshots append here. Oldest entries roll off after 200.';
    const rows = history.map((snapshot, index) => {
      const tr = document.createElement('tr'), step = document.createElement('td'), action = document.createElement('td'), time = document.createElement('td'), button = document.createElement('button');
      button.type = 'button'; button.textContent = String(index + 1); button.setAttribute('aria-label', `Select snapshot ${index + 1}`);
      if (index === recorder.index) button.setAttribute('aria-current', 'step');
      button.addEventListener('click', () => { recorder.jumpToStep(index); render(); get('position').focus(); });
      step.append(button); action.textContent = snapshot.action; time.textContent = snapshot.at; tr.append(step, action, time); return tr;
    });
    get('history').replaceChildren(...rows);
    const changes = recorder.index > 0 ? recorder.computeDiff(history[recorder.index - 1].state, selected.state) : [];
    get('diff-title').textContent = recorder.index > 0 ? `Changes from step ${recorder.index} to ${recorder.index + 1}` : 'Select a later snapshot to compare';
    get('diff').replaceChildren(...changes.map((change) => {
      const row = document.createElement('div'); row.className = 'diff-row';
      const path = document.createElement('code'); path.textContent = `${change.type.toUpperCase()} ${change.path || '(root)'}`; row.append(path);
      if (own(change, 'before')) { const del = document.createElement('del'); del.textContent = JSON.stringify(change.before); row.append(del); }
      if (own(change, 'after')) { const ins = document.createElement('ins'); ins.textContent = JSON.stringify(change.after); row.append(ins); }
      return row;
    }));
    if (recorder.index > 0 && !changes.length) get('diff').textContent = 'No state changes.';
  }
  get('capture').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const text = get('state-input').value;
      if (bytes(text) > MAX_BYTES) throw new RangeError('State JSON exceeds the 1 MB limit.');
      recorder.recordSnapshot(get('action').value, JSON.parse(text)); render(); message('Snapshot recorded.');
    }
    catch (error) { message(error.message, true); }
  });
  get('previous').addEventListener('click', () => { recorder.jumpToStep(recorder.index - 1); render(); });
  get('next').addEventListener('click', () => { recorder.jumpToStep(recorder.index + 1); render(); });
  get('playhead').addEventListener('input', (event) => { recorder.jumpToStep(Number(event.target.value)); render(); });
  get('export').addEventListener('click', () => {
    let url;
    try {
      const text = recorder.exportReplay(); url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'hypercar-state-replay.json'; document.body.append(link); link.click(); link.remove();
      const ownedUrl = url; setTimeout(() => URL.revokeObjectURL(ownedUrl), 1000); get('replay-input').value = text; message('Replay exported. You can also copy the JSON below.');
    } catch { if (url) URL.revokeObjectURL(url); message('Could not export. Please try again.', true); }
  });
  get('import').addEventListener('click', () => {
    try { recorder.importReplay(get('replay-input').value); render(); message('Replay imported. The saved playhead was restored.'); }
    catch (error) { message(error.message, true); }
  });
  render();
}
if (typeof document !== 'undefined') mountRecorder();
