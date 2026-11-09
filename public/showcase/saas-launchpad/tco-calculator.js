import { DEFAULT_RATES, compareTco, estimateText } from './tco-model.js';
const root = document.getElementById('tco-calculator');
if (root) {
  const form = root.querySelector('form'); const assumptions = root.querySelector('#tco-assumptions');
  const result = root.querySelector('#tco-result'); const status = root.querySelector('[role="status"]'); const download = root.querySelector('#tco-download');
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(cents / 100);
  const create = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
  let snapshot = null;
  DEFAULT_RATES.forEach((rate, index) => {
    const group = create('fieldset'); group.append(create('legend', rate.name));
    [['monthlyCluster', 'Monthly infrastructure / cluster (USD)', 100000, 0.01], ['egress', 'Egress / GB (USD)', 100, 0.001], ['hours', 'Total engineering hours / month', 744, 0.1], ['setupCluster', 'One-time setup / cluster (USD)', 1000000, 0.01]].forEach(([key, label, max, step]) => {
      const caption = create('label', label); const input = create('input'); input.type = 'number'; input.id = `tco-${index}-${key}`; input.name = `${index}-${key}`;
      input.min = 0; input.max = max; input.step = step; input.required = true; input.value = rate[key]; caption.htmlFor = input.id;
      group.append(caption, input);
    }); assumptions.append(group);
  });
  function readNumber(name) { const field = form.elements.namedItem(name); if (!field.value.trim()) throw new Error('Fill in every assumption.'); return Number(field.value); }
  function calculate() {
    snapshot = null; download.disabled = true; result.replaceChildren();
    try {
      const value = compareTco({ clusters: readNumber('clusters'), egress: readNumber('egress'), hourly: readNumber('hourly') }, DEFAULT_RATES.map((row, index) => Object.fromEntries(Object.keys(row).filter(key => key !== 'name').map(key => [key, readNumber(`${index}-${key}`)]))));
      const table = create('table'); const caption = create('caption', '36-month scenario costs in USD'); table.append(caption);
      const head = create('thead'); const headers = create('tr'); ['Scenario', 'Infrastructure', 'Egress', 'Engineering', 'Setup', '3-year total'].forEach(label => { const th = create('th', label); th.scope = 'col'; headers.append(th); }); head.append(headers); table.append(head);
      const body = create('tbody'); const max = Math.max(1, ...value.scenarios.map(row => row.total));
      const bars = create('div'); bars.className = 'tco-bars'; bars.setAttribute('aria-hidden', 'true');
      value.scenarios.forEach(row => {
        const tr = create('tr'); const th = create('th', row.name); th.scope = 'row'; tr.append(th);
        ['infrastructure', 'transfer', 'engineering', 'setup', 'total'].forEach(key => tr.append(create('td', money(row[key])))); body.append(tr);
        const bar = create('div'); bar.className = 'tco-bar-row'; bar.append(create('p', `${row.name} · ${money(row.total)}`));
        const fill = create('div'); fill.className = 'tco-bar'; fill.style.width = `${row.total / max * 100}%`; bar.append(fill); bars.append(bar);
      }); table.append(body);
      const scroller = create('div'); scroller.className = 'tco-table'; scroller.tabIndex = 0; scroller.setAttribute('role', 'region'); scroller.setAttribute('aria-label', 'Cost comparison table, scroll horizontally on small screens'); scroller.append(table);
      result.append(bars, scroller);
      value.annualDifference.forEach(row => result.append(create('p', row.cents >= 0 ? `Launchpad scenario costs ${money(row.cents)} less per year than ${row.name}, annualized over three years.` : `Launchpad scenario costs ${money(-row.cents)} more per year than ${row.name}, annualized over three years.`)));
      snapshot = value; download.disabled = false; status.textContent = 'Comparison updated from your assumptions.';
    } catch (error) { status.textContent = error.message; }
  }
  form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
  form.addEventListener('input', () => { snapshot = null; result.replaceChildren(); download.disabled = true; status.textContent = 'Assumptions changed. Calculate to update the comparison.'; });
  download.addEventListener('click', () => {
    if (!snapshot) return;
    const url = URL.createObjectURL(new Blob([estimateText(snapshot)], { type: 'text/plain;charset=utf-8' }));
    const link = create('a'); link.href = url; link.download = 'illustrative-cloud-cost-estimate.txt'; root.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  calculate();
}
