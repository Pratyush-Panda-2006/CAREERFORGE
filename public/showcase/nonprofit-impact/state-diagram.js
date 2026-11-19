function name(value) {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_ -]{0,39}$/.test(value.trim())) throw new TypeError('Names must be 1–40 ASCII letters, numbers, spaces, underscores or hyphens, starting with a letter.');
  return value.trim();
}
export class NonprofitImpactFsmVisualizer {
  #initial; #current; #states; #transitions = []; #history = []; #sequence = 0;
  constructor(initialState = 'Intake') { this.#initial = name(initialState); this.#current = this.#initial; this.#states = [this.#initial]; }
  get currentState() { return this.#current; }
  get states() { return [...this.#states]; }
  get transitions() { return this.#transitions.map((row) => ({ ...row })); }
  get history() { return this.#history.map((row) => ({ ...row })); }
  get sequence() { return this.#sequence; }
  get availableEvents() { return this.#transitions.filter((row) => row.from === this.#current).map((row) => row.event); }
  addTransition(from, event, to) {
    from = name(from); event = name(event); to = name(to);
    const existing = this.#transitions.find((row) => row.from === from && row.event === event);
    if (existing) {
      if (existing.to !== to) throw new Error('This state/event already has a different target.');
      return { ...existing };
    }
    const states = [...new Set([...this.#states, from, to])];
    if (states.length > 12 || this.#transitions.length >= 64) throw new RangeError('The workbench supports 12 states and 64 transitions.');
    const transition = Object.freeze({ from, event, to });
    this.#states = states; this.#transitions.push(transition); return { ...transition };
  }
  dispatch(event) {
    event = name(event);
    const transition = this.#transitions.find((row) => row.from === this.#current && row.event === event);
    if (!transition) throw new RangeError(`No ${event} transition from ${this.#current}. The current state is unchanged.`);
    const record = Object.freeze({ step: this.#sequence + 1, ...transition });
    this.#current = transition.to; this.#sequence++; this.#history = [...this.#history, record].slice(-200); return { ...record };
  }
  reset() { this.#current = this.#initial; this.#history = []; this.#sequence = 0; }
  exportMermaid() {
    // Generated aliases avoid Mermaid keywords; validated labels cannot inject DSL lines.
    const ids = new Map(this.#states.map((state, index) => [state, `s${index}`]));
    return ['stateDiagram-v2', '  direction LR', `  %% Current state: ${this.#current}`,
      ...this.#states.map((state) => `  state ${JSON.stringify(state)} as ${ids.get(state)}`),
      `  [*] --> ${ids.get(this.#initial)}`,
      ...this.#transitions.map((row) => `  ${ids.get(row.from)} --> ${ids.get(row.to)}: ${row.event}`), ''].join('\n');
  }
}
function demo() {
  const model = new NonprofitImpactFsmVisualizer();
  for (const [from, event, to] of [
    ['Intake', 'SUBMIT', 'Review'], ['Review', 'APPROVE', 'Funded'], ['Review', 'REVISE', 'Intake'],
    ['Funded', 'START', 'Planting'], ['Planting', 'COMPLETE', 'Complete'], ['Complete', 'REOPEN', 'Review'],
    ['Review', 'HOLD', 'On hold'], ['On hold', 'RESUME', 'Review'],
  ]) model.addTransition(from, event, to);
  return model;
}
function mount() {
  const root = document.querySelector('[data-fsm-workbench]'); if (!root) return;
  const get = (id) => root.querySelector(`#${id}`), svg = (tag, attrs = {}) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    return element;
  };
  let model = demo(), inspected = model.currentState;
  const notice = (text, error = false) => { get('notice').textContent = text; get('notice').setAttribute('role', error ? 'alert' : 'status'); };
  function inspect(state) {
    inspected = state; get('inspected-state').textContent = state;
    for (const node of get('nodes').children) node.setAttribute('aria-pressed', String(node.dataset.fsmState === state));
    const outgoing = model.transitions.filter((row) => row.from === state);
    get('outgoing').replaceChildren(...outgoing.map((row) => { const li = document.createElement('li'); li.textContent = `${row.event} → ${row.to}`; return li; }));
    if (!outgoing.length) get('outgoing').textContent = 'No outgoing transitions.';
  }
  function dispatch(event, focus = false) {
    try { const row = model.dispatch(event); inspected = model.currentState; render(); notice(`${row.event}: ${row.from} → ${row.to}.`); if (focus) get('current-state').focus(); }
    catch (error) { notice(error.message, true); }
  }
  function render() {
    const states = model.states, transitions = model.transitions;
    get('current-state').textContent = model.currentState;
    get('graph-count').textContent = `${states.length} states / ${transitions.length} transitions`;
    const positions = new Map(states.map((state, index) => {
      const angle = index * 2 * Math.PI / states.length - Math.PI / 2;
      return [state, { x: states.length === 1 ? 380 : 380 + 240 * Math.cos(angle), y: states.length === 1 ? 240 : 240 + 140 * Math.sin(angle) }];
    }));
    const grouped = new Map();
    for (const row of transitions) { const key = JSON.stringify([row.from, row.to]); if (!grouped.has(key)) grouped.set(key, { ...row, events: [] }); grouped.get(key).events.push(row.event); }
    get('edges').replaceChildren(...Array.from(grouped.values()).map((row) => {
      const a = positions.get(row.from), b = positions.get(row.to), group = svg('g', { class: row.from === model.currentState ? 'edge available' : 'edge' });
      let path, x, y;
      if (row.from === row.to) {
        path = `M${a.x - 25} ${a.y - 24} C${a.x - 85} ${a.y - 105} ${a.x + 85} ${a.y - 105} ${a.x + 25} ${a.y - 24}`; x = a.x; y = a.y - 83;
      } else {
        const length = Math.hypot(b.x - a.x, b.y - a.y), nx = (b.x - a.x) / length, ny = (b.y - a.y) / length;
        const margin = Math.min(56 / (Math.abs(nx) || 1e-9), 24 / (Math.abs(ny) || 1e-9));
        const start = { x: a.x + nx * margin, y: a.y + ny * margin }, end = { x: b.x - nx * margin, y: b.y - ny * margin };
        const bend = transitions.some((other) => other.from === row.to && other.to === row.from) ? 42 : 0;
        const control = { x: (start.x + end.x) / 2 - ny * bend, y: (start.y + end.y) / 2 + nx * bend };
        path = `M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`; x = (start.x + 2 * control.x + end.x) / 4; y = (start.y + 2 * control.y + end.y) / 4 - 8;
      }
      const curve = svg('path', { d: path, 'marker-end': 'url(#transition-arrow)' }), text = svg('text', { x, y }), title = svg('title'), label = row.events.join(', ');
      text.textContent = label.length > 20 ? `${label.slice(0, 19)}…` : label; title.textContent = label; group.append(title, curve, text); return group;
    }));
    get('nodes').replaceChildren(...states.map((state) => {
      const position = positions.get(state), current = state === model.currentState;
      const group = svg('g', { transform: `translate(${position.x} ${position.y})`, class: 'state-node', role: 'button', tabindex: 0,
        'data-fsm-state': state, 'data-current': current, 'aria-label': `Inspect ${state}${current ? ', current state' : ''}` });
      const box = svg('rect', { x: -56, y: -24, width: 112, height: 48, rx: 8 }), text = svg('text', { y: 5 }), title = svg('title');
      text.textContent = state.length > 12 ? `${state.slice(0, 11)}…` : state; title.textContent = state;
      group.append(title, box, text); group.addEventListener('focus', () => inspect(state)); group.addEventListener('click', () => inspect(state));
      group.addEventListener('keydown', (event) => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); inspect(state); } }); return group;
    }));
    get('event-buttons').replaceChildren(...model.availableEvents.map((event) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = event; button.addEventListener('click', () => dispatch(event, true)); return button; }));
    if (!model.availableEvents.length) get('event-buttons').textContent = 'No events are available from this state.';
    get('state-names').replaceChildren(...states.map((state) => { const option = document.createElement('option'); option.value = state; return option; }));
    get('transition-rows').replaceChildren(...transitions.map((row) => { const tr = document.createElement('tr'); for (const value of [row.from, row.event, row.to]) { const td = document.createElement('td'); td.textContent = value; tr.append(td); } return tr; }));
    const history = model.history; get('history-list').start = history[0]?.step ?? 1;
    get('history-list').replaceChildren(...history.map((row) => { const li = document.createElement('li'); li.textContent = `${row.from} → ${row.to} (${row.event})`; return li; }));
    get('history-summary').textContent = `Event history: ${model.sequence} accepted, ${history.length} retained`;
    get('definition').value = model.exportMermaid(); inspect(states.includes(inspected) ? inspected : model.currentState);
  }
  get('dispatch-form').addEventListener('submit', (event) => { event.preventDefault(); dispatch(get('dispatch-event').value); });
  get('transition-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try { const before = model.transitions.length; model.addTransition(get('from').value, get('transition-event').value, get('to').value); render(); notice(before === model.transitions.length ? 'Transition already defined.' : 'Transition added. The current state is unchanged.'); }
    catch (error) { notice(error.message, true); }
  });
  for (const id of ['dispatch-form', 'transition-form']) get(id).addEventListener('invalid', () => notice('Fill every required name; use up to 40 characters.', true), true);
  get('reset-run').addEventListener('click', () => { model.reset(); inspected = model.currentState; render(); notice('Run reset. Graph transitions are retained.'); get('current-state').focus(); });
  get('restore-demo').addEventListener('click', () => { model = demo(); inspected = model.currentState; render(); notice('Demo graph restored.'); get('current-state').focus(); });
  get('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(model.exportMermaid()); notice('Mermaid definition copied.'); }
    catch { get('definition').focus(); get('definition').select(); notice('Clipboard unavailable. Copy the selected definition.'); }
  });
  get('download').addEventListener('click', () => {
    let url;
    try { url = URL.createObjectURL(new Blob([model.exportMermaid()], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'nonprofit-campaign-state.mmd'; document.body.append(link); link.click(); link.remove(); const owned = url; setTimeout(() => URL.revokeObjectURL(owned), 1000); notice('Mermaid definition downloaded.'); }
    catch { if (url) URL.revokeObjectURL(url); notice('Download unavailable. Copy the definition below.', true); }
  });
  render();
}
if (typeof document !== 'undefined') mount();
