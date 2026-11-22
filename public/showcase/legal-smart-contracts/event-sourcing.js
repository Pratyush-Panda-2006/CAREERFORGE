const initial = Object.freeze({ contract: 'Standard Agreement', clauses: 1, status: 'draft' });
const fields = Object.freeze({ CONTRACT_RENAMED: 'title', CLAUSES_CHANGED: 'delta', STATUS_CHANGED: 'status' });

export class LegalSmartContractsEventSourcingLedger {
  #events = []; #current = { ...initial }; #now;
  constructor({ now = Date.now } = {}) {
    if (typeof now !== 'function') throw new TypeError('Provide a clock function.');
    this.#now = now;
  }
  #payload(type, payload) {
    if (!Object.hasOwn(fields, type)) throw new TypeError('Choose a supported contract event.');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || ![Object.prototype, null].includes(Object.getPrototypeOf(payload))) throw new TypeError('Use a plain payload object.');
    const field = fields[type], keys = Reflect.ownKeys(payload);
    if (keys.length !== 1 || keys[0] !== field) throw new TypeError(`The payload must contain only ${field}.`);
    const value = payload[field];
    if (type === 'CONTRACT_RENAMED') {
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) throw new RangeError('Use a contract title from 1 to 80 characters.');
      return Object.freeze({ title: value.trim() });
    }
    if (type === 'CLAUSES_CHANGED' && (!Number.isInteger(value) || value === 0 || Math.abs(value) > 999)) throw new RangeError('Use a non-zero integer clause change from -999 to 999.');
    if (type === 'STATUS_CHANGED' && !['draft', 'reviewed', 'executed'].includes(value)) throw new RangeError('Choose draft, reviewed or executed.');
    return Object.freeze({ [field]: value });
  }
  #apply(state, type, payload) {
    const next = { ...state };
    if (type === 'CONTRACT_RENAMED') next.contract = payload.title;
    if (type === 'STATUS_CHANGED') next.status = payload.status;
    if (type === 'CLAUSES_CHANGED') next.clauses += payload.delta;
    if (next.clauses < 1 || next.clauses > 1000) throw new RangeError('The smart contract must retain 1 to 1,000 clauses.');
    return next;
  }
  appendEvent(type, payload) {
    if (this.#events.length >= 500) throw new RangeError('The local ledger is limited to 500 events; reset to start another session.');
    const clean = this.#payload(type, payload), next = this.#apply(this.#current, type, clean);
    if (JSON.stringify(next) === JSON.stringify(this.#current)) throw new RangeError('Choose a change that alters the current contract state.');
    const now = this.#now();
    if (!Number.isSafeInteger(now) || now < 0) throw new RangeError('The local clock must return a non-negative integer timestamp.');
    const timestamp = Math.max(now, (this.#events.at(-1)?.timestamp || 0) + 1);
    if (!Number.isSafeInteger(timestamp)) throw new RangeError('The ordering timestamp has exceeded its safe range.');
    const event = Object.freeze({ sequence: this.#events.length + 1, timestamp, type, payload: clean });
    this.#events.push(event); this.#current = next;
    return structuredClone(event);
  }
  replayToTimestamp(timestamp) {
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new RangeError('Use a non-negative integer replay timestamp.');
    let state = { ...initial };
    for (const event of this.#events) {
      if (event.timestamp > timestamp) break;
      state = this.#apply(state, event.type, event.payload);
    }
    return state;
  }
  getMaterializedState() { return { ...this.#current }; }
  getEvents() { return structuredClone(this.#events); }
}

function mount() {
  const root = document.querySelector('[data-event-lab]'); if (!root) return;
  const get = id => root.querySelector(`#${id}`);
  let ledger = new LegalSmartContractsEventSourcingLedger(), cursor = 0, timer = null;
  const examples = { CONTRACT_RENAMED: { title: 'Master Services Agreement' }, CLAUSES_CHANGED: { delta: 2 }, STATUS_CHANGED: { status: 'reviewed' } };
  function status(message, error = false) { get('status').setAttribute('role', error ? 'alert' : 'status'); get('status').textContent = message; }
  function stop() { clearInterval(timer); timer = null; get('play').textContent = 'Play history'; get('play').setAttribute('aria-pressed', 'false'); }
  function snapshots() {
    const events = ledger.getEvents(), timestamp = cursor ? events[cursor - 1].timestamp : 0;
    get('historical').textContent = JSON.stringify(ledger.replayToTimestamp(timestamp), null, 2);
    get('live').textContent = JSON.stringify(ledger.getMaterializedState(), null, 2);
    get('position').textContent = `${cursor} / ${events.length}`; get('timestamp').textContent = cursor ? String(timestamp) : 'Initial state';
    get('timeline').max = String(events.length); get('timeline').value = String(cursor); get('timeline').disabled = events.length === 0;
    get('previous').disabled = cursor === 0; get('next').disabled = cursor === events.length; get('play').disabled = events.length === 0;
    get('chips').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.index) === cursor)));
  }
  function choose(index) { stop(); cursor = index; snapshots(); status('Historical projection changed. The live head and ledger are untouched.'); }
  function renderLedger() {
    const events = ledger.getEvents(), rows = [], chips = [];
    for (const event of events) {
      const row = document.createElement('tr');
      for (const value of [event.sequence, event.timestamp, event.type, JSON.stringify(event.payload)]) { const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell); }
      rows.push(row);
    }
    for (let index = 0; index <= events.length; index++) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.index = String(index);
      button.textContent = index ? `Event ${index}` : 'Initial'; button.addEventListener('click', () => choose(index)); chips.push(button);
    }
    get('ledger').replaceChildren(...rows); get('chips').replaceChildren(...chips); snapshots();
  }
  get('event-type').addEventListener('change', () => { get('payload').value = JSON.stringify(examples[get('event-type').value]); });
  get('event-form').addEventListener('submit', event => {
    event.preventDefault(); stop();
    try {
      if (get('payload').value.length > 2000) throw new RangeError('Use a payload smaller than 2,000 characters.');
      ledger.appendEvent(get('event-type').value, JSON.parse(get('payload').value)); cursor = ledger.getEvents().length;
      renderLedger(); status('Event appended to the live head. Earlier events are retained.');
    } catch (error) { status(`${error.message} The ledger and last projection are retained.`, true); }
  });
  get('timeline').addEventListener('input', () => choose(get('timeline').valueAsNumber));
  get('previous').addEventListener('click', () => choose(cursor - 1)); get('next').addEventListener('click', () => choose(cursor + 1));
  get('play').addEventListener('click', () => {
    if (timer !== null) { stop(); return; }
    if (cursor === ledger.getEvents().length) cursor = 0;
    snapshots(); get('play').textContent = 'Pause history'; get('play').setAttribute('aria-pressed', 'true');
    timer = setInterval(() => { cursor++; snapshots(); if (cursor === ledger.getEvents().length) stop(); }, 500);
    status('Playing historical projections. The live head remains unchanged.');
  });
  get('reset').addEventListener('click', () => { stop(); ledger = new LegalSmartContractsEventSourcingLedger(); cursor = 0; renderLedger(); status('Local ledger reset. No blockchain setting was changed.'); });
  window.addEventListener('pagehide', stop);
  renderLedger();
}
if (typeof document !== 'undefined') mount();
