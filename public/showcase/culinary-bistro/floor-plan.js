import { TABLES, SeatingPlan, seatingInterval } from './table-state.js';

const root = document.getElementById('floor-plan');
if (root) {
  const plan = new SeatingPlan();
  if (typeof window !== 'undefined') window.floorPlanEngine = plan;
  const svg = root.querySelector('svg');
  const select = root.querySelector('select');
  const release = root.querySelector('#floor-release');
  const status = root.querySelector('#floor-status');
  let context = {}, contextKey = '', activeHold = null, selectedId = null;
  const nodes = new Map();
  const labels = { available: 'Available', reserved: 'Reserved', occupied: 'Occupied now', held: 'Held', 'too-small': 'Too small', 'party-below-min': 'Party too small', unavailable: 'Choose a future time' };
  const announce = text => { status.textContent = text; };
  function emitSelection(table = null) {
    document.dispatchEvent(new CustomEvent('bistro:table-selection', { detail: table ? {
      id: table.id, label: `${table.id} · ${table.zone}`, area: table.area, holdId: activeHold.id, context: { ...context }
    } : null }));
  }
  function clearSelection() {
    if (activeHold) plan.release(activeHold.id);
    activeHold = null; selectedId = null; emitSelection();
  }
  function validContext() {
    try { seatingInterval(context); return true; } catch { return false; }
  }
  function render() {
    const now = Date.now();
    const valid = validContext();
    if (activeHold && (!valid || !plan.valid(activeHold.id, context, now))) {
      clearSelection(); announce('Your five-minute table hold expired. Select an available table again.');
    }
    TABLES.forEach(table => {
      const availability = valid ? plan.availability(table.id, context, activeHold?.id, now) : 'unavailable';
      const selected = selectedId === table.id && availability === 'available';
      const state = selected ? 'selected' : availability;
      const { node, caption, option } = nodes.get(table.id);
      const label = `${table.id}, ${table.zone}, ${table.capacity} seats, ${selected ? 'Selected' : labels[availability]}`;
      node.dataset.state = state;
      node.setAttribute('aria-label', label);
      node.setAttribute('aria-pressed', String(selected));
      node.setAttribute('aria-disabled', String(availability !== 'available'));
      caption.textContent = selected ? 'Selected' : labels[availability];
      option.textContent = label;
      option.disabled = availability !== 'available';
    });
    select.value = selectedId || '';
    select.disabled = !valid;
    release.disabled = !activeHold;
    const seconds = activeHold ? Math.max(0, Math.ceil((activeHold.expires - now) / 1000)) : 0;
    root.querySelector('#floor-hold').textContent = activeHold ? `Table ${selectedId} held locally for ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}. Complete Guest Details to create a sample reservation.` : 'No table selected.';
  }
  function choose(id) {
    try {
      const hold = plan.hold(id, context, Date.now(), activeHold?.id);
      activeHold = hold; selectedId = id;
      const table = TABLES.find(table => table.id === id);
      emitSelection(table);
      announce(`${table.id} selected in ${table.zone} for ${context.party} guests. Your local hold lasts up to five minutes.`);
    } catch (error) { announce(error.message); }
    render();
  }
  const ns = 'http://www.w3.org/2000/svg';
  TABLES.forEach((table, index) => {
    const node = document.createElementNS(ns, 'g');
    node.setAttribute('transform', `translate(${table.x} ${table.y})`);
    node.setAttribute('role', 'button'); node.setAttribute('tabindex', '0');
    const shape = document.createElementNS(ns, 'rect');
    shape.setAttribute('x', '-52'); shape.setAttribute('y', '-25'); shape.setAttribute('width', '104'); shape.setAttribute('height', '50'); shape.setAttribute('rx', table.zone === 'Window Booths' ? '8' : '22');
    const number = document.createElementNS(ns, 'text'); number.setAttribute('y', '-3'); number.textContent = `${table.id} · ${table.capacity} seats`;
    const caption = document.createElementNS(ns, 'text'); caption.setAttribute('y', '15'); caption.classList.add('floor-caption');
    node.append(shape, number, caption); svg.append(node);
    node.addEventListener('click', () => choose(table.id));
    node.addEventListener('keydown', event => {
      if (['Enter', ' '].includes(event.key)) { event.preventDefault(); choose(table.id); }
      else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
        nodes.get(TABLES[(index + step + TABLES.length) % TABLES.length].id).node.focus();
      }
    });
    const option = document.createElement('option'); option.value = table.id; select.append(option);
    nodes.set(table.id, { node, caption, option });
  });
  select.addEventListener('change', () => { if (select.value) choose(select.value); });
  release.addEventListener('click', () => { clearSelection(); announce('Table hold released.'); render(); select.focus(); });
  document.addEventListener('bistro:reservation-change', event => {
    const next = event.detail;
    const key = `${next.date}:${next.time}:${next.party}`;
    const selected = TABLES.find(table => table.id === selectedId);
    const changed = contextKey !== key || (selected && selected.area !== next.area);
    context = { ...next }; contextKey = key;
    if (changed && activeHold) clearSelection();
    if (changed) announce(validContext() ? 'Select a table on the map or use the table selector. All zones are shown; selection updates your ambiance preference.' : 'Choose a future seating date and time before selecting a table.');
    render();
  });
  document.addEventListener('bistro:check-table', event => {
    const request = event.detail;
    try {
      request.valid = Boolean(activeHold && request.holdId === activeHold.id && request.tableId === selectedId
        && plan.valid(activeHold.id, request.context));
      if (request.valid && request.commit) {
        plan.confirm(activeHold.id, request.context);
        activeHold = null; selectedId = null;
        announce('Sample reservation recorded locally. This is not a real restaurant booking.'); render();
      }
    } catch (error) { request.valid = false; announce(error.message); }
  });
  document.addEventListener('bistro:table-reset', () => { clearSelection(); render(); });
  setInterval(() => { if (!document.hidden) render(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  render();
  document.dispatchEvent(new CustomEvent('bistro:floorplan-ready'));
}
