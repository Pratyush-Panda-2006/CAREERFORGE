import { planFlights, duration } from './flight-model.js';
const planner = document.getElementById('flight-planner');
if (planner) {
  const form = planner.querySelector('form'); const rows = planner.querySelector('#flight-legs');
  const output = planner.querySelector('#flight-result'); const status = planner.querySelector('[role="status"]');
  const add = planner.querySelector('#flight-add'); let serial = 0;
  function invalidate() { output.replaceChildren(); status.textContent = 'Route changed. Calculate to update the results.'; }
  function make(tag, text, className) { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; }
  function renumber() {
    [...rows.children].forEach((row, index) => { row.querySelector('legend').textContent = `Flight leg ${index + 1}`; row.querySelector('button').disabled = rows.children.length === 1; });
    add.disabled = rows.children.length >= 8;
  }
  function addLeg(values = {}) {
    if (rows.children.length >= 8) return;
    const row = make('fieldset'); const id = ++serial; row.append(make('legend', 'Flight leg'));
    const fields = make('div', '', 'flight-fields');
    [['from', 'From (IATA)', 'DEL'], ['to', 'To (IATA)', 'DXB'], ['departure', 'Departure + UTC offset', '2026-12-01T08:00+05:30'], ['arrival', 'Arrival + UTC offset', '2026-12-01T10:30+04:00']].forEach(([key, label, placeholder]) => {
      const group = make('div'); const caption = make('label', label); const input = make('input');
      input.id = `flight-${id}-${key}`; caption.htmlFor = input.id; input.name = key; input.required = true;
      input.value = values[key] || ''; input.placeholder = placeholder; input.maxLength = key === 'from' || key === 'to' ? 3 : 22;
      input.autocomplete = 'off'; input.spellcheck = false; group.append(caption, input); fields.append(group);
    });
    const remove = make('button', 'Remove leg'); remove.type = 'button';
    remove.addEventListener('click', () => { row.remove(); renumber(); invalidate(); add.focus(); });
    row.append(fields, remove); rows.append(row); renumber(); invalidate(); return row;
  }
  add.addEventListener('click', () => addLeg()?.querySelector('input').focus());
  form.addEventListener('input', invalidate);
  form.addEventListener('submit', event => {
    event.preventDefault(); output.replaceChildren();
    try {
      const result = planFlights([...rows.children].map(row => Object.fromEntries([...row.querySelectorAll('input')].map(input => [input.name, input.value]))));
      output.append(make('p', `Journey ${duration(result.total)} · Flying ${duration(result.flightMinutes)} · Connections ${duration(result.layoverMinutes)}`, 'flight-summary'));
      result.legs.forEach((leg, index) => {
        const item = make('article', '', 'flight-item'); item.append(make('h3', `${leg.from} → ${leg.to} · ${duration(leg.minutes)}`), make('p', `${leg.departure} → ${leg.arrival}`)); output.append(item);
        const connection = result.connections[index];
        if (connection) {
          const card = make('aside', '', `flight-connection ${connection.minutes < 90 ? 'flight-tight' : ''}`);
          card.append(make('h4', `${connection.airport} · ${duration(connection.minutes)} · ${connection.risk}${connection.overnight ? ' · Overnight' : ''}`), make('p', connection.tip)); output.append(card);
        }
      });
      status.textContent = `Calculated ${result.legs.length} flight legs. Estimates only; verify connections with your airline.`;
    } catch (error) { status.textContent = error.message; }
  });
  planner.querySelector('#flight-sample').addEventListener('click', () => {
    rows.replaceChildren();
    addLeg({ from: 'DEL', to: 'DXB', departure: '2026-12-01T08:00+05:30', arrival: '2026-12-01T10:30+04:00' });
    addLeg({ from: 'DXB', to: 'LHR', departure: '2026-12-01T11:30+04:00', arrival: '2026-12-01T16:00Z' });
    form.requestSubmit();
  });
  addLeg(); status.textContent = 'Add flight times with explicit UTC offsets, or load the fictional example.';
}
