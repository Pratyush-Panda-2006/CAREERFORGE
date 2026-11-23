import { StreamingCinemaHubFsmVisualizer } from "./state-diagram.js";

const MAX_STEPS = 120;
const MAX_BYTES = 256000;
const encoder = new TextEncoder();
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function isJsonValue(value, level = 0) {
  if (level > 10) return false;
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 64 && value.every((entry) => isJsonValue(entry, level + 1));
  if (!isObject(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value))) return false;
  const entries = Object.values(value);
  return entries.length <= 64 && entries.every((entry) => isJsonValue(entry, level + 1));
}

function validSnapshot(record) {
  return isObject(record) && typeof record.action === "string" && record.action.trim().length > 0
    && record.action.length <= 100 && isObject(record.state) && isJsonValue(record.state);
}

export class StreamingCinemaHubStateDebugger {
  #steps = [];
  #index = 0;

  get steps() { return structuredClone(this.#steps); }
  get index() { return this.#index; }
  get length() { return this.#steps.length; }
  get current() { return structuredClone(this.#steps[this.#index]); }

  recordSnapshot(action, state) {
    const record = { action, state };
    if (this.length >= MAX_STEPS || !validSnapshot(record)) return false;
    const candidate = [...this.#steps, record];
    if (encoder.encode(JSON.stringify({ version: 1, steps: candidate })).length > MAX_BYTES) return false;
    this.#steps.push(structuredClone(record));
    this.#index = this.length - 1;
    return true;
  }

  jumpToStep(index) {
    if (Number.isSafeInteger(index)) this.#index = Math.max(0, Math.min(index, this.length - 1));
    return this.current;
  }

  computeDiff(previous, next) {
    const changes = [];
    function walk(before, after, path) {
      if (isObject(before) && isObject(after)) {
        const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
        for (const key of keys) {
          walk(Object.hasOwn(before, key) ? before[key] : undefined,
            Object.hasOwn(after, key) ? after[key] : undefined, [...path, key]);
        }
      } else if (JSON.stringify(before) !== JSON.stringify(after)) {
        changes.push({ path, before, after });
      }
    }
    walk(previous, next, []);
    return changes;
  }

  exportReplay() {
    return JSON.stringify({ version: 1, steps: this.#steps });
  }

  importReplay(text) {
    if (typeof text !== "string" || encoder.encode(text).length > MAX_BYTES) throw new Error("Replay is too large.");
    const replay = JSON.parse(text);
    if (replay?.version !== 1 || !Array.isArray(replay.steps) || replay.steps.length < 1
        || replay.steps.length > MAX_STEPS || !replay.steps.every(validSnapshot)) {
      throw new Error("Invalid replay format.");
    }
    this.#steps = replay.steps.map(({ action, state }) => ({ action, state }));
    this.#index = 0;
  }
}

function mount(doc) {
  const get = (id) => doc.getElementById(id);
  let playback = new StreamingCinemaHubFsmVisualizer();
  let recorder = new StreamingCinemaHubStateDebugger();
  let imported = false;
  const slider = get("step");
  const input = get("import");
  const status = get("status");
  const controls = get("playback-actions");
  const friendly = (value) => value.toLowerCase().replaceAll("_", " ");
  const snapshot = () => ({ playback: { state: playback.currentState }, transitionCount: playback.history.length });
  recorder.recordSnapshot("Initial state", snapshot());

  function select(index) {
    recorder.jumpToStep(index);
    render();
  }

  function renderControls() {
    controls.replaceChildren();
    get("live-state").textContent = imported
      ? "Imported playback. Start a new recording to run sample actions."
      : `Latest playback state: ${friendly(playback.currentState)}`;

    if (imported) return;
    for (const event of playback.getAvailableEvents()) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = friendly(event);
      button.addEventListener("click", () => {
        const previousState = playback.currentState;
        playback.dispatch(event);
        if (!recorder.recordSnapshot(friendly(event), snapshot())) {
          playback.currentState = previousState;
          playback.history.pop();
          status.textContent = "Recording limit reached. Export this replay before starting another.";
          return;
        }
        status.textContent = `Recorded ${friendly(event)}.`;
        render();
        (controls.querySelector("button") ?? slider).focus();
      });
      controls.append(button);
    }
  }

  function render() {
    const previous = get("previous");
    const next = get("next");
    const relocate = (doc.activeElement === previous && recorder.index === 0)
      || (doc.activeElement === next && recorder.index === recorder.length - 1);
    const steps = recorder.steps;
    const selected = steps[recorder.index];

    slider.max = String(recorder.length - 1);
    slider.value = String(recorder.index);
    slider.setAttribute("aria-valuetext", `Step ${recorder.index + 1} of ${recorder.length}`);
    get("step-label").textContent = `Recorded step ${recorder.index + 1} of ${recorder.length}`;
    previous.disabled = recorder.index === 0;
    next.disabled = recorder.index === recorder.length - 1;
    if (relocate) slider.focus();

    const history = get("history");
    const oldFocus = doc.activeElement.closest?.("[data-step]");
    history.replaceChildren();
    steps.forEach(({ action }, index) => {
      const row = history.insertRow();
      const cell = row.insertCell();
      const button = doc.createElement("button");
      button.type = "button";
      button.dataset.step = index;
      button.textContent = String(index + 1);
      button.setAttribute("aria-label", `Inspect step ${index + 1}, ${action}`);
      if (index === recorder.index) button.setAttribute("aria-current", "true");
      button.addEventListener("click", () => select(index));
      cell.append(button);
      row.insertCell().textContent = action;
      if (oldFocus?.dataset.step === String(index)) button.focus();
    });

    const diff = get("diff");
    diff.replaceChildren();
    const previousState = steps[recorder.index - 1]?.state ?? selected.state;
    for (const change of recorder.computeDiff(previousState, selected.state)) {
      const row = doc.createElement("li");
      row.append(`${change.path.join(".") || "State"}: `);
      if (change.before !== undefined) {
        const deletion = doc.createElement("del");
        deletion.textContent = JSON.stringify(change.before);
        row.append("was ", deletion, " ");
      }
      if (change.after !== undefined) {
        const addition = doc.createElement("ins");
        addition.textContent = JSON.stringify(change.after);
        row.append("now ", addition);
      }
      diff.append(row);
    }
    if (!diff.children.length) {
      const row = doc.createElement("li");
      row.textContent = "No changes from a previous snapshot.";
      diff.append(row);
    }
    get("snapshot").textContent = JSON.stringify(selected.state, null, 2);
    renderControls();
  }

  slider.addEventListener("input", () => select(slider.valueAsNumber));
  get("previous").addEventListener("click", () => select(recorder.index - 1));
  get("next").addEventListener("click", () => select(recorder.index + 1));
  get("new-session").addEventListener("click", () => {
    playback = new StreamingCinemaHubFsmVisualizer();
    recorder = new StreamingCinemaHubStateDebugger();
    recorder.recordSnapshot("Initial state", snapshot());
    imported = false;
    status.textContent = "Started a new sample recording.";
    render();
  });
  get("export").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([recorder.exportReplay()], { type: "application/json" }));
    const link = doc.createElement("a");
    link.href = url;
    link.download = "cinema-replay.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  input.addEventListener("change", async () => {
    const [file] = input.files;
    if (!file) return;
    input.disabled = true;
    const activeRecording = recorder;
    try {
      if (file.size > MAX_BYTES) throw new Error("Replay is too large.");
      const source = await file.text();
      if (activeRecording !== recorder) return;
      recorder.importReplay(source);
      imported = true;
      status.textContent = "Replay imported.";
      render();
    } catch {
      status.textContent = "Could not import the replay. Choose a valid replay JSON under 256 KB.";
    } finally {
      input.value = "";
      input.disabled = false;
      input.focus();
    }
  });
  render();
}

if (typeof document !== "undefined") mount(document);
