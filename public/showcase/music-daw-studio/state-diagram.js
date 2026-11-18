const label = (value) => {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z][A-Za-z0-9 _-]{0,59}$/.test(value)
  ) {
    throw new TypeError(
      "Use 1–60 letters, digits, spaces, underscores or hyphens, starting with a letter.",
    );
  }
  return value;
};

export class MusicDawStudioFsmVisualizer {
  #initial;
  #current;
  #states = new Set();
  #transitions = new Map();
  #history = [];
  constructor(initialState = "Stopped") {
    this.#initial = this.#current = label(initialState);
    this.#states.add(initialState);
  }
  get currentState() {
    return this.#current;
  }
  get states() {
    return [...this.#states];
  }
  get transitions() {
    return [...this.#transitions.values()].map((item) => ({ ...item }));
  }
  get history() {
    return this.#history.map((item) => ({ ...item }));
  }
  addTransition(from, event, to) {
    label(from);
    label(event);
    label(to);
    const key = JSON.stringify([from, event]);
    const existing = this.#transitions.get(key);
    if (existing) {
      if (existing.to === to) return false;
      throw new Error(
        "That state/event already has a destination. Choose a different event.",
      );
    }
    if (
      new Set([...this.#states, from, to]).size > 32 ||
      this.#transitions.size >= 128
    ) {
      throw new RangeError(
        "This workbench supports up to 32 states and 128 transitions.",
      );
    }
    this.#states.add(from);
    this.#states.add(to);
    this.#transitions.set(key, { from, event, to });
    return true;
  }
  dispatch(event) {
    label(event);
    const transition = this.#transitions.get(
      JSON.stringify([this.#current, event]),
    );
    if (!transition) return false;
    this.#current = transition.to;
    this.#history.push({ ...transition });
    if (this.#history.length > 100) this.#history.shift();
    return true;
  }
  reset() {
    this.#current = this.#initial;
    this.#history = [];
  }
  exportMermaid() {
    const ids = new Map(
      this.states.map((state, index) => [state, `s${index}`]),
    );
    return [
      "stateDiagram-v2",
      ...this.states.map(
        (state) => `    state "${state}" as ${ids.get(state)}`,
      ),
      `    [*] --> ${ids.get(this.#initial)}`,
      ...this.transitions.map(
        (t) => `    ${ids.get(t.from)} --> ${ids.get(t.to)} : ${t.event}`,
      ),
    ].join("\n");
  }
}

if (typeof document !== "undefined") {
  const machine = new MusicDawStudioFsmVisualizer();
  for (const entry of [
    ["Stopped", "PLAY", "Playing"],
    ["Playing", "PAUSE", "Paused"],
    ["Paused", "PLAY", "Playing"],
    ["Playing", "STOP", "Stopped"],
    ["Paused", "STOP", "Stopped"],
    ["Stopped", "RECORD", "Recording"],
    ["Recording", "STOP", "Stopped"],
  ])
    machine.addTransition(...entry);
  const svgNS = "http://www.w3.org/2000/svg";
  const status = document.querySelector("#status");
  const graph = document.querySelector("#graph");
  const events = document.querySelector("#events");
  const history = document.querySelector("#history");
  const code = document.querySelector("#mermaid");
  const table = document.querySelector("#transition-table");
  const element = (tag, attributes = {}, text) => {
    const el = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attributes))
      el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const render = () => {
    document.querySelector("#current-state").textContent = machine.currentState;
    code.value = machine.exportMermaid();
    const states = machine.states,
      columns = Math.ceil(Math.sqrt(states.length));
    const rows = Math.ceil(states.length / columns);
    const width = Math.max(600, columns * 220),
      height = Math.max(360, rows * 180);
    graph.setAttribute("viewBox", `0 0 ${width} ${height}`);
    graph.setAttribute(
      "aria-label",
      `Transition graph. Current state: ${machine.currentState}. ${states.length} states.`,
    );
    const positions = new Map(
      states.map((state, i) => [
        state,
        { x: 110 + (i % columns) * 220, y: 90 + Math.floor(i / columns) * 180 },
      ]),
    );
    const layer = document.querySelector("#graph-content");
    layer.replaceChildren();
    for (const transition of machine.transitions) {
      const a = positions.get(transition.from),
        b = positions.get(transition.to);
      const reverse = transition.from > transition.to ? -1 : 1;
      const mx = (a.x + b.x) / 2 + (a.y === b.y ? 0 : reverse * 40),
        my = (a.y + b.y) / 2 - 40 * reverse;
      const boundary = (center, control) => {
        const dx = control.x - center.x,
          dy = control.y - center.y;
        const scale = Math.min(
          91 / Math.abs(dx || 1e-9),
          31 / Math.abs(dy || 1e-9),
        );
        return { x: center.x + dx * scale, y: center.y + dy * scale };
      };
      const start = boundary(a, { x: mx, y: my });
      const end = boundary(b, { x: mx, y: my });
      const path =
        a === b
          ? `M ${a.x - 30} ${a.y - 31} C ${a.x - 110} ${a.y - 110},${a.x + 110} ${a.y - 110},${a.x + 30} ${a.y - 31}`
          : `M ${start.x} ${start.y} Q ${mx} ${my} ${end.x} ${end.y}`;
      const edge = element("path", {
        d: path,
        "marker-end": "url(#arrow)",
        class:
          transition.from === machine.currentState
            ? "edge active-edge"
            : "edge",
      });
      const title = element(
        "title",
        {},
        `${transition.from} + ${transition.event} → ${transition.to}`,
      );
      edge.append(title);
      layer.append(edge);
    }
    for (const state of states) {
      const { x, y } = positions.get(state);
      const group = element("g");
      group.append(
        element("rect", {
          x: x - 85,
          y: y - 25,
          width: 170,
          height: 50,
          rx: 5,
          class:
            state === machine.currentState ? "state active-state" : "state",
        }),
        element(
          "text",
          {
            x,
            y: y + 5,
            "text-anchor": "middle",
            class: "state-label",
            ...(state.length > 18
              ? { textLength: 150, lengthAdjust: "spacingAndGlyphs" }
              : {}),
          },
          state,
        ),
      );
      layer.append(group);
    }
    history.replaceChildren();
    if (!machine.history.length) {
      const li = document.createElement("li");
      li.textContent = "No events dispatched yet.";
      history.append(li);
    }
    machine.history
      .slice()
      .reverse()
      .forEach((t) => {
        const li = document.createElement("li");
        li.textContent = `${t.from} + ${t.event} → ${t.to}`;
        history.append(li);
      });
    table.replaceChildren();
    for (const transition of machine.transitions) {
      const row = document.createElement("tr");
      for (const key of ["from", "event", "to"]) {
        const cell = document.createElement("td");
        cell.textContent = transition[key];
        row.append(cell);
      }
      table.append(row);
    }
  };
  const renderEvents = () => {
    events.replaceChildren();
    for (const event of new Set(machine.transitions.map((t) => t.event))) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = event;
      button.addEventListener("click", () => {
        const previous = machine.currentState;
        const accepted = machine.dispatch(event);
        status.textContent = accepted
          ? `${event}: ${previous} → ${machine.currentState}`
          : `${event} ignored: no transition from ${previous}.`;
        render();
      });
      events.append(button);
    }
  };
  document
    .querySelector("#transition-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        const fields = event.currentTarget.elements;
        const added = machine.addTransition(
          fields.from.value.trim(),
          fields.event.value.trim(),
          fields.to.value.trim(),
        );
        status.textContent = added
          ? "Transition added."
          : "That transition already exists.";
        renderEvents();
        render();
      } catch (error) {
        status.textContent = error.message;
      }
    });
  document.querySelector("#reset").addEventListener("click", () => {
    machine.reset();
    status.textContent =
      "Returned to Stopped. Event history cleared; transitions retained.";
    render();
  });
  document.querySelector("#download").addEventListener("click", () => {
    const url = URL.createObjectURL(
      new Blob([machine.exportMermaid()], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "daw-state-diagram.mmd";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  renderEvents();
  render();
}
