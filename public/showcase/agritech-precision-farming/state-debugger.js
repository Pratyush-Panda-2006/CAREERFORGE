const MAX_SNAPSHOTS = 100;
const MAX_STATE_BYTES = 64_000;
const MAX_REPLAY_BYTES = 2_000_000;
const encoder = new TextEncoder();
const byteLength = text => encoder.encode(text).byteLength;
const copy = value => structuredClone(value);

function jsonState(value) {
  let nodes = 0;
  let bytes = 0;
  const ancestors = new WeakSet();
  function account(value) {
    if (typeof value === 'string' && value.length > MAX_STATE_BYTES) throw new RangeError('State exceeds the 64 KB limit.');
    bytes += byteLength(JSON.stringify(value));
    if (bytes > MAX_STATE_BYTES) throw new RangeError('State exceeds the 64 KB limit.');
  }
  function visit(value, depth) {
    if (++nodes > 2048 || depth > 24) throw new RangeError('State is too complex; use at most 2,048 values and 24 nesting levels.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') { account(value); return value; }
    if (typeof value === 'number' && Number.isFinite(value)) { account(value); return Object.is(value, -0) ? 0 : value; }
    if (!value || typeof value !== 'object') throw new TypeError('State must contain only finite JSON values.');
    const array = Array.isArray(value);
    if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype) && Object.getPrototypeOf(value) !== null) throw new TypeError('Use plain JSON objects and arrays.');
    if (ancestors.has(value)) throw new TypeError('Cyclic state is not supported.');
    ancestors.add(value);
    const fields = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(fields);
    bytes += 2;
    let result;
    if (array) {
      if (value.length > 2048 || keys.length !== value.length + 1) throw new TypeError('Use dense JSON arrays without extra properties.');
      result = [];
      for (let index = 0; index < value.length; index++) {
        const field = fields[String(index)];
        if (!field || !('value' in field)) throw new TypeError('State accessors and sparse arrays are not supported.');
        result.push(visit(field.value, depth + 1));
      }
    } else {
      const entries = [];
      for (const key of keys) {
        if (typeof key !== 'string' || !fields[key].enumerable || !('value' in fields[key])) throw new TypeError('State must use enumerable data properties, without symbols or accessors.');
        if (key.length > 128) throw new RangeError('State keys must be at most 128 characters.');
        account(key);
        entries.push([key, visit(fields[key].value, depth + 1)]);
      }
      // fromEntries defines own properties even for a JSON key named __proto__.
      result = Object.fromEntries(entries);
    }
    ancestors.delete(value);
    return result;
  }
  const result = visit(value, 0);
  if (byteLength(JSON.stringify(result)) > MAX_STATE_BYTES) throw new RangeError('State exceeds the 64 KB limit.');
  return result;
}

function actionLabel(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 80 || /\p{Cc}/u.test(value)) throw new TypeError('Use a non-empty action label of at most 80 characters, without control characters.');
  return value.trim();
}

