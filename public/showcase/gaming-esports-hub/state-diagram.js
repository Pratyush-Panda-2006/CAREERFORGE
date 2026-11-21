const SVG_NS = 'http://www.w3.org/2000/svg';
const nameOf = (value) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 64 || [...value].some((c) => c.codePointAt(0) < 32)) {
    throw new TypeError('Use a name of 1–64 characters without control characters.');
  }
  return value.trim();
};
// Mermaid accepts decimal entities; only letters, numbers, spaces and underscores stay literal.
const mermaidText = (value) => [...value].map((c) => /[\p{L}\p{N} _]/u.test(c) ? c : `#${c.codePointAt(0)};`).join('');

export class GamingEsportsHubFsmVisualizer {
  #initial;
  #state;
  #transitions = new Map();
  #history = [];

  constructor(initialState = 'Lobby') {
    this.#initial = this.#state = nameOf(initialState);
  }

  get currentState() { return this.#state; }
  get history() { return this.#history.map((entry) => ({ ...entry })); }
  get transitions() {
    return [...this.#transitions.values()].map(({ from, event, to, guardLabel }) => ({ from, event, to, guardLabel }));
  }
  get states() { return [...new Set([this.#initial, ...this.transitions.flatMap(({ from, to }) => [from, to])])]; }

  addTransition(from, event, to, guard = () => true, guardLabel = '') {
    [from, event, to] = [from, event, to].map(nameOf);
    if (typeof guard !== 'function' || typeof guardLabel !== 'string' || guardLabel.length > 64) {
      throw new TypeError('A guard must be a function with an optional short label.');
    }
    const key = JSON.stringify([from, event]);
    if (this.#transitions.has(key)) throw new Error('This state already has that event. Choose a unique event.');
    if (this.#transitions.size >= 32 || new Set([...this.states, from, to]).size > 8) {
      throw new RangeError('This diagram supports up to 8 states and 32 transitions.');
    }
    this.#transitions.set(key, { from, event, to, guard, guardLabel });
    return this;
  }

  dispatch(event) {
    event = nameOf(event);
    const from = this.#state;
    const transition = this.#transitions.get(JSON.stringify([from, event]));
    let reason = 'No transition for this event in the current state.';
    let accepted = false;
    if (transition) {
      try {
        accepted = transition.guard() === true;
        reason = accepted ? 'Transition completed.' : `Guard blocked: ${transition.guardLabel || 'condition not met'}.`;
      } catch {
        reason = 'Guard failed to evaluate; state is unchanged.';
      }
    }
    if (accepted) this.#state = transition.to;
    const entry = { from, event, to: this.#state, accepted, reason };
    this.#history.push(entry);
    if (this.#history.length > 100) this.#history.shift();
    return { ...entry };
  }

  reset() { this.#state = this.#initial; this.#history = []; }

  exportMermaid() {
    const ids = new Map(this.states.map((state, i) => [state, `s${i}`]));
    return ['stateDiagram-v2', ...this.states.map((state) => `  state "${mermaidText(state)}" as ${ids.get(state)}`),
      `  [*] --> ${ids.get(this.#initial)}`,
      ...this.transitions.map(({ from, event, to, guardLabel }) =>
        `  ${ids.get(from)} --> ${ids.get(to)} : ${mermaidText(event + (guardLabel ? ` [${guardLabel}]` : ''))}`)].join('\n');
  }
}

function mount(root) {
  const get = (id) => root.querySelector(`#${id}`);
  const machine = new GamingEsportsHubFsmVisualizer();
  machine.addTransition('Lobby', 'Join queue', 'Queue')
    .addTransition('Queue', 'Leave queue', 'Lobby')
    .addTransition('Queue', 'Start match', 'Match')
    .addTransition('Match', 'Finish match', 'Complete', () => get('approved').checked, 'round completion confirmed')
    .addTransition('Complete', 'Next round', 'Lobby');
  const svg = (tag, attrs, text) => {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    if (text) element.textContent = text;
    return element;
  };
  function fitLabel(label, value, maxWidth) {
    const characters = Array.from(value);
    label.textContent = value;
    while (label.getComputedTextLength() > maxWidth && characters.length > 1) {
      characters.pop();
      label.textContent = characters.join('') + '…';
    }
  }
  function renderGraph() {
    const graph = get('graph');
    graph.replaceChildren();
    const title = svg('title', { id: 'graph-title' }, `Workflow graph. Current state: ${machine.currentState}.`);
    const defs = svg('defs', {});
    const marker = svg('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
    marker.append(svg('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#947fb1' }));
    defs.append(marker);
    graph.append(title, defs);
    const positions = new Map(machine.states.map((state, i, states) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / states.length;
      return [state, { x: 400 + 270 * Math.cos(angle), y: 235 + 140 * Math.sin(angle) }];
    }));
    machine.transitions.forEach(({ from, event, to }, i) => {
      const a = positions.get(from), b = positions.get(to);
      let d, labelX, labelY;
      if (from === to) {
        d = `M ${a.x - 28} ${a.y - 26} C ${a.x - 95} ${a.y - 100}, ${a.x + 95} ${a.y - 100}, ${a.x + 28} ${a.y - 32}`;
        labelX = a.x; labelY = a.y - 78;
      } else {
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const dx = (b.x - a.x) / length, dy = (b.y - a.y) / length;
        const siblings = machine.transitions.filter((t) => t.from === from && t.to === to);
        // Keep every allowed parallel transition inside the fixed graph bounds.
        const spacing = Math.min(30, 76 / Math.max(1, siblings.length - 1));
        const offset = 38 + siblings.findIndex((t) => t.event === event) * spacing;
        const cx = (a.x + b.x) / 2 - dy * offset, cy = (a.y + b.y) / 2 + dx * offset;
        // Intersect each curve tangent with the node rectangle; arrowheads stay outside its fill.
        const anchor = (node, padding) => {
          const vx = cx - node.x, vy = cy - node.y;
          const scale = 1 / Math.max(Math.abs(vx) / (66 + padding), Math.abs(vy) / (26 + padding));
          return { x: node.x + vx * scale, y: node.y + vy * scale };
        };
        const start = anchor(a, 0), end = anchor(b, 5);
        d = `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
        labelX = (a.x + b.x) / 2 - dy * offset / 2;
        labelY = (a.y + b.y) / 2 + dx * offset / 2 - 7;
      }
      const path = svg('path', { d, class: 'edge', 'marker-end': 'url(#arrow)' });
      path.append(svg('title', {}, `${from}: ${event} → ${to}`));
      const label = svg('text', { x: labelX, y: labelY, class: 'edge-label' });
      graph.append(path, label);
      fitLabel(label, `${i + 1}. ${event}`, 180);
    });
    for (const [state, { x, y }] of positions) {
      const group = svg('g', { class: state === machine.currentState ? 'node active' : 'node' });
      const label = svg('text', { x, y: y + 5 }, state);
      group.append(svg('rect', { x: x - 66, y: y - 26, width: 132, height: 52, rx: 14 }), label, svg('title', {}, state));
      graph.append(group);
      fitLabel(label, state, 116);
    }
  }
  function render() {
    get('current').textContent = machine.currentState;
    renderGraph();
    const focusedEvent = get('events').contains(document.activeElement) ? document.activeElement.textContent : null;
    const buttons = [...new Set(machine.transitions.map((t) => t.event))].map((event) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = event;
      button.addEventListener('click', () => {
        const result = machine.dispatch(event);
        get('status').textContent = `${result.event}: ${result.reason} Current state: ${result.to}.`;
        render();
      });
      return button;
    });
    get('events').replaceChildren(...buttons);
    buttons.find((button) => button.textContent === focusedEvent)?.focus({ preventScroll: true });
    get('mermaid').textContent = machine.exportMermaid();
    get('history').replaceChildren(...machine.history.slice(-20).reverse().map((entry) => {
      const li = document.createElement('li');
      li.textContent = `${entry.from} → ${entry.to} · ${entry.event}. ${entry.reason}`;
      li.className = entry.accepted ? 'accepted' : 'blocked';
      return li;
    }));
    get('empty-history').hidden = machine.history.length > 0;
    get('transition-list').replaceChildren(...machine.transitions.map((t, i) => {
      const li = document.createElement('li');
      li.textContent = `${i + 1}. ${t.from} → ${t.to}: ${t.event}${t.guardLabel ? ` (${t.guardLabel})` : ''}`;
      return li;
    }));
  }
  get('reset').addEventListener('click', () => { get('approved').checked = false; machine.reset(); get('status').textContent = 'Workflow reset to Lobby. History cleared.'; render(); });
  get('add-transition').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      machine.addTransition(get('from').value, get('event').value, get('to').value);
      get('status').textContent = 'Transition added.';
      render();
    } catch (error) { get('status').textContent = error.message; }
  });
  get('download').addEventListener('click', () => {
    let url;
    try {
      url = URL.createObjectURL(new Blob([machine.exportMermaid()], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'gaming-esports-hub-workflow.mmd';
      link.click();
      get('status').textContent = 'Mermaid download requested.';
    } catch {
      get('status').textContent = 'Download could not start. Your diagram remains above; copy it or try again.';
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  render();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-gaming-esports-hub-fsm]');
  if (root) mount(root);
}
