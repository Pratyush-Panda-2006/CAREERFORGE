function requireName(value, kind) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${kind} must be a nonempty string`);
  return value.trim();
}

export class AerospaceOrbiterFsmVisualizer {
  constructor(initialState = 'Standby') {
    this.initialState = requireName(initialState, 'Initial state');
    this.currentState = this.initialState;
    this.transitions = [];
    this.history = [];
  }

  addTransition(from, event, to) {
    const transition = {
      from: requireName(from, 'Source state'),
      event: requireName(event, 'Event'),
      to: requireName(to, 'Target state'),
    };
    if (this.transitions.some((entry) => entry.from === transition.from && entry.event === transition.event)) {
      throw new Error('A state can have only one target for an event');
    }
    this.transitions.push(transition);
    return transition;
  }

  availableEvents() {
    return this.transitions.filter((entry) => entry.from === this.currentState).map((entry) => entry.event);
  }

  dispatch(event) {
    const name = requireName(event, 'Event');
    const transition = this.transitions.find((entry) => entry.from === this.currentState && entry.event === name);
    if (!transition) throw new Error(`No '${name}' transition from ${this.currentState}`);
    this.currentState = transition.to;
    const entry = { ...transition, step: this.history.length + 1 };
    this.history.push(entry);
    return entry;
  }

  reset() {
    this.currentState = this.initialState;
    this.history = [];
  }

  exportMermaid() {
    // Mermaid identifiers are generated, keeping user labels out of diagram syntax.
    const states = [...new Set([this.initialState, ...this.transitions.flatMap(({ from, to }) => [from, to])])];
    const ids = new Map(states.map((state, index) => [state, `s${index}`]));
    const safeLabel = (value) => value.replace(/[\r\n<>"]+/g, ' ').replace(/:/g, ' - ').trim();
    const lines = ['stateDiagram-v2', `    [*] --> ${ids.get(this.initialState)}`];
    for (const state of states) lines.push(`    state "${safeLabel(state)}" as ${ids.get(state)}`);
    for (const { from, event, to } of this.transitions) {
      lines.push(`    ${ids.get(from)} --> ${ids.get(to)}: ${safeLabel(event)}`);
    }
    return lines.join('\n');
  }
}

function startDiagram() {
  const root = document.querySelector('#fsm-workbench');
  if (!root) return;
  const machine = new AerospaceOrbiterFsmVisualizer('Standby');
  [
    ['Standby', 'power on', 'Preflight'],
    ['Preflight', 'checks pass', 'Launch Ready'],
    ['Preflight', 'abort', 'Standby'],
    ['Launch Ready', 'ignite', 'Ascent'],
    ['Launch Ready', 'abort', 'Standby'],
    ['Ascent', 'stage separation', 'Orbit'],
    ['Ascent', 'abort', 'Emergency'],
    ['Orbit', 'deorbit', 'Reentry'],
    ['Reentry', 'land', 'Standby'],
    ['Emergency', 'recover', 'Standby'],
  ].forEach((entry) => machine.addTransition(...entry));

  const nodes = root.querySelector('#state-nodes');
  const events = root.querySelector('#event-buttons');
  const history = root.querySelector('#event-history');
  const current = root.querySelector('#current-state');
  const mermaid = root.querySelector('#mermaid-source');
  const message = root.querySelector('#event-message');

  function render() {
    current.textContent = machine.currentState;
    nodes.replaceChildren();
    const states = [...new Set([machine.initialState, ...machine.transitions.flatMap(({ from, to }) => [from, to])])];
    states.forEach((state) => {
      const node = document.createElement('div');
      node.className = state === machine.currentState ? 'state-node active' : 'state-node';
      node.textContent = state;
      node.setAttribute('aria-current', state === machine.currentState ? 'step' : 'false');
      nodes.append(node);
    });
    events.replaceChildren();
    machine.availableEvents().forEach((event) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = event;
      button.addEventListener('click', () => {
        machine.dispatch(event);
        message.textContent = `Dispatched ${event}. Now in ${machine.currentState}.`;
        render();
      });
      events.append(button);
    });
    history.replaceChildren();
    machine.history.forEach((entry) => {
      const item = document.createElement('li');
      item.textContent = `#${entry.step} ${entry.from} — ${entry.event} → ${entry.to}`;
      history.append(item);
    });
    mermaid.value = machine.exportMermaid();
  }

  root.querySelector('#transition-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      machine.addTransition(data.get('from'), data.get('event'), data.get('to'));
      event.currentTarget.reset();
      message.textContent = 'Transition added.';
      render();
    } catch (error) {
      message.textContent = error.message;
    }
  });
  root.querySelector('#reset-machine').addEventListener('click', () => {
    machine.reset();
    message.textContent = 'Mission state reset.';
    render();
  });
  render();
}

if (typeof document !== 'undefined') startDiagram();