function replayText(snapshots, currentIndex) {
  const text = JSON.stringify({ version: 1, currentIndex, snapshots });
  if (byteLength(text) > MAX_REPLAY_BYTES) throw new RangeError('Replay exceeds the 2 MB limit; export and start a new history.');
  return text;
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

/** A bounded recorder of JSON data. Imported action labels are never executed. */
export class AgritechPrecisionFarmingStateDebugger {
  #snapshots = [];
  #currentIndex = -1;

  get length() { return this.#snapshots.length; }
  get currentIndex() { return this.#currentIndex; }

  getHistory() {
    return this.#snapshots.map(({ action, createdAt }, index) => ({ index, action, createdAt }));
  }

  getSnapshot(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) throw new RangeError('Choose an existing snapshot index.');
    return copy(this.#snapshots[index]);
  }

  recordSnapshot(action, state) {
    if (this.length >= MAX_SNAPSHOTS) throw new RangeError('History is full at 100 snapshots; export and clear it before recording more.');
    const snapshot = { action: actionLabel(action), createdAt: new Date().toISOString(), state: jsonState(state) };
    const next = [...this.#snapshots, snapshot];
    replayText(next, next.length - 1);
    // Recording from an earlier step appends; existing future snapshots are retained.
    this.#snapshots = next;
    this.#currentIndex = next.length - 1;
    return this.getSnapshot(this.#currentIndex);
  }

  jumpToStep(index) {
    const snapshot = this.getSnapshot(index);
    this.#currentIndex = index;
    return snapshot;
  }

  computeDiff(before, after) {
    const left = jsonState(before);
    const right = jsonState(after);
    const changes = [];
    const pointer = key => key.replace(/~/g, '~0').replace(/\//g, '~1');
    function visit(a, b, path) {
      if (Object.is(a, b)) return;
      const bothObjects = a !== null && b !== null && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b);
      if (!bothObjects) { changes.push({ path, kind: 'changed', before: a, after: b }); return; }
      for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
        const nextPath = `${path}/${pointer(key)}`;
        if (!Object.hasOwn(a, key)) changes.push({ path: nextPath, kind: 'added', after: b[key] });
        else if (!Object.hasOwn(b, key)) changes.push({ path: nextPath, kind: 'removed', before: a[key] });
        else visit(a[key], b[key], nextPath);
      }
    }
    visit(left, right, '');
    return changes;
  }

  exportReplay() { return replayText(this.#snapshots, this.#currentIndex); }

  importReplay(text) {
    if (typeof text !== 'string' || text.length > MAX_REPLAY_BYTES || byteLength(text) > MAX_REPLAY_BYTES) throw new RangeError('Import a JSON replay no larger than 2 MB.');
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new SyntaxError('Replay must be valid JSON.'); }
    if (!exactKeys(parsed, ['version', 'currentIndex', 'snapshots']) || parsed.version !== 1 || !Array.isArray(parsed.snapshots) || parsed.snapshots.length > MAX_SNAPSHOTS) throw new TypeError('Unsupported replay format or snapshot count.');
    if (!Number.isInteger(parsed.currentIndex) || (parsed.snapshots.length ? parsed.currentIndex < 0 || parsed.currentIndex >= parsed.snapshots.length : parsed.currentIndex !== -1)) throw new RangeError('Replay selection is outside its history.');
    const snapshots = parsed.snapshots.map(snapshot => {
      if (!exactKeys(snapshot, ['action', 'createdAt', 'state'])) throw new TypeError('Invalid snapshot record.');
      if (typeof snapshot.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(snapshot.createdAt) || !Number.isFinite(Date.parse(snapshot.createdAt)) || new Date(snapshot.createdAt).toISOString() !== snapshot.createdAt) throw new TypeError('Snapshot timestamp must be a valid ISO timestamp.');
      return { action: actionLabel(snapshot.action), createdAt: snapshot.createdAt, state: jsonState(snapshot.state) };
    });
    replayText(snapshots, parsed.currentIndex);
    // Commit only after every record validates, preserving the old history on failure.
    this.#snapshots = snapshots;
    this.#currentIndex = parsed.currentIndex;
    return this.length;
  }

  clearHistory() { this.#snapshots = []; this.#currentIndex = -1; }
}

function mountDebugger(root) {
  let recorder = new AgritechPrecisionFarmingStateDebugger();
  const action = root.querySelector('#action-label');
  const state = root.querySelector('#state-json');
  const timeline = root.querySelector('#timeline');
  const history = root.querySelector('#history-rows');
  const diff = root.querySelector('#diff-rows');
  const error = root.querySelector('#debugger-error');
  const play = root.querySelector('#play-replay');
  let editorDirty = false;
  let userHistory = false;
  let timer = null;
  let importSequence = 0;
  let diffPage = 0;
  let currentChanges = [];

  recorder.recordSnapshot('Sensor reading', { zone: 'north', moisturePct: 32, pump: false });
  recorder.recordSnapshot('Dry soil detected', { zone: 'north', moisturePct: 28, pump: false });
  recorder.recordSnapshot('Start irrigation', { zone: 'north', moisturePct: 28, pump: true });

  const showError = cause => { error.textContent = cause.message; error.hidden = false; };
  const clearError = () => { error.textContent = ''; error.hidden = true; };
  function stop() { clearInterval(timer); timer = null; play.textContent = 'Play replay'; }
  function discardDraft() { return !editorDirty || confirm('Discard the unrecorded editor changes and load this snapshot?'); }

  function renderDiff() {
    diff.replaceChildren();
    const start = diffPage * 50;
    const page = currentChanges.slice(start, start + 50);
    root.querySelector('#diff-controls').hidden = currentChanges.length <= 50;
    root.querySelector('#diff-count').textContent = `${start + 1}–${start + page.length} of ${currentChanges.length} changes`;
    root.querySelector('#previous-changes').disabled = diffPage === 0;
    root.querySelector('#next-changes').disabled = start + 50 >= currentChanges.length;
    for (const change of page) {
      const row = document.createElement('tr');
      for (const key of ['path', 'before', 'after']) {
        const cell = document.createElement('td');
        cell.className = key;
        cell.textContent = key === 'path' ? change.path ? JSON.stringify(change.path).slice(1, -1) : '(root)' : Object.hasOwn(change, key) ? JSON.stringify(change[key]) : 'Not present';
        row.append(cell);
      }
      diff.append(row);
    }
  }

  function render() {
    const focusedStep = history.contains(document.activeElement) ? document.activeElement.dataset.step : undefined;
    history.replaceChildren();
    for (const item of recorder.getHistory()) {
      const row = document.createElement('tr');
      const step = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.step = String(item.index);
      button.textContent = `Step ${item.index + 1}`;
      button.setAttribute('aria-label', `Load step ${item.index + 1}: ${item.action}`);
      if (item.index === recorder.currentIndex) { button.setAttribute('aria-current', 'step'); row.className = 'selected'; }
      button.addEventListener('click', () => navigate(item.index));
      step.append(button);
      const label = document.createElement('td'); label.textContent = item.action;
      const time = document.createElement('td'); time.textContent = new Date(item.createdAt).toLocaleTimeString();
      row.append(step, label, time); history.append(row);
    }
    timeline.max = String(Math.max(0, recorder.length - 1));
    timeline.value = String(Math.max(0, recorder.currentIndex));
    timeline.disabled = !recorder.length;
    timeline.setAttribute('aria-valuetext', recorder.length ? `Step ${recorder.currentIndex + 1} of ${recorder.length}` : 'No snapshots');
    root.querySelector('#step-position').textContent = recorder.length ? `Step ${recorder.currentIndex + 1} of ${recorder.length}` : 'No snapshots';
    root.querySelector('#previous-step').disabled = recorder.currentIndex <= 0;
    root.querySelector('#next-step').disabled = !recorder.length || recorder.currentIndex >= recorder.length - 1;
    play.disabled = recorder.length < 2;
    root.querySelector('#export-replay').disabled = !recorder.length;
    root.querySelector('#empty-history').hidden = !!recorder.length;
    diff.replaceChildren();
    diffPage = 0;
    currentChanges = [];
    root.querySelector('#diff-controls').hidden = true;
    if (!recorder.length) {
      state.value = '{}'; action.value = 'Sensor update';
      root.querySelector('#diff-heading').textContent = 'State changes';
      root.querySelector('#no-diff').textContent = 'No snapshots to compare yet.';
      root.querySelector('#no-diff').hidden = false;
      return;
    }
    const current = recorder.getSnapshot(recorder.currentIndex);
    state.value = JSON.stringify(current.state, null, 2);
    action.value = current.action;
    const previous = recorder.currentIndex > 0 ? recorder.getSnapshot(recorder.currentIndex - 1).state : null;
    root.querySelector('#diff-heading').textContent = recorder.currentIndex > 0 ? `Changes from step ${recorder.currentIndex}` : 'Initial state compared with null';
    currentChanges = recorder.computeDiff(previous, current.state);
    root.querySelector('#no-diff').textContent = 'No values changed between these snapshots.';
    root.querySelector('#no-diff').hidden = currentChanges.length > 0;
    renderDiff();
    if (focusedStep !== undefined) history.querySelector(`button[data-step="${focusedStep}"]`)?.focus({ preventScroll: true });
  }

  function navigate(index) {
    stop();
    if (!discardDraft()) { timeline.value = String(recorder.currentIndex); return; }
    try { recorder.jumpToStep(index); editorDirty = false; clearError(); render(); }
    catch (cause) { showError(cause); }
  }
  for (const input of [action, state]) {
    input.addEventListener('focus', stop);
    input.addEventListener('input', () => { stop(); editorDirty = true; });
  }
  root.querySelector('#record-snapshot').addEventListener('click', () => {
    stop();
    try {
      if (byteLength(state.value) > MAX_STATE_BYTES) throw new RangeError('State exceeds the 64 KB limit.');
      let parsed;
      try { parsed = JSON.parse(state.value); } catch { throw new SyntaxError('State must be valid JSON.'); }
      recorder.recordSnapshot(action.value, parsed);
      editorDirty = false; userHistory = true; clearError(); render();
    } catch (cause) { showError(cause); }
  });
  timeline.addEventListener('input', () => navigate(Number(timeline.value)));
  root.querySelector('#previous-step').addEventListener('click', () => navigate(recorder.currentIndex - 1));
  root.querySelector('#next-step').addEventListener('click', () => navigate(recorder.currentIndex + 1));
  root.querySelector('#previous-changes').addEventListener('click', () => { if (diffPage > 0) { diffPage--; renderDiff(); } });
  root.querySelector('#next-changes').addEventListener('click', () => { if ((diffPage + 1) * 50 < currentChanges.length) { diffPage++; renderDiff(); } });
  play.addEventListener('click', () => {
    if (timer) { stop(); return; }
    if (!discardDraft()) return;
    editorDirty = false;
    if (recorder.currentIndex >= recorder.length - 1) recorder.jumpToStep(0);
    render();
    play.textContent = 'Pause replay';
    timer = setInterval(() => {
      if (recorder.currentIndex >= recorder.length - 1) { stop(); return; }
      recorder.jumpToStep(recorder.currentIndex + 1); render();
      if (recorder.currentIndex >= recorder.length - 1) stop();
    }, 700);
  });
  root.querySelector('#clear-history').addEventListener('click', () => {
    stop();
    if (!confirm('Clear all recorded snapshots and unrecorded editor changes? Export first if you need a copy.')) return;
    importSequence++;
    root.querySelector('#import-replay').value = '';
    recorder.clearHistory(); editorDirty = false; userHistory = false; clearError(); render();
  });
  root.querySelector('#export-replay').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([recorder.exportReplay()], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'agritech-state-replay.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  root.querySelector('#import-replay').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    stop();
    const sequence = ++importSequence;
    try {
      if (file.size > MAX_REPLAY_BYTES) throw new RangeError('Replay file exceeds the 2 MB limit.');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      if (sequence !== importSequence) return;
      const candidate = new AgritechPrecisionFarmingStateDebugger();
      candidate.importReplay(text);
      if ((recorder.length || editorDirty) && !confirm('Replace the current history and unrecorded editor changes with this validated replay?')) return;
      stop();
      recorder = candidate; editorDirty = false; userHistory = true; clearError(); render();
    } catch (cause) { if (sequence === importSequence) showError(cause); }
    finally { if (sequence === importSequence) event.target.value = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.addEventListener('beforeunload', event => { if (editorDirty || userHistory) { event.preventDefault(); event.returnValue = ''; } });
  render();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-state-debugger]');
  if (root) mountDebugger(root);
}
